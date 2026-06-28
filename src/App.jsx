import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import LiveView from './components/LiveView';
import HistoryView from './components/HistoryView';

const TelegramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 14.4l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.159z"/>
  </svg>
);

function App() {
  return (
    <>
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1 className="header-title">NIFTY DYNAMIC</h1>
            <p className="header-subtitle">Live Performance Tracker</p>
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

          {/* Desktop-only contact details in header */}
          <div className="contact-details contact-desktop">
            <a href="https://t.me/rb_algo" target="_blank" rel="noopener noreferrer" className="contact-item contact-telegram">
              <span className="contact-icon"><TelegramIcon /></span>
              <span className="contact-text">Join Our Telegram Channel</span>
            </a>
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

      {/* Mobile sticky footer */}
      <footer className="mobile-footer">
        <a href="https://t.me/rb_algo" target="_blank" rel="noopener noreferrer" className="footer-btn footer-telegram">
          <span className="footer-icon"><TelegramIcon /></span>
          <span className="footer-value">Join Our Telegram Channel</span>
        </a>
      </footer>

      <Analytics />
    </>
  );
}

export default App;
