// ===========================
// App Data (공통 파일에서 가져오기)
// ===========================
const apps = window.APPS_DATA || [];

// ===========================
// Authentication & Current User
// ===========================
let currentUser = null;
let isInitializing = false; // 초기화 중복 방지 플래그

// Check authentication status
auth.onAuthStateChanged(async (user) => {
    // 중복 초기화 방지
    if (isInitializing) {
        console.log('Already initializing, skipping...');
        return;
    }
    
    isInitializing = true;
    if (!user) {
        // Not logged in, redirect to login page
        window.location.href = 'login.html';
        return;
    }

// #region agent log
fetch('http://127.0.0.1:7243/ingest/e290a389-4d17-4bde-9005-c39371110250',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:82',message:'Auth state changed',data:{uid:user.uid,role:userData.role},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
// #endregion
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
        const userNameEl = document.getElementById('user-name');
        if (userNameEl) {
            const displayName = currentUser.name || (currentUser.role === 'teacher' ? '교사' : '학생');
            const userName = currentUser.role === 'teacher'
                ? '선생님'
                : displayName;
            userNameEl.textContent = userName;
        }

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
            // URL 파라미터 확인 (감정 체크인 완료 후 돌아온 경우)
            const urlParams = new URLSearchParams(window.location.search);
            const fromCheckin = urlParams.get('fromCheckin') === 'true';
            
            if (fromCheckin) {
                // 감정 체크인 완료 후 돌아온 경우 - 바로 앱 목록 표시 (안전수칙 표시 안 함)
                // URL 파라미터 제거
                window.history.replaceState({}, document.title, window.location.pathname);
                renderApps("창체");
            } else {
                // 일반 로그인 - 안전수칙 확인
                const agreed = await checkAIAgreement();
                if (agreed) {
                    renderApps("창체");
                } else {
                    // Do NOT render apps yet. Wait for agreement.
                    console.log('Waiting for AI Safety Agreement...');
                    const appGridEl = document.getElementById('app-grid');
                    const sectionTitleEl = document.getElementById('section-title');
                    const appCountEl = document.getElementById('app-count');
                    if (appGridEl) appGridEl.innerHTML = '';
                    if (sectionTitleEl) sectionTitleEl.textContent = 'AI 안전 수칙 동의 필요';
                    if (appCountEl) appCountEl.textContent = '';
                }
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
    } finally {
        isInitializing = false;
    }
});

// Logout handler
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await auth.signOut();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
            alert('로그아웃 중 오류가 발생했습니다.');
        }
    });
}

// ===========================
// UI Elements and Variables
// ===========================
const appGrid = document.getElementById('app-grid');
const sectionTitle = document.getElementById('section-title');
const appCount = document.getElementById('app-count');
const navItems = document.querySelectorAll('.nav-item');
const emptyState = document.getElementById('empty-state');

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
// #region agent log
fetch('http://127.0.0.1:7243/ingest/e290a389-4d17-4bde-9005-c39371110250',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:195',message:'renderApps called',data:{category},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
// #endregion
    if (!appGrid) return;

    // Update active tab button
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });

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
    if (sectionTitle) {
        sectionTitle.textContent = category === "전체" ? "전체 웹앱" : `${category} 웹앱`;
    }
    if (appCount) {
        appCount.textContent = `${filteredApps.length}개의 앱`;
    }

    // Show empty state if no apps
    if (filteredApps.length === 0) {
        if (emptyState) {
            emptyState.style.display = 'block';
        }
        if (appGrid) {
            appGrid.style.display = 'none';
        }
        return;
    }

    // Hide empty state
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    if (appGrid) {
        appGrid.style.display = 'grid';
    }

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

    // Render filtered apps
    renderApps(category);
}

// ===========================
// Modal Handling
// ===========================
function openPrivacyModal() {
    if (privacyModal) {
        privacyModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closePrivacyModal() {
    if (privacyModal) {
        privacyModal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function openTermsModal() {
    if (termsModal) {
        termsModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeTermsModal() {
    if (termsModal) {
        termsModal.classList.remove('active');
        document.body.style.overflow = '';
    }
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

if (modalClose) {
    modalClose.addEventListener('click', closePrivacyModal);
}
if (modalBackdrop) {
    modalBackdrop.addEventListener('click', closePrivacyModal);
}

// Terms Modal Event Listeners
if (termsLink) {
    termsLink.addEventListener('click', (e) => {
        e.preventDefault();
        openTermsModal();
    });
}

if (termsClose) {
    termsClose.addEventListener('click', closeTermsModal);
}
if (termsBackdrop) {
    termsBackdrop.addEventListener('click', closeTermsModal);
}

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

// Check if user has agreed to AI safety guidelines (하루에 한 번만)
async function checkAIAgreement() {
    if (!currentUser) return false;

    // 학생만 동의 필요 (교사는 제외)
    if (currentUser.role === 'teacher') {
        return true;
    }

    // 오늘 날짜로 localStorage 확인 (하루에 한 번만)
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `ai_safety_agreed_${currentUser.uid}_${today}`;
    const hasAgreedToday = localStorage.getItem(storageKey);

    if (hasAgreedToday === 'true') {
        // 오늘 이미 동의했으면 통과
        return true;
    }

    // 모달이 이미 표시되어 있는지 확인
    if (aiSafetyModal && aiSafetyModal.classList.contains('show')) {
        // 이미 표시되어 있으면 false 반환 (중복 표시 방지)
        return false;
    }

    // 오늘 동의하지 않았으면 모달 표시
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
    let isProcessing = false; // 중복 클릭 방지
    
    aiAgreeBtn.addEventListener('click', async () => {
        if (!currentUser) return;
        
        // 중복 클릭 방지
        if (isProcessing) {
            console.log('Already processing agreement...');
            return;
        }
        
        isProcessing = true;
        
        try {
            // 오늘 날짜로 localStorage에 동의 기록 (하루 동안 다시 표시하지 않음)
            const today = new Date().toISOString().split('T')[0];
            const storageKey = `ai_safety_agreed_${currentUser.uid}_${today}`;
            localStorage.setItem(storageKey, 'true');
            
            // 모달 즉시 닫기
            hideAISafetyModal();

            // Firestore에 기록 (비동기, 실패해도 계속 진행)
            db.collection('user_agreements').doc(currentUser.uid).set({
                userId: currentUser.uid,
                userName: currentUser.name,
                agreedToAISafety: true,
                lastAgreedAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastAgreedDate: today,
                agreementCount: firebase.firestore.FieldValue.increment(1)
            }, { merge: true }).catch(err => console.error("Agreement log error:", err));

            // 감정 체크인 페이지로 즉시 이동
            window.location.href = 'emotional-checkin.html';

        } catch (error) {
            console.error('Agreement error:', error);
            // localStorage는 성공했으므로 계속 진행
            const today = new Date().toISOString().split('T')[0];
            const storageKey = `ai_safety_agreed_${currentUser.uid}_${today}`;
            localStorage.setItem(storageKey, 'true');
            hideAISafetyModal();
            window.location.href = 'emotional-checkin.html';
        } finally {
            // 페이지 이동이 실패할 경우를 대비해 플래그 리셋 (타임아웃)
            setTimeout(() => {
                isProcessing = false;
            }, 1000);
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
            // Skip 학급운영 apps (teacher-only)
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
