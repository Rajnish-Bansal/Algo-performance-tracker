import React, { useState, useEffect, useMemo } from 'react';

const fmt = (val) =>
  `${val < 0 ? '-' : ''}₹${Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const StatCard = ({ label, value, sub, color = 'neutral', wide = false }) => (
  <div className={`stat-card ${wide ? 'stat-card-wide' : ''}`}>
    <div className="stat-card-body">
      <p className="stat-card-label">{label}</p>
      <h3 className={`stat-card-value ${color === 'green' ? 'text-profit' : color === 'red' ? 'text-loss' : ''}`}>
        {value}
      </h3>
      {sub && <p className="stat-card-sub">{sub}</p>}
    </div>
  </div>
);

export default function StatsView() {
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [dateFilter, setDateFilter] = useState('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // 1. Fetch raw data once
  useEffect(() => {
    fetch('/api/public/history')
      .then(r => r.json())
      .then(res => {
        if (res.success && res.trades) {
          // Sort trades chronologically (oldest first) for accurate drawdown/streak calculations
          const sortedTrades = res.trades.sort((a, b) => new Date(a.date) - new Date(b.date));
          setHistoryData(sortedTrades);
        } else {
          setError('Failed to load history data');
        }
      })
      .catch(() => setError('Could not reach server'))
      .finally(() => setLoading(false));
  }, []);

  // 2. Filter data based on selected range
  const filteredTrades = useMemo(() => {
    if (!historyData) return [];
    
    return historyData.filter(trade => {
      const d = new Date(trade.date);
      const year = d.getFullYear();
      
      if (dateFilter === 'ALL') return true;
      if (dateFilter === '2026') return year === 2026;
      if (dateFilter === '2025') return year === 2025;
      
      if (dateFilter === 'CUSTOM') {
        const tTime = d.getTime();
        const sTime = customStart ? new Date(customStart).getTime() : 0;
        const eTime = customEnd ? new Date(customEnd).setHours(23, 59, 59, 999) : Infinity;
        return tTime >= sTime && tTime <= eTime;
      }
      
      return true;
    });
  }, [historyData, dateFilter, customStart, customEnd]);

  // 3. Mathematical Engine (Calculates stats dynamically)
  const stats = useMemo(() => {
    if (!filteredTrades || filteredTrades.length === 0) return null;

    const CAPITAL_REQUIRED = 200000;
    const pnls = filteredTrades.map(t => parseFloat(t.pnl) || 0);
    const totalTrades = pnls.length;

    // Basic aggregates
    const wins = pnls.filter(p => p > 0);
    const losses = pnls.filter(p => p < 0);
    const winRate = (wins.length / totalTrades) * 100;
    const totalPnl = pnls.reduce((a, b) => a + b, 0);
    const avgDailyPnl = totalPnl / totalTrades;
    
    let maxProfit = -Infinity;
    let maxLoss = Infinity;
    let maxProfitDate = null;
    let maxLossDate = null;

    filteredTrades.forEach(t => {
      const p = parseFloat(t.pnl) || 0;
      if (p > maxProfit) {
        maxProfit = p;
        maxProfitDate = new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      if (p < maxLoss) {
        maxLoss = p;
        maxLossDate = new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    });
    const grossProfit = wins.reduce((a, b) => a + b, 0);
    const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 999 : 0);

    // Streaks
    let currentWinStreak = 0, maxWinStreak = 0;
    let currentLossStreak = 0, maxLossStreak = 0;
    
    pnls.forEach(p => {
        if (p > 0) {
            currentWinStreak++;
            currentLossStreak = 0;
            if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
        } else if (p < 0) {
            currentLossStreak++;
            currentWinStreak = 0;
            if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
        } else {
            currentWinStreak = 0;
            currentLossStreak = 0;
        }
    });

    // Drawdown & Recovery
    let peak = 0, maxDrawdown = 0, currentDrawdown = 0;
    let drawdownStart = null, maxRecoveryDays = 0, currentRecoveryDays = 0;
    let maxDrawdownPeriod = null;
    let cumulative = 0;

    filteredTrades.forEach(t => {
        const p = parseFloat(t.pnl) || 0;
        cumulative += p;
        if (cumulative > peak) {
            peak = cumulative;
            currentDrawdown = 0;
            if (currentRecoveryDays > maxRecoveryDays) maxRecoveryDays = currentRecoveryDays;
            currentRecoveryDays = 0;
            drawdownStart = null;
        } else {
            if (!drawdownStart) drawdownStart = new Date(t.date);
            currentDrawdown = peak - cumulative;
            
            if (currentDrawdown > maxDrawdown) {
                maxDrawdown = currentDrawdown;
                const startStr = drawdownStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
                const endStr = new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
                maxDrawdownPeriod = `${startStr} to ${endStr}`;
            }
            
            // approximate days elapsed
            currentRecoveryDays = Math.floor((new Date(t.date) - drawdownStart) / (1000 * 60 * 60 * 24));
        }
    });

    // Sharpe Ratio (Simplified: Mean / StdDev * sqrt(252))
    const mean = avgDailyPnl;
    const variance = pnls.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / totalTrades;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev === 0 ? 0 : (mean / stdDev) * Math.sqrt(252);

    // Period formatting
    const firstDate = new Date(filteredTrades[0].date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const lastDate = new Date(filteredTrades[filteredTrades.length - 1].date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    return {
        periodStr: `${firstDate} - ${lastDate}`,
        capitalRequired: CAPITAL_REQUIRED,
        totalTrades,
        winRate: winRate.toFixed(1),
        avgDailyPnl,
        maxProfit,
        maxLoss,
        maxProfitDate,
        maxLossDate,
        maxDrawdown,
        maxDrawdownPeriod,
        recoveryDays: maxRecoveryDays,
        sharpeRatio,
        profitFactor,
        maxWinStreak,
        maxLossStreak,
        totalPnl,
        grossProfit,
        grossLoss
    };
  }, [filteredTrades]);

  if (loading) return <div className="loader">Loading analytics...</div>;
  if (error)   return <div className="loader">{error}</div>;

  return (
    <div className="analytics-view">
      
      {/* Header and Filter Controls */}
      <div className="analytics-header-row">
        <div className="analytics-header">
          <div className="analytics-title-group">
            <h2 className="analytics-title" style={{ marginBottom: 0 }}>Strategy Analytics</h2>
            {stats && <span className="period-badge desktop-badge">{stats.periodStr}</span>}
          </div>
          <p className="analytics-subtitle">Nifty 50</p>
        </div>
        
        <div className="analytics-header-right">
          <div className="global-disclaimer" style={{ marginBottom: 0, padding: '4px 10px', fontSize: '0.75rem' }}>
            * P&L is exclusive of all charges
          </div>
          <div className="analytics-filters">
            <div className="filter-pills">
              {['ALL', '2026', '2025', 'CUSTOM'].map(filter => (
                <button
                  key={filter}
                  className={`filter-pill ${dateFilter === filter ? 'active' : ''}`}
                  onClick={() => setDateFilter(filter)}
                >
                  {filter === 'ALL' ? 'All Time' : filter === 'CUSTOM' ? 'Custom Range' : filter}
                </button>
              ))}
            </div>
            
            {dateFilter === 'CUSTOM' && (
              <div className="custom-date-pickers">
                <input 
                  type="date" 
                  className="filter-date" 
                  value={customStart} 
                  onChange={e => setCustomStart(e.target.value)} 
                />
                <span className="filter-to">to</span>
                <input 
                  type="date" 
                  className="filter-date" 
                  value={customEnd} 
                  onChange={e => setCustomEnd(e.target.value)} 
                />
              </div>
            )}
          </div>
          {stats && <span className="period-badge mobile-badge">{stats.periodStr}</span>}
        </div>
      </div>

      {!stats ? (
        <div className="loader">No trades found for this time period.</div>
      ) : (
        <>
          {/* Summary banner */}
          <div className="analytics-banner">
            <div className="banner-item">
              <span className="banner-label">Total P&L</span>
              <span className={`banner-value ${stats.totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>{fmt(stats.totalPnl)}</span>
            </div>
            <div className="banner-divider" />
            <div className="banner-item">
              <span className="banner-label">Capital Required</span>
              <span className="banner-value">{fmt(stats.capitalRequired)}</span>
            </div>
            <div className="banner-divider" />
            <div className="banner-item">
              <span className="banner-label">Total Trades</span>
              <span className="banner-value">{stats.totalTrades}</span>
            </div>
            <div className="banner-divider" />
            <div className="banner-item">
              <span className="banner-label">Win Rate</span>
              <span className={`banner-value ${stats.winRate >= 50 ? 'text-profit' : 'text-loss'}`}>{stats.winRate}%</span>
            </div>
          </div>

          {/* Professional Grouped Panels */}
          <div className="stats-panels-container">
            
            <div className="stats-panel">
              <h4 className="panel-header">Returns Analysis</h4>
              <div className="stat-cards-grid">
                <StatCard label="Avg Daily P&L" color={stats.avgDailyPnl >= 0 ? 'green' : 'red'} value={fmt(stats.avgDailyPnl)} sub="Per trading day average" />
                <StatCard label="Best Day" color="green" value={fmt(stats.maxProfit)} sub={stats.maxProfitDate ? `On ${stats.maxProfitDate}` : 'Highest single-day profit'} />
                <StatCard label="Worst Day" color="red" value={fmt(stats.maxLoss)} sub={stats.maxLossDate ? `On ${stats.maxLossDate}` : 'Largest single-day loss'} />
              </div>
            </div>

            <div className="stats-panel">
              <h4 className="panel-header">Risk Metrics</h4>
              <div className="stat-cards-grid">
                <StatCard label="Max Drawdown" color="red" value={fmt(stats.maxDrawdown)} sub={stats.maxDrawdownPeriod || "Peak-to-trough drop"} />
                <StatCard label="Recovery Time" color="neutral" value={`${stats.recoveryDays} days`} sub="To recover max drawdown" />
                <StatCard label="Sharpe Ratio" color={stats.sharpeRatio >= 1 ? 'green' : stats.sharpeRatio >= 0 ? 'neutral' : 'red'} value={stats.sharpeRatio.toFixed(2)} sub="Annualised risk-adjusted" />
              </div>
            </div>

            <div className="stats-panel">
              <h4 className="panel-header">Execution & Streaks</h4>
              <div className="stat-cards-grid">
                <StatCard label="Profit Factor" color={stats.profitFactor >= 1.5 ? 'green' : stats.profitFactor >= 1 ? 'neutral' : 'red'} value={stats.profitFactor >= 999 ? '∞' : stats.profitFactor.toFixed(2)} sub="Gross profit ÷ gross loss" />
                <StatCard label="Max Win Streak" color="green" value={`${stats.maxWinStreak} days`} sub="Consecutive winners" />
                <StatCard label="Max Loss Streak" color="red" value={`${stats.maxLossStreak} days`} sub="Consecutive losers" />
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
