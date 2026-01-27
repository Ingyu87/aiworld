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

        // Update active tab button
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Update active form
        if (tab === 'student') {
            studentForm.classList.add('active');
            teacherForm.classList.remove('active');
            hideError(studentError);
            hideError(teacherError);
        } else {
            teacherForm.classList.add('active');
            studentForm.classList.remove('active');
            hideError(studentError);
            hideError(teacherError);
        }
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
    document.querySelectorAll('.login-form').forEach(form => {
        form.style.display = 'none';
    });
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
    const activeTab = document.querySelector('.tab-button.active').dataset.tab;
    if (activeTab === 'student') {
        studentForm.style.display = 'block';
    } else {
        teacherForm.style.display = 'block';
    }
}

// ===========================
// Student Login
// ===========================
studentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(studentError);

    const email = document.getElementById('student-email').value.trim();
    let password = document.getElementById('student-password').value;

    if (!email || !password) {
        showError(studentError, '아이디와 비밀번호를 입력해주세요.');
        return;
    }

    // Auto-pad 4-digit password
    if (password.length >= 4 && password.length < 6) {
        password += '00';
    }

    // Convert ID to email format
    const fullEmail = email.includes('@') ? email : `${email}@ingyu-ai-world.com`;

    try {
        showLoading();

        // 1. Fetch user document from Firestore by ID (email) first
        const usersSnapshot = await db.collection('users').where('email', '==', fullEmail).get();

        if (usersSnapshot.empty) {
            throw new Error('등록되지 않은 학생입니다.');
        }

        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();

        // 2. Validate against simplified password
        if (userData.simplePassword !== password) {
            throw new Error('비밀번호가 올바르지 않습니다.');
        }

        // 3. Perform "Internal Login" with a fixed password to maintain Auth session
        // This bypasses the need for Admin SDK to change Auth passwords.
        const internalPassword = "fixed_student_pw_1234"; // All students use this internally
        const userCredential = await auth.signInWithEmailAndPassword(fullEmail, internalPassword);
        const user = userCredential.user;

        // Success - redirect to main page
        console.log('Student login successful:', userData);
        window.location.href = 'index.html';

    } catch (error) {
        hideLoading();
        console.error('Student login error:', error);

        let errorMessage = '로그인에 실패했습니다.';

        if (error.code === 'auth/user-not-found') {
            errorMessage = '등록되지 않은 이메일입니다.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = '비밀번호가 올바르지 않습니다.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = '올바른 이메일 형식이 아닙니다.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        showError(studentError, errorMessage);
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

    // Fixed teacher email
    const teacherEmail = 'teacher@ingyu-ai-world.com';

    try {
        showLoading();

        // Firebase Authentication
        const userCredential = await auth.signInWithEmailAndPassword(teacherEmail, password);
        const user = userCredential.user;

        // Check user role in Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();

        if (!userDoc.exists) {
            throw new Error('사용자 정보를 찾을 수 없습니다.');
        }

        const userData = userDoc.data();

        if (userData.role !== 'teacher') {
            await auth.signOut();
            throw new Error('교사 계정이 아닙니다.');
        }

        // Success - redirect to main page
        console.log('Teacher login successful:', userData);
        window.location.href = 'index.html';

    } catch (error) {
        hideLoading();
        console.error('Teacher login error:', error);

        let errorMessage = '로그인에 실패했습니다.';

        if (error.code === 'auth/user-not-found') {
            errorMessage = '교사 계정을 찾을 수 없습니다.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = '비밀번호가 올바르지 않습니다.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = '시스템 오류입니다. 관리자에게 문의하세요.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        showError(teacherError, errorMessage);
    }
});

// ===========================
// Check if already logged in
// ===========================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                // Both teachers and students go to main page
                if (userData.role === 'teacher' || userData.role === 'student') {
                    window.location.href = 'index.html';
                }
            }
        } catch (error) {
            console.error('Error checking user status:', error);
        }
    }
});
