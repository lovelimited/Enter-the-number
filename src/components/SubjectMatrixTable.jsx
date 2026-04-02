import React from 'react';
import { SUBJECTS } from '../constants/subjects';

function SubjectMatrixTable({ students, categoryKey, title }) {
  if (!students || students.length === 0) {
    return (
      <div className="card" style={{ padding: '2rem', marginBottom: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
        <p>{title}</p>
        <p style={{ fontSize: '0.85rem' }}>ยังไม่มีข้อมูลการประเมินในระดับชั้นนี้</p>
      </div>
    );
  }

  // Filter out the summary subject from columns
  const matrixSubjects = SUBJECTS.filter(s => s !== "รวมเฉลี่ยทั้งหมด");

  const getLevelColor = (level) => {
    switch (level) {
      case "3": return "#22c55e"; // Green
      case "2": return "#3b82f6"; // Blue
      case "1": return "#eab308"; // Yellow
      case "0": return "#ef4444"; // Red
      default: return "#f1f5f9"; // Gray/Empty
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

  // Calculate overall stats across all subjects
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
    
    return { 
      totalCount3, 
      totalCount2, 
      totalSum32, 
      avgPercent,
      subjectCount 
    };
  };

  return (
    <div className="card fade-in print-section" style={{ padding: '1rem', marginBottom: '1rem', overflow: 'visible' }}>
      <h3 className="print-title-only" style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.75rem', color: 'var(--text)' }}>
        {title}
      </h3>
      <div className="table-container" style={{ overflowX: 'visible' }}>
        <table style={{ minWidth: 'auto', fontSize: '0.7rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ width: '30px', padding: '0.25rem' }}>ที่</th>
              <th style={{ width: '120px', padding: '0.25rem' }}>ชื่อ-สกุล</th>
              {matrixSubjects.map(sub => (
                <th key={sub} style={{ 
                  writingMode: 'vertical-rl', 
                  transform: 'rotate(180deg)', 
                  padding: '0.5rem 0.25rem',
                  fontSize: '0.65rem',
                  whiteSpace: 'nowrap',
                  height: '100px',
                  textAlign: 'left',
                  maxWidth: '40px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }} title={sub}>
                  {sub.length > 15 ? sub.substring(0, 12) + '...' : sub}
                </th>
              ))}
              <th style={{ background: '#f1f5f9', fontWeight: '900', textAlign: 'center', padding: '0.25rem', width: '35px' }}>รวม</th>
              <th style={{ background: 'var(--primary)', color: '#fff', fontWeight: '900', textAlign: 'center', padding: '0.25rem', width: '35px' }}>ระดับ</th>
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
                <tr key={student.ID}>
                  <td style={{ textAlign: 'center', padding: '0.15rem', verticalAlign: 'middle', height: '24px' }}>{idx + 1}</td>
                  <td style={{ fontWeight: '600', padding: '0.15rem', fontSize: '0.75rem', verticalAlign: 'middle', height: '24px' }}>{student.Name}</td>
                  {matrixSubjects.map(sub => {
                    const level = student.Subjects?.[sub]?.[categoryKey];
                    // ไม่แสดงค่า 0 ให้เห็น (แสดงเป็นช่องว่างแทน)
                    const displayLevel = level === "0" ? "" : level;
                    return (
                      <td key={sub} style={{ padding: '1px', textAlign: 'center' }}>
                        <span className={`level-${displayLevel || 'empty'}`} style={{
                          display: 'inline-block',
                          width: '22px',
                          height: '22px',
                          lineHeight: '22px',
                          borderRadius: '3px',
                          background: displayLevel ? getLevelColor(displayLevel) : 'transparent',
                          color: displayLevel ? '#fff' : 'transparent',
                          fontWeight: '900',
                          fontSize: '0.75rem'
                        }}>
                          {displayLevel || ""}
                        </span>
                      </td>
                    );
                  })}
                  <td style={{ textAlign: 'center', fontWeight: '900', background: '#f8fafc', padding: '0.15rem', verticalAlign: 'middle', height: '24px' }}>{rowSum}</td>
                  <td style={{ textAlign: 'center', fontWeight: '900', background: getLevelColor(rowLevel), color: rowLevel ? '#fff' : 'transparent', padding: '0.15rem', verticalAlign: 'middle', height: '24px' }}>
                    {rowLevel}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f8fafc', fontWeight: '800' }}>
               <td colSpan={2} style={{ padding: '0.35rem', fontSize: '0.7rem' }}>จำนวนที่ได้ระดับ 3</td>
               {matrixSubjects.map(sub => <td key={sub} style={{ textAlign: 'center', color: '#22c55e', padding: '0.35rem' }}>{getFooterStats(sub).count3}</td>)}
               <td style={{ textAlign: 'center', color: '#22c55e', padding: '0.35rem', fontWeight: '900' }}>{getOverallStats().totalCount3}</td>
               <td></td>
            </tr>
            <tr style={{ background: '#f8fafc', fontWeight: '800' }}>
               <td colSpan={2} style={{ padding: '0.35rem', fontSize: '0.7rem' }}>จำนวนที่ได้ระดับ 2</td>
               {matrixSubjects.map(sub => <td key={sub} style={{ textAlign: 'center', color: '#3b82f6', padding: '0.35rem' }}>{getFooterStats(sub).count2}</td>)}
               <td style={{ textAlign: 'center', color: '#3b82f6', padding: '0.35rem', fontWeight: '900' }}>{getOverallStats().totalCount2}</td>
               <td></td>
            </tr>
            <tr style={{ background: '#f1f5f9', fontWeight: '900' }}>
               <td colSpan={2} style={{ padding: '0.35rem', fontSize: '0.7rem' }}>รวมระดับ 3+2</td>
               {matrixSubjects.map(sub => <td key={sub} style={{ textAlign: 'center', background: '#fff', padding: '0.35rem' }}>{getFooterStats(sub).sum32}</td>)}
               <td style={{ textAlign: 'center', background: '#fff', padding: '0.35rem', fontWeight: '900' }}>{getOverallStats().totalSum32}</td>
               <td></td>
            </tr>
            <tr style={{ background: 'var(--primary)', color: '#fff', fontWeight: '900' }}>
               <td colSpan={2} style={{ padding: '0.35rem', fontSize: '0.7rem' }}>ร้อยละ (3+2)</td>
               {matrixSubjects.map(sub => <td key={sub} style={{ textAlign: 'center', padding: '0.35rem' }}>{getFooterStats(sub).percent}%</td>)}
               <td colSpan={2} style={{ textAlign: 'center', padding: '0.35rem', fontSize: '0.85rem' }}>{getOverallStats().avgPercent}%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default SubjectMatrixTable;
