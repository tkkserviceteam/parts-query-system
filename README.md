# 料號查詢系統

一個完整的 Web 應用系統，用於管理 SMT、Solar、Semiconductor 等多個產品線的料號資料。

## 功能特性

### 前台查詢
- 📊 **多主項目支援**：SMT、Solar、Semiconductor 各自獨立資料庫
- 🔍 **即時搜尋**：支援料號、品名、廠商、機型等多欄位搜尋
- 📋 **詳細檢視**：查看料號完整資訊與相關文件
- 📱 **響應式設計**：桌面、平板、手機都能使用

### 後台管理
- ⚙️ **主項目/子項目管理**：可自由新增、刪除主項目和子項目
- 🔧 **機型管理**：針對每個子項目獨立管理機型清單
- 📝 **欄位管理**：動態新增、刪除料號資料欄位
- 🏷️ **零件類型管理**：自訂零件分類標籤
- 📤 **匯入/匯出**：支援 Excel 批次匯入匯出
- 🗄️ **資料管理**：新增、編輯、刪除料號資訊

## 技術棧

- **前端框架**：Next.js 14 + React 18
- **資料庫**：Supabase (PostgreSQL)
- **部署平台**：Vercel
- **檔案處理**：XLSX (Excel)
- **樣式管理**：CSS Modules

## 快速開始

### 本地開發

```bash
# 1. 安裝依賴
npm install

# 2. 設定環境變數 (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# 3. 運行開發伺服器
npm run dev

# 4. 打開 http://localhost:3000
```

### 部署到 Vercel

詳見 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## 資料庫架構

```
projects（主項目）
├── sub_projects（子項目）
├── machines（機型）
├── field_defs（欄位定義）
├── part_types（零件類型）
└── parts（料號資料）
```

## 目錄結構

```
parts-system/
├── pages/                  # 頁面檔案
│   ├── _app.tsx
│   ├── _document.tsx
│   └── index.tsx
├── src/
│   ├── components/        # React 組件
│   │   ├── FrontPage.tsx  # 前台查詢頁
│   │   └── AdminPage.tsx  # 後台管理頁
│   ├── lib/
│   │   └── supabase.ts    # Supabase 客戶端
│   └── styles/            # 樣式檔案
├── supabase_schema.sql    # 資料庫初始化腳本
├── package.json
├── tsconfig.json
├── DEPLOYMENT_GUIDE.md    # 完整部署指南
└── README.md
```

## 使用指南

### 前台功能

1. **切換主項目**：點頂部 Tab（SMT/Solar/Semiconductor）
2. **選擇子項目**：點下方 Tab
3. **搜尋料號**：在搜尋框輸入，即時顯示建議
4. **查看詳情**：點表格列表中的料號

### 後台功能

1. **進入後台**：點「⚙ 後台管理」
2. **各 Tab 功能**：
   - **主項目/子項目**：管理產品線結構
   - **機型管理**：管理各子項目的機型清單
   - **資料欄位**：自訂料號資料欄位
   - **零件類型**：管理零件分類
   - **資料管理**：新增、編輯料號；匯入/匯出 Excel

## 常見操作

### 新增料號

1. 後台 → 資料管理
2. 選擇主項目和子項目
3. 填寫表單
4. 點「＋ 新增一筆料號」

### 批次匯入

1. 後台 → 資料管理
2. 點「下載匯入範本」取得 Excel 範本
3. 編輯 Excel（每列一筆料號）
4. 點「⬆ 批次匯入 Excel」
5. 選擇檔案完成

### 匯出資料

1. 後台 → 資料管理
2. 點「⬇ 匯出目前資料」
3. 自動下載 Excel 檔案

## 環境變數

| 變數 | 說明 | 範例 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 專案 URL | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 公開 API KEY | `eyJ0eXAi...` |

## 效能最佳化

- 前端使用 React 18 Server Components
- 資料庫已建立關鍵欄位索引
- 使用 Supabase RLS 實現安全存取
- Vercel 自動 CDN 加速靜態資源

## 擴展建議

### 添加登入認證
編輯 `supabase_schema.sql` 中的 RLS 策略，使用 Supabase Auth

### 添加評論/附件
可在 `parts` 表中添加 `comments` 和 `attachments` 欄位

### 多語言支援
使用 `next-i18n-router` 或 `i18next`

## 許可證

MIT

## 支援

如有問題，請：
1. 檢查 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) 常見問題區段
2. 查看 Supabase 文件：https://supabase.com/docs
3. 查看 Next.js 文件：https://nextjs.org/docs

---

**祝你使用愉快！🚀**
