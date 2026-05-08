# 料號查詢系統 - 部署完整指南

本指南分為三個階段：
1. **準備階段** - 建立 Supabase 資料庫
2. **本地測試** - 在電腦上運行
3. **部署上線** - 發佈到 Vercel

---

## 第一階段：準備 Supabase 資料庫

### 1.1 註冊 Supabase 帳號
1. 前往 https://supabase.com
2. 按「Sign In」或「Sign Up」
3. 用 GitHub / Google / Email 登入
4. 確認信箱

### 1.2 建立新專案
1. 登入後進入 Dashboard
2. 點「+ New Project」
3. 填寫：
   - **Project name**: `parts-query-system`（或任何名稱）
   - **Database Password**: 設定強密碼（**務必記住！**）
   - **Region**: 選擇 `Asia Pacific (Singapore)` 或最近的區域
4. 點「Create new project」，等待 1~2 分鐘完成

### 1.3 在 Supabase 建立資料表
1. 進入專案 Dashboard
2. 左側選「SQL Editor」
3. 點「New Query」
4. **複製** `supabase_schema.sql` 檔案的全部內容
5. 貼入查詢編輯器
6. 點右上「▶ Run」執行
7. 等待完成（應該看到綠色 ✓ 標記）

### 1.4 取得 API 密鑰
1. 左側選「Settings」→「API」
2. 在「Project URL」下方複製整個 URL
   - 格式：`https://your-project-id.supabase.co`
   - 存到記事本
3. 在「Project API Keys」下方的「anon public」欄
   - 複製「Key」（一長串字串）
   - 存到記事本

---

## 第二階段：本地測試

### 2.1 安裝 Node.js
1. 前往 https://nodejs.org
2. 下載 **LTS 版本**（目前 20.x）
3. 安裝，選預設選項
4. 打開「命令提示字元」或「終端」，輸入：
   ```bash
   node -v
   npm -v
   ```
   應該看到版本號（如 v20.10.0）

### 2.2 下載專案檔案
1. 從本次提供的檔案中，取得整個 `parts-system` 資料夾
2. 放到你電腦任何位置（例如 `C:\Users\你的用戶名\Documents\parts-system`）
3. 記住這個路徑

### 2.3 設定環境變數
1. 進入 `parts-system` 資料夾
2. 找到 `.env.local.example` 檔案
3. 複製並重新命名為 `.env.local`
4. 用記事本或 VS Code 開啟，填入：
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://你的project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon-key
   ```
   **將上面的 URL 和 KEY 替換為你在 1.4 步驟複製的值**

### 2.4 安裝依賴
1. 打開「命令提示字元」或「終端」
2. 進入 `parts-system` 資料夾：
   ```bash
   cd 你的路徑/parts-system
   ```
3. 執行：
   ```bash
   npm install
   ```
   等待 2~5 分鐘，會看到許多進度訊息

### 2.5 在本地運行
1. 同一個終端，執行：
   ```bash
   npm run dev
   ```
2. 看到：
   ```
   > Ready on http://localhost:3000
   ```
3. 打開瀏覽器，進入 http://localhost:3000
4. ✅ 你應該看到料號查詢系統首頁！

### 2.6 測試功能
- **前台**：點「後台管理」 ← → 應該能切換
- **後台**：新增一個主項目、子項目、欄位等
- **檢查資料**：進入 Supabase Dashboard > SQL Editor，執行：
  ```sql
  SELECT * FROM projects;
  ```
  應該能看到你新增的資料

---

## 第三階段：部署到 Vercel

### 3.1 準備 GitHub 儲存庫
1. 前往 https://github.com（需要帳號，沒有的話先註冊）
2. 點「New repository」
3. 填寫：
   - **Repository name**: `parts-query-system`
   - **Public**（公開）或 **Private**（私人）隨意
4. 點「Create repository」

### 3.2 上傳程式碼到 GitHub
1. 在電腦上下載 Git：https://git-scm.com/download
2. 安裝（選預設選項）
3. 在 `parts-system` 資料夾內，按右鍵 → 「Git Bash Here」
4. 執行以下命令（**將 username/parts-query-system 替換為你的**）：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/你的用戶名/parts-query-system.git
   git push -u origin main
   ```
   **輸入 GitHub 帳號和密碼（或 Personal Token）**

5. 到 GitHub 重新整理，應該看到檔案已上傳 ✓

### 3.3 連接 Vercel 部署
1. 前往 https://vercel.com
2. 用 GitHub 帳號登入（或先註冊）
3. 點「Add New」→「Project」
4. 搜尋「parts-query-system」倉庫
5. 點「Import」
6. 在「Environment Variables」部分，填入：
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://你的url.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = 你的key
   ```
7. 點「Deploy」，等待 3~5 分鐘
8. 看到「Congratulations!」表示成功 ✅
9. 點「Visit」打開線上網址

### 3.4 日常使用
- **線上網址**會像這樣：`https://parts-query-system-abc123.vercel.app`
- 每次更新程式碼只需：
  ```bash
  git add .
  git commit -m "更新說明"
  git push
  ```
  Vercel 會自動重新部署

---

## 常見問題

### Q：我看不到範例資料
**A**：Supabase 已經在 schema.sql 中植入初始資料。若沒看到：
1. 進入 Supabase Dashboard
2. 確認 SQL 執行完成（應該看到綠色 ✓）
3. 在 SQL Editor 執行 `SELECT * FROM parts;` 確認

### Q：「NEXT_PUBLIC_SUPABASE_URL not found」
**A**：確認 `.env.local` 檔案在正確位置（`parts-system` 資料夾根目錄），且填入正確的 URL 和 KEY

### Q：部署到 Vercel 後網站是白屏
**A**：
1. 打開瀏覽器的「開發者工具」（F12）→「Console」
2. 檢查是否有紅色錯誤
3. 通常是環境變數沒設定，重新進 Vercel Settings > Environment Variables 檢查

### Q：如何修改已上線的內容？
**A**：
1. 在本地修改檔案
2. 執行 `git push`
3. Vercel 會自動重新部署（約 1~2 分鐘）

### Q：能否備份資料庫？
**A**：可以！進入 Supabase Dashboard：
- 左側「Settings」→「Database」
- 下拉找「Backups」
- Vercel 免費版會自動備份 7 天

---

## 後續維護

### 新增欄位
1. 進入**後台管理** → **資料欄位**
2. 填寫欄位名稱和 Key
3. 點「新增欄位」
4. 系統自動同步資料庫

### 新增機型
1. 進入**後台管理** → **機型管理**
2. 選擇主項目和子項目
3. 填寫機型名稱
4. 點「新增機型」

### 匯入大量料號
1. 進入**後台管理** → **資料管理**
2. 準備 Excel 檔案（格式參考「下載匯入範本」）
3. 點「批次匯入 Excel」
4. 選擇檔案
5. 完成 ✓

---

## 技術支援聯絡

若有問題，可參考：
- **Supabase 文件**：https://supabase.com/docs
- **Next.js 文件**：https://nextjs.org/docs
- **Vercel 部署指南**：https://vercel.com/docs

---

**部署成功！🎉 你現在有一個完整的線上料號查詢系統了！**
