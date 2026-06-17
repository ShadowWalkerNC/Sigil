/**
 * Shared Gemini API helper for Sigil.
 *
 * geminiRequest(prompt, opts)       — text generation (gemini-2.5-flash)
 * geminiImageRequest(prompt, opts)  — image generation (gemini-2.0-flash-exp)
 * extractJson(raw)                  — bulletproof JSON extractor
 *
 * Perf notes:
 *   - keepAlive HTTP agent reuses TLS connections across calls (~50ms saved per call)
 *   - thinkingBudget:0 disables chain-of-thought on JSON tasks (saves 2–5s)
 *   - maxOutputTokens tuned per call type (256 for JSON, 768 for freeform)
 *   - 12s timeout for text, 30s for image; up to 2 retries with backoff on 429/503
 */
const https = require('https');

const TEXT_MODEL  = 'gemini-2.5-flash';
const IMAGE_MODEL = 'gemini-2.0-flash-exp';

// Reuse TLS connections across all Gemini requests
const _agent = new https.Agent({ keepAlive: true, maxSockets: 4 });

/**
 * Internal: POST to Gemini REST API with timeout + retry.
 */
function _geminiPost(model, body, opts = {}) {
    const { timeoutMs = 12_000, retries = 2 } = opts;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return Promise.reject(new Error('GEMINI_API_KEY is not set.'));

    const payload = JSON.stringify(body);

    const attempt = (attemptsLeft) => new Promise((resolve, reject) => {
        let settled = false;

        const req = https.request({
            hostname: 'generativelanguage.googleapis.com',
            path:     `/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
            method:   'POST',
            agent:    _agent,
            headers:  {
                'Content-Type':   'application/json',
                'Content-Length': Buffer.byteLength(payload),
            },
        }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) {
                        const msg  = parsed.error.message || JSON.stringify(parsed.error);
                        const code = parsed.error.code;
                        if (attemptsLeft > 0 && (code === 429 || code === 503)) {
                            return setTimeout(() => attempt(attemptsLeft - 1).then(resolve).catch(reject), 1500);
                        }
                        return reject(new Error(`Gemini API error (${code}): ${msg}`));
                    }
                    resolve(parsed);
                } catch (e) {
                    reject(new Error(`Failed to parse Gemini response: ${e.message}`));
                }
            });
        });

        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            req.destroy();
            if (attemptsLeft > 0) {
                attempt(attemptsLeft - 1).then(resolve).catch(reject);
            } else {
                reject(new Error('Gemini request timed out after retries.'));
            }
        }, timeoutMs);

        req.on('error', (e) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (attemptsLeft > 0) {
                setTimeout(() => attempt(attemptsLeft - 1).then(resolve).catch(reject), 1000);
            } else {
                reject(new Error(`Gemini network error: ${e.message}`));
            }
        });

        req.write(payload);
        req.end();
    });

    return attempt(retries);
}

/**
 * Text generation via gemini-2.5-flash.
 * thinkingBudget:0 disables reasoning on simple JSON tasks — saves 2–5s.
 *
 * @param {string} prompt
 * @param {object} [opts]
 * @param {number} [opts.temperature=1.0]
 * @param {number} [opts.maxOutputTokens=256]  — tuned low; raise for freeform text
 * @param {boolean} [opts.thinking=false]      — set true only when reasoning is needed
 * @returns {Promise<string>}
 */
function geminiRequest(prompt, opts = {}) {
    const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature:      opts.temperature     ?? 1.0,
            maxOutputTokens:  opts.maxOutputTokens ?? 256,
            thinkingConfig:   { thinkingBudget: opts.thinking ? -1 : 0 },
        },
    };
    return _geminiPost(TEXT_MODEL, body, opts).then(parsed => {
        const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        return text.trim();
    });
}

/**
 * Image generation via gemini-2.0-flash-exp.
 * Returns a Buffer of PNG data.
 *
 * @param {string} prompt
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs=30000]  — image gen is slower
 * @returns {Promise<Buffer>}
 */
function geminiImageRequest(prompt, opts = {}) {
    const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
        },
    };
    return _geminiPost(IMAGE_MODEL, body, { timeoutMs: opts.timeoutMs ?? 30_000, retries: 1 })
        .then(parsed => {
            const parts   = parsed?.candidates?.[0]?.content?.parts ?? [];
            const imgPart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
            if (!imgPart) throw new Error('Gemini did not return an image. This feature may require a paid API key, or the prompt was blocked.');
            return Buffer.from(imgPart.inlineData.data, 'base64');
        });
}

/**
 * Extracts the first valid JSON object from a Gemini response string.
 * Handles markdown fences, leading/trailing prose, nested objects.
 *
 * @param {string} raw
 * @returns {object}
 * @throws {Error}
 */
function extractJson(raw) {
    if (!raw || typeof raw !== 'string') throw new Error('Empty response from Gemini.');
    let text = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    const start = text.indexOf('{');
    if (start === -1) throw new Error('No JSON object found in Gemini response.');
    let depth = 0, end = -1, inStr = false, escape = false;
    for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (escape)          { escape = false; continue; }
        if (ch === '\\')     { escape = true;  continue; }
        if (ch === '"')      { inStr = !inStr; continue; }
        if (inStr)           { continue; }
        if (ch === '{')      { depth++; }
        else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end === -1) throw new Error('Unmatched braces in Gemini JSON response.');
    try {
        return JSON.parse(text.slice(start, end + 1));
    } catch (e) {
        throw new Error(`JSON parse failed: ${e.message}`);
    }
}

module.exports = { geminiRequest, geminiImageRequest, extractJson };
