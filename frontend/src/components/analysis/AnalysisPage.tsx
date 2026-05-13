'use client';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Sidebar from '@/components/Sidebar';
import CandleChart from './CandleChart';
import ShapBarChart from './ShapBarChart';
import SignalBadge from './SignalBadge';
import XaiNarrative from './XaiNarrative';
import { analysisApi, marketApi } from '@/lib/api';
import { VN_TICKERS, formatPrice, formatPct, changeClass } from '@/lib/utils';

interface Props { ticker: string; }

export default function AnalysisPage({ ticker }: Props) {
  const [activeTicker, setActiveTicker] = useState(ticker.toUpperCase());
  const [search, setSearch] = useState(ticker.toUpperCase());

  // When prop changes (navigation), sync state
  useEffect(() => {
    setActiveTicker(ticker.toUpperCase());
    setSearch(ticker.toUpperCase());
  }, [ticker]);

  const { data, isLoading, mutate } = useSWR(
    `analysis-${activeTicker}`,
    () => analysisApi.analyze(activeTicker),
    { refreshInterval: 120_000, revalidateOnFocus: false }
  );

  const { data: tickerDetail } = useSWR(
    `ticker-detail-${activeTicker}`,
    () => marketApi.getTickerDetail(activeTicker),
    { refreshInterval: 30_000 }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const t = search.trim().toUpperCase();
    if (t) {
      setActiveTicker(t);
    }
  };

  const handleTickerSwitch = (t: string) => {
    setActiveTicker(t);
    setSearch(t);
  };

  const chgCls = changeClass(tickerDetail?.change_pct ?? 0);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {/* Topbar */}
        <div className="topbar">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              value={search}
              onChange={e => setSearch(e.target.value.toUpperCase())}
              placeholder="Nhập mã CK (VD: VNM)"
              style={{ width: 180 }}
            />
            <button type="submit" className="btn btn-primary">Phân tích</button>
          </form>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {VN_TICKERS.slice(0, 8).map(t => (
              <button
                key={t}
                onClick={() => handleTickerSwitch(t)}
                className={`btn btn-sm ${activeTicker === t ? 'btn-primary' : 'btn-ghost'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="page">
          {/* Page Header with price overview */}
          <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h1 className="page-title" style={{ fontSize: 32, margin: 0 }}>
                  <span className="text-gradient">{activeTicker}</span>
                </h1>
                {data?.signal && <SignalBadge signal={data.signal} size="lg" />}
              </div>
              <p className="page-subtitle">Phân tích AI + XAI — Explainable AI</p>
            </div>

            {/* Today's price snapshot */}
            {tickerDetail && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ padding: '10px 16px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-color)', minWidth: 130 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Giá đóng cửa</div>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-accent)' }}>
                    {formatPrice(tickerDetail.close, 0)}
                  </div>
                  <div className={chgCls} style={{ fontSize: 13, fontWeight: 700 }}>
                    {tickerDetail.change_pct > 0 ? '▲' : tickerDetail.change_pct < 0 ? '▼' : '●'} {formatPct(tickerDetail.change_pct)}
                  </div>
                </div>
                {[
                  { label: 'Cao', val: formatPrice(tickerDetail.high, 0), color: 'var(--accent-green)' },
                  { label: 'Thấp', val: formatPrice(tickerDetail.low, 0), color: 'var(--accent-red)' },
                  { label: 'KL', val: (tickerDetail.volume / 1e6).toFixed(1) + 'M', color: 'var(--accent-blue)' },
                ].map(s => (
                  <div key={s.label} style={{ padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 16 }} />)}
            </div>
          ) : data ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Candle Chart - key forces remount on ticker change */}
              <CandleChart key={`chart-${activeTicker}`} ticker={activeTicker} showSignal={true} />

              <div className="grid-2">
                {/* SHAP */}
                <div className="card">
                  <div className="section-title" style={{ marginBottom: 16 }}>
                    <span>🔍</span> SHAP Feature Attribution
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                      (Tác động của từng yếu tố đến tín hiệu)
                    </span>
                  </div>
                  <ShapBarChart features={data.shap_features ?? []} />
                </div>

                {/* Narrative */}
                <div className="card">
                  <div className="section-title" style={{ marginBottom: 16 }}>
                    <span>📝</span> Giải thích AI
                  </div>
                  <XaiNarrative narrative={data.narrative} ticker={activeTicker} />
                </div>
              </div>

              {/* Technical + Fundamental */}
              <div className="grid-2">
                <TechnicalPanel
                  tech={data.technical}
                  dbTech={tickerDetail?.technicals}
                />
                <FundamentalPanel fund={data.fundamental} />
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              Không tìm thấy dữ liệu cho {activeTicker}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function TechnicalPanel({ tech, dbTech }: { tech: Record<string, number>; dbTech?: Record<string, number> }) {
  // Merge DB technicals (more accurate) with analysis data
  const merged = { ...(tech ?? {}), ...(dbTech ?? {}) };

  const items = [
    {
      label: 'RSI (14)', key: 'rsi_14',
      fmt: (v: number) => v?.toFixed(1),
      warning: (v: number) => v > 70 ? 'Quá mua' : v < 30 ? 'Quá bán' : null,
      color: (v: number) => v > 70 ? 'var(--accent-red)' : v < 30 ? 'var(--accent-green)' : 'var(--text-accent)',
    },
    { label: 'MACD', key: 'macd', fmt: (v: number) => v?.toFixed(2), color: (v: number) => v > 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
    { label: 'Signal Line', key: 'macd_signal', fmt: (v: number) => v?.toFixed(2) },
    { label: 'SMA 20', key: 'sma_20', fmt: (v: number) => formatPrice(v, 0) },
    { label: 'SMA 50', key: 'sma_50', fmt: (v: number) => formatPrice(v, 0) },
    { label: 'BB Upper', key: 'bb_upper', fmt: (v: number) => formatPrice(v, 0) },
    { label: 'BB Lower', key: 'bb_lower', fmt: (v: number) => formatPrice(v, 0) },
    { label: 'Vol Ratio', key: 'volume_ratio', fmt: (v: number) => v?.toFixed(2) + 'x', color: (v: number) => v > 1.5 ? 'var(--accent-green)' : 'var(--text-accent)' },
  ];

  return (
    <div className="card">
      <div className="section-title" style={{ marginBottom: 16 }}><span>📐</span> Chỉ số kỹ thuật</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {items.map(item => {
          const val = merged?.[item.key];
          const warning = item.warning?.(val);
          const clr = item.color?.(val) ?? 'var(--text-accent)';
          return (
            <div key={item.key} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {warning && (
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4,
                    background: 'rgba(245,158,11,0.15)', color: 'var(--accent-yellow)', fontWeight: 600 }}>
                    {warning}
                  </span>
                )}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: clr }}>
                  {val != null ? item.fmt(val) : '—'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FundamentalPanel({ fund }: { fund: Record<string, number> }) {
  const items = [
    { label: 'P/E', key: 'pe', fmt: (v: number) => v?.toFixed(1), color: (v: number) => v < 12 ? 'var(--accent-green)' : v > 25 ? 'var(--accent-red)' : 'var(--text-accent)' },
    { label: 'P/B', key: 'pb', fmt: (v: number) => v?.toFixed(2) },
    { label: 'EPS', key: 'eps', fmt: (v: number) => formatPrice(v, 0) + ' VND' },
    { label: 'ROE', key: 'roe', fmt: (v: number) => (v * 100)?.toFixed(1) + '%', color: (v: number) => v > 0.15 ? 'var(--accent-green)' : 'var(--text-accent)' },
    { label: 'ROA', key: 'roa', fmt: (v: number) => (v * 100)?.toFixed(1) + '%' },
    { label: 'Vốn hóa', key: 'market_cap', fmt: (v: number) => v >= 1e12 ? (v / 1e12).toFixed(1) + 'T' : v >= 1e9 ? (v / 1e9).toFixed(0) + 'B' : '—' },
  ];

  return (
    <div className="card">
      <div className="section-title" style={{ marginBottom: 16 }}><span>📊</span> Chỉ số cơ bản</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {items.map(item => {
          const val = fund?.[item.key];
          const clr = item.color?.(val) ?? 'var(--text-accent)';
          return (
            <div key={item.key} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: clr }}>
                {val != null ? item.fmt(val) : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
