// Vercel Serverless Function: AI 조언 생성
// 경로: /api/generate-advice

export default async function handler(req, res) {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { emotion, emotionName, selectedWords, reason } = req.body;

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        // Gemini API 호출
        const prompt = `
당신은 초등학생의 감정을 이해하고 따뜻하게 공감해주는 상담 선생님입니다.

학생의 감정 상태:
- 선택한 감정: ${emotionName}
- 선택한 감정 단어: ${selectedWords.join(', ')}
${reason ? `- 이유: ${reason}` : ''}

다음 형식으로 응답해주세요:

1. **공감 메시지** (1-2문장)
   - 학생의 감정을 따뜻하게 인정하고 공감
   - 긍정적이고 지지적인 톤
   - 초등학생이 이해하기 쉬운 표현

2. **실천 가능한 조언** (1-2문장)
   - 구체적이고 실천 가능한 행동 제안
   - 학생의 발달 단계에 맞는 조언
   - 강요하지 않고 제안하는 톤

3. **명언/속담/애니메이션 대사**
   - 학생의 감정과 관련된 위로가 되는 명언
   - 출처 명시 (명언가 이름, 애니메이션 제목, 속담 등)
   - 초등학생이 이해하고 공감할 수 있는 내용

JSON 형식으로만 응답:
{
  "empathy": "공감 메시지",
  "suggestion": "실천 가능한 조언",
  "quote": "명언/속담/대사 내용",
  "quoteSource": "출처"
}

다른 설명 없이 JSON만 반환해주세요.
`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.8,
                        maxOutputTokens: 500,
                    }
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const generatedText = data.candidates[0].content.parts[0].text;

        // JSON 파싱
        let advice;
        try {
            const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                advice = JSON.parse(jsonMatch[0]);
            } else {
                advice = JSON.parse(generatedText);
            }
        } catch (parseError) {
            console.error('JSON parse error:', generatedText);
            throw new Error('Failed to parse AI response');
        }

        return res.status(200).json({
            success: true,
            advice: advice
        });

    } catch (error) {
        console.error('Error generating advice:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
