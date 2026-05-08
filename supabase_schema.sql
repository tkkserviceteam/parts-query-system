-- ============================================================
-- 料號查詢系統 - Supabase 資料庫 Schema
-- 請在 Supabase Dashboard > SQL Editor 貼上並執行
-- ============================================================

-- 1. 主項目
CREATE TABLE projects (
  id          SERIAL PRIMARY KEY,
  key         TEXT UNIQUE NOT NULL,       -- 英文代碼，例如 'smt'
  name        TEXT NOT NULL,              -- 顯示名稱，例如 'SMT'
  color_index INTEGER DEFAULT 0,          -- 顏色索引 0~4
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 子項目
CREATE TABLE sub_projects (
  id          SERIAL PRIMARY KEY,
  project_key TEXT NOT NULL REFERENCES projects(key) ON DELETE CASCADE,
  name        TEXT NOT NULL,              -- 例如 'GKG'
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_key, name)
);

-- 3. 機型（每個子項目各自獨立）
CREATE TABLE machines (
  id          SERIAL PRIMARY KEY,
  project_key TEXT NOT NULL,
  sub_name    TEXT NOT NULL,
  name        TEXT NOT NULL,              -- 機型名稱，例如 'G5'
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_key, sub_name, name)
);

-- 4. 欄位定義（系統共用，所有子項目同一套欄位）
CREATE TABLE field_defs (
  id          SERIAL PRIMARY KEY,
  field_key   TEXT UNIQUE NOT NULL,       -- 欄位 key，例如 'vendor'
  label       TEXT NOT NULL,              -- 顯示名稱，例如 '廠商'
  field_type  TEXT DEFAULT 'text',        -- 'text' | 'select' | 'textarea'
  sort_order  INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 零件類型
CREATE TABLE part_types (
  id          SERIAL PRIMARY KEY,
  name        TEXT UNIQUE NOT NULL,       -- 例如 '控制板'
  color_index INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 料號主表（所有子項目共用，用 project_key + sub_name 區分）
CREATE TABLE parts (
  id          SERIAL PRIMARY KEY,
  project_key TEXT NOT NULL,
  sub_name    TEXT NOT NULL,
  pn          TEXT NOT NULL,              -- 料號（唯一識別）
  name        TEXT NOT NULL,              -- 品名
  vendor      TEXT,                       -- 廠商
  machine     TEXT,                       -- 機型
  model       TEXT,                       -- 型號
  type_id     INTEGER REFERENCES part_types(id) ON DELETE SET NULL,
  status      TEXT DEFAULT 'active' CHECK (status IN ('active','obs','eol')),
  description TEXT,                       -- 描述
  extra_data  JSONB DEFAULT '{}',         -- 自定義欄位值（動態欄位存這裡）
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_key, sub_name, pn)
);

-- 自動更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER parts_updated_at
  BEFORE UPDATE ON parts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 索引（加快查詢速度）
-- ============================================================
CREATE INDEX idx_parts_project_sub ON parts(project_key, sub_name);
CREATE INDEX idx_parts_pn ON parts(pn);
CREATE INDEX idx_parts_status ON parts(status);
CREATE INDEX idx_machines_sub ON machines(project_key, sub_name);

-- ============================================================
-- Row Level Security（讓前端可以直接讀寫，不需後端）
-- ============================================================
ALTER TABLE projects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_projects  ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines      ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_defs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_types    ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts         ENABLE ROW LEVEL SECURITY;

-- 允許所有人讀取（查詢用）
CREATE POLICY "allow read"  ON projects     FOR SELECT USING (true);
CREATE POLICY "allow read"  ON sub_projects FOR SELECT USING (true);
CREATE POLICY "allow read"  ON machines     FOR SELECT USING (true);
CREATE POLICY "allow read"  ON field_defs   FOR SELECT USING (true);
CREATE POLICY "allow read"  ON part_types   FOR SELECT USING (true);
CREATE POLICY "allow read"  ON parts        FOR SELECT USING (true);

-- 允許所有人寫入（後續可改成登入後才能寫）
CREATE POLICY "allow write" ON projects     FOR ALL USING (true);
CREATE POLICY "allow write" ON sub_projects FOR ALL USING (true);
CREATE POLICY "allow write" ON machines     FOR ALL USING (true);
CREATE POLICY "allow write" ON field_defs   FOR ALL USING (true);
CREATE POLICY "allow write" ON part_types   FOR ALL USING (true);
CREATE POLICY "allow write" ON parts        FOR ALL USING (true);

-- ============================================================
-- 初始資料
-- ============================================================

-- 主項目
INSERT INTO projects (key, name, color_index, sort_order) VALUES
  ('smt',  'SMT',           0, 1),
  ('solar','Solar',         1, 2),
  ('semi', 'Semiconductor', 2, 3);

-- 子項目
INSERT INTO sub_projects (project_key, name, sort_order) VALUES
  ('smt',  'GKG',     1), ('smt',  'JT',      2),
  ('smt',  'Sintek',  3), ('smt',  'SAKI',    4),
  ('smt',  'Yxlon',   5), ('smt',  'Unicomp', 6),
  ('solar','Maxwell', 1),
  ('semi', 'Hirata',  1), ('semi', 'Semtek',  2);

-- 機型
INSERT INTO machines (project_key, sub_name, name, sort_order) VALUES
  ('smt','GKG','G5',1),('smt','GKG','G9',2),
  ('smt','JT','JT-A300',1),('smt','JT','JT-B500',2),
  ('smt','Sintek','STK-BGA1',1),
  ('smt','SAKI','BF-Cσ',1),('smt','SAKI','BF-3Di',2),
  ('smt','Yxlon','Y.Cougar',1),('smt','Yxlon','Y.Cheetah',2),
  ('smt','Unicomp','UNI-XR1',1),
  ('solar','Maxwell','MAX-PEC1',1),('solar','Maxwell','MAX-PEC2',2),
  ('semi','Hirata','HR-W200',1),('semi','Hirata','HR-W300',2),
  ('semi','Semtek','STK-ION1',1);

-- 欄位定義
INSERT INTO field_defs (field_key, label, field_type, sort_order, is_required) VALUES
  ('pn',      '料號',     'text',     1, true),
  ('name',    '品名',     'text',     2, true),
  ('vendor',  '廠商',     'text',     3, false),
  ('machine', '機型',     'select',   4, false),
  ('model',   '型號',     'text',     5, false),
  ('type_id', '零件類型', 'select',   6, false),
  ('status',  '狀態',     'select',   7, false),
  ('description','描述',  'textarea', 8, false);

-- 零件類型
INSERT INTO part_types (name, color_index) VALUES
  ('控制板',   0), ('感測器',   1), ('光學模組', 2),
  ('耗材',     3), ('機構件',   5), ('電源模組', 4);

-- 範例料號
INSERT INTO parts (project_key, sub_name, pn, name, vendor, machine, model, type_id, status, description) VALUES
  ('smt','GKG','SMT-GKG-0011','錫膏印刷機主控板','GKG','G5','PCB-CTRL',1,'active','G5系列主控板'),
  ('smt','GKG','SMT-GKG-0022','刮刀壓力感測器','GKG','G5','BLADE-S2',2,'active','0~50N閉迴路'),
  ('smt','JT','SMT-JT-0101','貼片機飛達模組','JT','JT-A300','FEEDER-8',5,'active','8mm電子式飛達'),
  ('solar','Maxwell','SOL-MAX-0011','RF電源模組','Maxwell','MAX-PEC1','RF-300W',6,'active','300W射頻電源'),
  ('semi','Hirata','SEM-HRT-0011','晶圓傳送機器人','Hirata','HR-W200','W200-7',5,'active','7軸大氣型機器人'),
  ('semi','Semtek','SEM-STK-0101','離子風機控制板','Semtek','STK-ION1','IB-CTRL',1,'active','靜電消除控制板');
