// ===========================
// DOM Elements
// ===========================
const tabButtons = document.querySelectorAll('.tab-button');
const studentForm = document.getElementById('student-form');
const teacherForm = document.getElementById('teacher-form');
const studentError = document.getElementById('student-error');
const teacherError = document.getElementById('teacher-error');
const loadingSpinner = document.getElementById('loading-spinner');

// ===========================
// Tab Switching
// ===========================
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tab = button.dataset.tab;

        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        if (tab === 'student') {
            studentForm.classList.add('active');
            teacherForm.classList.remove('active');
        } else {
            teacherForm.classList.add('active');
            studentForm.classList.remove('active');
        }

        hideError(studentError);
        hideError(teacherError);
    });
});

// ===========================
// Error Message Helpers
// ===========================
function showError(element, message) {
    element.textContent = message;
    element.classList.add('show');
}

function hideError(element) {
    element.textContent = '';
    element.classList.remove('show');
}

function showLoading() {
    loadingSpinner.style.display = 'block';
    studentForm.classList.remove('active');
    teacherForm.classList.remove('active');
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
    const activeTab = document.querySelector('.tab-button.active').dataset.tab;
    if (activeTab === 'student') {
        studentForm.classList.add('active');
    } else {
        teacherForm.classList.add('active');
    }
}

function normalizeStudentEmail(idOrEmail) {
    const value = idOrEmail.trim();
    return value.includes('@') ? value : `${value}@ingyu-ai-world.com`;
}

// ===========================
// Student Login
// ===========================
studentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(studentError);

    const email = document.getElementById('student-email').value.trim();
    const pin = document.getElementById('student-password').value.trim();

    if (!email || !pin) {
        showError(studentError, '아이디와 4자리 비밀번호를 입력해주세요.');
        return;
    }

    if (!/^\d{4}$/.test(pin)) {
        showError(studentError, '비밀번호는 숫자 4자리여야 합니다.');
        return;
    }

    try {
        showLoading();

        const verifyStudentPin = firebaseFns.httpsCallable('verifyStudentPin');
        const result = await verifyStudentPin({
            email: normalizeStudentEmail(email),
            pin
        });

        await auth.signInWithCustomToken(result.data.token);
        window.location.href = 'index.html';
    } catch (error) {
        hideLoading();
        console.error('Student login error:', error);
        showError(studentError, error.message || '로그인에 실패했습니다.');
    }
});

// ===========================
// Teacher Login
// ===========================
teacherForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(teacherError);

    const password = document.getElementById('teacher-password').value;

    if (!password) {
        showError(teacherError, '비밀번호를 입력해주세요.');
        return;
    }

    const teacherEmail = 'teacher@ingyu-ai-world.com';

    try {
        showLoading();

        const userCredential = await auth.signInWithEmailAndPassword(teacherEmail, password);
        const user = userCredential.user;
        const userDoc = await db.collection('users').doc(user.uid).get();

        if (!userDoc.exists || userDoc.data().role !== 'teacher') {
            await auth.signOut();
            throw new Error('교사 계정이 아닙니다.');
        }

        window.location.href = 'index.html';
    } catch (error) {
        hideLoading();
        console.error('Teacher login error:', error);
        showError(teacherError, error.message || '로그인에 실패했습니다.');
    }
});
