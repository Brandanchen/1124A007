# 音樂遊戲 (Music Game)

這是一個結合Arduino和網頁的互動音樂遊戲。

## 設置說明

### Arduino設置
1. 將Arduino程式碼（`arduino_music_game.ino`）上傳到Arduino板
2. 按鈕連接：
   - 音符按鈕：連接到PIN 2-9（對應Do到高音Do）
   - 所有按鈕都需要接地和上拉電阻
3. LED連接：
   - 紅色LED：PIN 10
   - 黃色LED：PIN 11
   - 綠色LED：PIN 12
   - 每個LED都需要適當的限流電阻

### 網頁設置
1. 在`sounds`目錄中放入以下音效文件：
   - do.mp3
   - re.mp3
   - mi.mp3
   - fa.mp3
   - sol.mp3
   - la.mp3
   - si.mp3
   - do2.mp3
   - correct.mp3
   - wrong.mp3

2. 使用本地伺服器運行網頁（例如使用Visual Studio Code的Live Server擴充功能）

## 遊戲玩法
1. 選擇難度等級：
   - 簡單：4個音符
   - 普通：8個音符
   - 困難：16個音符
   - 地獄：32個音符

2. 遊戲開始後，按照顯示的音符順序在Arduino上按下對應按鈕
3. 每按對一個音符會播放正確音效，按錯會播放錯誤音效
4. 完成所有音符後，系統會根據：
   - 完成時間
   - 錯誤次數
   給出評分和建議

5. Arduino LED顯示：
   - 綠燈：表現優秀（80分以上）
   - 黃燈：表現一般（50-79分）
   - 紅燈：需要改進（50分以下）

## 技術要求
- 現代瀏覽器（支援Web Serial API）
- Arduino Uno或相容板
- 基本電子元件（按鈕、LED、電阻等）
