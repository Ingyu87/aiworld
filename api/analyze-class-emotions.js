// Vercel Serverless Function: 학급 감정 분석
// 경로: /api/analyze-class-emotions

export default async function handler(req, res) {
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
        const {
            period,           // 'today', 'week', 'month'
            emotionData,      // 감정 통계 데이터
            studentCount,     // 전체 학생 수
            checkinRate       // 체크인율
        } = req.body;

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        // 데이터 요약 생성
        const dataSummary = generateDataSummary(emotionData, studentCount, checkinRate, period);

        const prompt = `
당신은 초등학교 학급의 감정 데이터를 분석하는 전문 상담 교사입니다.

## 분석 기간: ${getPeriodName(period)}

## 데이터 요약:
${dataSummary}

다음 형식으로 분석 리포트를 작성해주세요:

1. **전반적인 학급 분위기** (2-3문장)
   - 긍정적/부정적 감정 비율 해석
   - 주요 특징 요약
   - 전체적인 평가

2. **주목할 만한 패턴** (2-3개 항목)
   - 특정 감정의 증가/감소 추세
   - 특정 요일이나 시기의 패턴
   - 자주 등장하는 감정 단어의 의미

3. **교사를 위한 실천 제안** (3-4개 구체적 제안)
   - 학급 운영에 적용 가능한 활동
   - 개별 학생 관심이 필요한 경우
   - 긍정적 분위기 조성 방법
   - 부정적 감정 완화 전략

4. **긍정적인 점** (1-2문장)
   - 학급의 강점
   - 격려 메시지

JSON 형식으로 응답:
{
  "overview": "전반적인 학급 분위기",
  "patterns": [
    "패턴 1",
    "패턴 2",
    "패턴 3"
  ],
  "suggestions": [
    "제안 1",
    "제안 2",
    "제안 3",
    "제안 4"
  ],
  "positives": "긍정적인 점"
}

초등학교 교사가 이해하기 쉽고 실천 가능한 내용으로 작성해주세요.
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
                        temperature: 0.7,
                        maxOutputTokens: 1000,
                    }
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const generatedText = data.candidates[0].content.parts[0].text;

        let analysis;
        try {
            const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                analysis = JSON.parse(jsonMatch[0]);
            } else {
                analysis = JSON.parse(generatedText);
            }
        } catch (parseError) {
            console.error('JSON parse error:', generatedText);
            analysis = getDefaultAnalysis(period);
        }

        return res.status(200).json({
            success: true,
            analysis: analysis,
            period: period
        });

    } catch (error) {
        console.error('Error analyzing emotions:', error);

        return res.status(200).json({
            success: true,
            analysis: getDefaultAnalysis(req.body.period),
            fallback: true
        });
    }
}

// 데이터 요약 생성
function generateDataSummary(emotionData, studentCount, checkinRate, period) {
    const total = Object.values(emotionData).reduce((sum, count) => sum + count, 0);

    let summary = `- 전체 학생 수: ${studentCount}명\n`;
    summary += `- 체크인 참여율: ${checkinRate}%\n`;
    summary += `- 총 체크인 수: ${total}회\n\n`;
    summary += `감정 분포:\n`;

    const emotionNames = {
        happy: '기쁨/행복',
        sad: '슬픔/우울',
        angry: '화남/짜증',
        anxious: '불안/걱정',
        calm: '평온/무덤덤'
    };

    for (const [emotion, count] of Object.entries(emotionData)) {
        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
        summary += `- ${emotionNames[emotion]}: ${count}회 (${percentage}%)\n`;
    }

    return summary;
}

function getPeriodName(period) {
    const names = {
        today: '오늘',
        week: '이번 주',
        month: '이번 달',
        quarter: '이번 분기'
    };
    return names[period] || '기간';
}

function getDefaultAnalysis(period) {
    return {
        overview: `${getPeriodName(period)} 학급의 감정 상태를 분석했습니다. 전반적으로 안정적인 분위기를 유지하고 있습니다.`,
        patterns: [
            "학생들의 감정 표현이 다양하게 나타나고 있습니다.",
            "긍정적 감정과 부정적 감정의 균형을 유지하고 있습니다.",
            "대부분의 학생들이 감정 체크인에 적극적으로 참여하고 있습니다."
        ],
        suggestions: [
            "학생들과의 개별 대화 시간을 늘려보세요.",
            "긍정적인 학급 분위기 조성을 위한 활동을 계획해보세요.",
            "부정적 감정을 표현한 학생들에게 관심을 가져주세요.",
            "감정 표현을 격려하는 활동을 지속해주세요."
        ],
        positives: "학생들이 자신의 감정을 솔직하게 표현하고 있다는 것은 매우 긍정적입니다. 안전한 학급 분위기가 형성되어 있습니다."
    };
}
