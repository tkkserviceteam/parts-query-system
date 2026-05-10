'use client';

import React, { useState, useEffect } from 'react';
import { supabase, Project, SubProject, Part, FieldDef, PartType } from '@/lib/supabase';
import styles from '@/styles/FrontPage.module.css';

const COLORS = [
  { bg: '#EAF3DE', text: '#3B6D11', dot: '#639922' },
  { bg: '#E6F1FB', text: '#185FA5', dot: '#378ADD' },
  { bg: '#EEEDFE', text: '#534AB7', dot: '#7F77DD' },
  { bg: '#FAEEDA', text: '#854F0B', dot: '#EF9F27' },
  { bg: '#FCEBEB', text: '#A32D2D', dot: '#E24B4A' },
];

export default function FrontPage({ onSwitchToAdmin }: { onSwitchToAdmin: () => void }) {
  // ==========================================
  // 1. 所有 State 宣告 (必須集中在最上方)
  // ==========================================
  const [projects, setProjects] = useState<Project[]>([]);
  const [subProjects, setSubProjects] = useState<SubProject[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [partTypes, setPartTypes] = useState<PartType[]>([]);

  const [curMain, setCurMain] = useState('smt');
  const [curSub, setCurSub] = useState('');
  const [selectedPn, setSelectedPn] = useState<string | null>(null);

  // 日誌狀態
  const [logs, setLogs] = useState<any[]>([]); 
  const [showLogModal, setShowLogModal] = useState(false); 
  const [isWidgetOpen, setIsWidgetOpen] = useState(false); // 👉 新增這行：控制右下角視窗是否展開
  // 多條件篩選狀態
  const [filters, setFilters] = useState({ pn: '', name: '', machine: '', status: '' });

  // ==========================================
  // 2. 資料過濾邏輯 (依賴上方的 filters 狀態)
  // ==========================================
  const filteredParts = parts.filter(p => {
    const matchPn = !filters.pn || (p.pn && p.pn.toLowerCase().includes(filters.pn.toLowerCase()));
    const matchName = !filters.name || (p.name && p.name.toLowerCase().includes(filters.name.toLowerCase()));
    const matchMachine = !filters.machine || p.machine === filters.machine;
    const matchStatus = !filters.status || p.status === filters.status;
    return matchPn && matchName && matchMachine && matchStatus;
  });

  // 從目前載入的零件中，動態整理出有哪些機型 (不重複)，供下拉選單使用
  const availableMachines = Array.from(new Set(parts.map(p => p.machine).filter(Boolean)));

  // ==========================================
  // 3. 生命週期與資料載入函數
  // ==========================================
  useEffect(() => { 
    loadData(); 
    loadLogs();
  }, []);

  useEffect(() => {
    if (curMain && curSub) { loadParts(); }
  }, [curMain, curSub]);

  const loadData = async () => {
    try {
      const [projectsRes, subRes, fieldsRes, typesRes] = await Promise.all([
        supabase.from('projects').select('*').order('sort_order'),
        supabase.from('sub_projects').select('*').order('sort_order'),
        supabase.from('field_defs').select('*').order('sort_order'),
        supabase.from('part_types').select('*'),
      ]);

      if (projectsRes.data) setProjects(projectsRes.data);
      if (subRes.data) setSubProjects(subRes.data);
      if (fieldsRes.data) setFields(fieldsRes.data);
      if (typesRes.data) setPartTypes(typesRes.data);

      if (projectsRes.data && projectsRes.data.length > 0) {
        const firstMain = projectsRes.data[0].key;
        setCurMain(firstMain);
        const firstSub = subRes.data?.find((s) => s.project_key === firstMain)?.name;
        if (firstSub) setCurSub(firstSub);
      }
    } catch (error) { console.error('Error loading data:', error); }
  };

  const loadParts = async () => {
    try {
      const res = await supabase.from('parts').select('*').eq('project_key', curMain).eq('sub_name', curSub);
      if (res.data) setParts(res.data);
    } catch (error) { console.error('Error loading parts:', error); }
  };

  const loadLogs = async () => {
    try {
      const { data } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (data && data.length > 0) {
        setLogs(data);
      }
    } catch (error) {
      console.error('無更新紀錄', error);
    }
  };

  // ==========================================
  // 4. 其他輔助函數
  // ==========================================
  const handleCodeClick = (formattedCode: string) => {
    navigator.clipboard.writeText(formattedCode).then(() => {
      // alert('已複製: ' + formattedCode);
    });
    window.location.href = "http://your-iis-server-address/error-page-path"; 
  };

  const getSpecialCode = (pn: string, prefix: string | undefined) => {
    if (!prefix) return null;
    const cleanPn = pn.replace(/\./g, '');
    return `${prefix}${cleanPn}`;
  };

  const curProject = projects.find((p) => p.key === curMain);
  const ci = curProject?.color_index || 0;
  const colorClass = `ci${ci}`;
  const selectedPart = parts.find((p) => p.pn === selectedPn);

  const getTypeName = (typeId?: number) => {
    if (!typeId) return '—';
    return partTypes.find((t) => t.id === typeId)?.name || '—';
  };

  const getStatusLabel = (status: string) => {
    const mapping: any = { 'active': '有效', 'obs': '停產預告', 'eol': '已停產' };
    return mapping[status] || status;
  };

  const getStatusBadge = (status: string) => {
    const badgeClass = status === 'active' ? 'badge-ok' : status === 'obs' ? 'badge-obs' : 'badge-eol';
    return <span className={`badge ${badgeClass}`}>{getStatusLabel(status)}</span>;
  };

  // ==========================================
  // 5. UI 渲染區塊
  // ==========================================
  return (
    <div className={styles.frontPage}>
      <div className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <div className={styles.logo}>📊</div>
          <div>
            <div className={styles.title}>料號查詢系統</div>
            <div className={styles.subtitle}>SMT · Solar · Semiconductor</div>
          </div>
        </div>
        <button className={styles.adminBtn} onClick={onSwitchToAdmin}>⚙ 後台管理</button>
      </div>

      <div className={styles.navArea}>
        {projects.map((p) => (
          <button
            key={p.key}
            className={`${styles.mainTab} ${p.key === curMain ? styles[`active-ci${p.color_index}`] : ''}`}
            onClick={() => {
              setCurMain(p.key);
              const firstSub = subProjects.find((s) => s.project_key === p.key)?.name;
              setCurSub(firstSub || '');
              setSelectedPn(null);
            }}
          >
            {p.name}
            <div className={styles.tabCount}>{subProjects.filter((s) => s.project_key === p.key).length} 子項目</div>
          </button>
        ))}
      </div>

      <div className={styles.subTabs}>
        {subProjects.filter((s) => s.project_key === curMain).map((s) => (
          <button
            key={s.id}
            className={`${styles.subTab} ${s.name === curSub ? `${styles.active} ${styles[colorClass]}` : ''}`}
            onClick={() => { setCurSub(s.name); setSelectedPn(null); }}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className={`${styles.dbBadge} ${styles[colorClass]}`}>
        <span className={`${styles.dbDot} ${styles[colorClass]}`}></span>
        <span>目前庫別：{curProject?.name} / {curSub}</span>
      </div>

      <div className={styles.metrics}>
        <div className={styles.metric}><div className={styles.label}>總料號數</div><div className={styles.value}>{parts.length}</div></div>
        <div className={styles.metric}><div className={styles.label}>查詢結果</div><div className={styles.value}>{filteredParts.length}</div></div>
      </div>

{/* --- 多條件搜尋區塊 (固定顯示) --- */}
      <div className={styles.searchWrap}>
        {/* 標題列 (移除點擊收合功能) */}
        <div className={styles.filterToggle} style={{ cursor: 'default', background: '#eef5fc' }}>
          <div style={{ fontWeight: 'bold', color: '#185fa5' }}>
            🔍 搜尋料號 
            {Object.values(filters).some(x => x !== '') && <span style={{ color: '#e03131', fontSize: '12px', marginLeft: '8px' }}>(已套用條件)</span>}
          </div>
        </div>

        {/* 篩選表單 (移除 showFilters 條件，直接顯示) */}
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>料號 (P/N)</label>
            <input className={styles.searchInput} placeholder="搜尋料號..." value={filters.pn} onChange={e => setFilters({...filters, pn: e.target.value})} />
          </div>
          
          <div className={styles.filterItem}>
            <label>品名 / 描述</label>
            <input className={styles.searchInput} placeholder="搜尋關鍵字..." value={filters.name} onChange={e => setFilters({...filters, name: e.target.value})} />
          </div>
          
          <div className={styles.filterItem}>
            <label>機型限制</label>
            <select className={styles.searchInput} value={filters.machine} onChange={e => setFilters({...filters, machine: e.target.value})}>
              <option value="">-- 全部機型 --</option>
              {availableMachines.map(m => (
                <option key={m as string} value={m as string}>{m as string}</option>
              ))}
            </select>
          </div>
          
          <div className={styles.filterItem}>
            <label>狀態限制</label>
            <select className={styles.searchInput} value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
              <option value="">-- 全部狀態 --</option>
              <option value="active">有效 (Active)</option>
              <option value="obs">停產預告 (Obs)</option>
              <option value="eol">已停產 (EOL)</option>
            </select>
          </div>

          <div className={styles.filterItem} style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button 
              style={{ width: '100%', padding: '9px', background: '#fff5f5', color: '#e03131', border: '1px solid #ffc9c9', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
              onClick={() => setFilters({pn: '', name: '', machine: '', status: ''})}
            >
              🧹 清除條件
            </button>
          </div>
        </div>
      </div>

      {/* --- 極簡化表格 --- */}
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '30%' }}>料號</th>
              <th style={{ width: '40%' }}>品名</th>
              <th style={{ width: '30%' }}>對應機型</th>
            </tr>
          </thead>
          <tbody>
            {filteredParts.map((p) => (
              <tr
                key={p.id}
                onClick={() => setSelectedPn(p.pn)}
                className={p.pn === selectedPn ? styles.selected : ''}
                style={{ cursor: 'pointer' }}
              >
                <td>
                  <span className={`${styles.pn} ${styles[colorClass]}`}>{p.pn}</span>
                </td>
                <td>{p.name}</td>
                <td>{p.machine || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 詳情面板 */}
      <div className={styles.detail}>
        <div className={styles.detailHead}>
          <span>詳細資料</span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {selectedPart && (
              (() => {
                const subProj = subProjects.find(s => s.project_key === curMain && s.name === curSub);
                const prefix = (subProj as any)?.code_prefix;

                if (prefix) {
                  const specialCode = prefix + selectedPart.pn.replace(/\./g, '');
                  return (
<a href="/redirect.html">
  開啟系統
</a>
                  );
                }
                return null;
              })()
            )}
          </div>
        </div>

        <div className={styles.detailBody}>
          {selectedPart ? (
            <div className={styles.dgrid}> 
              {fields.map((f) => (
                <div key={f.id} className={styles.ditem}>
                  <div className={styles.fl}>{f.label}</div>
                  <div className={styles.fv}>
                    {f.field_key === 'type_id'
                      ? getTypeName(selectedPart.type_id)
                      : f.field_key === 'status'
                        ? getStatusBadge(selectedPart.status).props.children
                        : (selectedPart as any)[f.field_key] || '—'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.placeholder}>點選料號查看詳細資料</div>
          )}
        </div>
      </div>

      {/* --- 右下角最後更新資訊 --- */}
{/* --- 右下角最後更新資訊 (內縮/展開版本) --- */}
      {logs.length > 0 && (
        <>
          {/* 收合狀態：貼在畫面右側的懸浮小分頁 */}
          {!isWidgetOpen && (
            <div 
              className={styles.widgetCollapsed} 
              onClick={() => setIsWidgetOpen(true)}
              title="點擊查看最新更新"
            >
              ◀ 近日更新
            </div>
          )}

{/* 展開狀態：完整的資訊卡片 */}
          {isWidgetOpen && (
            <div className={styles.updateWidget} style={{ display: 'flex', flexDirection: 'column' }}>
              
              {/* 第一行：標題與返回按鈕 (橫向撐滿) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '8px', width: '100%' }}>
                <div style={{ fontWeight: 'bold', color: '#185fa5', fontSize: '15px' }}>系統最後更新</div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsWidgetOpen(false); }}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#888', fontSize: '13px', padding: '2px 5px' }}
                >
                  [返回]
                </button>
              </div>
              
              {/* 第二行開始：詳細資料 (點擊可開啟歷史彈窗) */}
              <div 
                onClick={() => setShowLogModal(true)}
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px' }}
                title="點擊查看完整歷史紀錄"
              >
                <div className={styles.uwText} style={{ marginBottom: '4px' }}>⏰ 時間：{new Date(logs[0].created_at).toLocaleString('zh-TW')}</div>
                <div className={styles.uwText} style={{ marginBottom: '4px' }}>👤 人員：{logs[0].updater_name}</div>
                <div className={styles.uwText} style={{ marginBottom: '4px' }}>📝 項目：[{logs[0].action}] {logs[0].update_item}</div>
                
                {/* 裝飾性的小提示 */}
                <div style={{ fontSize: '11px', color: '#4a90e2', textAlign: 'right', marginTop: '4px' }}>
                   點擊查看完整歷史 ➔
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* --- 更新歷史紀錄彈窗 --- */}
      {showLogModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }} onClick={() => setShowLogModal(false)}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', width: '550px', maxHeight: '80vh', overflowY: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 15px 0', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>📜 系統更新歷史紀錄</h3>
            
            <div style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '10px' }}>
              {logs.map((log) => (
                <div key={log.id} style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px dashed #eee' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#185fa5' }}>[{log.action}] {log.update_item}</span>
					 </div>
					<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#888' }}>{new Date(log.created_at).toLocaleString('zh-TW')}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>👤 操作人員：{log.updater_name}</div>
                  
                  {log.details && (
                    <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '6px', fontSize: '12px', color: '#555', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                      {log.details}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setShowLogModal(false)}>
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}