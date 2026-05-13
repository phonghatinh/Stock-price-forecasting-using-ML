'use client';
import { useState } from 'react';
import useSWR from 'swr';
import Sidebar from '@/components/Sidebar';
import IndexPulse from '@/components/market/IndexPulse';
import AiRecTable from '@/components/market/AiRecTable';
import TopFactors from '@/components/market/TopFactors';
import TickerDetailPanel from '@/components/market/TickerDetailPanel';
import MarketTicker from '@/components/market/MarketTicker';
import NotificationBell from '@/components/market/NotificationBell';
import MarketHeatmap from '@/components/market/MarketHeatmap';
import { marketApi } from '@/lib/api';
import { formatVolume, formatPrice, formatPct, changeClass } from '@/lib/utils';

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
          <IndexPulse />
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


        <div className="page">
          <div className="page-header" style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 className="page-title text-gradient">Thị trường Chứng khoán</h1>
              <p className="page-subtitle">Tổng quan thị trường Việt Nam (HSX, HNX, UPCOM)</p>
            </div>
          </div>

          {/* Index Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
            {['vnindex', 'hnx', 'upcom'].map(key => {
              const idx = overview?.[key];
              const labels: Record<string, string> = { vnindex: 'VN-INDEX', hnx: 'HNX-Index', upcom: 'UPCoM-Index' };
              const cls = changeClass(idx?.change_pct ?? 0);
              return (
                <div key={key} className="card" style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                      {labels[key]}
                    </span>
                    <div className="live-dot" style={{ width: 6, height: 6 }} />
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-accent)', marginBottom: 4 }}>
                    {idx ? formatPrice(idx.price) : '—'}
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className={`badge ${cls}`} style={{ fontSize: 13, fontWeight: 700 }}>
                      {idx ? (idx.change_pct > 0 ? '▲' : idx.change_pct < 0 ? '▼' : '●') : ''} {idx ? formatPct(idx.change_pct) : '—'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      KL: {idx ? formatVolume(idx.volume) : '—'}
                    </span>
                  </div>
                  {/* Mini progress bar */}
                  <div style={{ marginTop: 8, height: 2, borderRadius: 1, background: 'var(--bg-secondary)' }}>
                    <div style={{
                      height: '100%', borderRadius: 1,
                      width: `${Math.min(100, Math.abs(idx?.change_pct ?? 0) * 30)}%`,
                      background: idx?.change_pct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>GT: {idx ? formatPrice(idx.value / 1e9, 0) + ' Tỷ' : '—'}</span>
                    <span>{idx?.timestamp ? new Date(idx.timestamp).toLocaleDateString('vi-VN') : '—'}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Market Breadth Stats */}
          {breadth && (
            <div className="grid-4" style={{ marginBottom: 20 }}>
              {[
                { label: 'Tăng', value: breadth.advance, color: 'var(--accent-green)' },
                { label: 'Giảm', value: breadth.decline, color: 'var(--accent-red)' },
                { label: 'Đứng', value: breadth.unchanged, color: 'var(--accent-yellow)' },
                { label: 'GT Khớp', value: formatPrice((breadth.total_value || 0) / 1e9, 0) + ' Tỷ', color: 'var(--accent-blue)', noFormat: true },
              ].map(item => (
                <div key={item.label} className="stat-card">
                  <div className="stat-label">{item.label}</div>
                  <div className="stat-value" style={{ color: item.color, fontSize: 26 }}>
                    {item.noFormat ? item.value : (item.value as number)?.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Main Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
            {/* Left: AI Recommendations */}
            <AiRecTable onTickerClick={setSelectedTicker} selectedTicker={selectedTicker} />

            {/* Right: Ticker Detail (if selected) OR Macro + Sectors */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {selectedTicker ? (
                <TickerDetailPanel ticker={selectedTicker} onClose={() => setSelectedTicker(null)} />
              ) : (
                <TopFactors />
              )}
              <MarketBreadthDonut advance={breadth?.advance} decline={breadth?.decline} unchanged={breadth?.unchanged} />
            </div>
          </div>

          {/* Market Heatmap */}
          <div style={{ marginTop: 20 }}>
            <MarketHeatmap />
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
