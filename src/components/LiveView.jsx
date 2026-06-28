import React, { useState, useEffect } from 'react';

const formatMoney = (val) => {
  return `${val < 0 ? '-' : ''}₹${Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

export default function LiveView() {
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Poll Live Data every 3 seconds
  useEffect(() => {
    let interval;
    const fetchLive = async () => {
      try {
        const res = await fetch('/api/public/live-mtm');
        const data = await res.json();
        if (data.success) {
          setLiveData(data);
        }
      } catch (err) {
        console.error('Failed to fetch live data');
      } finally {
        setLoading(false);
      }
    };

    fetchLive();
    interval = setInterval(fetchLive, 3000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading && !liveData) {
    return <div className="loader">Loading live market data...</div>;
  }

  if (!liveData) {
    return <div className="loader">Waiting for data...</div>;
  }

  const isActive = () => {
    const status = (liveData.status || '').toLowerCase();
    const closedStatuses = ['exited', 'target_reached', 'stop_loss', 'end_of_day', 'square_off'];
    return !closedStatuses.includes(status);
  };

  const getStatusText = () => {
    return isActive() ? 'LIVE - IN TRADE' : 'STRATEGY CLOSED';
  };

  return (
    <div className="view-container live-centered" style={{ position: 'relative', width: '100%' }}>
      <div className="live-top-bar">
        <h1 className="live-title">
          NIFTY 50 <span style={{ opacity: 0.3, margin: '0 8px' }}>·</span> CAPITAL: ₹2,00,000
        </h1>
        <div className="global-disclaimer" style={{ margin: 0, padding: '4px 10px', fontSize: '0.75rem' }}>
          * P&L is exclusive of all charges
        </div>
      </div>
      <div className="live-mtm-display">
        <div className={`status-badge ${isActive() ? 'status-active' : 'status-idle'}`}>
          {isActive() && <span className="blinker"></span>}
          {getStatusText()}
        </div>
        <p style={{color: 'var(--text-tertiary)', fontSize: '1rem', marginBottom: '32px', marginTop: '16px', fontWeight: '600'}}>
          {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
        <p style={{color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.85rem', fontWeight: '700', marginBottom: '5px'}}>Current MTM</p>
        <h2 className={liveData.mtm >= 0 ? 'profit' : 'loss'}>
          {formatMoney(liveData.mtm)}
        </h2>
      </div>
      
      <div className="stats-row">
        <div className="stat-box">
          <p>Highest MTM (Today)</p>
          <h3 className="text-profit">{formatMoney(liveData.max_mtm)}</h3>
        </div>
        <div className="stat-box">
          <p>Lowest MTM (Today)</p>
          <h3 className="text-loss">{formatMoney(liveData.min_mtm)}</h3>
        </div>
      </div>
    </div>
  );
}
