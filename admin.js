const requestsTbody = document.getElementById('requests-tbody');
const emptyState = document.getElementById('empty-state');
const requestSummary = document.getElementById('request-summary');
const refreshBtn = document.getElementById('refresh-btn');
const logoutBtn = document.getElementById('logout-btn');
const adminName = document.getElementById('admin-name');

let currentAdmin = null;

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
        await loadTeacherRequests();
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
    refreshBtn.addEventListener('click', loadTeacherRequests);
}

function formatDate(value) {
    if (!value) return '-';
    return new Date(value).toLocaleString('ko-KR');
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function loadTeacherRequests() {
    if (!currentAdmin) return;

    requestsTbody.innerHTML = `
        <tr>
            <td colspan="6">
                <div class="table-loading">
                    <div class="spinner"></div>
                    <p>신청 목록을 불러오는 중...</p>
                </div>
            </td>
        </tr>
    `;
    emptyState.style.display = 'none';

    try {
        const listTeacherRequests = firebaseFns.httpsCallable('listTeacherRequests');
        const result = await listTeacherRequests({ status: 'pending' });
        const requests = result.data.requests || [];

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
                    <div class="admin-muted">${escapeHtml(request.status)}</div>
                </td>
                <td>${escapeHtml(request.email)}</td>
                <td>${escapeHtml(request.schoolName || '-')}</td>
                <td>${formatDate(request.createdAt)}</td>
                <td>
                    <input class="admin-password-input" type="text" placeholder="6자리 이상" autocomplete="off">
                </td>
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
        requestsTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">교사 신청 목록을 불러오지 못했습니다. ${escapeHtml(error.message || '')}</td></tr>`;
    }
}

window.approveRequest = async function (requestId) {
    const row = document.querySelector(`tr[data-request-id="${CSS.escape(requestId)}"]`);
    const passwordInput = row ? row.querySelector('.admin-password-input') : null;
    const temporaryPassword = passwordInput ? passwordInput.value.trim() : '';

    if (temporaryPassword.length < 6) {
        alert('임시 비밀번호는 6자리 이상이어야 합니다.');
        return;
    }

    try {
        const approveTeacher = firebaseFns.httpsCallable('approveTeacher');
        const result = await approveTeacher({ requestId, temporaryPassword });
        alert(`교사 계정이 승인되었습니다.\n반 코드: ${result.data.classCode}`);
        await loadTeacherRequests();
    } catch (error) {
        console.error('Approve teacher error:', error);
        alert(error.message || '교사 승인에 실패했습니다.');
    }
};

window.rejectRequest = async function (requestId) {
    if (!confirm('이 교사 신청을 거절하시겠습니까?')) return;

    try {
        const rejectTeacherRequest = firebaseFns.httpsCallable('rejectTeacherRequest');
        await rejectTeacherRequest({ requestId });
        await loadTeacherRequests();
    } catch (error) {
        console.error('Reject teacher error:', error);
        alert(error.message || '교사 신청 거절에 실패했습니다.');
    }
};
