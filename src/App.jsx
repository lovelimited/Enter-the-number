import React, { useState, useEffect } from 'react';
import { SUBJECTS, GRADES } from './constants/subjects';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { API_URL } from './constants/api';

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!API_URL) return;
      
      // Create fallback empty summary
      const emptySummary = {};
      SUBJECTS.filter(s => s !== "รวมเฉลี่ยทั้งหมด").forEach(s => {
        emptySummary[s] = {};
        GRADES.forEach(g => emptySummary[s][g] = 0);
      });
      
      try {
        const response = await fetch(`${API_URL}?action=get_login_summary`);
        const data = await response.json();
        if (!data.error) {
          setSummary(data);
        } else {
          console.warn("API returned error:", data.error);
          setSummary(emptySummary);
        }
      } catch (err) {
        console.error("Failed to fetch summary:", err);
        setSummary(emptySummary);
      }
    };
    fetchSummary();
  }, []);

  const handleLogin = (subject) => {
    setIsLoading(true);
    setTimeout(() => {
      setUser({ subject });
      setIsLoading(false);
    }, 600);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
      {!user ? (
        <Login onLogin={handleLogin} isLoading={isLoading} summary={summary} />
      ) : (
        <Dashboard subject={user.subject} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
