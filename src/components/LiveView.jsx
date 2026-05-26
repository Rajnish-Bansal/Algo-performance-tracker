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
    <div className="view-container">
      <div className="live-mtm-display">
        <div className={`status-badge ${isActive() ? 'status-active' : 'status-idle'}`}>
          {getStatusText()}
        </div>
        <p style={{color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.85rem', marginBottom: '10px'}}>Current MTM</p>
        <h2 className={liveData.mtm >= 0 ? 'profit' : 'loss'}>
          {formatMoney(liveData.mtm)}
        </h2>
      </div>
      
      <div className="stats-row">
        <div className="stat-box">
          <p>Max Profit</p>
          <h3 className="text-profit">{formatMoney(liveData.max_mtm)}</h3>
        </div>
        <div className="stat-box">
          <p>Max Loss</p>
          <h3 className="text-loss">{formatMoney(liveData.min_mtm)}</h3>
        </div>
      </div>
    </div>
  );
}
