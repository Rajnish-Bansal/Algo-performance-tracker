import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import LiveView from './components/LiveView';
import HistoryView from './components/HistoryView';

function App() {
  return (
    <>
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1 style={{margin: 0, fontSize: '1.8rem', letterSpacing: '1px'}}>NIFTY DYNAMIC</h1>
            <p style={{margin: '5px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '2px'}}>Live Performance Tracker</p>
          </div>

          <div className="tabs" style={{margin: 0, width: '400px'}}>
            <NavLink 
              to="/live" 
              className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}
            >
              Live MTM
            </NavLink>
            <NavLink 
              to="/history" 
              className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}
            >
              Historical Records
            </NavLink>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="glass-panel" style={{width: '100%'}}>
          <Routes>
            <Route path="/live" element={<LiveView />} />
            <Route path="/history" element={<HistoryView />} />
            <Route path="/" element={<Navigate to="/live" replace />} />
          </Routes>
        </div>
      </main>
      <Analytics />
    </>
  );
}

export default App;
