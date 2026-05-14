'use client';
import { useState } from 'react';
import useSWR from 'swr';
import Sidebar from '@/components/Sidebar';
import AiRecTable from '@/components/market/AiRecTable';
import TopFactors from '@/components/market/TopFactors';
import TickerDetailPanel from '@/components/market/TickerDetailPanel';
import MarketTicker from '@/components/market/MarketTicker';
import NotificationBell from '@/components/market/NotificationBell';
import MarketHeatmap from '@/components/market/MarketHeatmap';
import { marketApi } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

export default function MarketDashboard() {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const { data: overview } = useSWR('market-overview', marketApi.getOverview, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
  });
  const breadth = overview?.breadth;

  // Quick AI Signal — best signal (demo)
  const quickSignals = [
    { ticker: 'VCB', signal: 'BUY', conf: 88 },
    { ticker: 'HPG', signal: 'BUY', conf: 82 },
    { ticker: 'VHM', signal: 'SELL', conf: 76 },
  ];

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {/* Market Ticker tape */}
        <MarketTicker />
        {/* Topbar */}
        <div className="topbar">
          <div style={{ flex: 1 }} />
          {/* Quick AI Signal badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>AI Signal:</span>
            {quickSignals.map(s => (
              <span key={s.ticker} className={`signal-badge signal-${s.signal}`} style={{ fontSize: 11, cursor: 'pointer' }}
                onClick={() => setSelectedTicker(s.ticker)}>
                {s.ticker} {s.conf}%
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="live-dot" />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Kết thúc phiên</span>
          </div>
          <NotificationBell />
        </div>


        <div className="page" style={{ paddingTop: 20 }}>
          <div className="page-header" style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
            <div>
              <h1 className="page-title text-gradient" style={{ fontSize: 22 }}>Thị trường Chứng khoán</h1>
              <p className="page-subtitle">Tổng quan thị trường Việt Nam (HSX, HNX, UPCOM)</p>
            </div>
          </div>

          {/* Market Breadth Stats */}
          {breadth && (
            <div className="grid-4" style={{ marginBottom: 16 }}>
              {[
                { label: 'Tăng', value: breadth.advance, color: 'var(--accent-green)' },
                { label: 'Giảm', value: breadth.decline, color: 'var(--accent-red)' },
                { label: 'Đứng', value: breadth.unchanged, color: 'var(--accent-yellow)' },
                { label: 'GT Khớp', value: formatPrice((breadth.total_value || 0) / 1e9, 0) + ' Tỷ', color: 'var(--accent-blue)', noFormat: true },
              ].map(item => (
                <div key={item.label} className="stat-card" style={{ padding: '12px 16px' }}>
                  <div className="stat-label">{item.label}</div>
                  <div className="stat-value" style={{ color: item.color, fontSize: 22 }}>
                    {item.noFormat ? item.value : (item.value as number)?.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Main Grid: Left AI Table | Right Panel */}
          <div className="dashboard-grid">
            {/* Left: AI Recommendations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <AiRecTable onTickerClick={setSelectedTicker} selectedTicker={selectedTicker} />
            </div>

            {/* Right: Stack of panels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {selectedTicker ? (
                <TickerDetailPanel ticker={selectedTicker} onClose={() => setSelectedTicker(null)} />
              ) : (
                <TopFactors />
              )}
              <MarketBreadthDonut advance={breadth?.advance} decline={breadth?.decline} unchanged={breadth?.unchanged} />
              <MarketHeatmap />
            </div>
          </div>
        </div>
      </main>
    </div>

  );
}

function MarketBreadthDonut({ advance = 0, decline = 0, unchanged = 0 }: { advance?: number; decline?: number; unchanged?: number }) {
  const total = advance + decline + unchanged || 1;
  const r = 50, cx = 70, cy = 70;
  const circ = 2 * Math.PI * r;
  const advDash = (advance / total) * circ;
  const decDash = (decline / total) * circ;
  const unchDash = (unchanged / total) * circ;
  const advPct = (advance / total * 100).toFixed(1);

  return (
    <div className="card">
      <div className="section-title" style={{ marginBottom: 16 }}><span>🔵</span> Độ rộng thị trường</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <svg width={140} height={140} viewBox="0 0 140 140">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-secondary)" strokeWidth={18} />
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke="var(--accent-yellow)" strokeWidth={18} strokeOpacity={0.7}
            strokeDasharray={`${unchDash} ${circ}`}
            strokeDashoffset={-advDash - decDash}
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
          />
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke="var(--accent-red)" strokeWidth={18}
            strokeDasharray={`${decDash} ${circ}`}
            strokeDashoffset={-advDash}
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
          />
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke="var(--accent-green)" strokeWidth={18}
            strokeDasharray={`${advDash} ${circ}`}
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
          />
          <text x={cx} y={cy - 5} textAnchor="middle" fill="var(--text-primary)" fontSize={16} fontWeight={700}>{advPct}%</text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text-muted)" fontSize={10}>tăng</text>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Tăng', val: advance, color: 'var(--accent-green)' },
            { label: 'Giảm', val: decline, color: 'var(--accent-red)' },
            { label: 'Đứng', val: unchanged, color: 'var(--accent-yellow)' },
          ].map(i => (
            <div key={i.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: i.color }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 36 }}>{i.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: i.color, fontFamily: 'var(--font-mono)' }}>{i.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
