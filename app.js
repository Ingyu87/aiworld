// ===========================
// App Data
// ===========================
const apps = [
    {
        title: "캐릭터 꾸미기",
        category: "창체",
        description: "나만의 캐릭터를 만들고 꾸며보세요!",
        icon: "🎨",
        url: "https://gemini.google.com/share/2c006d31a8ff"
    },
    {
        title: "AI 그림책 만들기",
        category: "창체",
        description: "AI와 함께 나만의 그림책을 만들어요!",
        icon: "📚",
        url: "https://gemini.google.com/share/05eae3d95c11"
    },
    {
        title: "AI 캐릭터 굿즈 만들기",
        category: "창체",
        description: "나만의 캐릭터로 굿즈를 디자인해요!",
        icon: "🎁",
        url: "https://gemini.google.com/share/ccb53c2545c8"
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
    }
];

// ===========================
// Authentication & Current User
// ===========================
let currentUser = null;

// Check authentication status
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        // Not logged in, redirect to login page
        window.location.href = 'login.html';
        return;
    }

    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            // No user data, sign out and redirect
            await auth.signOut();
            window.location.href = 'login.html';
            return;
        }

        const userData = userDoc.data();

        // Allow both students and teachers
        if (userData.role !== 'student' && userData.role !== 'teacher') {
            await auth.signOut();
            window.location.href = 'login.html';
            return;
        }

        currentUser = {
            uid: user.uid,
            ...userData
        };

        // Update UI with user name
        const userName = currentUser.role === 'teacher'
            ? `선생님 ${currentUser.name || '교사'}`
            : currentUser.name || '학생';
        document.getElementById('user-name').textContent = userName;

        // Add dashboard link for teachers
        if (currentUser.role === 'teacher') {
            const navRight = document.querySelector('.nav-right');
            if (navRight && !document.getElementById('dashboard-btn')) {
                const dashboardBtn = document.createElement('a');
                dashboardBtn.href = 'teacher-dashboard.html';
                dashboardBtn.className = 'dashboard-btn';
                dashboardBtn.id = 'dashboard-btn';
                dashboardBtn.innerHTML = '<span class="icon">⚙️</span> 관리';
                dashboardBtn.style.marginRight = '10px';
                dashboardBtn.style.textDecoration = 'none';
                dashboardBtn.style.color = '#2c3e50';
                dashboardBtn.style.fontWeight = 'bold';

                navRight.insertBefore(dashboardBtn, document.getElementById('user-badge'));
            }
        }

        // ===========================
        // INITIALIZE APP LOGIC
        // ===========================

        // 1. Initialize approvals (Teacher only, lazy init)
        if (currentUser.role === 'teacher') {
            await initializeAppApprovals();
        }

        // 2. Load approvals
        await loadAppApprovals();

        // 3. Check AI Agreement (Student only)
        if (currentUser.role === 'student') {
            const agreed = await checkAIAgreement();
            if (agreed) {
                renderApps("창체");
            } else {
                // Do NOT render apps yet. Wait for agreement.
                // Optionally hide any loading state if present
                console.log('Waiting for AI Safety Agreement...');
                document.getElementById('app-grid').innerHTML = ''; // Keep empty
                document.getElementById('section-title').textContent = 'AI 안전 수칙 동의 필요';
                document.getElementById('app-count').textContent = '';
            }
        } else {
            // Teacher or others
            renderApps("창체");
        }

    } catch (error) {
        console.error('Login error:', error);
        alert('로그인 처리 중 오류가 발생했습니다.');
        // await auth.signOut();
        // window.location.href = 'login.html';
    }
});

// Logout handler
document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        await auth.signOut();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('로그아웃 중 오류가 발생했습니다.');
    }
});

// ===========================
// UI Elements and Variables
// ===========================
const appGrid = document.getElementById('app-grid');
const sectionTitle = document.getElementById('section-title');
const appCount = document.getElementById('app-count');
const navItems = document.querySelectorAll('.nav-item');
const emptyState = document.getElementById('empty-state');
let currentCategory = "전체";

// Modals
const privacyModal = document.getElementById('privacy-modal');
const termsModal = document.getElementById('terms-modal');
const privacyLink = document.getElementById('privacy-link');
const termsLink = document.getElementById('terms-link');
const modalClose = document.getElementById('modal-close');
const termsClose = document.getElementById('terms-close');
const modalBackdrop = document.getElementById('modal-backdrop');
const termsBackdrop = document.getElementById('terms-backdrop');

// ===========================
// Render Functions
// ===========================
function renderApps(category = "전체") {
    // Clear grid
    appGrid.innerHTML = '';

    // Filter apps based on category and user role
    let filteredApps = category === "전체"
        ? apps
        : apps.filter(app => app.category === category);

    // Filter out teacher-only apps for students
    if (currentUser && currentUser.role === 'student') {
        const teacherOnlyCategories = ['학급운영'];
        filteredApps = filteredApps.filter(app => !teacherOnlyCategories.includes(app.category));

        // Hide Class Management Nav Button
        const classMgmtBtn = document.querySelector('.nav-item[data-category="학급운영"]');
        if (classMgmtBtn) {
            classMgmtBtn.style.display = 'none';
        }
    } else {
        // Show for teachers
        const classMgmtBtn = document.querySelector('.nav-item[data-category="학급운영"]');
        if (classMgmtBtn) {
            classMgmtBtn.style.display = 'flex';
        }
    }

    // Filter by approval status
    if (typeof filterAppsByApproval === 'function') {
        filteredApps = filterAppsByApproval(filteredApps);
    }

    // Update header
    sectionTitle.textContent = category === "전체" ? "전체 웹앱" : `${category} 웹앱`;
    appCount.textContent = `${filteredApps.length}개의 앱`;

    // Show empty state if no apps
    if (filteredApps.length === 0) {
        emptyState.style.display = 'block';
        appGrid.style.display = 'none';
        return;
    }

    // Hide empty state
    emptyState.style.display = 'none';
    appGrid.style.display = 'grid';

    // Render app cards
    filteredApps.forEach((app, index) => {
        const appCard = createAppCard(app, index);
        appGrid.appendChild(appCard);
    });
}

function createAppCard(app, index) {
    const card = document.createElement('a');
    card.className = 'app-card';
    card.href = app.url;
    card.setAttribute('data-category', app.category);
    card.style.animationDelay = `${index * 0.1}s`;

    // Determine icon type (emoji or image)
    let iconHTML;
    if (app.iconImage) {
        // Use image as icon
        iconHTML = `<img src="${app.iconImage}" alt="${app.title}" class="app-icon-image">`;
    } else {
        // Use emoji as icon (default)
        iconHTML = `<div class="app-icon">${app.icon || '📱'}</div>`;
    }

    card.innerHTML = `
        ${iconHTML}
        <h3 class="app-title">${app.title}</h3>
        <p class="app-description">${app.description}</p>
        <span class="app-category">${app.category}</span>
    `;

    // Add click tracking
    card.addEventListener('click', async (e) => {
        // Don't prevent default if it's a placeholder link
        if (app.url === '#') {
            e.preventDefault();
        }

        // Track usage if user is logged in
        if (currentUser && db) {
            try {
                await db.collection('usage_logs').add({
                    userId: currentUser.uid,
                    userName: currentUser.name,
                    appName: app.title,
                    appCategory: app.category,
                    clickedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('Usage tracked:', app.title);
            } catch (error) {
                console.error('Error tracking usage:', error);
            }
        }
    });

    return card;
}

// ===========================
// Navigation Handling
// ===========================
function handleNavClick(event) {
    const category = event.currentTarget.dataset.category;

    // Update active state
    navItems.forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // Update current category
    currentCategory = category;

    // Render filtered apps
    renderApps(category);
}

// ===========================
// Modal Handling
// ===========================
function openPrivacyModal() {
    privacyModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePrivacyModal() {
    privacyModal.classList.remove('active');
    document.body.style.overflow = '';
}

function openTermsModal() {
    termsModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeTermsModal() {
    termsModal.classList.remove('active');
    document.body.style.overflow = '';
}

// ===========================
// Event Listeners
// ===========================
navItems.forEach(item => {
    item.addEventListener('click', handleNavClick);
});

// Privacy Modal Event Listeners
if (privacyLink) {
    privacyLink.addEventListener('click', (e) => {
        e.preventDefault();
        openPrivacyModal();
    });
}

if (modalClose) modalClose.addEventListener('click', closePrivacyModal);
if (modalBackdrop) modalBackdrop.addEventListener('click', closePrivacyModal);

// Terms Modal Event Listeners
if (termsLink) {
    termsLink.addEventListener('click', (e) => {
        e.preventDefault();
        openTermsModal();
    });
}

if (termsClose) termsClose.addEventListener('click', closeTermsModal);
if (termsBackdrop) termsBackdrop.addEventListener('click', closeTermsModal);

// Close modals on ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (privacyModal && privacyModal.classList.contains('active')) {
            closePrivacyModal();
        }
        if (termsModal && termsModal.classList.contains('active')) {
            closeTermsModal();
        }
    }
});

// ===========================
// Scroll Animations
// ===========================
function handleScroll() {
    const cards = document.querySelectorAll('.app-card');

    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight - 100;

        if (isVisible) {
            card.style.animation = 'fadeIn 0.6s ease forwards';
        }
    });
}

window.addEventListener('scroll', handleScroll);

// ===========================
// Initialize
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    // Initial render is handled in auth state change to ensure user role is checked
    handleScroll(); // Initial scroll check
});

// ===========================
// AI Safety Guidelines Agreement
// ===========================
const aiSafetyModal = document.getElementById('ai-safety-modal');
const aiAgreeBtn = document.getElementById('ai-agree-btn');

// Check if user has agreed to AI safety guidelines
// Check if user has agreed to AI safety guidelines
// Check if user has agreed to AI safety guidelines
async function checkAIAgreement() {
    if (!currentUser) return false;

    // 학생만 동의 필요 (교사는 제외)
    if (currentUser.role === 'teacher') {
        return true;
    }

    // Always show AI Safety Page for students every session
    // We ignore previous agreement status to reinforce the message every time.
    showAISafetyModal();
    return false;
}

function showAISafetyModal() {
    if (aiSafetyModal) {
        aiSafetyModal.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
}

function hideAISafetyModal() {
    if (aiSafetyModal) {
        aiSafetyModal.classList.remove('show');
        document.body.style.overflow = ''; // Restore scrolling
    }
}

// Handle agreement button click
if (aiAgreeBtn) {
    aiAgreeBtn.addEventListener('click', async () => {
        if (!currentUser) return;

        try {
            // Log agreement to Firestore (optional, background)
            db.collection('user_agreements').doc(currentUser.uid).set({
                userId: currentUser.uid,
                agreedToAISafety: true,
                lastAgreedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).catch(err => console.error("Agreement log error:", err));

            // Proceed immediately
            hideAISafetyModal();
            renderApps("전체");

        } catch (error) {
            console.error('Agreement error:', error);
            hideAISafetyModal();
            renderApps("전체");
        }
    });
}

// ===========================
// App Approval System
// ===========================
let approvedApps = {};

// Load app approvals from Firestore
async function loadAppApprovals() {
    try {
        const approvalsSnapshot = await db.collection('app_approvals').get();

        approvedApps = {};
        approvalsSnapshot.forEach(doc => {
            const data = doc.data();
            approvedApps[data.appTitle] = data.isApproved;
        });

        console.log('App approvals loaded:', approvedApps);
    } catch (error) {
        console.error('Error loading app approvals:', error);
    }
}

// Filter apps based on approval status
function filterAppsByApproval(appsToFilter) {
    // Teachers see all apps
    if (currentUser && currentUser.role === 'teacher') {
        return appsToFilter;
    }

    // Students only see approved apps (or all if no approvals configured yet)
    return appsToFilter.filter(app => {
        // 학급운영 앱은 이미 teacher 체크에서 필터링됨
        if (app.category === '학급운영') {
            return false;
        }

        // Check if app is approved (default to true if not in approvals collection)
        // If appTitle is not in approvedApps, assume it's new and should be approved default, 
        // OR wait for teacher to approve. 
        // Logic: if undefined, treat as approved (backward compatibility) OR disallowed?
        // Let's treat as approved if undefined to prevent empty screens initially
        const isApproved = approvedApps[app.title];
        return isApproved !== false;
    });
}

// Initialize app approvals with default approved status
async function initializeAppApprovals() {
    try {
        const batch = db.batch();
        let needsInit = false;

        for (const app of apps) {
            // Skip 학급운영 apps
            if (app.category === '학급운영') continue;

            const appRef = db.collection('app_approvals').doc(app.title);
            const appDoc = await appRef.get();

            if (!appDoc.exists) {
                needsInit = true;
                batch.set(appRef, {
                    appTitle: app.title,
                    category: app.category,
                    isApproved: true, // Default: approved
                    approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    approvedBy: currentUser ? currentUser.uid : 'system'
                });
            }
        }

        if (needsInit) {
            await batch.commit();
            console.log('App approvals initialized');
            await loadAppApprovals(); // Reload after init
        }
    } catch (error) {
        console.error('Error initializing app approvals:', error);
    }
}
