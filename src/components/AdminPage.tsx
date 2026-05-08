'use client';

import React, { useState, useEffect, CSSProperties } from 'react';
import { supabase, Project, SubProject, Machine, FieldDef, Part, PartType } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import styles from '@/styles/AdminPage.module.css';

// --- 統一 UI 樣式配置 ---
const UI_STYLE: Record<string, CSSProperties> = {
  btnBase: {
    border: 'none',
    padding: '8px 14px',
	whiteSpace: 'nowrap',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },

  btnCancel: {
    background: '#f5f5f5',
    color: '#666',
    border: '1px solid #ddd',
  },

  btnPrimary: {
    background: '#4a90e2',
    color: '#fff',
  },

  btnSuccess: {
    background: '#67c23a',
    color: '#fff',
  },

  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },

modal: {
	  background: '#fff',
	  padding: '24px',
	  borderRadius: '16px',
	  width: '90vw',
	  maxWidth: '480px',
	  maxHeight: '90vh',
	  overflowY: 'auto',
	  boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
      position: 'relative',
  },
};

const COLORS = [
  { bg: '#EAF3DE', text: '#3B6D11', dot: '#639922' }, // 綠
  { bg: '#E6F1FB', text: '#185FA5', dot: '#378ADD' }, // 藍
  { bg: '#EEEDFE', text: '#534AB7', dot: '#7F77DD' }, // 紫
  { bg: '#FAEEDA', text: '#854F0B', dot: '#EF9F27' }, // 橘
  { bg: '#FCEBEB', text: '#A32D2D', dot: '#E24B4A' }, // 紅
  { bg: '#E0F7FA', text: '#006064', dot: '#00ACC1' }, // 青
  { bg: '#F3E5F5', text: '#4A148C', dot: '#9C27B0' }, // 桃紅
  { bg: '#FFFDE7', text: '#F57F17', dot: '#FBC02D' }, // 黃
  { bg: '#EFEBE9', text: '#3E2723', dot: '#8D6E63' }, // 棕
  { bg: '#ECEFF1', text: '#263238', dot: '#607D8B' }, // 灰藍
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
        setSelectedPartIds([]);
        setSelectedMachineIds([]);
      }
    } catch (error) { console.error(error); }
  };

  // --- 基礎增刪與業務邏輯 ---
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

  // --- 修改後的匯入 Excel (增加筆數顯示) ---
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
        const finalData = Array.from(uniqueMap.values());
        const { error } = await supabase.from('parts').upsert(finalData, { onConflict: 'pn, project_key, sub_name' });
        if (error) throw error;
        
        // 修改：匯入成功通知加入筆數
        alert(`✅ 匯入成功！共處理 ${finalData.length} 筆資料。\n歸檔至：${targetMain} / ${targetSub}`);
        
        setDaMain(targetMain);
        setDaSub(targetSub);
        loadPartsForSub();
      } catch (err: any) { alert('匯入失敗：' + err.message); }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // --- 修改後的匯出 Excel (增加筆數顯示) ---
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
    
    // 修改：匯出成功通知顯示實際筆數
    alert(`✅ 匯出成功！已下載資料：共 ${exportData.length} 筆。`);
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

  // --- Tab 0: 項目管理 ---
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
        <button style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnPrimary }} onClick={() => setProjectModal({ open: true, type: 'project', mode: 'add' })}>
          <span>＋</span> 新增主項目
        </button>
      </div>
      <div className={styles.list}>
        {projects.map(p => {
          const isExpanded = expandedKeys.includes(p.key);
          const children = subProjects.filter(s => s.project_key === p.key);
          return (
            <div key={p.id} style={{ border: '1px solid #eee', borderRadius: '8px', marginBottom: '10px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8f9fa' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={() => toggleExpand(p.key)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: '#666' }}>
                    {isExpanded ? '▼' : '▶'}
                  </button>
                  <span className={styles.cdot} style={{ backgroundColor: COLORS[p.color_index]?.dot }}></span>
                  <span style={{ fontWeight: '600' }}>{p.name} <small style={{ color: '#999' }}>({p.key})</small></span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnSuccess, padding: '6px 12px', fontSize: '12px' }} onClick={() => setProjectModal({ open: true, type: 'sub', mode: 'add', projectKey: p.key })}>＋ 子項目</button>
                  <button style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnCancel, padding: '6px 12px', fontSize: '12px' }} onClick={() => setProjectModal({ open: true, type: 'project', mode: 'edit', data: p })}>✎ 編輯</button>
                  <button style={{ ...UI_STYLE.btnBase, background: '#fff5f5', color: '#e03131', border: '1px solid #ffc9c9', padding: '6px 12px', fontSize: '12px' }} onClick={() => deleteProject(p.key)}>✕ 刪除</button>
                </div>
              </div>
              {isExpanded && (
                <div style={{ background: '#fff', borderTop: '1px solid #eee' }}>
                  {children.map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px 10px 48px', borderBottom: '1px solid #f5f5f5' }}>
                      <span>◼　{s.name}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnCancel, padding: '4px 10px', fontSize: '12px' }} onClick={() => setProjectModal({ open: true, type: 'sub', mode: 'edit', data: s })}>✎ 編輯</button>
                        <button style={{ ...UI_STYLE.btnBase, background: '#fff5f5', color: '#e03131', border: '1px solid #ffc9c9', padding: '4px 10px', fontSize: '12px' }} onClick={async () => { if(confirm(`確定刪除？`)) { await supabase.from('sub_projects').delete().eq('id', s.id); loadAllData(); }}}>✕ 刪除</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {projectModal.open && (
		<div style={UI_STYLE.overlay}>
		  <div style={UI_STYLE.modal}>
            <h3 style={{ margin: '0 0 20px 0' }}>{projectModal.mode === 'add' ? '✨ 新增' : '📝 編輯'}{projectModal.type === 'project' ? '主項目' : '子項目'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input id="modal-name" className={styles.input} defaultValue={projectModal.data?.name || ''} placeholder="名稱" />
              {projectModal.type === 'project' && projectModal.mode === 'add' && <input id="modal-key" className={styles.input} placeholder="Key (如: smt)" />}
            </div>
            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnCancel }} onClick={() => setProjectModal({ ...projectModal, open: false })}>取消</button>
              <button style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnPrimary }} onClick={async () => {
                const name = (document.getElementById('modal-name') as HTMLInputElement).value.trim();
                if (projectModal.type === 'project') {
                  if (projectModal.mode === 'add') {
                    const key = (document.getElementById('modal-key') as HTMLInputElement).value.trim().toLowerCase();
                    await supabase.from('projects').insert([{ key, name, color_index: projects.length % 5 }]);
                  } else await supabase.from('projects').update({ name }).eq('id', projectModal.data.id);
                } else {
                  if (projectModal.mode === 'add') await supabase.from('sub_projects').insert([{ name, project_key: projectModal.projectKey }]);
                  else await supabase.from('sub_projects').update({ name }).eq('id', projectModal.data.id);
                }
                setProjectModal({ ...projectModal, open: false }); loadAllData();
              }}>確認儲存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // --- Tab 1: 機型管理 ---
  const [machineModal, setMachineModal] = useState<{ open: boolean; mode: 'add' | 'edit'; data?: Machine | null; projectKey: string; subName: string; name: string }>({open: false, mode: 'add', projectKey: '', subName: '', name: ''});
  
  const handleBatchDeleteMachines = async () => {
    if (!selectedMachineIds.length) return;
    if (confirm(`確定要批次刪除選中的 ${selectedMachineIds.length} 個機型嗎？`)) {
      await supabase.from('machines').delete().in('id', selectedMachineIds);
      loadAllData();
    }
  };

  const renderMachinesTab = () => {
    const currentMachines = machines.filter(m => m.project_key === daMain && m.sub_name === daSub);
    return (
      <div className={styles.sbox}>
        <div className={styles.sboxTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span>機型管理配置</span>
          <div style={{ display: 'flex', gap: '10px' }}>
            {selectedMachineIds.length > 0 && <button style={{ ...UI_STYLE.btnBase, background: '#fff5f5', color: '#e03131', border: '1px solid #ffc9c9' }} onClick={handleBatchDeleteMachines}>🗑 批次刪除 ({selectedMachineIds.length})</button>}
            <button style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnPrimary }} onClick={() => setMachineModal({ open: true, mode: 'add', projectKey: daMain, subName: daSub, name: '' })}>＋ 新增機型</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', background: '#f8f9fa', padding: '12px', borderRadius: '8px', marginBottom: '15px' }}>
            <input type="checkbox" checked={currentMachines.length > 0 && selectedMachineIds.length === currentMachines.length} onChange={e => setSelectedMachineIds(e.target.checked ? currentMachines.map(m => m.id) : [])} />
            <select value={daMain} onChange={e => setDaMain(e.target.value)} className={styles.select}>{projects.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}</select>
            <select value={daSub} onChange={e => setDaSub(e.target.value)} className={styles.select}>{subProjects.filter(s => s.project_key === daMain).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
          {currentMachines.map(m => {
            const isSelected = selectedMachineIds.includes(m.id);
            return (
              <div key={m.id} style={{ border: isSelected ? '2px solid #4a90e2' : '1px solid #1a1a1a', borderRadius: '12px', padding: '16px', position: 'relative' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="checkbox" checked={isSelected} onChange={() => setSelectedMachineIds(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])} />
                  <div style={{ fontWeight: '800' }}>{m.name}</div>
                </div>
                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button onClick={() => setMachineModal({ open: true, mode: 'edit', data: m, projectKey: daMain, subName: daSub, name: m.name })} style={{ ...UI_STYLE.btnBase, fontSize: '12px', border: '1px solid #ddd' }}>✎</button>
                  <button onClick={async () => { if(confirm('刪除？')) { await supabase.from('machines').delete().eq('id', m.id); loadAllData(); }}} style={{ ...UI_STYLE.btnBase, fontSize: '12px', color: 'red', border: '1px solid #ffc9c9' }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
        {machineModal.open && (
            <div style={UI_STYLE.overlay}>
                <div style={UI_STYLE.modal}>
                    <h3>{machineModal.mode === 'add' ? '新增機型' : '編輯機型'}</h3>
                    <input className={styles.input} value={machineModal.name} onChange={e => setMachineModal({...machineModal, name: e.target.value})} />
                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnCancel }} onClick={() => setMachineModal({...machineModal, open: false})}>取消</button>
                        <button style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnPrimary }} onClick={async () => {
                            const payload = { project_key: machineModal.projectKey, sub_name: machineModal.subName, name: machineModal.name };
                            if (machineModal.mode === 'edit') await supabase.from('machines').update(payload).eq('id', machineModal.data?.id);
                            else await supabase.from('machines').insert([payload]);
                            setMachineModal({...machineModal, open: false}); loadAllData();
                        }}>儲存</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  };

// --- 欄位管理彈窗狀態 ---
  const [fieldModal, setFieldModal] = useState<{ open: boolean; mode: 'add' | 'edit'; data?: FieldDef }>({ open: false, mode: 'add' });

  // --- Tab 2: 欄位管理渲染 ---
  const renderFieldsTab = () => (
    <div className={styles.sbox}>
      <div className={styles.sboxTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>欄位管理定義</span>
          <span style={{ background: '#eee', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', color: '#444' }}>共 {fields.length} 個欄位</span>
        </div>
        {/* 新增按鈕移至最右邊 */}
        <button style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnPrimary }} onClick={() => setFieldModal({ open: true, mode: 'add' })}>
          ＋ 新增欄位
        </button>
      </div>

      <div className={styles.list}>
        {fields.map(f => (
          <div key={f.id} className={styles.row} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <span className={styles.fkey} style={{ color: '#999', width: '100px', fontSize: '13px', fontFamily: 'monospace' }}>{f.field_key}</span>
              <span style={{ fontWeight: '600', fontSize: '15px' }}>{f.label}</span>
            </div>
            
            {/* 各欄位最右邊的修改及刪除按鈕 */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnCancel, padding: '5px 12px', fontSize: '13px' }} 
                onClick={() => setFieldModal({ open: true, mode: 'edit', data: f })}
              >
                ✎ 修改
              </button>
              <button 
                style={{ ...UI_STYLE.btnBase, background: '#fff5f5', color: '#e03131', border: '1px solid #ffc9c9', padding: '5px 12px', fontSize: '13px' }} 
                onClick={async () => { 
                  if(confirm(`確定要刪除欄位「${f.label}」嗎？這將導致該欄位的資料無法在介面顯示。`)) { 
                    await supabase.from('field_defs').delete().eq('id', f.id); 
                    loadAllData(); 
                  }
                }}
              >
                ✕ 刪除
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 欄位編輯/新增彈窗 */}
      {fieldModal.open && (
        <div style={UI_STYLE.overlay}>
          <div style={UI_STYLE.modal}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>
              {fieldModal.mode === 'add' ? '✨ 新增自定義欄位' : `📝 修改欄位: ${fieldModal.data?.label}`}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '5px' }}>顯示名稱 (Label)</label>
                <input 
                  id="fm-label" 
                  className={styles.input} 
                  defaultValue={fieldModal.data?.label || ''} 
                  placeholder="例如：廠商、規格" 
                />
              </div>
              {fieldModal.mode === 'add' && (
                <div>
                  <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '5px' }}>資料庫 Key (建立後不可更改)</label>
                  <input 
                    id="fm-key" 
                    className={styles.input} 
                    placeholder="例如：vendor, specification" 
                  />
                </div>
              )}
            </div>
            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnCancel }} onClick={() => setFieldModal({ ...fieldModal, open: false })}>取消</button>
              <button style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnPrimary }} onClick={async () => {
                const label = (document.getElementById('fm-label') as HTMLInputElement).value.trim();
                if (!label) return alert('請輸入名稱');
                
                if (fieldModal.mode === 'add') {
                  const key = (document.getElementById('fm-key') as HTMLInputElement).value.trim().toLowerCase();
                  if (!key) return alert('請輸入 Key');
                  await supabase.from('field_defs').insert([{ label, field_key: key, sort_order: fields.length }]);
                } else {
                  await supabase.from('field_defs').update({ label }).eq('id', fieldModal.data?.id);
                }
                setFieldModal({ ...fieldModal, open: false });
                loadAllData();
              }}>確認儲存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // --- Tab 3: 零件類型管理 ---
  const [selectedTypeIds, setSelectedTypeIds] = useState<number[]>([]);
  const [typeModal, setTypeModal] = useState<{ open: boolean; mode: 'add' | 'edit'; data?: PartType | null; name: string; colorIndex: number }>({
    open: false, mode: 'add', name: '', colorIndex: 0
  });

  const handleBatchDeleteTypes = async () => {
    if (!selectedTypeIds.length) return;
    if (confirm(`確定要批次刪除選中的 ${selectedTypeIds.length} 個類型嗎？`)) {
      await supabase.from('part_types').delete().in('id', selectedTypeIds);
      loadAllData();
      setSelectedTypeIds([]);
    }
  };

  const renderTypesTab = () => (
    <div className={styles.sbox}>
      <div className={styles.sboxTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <span>零件類型配置</span>
        <div style={{ display: 'flex', gap: '10px' }}>
          {selectedTypeIds.length > 0 && (
            <button style={{ ...UI_STYLE.btnBase, background: '#fff5f5', color: '#e03131', border: '1px solid #ffc9c9' }} onClick={handleBatchDeleteTypes}>
              🗑 批次刪除 ({selectedTypeIds.length})
            </button>
          )}
          <button style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnPrimary }} onClick={() => setTypeModal({ open: true, mode: 'add', name: '', colorIndex: partTypes.length % 10 })}>
            ＋ 新增類型
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '15px', padding: '0 5px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#666' }}>
          <input 
            type="checkbox" 
            checked={partTypes.length > 0 && selectedTypeIds.length === partTypes.length} 
            onChange={e => setSelectedTypeIds(e.target.checked ? partTypes.map(t => t.id) : [])} 
          />
          選取全部類型
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
        {partTypes.map(t => (
          <div key={t.id} style={{ 
            border: selectedTypeIds.includes(t.id) ? '2px solid #4a90e2' : '1px solid #eee', 
            borderRadius: '12px', 
            padding: '16px', 
            background: selectedTypeIds.includes(t.id) ? '#f0f7ff' : '#fff',
            borderLeft: `6px solid ${COLORS[t.color_index]?.dot || '#ddd'}`,
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input 
                type="checkbox" 
                checked={selectedTypeIds.includes(t.id)} 
                onChange={() => setSelectedTypeIds(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id])} 
              />
              <div style={{ fontWeight: '800', fontSize: '16px' }}>{t.name}</div>
            </div>
            <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setTypeModal({ open: true, mode: 'edit', data: t, name: t.name, colorIndex: t.color_index })} style={{ ...UI_STYLE.btnBase, padding: '5px 10px', fontSize: '12px', border: '1px solid #ddd', background: '#fff' }}>✎ 編輯</button>
              <button onClick={async () => { if(confirm('確定刪除此類型？')) { await supabase.from('part_types').delete().eq('id', t.id); loadAllData(); }}} style={{ ...UI_STYLE.btnBase, padding: '5px 10px', fontSize: '12px', color: '#e03131', border: '1px solid #ffc9c9', background: '#fff' }}>✕ 刪除</button>
            </div>
          </div>
        ))}
      </div>

      {typeModal.open && (
        <div style={UI_STYLE.overlay}>
          <div style={UI_STYLE.modal}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>{typeModal.mode === 'add' ? '✨ 新增零件類型' : '📝 編輯零件類型'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600' }}>類型名稱</label>
                <input className={styles.input} value={typeModal.name} onChange={e => setTypeModal({...typeModal, name: e.target.value})} placeholder="例如: 電阻, IC..." />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: '600' }}>代表顏色</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', padding: '12px', background: '#f9f9f9', borderRadius: '8px' }}>
                  {COLORS.map((c, i) => (
                    <div key={i} onClick={() => setTypeModal({...typeModal, colorIndex: i})}
                      style={{ 
                        width: '32px', height: '32px', borderRadius: '50%', backgroundColor: c.dot, cursor: 'pointer',
                        border: typeModal.colorIndex === i ? '3px solid #333' : '2px solid transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                      {typeModal.colorIndex === i && <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnCancel }} onClick={() => setTypeModal({...typeModal, open: false})}>取消</button>
              <button style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnPrimary }} onClick={async () => {
                if (!typeModal.name.trim()) return alert('請輸入名稱');
                const payload = { name: typeModal.name, color_index: typeModal.colorIndex };
                if (typeModal.mode === 'edit') await supabase.from('part_types').update(payload).eq('id', typeModal.data?.id);
                else await supabase.from('part_types').insert([payload]);
                setTypeModal({...typeModal, open: false}); loadAllData();
              }}>儲存類型</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // --- 子組件：零件編輯彈窗 ---
  const PartModal = ({ data, onClose, onSave, title }: any) => {
    const [form, setForm] = useState(data || {});
    return (
      <div style={UI_STYLE.overlay}>
        <div style={{ ...UI_STYLE.modal, width: '450px', maxHeight: '90vh', overflowY: 'auto' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>{title}</h3>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' }}>料號 (P/N)</label>
            <input className={styles.input} value={form.pn || ''} onChange={e => setForm({...form, pn: e.target.value})} placeholder="請輸入料號" />
          </div>
          {fields.map((f: any) => {
            if (f.field_key === 'pn') return null;
            return (
              <div key={f.id} style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' }}>{f.label}</label>
                {f.field_key === 'machine' ? (
                  <select className={styles.select} value={form[f.field_key] || ''} onChange={e => setForm({...form, [f.field_key]: e.target.value})}>
                    <option value="">-- 選擇機型 --</option>
                    {machines.filter(m => m.project_key === daMain && m.sub_name === daSub).map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </select>
                ) : f.field_key === 'type_id' ? (
                  <select className={styles.select} value={form[f.field_key] || ''} onChange={e => setForm({...form, [f.field_key]: parseInt(e.target.value) || null})}>
                    <option value="">-- 選擇零件類型 --</option>
                    {partTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                ) : f.field_key === 'status' ? (
                  <select className={styles.select} value={form[f.field_key] || 'active'} onChange={e => setForm({...form, [f.field_key]: e.target.value})}>
                    <option value="active">有效 (Active)</option>
                    <option value="obs">停產預告 (Obs)</option>
                    <option value="eol">已停產 (EOL)</option>
                  </select>
                ) : (
                  <input className={styles.input} value={form[f.field_key] || ''} onChange={e => setForm({...form, [f.field_key]: e.target.value})} />
                )}
              </div>
            );
          })}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '25px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
            <button style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnCancel }} onClick={onClose}>取消</button>
            <button style={{ ...UI_STYLE.btnBase, ...UI_STYLE.btnPrimary }} onClick={() => onSave(form)}>儲存資料</button>
          </div>
        </div>
      </div>
    );
  };

  // --- Tab 4: 渲染資料分頁 ---
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
          {/* 修改：匯出按鈕加入筆數顯示 */}
          <button className={styles.xlBtn} style={{ background: '#666', color: 'white' }} onClick={exportExcel}>⬇ 匯出資料 ({parts.length} 筆)</button>
          <button className={styles.xlBtn} style={{ backgroundColor: '#2a69ac', color: 'white' }} onClick={() => setIsAddModalOpen(true)}>＋ 單筆新增</button>
        </div>
      </div>

      <div className={styles.sbox}>
        <div className={styles.sboxTitle} style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>資料列表 ({parts.length})</span>
          {selectedPartIds.length > 0 && (
            <button onClick={() => { if(confirm(`確認批次刪除選中的 ${selectedPartIds.length} 筆資料？`)) supabase.from('parts').delete().in('id', selectedPartIds).then(() => loadPartsForSub()); }} 
              style={{ ...UI_STYLE.btnBase, background: 'none', color: '#e03131', border: '1px solid #ffc9c9', padding: '4px 12px' }}>
              🗑 刪除選中 ({selectedPartIds.length})
            </button>
          )}
        </div>
        <div className={`${styles.tableWrap} ${styles.mobileCardTable}`}>
          <table>
            <thead>
              <tr>
                <th><input type="checkbox" onChange={e => setSelectedPartIds(e.target.checked ? parts.map(p => p.id) : [])} checked={parts.length > 0 && selectedPartIds.length === parts.length} /></th>
                <th>料號</th><th>品名</th><th>機型</th><th>狀態</th><th>編輯</th>
              </tr>
            </thead>
            <tbody>
              {parts.map(p => (
                <tr key={p.id}>
                  <td><input type="checkbox" checked={selectedPartIds.includes(p.id)} onChange={() => setSelectedPartIds(prev => prev.includes(p.id) ? prev.filter(i => i !== p.id) : [...prev, p.id])} /></td>
                  <td style={{ fontWeight: 'bold' }}>{p.pn}</td>
                  <td>{p.name}</td><td>{p.machine}</td>
                  <td><span className={p.status === 'active' ? styles.badgeOk : styles.badgeObs}>{p.status === 'active' ? '有效' : '停產'}</span></td>
                  <td><button onClick={() => setEditingPart(p)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✎</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && <PartModal title="✨ 新增零件資料" data={{ status: 'active' }} onClose={() => setIsAddModalOpen(false)} onSave={(fd: any) => handleSavePart(fd, false)} />}
      {editingPart && <PartModal title={`📝 編輯料號: ${editingPart.pn}`} data={editingPart} onClose={() => setEditingPart(null)} onSave={(fd: any) => handleSavePart(fd, true)} />}
    </div>
  );

  return (
    <div className={styles.adminPage}>
      <div className={styles.topbar} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px' }}>
        <div className={styles.topbarLeft} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className={styles.logo}>📦</div>
          <div className={styles.title} style={{ fontWeight: 800 }}>零件料號系統 - 後台</div>
        </div>
        <button className={styles.adminBtn} onClick={onSwitchToFront}>⚙ 返回前頁</button>
      </div>
      
      <div className={styles.navArea}>
        {['項目', '機型', '欄位', '類型', '資料'].map((l, i) => (
          <button key={i} className={`${styles.adminTab} ${activeTab === i ? styles.active : ''}`} onClick={() => setActiveTab(i)}>{l}</button>
        ))}
      </div>

      <div className={styles.pageContainer}>
        {activeTab === 0 && renderProjectsTab()}
        {activeTab === 1 && renderMachinesTab()}
        {activeTab === 2 && renderFieldsTab()}
        {activeTab === 3 && renderTypesTab()}
        {activeTab === 4 && renderDataTab()}
      </div>
    </div>
  );
}