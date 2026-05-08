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

  // 初始化載入資料
  useEffect(() => {
    loadData();
  }, []);

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

      // 設定預設子項目
      if (projectsRes.data && projectsRes.data.length > 0) {
        const firstMain = projectsRes.data[0].key;
        setCurMain(firstMain);
        const firstSub = subRes.data?.find((s) => s.project_key === firstMain)?.name;
        if (firstSub) setCurSub(firstSub);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // 載入該子項目的料號
  useEffect(() => {
    if (curMain && curSub) {
      loadParts();
    }
  }, [curMain, curSub]);

  const loadParts = async () => {
    try {
      const query = supabase
        .from('parts')
        .select('*')
        .eq('project_key', curMain)
        .eq('sub_name', curSub);

      const res = await query;
      if (res.data) setParts(res.data);
    } catch (error) {
      console.error('Error loading parts:', error);
    }
  };

  // 搜尋過濾
  const filteredParts = parts.filter(
    (p) =>
      !searchQ ||
      [p.pn, p.name, p.vendor, p.machine, p.model].some((v) =>
        (v || '').toLowerCase().includes(searchQ.toLowerCase())
      )
  );

  const curProject = projects.find((p) => p.key === curMain);
  const ci = curProject?.color_index || 0;
  const colorClass = `ci${ci}`;

  const selectedPart = filteredParts.find((p) => p.pn === selectedPn);
  const getTypeName = (typeId?: number) => {
    if (!typeId) return '—';
    return partTypes.find((t) => t.id === typeId)?.name || '—';
  };

  const getStatusBadge = (status: string) => {
    const badgeClass =
      status === 'active' ? 'badge-ok' : status === 'obs' ? 'badge-obs' : 'badge-eol';
    const label = status === 'active' ? '有效' : status === 'obs' ? '停產預告' : '已停產';
    return <span className={`badge ${badgeClass}`}>{label}</span>;
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
        <button className={styles.adminBtn} onClick={onSwitchToAdmin}>
          ⚙ 後台管理
        </button>
      </div>

      {/* Main tabs */}
      <div className={styles.navArea}>
        {projects.map((p) => (
          <button
            key={p.key}
            className={`${styles.mainTab} ${p.key === curMain ? styles[`active-ci${p.color_index}`] : ''}`}
            onClick={() => {
              setCurMain(p.key);
              const firstSub = subProjects.find((s) => s.project_key === p.key)?.name;
              if (firstSub) setCurSub(firstSub);
            }}
          >
            {p.name}
            <div className={styles.tabCount}>
              {subProjects.filter((s) => s.project_key === p.key).length} 子項目
            </div>
          </button>
        ))}
      </div>

      {/* Sub tabs */}
      <div className={styles.subTabs}>
        {subProjects
          .filter((s) => s.project_key === curMain)
          .map((s) => (
            <button
              key={s.id}
              className={`${styles.subTab} ${s.name === curSub ? `${styles.active} ${styles[colorClass]}` : ''}`}
              onClick={() => setCurSub(s.name)}
            >
              {s.name}
            </button>
          ))}
      </div>

      {/* DB Badge */}
      <div className={`${styles.dbBadge} ${styles[colorClass]}`}>
        <span className={`${styles.dbDot} ${styles[colorClass]}`}></span>
        <span>獨立資料庫：{curProject?.name} / {curSub}</span>
      </div>

      {/* Metrics */}
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <div className={styles.label}>本庫料號數</div>
          <div className={styles.value}>{parts.length}</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.label}>有效料號</div>
          <div className={styles.value}>{parts.filter((p) => p.status === 'active').length}</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.label}>查詢結果</div>
          <div className={styles.value}>{filteredParts.length}</div>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchWrap}>
        <input
          type="text"
          placeholder="搜尋料號、品名、廠商、機型…"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>料號</th>
              <th>品名</th>
              <th>廠商</th>
              <th>機型</th>
              <th>型號</th>
              <th>零件類型</th>
              <th>狀態</th>
            </tr>
          </thead>
          <tbody>
            {filteredParts.map((p) => (
              <tr
                key={p.id}
                onClick={() => setSelectedPn(p.pn)}
                className={p.pn === selectedPn ? styles.selected : ''}
              >
                <td>
                  <span className={`${styles.pn} ${styles[colorClass]}`}>{p.pn}</span>
                </td>
                <td>{p.name}</td>
                <td>{p.vendor || '—'}</td>
                <td>{p.machine || '—'}</td>
                <td>{p.model || '—'}</td>
                <td>
                  <span
                    className={styles.typePill}
                    style={{
                      backgroundColor: COLORS[ci].bg,
                      color: COLORS[ci].text,
                    }}
                  >
                    {getTypeName(p.type_id)}
                  </span>
                </td>
                <td>{getStatusBadge(p.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Panel */}
      <div className={styles.detail}>
        <div className={styles.detailHead}>
          <span>料號詳細資料</span>
          <span className={styles.detailPn}>{selectedPart?.pn || '—'}</span>
        </div>
        <div className={styles.detailBody}>
          {selectedPart ? (
            <>
              <div className={styles.dcol}>
                {fields.map((f) => (
                  <div key={f.id}>
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
            </>
          ) : (
            <div className={styles.placeholder}>點選料號查看詳細資料</div>
          )}
        </div>
      </div>
    </div>
  );
}
