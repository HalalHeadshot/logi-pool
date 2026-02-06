/**
 * Translation Service using Google Translate API
 * Handles translation between English, Hindi, and Marathi
 */

import fetch from 'node-fetch';

/**
 * Helper to call Gemini API for translation
 */
async function callGeminiTranslate(text, promptInstruction) {
    if (!process.env.GEMINI_API_KEY) {
        console.error("❌ GEMINI_API_KEY missing");
        return text;
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: `${promptInstruction}\n\nText: ${text}` }]
                    }]
                })
            }
        );

        const data = await response.json();
        if (data.error) {
            console.error("❌ Gemini API Error:", data.error.message);
            return text;
        }

        const translated = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return translated ? translated.trim() : text;

    } catch (error) {
        console.error("❌ Gemini Translation Failed:", error.message);
        return text;
    }
}

/**
 * Translate text from any language to English
 * @param {string} text - Text to translate
 * @param {string} fromLang - Source language code (ignored for Gemini as it auto-detects)
 * @returns {Promise<string>} - Translated text in English
 */
export async function translateToEnglish(text, fromLang = 'auto') {
    if (!text) return text;

    try {
        const prompt = "Translate the following text to English. Return ONLY the translated text, no other text. If it is already English, return it exactly as is.";
        const translated = await callGeminiTranslate(text, prompt);
        console.log(`🌐 Translated to English (Gemini): "${text}" -> "${translated}"`);
        return translated;
    } catch (error) {
        console.error('❌ Translation to English failed:', error.message);
        return text;
    }
}

/**
 * Translate text from English to user's preferred language
 * @param {string} text - Text to translate (in English)
 * @param {string} toLang - Target language code ('en', 'hi', 'mr')
 * @returns {Promise<string>} - Translated text
 */
export async function translateToUserLang(text, toLang = 'en') {
    if (!text) return text;
    if (toLang === 'en') return text;

    const langNames = {
        'hi': 'Hindi',
        'mr': 'Marathi'
    };
    const targetLang = langNames[toLang] || 'English';

    try {
        const prompt = `Translate the following text to ${targetLang}. Return ONLY the translated text, no other text. Keep numeric values and special characters intact.`;
        const translated = await callGeminiTranslate(text, prompt);
        console.log(`🌐 Translated to ${toLang} (Gemini): "${text}" -> "${translated}"`);
        return translated;
    } catch (error) {
        console.error(`❌ Translation to ${toLang} failed:`, error.message);
        return text;
    }
}

/**
 * Get language name from code
 * @param {string} code - Language code
 * @returns {string} - Language name
 */
export function getLanguageName(code) {
    const languages = {
        'en': 'English',
        'hi': 'Hindi',
        'mr': 'Marathi'
    };
    return languages[code] || 'English';
}
