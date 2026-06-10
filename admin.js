const requestsTbody = document.getElementById('requests-tbody');
const emptyState = document.getElementById('empty-state');
const requestSummary = document.getElementById('request-summary');
const teachersTbody = document.getElementById('teachers-tbody');
const teachersEmptyState = document.getElementById('teachers-empty-state');
const teacherSummary = document.getElementById('teacher-summary');
const exportTeachersBtn = document.getElementById('export-teachers-btn');
const refreshBtn = document.getElementById('refresh-btn');
const logoutBtn = document.getElementById('logout-btn');
const adminName = document.getElementById('admin-name');
const callableFunctions = firebase.app().functions('us-central1');

let currentAdmin = null;
let teacherRows = [];

auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        const isDefaultAdmin = (user.email || '').toLowerCase() === 'teacher@ingyu-ai-world.com';
        const isAdmin = userData.role === 'teacher' && (userData.isAdmin === true || isDefaultAdmin);

        if (!isAdmin) {
            await auth.signOut();
            window.location.href = 'login.html';
            return;
        }

        currentAdmin = { uid: user.uid, email: user.email, ...userData };
        adminName.textContent = currentAdmin.name || currentAdmin.displayName || '관리자';
        await loadAdminData();
    } catch (error) {
        console.error('Admin auth error:', error);
        window.location.href = 'login.html';
    }
});

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await auth.signOut();
        window.location.href = 'login.html';
    });
}

if (refreshBtn) {
    refreshBtn.addEventListener('click', loadAdminData);
}

if (exportTeachersBtn) {
    exportTeachersBtn.addEventListener('click', exportTeachersCsv);
}

async function loadAdminData() {
    await Promise.all([
        loadTeacherRequests(),
        loadTeachers()
    ]);
}

function formatDate(value) {
    if (!value) return '-';
    return new Date(value).toLocaleString('ko-KR');
}

function timestampToMillis(value) {
    if (!value) return null;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (value.seconds) return value.seconds * 1000;
    return value;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeCodeSeed(value) {
    return String(value || 'CLASS')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 5) || 'CLASS';
}

function generateClassCode(name) {
    const seed = normalizeCodeSeed(name);
    const suffix = Math.random().toString(16).slice(2, 8).toUpperCase();
    return `${seed}-${suffix}`;
}

function renderLoading(tbody, colspan, message) {
    tbody.innerHTML = `
        <tr>
            <td colspan="${colspan}">
                <div class="table-loading">
                    <div class="spinner"></div>
                    <p>${escapeHtml(message)}</p>
                </div>
            </td>
        </tr>
    `;
}

async function loadTeacherRequests() {
    if (!currentAdmin) return;

    renderLoading(requestsTbody, 5, '신청 목록을 불러오는 중...');
    emptyState.style.display = 'none';

    try {
        const snapshot = await db.collection('teacher_requests')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();

        const requests = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                teacherUid: data.teacherUid || '',
                email: data.email || '',
                displayName: data.displayName || '',
                schoolName: data.schoolName || '',
                status: data.status || '',
                createdAt: timestampToMillis(data.createdAt)
            };
        });

        requestSummary.textContent = `승인 대기 ${requests.length}건`;

        if (requests.length === 0) {
            requestsTbody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        requestsTbody.innerHTML = requests.map((request) => `
            <tr data-request-id="${escapeHtml(request.id)}">
                <td>
                    <strong>${escapeHtml(request.displayName)}</strong>
                    <div class="admin-muted">${request.teacherUid ? '계정 생성 완료' : '이전 방식 신청'}</div>
                </td>
                <td>${escapeHtml(request.email)}</td>
                <td>${escapeHtml(request.schoolName || '-')}</td>
                <td>${formatDate(request.createdAt)}</td>
                <td>
                    <div class="admin-actions">
                        <button class="primary-button admin-small-button" onclick="approveRequest('${escapeHtml(request.id)}')">승인</button>
                        <button class="danger-button admin-small-button" onclick="rejectRequest('${escapeHtml(request.id)}')">거절</button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading teacher requests:', error);
        requestsTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">교사 신청 목록을 불러오지 못했습니다. ${escapeHtml(error.message || '')}</td></tr>`;
    }
}

async function loadTeachers() {
    if (!currentAdmin) return;

    renderLoading(teachersTbody, 7, '교사 목록을 불러오는 중...');
    teachersEmptyState.style.display = 'none';

    try {
        const snapshot = await db.collection('users')
            .where('role', '==', 'teacher')
            .get();

        teacherRows = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                uid: doc.id,
                email: data.email || '',
                displayName: data.displayName || data.name || '',
                schoolName: data.schoolName || '',
                defaultClassCode: data.defaultClassCode || '',
                approved: data.approved !== false,
                isAdmin: data.isAdmin === true || (data.email || '').toLowerCase() === 'teacher@ingyu-ai-world.com',
                createdAt: timestampToMillis(data.createdAt),
                lastLogin: timestampToMillis(data.lastLogin)
            };
        }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        const approvedCount = teacherRows.filter(teacher => teacher.approved).length;
        const pendingCount = teacherRows.length - approvedCount;
        teacherSummary.textContent = `전체 ${teacherRows.length}명 · 승인 ${approvedCount}명 · 대기 ${pendingCount}명`;

        if (teacherRows.length === 0) {
            teachersTbody.innerHTML = '';
            teachersEmptyState.style.display = 'block';
            return;
        }

        teachersTbody.innerHTML = teacherRows.map((teacher) => `
            <tr data-teacher-uid="${escapeHtml(teacher.uid)}">
                <td>
                    <strong>${escapeHtml(teacher.displayName || '-')}</strong>
                    <div class="admin-muted">${teacher.approved ? '승인됨' : '승인 대기'}</div>
                </td>
                <td>${escapeHtml(teacher.email)}</td>
                <td>${escapeHtml(teacher.schoolName || '-')}</td>
                <td>${escapeHtml(teacher.defaultClassCode || '-')}</td>
                <td>${teacher.isAdmin ? '관리자' : '교사'}</td>
                <td>${formatDate(teacher.createdAt)}</td>
                <td>
                    <div class="admin-actions">
                        <button class="secondary-button admin-small-button" onclick="resetTeacherPassword('${escapeHtml(teacher.uid)}', '${escapeHtml(teacher.email)}')" ${teacher.uid === currentAdmin.uid ? 'disabled' : ''}>비번 초기화</button>
                        <button class="danger-button admin-small-button" onclick="deleteTeacherAccount('${escapeHtml(teacher.uid)}', '${escapeHtml(teacher.displayName || teacher.email)}')" ${teacher.uid === currentAdmin.uid ? 'disabled' : ''}>삭제</button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading teachers:', error);
        teachersTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">교사 목록을 불러오지 못했습니다. ${escapeHtml(error.message || '')}</td></tr>`;
    }
}

window.approveRequest = async function (requestId) {
    try {
        const requestRef = db.collection('teacher_requests').doc(requestId);
        const requestDoc = await requestRef.get();
        if (!requestDoc.exists || requestDoc.data().status !== 'pending') {
            throw new Error('승인 대기 중인 신청을 찾을 수 없습니다.');
        }

        const request = requestDoc.data();
        if (!request.teacherUid) {
            throw new Error('이 신청은 이전 방식으로 접수되어 교사 비밀번호가 없습니다. 교사가 신청 페이지에서 비밀번호를 정해 다시 신청해야 합니다.');
        }

        const userRef = db.collection('users').doc(request.teacherUid);
        const userDoc = await userRef.get();
        if (!userDoc.exists || userDoc.data().role !== 'teacher') {
            throw new Error('신청한 교사 계정 정보를 찾을 수 없습니다.');
        }

        const classRef = db.collection('classes').doc();
        const classCode = generateClassCode(request.displayName);
        const batch = db.batch();

        batch.set(userRef, {
            approved: true,
            isAdmin: false,
            defaultClassId: classRef.id,
            defaultClassCode: classCode,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        batch.set(classRef, {
            teacherId: request.teacherUid,
            className: `${request.displayName} 반`,
            classCode,
            isActive: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        batch.update(requestRef, {
            status: 'approved',
            approvedBy: currentAdmin.uid,
            classId: classRef.id,
            classCode,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();
        alert(`교사 계정이 승인되었습니다.\n반 코드: ${classCode}`);
        await loadAdminData();
    } catch (error) {
        console.error('Approve teacher error:', error);
        alert(error.message || '교사 승인에 실패했습니다.');
    }
};

window.rejectRequest = async function (requestId) {
    if (!confirm('이 교사 신청을 거절하시겠습니까?')) return;

    try {
        const requestRef = db.collection('teacher_requests').doc(requestId);
        const requestDoc = await requestRef.get();
        const request = requestDoc.exists ? requestDoc.data() : {};
        const batch = db.batch();

        batch.update(requestRef, {
            status: 'rejected',
            rejectedBy: currentAdmin.uid,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (request.teacherUid) {
            batch.set(db.collection('users').doc(request.teacherUid), {
                approved: false,
                rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }

        await batch.commit();
        await loadAdminData();
    } catch (error) {
        console.error('Reject teacher error:', error);
        alert(error.message || '교사 신청 거절에 실패했습니다.');
    }
};

window.resetTeacherPassword = async function (teacherUid, email) {
    const newPassword = prompt(`${email} 계정의 새 비밀번호를 입력하세요.\n6자리 이상으로 설정해야 합니다.`);
    if (newPassword === null) return;

    const trimmedPassword = newPassword.trim();
    if (trimmedPassword.length < 6) {
        alert('새 비밀번호는 6자리 이상이어야 합니다.');
        return;
    }

    if (!confirm(`${email} 계정의 비밀번호를 새 비밀번호로 초기화하시겠습니까?`)) return;

    try {
        const resetPassword = callableFunctions.httpsCallable('resetTeacherPassword');
        await resetPassword({ teacherUid, newPassword: trimmedPassword });
        alert('교사 비밀번호를 초기화했습니다.');
    } catch (error) {
        console.error('Password reset error:', error);
        alert(error.message || '비밀번호 초기화에 실패했습니다.');
    }
};

window.deleteTeacherAccount = async function (teacherUid, label) {
    const firstConfirm = confirm(`${label} 교사 계정을 삭제하시겠습니까?\n연결된 학생과 학급 데이터도 함께 삭제될 수 있습니다.`);
    if (!firstConfirm) return;

    const typed = prompt('정말 삭제하려면 DELETE 를 입력하세요.');
    if (typed !== 'DELETE') {
        alert('삭제를 취소했습니다.');
        return;
    }

    try {
        const deleteTeacher = callableFunctions.httpsCallable('deleteTeacherAccount');
        const result = await deleteTeacher({
            teacherUid,
            confirmDeleteStudents: true
        });
        const data = result.data || {};
        alert(`교사 계정을 삭제했습니다.\n삭제된 학생: ${data.deletedStudents || 0}명\n삭제된 학급: ${data.deletedClasses || 0}개`);
        await loadAdminData();
    } catch (error) {
        console.error('Delete teacher error:', error);
        alert(error.message || '교사 계정 삭제에 실패했습니다.');
    }
};

function escapeCsv(value) {
    const text = String(value ?? '');
    const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replace(/"/g, '""')}"`;
}

function exportTeachersCsv() {
    if (teacherRows.length === 0) {
        alert('내보낼 교사 목록이 없습니다.');
        return;
    }

    const headers = ['교사명', '이메일', '학교', '반 코드', '권한', '승인상태', '가입일', '최근 접속'];
    const rows = teacherRows.map(teacher => [
        teacher.displayName,
        teacher.email,
        teacher.schoolName,
        teacher.defaultClassCode,
        teacher.isAdmin ? '관리자' : '교사',
        teacher.approved ? '승인됨' : '승인 대기',
        formatDate(teacher.createdAt),
        formatDate(teacher.lastLogin)
    ]);

    const csv = [headers, ...rows]
        .map(row => row.map(escapeCsv).join(','))
        .join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `teacher-accounts-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
