// gemini.js — Gemini API helpers for Sigil
const { GoogleGenerativeAI } = require('@google/generative-ai');

let _genAI = null;
function getAI() {
    if (!_genAI) _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    return _genAI;
}

/**
 * Send a text prompt to Gemini and return the response string.
 */
async function geminiRequest(prompt, opts = {}) {
    const model = getAI().getGenerativeModel({
        model: opts.model ?? 'gemini-2.0-flash',
        generationConfig: {
            temperature:     opts.temperature  ?? 0.9,
            maxOutputTokens: opts.maxTokens    ?? 1024,
            thinkingConfig:  { thinkingBudget: 0 },
        },
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
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
    // Strip markdown code fences
    let cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();

    // Try direct parse first
    try { return JSON.parse(cleaned); } catch {}

    // Try to find first {...} or [...] block
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objMatch) { try { return JSON.parse(objMatch[0]); } catch {} }

    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch {} }

    throw new Error('No valid JSON found in Gemini response');
}

module.exports = { geminiRequest, geminiImageRequest, extractJson };
