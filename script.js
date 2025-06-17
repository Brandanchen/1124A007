// 初始化遊戲變數
let port;
let writer;
let reader;
let notes = [];
let currentSequence = [];
let userSequence = [];
let isPlaying = false;
let startTime;
let errorCount = 0;

// 創建音頻上下文
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// 音符設定
const noteNames = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si', 'do2'];
const noteColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'];

// 音符頻率對應表（標準音高）
const noteFrequencies = {
    'do': 261.63,  // C4
    're': 293.66,  // D4
    'mi': 329.63,  // E4
    'fa': 349.23,  // F4
    'sol': 392.00, // G4
    'la': 440.00,  // A4
    'si': 493.88,  // B4
    'do2': 523.25  // C5
};

// 遊戲音效設定
const gameAudio = {
    correct: { frequency: 800, duration: 0.15 },
    wrong: { frequency: 200, duration: 0.3 }
};

// 音效播放功能
function playTone(frequency, duration) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

const sounds = {
    correct: new Audio('sounds/correct.mp3'),
    wrong: new Audio('sounds/wrong.mp3'),
};

// Load note sounds
const noteSounds = noteNames.reduce((acc, note) => {
    acc[note] = new Audio(`sounds/${note}.mp3`);
    return acc;
}, {});

async function connectArduino() {
    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });
        writer = port.writable.getWriter();
        reader = port.readable.getReader();
        readArduinoData();
    } catch (error) {
        console.error('Error connecting to Arduino:', error);
    }
}

async function readArduinoData() {
    while (true) {
        try {
            const { value, done } = await reader.read();
            if (done) break;
            handleArduinoInput(new TextDecoder().decode(value));
        } catch (error) {
            console.error('Error reading from Arduino:', error);
            break;
        }
    }
}

function handleArduinoInput(data) {
    const button = parseInt(data);
    if (button >= 2 && button <= 9) {
        const noteIndex = button - 2;
        checkNote(noteNames[noteIndex]);
    }
}

function setDifficulty(count) {
    if (isPlaying) return;
    
    // 確保 AudioContext 已經啟動
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    notes = generateRandomNotes(count);
    displayNotes();
    startCountdown();
}

function startCountdown() {
    const countdownElement = document.getElementById('countdown');
    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    const connectButton = document.getElementById('connectButton');
    
    // Disable buttons during countdown
    difficultyButtons.forEach(btn => btn.disabled = true);
    connectButton.disabled = true;
    
    let count = 3;
    countdownElement.textContent = count;
    
    // 倒數計時音效
    const playCountdownSound = () => {
        playTone(440, 0.1); // 使用 A4 音作為倒數音效
    };

    playCountdownSound();
    
    const countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownElement.textContent = count;
            playCountdownSound();
        } else {
            clearInterval(countdownInterval);
            countdownElement.textContent = '開始！';
            // 播放開始音效
            playTone(880, 0.3); // 使用更高的音作為開始音效
            setTimeout(() => {
                countdownElement.textContent = '';
                startGame();
                // Re-enable buttons
                difficultyButtons.forEach(btn => btn.disabled = false);
                connectButton.disabled = false;
            }, 1000);
        }
    }, 1000);
}

function generateRandomNotes(count) {
    return Array.from({ length: count }, () => 
        noteNames[Math.floor(Math.random() * noteNames.length)]
    );
}

function displayNotes() {
    const container = document.getElementById('noteContainer');
    container.innerHTML = '';
    notes.forEach((note, index) => {
        const noteElement = document.createElement('div');
        noteElement.className = 'note';
        noteElement.textContent = note.toUpperCase();
        noteElement.style.backgroundColor = noteColors[noteNames.indexOf(note)];
        container.appendChild(noteElement);
    });
}

function startGame() {
    isPlaying = true;
    startTime = Date.now();
    errorCount = 0;
    userSequence = [];
    updateScore();
}

function checkNote(note) {
    if (!isPlaying) return;

    const currentNote = notes[userSequence.length];
    const isCorrect = note === currentNote;

    if (isCorrect) {
        // 播放正確音符的聲音
        playTone(noteFrequencies[note], 0.3);
        userSequence.push(note);
        highlightNote(userSequence.length - 1, true);
    } else {
        // 播放錯誤提示音
        playTone(gameAudio.wrong.frequency, gameAudio.wrong.duration);
        errorCount++;
        highlightNote(userSequence.length, false);
    }

    if (userSequence.length === notes.length) {
        endGame();
    }

    updateScore();
}

function highlightNote(index, isCorrect) {
    const notes = document.querySelectorAll('.note');
    notes[index].classList.add('active');
    notes[index].style.border = `3px solid ${isCorrect ? '#2ecc71' : '#e74c3c'}`;
    setTimeout(() => {
        notes[index].classList.remove('active');
        notes[index].style.border = 'none';
    }, 300);
}

function updateScore() {
    const timeElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    document.getElementById('time').textContent = timeElapsed;
    document.getElementById('errors').textContent = errorCount;
    const score = calculateScore();
    document.getElementById('score').textContent = score;
}

function calculateScore() {
    if (userSequence.length === 0) return 0;
    const timeElapsed = (Date.now() - startTime) / 1000;
    const baseScore = (userSequence.length / notes.length) * 100;
    const timeDeduction = Math.min(30, (timeElapsed / notes.length) * 10);
    const errorDeduction = errorCount * 5;
    return Math.max(0, Math.round(baseScore - timeDeduction - errorDeduction));
}

async function endGame() {
    isPlaying = false;
    const score = calculateScore();
    const timeElapsed = (Date.now() - startTime) / 1000;
    const accuracy = Math.round(((notes.length - errorCount) / notes.length) * 100);
    
    // Update accuracy display
    document.getElementById('accuracy').textContent = accuracy;

    // AI Analysis
    const analysis = generateAIAnalysis(score, timeElapsed, errorCount, accuracy, notes.length);
    const aiAnalysisElement = document.getElementById('aiAnalysis');
    aiAnalysisElement.innerHTML = analysis;

    let feedback;
    let ledColor;

    if (score >= 80) {
        feedback = "太棒了！你的表現非常出色！";
        ledColor = 'G';
    } else if (score >= 50) {
        feedback = "表現不錯！繼續努力！";
        ledColor = 'Y';
    } else {
        feedback = "需要更多練習，但別灰心！";
        ledColor = 'R';
    }

    document.getElementById('feedback').textContent = feedback;
    
    // Send score result to Arduino
    if (writer) {
        try {
            await writer.write(new TextEncoder().encode(ledColor));
        } catch (error) {
            console.error('Error sending data to Arduino:', error);
        }
    }
}

// AI 評語生成器
function generateDynamicFeedback() {
    // 移除未使用的 performance 參數
    const adjectives = {
        speed: ['驚人的', '令人印象深刻的', '穩健的', '流暢的', '靈活的'],
        accuracy: ['精確的', '細膩的', '專注的', '穩定的', '細心的'],
        style: ['優雅的', '充滿活力的', '富有表現力的', '自信的', '富有韻律的']
    };
    
    function getRandomAdjective(type) {
        return adjectives[type][Math.floor(Math.random() * adjectives[type].length)];
    }
    
    const metaphors = [
        '如同一位指揮家般',
        '彷彿一位舞者般',
        '像一位音樂詩人般',
        '如同一位藝術家般',
        '猶如一位魔法師般'
    ];

    function generatePersonalizedComment(stats) {
        // 添加更多模板變化
        const templates = [
            `這次的表現${stats.speed}，展現出了${stats.quality}的音樂感！`,
            `${stats.metaphor}，你${stats.action}展現出驚人的潛力！`,
            `在這${stats.difficulty}難度下，你${stats.achievement}！`,
            `透過${stats.feature}，你展現出了${stats.talent}！`,
            `你的演奏${stats.style}，讓人感受到${stats.emotion}！`,
            `${getRandomAdjective('style')}演奏風格中，你${stats.action}完成了挑戰！`,
            `以${getRandomAdjective('speed')}速度和${getRandomAdjective('accuracy')}準確度，你${stats.achievement}！`
        ];
        return templates[Math.floor(Math.random() * templates.length)];
    }

    return function generateAIAnalysis(score, time, errors, accuracy, totalNotes) {
        const averageTimePerNote = time / totalNotes;
        const errorRate = (errors / totalNotes) * 100;
        
        // 根據表現動態生成評語內容
        const performanceStats = {
            speed: averageTimePerNote < 1 ? '快速而精準' : averageTimePerNote < 2 ? '節奏穩定' : '謹慎細心',
            quality: accuracy > 90 ? '卓越' : accuracy > 70 ? '優秀' : '潛力',
            metaphor: metaphors[Math.floor(Math.random() * metaphors.length)],
            action: errors === 0 ? '完美地' : errors < totalNotes * 0.2 ? '出色地' : '努力地',
            difficulty: totalNotes <= 8 ? '基礎' : totalNotes <= 16 ? '進階' : '挑戰',
            achievement: score >= 80 ? '達到了極高的水準' : score >= 60 ? '展現出了穩定的實力' : '付出了可貴的努力',
            feature: errorRate < 10 ? '精確的節奏掌控' : errorRate < 30 ? '專注的演奏態度' : '堅持不懈的精神',
            talent: accuracy > 90 ? '非凡的音樂天賦' : accuracy > 70 ? '優秀的演奏能力' : '持續進步的潛力',
            style: averageTimePerNote < 1.5 ? '充滿活力且準確' : '穩重而細膩',
            emotion: score >= 80 ? '音樂的美妙' : '不斷成長的決心'
        };

        // 生成個性化評語
        const mainComment = generatePersonalizedComment(performanceStats);

        // 生成技術分析
        const technicalAnalysis = [];
        if (averageTimePerNote < 1) {
            technicalAnalysis.push(`你的平均反應時間僅需 ${averageTimePerNote.toFixed(2)} 秒，展現出極快的反應速度。`);
        } else if (averageTimePerNote > 2) {
            technicalAnalysis.push(`目前的平均反應時間是 ${averageTimePerNote.toFixed(2)} 秒，我們可以一起提升這個數字。`);
        }

        if (accuracy > 90) {
            technicalAnalysis.push(`${accuracy}% 的準確率證明了你對音符的精準掌控。`);
        } else if (accuracy < 70) {
            technicalAnalysis.push(`準確率還有提升空間，建議可以放慢速度，專注於每個音符的準確性。`);
        }

        // 生成建議
        const suggestions = [];
        if (accuracy < 80) suggestions.push('提高準確度可以從放慢速度開始，確保每個音符的準確性');
        if (averageTimePerNote > 2) suggestions.push('通過反覆練習來提升反應速度，從簡單的節奏開始');
        if (errors > totalNotes * 0.3) suggestions.push('建議先從較簡單的難度開始，打好基礎很重要');

        // 組合 HTML
        let analysisHtml = `
            <h3>AI 音樂分析報告</h3>
            <div class="analysis-section">
                <p class="main-comment">${mainComment}</p>
                <div class="technical-details">
                    ${technicalAnalysis.map(detail => `<p>${detail}</p>`).join('')}
                </div>
                ${suggestions.length > 0 ? `
                <div class="suggestions">
                    <h4>改進建議：</h4>
                    <ul>${suggestions.map(sug => `<li>${sug}</li>`).join('')}</ul>
                </div>` : ''}
                <div class="score-summary">
                    <p>綜合評分：${score} 分</p>
                    <p>準確率：${accuracy}%</p>
                    <p>平均反應時間：${averageTimePerNote.toFixed(2)} 秒</p>
                </div>
            </div>`;

        return analysisHtml;
    };
}

// 創建評語生成器實例
const generateAIAnalysis = generateDynamicFeedback();

// Initialize connection to Arduino when page loads
document.addEventListener('DOMContentLoaded', connectArduino);

// 在頁面載入時初始化音效
document.addEventListener('DOMContentLoaded', () => {
    // 添加點擊事件來確保音頻上下文已啟動
    document.addEventListener('click', () => {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }, { once: true });
});

