// ===========================
// App Data - 공통 앱 목록
// ===========================
// 웹앱 추가 형식:
// {
//     title: "앱 이름",
//     category: "창체" | "수학" | "국어" | "사회" | "학급운영",
//     description: "앱 설명",
//     icon: "🎨" (이모지) 또는 iconImage: "assets/apps/app-name.png" (이미지 경로),
//     url: "앱 URL 또는 경로"
// }

const APPS_DATA = [
    {
        title: "캐릭터 꾸미기 v2",
        category: "창체",
        description: "나만의 캐릭터를 만들고 꾸며보세요!",
        icon: "🎨",
        url: "https://service-12363257340.us-west1.run.app/"
    },
    {
        title: "AI 그림책 만들기",
        category: "창체",
        description: "AI와 함께 나만의 그림책을 만들어요!",
        icon: "📚",
        url: "https://ai-12363257340.us-west1.run.app"
    },
    {
        title: "AI 캐릭터 굿즈 만들기",
        category: "창체",
        description: "나만의 캐릭터로 굿즈를 디자인해요!",
        icon: "🎁",
        url: "https://gemini.google.com/share/2f467e2287ae"
    },
    {
        title: "사각형탐험대",
        category: "수학",
        description: "사각형의 세계를 탐험하며 수학을 배워요!",
        icon: "🔷",
        url: "https://square-7mimewow8-ingyus-projects-8606cb7d.vercel.app/"
    },
    {
        title: "AI 윤리 곰돌이 어드벤처",
        category: "창체",
        description: "곰돌이와 함께 AI 윤리를 배워요!",
        icon: "🐻",
        url: "https://ai-ethic.vercel.app/"
    },
    {
        title: "인공지능원리로 익히는 자료와 가능성",
        category: "수학",
        description: "AI 원리로 통계를 재밌게 배워요!",
        icon: "📊",
        url: "https://data-analyze-psi.vercel.app/"
    },
    {
        title: "소수의 덧셈 뺄셈",
        category: "수학",
        description: "소수의 덧셈과 뺄셈을 연습해요!",
        icon: "🔢",
        url: "https://decimal-3d-app.vercel.app/"
    },
    {
        title: "질문으로 독서하기",
        category: "국어",
        description: "AI에게 질문하며 책을 깊이 읽어요!",
        icon: "📖",
        url: "https://4-2-4-app.vercel.app/"
    },
    {
        title: "우리말 탐구 보고서",
        category: "국어",
        description: "AI와 함께 우리말을 탐구해요!",
        icon: "🔍",
        url: "https://hanguel-app.vercel.app/"
    },
    {
        title: "배움 나침반",
        category: "창체",
        description: "나만의 배움 방향을 찾아가요!",
        icon: "🧭",
        url: "https://learncompass2.vercel.app/"
    },
    {
        title: "타자왕국",
        category: "창체",
        description: "AI와 함께하는 재미있는 한글 타자 연습!",
        icon: "⌨️",
        url: "https://taja-eta.vercel.app/"
    },
    {
        title: "2학기1단원 글쓰기 활동",
        category: "국어",
        description: "재미있는 글쓰기 활동을 해봐요!",
        icon: "✍️",
        url: "https://gemini.google.com/share/6a7fe79678f6"
    },
    {
        title: "소수의 덧셈과 뺄셈(색칠놀이)",
        category: "수학",
        description: "색칠하며 소수 계산을 익혀요!",
        icon: "🎨",
        url: "https://math-color-quiz.vercel.app/"
    },
    {
        title: "규칙찾기",
        category: "수학",
        description: "숨겨진 규칙을 찾아보아요!",
        icon: "🔍",
        url: "https://gemini.google.com/share/cdc451e12414"
    },
    {
        title: "데이터 탐정단",
        category: "수학",
        description: "데이터를 분석하며 탐정이 되어봐요!",
        icon: "🕵️",
        url: "https://gemini.google.com/share/c94006df0af9"
    },
    {
        title: "꺾은선 그래프게임1",
        category: "수학",
        description: "꺾은선 그래프로 재미있게 놀아요!",
        icon: "📈",
        url: "https://gemini.google.com/share/20d0c77cc925"
    },
    {
        title: "소닉 그래프 어드벤처",
        category: "수학",
        description: "소닉과 함께 그래프를 탐험해요!",
        icon: "💨",
        url: "https://gemini.google.com/share/9522cc4ef4b4"
    },
    {
        title: "행동특성 및 종합의견",
        category: "학급운영",
        description: "학생의 성장을 기록하고 관찰해요!",
        icon: "📝",
        url: "https://gemini.google.com/share/4fe88aeab9e9"
    },
    {
        title: "학생코칭",
        category: "학급운영",
        description: "학생과의 상담을 준비하고 기록해요!",
        icon: "💬",
        url: "https://gemini.google.com/share/a58a547fd496"
    },
    {
        title: "소음신호등",
        category: "학급운영",
        description: "교실 소음을 재미있게 관리해요!",
        icon: "🚦",
        url: "https://gemini.google.com/share/089679e3b0c3"
    },
    {
        title: "GSPBL",
        category: "학급운영",
        description: "프로젝트 기반 학습을 계획하고 관리해요!",
        icon: "📋",
        url: "https://gspblig.streamlit.app/"
    },
    {
        title: "학급네트워크분석(출처:박권쌤)",
        category: "학급운영",
        description: "설문 CSV로 학생 간 관계를 파싱하고, 중심성·3D 네트워크로 시각화해요!",
        icon: "🕸️",
        url: "https://class-sna-2.vercel.app/"
    },
    {
        title: "학급시간표 만들기",
        category: "학급운영",
        description: "시설·전담·학급 시간표를 단계별로 작성하고 엑셀로 저장해요!",
        icon: "📅",
        url: "https://gadong-schedule.vercel.app/"
    },
    {
        title: "학기말 종합의견 생성기",
        category: "학급운영",
        description: "학기말 학생 종합의견을 AI로 생성해요!",
        icon: "✏️",
        url: "https://gemini.google.com/share/c8afd694f7de"
    },
    {
        title: "AI 인터렉티브 게임",
        category: "창체",
        description: "AI와 함께 창의적 체험활동을 해요!",
        icon: "🌟",
        url: "https://g.co/gemini/share/9c837a14d717"
    },
    {
        title: "교수학습과정안 초안 작성기",
        category: "학급운영",
        description: "2022 개정 교육과정 기반 교수·학습 과정안(약안)을 AI로 빠르게 초안 작성해요!",
        icon: "📝",
        url: "https://lessonplan-alpha.vercel.app/"
    }
];

// 전역에서 접근 가능하도록 설정
if (typeof window !== 'undefined') {
    window.APPS_DATA = APPS_DATA;
}
