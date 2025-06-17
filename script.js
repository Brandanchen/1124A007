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

function generateAIAnalysis(score, time, errors, accuracy, totalNotes) {
    const averageTimePerNote = time / totalNotes;
    let analysisHtml = '<h3>AI 分析報告</h3><ul>';
    
    // 速度分析
    if (averageTimePerNote < 1) {
        analysisHtml += '<li>反應速度非常快！平均每個音符只用了 ' + averageTimePerNote.toFixed(2) + ' 秒</li>';
    } else if (averageTimePerNote < 2) {
        analysisHtml += '<li>反應速度適中，平均每個音符用時 ' + averageTimePerNote.toFixed(2) + ' 秒</li>';
    } else {
        analysisHtml += '<li>建議提高反應速度，目前平均每個音符用時 ' + averageTimePerNote.toFixed(2) + ' 秒</li>';
    }

    // 準確度分析
    if (accuracy > 90) {
        analysisHtml += '<li>準確度極高！保持這種水準！</li>';
    } else if (accuracy > 70) {
        analysisHtml += '<li>準確度良好，但還有提升空間</li>';
    } else {
        analysisHtml += '<li>建議放慢速度，優先確保準確度</li>';
    }

    // 錯誤模式分析
    if (errors > 0) {
        const errorRate = (errors / totalNotes) * 100;
        if (errorRate > 50) {
            analysisHtml += '<li>錯誤率較高，建議從簡單難度開始練習</li>';
        } else if (errorRate > 25) {
            analysisHtml += '<li>適度的錯誤是學習過程的一部分，繼續加油！</li>';
        }
    }

    // 綜合建議
    analysisHtml += '<li>綜合表現評分：' + score + ' 分</li>';
    
    // 改進建議
    analysisHtml += '<li>改進建議：';
    if (accuracy < 80) {
        analysisHtml += '專注於準確度 > 速度；';
    }
    if (averageTimePerNote > 2) {
        analysisHtml += '可以嘗試更多練習來提高反應速度；';
    }
    if (errors > totalNotes * 0.3) {
        analysisHtml += '建議先從較簡單的難度開始；';
    }
    analysisHtml += '</li>';

    analysisHtml += '</ul>';
    return analysisHtml;
}

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
