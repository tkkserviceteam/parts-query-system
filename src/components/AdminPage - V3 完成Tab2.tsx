'use client';

import React, { useState, useEffect } from 'react';
import { supabase, Project, SubProject, Machine, FieldDef, Part, PartType } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import styles from '@/styles/AdminPage.module.css';

// --- 統一 UI 樣式配置 ---
const UI_STYLE = {
  btnBase: { border: 'none', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  btnCancel: { background: '#f5f5f5', color: '#666', border: '1px solid #ddd' },
  btnPrimary: { background: '#4a90e2', color: '#fff' },
  btnSuccess: { background: '#67c23a', color: '#fff' },
  overlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  modal: { background: '#fff', padding: '30px', borderRadius: '16px', width: '480px', boxShadow: '0 12px 40px rgba(0,0,0,0.2)', position: 'relative' }
};

const COLORS = [
  { bg: '#EAF3DE', text: '#3B6D11', dot: '#639922' },
  { bg: '#E6F1FB', text: '#185FA5', dot: '#378ADD' },
  { bg: '#EEEDFE', text: '#534AB7', dot: '#7F77DD' },
  { bg: '#FAEEDA', text: '#854F0B', dot: '#EF9F27' },
  { bg: '#FCEBEB', text: '#A32D2D', dot: '#E24B4A' },
];

export default function AdminPage({ onSwitchToFront }: { onSwitchToFront: () => void }) {
  const [activeTab, setActiveTab] = useState(0);

  // --- 資料狀態 ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [subProjects, setSubProjects] = useState<SubProject[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [partTypes, setPartTypes] = useState<PartType[]>([]);
  const [parts, setParts] = useState<Part[]>([]);

  // --- UI 切換與篩選狀態 ---
  const [daMain, setDaMain] = useState('smt');
  const [daSub, setDaSub] = useState('');
  const [daSearch, setDaSearch] = useState('');
  const [pickedColor, setPickedColor] = useState(0);

  // --- 彈窗與批次選取狀態 ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<any | null>(null);
  const [selectedPartIds, setSelectedPartIds] = useState<number[]>([]);
  const [selectedMachineIds, setSelectedMachineIds] = useState<number[]>([]);
  useEffect(() => { loadAllData(); }, []);

  useEffect(() => {
    if (daMain) {
      const first = subProjects.find((s) => s.project_key === daMain)?.name;
      setDaSub(first || '');
    }
  }, [daMain, subProjects]);

  useEffect(() => {
    if (daMain && daSub) { loadPartsForSub(); }
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
    } catch (error) { console.error('Error loading data:', error); }
  };

  const loadPartsForSub = async () => {
    try {
      const res = await supabase.from('parts').select('*').eq('project_key', daMain).eq('sub_name', daSub);
      if (res.data) {
        setParts(res.data);
		setSelectedPartIds([]); // 改名
        setSelectedMachineIds([]); // 新增，機型選取也要清空
      }
    } catch (error) { console.error(error); }
  };

  // --- 基礎增刪 ---
  const addProject = async () => {
    const nameEl = document.getElementById('nm-name') as HTMLInputElement;
    const keyEl = document.getElementById('nm-key') as HTMLInputElement;
    if (!nameEl?.value || !keyEl?.value) return;
    await supabase.from('projects').insert([{ key: keyEl.value.toLowerCase(), name: nameEl.value, color_index: projects.length % 5 }]);
    loadAllData();
    nameEl.value = ''; keyEl.value = '';
  };

  const deleteProject = async (key: string) => {
    if (confirm('確定刪除項目？')) { await supabase.from('projects').delete().eq('key', key); loadAllData(); }
  };

  const addField = async () => {
    const labelEl = document.getElementById('nf-label') as HTMLInputElement;
    const keyEl = document.getElementById('nf-key') as HTMLInputElement;
    if (!labelEl?.value || !keyEl?.value) return;
    await supabase.from('field_defs').insert([{ label: labelEl.value, field_key: keyEl.value.toLowerCase() }]);
    loadAllData();
    labelEl.value = ''; keyEl.value = '';
  };

  const addType = async () => {
    const nameEl = document.getElementById('nt-name') as HTMLInputElement;
    if (!nameEl?.value) return;
    await supabase.from('part_types').insert([{ name: nameEl.value, color_index: pickedColor }]);
    loadAllData();
    nameEl.value = '';
  };

  // --- 智能匯入 ---
  const importExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = file.name.split('.')[0]; 
    const nameParts = fileName.split('_');
    if (nameParts[0] !== '料號資料' || nameParts.length < 3) {
      alert('❌ 檔名格式錯誤！請使用：料號資料_項目Key_子項目名.xlsx');
      e.target.value = '';
      return;
    }
    const targetMain = nameParts[1].toLowerCase();
    const targetSub = nameParts[2];
    const projExists = projects.find(p => p.key === targetMain);
    const subExists = subProjects.find(s => s.project_key === targetMain && s.name === targetSub);
    if (!projExists || !subExists) {
      alert(`⚠️ 找不到對應項目：主項目「${targetMain}」或子項目「${targetSub}」不存在。`);
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const wb = XLSX.read(event.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        const columnMap: any = { '料號': 'pn', '品名': 'name', '廠商': 'vendor', '機型': 'machine', '型號': 'model', '狀態': 'status', '描述': 'description', '備註': 'remark' };
        const rawData = rows.map((row: any) => {
          let cleaned: any = { project_key: targetMain, sub_name: targetSub };
          Object.keys(row).forEach(k => {
            const trimmedKey = k.trim();
            const dbKey = columnMap[trimmedKey] || trimmedKey;
            const isValidField = fields.some(f => f.field_key === dbKey) || ['pn','name','project_key','sub_name','type_id','status'].includes(dbKey);
            if (isValidField) {
                if (trimmedKey === '零件類型') {
                  cleaned.type_id = partTypes.find(x => x.name === row[k].toString().trim())?.id || null;
                } else { cleaned[dbKey] = row[k]?.toString().trim(); }
            }
          });
          if (cleaned.status === '有效' || cleaned.status === 'active') cleaned.status = 'active';
          return cleaned;
        }).filter(r => r.pn);
        const uniqueMap = new Map();
        rawData.forEach(item => uniqueMap.set(item.pn, item));
        const { error } = await supabase.from('parts').upsert(Array.from(uniqueMap.values()), { onConflict: 'pn, project_key, sub_name' });
        if (error) throw error;
        alert(`✅ 匯入成功！歸檔至：${targetMain} / ${targetSub}`);
        setDaMain(targetMain);
        setDaSub(targetSub);
        loadPartsForSub();
      } catch (err: any) { alert('匯入失敗：' + err.message); }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const exportExcel = () => {
    if (parts.length === 0) { alert('目前沒有資料可匯出'); return; }
    const exportData = parts.map(p => {
        const row: any = {};
        fields.forEach(f => {
            let val = (p as any)[f.field_key];
            if (f.field_key === 'status') val = val === 'active' ? '有效' : '停產';
            if (f.field_key === 'type_id') val = partTypes.find(t => t.id === p.type_id)?.name || '';
            row[f.label] = val || '';
        });
        return row;
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PartsData');
    XLSX.writeFile(wb, `料號資料_${daMain}_${daSub}.xlsx`);
  };

  const handleSavePart = async (formData: any, isEdit: boolean) => {
    if (!formData.pn) { alert('料號為必填'); return; }
    try {
      const payload: any = {};
      fields.forEach(f => { if(formData[f.field_key] !== undefined) payload[f.field_key] = formData[f.field_key]; });
      payload.pn = formData.pn; payload.type_id = formData.type_id; payload.status = formData.status;
      if (isEdit) { await supabase.from('parts').update(payload).eq('id', formData.id); }
      else { await supabase.from('parts').insert([{ ...payload, project_key: daMain, sub_name: daSub }]); }
      setIsAddModalOpen(false); setEditingPart(null); loadPartsForSub();
    } catch (e: any) { alert('儲存失敗'); }
  };

// --- Tab 0 專用狀態與邏輯 ---
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [projectModal, setProjectModal] = useState<{ open: boolean; type: 'project' | 'sub'; mode: 'add' | 'edit'; data?: any; projectKey?: string }>({ 
    open: false, type: 'project', mode: 'add' 
  });

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const renderProjectsTab = () => (
    <div className={styles.sbox}>
      <div className={styles.sboxTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <span>項目與子項目架構管理</span>
        {/* 統一格式的新增按鈕 */}
        <button 
          style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnPrimary }} 
          onClick={() => setProjectModal({ open: true, type: 'project', mode: 'add' })}
        >
          <span>＋</span> 新增主項目
        </button>
      </div>

      <div className={styles.list}>
        {projects.map(p => {
          const isExpanded = expandedKeys.includes(p.key);
          const children = subProjects.filter(s => s.project_key === p.key);

          return (
            <div key={p.id} style={{ border: '1px solid #eee', borderRadius: '8px', marginBottom: '10px', overflow: 'hidden' }}>
              {/* 主項目列 - 使用 Flex Space-Between 實現按鈕置右 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8f9fa' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={() => toggleExpand(p.key)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: '#666', padding: '4px' }}>
                    {isExpanded ? '▼' : '▶'}
                  </button>
                  <span className={styles.cdot} style={{ backgroundColor: COLORS[p.color_index]?.dot }}></span>
                  <span style={{ fontWeight: '600', color: '#333' }}>{p.name} <small style={{ color: '#999', fontWeight: '400' }}>({p.key})</small></span>
                </div>
                
                {/* 操作按鈕群組 - 置右 */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnSuccess, padding: '6px 12px', fontSize: '12px' }} 
                    onClick={() => setProjectModal({ open: true, type: 'sub', mode: 'add', projectKey: p.key })}
                  >
                    ＋ 子項目
                  </button>
                  <button 
                    style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnCancel, padding: '6px 12px', fontSize: '12px' }} 
                    onClick={() => setProjectModal({ open: true, type: 'project', mode: 'edit', data: p })}
                  >
                    ✎ 編輯
                  </button>
                  <button 
                    style={{ ...UI_STYLE.btnBase, background: '#fff5f5', color: '#e03131', border: '1px solid #ffc9c9', padding: '6px 12px', fontSize: '12px' }} 
                    onClick={() => deleteProject(p.key)}
                  >
                    ✕ 刪除
                  </button>
                </div>
              </div>

              {/* 子項目展開區塊 */}
              {isExpanded && (
                <div style={{ background: '#fff', borderTop: '1px solid #eee' }}>
                  {children.length > 0 ? children.map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px 10px 48px', borderBottom: '1px solid #f5f5f5' }}>
                      <span style={{ fontSize: '16px', color: '#555' }}>◼　{s.name}</span>
                      
                      {/* 子項目操作按鈕 - 置右 */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnCancel, padding: '4px 10px', fontSize: '12px' }} 
                          onClick={() => setProjectModal({ open: true, type: 'sub', mode: 'edit', data: s })}
                        >
                          ✎ 編輯
                        </button>
                        <button 
                    style={{ ...UI_STYLE.btnBase, background: '#fff5f5', color: '#e03131', border: '1px solid #ffc9c9', padding: '6px 12px', fontSize: '12px' }} 
                          onClick={async () => {
                            if(confirm(`確定刪除子項目「${s.name}」？`)) {
                              await supabase.from('sub_projects').delete().eq('id', s.id);
                              loadAllData();
                            }
                          }}
                        >
                          ✕ 刪除
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div style={{ padding: '15px 48px', color: '#bbb', fontSize: '13px', fontStyle: 'italic' }}>尚無子項目資料</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 統一彈窗樣式 */}
      {projectModal.open && (
        <div style={UI_STYLE.overlay as any}>
          <div style={UI_STYLE.modal}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#1a1a1a' }}>
                {projectModal.mode === 'add' ? '✨ 新增' : '📝 編輯'}
                {projectModal.type === 'project' ? '主項目' : '子項目'}
              </h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#666', display: 'block', marginBottom: '6px' }}>名稱</label>
                <input id="modal-name" className={styles.input} defaultValue={projectModal.data?.name || ''} placeholder="請輸入顯示名稱..." />
              </div>
              
              {projectModal.type === 'project' && projectModal.mode === 'add' && (
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#666', display: 'block', marginBottom: '6px' }}>唯一識別 Key</label>
                  <input id="modal-key" className={styles.input} placeholder="例如: smt (建立後不可修改)" />
                </div>
              )}
            </div>

            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnCancel }} 
                onClick={() => setProjectModal({ ...projectModal, open: false })}
              >
                取消
              </button>
              <button 
                style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnPrimary }} 
                onClick={async () => {
                  const name = (document.getElementById('modal-name') as HTMLInputElement).value.trim();
                  if (!name) { alert('名稱不能為空'); return; }

                  if (projectModal.type === 'project') {
                    if (projectModal.mode === 'add') {
                      const key = (document.getElementById('modal-key') as HTMLInputElement).value.trim().toLowerCase();
                      if(!key) { alert('Key 不能為空'); return; }
                      await supabase.from('projects').insert([{ key, name, color_index: projects.length % 5 }]);
                    } else {
                      await supabase.from('projects').update({ name }).eq('id', projectModal.data.id);
                    }
                  } else {
                    if (projectModal.mode === 'add') {
                      await supabase.from('sub_projects').insert([{ name, project_key: projectModal.projectKey }]);
                    } else {
                      await supabase.from('sub_projects').update({ name }).eq('id', projectModal.data.id);
                    }
                  }
                  setProjectModal({ ...projectModal, open: false });
                  loadAllData();
                }}
              >
                確認儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
// --- Tab 1 專用狀態 ---
  const [machineModal, setMachineModal] = useState<{ open: boolean; mode: 'add' | 'edit'; data?: Machine | null; projectKey: string; subName: string; name: string }>({open: false, mode: 'add', projectKey: '', subName: '', name: ''});
// --- 處理機型批次刪除 ---
  const handleBatchDeleteMachines = async () => {
    if (!selectedMachineIds.length) return;
    if (confirm(`⚠️ 警告！將會永久刪除選中的 ${selectedMachineIds.length} 個機型資料，此操作無法復原。\n確定要執行嗎？`)) {
      try {
        const { error } = await supabase.from('machines').delete().in('id', selectedMachineIds);
        if (error) throw error;
        alert('✅ 機型已批次刪除');
        loadAllData();
      } catch (err: any) { alert('❌ 刪除失敗：' + err.message); }
    }
  };

  // --- Tab 1 渲染：機型管理 ---
  const renderMachinesTab = () => {
    // 篩選出目前的機型
    const currentMachines = machines.filter(m => m.project_key === daMain && m.sub_name === daSub);

    return (
      <div className={styles.sbox}>
        <div className={styles.sboxTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span>機型管理配置</span>
          <div style={{ display: 'flex', gap: '10px' }}>
            {/* 批次刪除按鈕 (僅在選取時顯示) */}
            {selectedMachineIds.length > 0 && (
              <button 
                style={{ ...UI_STYLE.btnBase, background: '#fff5f5', color: '#e03131', border: '1px solid #ffc9c9' }} 
                onClick={handleBatchDeleteMachines}
              >
                🗑 批次刪除 ({selectedMachineIds.length})
              </button>
            )}
            <button 
              style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnPrimary }} 
              onClick={() => setMachineModal({ open: true, mode: 'add', projectKey: daMain, subName: daSub, name: '' })}
            >
              <span>＋</span> 新增機型
            </button>
          </div>
        </div>

        {/* 篩選與全選工具列 */}
        <div style={{ display: 'flex', gap: '12px', background: '#f8f9fa', padding: '12px 18px', borderRadius: '8px', marginBottom: '15px', alignItems: 'center' }}>
          {/* 全選 Checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '15px' }}>
            <input 
              type="checkbox" 
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              checked={currentMachines.length > 0 && selectedMachineIds.length === currentMachines.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedMachineIds(currentMachines.map(m => m.id));
                } else {
                  setSelectedMachineIds([]);
                }
              }}
            />
            <span style={{ fontSize: '13px', color: '#666', fontWeight: 500 }}>全選機型</span>
          </div>
          
          <select value={daMain} onChange={(e) => setDaMain(e.target.value)} className={styles.select} style={{ flex: 1 }}>
            {projects.map(p => <option key={p.key} value={p.key}>{p.name} ({p.key})</option>)}
          </select>
          <select value={daSub} onChange={(e) => setDaSub(e.target.value)} className={styles.select} style={{ flex: 1 }}>
            {subProjects.filter(s => s.project_key === daMain).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>

{/* 圖示方塊視圖 (Card View) */}
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
  {currentMachines.length > 0 ? currentMachines.map(m => {
    // 判斷目前卡片是否被選取
    const isSelected = selectedMachineIds.includes(m.id);
    
    return (
      <div 
        key={m.id} 
        style={{ 
          // --- 調整重點：根據選取狀態切換邊框與樣式 ---
          // 選取時：2px 藍線 + 藍色陰影
          // 取消選取（原色）：1px 黑線 + 無陰影
          borderRadius: '12px', 
          background: '#fff', 
          padding: isSelected ? '15px' : '16px', // 補償邊框變粗導致的內距變化
          position: 'relative', 
          transition: 'all 0.15s ease-in-out', // 縮短時間讓反饋更即時
          boxShadow: isSelected ? '0 0 12px rgba(74, 144, 226, 0.3)' : 'none',
          zIndex: isSelected ? 1 : 0, // 讓選取的卡片浮在上面
        }}
      >
        {/* 卡片頂部：複選與名稱 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
          <input 
            type="checkbox" 
            style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '3px' }}
            checked={isSelected}
            onChange={() => setSelectedMachineIds(prev => 
              prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
            )}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '800', fontSize: '16px', color: '#1a1a1a' }}>{m.name}</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>隸屬：{daSub}</div>
          </div>
        </div>

        {/* 卡片底部：操作按鈕 */}
        <div style={{ borderTop: '1px solid #eee', paddingTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button 
            style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnCancel, padding: '4px 10px', fontSize: '12px', border: '1px solid #ccc' }} 
            onClick={() => setMachineModal({ 
              open: true, mode: 'edit', data: m, projectKey: daMain, subName: daSub, name: m.name 
            })}
          >
            📝 編輯
          </button>
          <button 
            style={{ ...UI_STYLE.btnBase, background: '#fff5f5', color: '#e03131', border: '1px solid #ffc9c9', padding: '4px 10px', fontSize: '12px' }} 
            onClick={async () => {
              if (confirm(`確定刪除機型「${m.name}」？`)) {
                await supabase.from('machines').delete().eq('id', m.id);
                loadAllData();
              }
            }}
          >
            ✕ 刪除
          </button>
        </div>
      </div>
	  );
}) : (
            <div style={{ gridColumn: '1 / -1', padding: '50px', textAlign: 'center', color: '#bbb', background: '#fafafa', borderRadius: '10px', fontSize: '14px' }}>
              ❌ 此子項目下目前無機型資料，請點擊上方按鈕新增。
            </div>
          )}
        </div>

        {/* 彈跳視窗 - 處理新增與編輯 (優化為您要求的統一彈窗格式) */}
        {machineModal.open && (
          <div style={UI_STYLE.overlay as any}>
            <div style={UI_STYLE.modal}>
              <h3 style={{ marginTop: 0, marginBottom: '20px' }}>
                {machineModal.mode === 'add' ? '＋ 新增機型資料' : `📝 編輯機型: ${machineModal.data?.name}`}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#666', display: 'block', marginBottom: '6px' }}>歸屬主項目</label>
                  <select 
                    className={styles.select} 
                    value={machineModal.projectKey}
                    onChange={(e) => {
                      const firstSub = subProjects.find(s => s.project_key === e.target.value)?.name || '';
                      setMachineModal({ ...machineModal, projectKey: e.target.value, subName: firstSub });
                    }}
                  >
                    {projects.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#666', display: 'block', marginBottom: '6px' }}>歸屬子項目</label>
                  <select className={styles.select} value={machineModal.subName} onChange={(e) => setMachineModal({ ...machineModal, subName: e.target.value })}>
                    {subProjects.filter(s => s.project_key === machineModal.projectKey).map(s => ( <option key={s.id} value={s.name}>{s.name}</option> ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#666', display: 'block', marginBottom: '6px' }}>機型名稱</label>
                  <input className={styles.input} value={machineModal.name} onChange={(e) => setMachineModal({ ...machineModal, name: e.target.value })} placeholder="例如: NXT-III" />
                </div>
              </div>

              <div style={{ marginTop: '30px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnCancel }} onClick={() => setMachineModal({ ...machineModal, open: false })}>取消返回</button>
                <button 
                  style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnPrimary }} 
                  onClick={async () => {
                    if (!machineModal.name.trim()) { alert('請輸入名稱'); return; }
                    const payload = { project_key: machineModal.projectKey, sub_name: machineModal.subName, name: machineModal.name.trim() };
                    
                    const { error } = machineModal.mode === 'edit'
                      ? await supabase.from('machines').update(payload).eq('id', machineModal.data?.id)
                      : await supabase.from('machines').insert([payload]);

                    if (error) alert('儲存失敗：' + error.message);
                    else { setMachineModal({ ...machineModal, open: false }); loadAllData(); }
                  }}
                >
                  確認儲存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFieldsTab = () => (
    <div className={styles.sbox}>
      <div className={styles.sboxTitle}>欄位管理</div>
      <div className={styles.list}>
        {fields.map(f => (
          <div key={f.id} className={styles.row}>
            <span className={styles.fkey}>{f.field_key}</span><span>{f.label}</span>
          </div>
        ))}
      </div>
      <div className={styles.abox}>
        <input id="nf-label" placeholder="名稱" className={styles.input} />
        <input id="nf-key" placeholder="Key" className={styles.input} />
        <button className={styles.btnP} onClick={addField}>新增</button>
      </div>
    </div>
  );

  const renderTypesTab = () => (
    <div className={styles.sbox}>
      <div className={styles.sboxTitle}>零件類型管理</div>
      <div className={styles.list}>
        {partTypes.map(t => (
          <div key={t.id} className={styles.row}>
            <span className={styles.cdot} style={{ backgroundColor: COLORS[t.color_index]?.dot }}></span>
            <span>{t.name}</span>
          </div>
        ))}
      </div>
      <div className={styles.abox}>
        <input id="nt-name" placeholder="類型名稱" className={styles.input} />
        <button className={styles.btnP} onClick={addType}>新增</button>
      </div>
    </div>
  );

  const renderDataTab = () => (
    <div>
      <div className={styles.sbox}>
        <div className={styles.sboxTitle}>批次工具與單筆操作</div>
        <div className={styles.grid2}>
          <select value={daMain} onChange={(e) => setDaMain(e.target.value)} className={styles.select}>
            {projects.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
          </select>
          <select value={daSub} onChange={(e) => setDaSub(e.target.value)} className={styles.select}>
            {subProjects.filter(s => s.project_key === daMain).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        <div className={styles.xlToolbar} style={{ marginTop: '15px' }}>
          <label className={styles.xlBtn} style={{ background: '#4CAF50' }}>⬆ 智能匯入 Excel<input type="file" hidden onChange={importExcel} /></label>
          <button className={styles.xlBtn} style={{ background: '#666', color: 'white' }} onClick={exportExcel}>⬇ 匯出資料</button>
          <button className={styles.xlBtn} style={{ backgroundColor: '#2a69ac', color: 'white' }} onClick={() => setIsAddModalOpen(true)}>＋ 單筆新增</button>
        </div>
      </div>
      <div className={styles.sbox}>
        <div className={styles.sboxTitle} style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>資料列表 ({parts.length})</span>
          {selectedIds.length > 0 && <button onClick={() => { if(confirm(`刪除 ${selectedIds.length} 筆？`)) { supabase.from('parts').delete().in('id', selectedIds).then(() => loadPartsForSub()); } }} style={{ color: 'red' }}>🗑 刪除 ({selectedIds.length})</button>}
        </div>
        <input value={daSearch} onChange={e => setDaSearch(e.target.value)} placeholder="搜尋..." className={styles.input} style={{ marginBottom: '10px' }} />
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
    <input 
      type="checkbox" 
      onChange={e => setSelectedPartIds(e.target.checked ? parts.map(p => p.id) : [])} 
      checked={selectedPartIds.length === parts.length && parts.length > 0} 
    />
  </th>
                <th>料號</th><th>品名</th><th>機型</th><th>狀態</th><th>編輯</th>
              </tr>
            </thead>
            <tbody>
              {parts.filter(p => !daSearch || (p.pn + p.name).toLowerCase().includes(daSearch.toLowerCase())).map(p => (
                <tr key={p.id}>
                  <td><input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => setSelectedPartIds(prev => prev.includes(p.id) ? prev.filter(i => i !== p.id) : [...prev, p.id])} /></td>
                  <td style={{ fontWeight: 'bold' }}>{p.pn}</td>
                  <td>{p.name}</td><td>{p.machine}</td>
                  <td><span className={p.status === 'active' ? styles.badgeOk : styles.badgeObs}>{p.status === 'active' ? '有效' : '停產'}</span></td>
                  <td><button className={styles.biEdit} onClick={() => setEditingPart(p)}>✎</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {isAddModalOpen && <PartModal title="新增料號" data={{ status: 'active' }} onClose={() => setIsAddModalOpen(false)} onSave={(fd: any) => handleSavePart(fd, false)} />}
      {editingPart && <PartModal title={`編輯: ${editingPart.pn}`} data={editingPart} onClose={() => setEditingPart(null)} onSave={(fd: any) => handleSavePart(fd, true)} />}
    </div>
  );

  const PartModal = ({ data, onClose, onSave, title }: any) => {
    const [form, setForm] = useState(data || {});
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
        <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '450px', maxHeight: '90vh', overflowY: 'auto' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>{title}</h3>
          {fields.map((f: any) => (
            <div key={f.id} className={styles.fr} style={{ marginBottom: '12px' }}>
              <label className={styles.fl2}>{f.label}</label>
              {f.field_key === 'machine' ? (
                <select className={styles.select} value={form[f.field_key] || ''} onChange={e => setForm({...form, [f.field_key]: e.target.value})}>
                  <option value="">未指定</option>
                  {machines.filter(m => m.project_key === daMain && m.sub_name === daSub).map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
              ) : f.field_key === 'type_id' ? (
                <select className={styles.select} value={form[f.field_key] || ''} onChange={e => setForm({...form, [f.field_key]: parseInt(e.target.value) || null})}>
                  <option value="">未指定</option>
                  {partTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              ) : f.field_key === 'status' ? (
                <select className={styles.select} value={form[f.field_key] || 'active'} onChange={e => setForm({...form, [f.field_key]: e.target.value})}>
                  <option value="active">有效</option><option value="obs">停產預告</option><option value="eol">已停產</option>
                </select>
              ) : ( <input className={styles.input} value={form[f.field_key] || ''} onChange={e => setForm({...form, [f.field_key]: e.target.value})} /> )}
            </div>
          ))}
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className={styles.btnP} style={{ backgroundColor: '#888' }} onClick={onClose}>取消</button>
            <button className={styles.btnP} onClick={() => onSave(form)}>儲存</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.adminPage}>
      <div className={styles.topbar} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 25px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>📦</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px', color: '#1a1a1a', lineHeight: 1.2 }}>零件料號查詢系統</span>
                <span style={{ fontSize: '13px', color: '#666', fontWeight: 500 }}>後台管理模式</span>
            </div>
        </div>
        <button className={styles.backLink} onClick={onSwitchToFront} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>← 返回前台</button>
      </div>

      <div className={styles.adminTabs}>
        {['項目/子項目', '機型管理', '欄位管理', '零件類型', '資料維護'].map((l, i) => (
          <button key={i} className={`${styles.adminTab} ${activeTab === i ? styles.active : ''}`} onClick={() => setActiveTab(i)}>{l}</button>
        ))}
      </div>
      <div style={{ padding: '20px' }}>
        {activeTab === 0 && renderProjectsTab()}
        {activeTab === 1 && renderMachinesTab()}
        {activeTab === 2 && renderFieldsTab()}
        {activeTab === 3 && renderTypesTab()}
        {activeTab === 4 && renderDataTab()}
      </div>
    </div>
  );
}

function MachinePanel({ projectKey, subName, machines, onRefresh }: any) {
  const handleAdd = async () => {
    const val = (document.getElementById(`mc-val`) as HTMLInputElement)?.value.trim();
    if (!val) return;
    await supabase.from('machines').insert([{ project_key: projectKey, sub_name: subName, name: val }]);
    onRefresh(); (document.getElementById(`mc-val`) as HTMLInputElement).value = '';
  };
  return (
    <div style={{ marginTop: '10px' }}>
      <div className={styles.subList}>{machines.map((m: any) => <span key={m.id} className={styles.machineChip}>{m.name}</span>)}</div>
      <div className={styles.abox} style={{ marginTop: '8px' }}>
        <input id="mc-val" placeholder="新增機型名稱" className={styles.input} />
        <button className={styles.btnP} onClick={handleAdd}>新增機型</button>
      </div>
    </div>
  );
}