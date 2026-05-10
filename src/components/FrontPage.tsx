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
  const [projects, setProjects] = useState<Project[]>([]);
  const [subProjects, setSubProjects] = useState<SubProject[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [partTypes, setPartTypes] = useState<PartType[]>([]);

  const [curMain, setCurMain] = useState('smt');
  const [curSub, setCurSub] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [selectedPn, setSelectedPn] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

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

  useEffect(() => {
    if (curMain && curSub) { loadParts(); }
  }, [curMain, curSub]);

  const loadParts = async () => {
    try {
      const res = await supabase.from('parts').select('*').eq('project_key', curMain).eq('sub_name', curSub);
      if (res.data) setParts(res.data);
    } catch (error) { console.error('Error loading parts:', error); }
  };

  const filteredParts = parts.filter(
    (p) =>
      !searchQ ||
      [p.pn, p.name, p.vendor, p.machine, p.model, p.remark].some((v) =>
        (v || '').toLowerCase().includes(searchQ.toLowerCase())
      )
  );
  
// ... 其他狀態宣告 ...
  const [logs, setLogs] = useState<any[]>([]); // 儲存多筆歷史紀錄
  const [showLogModal, setShowLogModal] = useState(false); // 控制彈窗顯示

  useEffect(() => {
    loadData();
    loadLogs(); // 改為載入多筆日誌
  }, []);

  const loadLogs = async () => {
    try {
      // 一次抓取最近的 20 筆紀錄
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
// 在 FrontPage 組件內新增處理函數

const handleCodeClick = (formattedCode: string) => {
  // 1. 複製料號到剪貼簿
  navigator.clipboard.writeText(formattedCode).then(() => {
    // 可以選擇性加入一個簡單的提示，例如：alert('已複製特定編碼: ' + formattedCode);
  });

  // 2. 將網頁轉往指定目標 (根據你的描述是轉往該錯誤頁面或特定外部連結)
  // 注意：若該連結是固定的，直接填寫 URL；若需要帶參數，可自行拼接
  window.location.href = "http://your-iis-server-address/error-page-path"; 
};

// 轉換規則函數
const getSpecialCode = (pn: string, prefix: string | undefined) => {
  if (!prefix) return null;
  // 規則：prefix + (料號移除所有 ".")
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
              setSelectedPn(null); // 切換項目時清空選擇
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

      <div className={styles.searchWrap}>
        <input
          type="text"
          placeholder="快速搜尋料號、品名、廠商..."
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          className={styles.searchInput}
        />
      </div>

{/* --- 極簡化表格：僅呈現核心三項 --- */}
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

      {/* 詳情面板：點擊料號後呈現 */}
{/* Detail Panel */}
<div className={styles.detail}>
  <div className={styles.detailHead}>
    <span>詳細資料</span>
    
    {/* --- 以下為新增：右側顯示特定編碼與點擊功能 --- */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
      
      {selectedPart && (
        (() => {
          // 1. 找到當前的子項目物件，取得其設定的 prefix
          const subProj = subProjects.find(s => s.project_key === curMain && s.name === curSub);
          const prefix = (subProj as any)?.code_prefix; // 假設你在資料庫新增的欄位叫 code_prefix

          if (prefix) {
            // 2. 規則轉換：Prefix + 料號(去掉所有的點)
            const specialCode = prefix + selectedPart.pn.replace(/\./g, '');
            
            return (
              <button 
			  className={styles.specialCodeBtn}
			  onClick={() => {
				// 1. 複製到剪貼簿
				navigator.clipboard.writeText(specialCode);
				
				// 2. 開啟獨立漂浮小視窗 (寬800, 高600)
				const targetUrl = "http://211.75.18.228/tkkweb/inventory/list.asp"; 
				window.open(
				  targetUrl, 
				  'SpecialSystemWindow', // 視窗名稱
				  'width=800,height=600,left=200,top=100,resizable=yes,scrollbars=yes' // 視窗屬性
				);
			  }}
			>
			  公司料號：{specialCode} 📋
</button>
            );
          }
          return null;
        })()
      )}
    </div>
    {/* --- 新增結束 --- */}
  </div>

  <div className={styles.detailBody}>
    {selectedPart ? (
      /* --- 這裡修改了樣式類別，讓間距變窄 --- */
      <div className={styles.dgrid}> 
        {fields.map((f) => (
          <div key={f.id} className={styles.ditem}>
            <div className={styles.fl}>{f.label}</div>
            <div className={styles.fv}>
              {f.field_key === 'type_id'
                ? getTypeName(selectedPart.type_id)
                : f.field_key === 'status'
                  ? getStatusBadge(selectedPart.status).props.children // 只拿文字
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
{/* --- 右下角最後更新資訊 (改為可點擊) --- */}
      {logs.length > 0 && (
        <div 
          className={styles.updateWidget} 
          onClick={() => setShowLogModal(true)}
          title="點擊查看詳細更新歷史"
        >
          <div className={styles.uwDot}></div>
          <div className={styles.uwContent}>
            <div className={styles.uwTitle}>系統最後更新 <span>(點擊查看詳情)</span></div>
            <div className={styles.uwText}>時間：{new Date(logs[0].created_at).toLocaleString('zh-TW')}</div>
            <div className={styles.uwText}>人員：{logs[0].updater_name}</div>
            <div className={styles.uwText}>項目：[{logs[0].action}] {logs[0].update_item}</div>
          </div>
        </div>
      )}

      {/* --- 更新歷史紀錄彈窗 --- */}
      {showLogModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }} onClick={() => setShowLogModal(false)}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', width: '550px', maxHeight: '80vh', overflowY: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 15px 0', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>📜 系統更新歷史紀錄</h3>
            
            {/* 歷史清單列表 */}
            <div style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '10px' }}>
              {logs.map((log) => (
                <div key={log.id} style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px dashed #eee' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#185fa5' }}>[{log.action}] {log.update_item}</span>
                    <span style={{ fontSize: '12px', color: '#888' }}>{new Date(log.created_at).toLocaleString('zh-TW')}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>👤 操作人員：{log.updater_name}</div>
                  
                  {/* 若有 details (例如匯入了哪些料號)，顯示在這裡 */}
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
    </div> // 這是原本最外層的 </div>
  );
}