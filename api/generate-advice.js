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
            advice = getDefaultAdvice(emotion);
        }

        return res.status(200).json({
            success: true,
            advice: advice
        });

    } catch (error) {
        console.error('Error generating advice:', error);

        const defaultAdvice = getDefaultAdvice(req.body.emotion);

        return res.status(200).json({
            success: true,
            advice: defaultAdvice,
            fallback: true
        });
    }
}

// 기본 조언 (API 실패 시 사용)
function getDefaultAdvice(emotion) {
    const defaultAdviceSet = {
        happy: {
            empathy: "정말 기쁜 일이 있었나 봐요! 행복한 마음이 느껴져요.",
            suggestion: "이 기쁨을 친구들이나 가족과 나눠보는 건 어떨까요? 행복은 나눌수록 커진답니다!",
            quote: "행복은 나눌수록 배가 된다.",
            quoteSource: "속담"
        },
        sad: {
            empathy: "슬픈 마음이 드는 날도 있어요. 그런 감정을 느끼는 것은 자연스러운 일이에요.",
            suggestion: "슬플 때는 신뢰하는 사람에게 이야기하거나, 좋아하는 활동을 해보세요. 시간이 지나면 괜찮아질 거예요.",
            quote: "비가 온 뒤에 땅이 더 단단해진다.",
            quoteSource: "속담"
        },
        angry: {
            empathy: "화가 나는 일이 있었군요. 그런 감정을 느끼는 건 괜찮아요.",
            suggestion: "화가 날 때는 심호흡을 하거나 잠시 쉬어보세요. 마음이 진정되면 더 좋은 해결책을 찾을 수 있어요.",
            quote: "화는 마음의 적이다.",
            quoteSource: "속담"
        },
        anxious: {
            empathy: "걱정되는 마음이 드는군요. 불안한 감정은 누구나 느낄 수 있어요.",
            suggestion: "걱정될 때는 선생님이나 부모님께 이야기해보세요. 함께 해결 방법을 찾을 수 있을 거예요.",
            quote: "걱정은 빚과 같아서, 갚지 않으면 이자가 붙는다.",
            quoteSource: "명언"
        },

        calm: {
            empathy: "마음이 평온하고 차분하네요. 좋은 상태예요!",
            suggestion: "이 평온한 마음을 유지하면서 오늘 하루를 보내보세요. 좋은 에너지가 될 거예요.",
            quote: "고요한 물이 깊다.",
            quoteSource: "속담"
        },
        disappointed: {
            empathy: "기대했던 것과 달라서 실망스러웠군요. 속상한 마음이 드는 건 당연해요.",
            suggestion: "다음에 더 좋은 기회가 올 거예요. 잠시 기분 전환을 해보는 건 어떨까요?",
            quote: "실패는 성공의 어머니.",
            quoteSource: "속담"
        },
        tired: {
            empathy: "몸도 마음도 지쳐있군요. 정말 고생 많았어요.",
            suggestion: "오늘은 푹 쉬는 게 제일 중요해요. 따뜻한 우유를 마시거나 일찍 잠자리에 들어보세요.",
            quote: "휴식은 게으름이 아니라 재충전이다.",
            quoteSource: "명언"
        },
        surprised: {
            empathy: "갑작스러운 일로 많이 놀라셨겠어요. 마음이 진정될 시간이 필요해요.",
            suggestion: "천천히 심호흡을 해보세요. 놀란 마음을 가라앉히면 상황이 더 잘 보일 거예요.",
            quote: "침착함이 이긴다.",
            quoteSource: "명언"
        }
    };

    return defaultAdviceSet[emotion] || defaultAdviceSet.calm;
}
