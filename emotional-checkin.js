// 감정 출석부 JavaScript

// 전역 변수
let currentStep = 1;
let checkinData = {
    emotion: '',
    emotionName: '',
    emotionEmoji: '',
    aiGeneratedWords: [],
    selectedWords: [],
    reason: '',
    aiAdvice: null
};

// 인증 체크
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // 학생인지 확인
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'student') {
        alert('학생만 접근할 수 있습니다.');
        window.location.href = 'login.html';
        return;
    }

    // 오늘 이미 체크인했는지 확인
    const today = new Date().toISOString().split('T')[0];
    const existingCheckin = await db.collection('emotional_checkins')
        .where('userId', '==', user.uid)
        .where('date', '==', today)
        .get();

    if (!existingCheckin.empty) {
        if (confirm('오늘 이미 감정 체크인을 완료했어요! 메인으로 이동할까요?')) {
            window.location.href = 'index.html';
        }
    }

    initializeCheckin();
});

// 초기화
function initializeCheckin() {
    // Step 1: 감정 선택
    document.querySelectorAll('.emotion-card').forEach(card => {
        card.addEventListener('click', async function () {
            const emotion = this.dataset.emotion;
            const emotionName = this.dataset.name;
            const emotionEmoji = this.querySelector('.emotion-icon').textContent;

            checkinData.emotion = emotion;
            checkinData.emotionName = emotionName;
            checkinData.emotionEmoji = emotionEmoji;

            // 다음 단계로
            await goToStep(2);
        });
    });

    // Step 2: 단어 선택 다음 버튼
    document.getElementById('btn-words-next').addEventListener('click', () => {
        goToStep(3);
    });

    // Step 3: 이유 입력 글자 수 카운터 및 검증
    const reasonInput = document.getElementById('reason-input');
    const charCount = document.getElementById('char-count');
    const reasonNextBtn = document.getElementById('btn-reason-next');

    reasonInput.addEventListener('input', () => {
        const length = reasonInput.value.trim().length;
        charCount.textContent = length;

        // 최소 10자 이상 입력해야 다음 버튼 활성화
        reasonNextBtn.disabled = length < 10;
    });

    // Step 3: 다음 버튼
    reasonNextBtn.addEventListener('click', () => {
        const reason = reasonInput.value.trim();
        if (reason.length < 10) {
            alert('이유를 최소 10자 이상 작성해주세요.');
            return;
        }
        goToStep(4);
    });
}

// 단계 이동
async function goToStep(step) {
    // 현재 단계 숨기기
    document.querySelectorAll('.step-container').forEach(container => {
        container.classList.remove('active');
    });

    // 새 단계 표시
    document.getElementById(`step-${step}`).classList.add('active');
    currentStep = step;

    // 단계별 처리
    if (step === 2) {
        await loadEmotionWords();
    } else if (step === 3) {
        displaySelectedWords();
    } else if (step === 4) {
        checkinData.reason = document.getElementById('reason-input').value.trim();
        await generateAdvice();
    }

    // 감정 요약 업데이트
    updateEmotionSummary();
}

// 감정 요약 업데이트
function updateEmotionSummary() {
    const icons = document.querySelectorAll('.selected-emotion-icon');
    const texts = document.querySelectorAll('.selected-emotion-text');

    icons.forEach(icon => {
        icon.textContent = checkinData.emotionEmoji;
    });

    texts.forEach(text => {
        text.textContent = checkinData.emotionName;
    });
}

// Step 2: AI로 감정 단어 생성
async function loadEmotionWords() {
    const loadingEl = document.getElementById('words-loading');
    const gridEl = document.getElementById('words-grid');

    loadingEl.style.display = 'block';
    gridEl.innerHTML = '';

    try {
        const response = await fetch('/api/generate-words', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                emotion: checkinData.emotion,
                emotionName: checkinData.emotionName
            })
        });

        const data = await response.json();

        if (data.success && data.words) {
            checkinData.aiGeneratedWords = data.words;
            displayWords(data.words);
        } else {
            throw new Error('Failed to generate words');
        }
    } catch (error) {
        console.error('Error loading words:', error);
        // 기본 단어 사용
        const defaultWords = getDefaultWords(checkinData.emotion);
        checkinData.aiGeneratedWords = defaultWords;
        displayWords(defaultWords);
    } finally {
        loadingEl.style.display = 'none';
    }
}

// 단어 표시
function displayWords(words) {
    const gridEl = document.getElementById('words-grid');
    gridEl.innerHTML = '';

    words.forEach(word => {
        const wordCard = document.createElement('div');
        wordCard.className = 'word-card';
        wordCard.textContent = word;
        wordCard.addEventListener('click', () => toggleWord(wordCard, word));
        gridEl.appendChild(wordCard);
    });
}

// 단어 선택/해제
function toggleWord(cardEl, word) {
    cardEl.classList.toggle('selected');

    if (cardEl.classList.contains('selected')) {
        checkinData.selectedWords.push(word);
    } else {
        checkinData.selectedWords = checkinData.selectedWords.filter(w => w !== word);
    }

    // 다음 버튼 활성화/비활성화
    const nextBtn = document.getElementById('btn-words-next');
    nextBtn.disabled = checkinData.selectedWords.length === 0;
}

// Step 3: 선택한 단어 표시
function displaySelectedWords() {
    const summaryEl = document.getElementById('selected-words-summary');

    const html = `
        <h3>선택한 감정 단어:</h3>
        <div class="words-list">
            ${checkinData.selectedWords.map(word =>
        `<span class="word-tag">${word}</span>`
    ).join('')}
        </div>
    `;

    summaryEl.innerHTML = html;
}

// Step 4: AI 조언 생성
async function generateAdvice() {
    const loadingEl = document.getElementById('advice-loading');
    const containerEl = document.getElementById('advice-container');

    loadingEl.style.display = 'block';
    containerEl.style.display = 'none';

    try {
        const response = await fetch('/api/generate-advice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                emotion: checkinData.emotion,
                emotionName: checkinData.emotionName,
                selectedWords: checkinData.selectedWords,
                reason: checkinData.reason
            })
        });

        const data = await response.json();

        if (data.success && data.advice) {
            checkinData.aiAdvice = data.advice;
            displayAdvice(data.advice);
        } else {
            throw new Error('Failed to generate advice');
        }
    } catch (error) {
        console.error('Error generating advice:', error);
        alert('AI 조언을 불러오는 데 실패했습니다. 다시 시도해주세요.');
        // 이전 단계로 돌아가기
        goToStep(3);
    } finally {
        loadingEl.style.display = 'none';
        containerEl.style.display = 'grid';
    }
}

// 조언 표시
function displayAdvice(advice) {
    document.getElementById('advice-empathy').textContent = advice.empathy;
    document.getElementById('advice-suggestion').textContent = advice.suggestion;
    document.getElementById('advice-quote').textContent = advice.quote;
    document.getElementById('advice-source').textContent = `- ${advice.quoteSource}`;
}

// 체크인 완료 및 저장
async function completeCheckin() {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('Not authenticated');
        }

        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();

        const today = new Date().toISOString().split('T')[0];

        // Firestore에 저장
        await db.collection('emotional_checkins').add({
            userId: user.uid,
            userName: userData.name || userData.email,
            date: today,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),

            emotion: checkinData.emotion,
            emotionEmoji: checkinData.emotionEmoji,

            aiGeneratedWords: checkinData.aiGeneratedWords,
            selectedWords: checkinData.selectedWords,

            reason: checkinData.reason,

            aiAdvice: checkinData.aiAdvice,

            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('Emotional check-in saved successfully');

        // 메인 페이지로 이동
        window.location.href = 'index.html';

    } catch (error) {
        console.error('Error saving check-in:', error);
        alert('저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

// 기본 단어 (API 실패 시)
function getDefaultWords(emotion) {
    const defaultWordSets = {
        happy: ["신나는", "뿌듯한", "설레는", "편안한", "즐거운", "행복한", "기쁜", "상쾌한", "흐뭇한", "만족스러운"],
        sad: ["슬픈", "우울한", "속상한", "외로운", "쓸쓸한", "답답한", "서운한", "허전한", "아쉬운", "그리운"],
        angry: ["화나는", "짜증나는", "억울한", "분한", "약오르는", "불쾌한", "답답한", "속상한", "불만스러운", "언짢은"],
        anxious: ["불안한", "걱정되는", "초조한", "긴장되는", "두려운", "떨리는", "무서운", "조마조마한", "겁나는", "조심스러운"],
        calm: ["평온한", "차분한", "편안한", "고요한", "안정된", "여유로운", "느긋한", "담담한", "무덤덤한", "조용한"]
    };

    return defaultWordSets[emotion] || defaultWordSets.calm;
}


