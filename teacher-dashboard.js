// ===========================
// Apps Data (공통 파일에서 가져오기)
// ===========================
const apps = window.APPS_DATA || [];

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
            .get();

        const students = [];
        snapshot.forEach(doc => {
            students.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Client-side sort: Grade > Class > Number
        students.sort((a, b) => {
            if (a.grade !== b.grade) return a.grade - b.grade;
            if (a.class !== b.class) return a.class - b.class;
            return a.number - b.number;
        });

        // Update count
        studentCount.textContent = `${students.length}명의 학생`;

        // Update filter dropdown
        studentFilter.innerHTML = '<option value="all">전체 학생</option>';
        students.forEach(student => {
            const option = document.createElement('option');
            option.value = student.id;
            option.textContent = student.name;
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
        emptyState.style.display = 'none'; // Hide empty state if showing error
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red; padding: 2rem;">' +
            '학생 목록을 불러올 수 없습니다.<br>' +
            '<small>네트워크 연결을 확인하거나, 잠시 후 다시 시도해주세요.<br>' +
            '오류 내용: ' + (error.message || '알 수 없는 오류') + '</small>' +
            '</td></tr>';
    }
}

function createStudentRow(student) {
    const row = document.createElement('tr');

    const createdDate = student.createdAt ? new Date(student.createdAt.seconds * 1000).toLocaleDateString() : '-';

    // Format Last Login
    let lastLoginStr = '-';
    if (student.lastLogin) {
        const lastLoginDate = new Date(student.lastLogin.seconds * 1000);
        const now = new Date();
        const diffMs = now - lastLoginDate;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) {
            lastLoginStr = '방금 전';
        } else if (diffMins < 60) {
            lastLoginStr = `${diffMins}분 전`;
        } else if (diffMins < 1440) {
            const diffHours = Math.floor(diffMins / 60);
            lastLoginStr = `${diffHours}시간 전`;
        } else {
            lastLoginStr = lastLoginDate.toLocaleDateString();
        }
    }

    row.innerHTML = `
        <td><div class="student-name">${student.name}</div></td>
        <td>${createdDate}</td>
        <td>${lastLoginStr}</td>
        <td><span class="badge" style="background: #e3f2fd; color: #1565c0;">${student.loginCount || 0}회</span></td>
        <td>
            <div class="action-buttons">
                <button class="action-btn btn-reset" onclick="editPassword('${student.id}', '${student.name}')">비번 수정</button>
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

            // Filter out teacher logs (check both userId and userName)
            if (currentTeacher && data.userId === currentTeacher.uid) return;
            if (data.userName && data.userName.includes('교사')) return;

            const key = `${data.userId}_${data.appName} `;

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

        // Render Chart
        renderChart(statsArray);

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
// Chart Rendering
// ===========================
let usageChart = null;

function renderChart(statsArray) {
    const ctx = document.getElementById('usageChart');
    if (!ctx) return;

    // Aggregate by App
    const appCounts = {};
    statsArray.forEach(stat => {
        appCounts[stat.appName] = (appCounts[stat.appName] || 0) + stat.count;
    });

    // Sort by count
    const sortedApps = Object.entries(appCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // Top 10

    const labels = sortedApps.map(item => item[0]);
    const data = sortedApps.map(item => item[1]);

    // Destroy existing chart if any
    if (usageChart) {
        usageChart.destroy();
    }

    usageChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '앱 실행 횟수',
                data: data,
                backgroundColor: 'rgba(78, 205, 196, 0.6)',
                borderColor: 'rgba(78, 205, 196, 1)',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: '인기 앱 TOP 10'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
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

    // Enable email input
    document.getElementById('student-email').disabled = false;
    // Show password field
    document.getElementById('student-password').parentElement.style.display = 'block';

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

    // document.getElementById('student-name').value = studentData.name; // Removed field
    const emailInput = document.getElementById('student-email');
    emailInput.value = displayEmail;
    emailInput.disabled = true; // Cannot change ID (Email) as it breaks Auth login

    // emailInput.disabled = true; // Still disabled as it's the ID


    // Hide password field in edit mode (cannot retrieve or easily update without Admin SDK)
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

    const email = document.getElementById('student-email').value.trim();
    const name = email; // Use ID as Name
    let password = document.getElementById('student-password').value;

    try {
        if (editingStudentId) {
            // Convert ID to email format
            const fullEmail = email.includes('@') ? email : `${email}@ingyu-ai-world.com`;

            // Update existing student
            await db.collection('users').doc(editingStudentId).update({
                name,
                email: fullEmail,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert('학생 정보가 수정되었습니다.');
        } else {
            // Create new student
            if (!password || password.length !== 4 || isNaN(password)) {
                throw new Error('비밀번호는 숫자 4자리여야 합니다.');
            }

            // Convert ID to email format
            const fullEmail = email.includes('@') ? email : `${email}@ingyu-ai-world.com`;

            // Create Firebase Auth user with a fixed internal password
            // The real security check is done against Firestore's simplePassword
            const internalPassword = "fixed_student_pw_1234";
            const userCredential = await auth.createUserWithEmailAndPassword(fullEmail, internalPassword);
            const uid = userCredential.user.uid;

            // Create user document in Firestore
            await db.collection('users').doc(uid).set({
                email: fullEmail,
                name,
                role: 'student',
                simplePassword: password, // Store 4-digit password for simplified management
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

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
// Edit Password (formerly Reset Password)
// ===========================
window.editPassword = async function (studentId, studentName) {
    const newPassword = prompt(`${studentName} 학생의 새 비밀번호를 입력하세요(4자리): `);

    if (!newPassword) return;

    if (newPassword.length !== 4 || isNaN(newPassword)) {
        alert('비밀번호는 반드시 숫자 4자리여야 합니다.');
        return;
    }

    try {
        // Direct Firestore update for the simplified password
        await db.collection('users').doc(studentId).update({
            simplePassword: newPassword,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(`${studentName} 학생의 비밀번호가 '${newPassword}'로 수정되었습니다.`);
        loadStudents();

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

        // Note: We don't delete from Auth to avoid Admin SDK errors.
        // Once the Firestore record is gone, the login shim in login.js will deny access.
        alert('학생이 성공적으로 삭제되었습니다.');

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
const approvalGrid = document.getElementById('approvals-grid');
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
    card.className = `approval-card ${isApproved ? 'approved' : ''}`;
    card.onclick = () => toggleAppApproval(app.title, !isApproved);

    const icon = app.icon || '📱';

    card.innerHTML = `
        <div class="app-icon">${icon}</div>
        <div class="app-info">
            <div class="app-title">${app.title}</div>
            <div class="app-category">${app.category}</div>
        </div>
        <div class="approval-status">
            <span class="status-indicator"></span>
            <span class="status-text">${isApproved ? '승인됨' : '미승인'}</span>
        </div>
    `;

    return card;
}

window.toggleAppApproval = async function (appTitle, isApproved) {
    try {
        const app = apps.find(a => a.title === appTitle);
        if (!app) return;

        // Optimistic update
        dashboardAppApprovals[appTitle] = isApproved;
        renderApprovalGrid();

        await db.collection('app_approvals').doc(appTitle).set({
            appTitle: appTitle,
            category: app.category,
            isApproved: isApproved,
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            approvedBy: currentTeacher ? currentTeacher.uid : 'unknown'
        }, { merge: true });

    } catch (error) {
        console.error("Error toggling approval:", error);
        // Revert on error
        dashboardAppApprovals[appTitle] = !isApproved;
        renderApprovalGrid();
        alert("상태 변경에 실패했습니다.");
    }
};

// Bulk Actions
const approveAllBtn = document.getElementById('approve-all-btn');
const unapproveAllBtn = document.getElementById('unapprove-all-btn');

if (approveAllBtn) {
    approveAllBtn.addEventListener('click', async () => {
        if (!confirm('모든 앱을 승인하시겠습니까?')) return;
        await setAllApprovals(true);
    });
}

if (unapproveAllBtn) {
    unapproveAllBtn.addEventListener('click', async () => {
        if (!confirm('모든 앱을 승인 해제하시겠습니까?')) return;
        await setAllApprovals(false);
    });
}

async function setAllApprovals(isApproved) {
    try {
        const batch = db.batch();
        const studentApps = apps.filter(app => app.category !== '학급운영');

        studentApps.forEach(app => {
            const ref = db.collection('app_approvals').doc(app.title);
            batch.set(ref, {
                appTitle: app.title,
                category: app.category,
                isApproved: isApproved,
                approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
                approvedBy: currentTeacher ? currentTeacher.uid : 'unknown'
            }, { merge: true });

            // Update local state
            dashboardAppApprovals[app.title] = isApproved;
        });

        // Update UI immediately (Optimistic)
        renderApprovalGrid();

        await batch.commit();
        // alert(`모든 앱이 ${isApproved ? '승인' : '미승인'} 처리되었습니다.`);

    } catch (error) {
        console.error("Error batch updating approvals:", error);
        alert("일괄 처리에 실패했습니다.");
        loadAppApprovalsForDashboard(); // Reload to ensure data consistency
    }
}

// ===========================
// Tab Management for Emotions
// ===========================
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', function () {
        const tabName = this.dataset.tab;

        // Update active tab button
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');

        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Initialize emotions tab if selected
        if (tabName === 'emotions' && typeof initEmotionsTab === 'function') {
            initEmotionsTab();
        }
    });
});
