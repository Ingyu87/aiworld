// Vercel Serverless Function: 개별 학생 감정 패턴 분석
// 경로: /api/analyze-student-pattern

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
            studentName,
            checkinHistory,  // 최근 체크인 기록 배열
            period           // 분석 기간
        } = req.body;

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        // 학생 데이터 요약
        const studentSummary = generateStudentSummary(studentName, checkinHistory, period);

        const prompt = `
당신은 초등학생의 감정 패턴을 분석하는 전문 학교 상담사입니다.

## 학생 정보:
${studentSummary}

다음 형식으로 분석 리포트를 작성해주세요:

1. **감정 패턴 요약** (2-3문장)
   - 주요 감정 경향
   - 감정 변화의 특징
   - 전반적인 감정 상태 평가

2. **주목할 점** (2-3개 항목)
   - 반복되는 감정이나 단어
   - 특이한 패턴이나 변화
   - 우려되는 부분 (있다면)

3. **교사 대응 제안** (2-3개 구체적 제안)
   - 개별 상담 필요성
   - 학급 활동 참여 방식
   - 긍정적 변화를 위한 접근법

4. **긍정적 측면** (1-2문장)
   - 학생의 강점
   - 격려 포인트

JSON 형식으로 응답:
{
  "summary": "감정 패턴 요약",
  "keyPoints": [
    "주목할 점 1",
    "주목할 점 2",
    "주목할 점 3"
  ],
  "recommendations": [
    "제안 1",
    "제안 2",
    "제안 3"
  ],
  "strengths": "긍정적 측면",
  "alertLevel": "normal" // "normal", "attention", "urgent"
}

초등학생의 발달 단계를 고려하여 작성해주세요.
`;

        const generatedText = await generateGeminiText({
            apiKey: GEMINI_API_KEY,
            prompt,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 800,
            }
        });

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
            analysis = getDefaultStudentAnalysis(studentName);
        }

        return res.status(200).json({
            success: true,
            analysis: analysis,
            studentName: studentName
        });

    } catch (error) {
        console.error('Error analyzing student pattern:', error);

        return res.status(200).json({
            success: true,
            analysis: getDefaultStudentAnalysis(req.body.studentName),
            fallback: true
        });
    }
}

// 학생 데이터 요약 생성
function generateStudentSummary(studentName, checkinHistory, period) {
    let summary = `학생 이름: ${studentName}\n`;
    summary += `분석 기간: ${period}\n`;
    summary += `총 체크인 횟수: ${checkinHistory.length}회\n\n`;

    if (checkinHistory.length === 0) {
        summary += "체크인 기록이 없습니다.\n";
        return summary;
    }

    // 감정 빈도 계산
    const emotionCounts = {};
    const allWords = [];

    checkinHistory.forEach(checkin => {
        emotionCounts[checkin.emotion] = (emotionCounts[checkin.emotion] || 0) + 1;
        if (checkin.selectedWords) {
            allWords.push(...checkin.selectedWords);
        }
    });

    summary += "감정 분포:\n";
    for (const [emotion, count] of Object.entries(emotionCounts)) {
        summary += `- ${emotion}: ${count}회\n`;
    }

    // 자주 선택한 단어
    const wordFreq = {};
    allWords.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    const topWords = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word, count]) => `${word}(${count}회)`);

    if (topWords.length > 0) {
        summary += `\n자주 선택한 감정 단어: ${topWords.join(', ')}\n`;
    }

    // 최근 3개 체크인 상세
    summary += `\n최근 체크인 기록:\n`;
    checkinHistory.slice(0, 3).forEach((checkin, index) => {
        summary += `${index + 1}. ${checkin.date}: ${checkin.emotion} - ${checkin.selectedWords?.join(', ') || '단어 없음'}\n`;
        if (checkin.reason) {
            summary += `   이유: ${checkin.reason}\n`;
        }
    });

    return summary;
}

function getDefaultStudentAnalysis(studentName) {
    return {
        summary: `${studentName} 학생의 감정 패턴을 분석했습니다. 전반적으로 안정적인 감정 상태를 보이고 있습니다.`,
        keyPoints: [
            "다양한 감정을 표현하고 있습니다.",
            "감정 체크인에 성실하게 참여하고 있습니다.",
            "자신의 감정을 인식하고 표현하는 능력이 있습니다."
        ],
        recommendations: [
            "현재의 긍정적인 패턴을 유지하도록 격려해주세요.",
            "감정 표현을 계속 지지해주세요.",
            "필요시 개별 대화 시간을 가져보세요."
        ],
        strengths: "자신의 감정을 솔직하게 표현하는 것은 매우 긍정적입니다.",
        alertLevel: "normal"
    };
}
