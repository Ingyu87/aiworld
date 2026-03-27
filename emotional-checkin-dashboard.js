// 감정 출석부 탭 JavaScript

// 전역 변수
let emotionData = [];
let currentPeriod = 'month';

function getApiBaseUrl() {
    if (window.API_BASE_URL) {
        return window.API_BASE_URL.replace(/\/$/, '');
    }
    if (window.location.protocol === 'file:') {
        return null;
    }
    return '';
}

function buildApiUrl(path) {
    const base = getApiBaseUrl();
    if (base === null) return null;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalizedPath}`;
}

// 감정 출석부 탭 초기화
async function initEmotionsTab() {
    console.log('Initializing emotions tab...');

    // 기간 필터 이벤트
    document.getElementById('emotion-period-filter').addEventListener('change', (e) => {
        currentPeriod = e.target.value;
        loadEmotionData();
    });

    // AI 분석 새로고침 버튼
    document.getElementById('btn-refresh-analysis').addEventListener('click', () => {
        generateAIAnalysis();
    });

    // AI 분석 생성 버튼(수동 실행)
    const generateBtn = document.getElementById('btn-generate-ai-analysis');
    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            generateAIAnalysis();
        });
    }

    // 감정 기록 초기화 버튼
    const resetEmotionsBtn = document.getElementById('reset-emotions-btn');
    if (resetEmotionsBtn) {
        resetEmotionsBtn.addEventListener('click', async () => {
            if (!confirm('모든 학생의 감정 출석 기록을 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;

            try {
                resetEmotionsBtn.disabled = true;
                const originalText = resetEmotionsBtn.innerHTML;
                resetEmotionsBtn.innerHTML = '<span>초기화 중...</span>';

                const db = firebase.firestore();
                const snapshot = await db.collection('emotional_checkins').get();
                const batch = db.batch();

                snapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });

                await batch.commit();
                alert('감정 기록이 초기화되었습니다.');

                resetEmotionsBtn.innerHTML = originalText;
                resetEmotionsBtn.disabled = false;

                // 데이터 다시 로드
                await loadEmotionData();

            } catch (error) {
                console.error('Error resetting emotion data:', error);
                alert('기록 초기화에 실패했습니다.');
                resetEmotionsBtn.disabled = false;
            }
        });
    }

    // 데이터 로드
    await loadEmotionData();
}

// 감정 데이터 로드
async function loadEmotionData() {
    try {
        const db = firebase.firestore();

        // 기간 계산
        const { startDate, endDate } = getPeriodDates(currentPeriod);

        // Firestore에서 감정 체크인 데이터 가져오기
        const snapshot = await db.collection('emotional_checkins')
            .where('date', '>=', startDate)
            .where('date', '<=', endDate)
            .orderBy('date', 'desc')
            .get();

        emotionData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`Loaded ${emotionData.length} emotion check-ins`);

        // UI 업데이트
        updateEmotionStats();
        updateEmotionChart();
        updateWordCloud();
        updateEmotionTable();

        // AI 분석은 버튼으로만 수동 생성하도록 유지

    } catch (error) {
        console.error('Error loading emotion data:', error);
    }
}

// 기간별 날짜 계산
function getPeriodDates(period) {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    let startDate;

    switch (period) {
        case 'today':
            startDate = endDate;
            break;
        case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            startDate = weekAgo.toISOString().split('T')[0];
            break;
        case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(today.getMonth() - 1);
            startDate = monthAgo.toISOString().split('T')[0];
            break;
        case 'quarter':
            const quarterAgo = new Date(today);
            quarterAgo.setMonth(today.getMonth() - 3);
            startDate = quarterAgo.toISOString().split('T')[0];
            break;
        default:
            startDate = endDate;
    }

    return { startDate, endDate };
}

// 통계 업데이트
function updateEmotionStats() {
    // 총 체크인 수
    document.getElementById('total-checkins').textContent = `${emotionData.length}회`;

    // 참여율 계산 (전체 학생 수 대비)
    const uniqueStudents = new Set(emotionData.map(d => d.userId)).size;
    const totalStudents = window.allStudents ? window.allStudents.length : uniqueStudents;
    const rate = totalStudents > 0 ? Math.round((uniqueStudents / totalStudents) * 100) : 0;
    document.getElementById('checkin-rate').textContent = `${rate}%`;

    // 가장 많은 감정
    const emotionCounts = {};
    emotionData.forEach(d => {
        emotionCounts[d.emotionEmoji] = (emotionCounts[d.emotionEmoji] || 0) + 1;
    });
    const topEmotion = Object.keys(emotionCounts).reduce((a, b) =>
        emotionCounts[a] > emotionCounts[b] ? a : b, '-'
    );
    document.getElementById('top-emotion').textContent = topEmotion;

    // 관심 필요 학생 (부정적 감정 3회 이상)
    const negativeEmotions = ['sad', 'angry', 'anxious', 'disappointed'];
    const studentNegativeCounts = {};

    emotionData.forEach(d => {
        if (negativeEmotions.includes(d.emotion)) {
            studentNegativeCounts[d.userId] = (studentNegativeCounts[d.userId] || 0) + 1;
        }
    });

    const attentionStudents = Object.values(studentNegativeCounts).filter(count => count >= 3).length;
    document.getElementById('attention-students').textContent = `${attentionStudents}명`;
}

// 감정 차트 업데이트
function updateEmotionChart() {
    const ctx = document.getElementById('emotionChart').getContext('2d');

    // 감정별 카운트
    const emotionCounts = {
        '기쁨': 0,
        '슬픔': 0,
        '화남': 0,
        '불안': 0,
        '평온': 0,
        '실망': 0,
        '피곤': 0,
        '놀람': 0
    };

    const emotionMap = {
        'happy': '기쁨',
        'sad': '슬픔',
        'angry': '화남',
        'anxious': '불안',
        'calm': '평온',
        'disappointed': '실망',
        'tired': '피곤',
        'surprised': '놀람'
    };

    emotionData.forEach(d => {
        const label = emotionMap[d.emotion];
        if (label) {
            emotionCounts[label]++;
        }
    });

    // 기존 차트 삭제
    if (window.emotionChartInstance) {
        window.emotionChartInstance.destroy();
    }

    // 새 차트 생성
    window.emotionChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(emotionCounts),
            datasets: [{
                data: Object.values(emotionCounts),
                backgroundColor: [
                    '#FFE66D', // 기쁨
                    '#95B8FC', // 슬픔
                    '#FF6B6B', // 화남
                    '#FFB84D', // 불안
                    '#A8E6CF', // 평온
                    '#C3B1E1', // 실망
                    '#B8E6E1', // 피곤
                    '#FFB8D1'  // 놀람
                ],
                borderWidth: 1,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: {
                            size: 8,
                            family: 'Noto Sans KR'
                        },
                        padding: 5,
                        boxWidth: 8,
                        boxHeight: 8
                    }
                }
            }
        }
    });
}

// 워드 클라우드 업데이트
function updateWordCloud() {
    const canvas = document.getElementById('wordCloud');
    const ctx = canvas.getContext('2d');

    const displayWidth = canvas.parentElement.clientWidth || canvas.clientWidth || 600;
    const displayHeight = canvas.parentElement.clientHeight || canvas.clientHeight || 280;

    if (canvas.width !== displayWidth) {
        canvas.width = displayWidth;
    }
    if (canvas.height !== displayHeight) {
        canvas.height = displayHeight;
    }

    // 캔버스 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 단어 빈도 계산
    const wordCounts = {};
    emotionData.forEach(d => {
        if (d.selectedWords && Array.isArray(d.selectedWords)) {
            d.selectedWords.forEach(word => {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            });
        }
    });

    // 상위 30개 단어
    const sortedWords = Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30);

    if (sortedWords.length === 0) {
        ctx.font = '20px Noto Sans KR';
        ctx.fillStyle = '#999';
        ctx.textAlign = 'center';
        ctx.fillText('아직 단어 데이터가 없습니다', canvas.width / 2, canvas.height / 2);
        return;
    }

    // 간단한 워드 클라우드 (랜덤 배치)
    const maxCount = sortedWords[0][1];
    const colors = ['#FF6B9D', '#4ECDC4', '#FFE66D', '#A8E6CF', '#95B8FC', '#C3B1E1', '#FFB84D'];
    const minFontSize = 12;
    const maxFontSize = 32;
    const paddingX = 32;
    const paddingY = 24;

    sortedWords.forEach(([word, count], index) => {
        const fontSize = Math.round(minFontSize + (count / maxCount) * (maxFontSize - minFontSize));
        const x = Math.random() * (canvas.width - paddingX * 2) + paddingX;
        const y = Math.random() * (canvas.height - paddingY * 2) + paddingY;
        const color = colors[index % colors.length];

        ctx.font = `${fontSize}px Noto Sans KR`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(word, x, y);
    });
}

// 감정 테이블 업데이트
function updateEmotionTable() {
    const tbody = document.getElementById('emotions-tbody');
    const emptyState = document.getElementById('emotions-empty-state');

    if (emotionData.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    // 학생별로 그룹화
    const studentEmotions = {};
    emotionData.forEach(d => {
        if (!studentEmotions[d.userId]) {
            studentEmotions[d.userId] = [];
        }
        studentEmotions[d.userId].push(d);
    });

    // 테이블 생성
    tbody.innerHTML = Object.entries(studentEmotions).map(([userId, emotions]) => {
        const latest = emotions[0]; // 최신 감정
        const count = emotions.length;
        // 누적 느낌을 주기 위해: 최근 감정 1회가 아니라, 기간 내 선택 단어 빈도를 집계해서 Top 3를 보여준다.
        const wordCounts = {};
        emotions.forEach(e => {
            (e.selectedWords || []).forEach(word => {
                const key = String(word);
                wordCounts[key] = (wordCounts[key] || 0) + 1;
            });
        });
        const topWords = Object.entries(wordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([word]) => word);

        return `
            <tr>
                <td><strong>${latest.userName || '학생'}</strong></td>
                <td>
                    <span class="emotion-badge">${latest.emotionEmoji} ${latest.emotionName || ''}</span>
                </td>
                <td>
                    <div class="emotion-words">
                        ${topWords.map(word => `<span class="word-badge">${word}</span>`).join('')}
                    </div>
                </td>
                <td>${count}회</td>
                <td>${formatDate(latest.date)}</td>
                <td>
                    <button class="secondary-button" onclick="viewStudentEmotionDetail('${userId}', '${latest.userName}')">
                        상세보기
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// AI 분석 생성
let isAnalyzing = false;
async function generateAIAnalysis() {
    if (isAnalyzing) return;
    
    const card = document.getElementById('ai-analysis-card');
    const loading = document.getElementById('ai-analysis-loading');
    const content = document.getElementById('ai-analysis-content');

    if (!card || !loading || !content) return;

    isAnalyzing = true;
    card.style.display = 'block';
    loading.style.display = 'block';
    content.style.display = 'none';

    try {
        const apiUrl = buildApiUrl('/api/analyze-class-emotions');
        if (!apiUrl) {
            content.innerHTML = '<p style="text-align: center;">로컬 파일로 실행 중이라 AI 분석 API를 사용할 수 없습니다. 서버에서 실행해주세요.</p>';
            content.style.display = 'block';
            return;
        }

        // 감정 데이터 집계
        const emotionCounts = {};
        emotionData.forEach(d => {
            emotionCounts[d.emotion] = (emotionCounts[d.emotion] || 0) + 1;
        });

        const totalStudents = window.allStudents ? window.allStudents.length : 1;
        const checkinRate = Math.round((new Set(emotionData.map(d => d.userId)).size / totalStudents) * 100);

        // AI API 호출
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                period: currentPeriod,
                emotionData: emotionCounts,
                studentCount: totalStudents,
                checkinRate: checkinRate
            })
        });

        if (!response.ok) {
            let errorDetail = '';
            try {
                const errorData = await response.json();
                errorDetail = errorData.error ? ` (${errorData.error})` : '';
            } catch (parseError) {
                errorDetail = '';
            }
            throw new Error(`AI 분석 서버 응답 실패: ${response.status}${errorDetail}`);
        }

        const data = await response.json();

        if (data.success && data.analysis) {
            displayAIAnalysis(data.analysis);
        } else {
            throw new Error('Failed to generate analysis');
        }

    } catch (error) {
        console.error('Error generating AI analysis:', error);
        content.innerHTML = `<p style="text-align: center;">AI 분석을 불러오는 데 실패했습니다.<br><small>${error.message}</small></p>`;
        content.style.display = 'block';
    } finally {
        loading.style.display = 'none';
        isAnalyzing = false;
    }
}

// AI 분석 표시
function displayAIAnalysis(analysis) {
    const contentEl = document.getElementById('ai-analysis-content');
    if (!contentEl) return;

    const overviewEl = document.getElementById('analysis-overview');
    const suggestionsEl = document.getElementById('analysis-suggestions');
    const positivesEl = document.getElementById('analysis-positives');

    const overviewText = analysis?.overview || '분석 결과가 없습니다.';
    const suggestions = Array.isArray(analysis?.suggestions)
        ? analysis.suggestions
        : (analysis?.suggestions ? [String(analysis.suggestions)] : []);
    const positivesText = analysis?.positives || '';

    // 마크업/ID가 달라도 렌더링 실패로 전체 카드가 깨지지 않게 보호
    if (!overviewEl || !suggestionsEl || !positivesEl) {
        contentEl.innerHTML = `
            <div class="analysis-section">
                <h4>💡 전반적인 학급 분위기</h4>
                <p>${overviewText}</p>
            </div>
            <div class="analysis-section">
                <h4>✨ 실천 제안</h4>
                <ul>${suggestions.map(s => `<li>${s}</li>`).join('')}</ul>
            </div>
            <div class="analysis-section positive">
                <h4>👍 긍정적인 점</h4>
                <p>${positivesText}</p>
            </div>
        `;
        contentEl.style.display = 'block';
        return;
    }

    overviewEl.textContent = overviewText;
    suggestionsEl.innerHTML = suggestions.map(s => `<li>${s}</li>`).join('');
    positivesEl.textContent = positivesText;
    contentEl.style.display = 'block';
}

// 학생 감정 상세 보기
function viewStudentEmotionDetail(userId, userName) {
    const studentData = emotionData.filter(d => d.userId === userId);
    const modalEl = document.getElementById('emotion-detail-modal');
    const closeBtn = document.getElementById('emotion-detail-modal-close');
    const subtitleEl = document.getElementById('emotion-detail-subtitle');
    const contentEl = document.getElementById('emotion-detail-content');

    // 모달 마크업이 없으면 기존 alert로 폴백
    if (!modalEl || !closeBtn || !subtitleEl || !contentEl) {
        alert(`${userName} 학생의 감정 기록 (${studentData.length}회)`);
        return;
    }

    const escapeHtml = (s) =>
        String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

    const maxRows = 20;
    const rows = studentData.slice(0, maxRows).map(d => {
        const words = Array.isArray(d.selectedWords) ? d.selectedWords : [];
        const reason = d.reason || '-';
        return `
            <div style="padding: 0.9rem; border-radius: 14px; background: rgba(237, 242, 247, 0.9); margin-bottom: 0.7rem;">
                <div style="font-weight: 800; margin-bottom: 0.4rem;">
                    ${escapeHtml(d.date)} · ${escapeHtml(d.emotionEmoji)} ${escapeHtml(d.emotionName || '')}
                </div>
                <div style="margin-bottom: 0.4rem;">
                    <span style="font-weight: 700;">선택 단어:</span>
                    ${words.slice(0, 12).map(w => `<span class="word-badge" style="margin-right: 0.3rem;">${escapeHtml(w)}</span>`).join('')}
                </div>
                <div>
                    <span style="font-weight: 700;">이유:</span> ${escapeHtml(reason)}
                </div>
            </div>
        `;
    }).join('');

    subtitleEl.textContent = `${userName} 학생의 감정 기록 (${studentData.length}회)`;
    contentEl.innerHTML = studentData.length > maxRows
        ? `${rows}<div style="color: var(--text-light); font-weight: 600; margin-top: 0.6rem;">(최근 ${maxRows}개만 표시)</div>`
        : rows;

    // 이벤트는 중복 등록 방지용으로 최초 1회만
    if (!modalEl.dataset.bound) {
        closeBtn.addEventListener('click', () => {
            modalEl.classList.remove('active');
            document.body.style.overflow = '';
        });
        const backdrop = modalEl.querySelector('.modal-backdrop');
        backdrop && backdrop.addEventListener('click', () => {
            modalEl.classList.remove('active');
            document.body.style.overflow = '';
        });
        modalEl.dataset.bound = 'true';
    }

    modalEl.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 날짜 포맷
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diff === 0) return '오늘';
    if (diff === 1) return '어제';
    if (diff < 7) return `${diff}일 전`;

    return dateStr;
}
