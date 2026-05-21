import React from 'react';
import { FALLBACK_SUBJECTS } from '../constants/subjects';

function SubjectMatrixTable({ students, categoryKey, title, subjects }) {
  // ใช้ subjects จาก props ถ้ามี, ไม่งั้นใช้ fallback
  const matrixSubjects = subjects || FALLBACK_SUBJECTS;

  if (!students || students.length === 0) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-border rounded-2xl p-8 mb-4 text-center text-slate-400 shadow-soft">
        <p className="font-bold text-lg mb-1">{title}</p>
        <p className="text-sm">ยังไม่มีข้อมูลการประเมินในระดับชั้นนี้</p>
      </div>
    );
  }

  const getLevelColor = (level) => {
    switch (level) {
      case "3": return "#22c55e";
      case "2": return "#3b82f6";
      case "1": return "#eab308";
      case "0": return "#ef4444";
      default: return "#f1f5f9";
    }
  };

  const getLevelBgClass = (level) => {
    switch (level) {
      case "3": return "bg-green-500";
      case "2": return "bg-blue-500";
      case "1": return "bg-yellow-500";
      case "0": return "bg-red-500";
      default: return "bg-transparent";
    }
  };

  // Footer Analytics
  const getFooterStats = (sub) => {
    let count3 = 0;
    let count2 = 0;
    students.forEach(s => {
      const level = s.Subjects?.[sub]?.[categoryKey];
      if (level === "3") count3++;
      if (level === "2") count2++;
    });
    const total = students.length;
    const sum32 = count3 + count2;
    const percent = total > 0 ? ((sum32 / total) * 100).toFixed(2) : "0.00";
    return { count3, count2, sum32, percent };
  };

  const getOverallStats = () => {
    let totalCount3 = 0;
    let totalCount2 = 0;
    let totalPercentSum = 0;
    let subjectCount = 0;
    
    matrixSubjects.forEach(sub => {
      const stats = getFooterStats(sub);
      totalCount3 += stats.count3;
      totalCount2 += stats.count2;
      totalPercentSum += parseFloat(stats.percent);
      subjectCount++;
    });
    
    const avgPercent = subjectCount > 0 ? (totalPercentSum / subjectCount).toFixed(2) : "0.00";
    const totalSum32 = totalCount3 + totalCount2;
    
    return { totalCount3, totalCount2, totalSum32, avgPercent, subjectCount };
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-border rounded-2xl p-4 mb-4 shadow-soft fade-in print-section overflow-visible">
      <h3 className="text-lg font-extrabold mb-3 text-text-main">
        {title}
      </h3>
      <div className="overflow-x-auto rounded-lg">
        <table className="w-full text-[0.7rem] border-collapse" style={{ minWidth: 'auto' }}>
          <thead>
            <tr className="bg-slate-50">
              <th className="w-[30px] p-1 text-center border-b border-border text-text-muted font-semibold text-[0.6rem] uppercase">ที่</th>
              <th className="w-[120px] p-1 border-b border-border text-text-muted font-semibold text-[0.6rem] uppercase text-left">ชื่อ-สกุล</th>
              {matrixSubjects.map(sub => (
                <th key={sub} className="p-1 border-b border-border text-text-muted font-medium text-[0.6rem] text-left whitespace-nowrap max-w-[40px] overflow-hidden text-ellipsis" 
                  title={sub}
                  style={{ 
                    writingMode: 'vertical-rl', 
                    transform: 'rotate(180deg)',
                    height: '100px',
                    padding: '0.5rem 0.25rem'
                  }}
                >
                  {sub.length > 15 ? sub.substring(0, 12) + '...' : sub}
                </th>
              ))}
              <th className="bg-slate-100 font-black text-center p-1 w-[35px] border-b border-border text-[0.6rem] uppercase">รวม</th>
              <th className="bg-gradient-to-b from-primary to-primary-hover text-white font-black text-center p-1 w-[35px] border-b border-border text-[0.6rem] uppercase">ระดับ</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, idx) => {
              let rowSum = 0;
              matrixSubjects.forEach(sub => {
                const lvl = student.Subjects?.[sub]?.[categoryKey];
                if (lvl && lvl !== "") rowSum += parseInt(lvl);
              });
              
              const rowLevel = rowSum === 0 ? "" : (rowSum < 15 ? "0" : (rowSum < 25 ? "1" : (rowSum < 35 ? "2" : "3")));

              return (
                <tr key={student.ID} className="hover:bg-slate-50/80 transition-colors">
                  <td className="text-center p-0.5 align-middle h-6 border-b border-border text-slate-400">{idx + 1}</td>
                  <td className="font-semibold p-0.5 text-[0.75rem] align-middle h-6 border-b border-border">{student.Name}</td>
                  {matrixSubjects.map(sub => {
                    const level = student.Subjects?.[sub]?.[categoryKey];
                    const displayLevel = level === "0" ? "" : level;
                    return (
                      <td key={sub} className="p-px text-center border-b border-border">
                        <span 
                          className={`inline-block w-[22px] h-[22px] leading-[22px] rounded text-white font-black text-[0.75rem] ${displayLevel ? getLevelBgClass(displayLevel) : 'bg-transparent text-transparent'}`}
                        >
                          {displayLevel || ""}
                        </span>
                      </td>
                    );
                  })}
                  <td className="text-center font-black bg-slate-50 p-0.5 align-middle h-6 border-b border-border">{rowSum}</td>
                  <td className="text-center font-black p-0.5 align-middle h-6 border-b border-border text-white" 
                    style={{ backgroundColor: getLevelColor(rowLevel) }}
                  >
                    {rowLevel}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-extrabold">
              <td colSpan={2} className="p-1 text-[0.7rem] border-b border-border">จำนวนที่ได้ระดับ 3</td>
              {matrixSubjects.map(sub => <td key={sub} className="text-center text-green-500 p-1 border-b border-border">{getFooterStats(sub).count3}</td>)}
              <td className="text-center text-green-500 p-1 font-black border-b border-border">{getOverallStats().totalCount3}</td>
              <td className="border-b border-border"></td>
            </tr>
            <tr className="bg-slate-50 font-extrabold">
              <td colSpan={2} className="p-1 text-[0.7rem] border-b border-border">จำนวนที่ได้ระดับ 2</td>
              {matrixSubjects.map(sub => <td key={sub} className="text-center text-blue-500 p-1 border-b border-border">{getFooterStats(sub).count2}</td>)}
              <td className="text-center text-blue-500 p-1 font-black border-b border-border">{getOverallStats().totalCount2}</td>
              <td className="border-b border-border"></td>
            </tr>
            <tr className="bg-slate-100 font-black">
              <td colSpan={2} className="p-1 text-[0.7rem] border-b border-border">รวมระดับ 3+2</td>
              {matrixSubjects.map(sub => <td key={sub} className="text-center bg-white p-1 border-b border-border">{getFooterStats(sub).sum32}</td>)}
              <td className="text-center bg-white p-1 font-black border-b border-border">{getOverallStats().totalSum32}</td>
              <td className="border-b border-border"></td>
            </tr>
            <tr className="bg-gradient-to-r from-primary to-primary-hover text-white font-black">
              <td colSpan={2} className="p-1 text-[0.7rem]">ร้อยละ (3+2)</td>
              {matrixSubjects.map(sub => <td key={sub} className="text-center p-1">{getFooterStats(sub).percent}%</td>)}
              <td colSpan={2} className="text-center p-1 text-sm">{getOverallStats().avgPercent}%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default SubjectMatrixTable;
