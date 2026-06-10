// ===========================
// Apps Data (怨듯넻 ?뚯씪?먯꽌 媛?몄삤湲?
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

        if (firebaseFns) {
            try {
                const createDefaultClassForTeacher = firebaseFns.httpsCallable('createDefaultClassForTeacher');
                const classResult = await createDefaultClassForTeacher({});
                currentTeacher.defaultClassId = classResult.data.classId;
                currentTeacher.defaultClassCode = classResult.data.classCode;

                const migrateExistingStudents = firebaseFns.httpsCallable('migrateExistingStudentsToDefaultClass');
                await migrateExistingStudents({});
            } catch (classError) {
                console.error('Error preparing teacher class:', classError);
            }
        }

        document.getElementById('teacher-name').textContent = currentTeacher.name || '援먯궗';
        showClassCode();

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

function showClassCode() {
    const headerRight = document.querySelector('.header-right');
    if (!headerRight || !currentTeacher || !currentTeacher.defaultClassCode) return;
    if (document.getElementById('class-code-badge')) return;

    const badge = document.createElement('span');
    badge.id = 'class-code-badge';
    badge.className = 'user-info';
    badge.textContent = `반 코드: ${currentTeacher.defaultClassCode}`;
    badge.style.marginRight = '0.75rem';
    headerRight.insertBefore(badge, document.getElementById('teacher-name'));
}

// =========================== 
// Logout
// ===========================
document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        await auth.signOut();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('濡쒓렇?꾩썐???ㅽ뙣?덉뒿?덈떎.');
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
            .where('teacherId', '==', currentTeacher.uid)
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
        studentCount.textContent = `${students.length}紐낆쓽 ?숈깮`;
        // 媛먯젙 異쒖꽍遺 李몄뿬??怨꾩궛???곗씠誘濡??꾩뿭?쇰줈??蹂닿?
        window.allStudents = students;

        // ??諛곗?(?숈깮 ?? 媛깆떊
        const tabBadgeEl = document.getElementById('students-tab-badge');
        if (tabBadgeEl) {
            tabBadgeEl.textContent = students.length;
        }

        // Update filter dropdown
        studentFilter.innerHTML = '<option value="all">?꾩껜 ?숈깮</option>';
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
            '?숈깮 紐⑸줉??遺덈윭?????놁뒿?덈떎.<br>' +
            '<small>?ㅽ듃?뚰겕 ?곌껐???뺤씤?섍굅?? ?좎떆 ???ㅼ떆 ?쒕룄?댁＜?몄슂.<br>' +
            '?ㅻ쪟 ?댁슜: ' + (error.message || '?????녿뒗 ?ㅻ쪟') + '</small>' +
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
        <td><span class="badge" style="background: #e3f2fd; color: #1565c0;">${student.loginCount || 0}??/span></td>
        <td>
            <div class="action-buttons">
                <button class="action-btn btn-reset" onclick="editPassword('${student.id}', '${student.name}')">鍮꾨쾲 ?섏젙</button>
                <button class="action-btn btn-delete" onclick="deleteStudent('${student.id}', '${student.name}')">??젣</button>
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
        let query = db.collection('usage_logs')
            .where('teacherId', '==', currentTeacher.uid)
            .orderBy('clickedAt', 'desc');

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
            if (data.userName && data.userName.includes('援먯궗')) return;

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
        appFilter.innerHTML = '<option value="all">?꾩껜 ??/option>';
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
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">?듦퀎瑜?遺덈윭?ㅻ뒗 ???ㅽ뙣?덉뒿?덈떎.</td></tr>';
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
        <td><strong>${stat.count}??/strong></td>
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
                label: '???ㅽ뻾 ?잛닔',
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
                    text: '?멸린 ??TOP 10'
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
    modalTitle.textContent = '?숈깮 異붽?';
    submitText.textContent = '異붽?';
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
    modalTitle.textContent = '?숈깮 ?뺣낫 ?섏젙';
    submitText.textContent = '?섏젙';

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
    let password = document.getElementById('student-password').value.trim();

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

            alert('?숈깮 ?뺣낫媛 ?섏젙?섏뿀?듬땲??');
        } else {
            // Create new student
            if (!password || password.length !== 4 || isNaN(password)) {
                throw new Error('鍮꾨?踰덊샇???レ옄 4?먮━?ъ빞 ?⑸땲??');
            }

            const secureFullEmail = email.includes('@') ? email : `${email}@ingyu-ai-world.com`;
            const createStudentByTeacher = firebaseFns.httpsCallable('createStudentByTeacher');
            await createStudentByTeacher({
                email: secureFullEmail,
                name,
                pin: password
            });

            alert('?숈깮??異붽??섏뿀?듬땲??');
            closeModal();
            loadStudents();
            return;
        }

        closeModal();
        loadStudents();

    } catch (error) {
        console.error('Error saving student:', error);

        let errorMessage = '?숈깮 ?뺣낫 ??μ뿉 ?ㅽ뙣?덉뒿?덈떎.';

        if (error.code === 'auth/email-already-in-use') {
            errorMessage = '?대? ?ъ슜 以묒씤 ?대찓?쇱엯?덈떎.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = '?щ컮瑜??대찓???뺤떇???꾨떃?덈떎.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = '鍮꾨?踰덊샇媛 ?덈Т ?쏀빀?덈떎. (理쒖냼 6??';
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
        alert('?숈깮 ?뺣낫瑜?遺덈윭?ㅻ뒗 ???ㅽ뙣?덉뒿?덈떎.');
    }
};

// ===========================
// Edit Password (formerly Reset Password)
// ===========================
window.editPassword = async function (studentId, studentName) {
    const newPassword = prompt(`${studentName} ?숈깮????鍮꾨?踰덊샇瑜??낅젰?섏꽭??4?먮━): `);

    if (!newPassword) return;

    if (newPassword.length !== 4 || isNaN(newPassword)) {
        alert('鍮꾨?踰덊샇??諛섎뱶???レ옄 4?먮━?ъ빞 ?⑸땲??');
        return;
    }

    try {
        const updateStudentPin = firebaseFns.httpsCallable('updateStudentPin');
        await updateStudentPin({ uid: studentId, pin: newPassword });

        alert(`${studentName} ?숈깮??鍮꾨?踰덊샇媛 蹂寃쎈릺?덉뒿?덈떎.`);
        loadStudents();
        return;

    } catch (error) {
        console.error('Error resetting password:', error);
        alert('鍮꾨?踰덊샇 ?ъ꽕?뺤뿉 ?ㅽ뙣?덉뒿?덈떎.');
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
        const deleteStudentAccount = firebaseFns.httpsCallable('deleteStudentAccount');
        await deleteStudentAccount({ uid: deletingStudentId });

        alert('?숈깮????젣?섏뿀?듬땲??');
        closeDeleteModal();
        loadStudents();
        loadUsageStats();
        return;

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
        alert('?숈깮???깃났?곸쑝濡???젣?섏뿀?듬땲??');

        closeDeleteModal();
        loadStudents();
        loadUsageStats();

    } catch (error) {
        console.error('Error deleting student:', error);
        alert('?숈깮 ??젣???ㅽ뙣?덉뒿?덈떎.');
    }
});

// ===========================
// Reset Usage Statistics
// ===========================
const resetUsageBtn = document.getElementById('reset-usage-btn');
if (resetUsageBtn) {
    resetUsageBtn.addEventListener('click', async () => {
        if (!confirm('紐⑤뱺 ?숈깮?????ъ슜 湲곕줉??珥덇린?뷀븯?쒓쿋?듬땲源?\n???묒뾽? ?섎룎由????놁뒿?덈떎.')) return;

        try {
            resetUsageBtn.disabled = true;
            const submitText = resetUsageBtn.querySelector('.button-text');
            const originalText = submitText.textContent;
            submitText.textContent = '珥덇린??以?..';

            const snapshot = await db.collection('usage_logs')
                .where('teacherId', '==', currentTeacher.uid)
                .get();
            const batch = db.batch();
            
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            alert('?ъ슜 湲곕줉??珥덇린?붾릺?덉뒿?덈떎.');
            
            submitText.textContent = originalText;
            resetUsageBtn.disabled = false;
            
            // Reload stats
            loadUsageStats();

        } catch (error) {
            console.error('Error resetting usage stats:', error);
            alert('湲곕줉 珥덇린?붿뿉 ?ㅽ뙣?덉뒿?덈떎.');
            resetUsageBtn.disabled = false;
        }
    });
}

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
    approvalGrid.innerHTML = '<div class="table-loading"><div class="spinner"></div><p>??紐⑸줉??遺덈윭?ㅻ뒗 以?..</p></div>';

    try {
        const snapshot = await db.collection('class_app_approvals')
            .where('classId', '==', currentTeacher.defaultClassId)
            .get();
        dashboardAppApprovals = {};
        snapshot.forEach(doc => {
            dashboardAppApprovals[doc.id] = doc.data().isApproved;
        });

        renderApprovalGrid();
    } catch (error) {
        console.error("Error loading approvals:", error);
        approvalGrid.innerHTML = '<p style="color:red; text-align:center;">?곗씠?곕? 遺덈윭?ㅻ뒗 ???ㅽ뙣?덉뒿?덈떎.</p>';
    }
}

function renderApprovalGrid() {
    if (!approvalGrid) return;
    approvalGrid.innerHTML = '';

    // Filter out class management apps
    const studentApps = apps.filter(app => app.category !== '?숆툒?댁쁺');

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

    const icon = app.icon || '?벑';

    card.innerHTML = `
        <div class="app-icon">${icon}</div>
        <div class="app-info">
            <div class="app-title">${app.title}</div>
            <div class="app-category">${app.category}</div>
        </div>
        <div class="approval-status">
            <span class="status-indicator"></span>
            <span class="status-text">${isApproved ? '승인' : '미승인'}</span>
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

        const setClassAppApproval = firebaseFns.httpsCallable('setClassAppApproval');
        await setClassAppApproval({
            classId: currentTeacher.defaultClassId,
            appTitle: appTitle,
            category: app.category,
            isApproved: isApproved
        });

    } catch (error) {
        console.error("Error toggling approval:", error);
        // Revert on error
        dashboardAppApprovals[appTitle] = !isApproved;
        renderApprovalGrid();
        alert("?곹깭 蹂寃쎌뿉 ?ㅽ뙣?덉뒿?덈떎.");
    }
};

// Bulk Actions
const approveAllBtn = document.getElementById('approve-all-btn');
const unapproveAllBtn = document.getElementById('unapprove-all-btn');

if (approveAllBtn) {
    approveAllBtn.addEventListener('click', async () => {
        if (!confirm('紐⑤뱺 ?깆쓣 ?뱀씤?섏떆寃좎뒿?덇퉴?')) return;
        await setAllApprovals(true);
    });
}

if (unapproveAllBtn) {
    unapproveAllBtn.addEventListener('click', async () => {
        if (!confirm('紐⑤뱺 ?깆쓣 ?뱀씤 ?댁젣?섏떆寃좎뒿?덇퉴?')) return;
        await setAllApprovals(false);
    });
}

async function setAllApprovals(isApproved) {
    try {
        const studentApps = apps.filter(app => app.category !== '?숆툒?댁쁺');
        const setClassAppApproval = firebaseFns.httpsCallable('setClassAppApproval');

        for (const app of studentApps) {
            await setClassAppApproval({
                classId: currentTeacher.defaultClassId,
                appTitle: app.title,
                category: app.category,
                isApproved: isApproved
            });

            // Update local state
            dashboardAppApprovals[app.title] = isApproved;
        }

        // Update UI immediately (Optimistic)
        renderApprovalGrid();
        // alert(`紐⑤뱺 ?깆씠 ${isApproved ? '?뱀씤' : '誘몄듅??} 泥섎━?섏뿀?듬땲??`);

    } catch (error) {
        console.error("Error batch updating approvals:", error);
        alert("?쇨큵 泥섎━???ㅽ뙣?덉뒿?덈떎.");
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


