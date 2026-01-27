# Vercel Serverless Functions 사용 가이드

## 📁 프로젝트 구조
```
ingyu world/
├── api/                      # Vercel Functions
│   ├── generate-words.js     # 감정 단어 생성 API
│   └── generate-advice.js    # AI 조언 생성 API
├── vercel.json              # Vercel 설정
└── ... (기존 파일들)
```

## 🔑 Vercel 환경변수 설정

### 1. Vercel Dashboard 접속
1. https://vercel.com 로그인
2. 프로젝트 선택 (`aiworld`)
3. **Settings** → **Environment Variables**

### 2. 환경변수 추가
- **Key:** `GEMINI_API_KEY`
- **Value:** `your-gemini-api-key-here`
- **Environment:** Production, Preview, Development 모두 체크

### 3. 재배포
환경변수 추가 후 자동으로 재배포되거나, 수동으로 재배포 필요

---

## 🚀 클라이언트에서 API 호출 방법

### 1. 감정 단어 생성
```javascript
async function generateEmotionWords(emotion, emotionName) {
  try {
    const response = await fetch('/api/generate-words', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emotion: emotion,      // 'happy', 'sad', 'angry', 'anxious', 'calm'
        emotionName: emotionName  // '기쁨', '슬픔', '화남', '불안', '평온'
      })
    });

    const data = await response.json();
    
    if (data.success) {
      return data.words; // ["신나는", "뿌듯한", ...]
    } else {
      throw new Error('Failed to generate words');
    }
  } catch (error) {
    console.error('Error:', error);
    // 기본 단어 반환 등 에러 처리
    return getDefaultWords(emotion);
  }
}
```

### 2. AI 조언 생성
```javascript
async function generateAdvice(emotionData) {
  try {
    const response = await fetch('/api/generate-advice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emotion: emotionData.emotion,
        emotionName: emotionData.emotionName,
        selectedWords: emotionData.selectedWords,
        reason: emotionData.reason || ''
      })
    });

    const data = await response.json();
    
    if (data.success) {
      return data.advice;
      // {
      //   empathy: "공감 메시지",
      //   suggestion: "조언",
      //   quote: "명언",
      //   quoteSource: "출처"
      // }
    } else {
      throw new Error('Failed to generate advice');
    }
  } catch (error) {
    console.error('Error:', error);
    return getDefaultAdvice(emotionData.emotion);
  }
}
```

---

## 🔒 보안 장점

### ✅ API 키가 안전하게 보호됨
- 브라우저에서 API 키 노출 없음
- GitHub에 API 키 업로드 안 됨
- Vercel 서버에서만 API 호출

### ✅ CORS 설정
- 모든 도메인에서 접근 가능하도록 설정
- 필요시 특정 도메인만 허용하도록 변경 가능

---

## 🧪 로컬 테스트

### Vercel CLI 설치
```bash
npm install -g vercel
```

### 로컬 환경변수 설정
`.env` 파일 생성 (`.gitignore`에 추가됨):
```
GEMINI_API_KEY=your-api-key-here
```

### 로컬 서버 실행
```bash
vercel dev
```

이제 `http://localhost:3000`에서 테스트 가능!

---

## 📊 API 응답 예시

### generate-words API
**요청:**
```json
{
  "emotion": "happy",
  "emotionName": "기쁨"
}
```

**응답:**
```json
{
  "success": true,
  "words": [
    "신나는", "뿌듯한", "설레는", "편안한", "즐거운",
    "행복한", "기쁜", "상쾌한", "흐뭇한", "만족스러운"
  ],
  "emotion": "happy"
}
```

### generate-advice API
**요청:**
```json
{
  "emotion": "happy",
  "emotionName": "기쁨",
  "selectedWords": ["신나는", "뿌듯한"],
  "reason": "시험에서 100점을 받았어요!"
}
```

**응답:**
```json
{
  "success": true,
  "advice": {
    "empathy": "100점을 받다니 정말 대단해요! 열심히 공부한 결과가 나타났네요.",
    "suggestion": "이 기쁨을 친구들과 나눠보는 건 어떨까요? 함께 기뻐하면 더 행복해질 거예요!",
    "quote": "행복은 나눌수록 배가 된다.",
    "quoteSource": "속담"
  }
}
```

---

## ⚠️ 주의사항

### 1. API 호출 제한
- Gemini API 무료 플랜: 분당 60회
- 과도한 호출 시 에러 발생 가능
- 캐싱 또는 debounce 적용 권장

### 2. 에러 처리
- 항상 try-catch 사용
- Fallback 데이터 준비
- 사용자에게 친절한 에러 메시지

### 3. 타임아웃
- Vercel Functions 최대 실행 시간: 10초
- Gemini API 응답 느릴 경우 대비

---

## 🎯 다음 단계

1. ✅ Gemini API 키 발급
2. ✅ Vercel 환경변수 설정
3. ⬜ 감정 출석부 UI 구현
4. ⬜ API 호출 로직 통합
5. ⬜ 테스트 및 디버깅

---

**작성일:** 2026-01-28
**버전:** 1.0
