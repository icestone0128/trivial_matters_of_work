# ☁️ 線上即時文字雲收集系統 — 部署與安裝指南

本目錄包含了一個完整的「線上即時文字雲收集系統」，採用前端純 HTML/CSS/JS 開發，並搭配 Firebase Firestore 提供實時資料庫監聽、Firebase Hosting 進行靜態託管。

任何取得此儲存庫的使用者，都可以依照以下步驟將此系統部署到您自己的 Firebase 帳號中。

---

## 🛠️ 事前準備
1. **安裝 Node.js**（用於執行 Firebase CLI 命令）。
2. **建立 Firebase 專案**：
   * 前往 [Firebase Console](https://console.firebase.google.com/) 點擊 **新增專案 (Add project)**。
   * 在專案內，點選 **Build > Firestore Database** ➔ 點擊 **建立資料庫 (Create database)**，並選擇 **測試模式 (Start in test mode)** 開啟（此時資料庫規則較寬鬆，方便我們稍後以 CLI 覆蓋）。
   * 在專案首頁，點選 **新增 Web 應用程式 (Add web app)** 來註冊此網頁，並複製畫面中產生的 `firebaseConfig` SDK 設定金鑰。

---

## ⚙️ 本地配置修改

在進行部署前，您需要將此 Repo 中的 Firebase 指向修改為您自己的專案：

### 1. 修改專案繫結 (.firebaserc)
打開 `docs/live-word-cloud/.firebaserc`，將其中的 `default` 專案 ID 修改為您新建的專案 ID：
```json
{
  "projects": {
    "default": "YOUR-NEW-PROJECT-ID"
  }
}
```

### 2. 修改前端 Firebase SDK 配置 (app.js)
打開 `docs/live-word-cloud/app.js`，將最上方的 `firebaseConfig` 金鑰更換為您剛剛在 Firebase Console 註冊 Web 應用程式時複製的金鑰：
```javascript
const firebaseConfig = {
  projectId: "YOUR-NEW-PROJECT-ID",
  appId: "YOUR-WEB-APP-APP-ID",
  storageBucket: "YOUR-STORAGE-BUCKET",
  apiKey: "YOUR-API-KEY",
  authDomain: "YOUR-AUTH-DOMAIN",
  messagingSenderId: "YOUR-MESSAGING-SENDER-ID"
};
```

---

## 🚀 部署至雲端

完成上述配置後，即可打開 terminal 並切換到 `docs/live-word-cloud` 目錄，依序執行以下命令：

### 1. 登入 Firebase 帳戶
```bash
npx firebase-tools login
```
*(這會自動開啟瀏覽器要求您進行 Google 帳號授權登入)*

### 2. 部署 Firestore 安全規則
我們已經在此目錄編寫了安全的防注入與讀寫規則（[firestore.rules](firestore.rules)）。執行以下命令將規則覆蓋到您的雲端 Firestore 上，以保障資料庫安全：
```bash
npx firebase-tools deploy --only firestore
```

### 3. 部署 Hosting 網頁
將所有網頁資源部署至 Firebase Hosting：
```bash
npx firebase-tools deploy --only hosting
```

部署完成後，CLI 會輸出您的 **Hosting URL**（例如：`https://your-project-id.web.app`）。

---

## 🧪 驗證與操作

* **輸入模式**：直接打開 Hosting URL。在輸入框內輸入想法送出。
* **投影模式**：在網址後方加上參數，例如：`https://your-project-id.web.app?mode=display`。
* **清空資料**：在輸入模式卡片中點選「清空所有數據」，輸入密碼 `0128` 即可即時歸零並在背景批次刪除 Firestore 中所有已存數據。
* **快取排除**：若未來您有修改 `style.css` 或 `app.js` 的代碼，請在 `index.html` 內的資源引入路徑追加更高的版本參數（例如 `style.css?v=1.0.9`），以防止瀏覽器強烈快取造成無法取得最新版的問題。
