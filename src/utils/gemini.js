/**
 * Shared Gemini API helper for Sigil.
 *
 * geminiRequest(prompt)  — sends a prompt, resolves with raw text response
 * extractJson(raw)       — bulletproof JSON extractor; handles fences,
 *                          leading/trailing text, and partial wrapping
 */
const https = require('https');

/**
 * Sends a prompt to Gemini 2.0 Flash and resolves with the text response.
 * Rejects with a descriptive Error on failure.
 *
 * @param {string} prompt
 * @param {object} [opts]
 * @param {number} [opts.temperature=1.0]
 * @param {number} [opts.maxOutputTokens=768]
 * @returns {Promise<string>}
 */
function geminiRequest(prompt, opts = {}) {
    return new Promise((resolve, reject) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return reject(new Error('GEMINI_API_KEY is not set in environment variables.'));

        const body = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature:     opts.temperature     ?? 1.0,
                maxOutputTokens: opts.maxOutputTokens ?? 768,
            },
        });

        const req = https.request({
            hostname: 'generativelanguage.googleapis.com',
            path:     `/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
            method:   'POST',
            headers:  {
                'Content-Type':   'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed   = JSON.parse(data);
                    // Surface API-level errors (e.g. quota, invalid key)
                    if (parsed.error) {
                        return reject(new Error(`Gemini API error: ${parsed.error.message || JSON.stringify(parsed.error)}`));
                    }
                    const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
                    resolve(text.trim());
                } catch (e) {
                    reject(new Error(`Failed to parse Gemini HTTP response: ${e.message}`));
                }
            });
        });

        req.on('error', (e) => reject(new Error(`Gemini request error: ${e.message}`)));
        req.write(body);
        req.end();
    });
}

/**
 * Extracts the first valid JSON object from a Gemini response string.
 *
 * Handles all known Gemini formatting quirks:
 *   - ```json ... ``` fences
 *   - ``` ... ``` plain fences
 *   - Leading prose ("Here is the JSON: {...}")
 *   - Trailing prose ("{ ... } Hope that helps!")
 *   - Nested objects / arrays inside the root object
 *
 * @param {string} raw — raw text from Gemini
 * @returns {object}  — parsed JSON object
 * @throws {Error}    — if no valid JSON object can be found
 */
function extractJson(raw) {
    if (!raw || typeof raw !== 'string') throw new Error('Empty response from Gemini.');

    // 1. Strip markdown code fences
    let text = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();

    // 2. Find the first '{' and the matching closing '}' using brace counting
    const start = text.indexOf('{');
    if (start === -1) throw new Error('No JSON object found in Gemini response.');

    let depth  = 0;
    let end    = -1;
    let inStr  = false;
    let escape = false;

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

    const jsonStr = text.slice(start, end + 1);

    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        throw new Error(`JSON parse failed after extraction: ${e.message}`);
    }
}

module.exports = { geminiRequest, extractJson };
