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

    const emailInput = document.getElementById('signup-email').value.trim();
    const name = emailInput; // Use ID as name
    const grade = 1;
    const classNum = 1;
    const number = 1;
    let password = document.getElementById('signup-password').value;
    let confirmPassword = document.getElementById('signup-confirm-password').value;

    const consentPrivacy = document.getElementById('consent-privacy');
    const consentGuardian = document.getElementById('consent-guardian');

    if (!consentPrivacy.checked) {
        showError(signupError, '개인정보 수집 및 이용에 동의해야 합니다.');
        return;
    }

    if (!consentGuardian.checked) {
        showError(signupError, '만 14세 미만 보호자 동의 확인에 체크해야 합니다.');
        return;
    }

    // Validation for 4-digit password
    if (!emailInput || !password || !confirmPassword) {
        showError(signupError, '모든 항목을 입력해주세요.');
        return;
    }

    if (password.length !== 4 || isNaN(password)) {
        showError(signupError, '비밀번호는 숫자 4자리여야 합니다.');
        return;
    }

    if (password !== confirmPassword) {
        showError(signupError, '비밀번호가 일치하지 않습니다.');
        return;
    }

    try {
        showLoading();

        // Convert ID to email format
        const fullEmail = emailInput.includes('@') ? emailInput : `${emailInput}@ingyu-ai-world.com`;

        // 1. Create Firebase Authentication user with a fixed internal password
        const internalPassword = "fixed_student_pw_1234";
        const userCredential = await auth.createUserWithEmailAndPassword(fullEmail, internalPassword);
        const uid = userCredential.user.uid;

        console.log('Auth user created:', uid);

        // 2. Create user document in Firestore with simplePassword
        // Use BOTH doc(uid) and an explicit email field for maximum searchability
        await db.collection('users').doc(uid).set({
            uid: uid,
            email: fullEmail,
            name,
            role: 'student',
            simplePassword: password,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('Firestore document created for:', fullEmail);

        // Sign out immediately to prevent auto-login
        await auth.signOut();

        // Success - redirect to login page
        alert('회원가입이 완료되었습니다! 로그인해 주세요.');
        window.location.href = 'login.html';

    } catch (error) {
        hideLoading();
        console.error('Signup error:', error);

        // Handle "Email already in use" - Check if it's a "Soft Deleted" user
        if (error.code === 'auth/email-already-in-use') {
            try {
                // Try to sign in with the internal password
                const internalPassword = "fixed_student_pw_1234";
                const fullEmail = emailInput.includes('@') ? emailInput : `${emailInput}@ingyu-ai-world.com`;

                await auth.signInWithEmailAndPassword(fullEmail, internalPassword);
                const currentUser = auth.currentUser;

                if (currentUser) {
                    // User exists in Auth but possibly deleted in Firestore
                    // Re-create the Firestore document (Account Recovery)
                    await db.collection('users').doc(currentUser.uid).set({
                        uid: currentUser.uid,
                        email: fullEmail,
                        name,
                        role: 'student',
                        simplePassword: password,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    console.log('Firestore document recovered for:', fullEmail);

                    await auth.signOut();
                    alert('계정이 복구되었습니다! 로그인해 주세요.');
                    window.location.href = 'login.html';
                    return;
                }
            } catch (recoveryError) {
                console.error('Account recovery failed:', recoveryError);
                // If recovery fails, fall through to show the standard error
            }

            showError(signupError, '이미 사용 중인 아이디입니다.');
            return;
        }

        let errorMessage = '회원가입에 실패했습니다.';

        if (error.code === 'auth/invalid-email') {
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
