// ===========================
// DOM Elements
// ===========================
const signupForm = document.getElementById('signup-form');
const signupError = document.getElementById('signup-error');
const loadingSpinner = document.getElementById('loading-spinner');

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
    signupForm.style.display = 'none';
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
    signupForm.style.display = 'block';
}

// ===========================
// Student Signup (현재는 비활성화)
// ===========================
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(signupError);

    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const grade = parseInt(document.getElementById('signup-grade').value);
    const classNum = parseInt(document.getElementById('signup-class').value);
    const number = parseInt(document.getElementById('signup-number').value);
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    // Validation
    if (!name || !email || !grade || !classNum || !number || !password) {
        showError(signupError, '모든 항목을 입력해주세요.');
        return;
    }

    if (password.length < 6) {
        showError(signupError, '비밀번호는 최소 6자 이상이어야 합니다.');
        return;
    }

    if (password !== confirmPassword) {
        showError(signupError, '비밀번호가 일치하지 않습니다.');
        return;
    }

    try {
        showLoading();

        // Create Firebase Authentication user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;

        // Create user document in Firestore
        await db.collection('users').doc(uid).set({
            email,
            name,
            role: 'student',
            grade,
            class: classNum,
            number,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Success - redirect to main page
        alert('회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.');
        window.location.href = 'login.html';

    } catch (error) {
        hideLoading();
        console.error('Signup error:', error);

        let errorMessage = '회원가입에 실패했습니다.';

        if (error.code === 'auth/email-already-in-use') {
            errorMessage = '이미 사용 중인 이메일입니다.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = '올바른 이메일 형식이 아닙니다.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = '비밀번호가 너무 약합니다. (최소 6자)';
        } else if (error.message) {
            errorMessage = error.message;
        }

        showError(signupError, errorMessage);
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
                if (userData.role === 'teacher' || userData.role === 'student') {
                    // Already logged in, redirect to main page
                    window.location.href = 'index.html';
                }
            }
        } catch (error) {
            console.error('Error checking user status:', error);
        }
    }
});
