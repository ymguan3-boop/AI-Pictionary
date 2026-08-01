# AI 猜猜看 (Pictionary) 互動繪畫遊戲

> **▶ 立即遊玩**：https://ymguan3-boop.github.io/QRcode-Games/AI-Pictionary/

大螢幕展示 + 手機畫板，透過 Ably 中繼伺服器即時連線，Google Gemini AI 自動猜測畫作內容。

> **通訊層**：使用 Ably Realtime（WebSocket 443 埠），可穿透公司網路與電信 5G 防火牆，無需 P2P 穿透。

## 功能

- **大螢幕 (index.html)**：顯示 QR Code 供手機連線，接收畫作後調用 Gemini AI 猜題
- **手機畫板 (mobile.html)**：Canvas 繪圖，支援顏色、筆刷粗細、橡皮擦、復原、清除
- **AI 主持人**：Gemini 2.5 Flash-Lite 多模態視覺模型（免費快速），幽默點評並打分

## 部署至 GitHub Pages

1. 將此專案上傳至 GitHub 儲存庫
2. 開啟 Settings → Pages → Source: GitHub Actions
3. 推送至 `main` 分支後自動部署
4. 網址為 `https://<帳號>.github.io/<儲存庫名稱>/`

## 本機測試

```bash
npx serve . -l 3000
# 或
python -m http.server 3000
```

開啟 `http://localhost:3000` 即可測試。

## 使用方式

1. 開啟大螢幕頁面，輸入 **Gemini API Key**（左側面板）
2. 手機掃描 QR Code 進入畫板
3. 畫完後按「送出畫作給 AI 猜」
4. 大螢幕顯示 AI 猜測結果與評分

## 取得 Gemini API Key

前往 https://aistudio.google.com/apikey 免費申請。

## 取得 Ably API Key

1. 前往 https://ably.com/signup 免費註冊
2. 建立 App 後，在 **API Keys** 頁籤複製 API Key
3. 將 Key 貼到 `js/main-screen.js` 與 `js/mobile.js` 中的 `ABLY_KEY` 常數

免費方案每月 75 萬則訊息，足夠活動使用。
