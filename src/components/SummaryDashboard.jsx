import React from 'react';
import { GRADES } from '../constants/subjects';
import { TrendingUp } from 'lucide-react';

function SummaryDashboard({ summary, onSelectSubject, subjects, selectedTerm, onTermChange, terms, curriculum }) {
  // ---------- Loading state ----------
  if (!summary) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-border p-8 fade-in">
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <div className="w-10 h-10 rounded-full border-3 border-primary/30 border-t-primary animate-spin" />
          <p className="text-text-muted text-sm font-medium animate-pulse-soft">
            กำลังโหลดสรุปภาพรวม...
          </p>
        </div>
      </div>
    );
  }

  // ---------- Compute overall progress ----------
  const subjectList = subjects && subjects.length > 0 ? subjects : Object.keys(summary);
  
  let totalPercentSum = 0;
  let validGradeCount = 0;

  subjectList.forEach((subj) => {
    GRADES.forEach((g) => {
      // เช็คว่าวิชานี้มีการสอนในชั้นนี้ไหม
      const isTaught = (curriculum || []).some(
        (r) => r.เทอม === selectedTerm && r.ชั้น === g && r.ชื่อวิชา === subj
      );
      
      if (isTaught) {
        const prog = summary[subj]?.[g];
        totalPercentSum += typeof prog === 'number' ? prog : (prog?.passedPercent || 0);
        validGradeCount++;
      }
    });
  });

  const totalProgress = validGradeCount > 0 ? totalPercentSum / validGradeCount : 0;

  // ---------- Badge color helper ----------
  const badgeClasses = (percent) => {
    if (percent === 100) return 'bg-success text-white shadow-[0_0_10px_rgba(16,185,129,0.35)]';
    if (percent > 0) return 'bg-warning text-white shadow-[0_0_10px_rgba(245,158,11,0.35)]';
    return 'bg-danger text-white';
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-border shadow-soft fade-in">
      {/* ===== Header ===== */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-text-main leading-tight truncate">
            สรุปความคืบหน้าทั้งโรงเรียน
          </h2>
          <p className="text-text-muted text-xs mt-0.5">
            ภาพรวมการกรอกข้อมูลทุกวิชา (ม.1 – ม.6)
          </p>
        </div>

        {/* Overall percentage */}
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-light text-primary">
            <TrendingUp size={18} />
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-primary leading-none">
              {Math.round(totalProgress)}%
            </div>
            <div className="text-[0.6rem] uppercase tracking-wider text-text-muted font-semibold">
              ภาพรวม
            </div>
          </div>
        </div>
      </div>

      {/* ===== Term Tabs ===== */}
      {terms && terms.length > 0 && (
        <div className="flex gap-1 px-6 pb-4">
          {terms.map((term) => (
            <button
              key={term}
              onClick={() => onTermChange?.(term)}
              className={[
                'px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer',
                selectedTerm === term
                  ? 'bg-primary text-white shadow-glow-primary'
                  : 'bg-surface-hover text-text-muted hover:bg-primary-light hover:text-primary',
              ].join(' ')}
            >
              {term}
            </button>
          ))}
        </div>
      )}

      {/* ===== Data Table ===== */}
      <div className="overflow-x-auto px-4 pb-2">
        <table className="w-full text-[0.8rem] border-separate border-spacing-x-0 border-spacing-y-[3px]">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 text-text-muted font-semibold text-xs">
                วิชา
              </th>
              {GRADES.map((g) => (
                <th
                  key={g}
                  className="text-center px-1.5 py-2 text-text-muted font-semibold text-xs"
                >
                  {g}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subjectList.map((subject, idx) => (
              <tr
                key={subject}
                className="group bg-surface-hover/60 hover:bg-primary-light/60 transition-colors duration-150"
              >
                {/* Subject name cell */}
                <td
                  onClick={() => onSelectSubject?.(subject)}
                  title={subject}
                  className="px-3 py-2 font-semibold text-primary cursor-pointer max-w-[180px] truncate rounded-l-lg group-hover:text-primary-hover transition-colors duration-150"
                >
                  {subject}
                </td>

                {/* Grade cells */}
                {GRADES.map((grade) => {
                  const isTaught = (curriculum || []).some(
                    (r) => r.เทอม === selectedTerm && r.ชั้น === grade && r.ชื่อวิชา === subject
                  );

                  if (!isTaught) {
                    return (
                      <td key={grade} className="text-center px-1 py-1.5 last:rounded-r-lg">
                        <div className="inline-flex items-center justify-center w-8 h-7 rounded-md text-[0.6rem] font-bold text-slate-300">
                          -
                        </div>
                      </td>
                    );
                  }

                  const progressObj = summary[subject]?.[grade];
                  const progress = typeof progressObj === 'number' ? progressObj : (progressObj?.passedPercent || 0);
                  const isCComplete = progressObj?.isCComplete;
                  const isRComplete = progressObj?.isRComplete;
                  const isCMComplete = progressObj?.isCMComplete;

                  return (
                    <td key={grade} className="text-center px-1 py-1.5 last:rounded-r-lg align-top">
                      <div className="flex flex-col items-center gap-1">
                        <div
                          title={`${subject} ${grade}: ${progress}%`}
                          className={[
                            'inline-flex items-center justify-center w-8 h-7 rounded-md text-[0.6rem] font-bold transition-transform duration-150 hover:scale-110',
                            badgeClasses(progress),
                          ].join(' ')}
                        >
                          {progress > 0 ? `${progress}` : '0'}
                        </div>
                        {(isCComplete || isRComplete || isCMComplete) && (
                          <div className="flex gap-0.5 mt-0.5">
                             {isCComplete && <span className="text-[0.5rem] px-1 rounded bg-green-100 text-green-600 font-bold" title="คุณลักษณะอันพึงประสงค์">ค</span>}
                             {isRComplete && <span className="text-[0.5rem] px-1 rounded bg-green-100 text-green-600 font-bold" title="การอ่าน คิดวิเคราะห์ฯ">อ</span>}
                             {isCMComplete && <span className="text-[0.5rem] px-1 rounded bg-green-100 text-green-600 font-bold" title="สมรรถนะสำคัญ">ส</span>}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== Legend ===== */}
      <div className="mx-4 mb-4 mt-2 px-4 py-3 bg-surface-hover rounded-xl flex flex-col gap-3">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="inline-block w-3 h-3 rounded bg-danger" />
            ยังไม่กรอก (0%)
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="inline-block w-3 h-3 rounded bg-warning" />
            กำลังดำเนินการ (1–99%)
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="inline-block w-3 h-3 rounded bg-success" />
            เรียบร้อย (100%)
          </div>
        </div>
        <div className="flex flex-wrap gap-4 items-center pt-2 border-t border-border/60">
          <div className="flex items-center gap-2">
            <span className="text-[0.6rem] px-1 rounded bg-green-100 text-green-600 font-bold">ค</span>
            <span className="text-xs text-text-muted">คุณลักษณะฯ</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[0.6rem] px-1 rounded bg-green-100 text-green-600 font-bold">อ</span>
            <span className="text-xs text-text-muted">การอ่านคิดฯ</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[0.6rem] px-1 rounded bg-green-100 text-green-600 font-bold">ส</span>
            <span className="text-xs text-text-muted">สมรรถนะฯ</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SummaryDashboard;
