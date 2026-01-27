// Vercel Serverless Function: 학급 감정 분석
// 경로: /api/analyze-class-emotions

import { generateGeminiText } from './_gemini.js';

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

        const generatedText = await generateGeminiText({
            apiKey: GEMINI_API_KEY,
            prompt,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1000,
            }
        });

        let analysis;
        let fallback = false;
        try {
            const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                analysis = JSON.parse(jsonMatch[0]);
            } else {
                analysis = JSON.parse(generatedText);
            }
        } catch (parseError) {
            console.error('JSON parse error:', generatedText);
            analysis = buildFallbackAnalysis(emotionData, checkinRate, period);
            fallback = true;
        }

        return res.status(200).json({
            success: true,
            analysis: analysis,
            period: period,
            fallback: fallback
        });

    } catch (error) {
        console.error('Error analyzing emotions:', error);

        return res.status(500).json({
            success: false,
            error: error.message
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
        calm: '평온/무덤덤',
        disappointed: '실망/좌절',
        tired: '피곤/지침',
        surprised: '놀람/당황'
    };

    for (const [emotion, count] of Object.entries(emotionData)) {
        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
        const emotionName = emotionNames[emotion] || emotion;
        summary += `- ${emotionName}: ${count}명 (${percentage}%)\n`;
    }

    return summary;
}

function getPeriodName(period) {
    const names = {
        'today': '오늘',
        'week': '이번 주',
        'month': '이번 달',
        'quarter': '이번 학기'
    };
    return names[period] || period;
}

function buildFallbackAnalysis(emotionData, checkinRate, period) {
    const total = Object.values(emotionData).reduce((sum, count) => sum + count, 0);
    const emotionEntries = Object.entries(emotionData).sort((a, b) => b[1] - a[1]);
    const topEmotion = emotionEntries[0]?.[0] || '감정';
    const topCount = emotionEntries[0]?.[1] || 0;
    const topRatio = total > 0 ? Math.round((topCount / total) * 100) : 0;

    return {
        overview: `${getPeriodName(period)} 기준으로 가장 많이 나타난 감정은 '${topEmotion}'이며, 전체의 약 ${topRatio}%를 차지합니다.`,
        patterns: [
            `체크인 참여율은 약 ${checkinRate}%로 집계되었습니다.`,
            `가장 높은 감정 비중은 '${topEmotion}'입니다.`,
            '최근 감정 변화는 일정 기간 추이를 함께 확인하는 것이 좋습니다.'
        ],
        suggestions: [
            '학급 시작 전 2~3분 감정 나누기 시간을 마련해보세요.',
            '긍정 감정을 강화할 수 있는 짧은 칭찬 카드를 활용해보세요.',
            '부정 감정 비중이 높은 학생은 개별 대화를 시도해보세요.',
            '감정 단어를 다양하게 표현할 수 있는 활동을 추가해보세요.'
        ],
        positives: '학생들이 감정을 기록하고 있다는 점 자체가 매우 긍정적입니다.'
    };
}
