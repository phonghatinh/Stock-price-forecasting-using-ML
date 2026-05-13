'use client';
import { useState } from 'react';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import Sidebar from '@/components/Sidebar';
import MarketTicker from '@/components/market/MarketTicker';
import NotificationBell from '@/components/market/NotificationBell';
import { predictionApi, analysisApi, marketApi } from '@/lib/api';
import { VN_TICKERS, formatPrice, formatPct, changeClass } from '@/lib/utils';

const POPULAR = ['VNM','VCB','HPG','FPT','MBB','TCB','SSI','VND','VHM','MSN','MWG','ACB'];

// Confidence Gauge SVG
function ConfidenceGauge({ value }: { value: number }) {
  const color = value >= 80 ? '#10b981' : value >= 65 ? '#f59e0b' : '#ef4444';
  const r = 40, cx = 50, cy = 50;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ * 0.75;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={100} height={80} viewBox="0 0 100 80">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-secondary)" strokeWidth={10}
          strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
          style={{ transform: 'rotate(135deg)', transformOrigin: '50px 50px' }} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transform: 'rotate(135deg)', transformOrigin: '50px 50px', transition: 'stroke-dasharray 0.8s ease' }} />
        <text x={cx} y={cy + 5} textAnchor="middle" fill={color} fontSize={16} fontWeight={800}>{value}%</text>
      </svg>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Độ tin cậy</div>
    </div>
  );
}

// Future projection range bar
function PriceTarget({ current, low, high, target }: { current: number; low: number; high: number; target: number }) {
  const range = high - low;
  const currentPct = range > 0 ? ((current - low) / range * 100) : 50;
  const targetPct = range > 0 ? ((target - low) / range * 100) : 50;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Vùng giá dự kiến (5 phiên)</div>
      <div style={{ position: 'relative', height: 8, background: 'var(--bg-secondary)', borderRadius: 999 }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
          background: 'linear-gradient(90deg, rgba(16,185,129,0.15), rgba(16,185,129,0.35))',
          borderRadius: 999,
        }} />
        {/* Current marker */}
        <div style={{
          position: 'absolute', left: `${Math.max(2, Math.min(96, currentPct))}%`,
          top: -4, width: 16, height: 16, background: 'var(--accent-blue)',
          borderRadius: '50%', border: '2px solid white', transform: 'translateX(-50%)',
          boxShadow: '0 0 8px rgba(59,130,246,0.6)',
        }} title={`Hiện tại: ${formatPrice(current, 0)}`} />
        {/* Target marker */}
        <div style={{
          position: 'absolute', left: `${Math.max(2, Math.min(96, targetPct))}%`,
          top: -2, width: 12, height: 12, background: 'var(--accent-green)',
          borderRadius: '50%', border: '2px solid white', transform: 'translateX(-50%)',
          boxShadow: '0 0 8px rgba(16,185,129,0.6)',
        }} title={`Mục tiêu: ${formatPrice(target, 0)}`} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11 }}>
        <span style={{ color: 'var(--accent-red)' }}>▼ {formatPrice(low, 0)}</span>
        <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>🎯 {formatPrice(target, 0)}</span>
        <span style={{ color: 'var(--accent-green)' }}>▲ {formatPrice(high, 0)}</span>
      </div>
    </div>
  );
}

// Sentiment analysis demo
function SentimentPanel() {
  const items = [
    { label: 'Tin tức tích cực', value: 62, color: 'var(--accent-green)' },
    { label: 'Tin tức tiêu cực', value: 21, color: 'var(--accent-red)' },
    { label: 'Trung lập', value: 17, color: 'var(--text-secondary)' },
  ];
  return (
    <div className="card">
      <div className="section-title" style={{ marginBottom: 14 }}><span>💬</span> Sentiment Analysis</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Phân tích từ 48h tin tức & MXH</div>
      {items.map(i => (
        <div key={i.label} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{i.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: i.color }}>{i.value}%</span>
          </div>
          <div className="confidence-bar">
            <div style={{ width: `${i.value}%`, height: '100%', background: i.color, borderRadius: 999, transition: 'width 0.8s ease' }} />
          </div>
        </div>
      ))}
      <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(16,185,129,0.08)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)', fontSize: 12, color: 'var(--text-secondary)' }}>
        📰 Từ khóa nổi bật: <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>kết quả kinh doanh tích cực</span>, tăng trưởng lợi nhuận, chia cổ tức
      </div>
    </div>
  );
}

export default function MarketPredictionPage() {
  const [search, setSearch] = useState('VNM');
  const [activeTicker, setActiveTicker] = useState('VNM');
  const [horizon, setHorizon] = useState(5);

  const { data: prediction, isLoading } = useSWR(
    `predict-${activeTicker}-${horizon}`,
    () => predictionApi.predict(activeTicker, horizon),
    { revalidateOnFocus: false }
  );

  const { data: detail } = useSWR(
    `ticker-detail-pred-${activeTicker}`,
    () => marketApi.getTickerDetail(activeTicker),
    { refreshInterval: 60_000 }
  );

  const { data: analysis } = useSWR(
    `analysis-pred-${activeTicker}`,
    () => analysisApi.analyze(activeTicker),
    { revalidateOnFocus: false }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const t = search.trim().toUpperCase();
    if (t) setActiveTicker(t);
  };

  const signal = prediction?.signal || analysis?.signal || 'HOLD';
  const confidence = prediction?.confidence ? prediction.confidence * 100 : analysis?.confidence ? analysis.confidence * 100 : 72;
  const priceTarget = prediction?.price_target || (detail?.close ? detail.close * (signal === 'BUY' ? 1.065 : signal === 'SELL' ? 0.935 : 1.01) : null);
  const priceHigh = priceTarget ? priceTarget * 1.02 : null;
  const priceLow = priceTarget ? priceTarget * 0.96 : null;

  const sigColor = signal === 'BUY' ? 'var(--accent-green)' : signal === 'SELL' ? 'var(--accent-red)' : 'var(--accent-yellow)';
  const sigLabel = signal === 'BUY' ? 'MUA MẠNH' : signal === 'SELL' ? 'BÁN' : 'GIỮ';

  // SHAP features demo
  const shapFeatures = analysis?.shap_features ?? [
    { feature: 'RSI (14)', shap_value: 0.32, direction: 'positive' },
    { feature: 'MACD Signal', shap_value: 0.24, direction: 'positive' },
    { feature: 'Volume Ratio', shap_value: 0.18, direction: 'positive' },
    { feature: 'MA20 Distance', shap_value: -0.12, direction: 'negative' },
    { feature: 'Dòng tiền NN', shap_value: 0.09, direction: 'positive' },
  ];
  const maxShap = Math.max(...shapFeatures.map((f: any) => Math.abs(f.shap_value)));

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <MarketTicker />
        {/* Topbar */}
        <div className="topbar">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
            <input className="input" value={search} onChange={e => setSearch(e.target.value.toUpperCase())}
              placeholder="Tìm mã CK..." style={{ width: 160 }} />
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px' }}>🔍 Dự báo</button>
          </form>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {POPULAR.map(t => (
              <button key={t} onClick={() => { setActiveTicker(t); setSearch(t); }}
                className={`btn btn-sm ${activeTicker === t ? 'btn-primary' : 'btn-ghost'}`}>{t}</button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Horizon:</span>
            {[3, 5, 10].map(d => (
              <button key={d} onClick={() => setHorizon(d)}
                className={`btn btn-sm ${horizon === d ? 'btn-primary' : 'btn-outline'}`}>{d}N</button>
            ))}
          </div>
          <NotificationBell />
        </div>

        <div className="page">
          <div className="page-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <h1 className="page-title"><span className="text-gradient">{activeTicker}</span></h1>
              {/* Signal badge */}
              <div style={{
                padding: '8px 20px', borderRadius: 999, fontWeight: 800, fontSize: 15,
                background: `${signal === 'BUY' ? 'rgba(16,185,129,0.15)' : signal === 'SELL' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'}`,
                color: sigColor, border: `1px solid ${sigColor}30`,
                letterSpacing: '0.1em',
                boxShadow: `0 0 20px ${signal === 'BUY' ? 'rgba(16,185,129,0.2)' : signal === 'SELL' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
              }}>
                {signal === 'BUY' ? '▲' : signal === 'SELL' ? '▼' : '●'} {sigLabel}
              </div>
              {detail && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-accent)' }}>
                    {formatPrice(detail.close, 0)}
                  </span>
                  <span className={changeClass(detail.change_pct)} style={{ fontSize: 14, fontWeight: 700, alignSelf: 'flex-end' }}>
                    {detail.change_pct > 0 ? '▲' : '▼'} {formatPct(detail.change_pct)}
                  </span>
                </div>
              )}
            </div>
            <p className="page-subtitle">Dự báo AI · XAI · Explainable · Horizon {horizon} ngày</p>
          </div>

          {isLoading ? (
            <div className="grid-2" style={{ gap: 16 }}>
              {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 16 }} />)}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Row 1: Signal + Confidence + Price Target */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 16 }}>
                <div className="card">
                  <div className="section-title" style={{ marginBottom: 16 }}><span>🎯</span> AI Signal & Price Target</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                    {[
                      { label: 'Tín hiệu', value: sigLabel, color: sigColor },
                      { label: 'Mục tiêu giá', value: priceTarget ? formatPrice(priceTarget, 0) : '—', color: 'var(--accent-blue)' },
                      { label: 'Horizon', value: `${horizon} phiên`, color: 'var(--text-accent)' },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                  {priceTarget && detail?.close && (
                    <PriceTarget
                      current={detail.close}
                      target={priceTarget}
                      high={priceHigh!}
                      low={priceLow!}
                    />
                  )}
                </div>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <ConfidenceGauge value={Math.round(confidence)} />
                  <div style={{ marginTop: 8, padding: '6px 12px', borderRadius: 8, background: confidence >= 80 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', fontSize: 11, color: confidence >= 80 ? 'var(--accent-green)' : 'var(--accent-yellow)', fontWeight: 600 }}>
                    {confidence >= 80 ? '✓ Độ tin cao' : '~ Trung bình'}
                  </div>
                </div>
              </div>

              {/* Row 2: SHAP Panel */}
              <div className="card">
                <div className="section-title" style={{ marginBottom: 16 }}>
                  <span>🔍</span> XAI — SHAP Feature Attribution
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>Tại sao AI đưa ra tín hiệu này?</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {shapFeatures.map((f: any, i: number) => {
                    const isPos = f.shap_value > 0;
                    const pct = Math.abs(f.shap_value) / maxShap * 100;
                    return (
                      <div key={i} className="shap-bar">
                        <span className="shap-label" style={{ minWidth: 160 }}>{f.feature}</span>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {/* Negative side */}
                          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                            {!isPos && (
                              <div style={{ width: `${pct}%`, height: 8, background: 'var(--accent-red)', borderRadius: '999px 0 0 999px', opacity: 0.8 }} />
                            )}
                          </div>
                          <div style={{ width: 1, height: 16, background: 'var(--border-color)' }} />
                          {/* Positive side */}
                          <div style={{ flex: 1 }}>
                            {isPos && (
                              <div style={{ width: `${pct}%`, height: 8, background: 'var(--accent-green)', borderRadius: '0 999px 999px 0', opacity: 0.8 }} />
                            )}
                          </div>
                        </div>
                        <span className="shap-value-text" style={{ color: isPos ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {isPos ? '+' : ''}{f.shap_value.toFixed(3)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                  <span>◀ <span style={{ color: 'var(--accent-red)' }}>Kéo xuống (BÁN)</span></span>
                  <span><span style={{ color: 'var(--accent-green)' }}>Kéo lên (MUA)</span> ▶</span>
                </div>
              </div>

              {/* Row 3: Sentiment */}
              <div className="grid-2" style={{ gap: 16 }}>
                <SentimentPanel />
                {/* Similar patterns */}
                <div className="card">
                  <div className="section-title" style={{ marginBottom: 14 }}><span>🔄</span> Similar Patterns</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Các giai đoạn lịch sử có mô hình tương tự</div>
                  {[
                    { period: 'Q3/2023 (tháng 7)', similarity: 87, outcome: '+5.2%', up: true },
                    { period: 'Q1/2024 (tháng 2)', similarity: 82, outcome: '+3.8%', up: true },
                    { period: 'Q2/2022 (tháng 6)', similarity: 74, outcome: '-2.1%', up: false },
                  ].map((p, i) => (
                    <div key={i} style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 8, border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.period}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: p.up ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {p.outcome}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="confidence-bar" style={{ flex: 1 }}>
                          <div className="confidence-fill fill-blue" style={{ width: `${p.similarity}%` }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>{p.similarity}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
