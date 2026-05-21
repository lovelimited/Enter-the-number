import React, { useState } from 'react';
import { GRADES, TERMS, getSubjectsByTerm } from '../constants/subjects';
import { GraduationCap, LogIn, Settings, BookOpen } from 'lucide-react';
import SummaryDashboard from './SummaryDashboard';

function Login({ onLogin, isLoading, summary, curriculum, onManageCurriculum }) {
  const [selectedTerm, setSelectedTerm] = useState(TERMS[0]);
  const [selectedSubject, setSelectedSubject] = useState('');

  // ดึงวิชาตามเทอม
  const subjects = getSubjectsByTerm(curriculum, selectedTerm);
  // ดึง terms จาก curriculum (หรือใช้ default)
  const availableTerms = TERMS;

  // ตั้งค่าวิชาเริ่มต้นเมื่อเปลี่ยนเทอม
  React.useEffect(() => {
    const subs = getSubjectsByTerm(curriculum, selectedTerm);
    if (subs.length > 0 && !subs.includes(selectedSubject)) {
      setSelectedSubject(subs[0]);
    }
  }, [selectedTerm, curriculum]);

  // ตั้งค่าเริ่มต้นครั้งแรก
  React.useEffect(() => {
    if (!selectedSubject && subjects.length > 0) {
      setSelectedSubject(subjects[0]);
    }
  }, [subjects]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(selectedSubject, selectedTerm);
  };

  const handleSelectFromSummary = (subject) => {
    setSelectedSubject(subject);
    const formElement = document.getElementById('login-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6 fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">
        
        {/* Left Column: School Summary */}
        <div>
          <SummaryDashboard 
            summary={summary} 
            onSelectSubject={handleSelectFromSummary}
            subjects={subjects}
            selectedTerm={selectedTerm}
            onTermChange={setSelectedTerm}
            terms={availableTerms}
            curriculum={curriculum}
          />
        </div>

        {/* Right Column: Login Form */}
        <div id="login-form" className="bg-white/95 backdrop-blur-sm border border-border rounded-2xl p-8 shadow-soft sticky top-6 transition-all hover:shadow-medium">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex bg-primary-light p-5 rounded-2xl mb-4">
              <GraduationCap size={48} className="text-primary" />
            </div>
            <h1 className="text-2xl font-black text-text-main mb-1">
              เข้าสู่ระบบ
            </h1>
            <p className="text-text-muted text-sm">เลือกเทอมและวิชาเพื่อเริ่มบันทึกผล</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* เลือกเทอม */}
            <div className="text-left">
              <label className="block mb-2 text-xs font-bold text-text-muted uppercase tracking-wide">
                <BookOpen size={14} className="inline mr-1.5 -mt-0.5" />
                เทอม
              </label>
              <div className="flex gap-2">
                {availableTerms.map(term => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setSelectedTerm(term)}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-200 border-2 cursor-pointer ${
                      selectedTerm === term
                        ? 'bg-gradient-to-br from-primary to-primary-hover text-white border-transparent shadow-glow-primary'
                        : 'bg-surface-hover text-text-muted border-border hover:border-primary/30'
                    }`}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>

            {/* เลือกวิชา */}
            <div className="text-left">
              <label className="block mb-2 text-xs font-bold text-text-muted uppercase tracking-wide">
                วิชาที่รับผิดชอบ
              </label>
              <select
                id="subject-select"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-surface-hover text-text-main border border-border text-base cursor-pointer font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              >
                {subjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* ปุ่มเข้าสู่ระบบ */}
            <button 
              type="submit" 
              disabled={isLoading || !selectedSubject}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-lg bg-gradient-to-br from-primary to-primary-hover text-white border-0 cursor-pointer transition-all duration-200 hover:shadow-glow-primary hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {isLoading ? 'กำลังเข้าสู่ระบบ...' : <><LogIn size={20} /> เข้าสู่ระบบบันทึกผล</>}
            </button>

            {/* ปุ่มรวมเฉลี่ย */}
            <button
              type="button"
              onClick={() => onLogin('รวมเฉลี่ยทั้งหมด', selectedTerm)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-gradient-to-br from-pink-500 to-pink-700 text-white border-0 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            >
              📊 ดูรวมเฉลี่ยทั้งหมด
            </button>
          </form>

          {/* จัดการโครงสร้างเวลาเรียน */}
          <button
            onClick={onManageCurriculum}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-text-muted bg-surface-hover border border-border cursor-pointer transition-all hover:bg-primary-light hover:text-primary hover:border-primary/30"
          >
            <Settings size={16} />
            จัดการโครงสร้างเวลาเรียน
          </button>

          {/* คำอธิบาย */}
          <div className="mt-5 p-3.5 border border-dashed border-border rounded-lg text-center">
            <p className="text-xs text-text-muted">
              คะแนน 1: ปรับปรุง | 2: พอใช้ | 3: ดี
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
