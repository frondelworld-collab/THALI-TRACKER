// Rapid-fire test to trigger 429 and observe backoff behavior
// Fires 10 requests as fast as possible against the Gemini API

import fs from 'fs';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error('GEMINI_API_KEY not set. Run: $env:GEMINI_API_KEY="your-key"');
    process.exit(1);
}

// Use a tiny base64 image (1x1 red pixel PNG)
const tinyPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

async function fireRequest(index) {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Request #${index + 1}: Firing...`);

    let maxRetries = 3;
    let attempt = 0;
    let response;

    while (attempt <= maxRetries) {
        try {
            response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: 'What food is this? Return JSON: { "detectedFood": "name", "calories": 0, "protein": 0, "carbs": 0, "fats": 0 }' },
                                { inlineData: { mimeType: 'image/png', data: tinyPng } }
                            ]
                        }],
                        generationConfig: { responseMimeType: 'application/json' }
                    })
                }
            );

            if (response.status === 429) {
                attempt++;
                const backoffMs = Math.pow(2, attempt) * 1000;
                console.log(`[${new Date().toISOString()}] Request #${index + 1}: GOT 429! Backoff attempt ${attempt}/${maxRetries}, waiting ${backoffMs}ms...`);
                if (attempt > maxRetries) {
                    console.log(`[${new Date().toISOString()}] Request #${index + 1}: EXHAUSTED retries after ${Date.now() - startTime}ms`);
                    return { index, status: 429, retries: attempt, elapsed: Date.now() - startTime };
                }
                await new Promise(r => setTimeout(r, backoffMs));
                continue;
            }

            const elapsed = Date.now() - startTime;
            if (response.ok) {
                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'no text';
                console.log(`[${new Date().toISOString()}] Request #${index + 1}: SUCCESS (${response.status}) in ${elapsed}ms after ${attempt} retries. Response: ${text.substring(0, 80)}`);
                return { index, status: 200, retries: attempt, elapsed };
            } else {
                const errText = await response.text();
                console.log(`[${new Date().toISOString()}] Request #${index + 1}: ERROR ${response.status} in ${elapsed}ms: ${errText.substring(0, 120)}`);
                return { index, status: response.status, retries: attempt, elapsed };
            }
        } catch (e) {
            console.log(`[${new Date().toISOString()}] Request #${index + 1}: NETWORK ERROR: ${e.message}`);
            return { index, status: 'error', retries: attempt, elapsed: Date.now() - startTime };
        }
    }
}

async function main() {
    console.log(`\n========================================`);
    console.log(`RAPID-FIRE BACKOFF TEST - 10 concurrent requests`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`API Key: ${API_KEY.substring(0, 8)}...`);
    console.log(`========================================\n`);

    // Fire all 10 simultaneously to force rate limiting
    const promises = [];
    for (let i = 0; i < 10; i++) {
        promises.push(fireRequest(i));
    }

    const results = await Promise.all(promises);
    
    console.log(`\n========================================`);
    console.log(`RESULTS SUMMARY`);
    console.log(`========================================`);
    const successes = results.filter(r => r.status === 200).length;
    const rateLimited = results.filter(r => r.status === 429).length;
    const errors = results.filter(r => r.status !== 200 && r.status !== 429).length;
    console.log(`Total: ${results.length}`);
    console.log(`Succeeded: ${successes}`);
    console.log(`Rate Limited (429, retries exhausted): ${rateLimited}`);
    console.log(`Other Errors: ${errors}`);
    results.forEach(r => {
        console.log(`  Request #${r.index + 1}: status=${r.status}, retries=${r.retries}, elapsed=${r.elapsed}ms`);
    });
}

main();
