// ===========================
// Apps Data
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
        url: "https://data-possibility.vercel.app/"
    },
    {
        title: "소수의 덧셈 뺄셈",
        category: "수학",
        description: "소수의 덧셈과 뺄셈을 연습해요!",
        icon: "🔢",
        url: "https://decimal-math.vercel.app/"
    },
    {
        title: "질문으로 독서하기",
        category: "국어",
        description: "AI에게 질문하며 책을 깊이 읽어요!",
        icon: "📖",
        url: "https://gemini.google.com/share/760a00589a1c"
    },
    {
        title: "우리말 탐구 보고서",
        category: "국어",
        description: "AI와 함께 우리말을 탐구해요!",
        icon: "🔍",
        url: "https://gemini.google.com/share/0306771b96a8"
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
// Authentication Check
// ===========================
let currentTeacher = null;

auth.onAuthStateChanged(async (user) => {
    if (!user) {
        // Not logged in, redirect to login page
        window.location.href = 'login.html';
        return;
    }

    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists || userDoc.data().role !== 'teacher') {
            // Not a teacher, sign out and redirect
            await auth.signOut();
            window.location.href = 'login.html';
            return;
        }

        currentTeacher = {
            uid: user.uid,
            ...userDoc.data()
        };

        document.getElementById('teacher-name').textContent = currentTeacher.name || '교사';

        // Load data
        loadStudents();
        loadUsageStats();

        // If on approval tab, load approvals
        if (document.getElementById('approvals-tab').classList.contains('active')) {
            loadAppApprovalsForDashboard();
        }

    } catch (error) {
        console.error('Error checking user status:', error);
        window.location.href = 'login.html';
    }
});

// =========================== 
// Logout
// ===========================
document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        await auth.signOut();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('로그아웃에 실패했습니다.');
    }
});

// ===========================
// Load Students
// ===========================
async function loadStudents() {
    const tbody = document.getElementById('students-tbody');
    const emptyState = document.getElementById('empty-state');
    const studentCount = document.getElementById('student-count');
    const studentFilter = document.getElementById('student-filter');

    try {
        const snapshot = await db.collection('users')
            .where('role', '==', 'student')
            .orderBy('grade')
            .orderBy('class')
            .orderBy('number')
            .get();

        const students = [];
        snapshot.forEach(doc => {
            students.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Update count
        studentCount.textContent = `${students.length}명의 학생`;

        // Update filter dropdown
        studentFilter.innerHTML = '<option value="all">전체 학생</option>';
        students.forEach(student => {
            const option = document.createElement('option');
            option.value = student.id;
            option.textContent = `${student.name} (${student.grade}-${student.class}-${student.number})`;
            studentFilter.appendChild(option);
        });

        if (students.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        tbody.innerHTML = '';

        students.forEach(student => {
            const row = createStudentRow(student);
            tbody.appendChild(row);
        });

    } catch (error) {
        console.error('Error loading students:', error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">학생 목록을 불러오는 데 실패했습니다.</td></tr>';
    }
}

function createStudentRow(student) {
    const row = document.createElement('tr');

    const createdDate = student.createdAt ?
        new Date(student.createdAt.toDate()).toLocaleDateString('ko-KR') :
        '-';

    row.innerHTML = `
        <td>
            <div class="student-name">${student.name}</div>
        </td>
        <td>
            <div class="student-email">${student.email}</div>
        </td>
        <td>
            <span class="badge badge-grade">${student.grade}학년</span>
        </td>
        <td>${student.class}반</td>
        <td>${student.number}번</td>
        <td>${createdDate}</td>
        <td>
            <div class="action-buttons">
                <button class="action-btn btn-edit" onclick="editStudent('${student.id}')">수정</button>
                <button class="action-btn btn-reset" onclick="resetPassword('${student.id}', '${student.name}')">비밀번호 초기화</button>
                <button class="action-btn btn-delete" onclick="deleteStudent('${student.id}', '${student.name}')">삭제</button>
            </div>
        </td>
    `;

    return row;
}

// ===========================
// Load Usage Statistics
// ===========================
async function loadUsageStats() {
    const tbody = document.getElementById('stats-tbody');
    const emptyState = document.getElementById('stats-empty-state');
    const studentFilter = document.getElementById('student-filter');
    const appFilter = document.getElementById('app-filter');

    try {
        let query = db.collection('usage_logs').orderBy('clickedAt', 'desc');

        const snapshot = await query.limit(100).get();

        if (snapshot.empty) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        // Aggregate stats by student and app
        const stats = {};

        snapshot.forEach(doc => {
            const data = doc.data();
            const key = `${data.userId}_${data.appName}`;

            if (!stats[key]) {
                stats[key] = {
                    userName: data.userName,
                    appName: data.appName,
                    appCategory: data.appCategory,
                    userId: data.userId,
                    count: 0,
                    lastAccess: data.clickedAt
                };
            }

            stats[key].count++;

            // Keep track of most recent access
            if (data.clickedAt > stats[key].lastAccess) {
                stats[key].lastAccess = data.clickedAt;
            }
        });

        // Convert to array and sort by count
        const statsArray = Object.values(stats).sort((a, b) => b.count - a.count);

        // Populate app filter
        const uniqueApps = [...new Set(statsArray.map(s => s.appName))];
        appFilter.innerHTML = '<option value="all">전체 앱</option>';
        uniqueApps.forEach(appName => {
            const option = document.createElement('option');
            option.value = appName;
            option.textContent = appName;
            appFilter.appendChild(option);
        });

        tbody.innerHTML = '';

        statsArray.forEach(stat => {
            const row = createStatsRow(stat);
            tbody.appendChild(row);
        });

        // Add filter listeners (remove if already exists to avoid dupes)
        studentFilter.removeEventListener('change', filterStats);
        appFilter.removeEventListener('change', filterStats);
        studentFilter.addEventListener('change', filterStats);
        appFilter.addEventListener('change', filterStats);

    } catch (error) {
        console.error('Error loading usage stats:', error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">통계를 불러오는 데 실패했습니다.</td></tr>';
    }
}

function createStatsRow(stat) {
    const row = document.createElement('tr');
    row.dataset.userId = stat.userId;
    row.dataset.appName = stat.appName;

    const lastAccess = stat.lastAccess ?
        new Date(stat.lastAccess.toDate()).toLocaleString('ko-KR') :
        '-';

    row.innerHTML = `
        <td><strong>${stat.userName}</strong></td>
        <td>${stat.appName}</td>
        <td><span class="badge badge-grade">${stat.appCategory}</span></td>
        <td><strong>${stat.count}회</strong></td>
        <td>${lastAccess}</td>
    `;

    return row;
}

function filterStats() {
    const studentFilter = document.getElementById('student-filter').value;
    const appFilter = document.getElementById('app-filter').value;
    const rows = document.querySelectorAll('#stats-tbody tr');

    rows.forEach(row => {
        const matchStudent = studentFilter === 'all' || row.dataset.userId === studentFilter;
        const matchApp = appFilter === 'all' || row.dataset.appName === appFilter;

        if (matchStudent && matchApp) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// ===========================
// Modal Management
// ===========================
const studentModal = document.getElementById('student-modal');
const modalClose = document.getElementById('modal-close');
const cancelBtn = document.getElementById('cancel-btn');
const studentForm = document.getElementById('student-form');
const modalError = document.getElementById('modal-error');
const modalTitle = document.getElementById('modal-title');
const submitText = document.getElementById('submit-text');

let editingStudentId = null;

document.getElementById('add-student-btn').addEventListener('click', openAddModal);
modalClose.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);

function openAddModal() {
    editingStudentId = null;
    modalTitle.textContent = '학생 추가';
    submitText.textContent = '추가';
    studentForm.reset();
    modalError.classList.remove('show');
    studentModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function openEditModal(studentId, studentData) {
    editingStudentId = studentId;
    modalTitle.textContent = '학생 정보 수정';
    submitText.textContent = '수정';

    // Extract ID from email (remove @ingyu-ai-world.com)
    const displayEmail = studentData.email.replace('@ingyu-ai-world.com', '');

    document.getElementById('student-name').value = studentData.name;
    document.getElementById('student-email').value = displayEmail;
    document.getElementById('student-grade').value = studentData.grade;
    document.getElementById('student-class').value = studentData.class;
    document.getElementById('student-number').value = studentData.number;

    // Hide password field for editing
    document.getElementById('student-password').parentElement.style.display = 'none';

    modalError.classList.remove('show');
    studentModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    studentModal.classList.remove('active');
    document.body.style.overflow = '';
    document.getElementById('student-password').parentElement.style.display = 'block';
}

// ===========================
// Add/Edit Student
// ===========================
studentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    modalError.classList.remove('show');

    const name = document.getElementById('student-name').value.trim();
    const email = document.getElementById('student-email').value.trim();
    const grade = parseInt(document.getElementById('student-grade').value);
    const classNum = parseInt(document.getElementById('student-class').value);
    const number = parseInt(document.getElementById('student-number').value);
    const password = document.getElementById('student-password').value;

    try {
        if (editingStudentId) {
            // Convert ID to email format
            const fullEmail = email.includes('@') ? email : `${email}@ingyu-ai-world.com`;

            // Update existing student
            await db.collection('users').doc(editingStudentId).update({
                name,
                email: fullEmail,
                grade,
                class: classNum,
                number,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert('학생 정보가 수정되었습니다.');
        } else {
            // Create new student
            if (!password || password.length < 6) {
                throw new Error('비밀번호는 6자 이상이어야 합니다.');
            }

            // Convert ID to email format
            const fullEmail = email.includes('@') ? email : `${email}@ingyu-ai-world.com`;

            // Create Firebase Auth user
            const userCredential = await auth.createUserWithEmailAndPassword(fullEmail, password);
            const uid = userCredential.user.uid;

            // Create user document in Firestore
            await db.collection('users').doc(uid).set({
                email: fullEmail,
                name,
                role: 'student',
                grade,
                class: classNum,
                number,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Sign out the newly created user (since we're logged in as teacher)
            await auth.updateCurrentUser(currentTeacher.uid);

            alert('학생이 추가되었습니다.');
        }

        closeModal();
        loadStudents();

    } catch (error) {
        console.error('Error saving student:', error);

        let errorMessage = '학생 정보 저장에 실패했습니다.';

        if (error.code === 'auth/email-already-in-use') {
            errorMessage = '이미 사용 중인 이메일입니다.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = '올바른 이메일 형식이 아닙니다.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = '비밀번호가 너무 약합니다. (최소 6자)';
        } else if (error.message) {
            errorMessage = error.message;
        }

        modalError.textContent = errorMessage;
        modalError.classList.add('show');
    }
});

// ===========================
// Edit Student
// ===========================
window.editStudent = async function (studentId) {
    try {
        const doc = await db.collection('users').doc(studentId).get();
        if (doc.exists) {
            openEditModal(studentId, doc.data());
        }
    } catch (error) {
        console.error('Error loading student:', error);
        alert('학생 정보를 불러오는 데 실패했습니다.');
    }
};

// ===========================
// Reset Password
// ===========================
window.resetPassword = async function (studentId, studentName) {
    const newPassword = prompt(`${studentName} 학생의 새 비밀번호를 입력하세요 (최소 6자):`);

    if (!newPassword) return;

    if (newPassword.length < 6) {
        alert('비밀번호는 최소 6자 이상이어야 합니다.');
        return;
    }

    try {
        // In production, this should be done via Cloud Function with Admin SDK
        // For demonstration, we're noting this limitation
        alert('비밀번호 재설정은 Firebase Admin SDK를 통해 구현해야 합니다.\n\n프로덕션에서는 Cloud Function을 사용하여 구현하세요.\n\n임시 방법: Firebase Console > Authentication에서 직접 비밀번호를 재설정할 수 있습니다.');

        // TODO: Implement via Cloud Function
        // const resetPasswordFunction = firebase.functions().httpsCallable('resetStudentPassword');
        // await resetPasswordFunction({ userId: studentId, newPassword });

    } catch (error) {
        console.error('Error resetting password:', error);
        alert('비밀번호 재설정에 실패했습니다.');
    }
};

// ===========================
// Delete Student Modal
// ===========================
const deleteModal = document.getElementById('delete-modal');
const deleteModalClose = document.getElementById('delete-modal-close');
const deleteCancelBtn = document.getElementById('delete-cancel-btn');
const deleteConfirmBtn = document.getElementById('delete-confirm-btn');
let deletingStudentId = null;

deleteModalClose.addEventListener('click', closeDeleteModal);
deleteCancelBtn.addEventListener('click', closeDeleteModal);

function closeDeleteModal() {
    deleteModal.classList.remove('active');
    document.body.style.overflow = '';
}

window.deleteStudent = function (studentId, studentName) {
    deletingStudentId = studentId;
    document.getElementById('delete-student-name').textContent = studentName;
    deleteModal.classList.add('active');
    document.body.style.overflow = 'hidden';
};

deleteConfirmBtn.addEventListener('click', async () => {
    if (!deletingStudentId) return;

    try {
        // Delete from Firestore
        await db.collection('users').doc(deletingStudentId).delete();

        // Delete usage logs
        const logsSnapshot = await db.collection('usage_logs')
            .where('userId', '==', deletingStudentId)
            .get();

        const batch = db.batch();
        logsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        // Note: In production, also delete from Firebase Auth using Admin SDK via Cloud Function
        alert('학생이 삭제되었습니다.\n\n주의: Firebase Authentication에서도 수동으로 삭제해야 합니다.\n(Firebase Console > Authentication)');

        closeDeleteModal();
        loadStudents();
        loadUsageStats();

    } catch (error) {
        console.error('Error deleting student:', error);
        alert('학생 삭제에 실패했습니다.');
    }
});

// ===========================
// Tab Management
// ===========================
const tabs = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const target = tab.dataset.tab;

        // Update tabs
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update contents
        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === `${target}-tab`) {
                content.classList.add('active');
            }
        });

        // Load specific data
        if (target === 'approvals') {
            loadAppApprovalsForDashboard();
        }
    });
});

// ===========================
// App Approval Management
// ===========================
const approvalGrid = document.getElementById('approval-grid');
let dashboardAppApprovals = {};

async function loadAppApprovalsForDashboard() {
    // Show loading?
    if (!approvalGrid) return;
    approvalGrid.innerHTML = '<div class="table-loading"><div class="spinner"></div><p>앱 목록을 불러오는 중...</p></div>';

    try {
        const snapshot = await db.collection('app_approvals').get();
        dashboardAppApprovals = {};
        snapshot.forEach(doc => {
            dashboardAppApprovals[doc.id] = doc.data().isApproved;
        });

        renderApprovalGrid();
    } catch (error) {
        console.error("Error loading approvals:", error);
        approvalGrid.innerHTML = '<p style="color:red; text-align:center;">데이터를 불러오는 데 실패했습니다.</p>';
    }
}

function renderApprovalGrid() {
    if (!approvalGrid) return;
    approvalGrid.innerHTML = '';

    // Filter out class management apps
    const studentApps = apps.filter(app => app.category !== '학급운영');

    studentApps.forEach(app => {
        // Default to true if undefined (lazy init) or use Firestore value
        // Note: app.js init logic sets them to true.
        // If not found in dashboardAppApprovals, assume true (so we don't block access unintentionally before init)
        let isApproved = true;
        if (dashboardAppApprovals.hasOwnProperty(app.title)) {
            isApproved = dashboardAppApprovals[app.title];
        }

        const card = createAppApprovalCard(app, isApproved);
        approvalGrid.appendChild(card);
    });
}

function createAppApprovalCard(app, isApproved) {
    const card = document.createElement('div');
    card.className = `approval-card ${isApproved ? 'approved' : 'disapproved'}`;

    // Icon logic
    let iconHTML;
    if (app.iconImage) {
        iconHTML = `<img src="${app.iconImage}" alt="${app.title}">`;
    } else {
        iconHTML = app.icon || '📱';
    }

    card.innerHTML = `
        <div class="app-info-header">
            <div class="app-icon">${iconHTML}</div>
            <div class="app-details">
                <h4>${app.title}</h4>
                <span class="app-category-badge">${app.category}</span>
            </div>
        </div>
        
        <div class="approval-toggle-container">
            <span class="approval-status-text">${isApproved ? '승인됨' : '비공개'}</span>
            <label class="switch">
                <input type="checkbox" ${isApproved ? 'checked' : ''} onchange="toggleAppApproval('${app.title}', this.checked)">
                <span class="slider"></span>
            </label>
        </div>
    `;

    return card;
}

window.toggleAppApproval = async function (appTitle, isApproved) {
    try {
        const app = apps.find(a => a.title === appTitle);
        if (!app) return;

        // Optimistic UI update
        // We can update styles immediately, but let's wait for Firestore to ensure consistency?
        // Let's do optimistic update for better UX
        // But need to handle failure.

        await db.collection('app_approvals').doc(appTitle).set({
            appTitle: appTitle,
            category: app.category,
            isApproved: isApproved,
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            approvedBy: currentTeacher ? currentTeacher.uid : 'unknown'
        }, { merge: true });

        // Update local state
        dashboardAppApprovals[appTitle] = isApproved;

        // Update UI logic (find card and update class/text)
        // For simplicity, just re-render is fine as list is small (20 items)
        renderApprovalGrid();

    } catch (error) {
        console.error("Error toggling approval:", error);
        alert("상태 변경에 실패했습니다.");
        loadAppApprovalsForDashboard(); // Revert
    }
};

const approveAllBtn = document.getElementById('approve-all-btn');
if (approveAllBtn) {
    approveAllBtn.addEventListener('click', async () => {
        if (!confirm('모든 앱을 학생들에게 공개하시겠습니까?')) return;

        try {
            const batch = db.batch();
            const studentApps = apps.filter(app => app.category !== '학급운영');

            studentApps.forEach(app => {
                const ref = db.collection('app_approvals').doc(app.title);
                batch.set(ref, {
                    appTitle: app.title,
                    category: app.category,
                    isApproved: true,
                    approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    approvedBy: currentTeacher ? currentTeacher.uid : 'unknown'
                });
            });

            await batch.commit();
            await loadAppApprovalsForDashboard();
            alert("모든 앱이 승인되었습니다.");

        } catch (error) {
            console.error("Error approving all:", error);
            alert("일괄 승인에 실패했습니다.");
        }
    });
}
