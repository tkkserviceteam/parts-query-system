'use client';

import React, { useState, useEffect } from 'react';
import { supabase, Project, SubProject, Machine, FieldDef, Part, PartType } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import styles from '@/styles/AdminPage.module.css';

const COLORS = [
  { bg: '#EAF3DE', text: '#3B6D11', dot: '#639922' },
  { bg: '#E6F1FB', text: '#185FA5', dot: '#378ADD' },
  { bg: '#EEEDFE', text: '#534AB7', dot: '#7F77DD' },
  { bg: '#FAEEDA', text: '#854F0B', dot: '#EF9F27' },
  { bg: '#FCEBEB', text: '#A32D2D', dot: '#E24B4A' },
];

export default function AdminPage({ onSwitchToFront }: { onSwitchToFront: () => void }) {
  const [activeTab, setActiveTab] = useState(0);

  const [projects, setProjects] = useState<Project[]>([]);
  const [subProjects, setSubProjects] = useState<SubProject[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [partTypes, setPartTypes] = useState<PartType[]>([]);
  const [parts, setParts] = useState<Part[]>([]);

  const [daMain, setDaMain] = useState('smt');
  const [daSub, setDaSub] = useState('');
  const [daSearch, setDaSearch] = useState('');

  const [pickedColor, setPickedColor] = useState(0);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (daMain) {
      const first = subProjects.find((s) => s.project_key === daMain)?.name;
      setDaSub(first || '');
    }
  }, [daMain]);

  useEffect(() => {
    if (daMain && daSub) {
      loadPartsForSub();
    }
  }, [daMain, daSub]);

  const loadAllData = async () => {
    try {
      const [projRes, subRes, mcRes, fRes, tRes] = await Promise.all([
        supabase.from('projects').select('*').order('sort_order'),
        supabase.from('sub_projects').select('*').order('sort_order'),
        supabase.from('machines').select('*').order('sort_order'),
        supabase.from('field_defs').select('*').order('sort_order'),
        supabase.from('part_types').select('*'),
      ]);

      if (projRes.data) setProjects(projRes.data);
      if (subRes.data) setSubProjects(subRes.data);
      if (mcRes.data) setMachines(mcRes.data);
      if (fRes.data) setFields(fRes.data);
      if (tRes.data) setPartTypes(tRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadPartsForSub = async () => {
    try {
      const res = await supabase
        .from('parts')
        .select('*')
        .eq('project_key', daMain)
        .eq('sub_name', daSub);
      if (res.data) setParts(res.data);
    } catch (error) {
      console.error('Error loading parts:', error);
    }
  };

  // ── Tab 0: 主項目/子項目 ──
  const renderProjectsTab = () => (
    <div>
      <div className={styles.sbox}>
        <div className={styles.sboxTitle}>主項目管理</div>
        <div className={styles.list}>
          {projects.map((p) => (
            <div key={p.id} className={styles.row}>
              <span className={styles.rowMain}>{p.name}</span>
              <span className={styles.rowInfo}>{subProjects.filter((s) => s.project_key === p.key).length} 子項目</span>
              <button className={styles.bi} onClick={() => toggleSubList(p.key)}>
                ＋
              </button>
              <button
                className={`${styles.bi} ${styles.biDel}`}
                onClick={() => deleteProject(p.key)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className={styles.abox}>
          <div className={styles.fr}>
            <label className={styles.fl2}>主項目名稱</label>
            <input
              id="nm-name"
              placeholder="例如：Lithography"
              className={styles.input}
            />
          </div>
          <div className={styles.fr}>
            <label className={styles.fl2}>英文代碼（小寫）</label>
            <input
              id="nm-key"
              placeholder="例如：litho"
              className={styles.input}
            />
          </div>
          <button className={styles.btnP} onClick={addProject}>
            新增主項目
          </button>
        </div>
      </div>
    </div>
  );

  // ── Tab 1: 機型管理 ──
  const renderMachinesTab = () => (
    <div>
      <div className={styles.sbox}>
        <div className={styles.sboxTitle}>機型管理</div>
        <div className={styles.sboxDesc}>
          依主項目 → 子項目，管理各自的機型清單（可新增、修改、刪除）
        </div>

        <div className={styles.grid2}>
          <div className={styles.fr}>
            <label className={styles.fl2}>選擇主項目</label>
            <select
              value={daMain}
              onChange={(e) => setDaMain(e.target.value)}
              className={styles.select}
            >
              {projects.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.fr}>
            <label className={styles.fl2}>選擇子項目</label>
            <select
              value={daSub}
              onChange={(e) => setDaSub(e.target.value)}
              className={styles.select}
            >
              {subProjects
                .filter((s) => s.project_key === daMain)
                .map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div id="machine-panel">
          {daMain && daSub && (
            <MachinePanel
              projectKey={daMain}
              subName={daSub}
              machines={machines.filter((m) => m.project_key === daMain && m.sub_name === daSub)}
              onRefresh={loadAllData}
            />
          )}
        </div>
      </div>
    </div>
  );

  // ── Tab 2: 欄位管理 ──
  const renderFieldsTab = () => (
    <div>
      <div className={styles.sbox}>
        <div className={styles.sboxTitle}>資料欄位管理</div>
        <div className={styles.sboxDesc}>
          新增或刪除料號資料欄位。料號和品名為必要欄位，不可刪除。
        </div>

        <div className={styles.list}>
          {fields.map((f) => (
            <div key={f.id} className={styles.row}>
              <span className={styles.fkey}>{f.field_key}</span>
              <span className={styles.rowMain}>{f.label}</span>
              {!['pn', 'name'].includes(f.field_key) && (
                <button className={`${styles.bi} ${styles.biDel}`} onClick={() => deleteField(f.field_key)}>
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className={styles.abox}>
          <div className={styles.fr}>
            <label className={styles.fl2}>欄位名稱</label>
            <input id="nf-label" placeholder="例如：規格" className={styles.input} />
          </div>
          <div className={styles.fr}>
            <label className={styles.fl2}>欄位 Key（英文小寫）</label>
            <input id="nf-key" placeholder="例如：spec" className={styles.input} />
          </div>
          <button className={styles.btnP} onClick={addField}>
            新增欄位
          </button>
        </div>
      </div>
    </div>
  );

  // ── Tab 3: 零件類型 ──
  const renderTypesTab = () => (
    <div>
      <div className={styles.sbox}>
        <div className={styles.sboxTitle}>零件類型管理</div>

        <div className={styles.list}>
          {partTypes.map((t) => (
            <div key={t.id} className={styles.row}>
              <span
                className={styles.cdot}
                style={{ backgroundColor: COLORS[t.color_index]?.dot || '#ccc' }}
              ></span>
              <span className={styles.rowMain}>{t.name}</span>
              <button className={`${styles.bi} ${styles.biDel}`} onClick={() => deleteType(t.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className={styles.abox}>
          <div className={styles.fr}>
            <label className={styles.fl2}>類型名稱</label>
            <input id="nt-name" placeholder="例如：驅動器" className={styles.input} />
          </div>
          <div className={styles.fr}>
            <label className={styles.fl2}>標籤顏色</label>
            <div className={styles.colorGrid}>
              {COLORS.map((c, i) => (
                <div
                  key={i}
                  className={`${styles.cs} ${i === pickedColor ? styles.picked : ''}`}
                  style={{
                    backgroundColor: c.bg,
                    borderColor: i === pickedColor ? c.text : 'transparent',
                  }}
                  onClick={() => setPickedColor(i)}
                ></div>
              ))}
            </div>
          </div>
          <button className={styles.btnP} onClick={addType}>
            新增零件類型
          </button>
        </div>
      </div>
    </div>
  );

  // ── Tab 4: 資料管理 ──
  const renderDataTab = () => (
    <div>
      <div className={styles.sbox}>
        <div className={styles.sboxTitle}>新增料號 / 批次匯入</div>

        <div className={styles.grid2}>
          <div className={styles.fr}>
            <label className={styles.fl2}>主項目</label>
            <select value={daMain} onChange={(e) => setDaMain(e.target.value)} className={styles.select}>
              {projects.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.fr}>
            <label className={styles.fl2}>子項目</label>
            <select value={daSub} onChange={(e) => setDaSub(e.target.value)} className={styles.select}>
              {subProjects
                .filter((s) => s.project_key === daMain)
                .map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className={styles.xlToolbar}>
          <label className={`${styles.xlBtn} ${styles.xlImport}`} style={{ cursor: 'pointer' }}>
            ⬆ 批次匯入 Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={importExcel}
            />
          </label>
          <button className={`${styles.xlBtn} ${styles.xlExport}`} onClick={exportExcel}>
            ⬇ 匯出目前資料
          </button>
          <button className={`${styles.xlBtn} ${styles.xlTpl}`} onClick={downloadTemplate}>
            📋 下載匯入範本
          </button>
        </div>

        <div className={styles.importHint}>
          💡 匯入格式：Excel 第一列為欄位標題，之後每列為一筆料號。可先下載「匯入範本」確認格式。
        </div>

        <DataFormPanel
          projectKey={daMain}
          subName={daSub}
          machines={machines.filter((m) => m.project_key === daMain && m.sub_name === daSub)}
          fields={fields}
          partTypes={partTypes}
          onAdd={loadPartsForSub}
        />

        <button className={styles.btnP} onClick={() => alert('功能開發中')}>
          ＋ 新增一筆料號
        </button>
      </div>

      <div className={styles.sbox}>
        <div className={styles.sboxTitle}>料號資料列表</div>
        <div className={styles.fr} style={{ marginBottom: '12px' }}>
          <input
            value={daSearch}
            onChange={(e) => setDaSearch(e.target.value)}
            placeholder="搜尋料號、品名…"
            className={styles.input}
          />
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>料號</th>
                <th>品名</th>
                <th>機型</th>
                <th>型號</th>
                <th>狀態</th>
                <th style={{ width: '80px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {parts
                .filter(
                  (p) =>
                    !daSearch ||
                    [p.pn, p.name].some((v) => (v || '').toLowerCase().includes(daSearch.toLowerCase()))
                )
                .map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700 }}>
                      {p.pn}
                    </td>
                    <td>{p.name}</td>
                    <td style={{ fontSize: '12px' }}>{p.machine || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{p.model || '—'}</td>
                    <td>
                      <span className={p.status === 'active' ? styles.badgeOk : styles.badgeObs}>
                        {p.status === 'active' ? '有效' : '停產'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`${styles.bi} ${styles.biEdit}`}
                        onClick={() => alert('編輯功能開發中')}
                      >
                        ✎
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const toggleSubList = (key: string) => {
    const el = document.getElementById(`sub-${key}`);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  };

  const addProject = async () => {
    const nameEl = document.getElementById('nm-name') as HTMLInputElement;
    const keyEl = document.getElementById('nm-key') as HTMLInputElement;
    const name = nameEl?.value.trim();
    const key = keyEl?.value.trim().toLowerCase();

    if (!name || !key) {
      alert('請填寫完整');
      return;
    }

    try {
      await supabase.from('projects').insert([{ key, name, color_index: projects.length % 5 }]);
      loadAllData();
      if (nameEl) nameEl.value = '';
      if (keyEl) keyEl.value = '';
      alert('新增成功');
    } catch (error) {
      console.error('Error:', error);
      alert('新增失敗');
    }
  };

  const deleteProject = async (key: string) => {
    if (!confirm('確定刪除此主項目？')) return;
    try {
      await supabase.from('projects').delete().eq('key', key);
      loadAllData();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const addField = async () => {
    const labelEl = document.getElementById('nf-label') as HTMLInputElement;
    const keyEl = document.getElementById('nf-key') as HTMLInputElement;
    const label = labelEl?.value.trim();
    const key = keyEl?.value.trim().toLowerCase();

    if (!label || !key) {
      alert('請填寫完整');
      return;
    }

    try {
      await supabase.from('field_defs').insert([{ label, field_key: key }]);
      loadAllData();
      if (labelEl) labelEl.value = '';
      if (keyEl) keyEl.value = '';
    } catch (error) {
      console.error('Error:', error);
      alert('新增失敗');
    }
  };

  const deleteField = async (key: string) => {
    if (!confirm('確定刪除此欄位？')) return;
    try {
      await supabase.from('field_defs').delete().eq('field_key', key);
      loadAllData();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const addType = async () => {
    const nameEl = document.getElementById('nt-name') as HTMLInputElement;
    const name = nameEl?.value.trim();

    if (!name) return;

    try {
      await supabase.from('part_types').insert([{ name, color_index: pickedColor }]);
      loadAllData();
      if (nameEl) nameEl.value = '';
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const deleteType = async (id: number) => {
    if (!confirm('確定刪除？')) return;
    try {
      await supabase.from('part_types').delete().eq('id', id);
      loadAllData();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const importExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const wb = XLSX.read(event.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (rows.length < 2) {
          alert('Excel 內容為空');
          return;
        }

        const headers = rows[0];
        let added = 0;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const obj: any = { project_key: daMain, sub_name: daSub };

          headers.forEach((h, idx) => {
            const val = row[idx] || '';
            if (h === 'pn') obj.pn = val;
            else if (h === 'name') obj.name = val;
            else if (h === '零件類型') {
              const t = partTypes.find((x) => x.name === val);
              obj.type_id = t?.id || null;
            } else {
              obj[h] = val;
            }
          });

          if (!obj.pn) continue;

          try {
            await supabase.from('parts').insert([obj]);
            added++;
          } catch (err) {
            console.warn('Skip row:', err);
          }
        }

        alert(`匯入完成：${added} 筆`);
        loadPartsForSub();
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Error:', error);
      alert('匯入失敗');
    }
  };

  const exportExcel = () => {
    if (!parts.length) {
      alert('無資料可匯出');
      return;
    }

    const data = parts.map((p) => ({
      料號: p.pn,
      品名: p.name,
      廠商: p.vendor || '',
      機型: p.machine || '',
      型號: p.model || '',
      零件類型: partTypes.find((t) => t.id === p.type_id)?.name || '',
      狀態: p.status,
      描述: p.description || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, daSub);
    XLSX.writeFile(wb, `料號資料_${daMain}_${daSub}.xlsx`);
  };

  const downloadTemplate = () => {
    const headers = ['料號', '品名', '廠商', '機型', '型號', '零件類型', '狀態', '描述'];
    const sample = ['SMT-XXX-0001', '品名範例', '廠商', 'G5', 'MODEL-1', '控制板', 'active', '描述'];

    const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '料號資料');
    XLSX.writeFile(wb, '料號匯入範本.xlsx');
  };

  return (
    <div className={styles.adminPage}>
      <div className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <div className={styles.logo}>⚙</div>
          <div>
            <div className={styles.title}>後台管理</div>
            <div className={styles.subtitle}>項目 · 機型 · 欄位 · 類型 · 資料</div>
          </div>
        </div>
        <button className={styles.backLink} onClick={onSwitchToFront}>
          ← 返回前台
        </button>
      </div>

      <div className={styles.adminTabs}>
        {['主項目/子項目', '機型管理', '資料欄位', '零件類型', '資料管理'].map((label, i) => (
          <button
            key={i}
            className={`${styles.adminTab} ${activeTab === i ? styles.active : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 0 && renderProjectsTab()}
      {activeTab === 1 && renderMachinesTab()}
      {activeTab === 2 && renderFieldsTab()}
      {activeTab === 3 && renderTypesTab()}
      {activeTab === 4 && renderDataTab()}
    </div>
  );
}

// MachinePanel Component
function MachinePanel({
  projectKey,
  subName,
  machines,
  onRefresh,
}: {
  projectKey: string;
  subName: string;
  machines: Machine[];
  onRefresh: () => void;
}) {
  const handleAdd = async () => {
    const val = (document.getElementById(`mc-val-${projectKey}-${subName}`) as HTMLInputElement)?.value.trim();
    if (!val) return;

    try {
      await supabase
        .from('machines')
        .insert([{ project_key: projectKey, sub_name: subName, name: val }]);
      onRefresh();
      (document.getElementById(`mc-val-${projectKey}-${subName}`) as HTMLInputElement).value = '';
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('確定刪除？')) return;
    try {
      await supabase.from('machines').delete().eq('id', id);
      onRefresh();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '10px', fontWeight: 500 }}>
        {projectKey.toUpperCase()} / {subName} — 目前機型（{machines.length} 筆）
      </div>

      <div className={styles.subList}>
        {machines.length ? (
          machines.map((m) => (
            <span key={m.id} className={styles.machineChip}>
              <span style={{ fontSize: '12px' }}>{m.name}</span>
              <button
                className={styles.mcDel}
                onClick={() => handleDelete(m.id)}
              >
                ✕
              </button>
            </span>
          ))
        ) : (
          <span style={{ fontSize: '12px', color: 'var(--text3)' }}>尚無機型，請從下方新增</span>
        )}
      </div>

      <div className={styles.abox} style={{ marginTop: '8px' }}>
        <div className={styles.fr}>
          <label className={styles.fl2}>新增機型名稱</label>
          <input id={`mc-val-${projectKey}-${subName}`} placeholder="例如：G5-Pro" className={styles.input} />
        </div>
        <button className={styles.btnP} onClick={handleAdd}>
          新增機型
        </button>
      </div>
    </div>
  );
}

// DataFormPanel Component
function DataFormPanel({
  projectKey,
  subName,
  machines,
  fields,
  partTypes,
  onAdd,
}: {
  projectKey: string;
  subName: string;
  machines: Machine[];
  fields: FieldDef[];
  partTypes: PartType[];
  onAdd: () => void;
}) {
  const handleSubmit = async () => {
    const obj: any = { project_key: projectKey, sub_name: subName };

    fields.forEach((f) => {
      const el = document.getElementById(`df-${f.field_key}`) as HTMLInputElement;
      if (el) {
        if (f.field_key === 'type_id') {
          obj[f.field_key] = parseInt(el.value) || null;
        } else {
          obj[f.field_key] = el.value;
        }
      }
    });

    if (!obj.pn) {
      alert('料號為必填');
      return;
    }

    try {
      await supabase.from('parts').insert([obj]);
      onAdd();
      fields.forEach((f) => {
        const el = document.getElementById(`df-${f.field_key}`) as HTMLInputElement;
        if (el && el.tagName !== 'SELECT') el.value = '';
      });
      alert('新增成功');
    } catch (error) {
      console.error('Error:', error);
      alert('新增失敗');
    }
  };

  return (
    <div>
      {fields.map((f) => (
        <div key={f.id} className={styles.fr}>
          <label className={styles.fl2}>{f.label}</label>
          {f.field_key === 'machine' ? (
            <select id={`df-${f.field_key}`} className={styles.select}>
              {machines.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          ) : f.field_key === 'type_id' ? (
            <select id={`df-${f.field_key}`} className={styles.select}>
              {partTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          ) : f.field_key === 'status' ? (
            <select id={`df-${f.field_key}`} className={styles.select}>
              <option value="active">有效</option>
              <option value="obs">停產預告</option>
              <option value="eol">已停產</option>
            </select>
          ) : (
            <input id={`df-${f.field_key}`} className={styles.input} />
          )}
        </div>
      ))}
    </div>
  );
}
