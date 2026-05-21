import React, { useState } from 'react';
import { Info, Trash2, Undo2, Redo2, CheckCircle2 } from 'lucide-react';

// Helper สร้าง key ให้ตรงกับ backend headers
const getItemKey = (aspectId, index) => {
  // R และ ST ไม่มีจุด (R1, R2, ST1, ST2)
  // C และ CM มีจุด (C1.1, CM1.1)
  if (aspectId === 'R' || aspectId === 'ST') {
    return `${aspectId}${index + 1}`;
  }
  return `${aspectId}.${index + 1}`;
};

function AssessmentGrid({ data, setData, isGlobalSummary, undoHistory, metrics }) {
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
    if (level === "3") return "bg-green-100 text-green-700";
    if (level === "2") return "bg-blue-100 text-blue-700";
    if (level === "1") return "bg-yellow-100 text-yellow-700";
    if (level === "0") return "bg-red-100 text-red-700";
    return "bg-transparent";
  };

  const handleValueChange = (rowIndex, metricId, subIndex, value) => {
    if (isGlobalSummary) return;
    if (value !== "" && !/^[1-3]$/.test(value)) return;
    
    // Push history ก่อนเปลี่ยน (สำหรับ Ctrl+Z)
    if (undoHistory) {
      undoHistory.pushHistory(data);
    }
    
    const newData = [...data];
    const key = getItemKey(metricId, subIndex);
    newData[rowIndex] = { ...newData[rowIndex], [key]: value };
    setData(newData);
  };

  const handlePaste = (e, startRowIndex, startMetricId, startSubIndex) => {
    if (isGlobalSummary) return;
    e.preventDefault();
    
    // Push history ก่อน paste
    if (undoHistory) {
      undoHistory.pushHistory(data);
    }
    
    const pasteContent = e.clipboardData.getData('text/plain');
    const rows = pasteContent.split(/\r?\n/).filter(r => r.trim() !== "");
    const currentTabMetricKeys = metrics[activeTab].aspects.flatMap(aspect => 
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

  const handleClearAll = () => {
    if (isGlobalSummary) return;
    if (!data || data.length === 0) return;
    
    if (!window.confirm(`ต้องการล้างค่าทั้งหมดใน "${metrics[activeTab].title}" ใช่หรือไม่?`)) {
      return;
    }
    
    // Push history ก่อนล้าง
    if (undoHistory) {
      undoHistory.pushHistory(data);
    }
    
    const newData = [...data];
    const keysToClear = metrics[activeTab].aspects.flatMap(aspect => 
      aspect.items.map((_, i) => getItemKey(aspect.id, i))
    );
    
    newData.forEach((row, idx) => {
      keysToClear.forEach(key => {
        newData[idx] = { ...newData[idx], [key]: "" };
      });
    });
    
    setData(newData);
  };

  const getRowMetricsData = (row, category) => {
    const keys = metrics[category].aspects.flatMap(aspect => 
       aspect.items.map((_, i) => getItemKey(aspect.id, i))
    );
    const scores = keys.map(k => parseFloat(row[k])).filter(s => !isNaN(s));
    const sum = scores.reduce((a, b) => a + b, 0);
    return { sum, level: getCategoryLevel(sum, category) };
  };

  const getSubHeader = () => {
    const metric = metrics[activeTab];
    return (
      <tr>
        {metric.aspects.map(aspect => (
          <React.Fragment key={aspect.id}>
            {aspect.items.map((item, i) => {
               let label;
               if (activeTab === 'evaluations') {
                 if (aspect.id === 'R') {
                   label = `1.${i+1}`;
                 } else if (aspect.id === 'ST') {
                   label = `2.${i+1}`;
                 }
               } else {
                 const aspectIndex = metric.aspects.indexOf(aspect) + 1;
                 label = `${aspectIndex}.${i+1}`;
               }
               return (
                  <th 
                    key={`${aspect.id}-${i}`} 
                    title={item} 
                    className="w-10 min-w-10 bg-slate-100 p-1 text-[0.65rem] text-center font-medium text-text-muted"
                  >
                    {label}
                  </th>
               );
            })}
          </React.Fragment>
        ))}
      </tr>
    );
  };

  if (!data || !metrics) return null;

  // Statistical calculations for footer
  const results = data.map(row => getRowMetricsData(row, activeTab));
  const count3 = results.filter(r => r.level === "3").length;
  const count2 = results.filter(r => r.level === "2").length;
  const totalStudents = data.length;
  const percent3 = totalStudents > 0 ? ((count3 / totalStudents) * 100).toFixed(2) : "0.00";
  const percent2 = totalStudents > 0 ? ((count2 / totalStudents) * 100).toFixed(2) : "0.00";

  const tabKeys = Object.entries(metrics);

  const isCategoryComplete = (categoryKey) => {
    if (!data || data.length === 0) return false;
    const keys = metrics[categoryKey].aspects.flatMap(aspect => 
       aspect.items.map((_, i) => getItemKey(aspect.id, i))
    );
    return data.every(student => 
       keys.every(k => student[k] && /^[1-3]$/.test(student[k]))
    );
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-border rounded-2xl p-5 shadow-soft fade-in">
      {/* Tab Navigation */}
      <div className="flex gap-1 mb-5 border-b-2 border-border">
        {tabKeys.map(([key, value]) => {
          const complete = isCategoryComplete(key);
          return (
          <button 
            key={key} 
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 bg-transparent text-sm border-none cursor-pointer px-4 py-3 font-bold transition-all duration-200 ${
              activeTab === key 
                ? 'text-primary border-b-[3px] border-primary -mb-[2px]' 
                : 'text-text-muted border-b-[3px] border-transparent hover:text-primary/70'
            }`}
          >
            {value.title}
            {complete && <CheckCircle2 size={16} className="text-green-500" />}
          </button>
        )})}
      </div>

      {/* Info Bar & Controls */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
        {/* Info */}
        <div className="flex items-center gap-3 px-4 py-3 bg-sky-50 rounded-lg border border-sky-200">
          <Info size={18} className="text-sky-600 shrink-0" />
          <p className="text-sm text-sky-800">
            พิมพ์เลข 1-3 หรือ <strong>คัดลอกข้อมูลจาก Excel แล้ววาง</strong> ลงในช่องคะแนนได้เลย
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-3 items-center">
          {/* Student count */}
          <div className="flex gap-4 px-4 py-2 bg-slate-50 rounded-xl border border-border">
            <div className="text-center">
              <div className="text-[0.65rem] text-text-muted">จำนวนนักเรียน</div>
              <div className="font-extrabold text-text-main">{totalStudents} คน</div>
            </div>
          </div>

          {/* Undo/Redo buttons */}
          {undoHistory && !isGlobalSummary && (
            <div className="flex gap-1">
              <button
                onClick={undoHistory.undo}
                disabled={!undoHistory.canUndo}
                title={`ย้อนกลับ (Ctrl+Z) - เหลือ ${undoHistory.undoCount} ครั้ง`}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 text-text-muted rounded-lg border border-border cursor-pointer transition-all hover:bg-primary-light hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Undo2 size={14} />
                <span className="hidden sm:inline">ย้อนกลับ</span>
                {undoHistory.undoCount > 0 && (
                  <span className="bg-primary text-white text-[0.6rem] px-1.5 py-0.5 rounded-full">{undoHistory.undoCount}</span>
                )}
              </button>
              <button
                onClick={undoHistory.redo}
                disabled={!undoHistory.canRedo}
                title={`ทำซ้ำ (Ctrl+Y) - เหลือ ${undoHistory.redoCount} ครั้ง`}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 text-text-muted rounded-lg border border-border cursor-pointer transition-all hover:bg-primary-light hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Redo2 size={14} />
                <span className="hidden sm:inline">ทำซ้ำ</span>
                {undoHistory.redoCount > 0 && (
                  <span className="bg-secondary text-white text-[0.6rem] px-1.5 py-0.5 rounded-full">{undoHistory.redoCount}</span>
                )}
              </button>
            </div>
          )}

          {/* Clear button */}
          {!isGlobalSummary && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-3 py-2 bg-red-50 text-danger border border-danger rounded-lg cursor-pointer text-sm font-semibold transition-all hover:bg-red-100"
              title="ล้างค่าทั้งหมดในแท็บนี้"
            >
              <Trash2 size={16} />
              ล้างค่า
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10">
            <tr>
              <th rowSpan={2} className="sticky-col w-[50px] text-center bg-gradient-to-b from-slate-50 to-slate-100 p-2 border-b border-border text-text-muted font-semibold text-[0.625rem] uppercase">#</th>
              <th rowSpan={2} className="sticky-col bg-gradient-to-b from-slate-50 to-slate-100 p-2 border-b border-border text-text-muted font-semibold text-[0.625rem] uppercase" style={{ left: '50px', width: '200px' }}>รายชื่อ</th>
              {metrics[activeTab].aspects.map(aspect => (
                <th key={aspect.id} colSpan={aspect.items.length} className="text-center bg-slate-50 text-primary p-2 border-b border-border text-[0.625rem] font-bold uppercase">
                  {aspect.label}
                </th>
              ))}
              <th rowSpan={2} className="bg-slate-100 text-center w-14 align-middle p-2 border-b border-border text-[0.625rem] font-bold uppercase text-text-muted">รวม</th>
              <th rowSpan={2} className="bg-gradient-to-b from-primary to-primary-hover text-white text-center w-14 align-middle p-2 border-b border-border text-[0.625rem] font-bold uppercase">ระดับ</th>
            </tr>
            {getSubHeader()}
          </thead>
          <tbody>
            {data.map((student, rowIndex) => {
              const { sum, level } = results[rowIndex];
              return (
                <tr key={student.ID} className="hover:bg-slate-50/80 transition-colors">
                  <td className="sticky-col text-center text-slate-400 bg-white p-1 border-b border-border">{rowIndex + 1}</td>
                  <td className="sticky-col font-semibold bg-white p-1 border-b border-border text-sm" style={{ left: '50px' }}>{student.Name}</td>
                  {metrics[activeTab].aspects.map(aspect => 
                    aspect.items.map((_, subIndex) => {
                      const key = getItemKey(aspect.id, subIndex);
                      return (
                        <td key={key} className="p-0 w-10 border-b border-border">
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
                  <td className="text-center font-extrabold bg-slate-50 p-1 border-b border-border">{sum}</td>
                  <td className={`text-center font-extrabold p-1 border-b border-border ${getLevelColor(level)}`}>{level}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="sticky bottom-0 bg-white border-t-2 border-primary">
            <tr>
              <td colSpan={2} className="p-3 font-extrabold bg-slate-100 text-sm">สรุปผลประเมิน</td>
              <td colSpan={metrics[activeTab].aspects.reduce((a, b) => a + b.items.length, 0)} className="p-3">
                <div className="flex gap-6 justify-end flex-wrap">
                  <div className="flex gap-3 items-center">
                    <span className="text-sm">ได้ 3: <strong className="text-green-600 text-base">{count3}</strong> คน</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-sm">ร้อยละได้ 3: <strong className="text-green-600">{percent3}%</strong></span>
                  </div>
                  <div className="flex gap-3 items-center">
                    <span className="text-sm">ได้ 2: <strong className="text-blue-600 text-base">{count2}</strong> คน</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-sm">ร้อยละได้ 2: <strong className="text-blue-600">{percent2}%</strong></span>
                  </div>
                </div>
              </td>
              <td colSpan={2} className="bg-slate-100"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default AssessmentGrid;
