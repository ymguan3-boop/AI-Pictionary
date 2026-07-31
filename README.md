# AI 猜猜看 (Pictionary) 互動繪畫遊戲

大螢幕展示 + 手機畫板，透過 PeerJS P2P 即時連線，Google Gemini AI 自動猜測畫作內容。

## 功能

- **大螢幕 (index.html)**：顯示 QR Code 供手機連線，接收畫作後調用 Gemini AI 猜題
- **手機畫板 (mobile.html)**：Canvas 繪圖，支援顏色、筆刷粗細、橡皮擦、復原、清除
- **AI 主持人**：Gemini 1.5 Flash 多模態視覺模型，幽默點評並打分

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
