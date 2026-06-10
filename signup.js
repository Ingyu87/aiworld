// ===========================
// DOM Elements
// ===========================
const signupForm = document.getElementById('signup-form');
const signupError = document.getElementById('signup-error');
const loadingSpinner = document.getElementById('loading-spinner');

ensureClassCodeField();

// ===========================
// Helpers
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

function normalizeStudentEmail(idOrEmail) {
    const value = idOrEmail.trim();
    return value.includes('@') ? value : `${value}@ingyu-ai-world.com`;
}

function ensureClassCodeField() {
    if (document.getElementById('signup-class-code')) return;

    const emailInput = document.getElementById('signup-email');
    if (!emailInput || !emailInput.parentElement) return;

    const group = document.createElement('div');
    group.className = 'form-group';
    group.innerHTML = `
        <label for="signup-class-code" class="form-label">반 코드</label>
        <input type="text" id="signup-class-code" class="form-input" placeholder="예: IGYU-4821" required autocomplete="off" style="text-transform: uppercase;">
    `;
    emailInput.parentElement.insertAdjacentElement('afterend', group);
}

// ===========================
// Student Signup
// ===========================
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(signupError);

    const emailInput = document.getElementById('signup-email').value.trim();
    const classCode = document.getElementById('signup-class-code').value.trim().toUpperCase();
    const pin = document.getElementById('signup-password').value.trim();
    const confirmPin = document.getElementById('signup-confirm-password').value.trim();
    const consentPrivacy = document.getElementById('consent-privacy');
    const consentGuardian = document.getElementById('consent-guardian');

    if (!consentPrivacy.checked) {
        showError(signupError, '개인정보 수집 및 이용에 동의해야 합니다.');
        return;
    }

    if (!consentGuardian.checked) {
        showError(signupError, '보호자 동의 확인을 체크해야 합니다.');
        return;
    }

    if (!emailInput || !classCode || !pin || !confirmPin) {
        showError(signupError, '모든 항목을 입력해주세요.');
        return;
    }

    if (!/^\d{4}$/.test(pin)) {
        showError(signupError, '비밀번호는 숫자 4자리여야 합니다.');
        return;
    }

    if (pin !== confirmPin) {
        showError(signupError, '비밀번호가 일치하지 않습니다.');
        return;
    }

    try {
        showLoading();

        const classSnapshot = await db.collection('classes')
            .where('classCode', '==', classCode)
            .where('isActive', '==', true)
            .limit(1)
            .get();

        if (classSnapshot.empty) {
            throw new Error('유효한 반 코드를 찾을 수 없습니다.');
        }

        const classDoc = classSnapshot.docs[0];
        const classData = classDoc.data();
        const fullEmail = normalizeStudentEmail(emailInput);
        const internalPassword = "fixed_student_pw_1234";
        const userCredential = await auth.createUserWithEmailAndPassword(fullEmail, internalPassword);
        const uid = userCredential.user.uid;

        await db.collection('users').doc(uid).set({
            uid,
            email: fullEmail,
            name: emailInput,
            role: 'student',
            teacherId: classData.teacherId,
            classId: classDoc.id,
            classCodeUsed: classCode,
            simplePassword: pin,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await auth.signOut();

        alert('회원가입이 완료되었습니다. 로그인해주세요.');
        window.location.href = 'login.html';
    } catch (error) {
        hideLoading();
        console.error('Signup error:', error);
        showError(signupError, error.message || '회원가입에 실패했습니다.');
    }
});
