import React, { useState, useEffect } from 'react';

const formatMoney = (val) => {
  const sign = val >= 0 ? '+' : '-';
  return `${sign}₹${Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

export default function HistoryView() {
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.custom-year-dropdown')) {
        setShowYearDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch History once on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/public/history');
        const data = await res.json();
        if (data.success) {
          setHistoryData(data);
        }
      } catch (err) {
        console.error('Failed to fetch history data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
  }, []);

  if (loading && !historyData) {
    return <div className="loader">Loading secure data...</div>;
  }

  if (!historyData) {
    return <div className="loader">Waiting for data...</div>;
  }

  // Global Max PnL for scaling across all months
  let globalMaxAbsPnl = 1;
  historyData.trades.forEach(t => {
    if (Math.abs(t.pnl) > globalMaxAbsPnl) globalMaxAbsPnl = Math.abs(t.pnl);
  });

  const getDotSize = (pnl) => {
    const minSize = 4;
    const maxSize = 16; 
    const ratio = Math.abs(pnl) / globalMaxAbsPnl;
    return minSize + (maxSize - minSize) * ratio;
  };

  // 5 months to display (currentDate is in the center)
  const displayMonths = [
    new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1),
    new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    currentDate,
    new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 1)
  ];

  // All trades for the visible 5 months (used by calendar grid)
  const carouselTrades = historyData.trades.filter(t => {
    const d = new Date(t.date);
    const dTime = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    return dTime >= displayMonths[0].getTime() && dTime <= displayMonths[4].getTime();
  });

  // All trades for the single selected month (used by the table)
  const tableTrades = historyData.trades.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth();
  });

  // Generate available years for the dropdown (min 3 years past, up to current year, plus any data years)
  const dataYears = historyData.trades.map(t => new Date(t.date).getFullYear());
  const maxYear = Math.max(new Date().getFullYear(), ...dataYears);
  const minYear = Math.min(new Date().getFullYear() - 3, ...dataYears);
  
  const availableYears = [];
  for (let y = maxYear; y >= minYear; y--) {
    availableYears.push(y);
  }

  // Compute 12 month stats for the current year
  const currentYear = currentDate.getFullYear();
  const monthStats = Array.from({length: 12}, (_, i) => {
    const date = new Date(currentYear, i, 1);
    const monthStr = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const shortName = date.toLocaleDateString('en-IN', { month: 'short' });
    
    const pnl = historyData.trades
      .filter(t => new Date(t.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) === monthStr)
      .reduce((sum, t) => sum + t.pnl, 0);

    return { monthStr, shortName, pnl };
  });

  return (
    <div className="view-container">
      <div style={{display: 'flex', justifyContent: 'flex-end', paddingBottom: '10px'}}>
        <div className="global-disclaimer" style={{ marginBottom: 0, padding: '4px 10px', fontSize: '0.75rem' }}>
          * P&L is exclusive of all charges
        </div>
      </div>
      {/* 1. Month Navigation Grid */}
      <div className="months-grid">
        <div className="month-box custom-year-dropdown" style={{cursor: 'pointer', background: 'var(--bg-app)', padding: '12px 2px', boxShadow: 'none', position: 'relative'}} onClick={() => setShowYearDropdown(!showYearDropdown)}>
          <h4 style={{color: 'var(--text-primary)', marginBottom: '6px', pointerEvents: 'none'}}>YEAR</h4>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            fontWeight: '800',
            pointerEvents: 'none'
          }}>
            {currentYear}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showYearDropdown ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
          
          {showYearDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginTop: '4px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid var(--border-card)',
              borderRadius: '12px',
              padding: '8px 0',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 50,
              minWidth: '100px',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              {availableYears.map(year => (
                <div 
                  key={year}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentDate(new Date(parseInt(year), currentDate.getMonth(), 1));
                    setShowYearDropdown(false);
                  }}
                  style={{
                    padding: '10px 16px',
                    fontSize: '0.95rem',
                    fontWeight: year === currentYear ? '800' : '600',
                    color: year === currentYear ? 'var(--accent-blue)' : 'var(--text-primary)',
                    background: year === currentYear ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => { if (year !== currentYear) e.currentTarget.style.background = 'rgba(0,0,0,0.03)' }}
                  onMouseOut={(e) => { if (year !== currentYear) e.currentTarget.style.background = 'transparent' }}
                >
                  {year}
                </div>
              ))}
            </div>
          )}
        </div>

        {monthStats.map((stat, idx) => (
            <div 
              key={stat.monthStr} 
              className="month-box"
              onClick={() => setCurrentDate(new Date(currentYear, idx, 1))}
            >
              <h4>{stat.shortName}</h4>
              <p className={stat.pnl > 0 ? 'text-profit' : (stat.pnl < 0 ? 'text-loss' : '')} style={{color: stat.pnl === 0 ? 'var(--text-secondary)' : undefined}}>
                {stat.pnl === 0 ? '-' : formatMoney(stat.pnl)}
              </p>
            </div>
        ))}

        <div className="month-box" style={{cursor: 'default', background: 'var(--bg-app)', boxShadow: 'none'}}>
          <h4 style={{color: 'var(--text-primary)'}}>TOTAL</h4>
          <p className={monthStats.reduce((sum, s) => sum + s.pnl, 0) > 0 ? 'text-profit' : (monthStats.reduce((sum, s) => sum + s.pnl, 0) < 0 ? 'text-loss' : '')} style={{color: monthStats.reduce((sum, s) => sum + s.pnl, 0) === 0 ? 'var(--text-secondary)' : undefined}}>
            {monthStats.reduce((sum, s) => sum + s.pnl, 0) === 0 ? '-' : formatMoney(monthStats.reduce((sum, s) => sum + s.pnl, 0))}
          </p>
        </div>
      </div>

      {/* 2. Calendar Carousel */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', width: '100%' }}>
        <button className="nav-arrow" style={{flexShrink: 0}} onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>&#10094;</button>

        <div className="calendars-wrapper">
          {displayMonths.map((dObj, idx) => {
            const year = dObj.getFullYear();
            const month = dObj.getMonth();
            const firstDay = new Date(year, month, 1).getDay(); // 0-6
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            const tradesByDay = {};
            carouselTrades.forEach(t => {
              const d = new Date(t.date);
              if (d.getFullYear() === year && d.getMonth() === month) {
                tradesByDay[d.getDate()] = (tradesByDay[d.getDate()] || 0) + t.pnl;
              }
            });

            const cells = [];
            for (let i = 0; i < firstDay; i++) {
              cells.push(<div key={`empty-${i}`} className="calendar-cell empty"></div>);
            }
            for (let i = 1; i <= daysInMonth; i++) {
              const pnl = tradesByDay[i];
              let dot = null;
              if (pnl !== undefined) {
                const size = getDotSize(pnl);
                dot = <div className={`dot ${pnl >= 0 ? 'profit' : 'loss'}`} style={{width: `${size}px`, height: `${size}px`}}></div>;
              }
              cells.push(
                <div key={`day-${i}`} className="calendar-cell">
                  {dot}
                  <span className="tooltip">
                    {pnl !== undefined ? (
                      <>
                        <span style={{color: 'var(--text-secondary)', fontWeight: 'normal', marginRight: '6px'}}>{i} {dObj.toLocaleDateString('en-IN', { month: 'short' })}</span>
                        {formatMoney(pnl)}
                      </>
                    ) : (
                      <span>{i} {dObj.toLocaleDateString('en-IN', { month: 'short' })}</span>
                    )}
                  </span>
                </div>
              );
            }

            return (
              <div key={idx} className="calendar-month">
                <div className="calendar-header" style={{marginBottom: '20px'}}>
                  <h3>{dObj.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h3>
                </div>
                <div className="calendar-grid">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div key={i} className="calendar-day-header">{day}</div>
                  ))}
                  {cells}
                </div>
              </div>
            );
          })}
        </div>

        <button className="nav-arrow" style={{flexShrink: 0}} onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>&#10095;</button>
      </div>



      {/* 4. Table */}
      <div className="table-container">
        <table className="history-table">
          <thead>
            <tr>
              <th style={{width: '50px'}}>Sl No</th>
              <th>Date</th>
              <th>Min MTM</th>
              <th>Max MTM</th>
              <th>Total P&L</th>
            </tr>
          </thead>
          <tbody>
            {tableTrades.map((trade, idx) => (
              <tr key={idx}>
                <td style={{color: 'var(--text-secondary)'}}>{idx + 1}</td>
                <td>{new Date(trade.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td className="text-loss">{Number(trade.min_mtm).toFixed(2)}</td>
                <td className="text-profit">{Number(trade.max_mtm).toFixed(2)}</td>
                <td>
                  <span className={trade.pnl >= 0 ? 'text-profit' : 'text-loss'} style={{fontWeight: '700'}}>
                    {formatMoney(trade.pnl)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tableTrades.length === 0 && (
          <div style={{textAlign: 'center', padding: '30px', color: 'var(--text-secondary)'}}>
            No historical data found for {currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}.
          </div>
        )}
      </div>
    </div>
  );
}
