// gemini.js — Gemini API helpers for Sigil
const { GoogleGenerativeAI } = require('@google/generative-ai');

let _genAI = null;
function getAI() {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not set in environment variables.');
    }
    if (!_genAI) _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    return _genAI;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Send a text prompt to Gemini and return the response string.
 * Retries once after 1 s on transient 503 errors.
 * Throws a user-friendly Error on failure.
 */
async function geminiRequest(prompt, opts = {}) {
    const MAX_ATTEMPTS = 2;
    let lastErr;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const model = getAI().getGenerativeModel({
                model: opts.model ?? 'gemini-2.0-flash',
                generationConfig: {
                    temperature:     opts.temperature ?? 0.9,
                    maxOutputTokens: opts.maxTokens   ?? 1024,
                    thinkingConfig:  { thinkingBudget: 0 },
                },
            });
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (err) {
            lastErr = err;
            const msg = err?.message ?? '';
            if (msg.includes('API_KEY') || msg.includes('not set')) throw new Error('Gemini API key is missing or invalid.');
            if (msg.includes('quota') || msg.includes('429'))       throw new Error('Gemini quota exceeded. Try again later.');
            if (msg.includes('SAFETY'))                             throw new Error('Gemini blocked the request due to safety filters.');
            // Retry once on transient 503 / server errors
            const isTransient = msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('overloaded');
            if (isTransient && attempt < MAX_ATTEMPTS) {
                await sleep(1000);
                continue;
            }
            throw new Error(`Gemini request failed: ${msg}`);
        }
    }
    throw new Error(`Gemini request failed: ${lastErr?.message ?? 'unknown error'}`);
}

/**
 * Request an AI image from Gemini image generation.
 * Returns a base-64 PNG string, or null if unavailable.
 */
async function geminiImageRequest(prompt, opts = {}) {
    try {
        const model = getAI().getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
        });
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
        });
        const parts = result.response?.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
            if (part.inlineData?.mimeType?.startsWith('image/')) {
                return part.inlineData.data; // base64
            }
        }
        return null;
    } catch (err) {
        console.warn('[gemini] Image generation failed:', err.message);
        return null;
    }
}

/**
 * Extract the first JSON object / array from a Gemini text response.
 */
function extractJson(text) {
    let cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    try { return JSON.parse(cleaned); } catch {}
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objMatch) { try { return JSON.parse(objMatch[0]); } catch {} }
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch {} }
    throw new Error('No valid JSON found in Gemini response');
}

module.exports = { geminiRequest, geminiImageRequest, extractJson };
