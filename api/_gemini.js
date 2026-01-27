const DEFAULT_MODELS = [
    process.env.GEMINI_MODEL,
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest'
].filter(Boolean);

function buildRequestBody(prompt, generationConfig) {
    return {
        contents: [{
            parts: [{
                text: prompt
            }]
        }],
        generationConfig: generationConfig || {}
    };
}

async function readErrorDetail(response) {
    try {
        const data = await response.json();
        if (data?.error?.message) {
            return data.error.message;
        }
        return JSON.stringify(data);
    } catch (error) {
        try {
            return await response.text();
        } catch (textError) {
            return '';
        }
    }
}

export async function generateGeminiText({
    apiKey,
    prompt,
    generationConfig,
    models = DEFAULT_MODELS
}) {
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY not configured');
    }

    let lastError = null;

    for (const model of models) {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(buildRequestBody(prompt, generationConfig))
                }
            );

            if (!response.ok) {
                const detail = await readErrorDetail(response);
                const error = new Error(`Gemini API error: ${response.status}${detail ? ` (${detail})` : ''}`);

                if (response.status === 404) {
                    lastError = error;
                    continue;
                }

                throw error;
            }

            const data = await response.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                throw new Error('Gemini API returned empty content');
            }

            return text;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error('Gemini API request failed');
}
