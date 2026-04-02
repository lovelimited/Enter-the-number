import React, { useState } from 'react';
import { SUBJECTS } from '../constants/subjects';
import { GraduationCap, LogIn } from 'lucide-react';
import SummaryDashboard from './SummaryDashboard';

function Login({ onLogin, isLoading, summary }) {
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(selectedSubject);
  };

  const handleSelectFromSummary = (subject) => {
    setSelectedSubject(subject);
    const formElement = document.getElementById('login-form');
    if (formElement) {
       formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="container fade-in" style={{ 
      display: 'grid', 
      gridTemplateColumns: 'minmax(0, 1fr) 400px', 
      gap: '2.5rem', 
      paddingTop: '3rem',
      alignItems: 'start'
    }}>
      
      {/* Left Column: School Summary */}
      <div>
        <SummaryDashboard summary={summary} onSelectSubject={handleSelectFromSummary} />
      </div>

      {/* Right Column: Login Form */}
      <div id="login-form" className="card" style={{ padding: '2.5rem', background: '#fff', position: 'sticky', top: '2rem' }}>
        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', background: '#eff6ff', padding: '1.25rem', borderRadius: '1.5rem', marginBottom: '1rem' }}>
              <GraduationCap size={48} style={{ color: 'var(--primary)' }} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '0.25rem' }}>
            เข้าสู่ระบบ
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>เลืออกวิชาเพื่อเริ่มการบันทึกผล</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              วิชาที่รับผิดชอบ
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '0.75rem',
                background: '#f8fafc',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                fontSize: '1rem',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1.1rem', borderRadius: '0.8rem' }}>
            {isLoading ? 'กำลังเข้าสู่ระบบ...' : <><LogIn size={20} /> เข้าสู่ระบบบันทึกผล</>}
          </button>
        </form>

        <div style={{ marginTop: '2rem', padding: '1rem', border: '1px dashed var(--border)', borderRadius: '0.5rem', textAlign: 'center' }}>
           <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              คะแนน 1: ปรับปรุง | 2: พอใช้ | 3: ดี
           </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
