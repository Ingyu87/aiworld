# 감정 출석부 시스템 PRD (Product Requirements Document)

## 📋 프로젝트 개요

### 목적
학생들의 일일 감정 상태를 체크하고, AI 기반 맞춤형 조언을 제공하며, 교사가 학급 전체의 감정 흐름을 파악할 수 있는 시스템 구축

### 핵심 가치
- 🎯 학생 감정 인식 및 표현 능력 향상
- 💬 AI 기반 개인화된 감정 케어
- 📊 교사의 학급 감정 상태 모니터링
- 🌱 장기적인 감정 패턴 분석 및 관리

---

## 🎨 사용자 플로우

### 학생 플로우
```
로그인 → AI 안전 사용 지침 동의 → 감정 출석부 → 메인 화면
```

#### 상세 단계:
1. **감정 선택** (5가지 이모티콘)
   - 😊 기쁨/행복
   - 😢 슬픔/우울
   - 😠 화남/짜증
   - 😰 불안/걱정
   - 😐 평온/무덤덤

2. **감정 단어 선택** (AI 생성, 복수 선택 가능)
   - 선택한 이모티콘에 맞는 감정 단어 8-10개 제시
   - 예: 😊 → "신나는", "뿌듯한", "설레는", "편안한" 등
   - 학생이 여러 개 선택 가능

3. **이유 작성** (자유 텍스트)
   - "왜 그런 감정을 느꼈나요?" (50-200자)
   - 선택 사항이지만 권장

4. **AI 조언 및 명언 제시**
   - 선택한 감정과 이유를 분석하여:
     - 공감 메시지
     - 실천 가능한 조언
     - 관련 애니메이션 명대사/속담/명언
   - 예쁜 카드 형태로 표시

5. **완료 및 메인 화면 이동**

### 교사 플로우
```
교사 대시보드 → 감정 출석부 탭 → 통계 및 개별 학생 상세 보기
```

---

## 🛠️ 기술 스펙

### 프론트엔드
- **HTML/CSS/JavaScript** (기존 스택 유지)
- **Chart.js** - 통계 시각화
- **WordCloud2.js** - 워드 클라우드 생성
- **애니메이션** - CSS transitions, 부드러운 UX

### 백엔드
- **Firebase Firestore** - 데이터 저장
- **Firebase Authentication** - 사용자 인증
- **Google Gemini API** - AI 감정 단어 생성 및 조언

### 데이터 구조

#### Firestore Collections

##### 1. `emotional_checkins` (감정 출석부 기록)
```javascript
{
  id: "auto-generated-id",
  userId: "student-uid",
  userName: "학생이름",
  date: "2026-01-28", // YYYY-MM-DD
  timestamp: Timestamp,
  
  // 1단계: 감정 선택
  emotion: "happy", // happy, sad, angry, anxious, calm
  emotionEmoji: "😊",
  
  // 2단계: AI 생성 단어 및 학생 선택
  aiGeneratedWords: ["신나는", "뿌듯한", "설레는", ...],
  selectedWords: ["신나는", "뿌듯한"],
  
  // 3단계: 이유 작성
  reason: "오늘 수학 시험에서 100점을 받아서 기분이 좋아요!",
  
  // 4단계: AI 조언
  aiAdvice: {
    empathy: "100점을 받다니 정말 대단해요!",
    suggestion: "이 기쁨을 친구들과 나눠보는 건 어떨까요?",
    quote: "행복은 나눌수록 커진다. - 괴테",
    quoteSource: "명언"
  },
  
  // 메타데이터
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

##### 2. `emotional_stats` (통계 집계용 - 선택사항)
```javascript
{
  id: "2026-01-28",
  date: "2026-01-28",
  totalCheckins: 25,
  emotionCounts: {
    happy: 15,
    sad: 3,
    angry: 2,
    anxious: 3,
    calm: 2
  },
  topWords: [
    { word: "신나는", count: 8 },
    { word: "뿌듯한", count: 6 },
    ...
  ]
}
```

---

## 🎯 주요 기능 명세

### 1. 학생 감정 출석부 페이지 (`emotional-checkin.html`)

#### 1.1 감정 선택 화면
- **UI 요소:**
  - 5개의 큰 이모티콘 버튼 (클릭 시 확대 애니메이션)
  - 각 이모티콘 아래 감정 이름 표시
  - 선택 시 다음 단계로 부드럽게 전환

#### 1.2 감정 단어 선택 화면
- **AI 생성 프로세스:**
  ```javascript
  // Gemini API 호출
  const prompt = `
  사용자가 "${emotionName}" 감정을 선택했습니다.
  초등학생이 이해할 수 있는 감정 표현 단어 10개를 생성해주세요.
  각 단어는 2-4글자의 형용사 형태로 작성해주세요.
  JSON 배열 형식으로만 응답해주세요: ["단어1", "단어2", ...]
  `;
  ```
- **UI 요소:**
  - 로딩 스피너 (AI 생성 중)
  - 10개의 단어 카드 (체크박스 형태)
  - 최소 1개 이상 선택 필수
  - "다음" 버튼

#### 1.3 이유 작성 화면
- **UI 요소:**
  - 선택한 감정과 단어 요약 표시
  - 텍스트 영역 (50-200자)
  - 글자 수 카운터
  - "건너뛰기" / "다음" 버튼

#### 1.4 AI 조언 화면
- **AI 생성 프로세스:**
  ```javascript
  const prompt = `
  초등학생이 다음과 같은 감정을 표현했습니다:
  - 감정: ${emotion}
  - 선택한 단어: ${selectedWords.join(', ')}
  - 이유: ${reason}
  
  다음 형식으로 응답해주세요:
  1. 공감 메시지 (1-2문장, 따뜻하고 긍정적으로)
  2. 실천 가능한 조언 (1-2문장, 구체적이고 실천 가능하게)
  3. 관련 명언/속담/애니메이션 대사 (출처 포함)
  
  JSON 형식으로 응답:
  {
    "empathy": "공감 메시지",
    "suggestion": "조언",
    "quote": "명언 내용",
    "quoteSource": "출처"
  }
  `;
  ```
- **UI 요소:**
  - 예쁜 카드 디자인
  - 이모티콘 애니메이션
  - "메인으로 가기" 버튼

---

### 2. 교사 대시보드 - 감정 출석부 탭

#### 2.1 개요 대시보드
- **오늘의 감정 현황**
  - 출석률: "25명 중 23명 체크 완료"
  - 감정 분포 도넛 차트
  - 미체크 학생 목록

#### 2.2 워드 클라우드
- **기간 선택:**
  - 오늘 / 이번 주 / 이번 달 / 분기별
- **시각화:**
  - 가장 많이 선택된 감정 단어 워드 클라우드
  - 단어 클릭 시 해당 단어를 선택한 학생 목록

#### 2.3 감정 트렌드 차트
- **기간별 감정 변화:**
  - 일별 (최근 7일)
  - 주별 (최근 4주)
  - 월별 (최근 3개월)
  - 분기별 (최근 4분기)
- **차트 타입:**
  - 라인 차트 (감정별 추이)
  - 스택 바 차트 (전체 비율)

#### 2.4 개별 학생 상세
- **학생 선택 시:**
  - 해당 학생의 감정 히스토리 (최근 30일)
  - 자주 선택한 감정 단어 TOP 10
  - 감정 패턴 분석 (예: "최근 1주일간 '불안' 감정이 증가했습니다")
  - 개별 체크인 기록 상세 보기

#### 2.5 알림 및 관심 학생
- **자동 알림:**
  - 3일 연속 부정적 감정 선택 시
  - 1주일 이상 체크인 안 한 학생
- **관심 학생 마킹:**
  - 교사가 수동으로 관심 학생 지정
  - 해당 학생 감정 변화 시 알림

---

## 🎨 UI/UX 디자인 가이드

### 학생 페이지
- **컬러 팔레트:**
  - 😊 기쁨: `#FFD93D` (노란색)
  - 😢 슬픔: `#6BCB77` (연한 파란색)
  - 😠 화남: `#FF6B6B` (빨간색)
  - 😰 불안: `#A8DADC` (민트색)
  - 😐 평온: `#B4A7D6` (보라색)

- **애니메이션:**
  - 페이지 전환: 부드러운 fade-in
  - 버튼 클릭: scale + bounce
  - 로딩: 귀여운 스피너

- **폰트:**
  - 제목: 'Noto Sans KR', Bold
  - 본문: 'Noto Sans KR', Regular
  - 크기: 초등학생이 읽기 편한 16px 이상

### 교사 대시보드
- **레이아웃:**
  - 좌측: 네비게이션 (기존 탭 + 감정 출석부 탭)
  - 우측: 메인 콘텐츠 영역
  - 상단: 기간 선택 필터

- **차트 스타일:**
  - 부드러운 그라데이션
  - 호버 시 상세 정보 툴팁
  - 반응형 디자인

---

## 🔌 API 통합

### Google Gemini API

#### 설정
```javascript
// gemini-config.js
const GEMINI_API_KEY = "YOUR_API_KEY"; // 환경 변수로 관리
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
```

#### API 호출 함수
```javascript
async function callGeminiAPI(prompt) {
  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    })
  });
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}
```

#### 사용 예시
```javascript
// 감정 단어 생성
const words = await generateEmotionWords("happy");

// AI 조언 생성
const advice = await generateAdvice({
  emotion: "happy",
  words: ["신나는", "뿌듯한"],
  reason: "시험에서 100점을 받았어요"
});
```

---

## 📊 데이터 분석 기능

### 1. 일별 통계
- 오늘 체크인한 학생 수
- 감정 분포
- 가장 많이 선택된 단어 TOP 5

### 2. 주별 통계
- 주간 체크인율
- 감정 변화 추이
- 주간 워드 클라우드

### 3. 월별 통계
- 월간 감정 평균
- 학생별 체크인 빈도
- 월간 트렌드 분석

### 4. 분기별 통계
- 장기 감정 패턴
- 계절별 감정 변화
- 학급 전체 감정 건강도

---

## 🔒 보안 및 개인정보

### Firestore Rules
```javascript
match /emotional_checkins/{checkinId} {
  // 학생은 자신의 기록만 생성/읽기
  allow create: if isAuthenticated() && 
                  request.resource.data.userId == request.auth.uid;
  allow read: if isAuthenticated() && 
                (resource.data.userId == request.auth.uid || isTeacher());
  
  // 교사는 모든 기록 읽기 가능
  allow list: if isTeacher();
  
  // 수정/삭제 불가 (기록 보존)
  allow update, delete: if false;
}
```

### 개인정보 보호
- 학생 이름은 교사에게만 표시
- 감정 이유는 암호화 저장 고려
- 통계는 익명화하여 표시

---

## 📅 개발 일정 (예상)

### Phase 1: 기본 기능 (1주)
- [ ] 감정 출석부 페이지 UI 구현
- [ ] Gemini API 연동
- [ ] Firestore 데이터 저장
- [ ] 기본 플로우 완성

### Phase 2: 교사 대시보드 (1주)
- [ ] 감정 출석부 탭 추가
- [ ] 오늘의 현황 대시보드
- [ ] 개별 학생 상세 페이지
- [ ] 기본 통계 차트

### Phase 3: 고급 기능 (1주)
- [ ] 워드 클라우드 구현
- [ ] 기간별 필터링
- [ ] 감정 트렌드 분석
- [ ] 알림 시스템

### Phase 4: 최적화 및 테스트 (3일)
- [ ] 성능 최적화
- [ ] 반응형 디자인 개선
- [ ] 사용자 테스트
- [ ] 버그 수정

---

## 🎯 성공 지표 (KPI)

### 학생 참여도
- 일일 체크인율 > 80%
- 이유 작성률 > 60%
- 평균 체크인 소요 시간 < 3분

### 교사 활용도
- 주간 대시보드 접속 > 3회
- 개별 학생 상세 조회 > 주 5명
- 관심 학생 관리 활용률 > 50%

### 시스템 안정성
- API 응답 시간 < 2초
- 에러율 < 1%
- 데이터 손실 0건

---

## 🚀 향후 확장 가능성

### 단기 (3개월)
- 학부모 앱 연동 (자녀 감정 상태 알림)
- 감정 일기 기능 추가
- 친구에게 응원 메시지 보내기

### 중기 (6개월)
- AI 기반 개인화된 감정 관리 프로그램 추천
- 학급 전체 감정 건강도 리포트 자동 생성
- 상담 교사 연계 시스템

### 장기 (1년)
- 다른 학교와 익명 감정 데이터 비교
- 감정 예측 모델 (조기 개입)
- 게이미피케이션 요소 추가

---

## 📝 참고 자료

### 기술 문서
- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Chart.js Documentation](https://www.chartjs.org/docs/)
- [WordCloud2.js](https://github.com/timdream/wordcloud2.js)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)

### 감정 교육 자료
- 초등학생 감정 표현 단어 목록
- 발달 단계별 감정 이해도
- 학교 상담 가이드라인

---

## ✅ 체크리스트

### 개발 전 준비
- [ ] Gemini API 키 발급
- [ ] Firestore 컬렉션 설계 확정
- [ ] UI/UX 디자인 시안 승인
- [ ] 개인정보 처리 방침 검토

### 개발 중
- [ ] 코드 리뷰 프로세스
- [ ] 테스트 케이스 작성
- [ ] 문서화 (주석, README)
- [ ] Git 커밋 메시지 규칙 준수

### 배포 전
- [ ] 사용자 테스트 (학생 5명, 교사 2명)
- [ ] 성능 테스트
- [ ] 보안 검토
- [ ] 백업 계획 수립

---

**작성일:** 2026-01-28  
**작성자:** AI Assistant  
**버전:** 1.0  
**상태:** Draft
