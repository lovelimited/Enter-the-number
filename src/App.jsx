import React, { useState, useEffect } from 'react';
import { KeyRound } from 'lucide-react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CurriculumManager from './components/CurriculumManager';
import { API_URL } from './constants/api';
import { FALLBACK_SUBJECTS, GRADES } from './constants/subjects';

function App() {
  const [user, setUser] = useState(null); // { subject: "...", term: "..." }
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [curriculum, setCurriculum] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [currentPage, setCurrentPage] = useState("login"); // "login" | "dashboard" | "curriculum"
  
  const [hasAccess, setHasAccess] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('app_access') === 'granted') {
      setHasAccess(true);
    }
  }, []);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === 'ktw118') {
      localStorage.setItem('app_access', 'granted');
      setHasAccess(true);
    } else {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 3000);
    }
  };

  const fetchInitData = async () => {
    if (!API_URL) return;
    try {
      const res = await fetch(`${API_URL}?action=get_init_data`);
      const data = await res.json();
      if (!data.error) {
        if (data.metrics) setMetrics(data.metrics);
        if (data.curriculum) setCurriculum(data.curriculum);
        if (data.summary) setSummary(data.summary);
      } else {
        console.warn("API returned error:", data.error);
        setSummary({});
      }
    } catch (error) {
      console.error("Error fetching init data:", error);
      setSummary({});
    }
  };

  // Load summary, curriculum & metrics on mount
  useEffect(() => {
    fetchInitData();
  }, []);

  const handleLogin = (subject, term) => {
    setIsLoading(true);
    setTimeout(() => {
      setUser({ subject, term });
      setCurrentPage("dashboard");
      setIsLoading(false);
    }, 600);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage("login");
    setSummary(null);
    fetchInitData();
  };

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <form 
          onSubmit={handlePasswordSubmit} 
          className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-soft border border-border w-full max-w-md fade-in"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary-light text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <KeyRound size={32} />
            </div>
            <h1 className="text-2xl font-black text-text-main">ยืนยันสิทธิ์เข้าใช้งาน</h1>
            <p className="text-text-muted mt-2 text-sm">ระบบต้องการรหัสผ่านสำหรับการเข้าใช้งานในครั้งแรก</p>
          </div>
          
          <div className="mb-6">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="รหัสผ่าน (Password)"
              className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all ${
                passwordError ? 'border-danger bg-red-50' : 'border-border focus:border-primary'
              }`}
              autoFocus
            />
            {passwordError && (
              <p className="text-danger text-sm mt-2 text-center font-semibold">รหัสผ่านไม่ถูกต้อง</p>
            )}
          </div>
          
          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-br from-primary to-primary-hover text-white rounded-xl font-bold transition-all hover:-translate-y-0.5 hover:shadow-glow-primary"
          >
            เข้าสู่ระบบ
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {currentPage === "login" && (
        <Login 
          onLogin={handleLogin} 
          isLoading={isLoading} 
          summary={summary} 
          curriculum={curriculum}
          metrics={metrics}
          onManageCurriculum={() => setCurrentPage("curriculum")}
        />
      )}
      
      {currentPage === "dashboard" && user && (
        <Dashboard 
          subject={user.subject} 
          term={user.term}
          onLogout={handleLogout} 
          curriculum={curriculum}
          metrics={metrics}
          summary={summary}
        />
      )}

      {currentPage === "curriculum" && (
        <CurriculumManager
          curriculum={curriculum}
          setCurriculum={setCurriculum}
          onBack={() => setCurrentPage("login")}
          apiUrl={API_URL}
        />
      )}
    </div>
  );
}

export default App;
