// Vercel Serverless Function: 감정 단어 생성
// 경로: /api/generate-words

export default async function handler(req, res) {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // OPTIONS 요청 처리 (CORS preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // POST 요청만 허용
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { emotion, emotionName } = req.body;

        // Gemini API 키 (환경변수에서 가져옴)
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        // Gemini API 호출
        const prompt = `
당신은 초등학생의 감정을 이해하고 도와주는 친절한 선생님입니다.

학생이 "${emotionName}" 감정을 선택했습니다.
초등학생(8-13세)이 쉽게 이해하고 공감할 수 있는 감정 표현 단어 10개를 생성해주세요.

조건:
1. 각 단어는 2-4글자의 형용사 형태
2. 초등학생 수준에 맞는 쉬운 단어
3. "${emotionName}" 감정과 관련된 다양한 뉘앙스 포함
4. 중복 없이 10개 정확히 생성

응답 형식: JSON 배열만 반환 (다른 설명 없이)
예시: ["신나는", "뿌듯한", "설레는", "편안한", "즐거운", "행복한", "기쁜", "상쾌한", "흐뭇한", "만족스러운"]
`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
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
                        temperature: 0.9,
                        maxOutputTokens: 200,
                    }
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const generatedText = data.candidates[0].content.parts[0].text;

        // JSON 파싱 (Gemini가 가끔 마크다운으로 감싸서 반환하므로 처리)
        let words;
        try {
            // ```json ... ``` 형태로 올 경우 처리
            const jsonMatch = generatedText.match(/\[.*\]/s);
            if (jsonMatch) {
                words = JSON.parse(jsonMatch[0]);
            } else {
                words = JSON.parse(generatedText);
            }
        } catch (parseError) {
            console.error('JSON parse error:', generatedText);
            // 파싱 실패 시 기본 단어 반환
            words = getDefaultWords(emotion);
        }

        // 10개 제한
        words = words.slice(0, 10);

        return res.status(200).json({
            success: true,
            words: words,
            emotion: emotion
        });

    } catch (error) {
        console.error('Error generating words:', error);

        // 에러 시 기본 단어 반환
        const defaultWords = getDefaultWords(req.body.emotion);

        return res.status(200).json({
            success: true,
            words: defaultWords,
            emotion: req.body.emotion,
            fallback: true
        });
    }
}

// 기본 감정 단어 (API 실패 시 사용)
function getDefaultWords(emotion) {
    const defaultWordSets = {
        happy: ["신나는", "뿌듯한", "설레는", "편안한", "즐거운", "행복한", "기쁜", "상쾌한", "흐뭇한", "만족스러운"],
        sad: ["슬픈", "우울한", "속상한", "외로운", "쓸쓸한", "답답한", "서운한", "허전한", "아쉬운", "그리운"],
        angry: ["화나는", "짜증나는", "억울한", "분한", "약오르는", "불쾌한", "답답한", "속상한", "불만스러운", "언짢은"],
        anxious: ["불안한", "걱정되는", "초조한", "긴장되는", "두려운", "떨리는", "무서운", "조마조마한", "겁나는", "조심스러운"],
        calm: ["평온한", "차분한", "편안한", "고요한", "안정된", "여유로운", "느긋한", "담담한", "무덤덤한", "조용한"]
    };

    return defaultWordSets[emotion] || defaultWordSets.calm;
}
