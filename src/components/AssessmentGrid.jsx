import React, { useState } from 'react';
import { ASSESSMENT_METRICS } from '../constants/metrics';
import { Info, BarChart2, TrendingUp, Users } from 'lucide-react';

// Helper สร้าง key ให้ตรงกับ backend headers
const getItemKey = (aspectId, index) => {
  // R และ ST ไม่มีจุด (R1, R2, ST1, ST2)
  // C และ CM มีจุด (C1.1, CM1.1)
  if (aspectId === 'R' || aspectId === 'ST') {
    return `${aspectId}${index + 1}`;
  }
  return `${aspectId}.${index + 1}`;
};

function AssessmentGrid({ data, setData, isGlobalSummary }) {
  const [activeTab, setActiveTab] = useState('characteristics');

  // Level Calculation Formulas
  const getCategoryLevel = (sum, category) => {
    if (sum === 0) return "";
    if (category === 'characteristics') {
       if (sum < 16) return "0";
       if (sum < 31) return "1";
       if (sum < 46) return "2";
       if (sum <= 60) return "3";
    }
    if (category === 'evaluations') {
       if (sum < 14) return "0";
       if (sum <= 22) return "1";
       if (sum <= 32) return "2";
       if (sum <= 42) return "3";
    }
    if (category === 'competencies') {
       if (sum < 10) return "0";
       if (sum < 19) return "1";
       if (sum < 28) return "2";
       if (sum <= 36) return "3";
    }
    return "";
  };

  const getLevelColor = (level) => {
    if (level === "3") return "#dcfce7"; // light green
    if (level === "2") return "#dbeafe"; // light blue
    if (level === "1") return "#fef9c3"; // light yellow
    if (level === "0") return "#fee2e2"; // light red
    return "transparent";
  };

  const handleValueChange = (rowIndex, metricId, subIndex, value) => {
    if (isGlobalSummary) return;
    if (value !== "" && !/^[1-3]$/.test(value)) return;
    const newData = [...data];
    const key = getItemKey(metricId, subIndex);
    newData[rowIndex] = { ...newData[rowIndex], [key]: value };
    setData(newData);
  };

  const handlePaste = (e, startRowIndex, startMetricId, startSubIndex) => {
    if (isGlobalSummary) return;
    e.preventDefault();
    const pasteContent = e.clipboardData.getData('text/plain');
    const rows = pasteContent.split(/\r?\n/).filter(r => r.trim() !== "");
    const currentTabMetricKeys = ASSESSMENT_METRICS[activeTab].aspects.flatMap(aspect => 
       aspect.items.map((_, i) => getItemKey(aspect.id, i))
    );
    const startMetricKey = getItemKey(startMetricId, startSubIndex);
    const startColIndex = currentTabMetricKeys.indexOf(startMetricKey);
    const newData = [...data];
    rows.forEach((rowText, rOffset) => {
      const rowIndex = startRowIndex + rOffset;
      if (rowIndex >= newData.length) return;
      const cells = rowText.split('\t');
      cells.forEach((cellValue, cOffset) => {
        const colIndex = startColIndex + cOffset;
        if (colIndex >= currentTabMetricKeys.length) return;
        const val = cellValue.trim();
        if (/^[1-3]$/.test(val)) {
           const key = currentTabMetricKeys[colIndex];
           newData[rowIndex] = { ...newData[rowIndex], [key]: val };
        }
      });
    });
    setData(newData);
  };

  const getRowMetricsData = (row, category) => {
    const keys = ASSESSMENT_METRICS[category].aspects.flatMap(aspect => 
       aspect.items.map((_, i) => getItemKey(aspect.id, i))
    );
    const scores = keys.map(k => parseFloat(row[k])).filter(s => !isNaN(s));
    const sum = scores.reduce((a, b) => a + b, 0);
    return { sum, level: getCategoryLevel(sum, category) };
  };

  const getSubHeader = () => {
    const metric = ASSESSMENT_METRICS[activeTab];
    return (
      <tr>
        {metric.aspects.map(aspect => (
          <React.Fragment key={aspect.id}>
            {aspect.items.map((item, i) => {
               const aspectIndex = metric.aspects.indexOf(aspect) + 1;
               return (
                  <th key={`${aspect.id}-${i}`} title={item} style={{ width: '2.5rem', minWidth: '2.5rem', background: '#f1f5f9', padding: '0.25rem', fontSize: '0.65rem', textAlign: 'center' }}>
                    {aspectIndex}.{i+1}
                  </th>
               );
            })}
          </React.Fragment>
        ))}
      </tr>
    );
  };

  if (!data) return null;

  // Statistical calculations for footer
  const results = data.map(row => getRowMetricsData(row, activeTab));
  const count3 = results.filter(r => r.level === "3").length;
  const count2 = results.filter(r => r.level === "2").length;
  const totalStudents = data.length;
  const percent3 = totalStudents > 0 ? ((count3 / totalStudents) * 100).toFixed(2) : "0.00";
  const percent2 = totalStudents > 0 ? ((count2 / totalStudents) * 100).toFixed(2) : "0.00";

  return (
    <div className="card fade-in" style={{ padding: '1.5rem', background: '#fff' }}>
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', borderBottom: '2px solid var(--border)' }}>
        {Object.entries(ASSESSMENT_METRICS).map(([key, value]) => (
          <button 
            key={key} 
            className={`btn`} 
            onClick={() => setActiveTab(key)}
            style={{ 
              background: 'transparent',
              color: activeTab === key ? 'var(--primary)' : 'var(--text-muted)',
              fontSize: '0.875rem',
              border: 'none',
              borderBottom: activeTab === key ? '3px solid var(--primary)' : '3px solid transparent',
              borderRadius: 0,
              fontWeight: activeTab === key ? '800' : '500',
              padding: '0.75rem 1rem'
            }}
          >
            {value.title}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ padding: '0.75rem 1rem', background: '#f0f9ff', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid #bae6fd' }}>
            <Info size={18} style={{ color: '#0284c7' }} />
            <p style={{ fontSize: '0.85rem', color: '#075985', margin: 0 }}>
              พิมพ์เลข 1-3 หรือ <strong>คัดลอกข้อมูลจาก Excel แล้ววาง</strong> ลงในช่องคะแนนได้เลย
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', padding: '0.5rem 1.5rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
             <div style={{ textAlign: 'center' }}><div style={{ fontSize: '0.65rem', color: '#64748b' }}>จำนวนนักเรียน</div><div style={{ fontWeight: '800' }}>{totalStudents} คน</div></div>
          </div>
      </div>

      <div className="table-container">
        <table>
          <thead className="sticky-header">
            <tr>
              <th rowSpan={2} className="sticky-col" style={{ width: '50px', textAlign: 'center' }}>#</th>
              <th rowSpan={2} className="sticky-col" style={{ left: '50px', width: '200px', background: '#f1f5f9' }}>รายชื่อ</th>
              {ASSESSMENT_METRICS[activeTab].aspects.map(aspect => (
                <th key={aspect.id} colSpan={aspect.items.length} style={{ textAlign: 'center', background: '#f8fafc', color: 'var(--primary)' }}>
                  {aspect.label}
                </th>
              ))}
              <th rowSpan={2} style={{ background: '#f1f5f9', textAlign: 'center', width: '3.5rem', verticalAlign: 'middle' }}>รวม</th>
              <th rowSpan={2} style={{ background: 'var(--primary)', color: '#fff', textAlign: 'center', width: '3.5rem', verticalAlign: 'middle' }}>ระดับ</th>
            </tr>
            {getSubHeader()}
          </thead>
          <tbody>
            {data.map((student, rowIndex) => {
              const { sum, level } = results[rowIndex];
              return (
                <tr key={student.ID}>
                  <td className="sticky-col" style={{ textAlign: 'center', color: '#94a3b8', background: '#fff' }}>{rowIndex + 1}</td>
                  <td className="sticky-col" style={{ left: '50px', fontWeight: 600, background: '#fff' }}>{student.Name}</td>
                  {ASSESSMENT_METRICS[activeTab].aspects.map(aspect => 
                    aspect.items.map((_, subIndex) => {
                      const key = getItemKey(aspect.id, subIndex);
                      return (
                        <td key={key} style={{ padding: '0', width: '2.5rem' }}>
                          <input
                            type="text"
                            className={`score-input score-${student[key] || ""}`}
                            value={student[key] || ""}
                            onChange={(e) => handleValueChange(rowIndex, aspect.id, subIndex, e.target.value)}
                            onPaste={(e) => handlePaste(e, rowIndex, aspect.id, subIndex)}
                            maxLength={1}
                          />
                        </td>
                      );
                    })
                  )}
                  <td style={{ textAlign: 'center', fontWeight: '800', background: '#f8fafc' }}>{sum}</td>
                  <td style={{ textAlign: 'center', fontWeight: '800', backgroundColor: getLevelColor(level) }}>{level}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '2px solid var(--primary)' }}>
            <tr>
              <td colSpan={2} style={{ padding: '1rem', fontWeight: '800', background: '#f1f5f9' }}>สรุปผลประเมิน</td>
              <td colSpan={ASSESSMENT_METRICS[activeTab].aspects.reduce((a, b) => a + b.items.length, 0)} style={{ padding: '1rem' }}>
                 <div style={{ display: 'flex', gap: '2.5rem', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                       <span>ได้ 3: <strong style={{ color: '#16a34a', fontSize: '1.1rem' }}>{count3}</strong> คน</span>
                       <span style={{ color: '#94a3b8' }}>|</span>
                       <span>ร้อยละได้ 3: <strong style={{ color: '#16a34a' }}>{percent3}%</strong></span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                       <span>ได้ 2: <strong style={{ color: '#2563eb', fontSize: '1.1rem' }}>{count2}</strong> คน</span>
                       <span style={{ color: '#94a3b8' }}>|</span>
                       <span>ร้อยละได้ 2: <strong style={{ color: '#2563eb' }}>{percent2}%</strong></span>
                    </div>
                 </div>
              </td>
              <td colSpan={2} style={{ background: '#f1f5f9' }}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default AssessmentGrid;
