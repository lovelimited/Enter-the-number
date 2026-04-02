import React from 'react';
import { SUBJECTS, GRADES } from '../constants/subjects';
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp } from 'lucide-react';

function SummaryDashboard({ summary, onSelectSubject }) {
  // progressColor returns a color based on the percentage
  const getProgressColor = (percent) => {
    if (percent === 100) return '#10b981'; // Green
    if (percent > 0) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  if (!summary) return (
     <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>กำลังโหลดสรุปภาพรวม...</div>
  );

  const totalProgress = Object.values(summary).reduce((acc, subj) => {
    const subjAvg = Object.values(subj).reduce((a, b) => a + b, 0) / GRADES.length;
    return acc + subjAvg;
  }, 0) / SUBJECTS.length;

  return (
    <div className="card fade-in" style={{ height: 'fit-content', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>สรุปความคืบหน้าทั้งโรงเรียน</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>ภาพรวมการกรอกข้อมูล 16 วิชา (ม.1 - ม.6)</p>
        </div>
        <div style={{ textAlign: 'right' }}>
           <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--primary)' }}>{Math.round(totalProgress)}%</div>
           <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>ภาพรวมสะสม</div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'separate', borderSpacing: '0 4px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.5rem', background: 'transparent', color: 'var(--text-muted)' }}>วิชา</th>
              {GRADES.map(g => (
                <th key={g} style={{ textAlign: 'center', padding: '0.5rem', background: 'transparent', color: 'var(--text-muted)' }}>{g}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SUBJECTS.map(subject => (
              <tr key={subject} style={{ background: '#f8fafc', overflow: 'hidden' }}>
                <td 
                  onClick={() => onSelectSubject(subject)}
                  style={{ 
                    padding: '0.75rem 1rem', 
                    fontWeight: '600', 
                    borderRadius: '0.5rem 0 0 0.5rem',
                    cursor: 'pointer',
                    color: 'var(--primary)',
                    maxWidth: '180px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  title={subject}
                >
                  {subject}
                </td>
                {GRADES.map(grade => {
                   const progress = summary[subject]?.[grade] || 0;
                   return (
                      <td key={grade} style={{ textAlign: 'center', padding: '0.5rem' }}>
                         <div 
                           title={`${subject} ${grade}: ${progress}%`}
                           style={{ 
                            width: '28px', 
                            height: '28px', 
                            borderRadius: '6px', 
                            background: getProgressColor(progress),
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '0.6rem',
                            fontWeight: 'bold',
                            boxShadow: progress > 0 ? `0 0 10px ${getProgressColor(progress)}44` : 'none'
                           }}
                         >
                           {progress > 0 ? `${progress}%` : '0'}
                         </div>
                      </td>
                   );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f1f5f9', borderRadius: '0.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ef4444' }}></div> ห้ามกรอก (0%)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f59e0b' }}></div> กำลังดำเนินการ
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981' }}></div> เรียบร้อย (100%)
        </div>
      </div>
    </div>
  );
}

export default SummaryDashboard;
