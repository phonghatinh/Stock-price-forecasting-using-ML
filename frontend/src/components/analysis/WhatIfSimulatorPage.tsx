'use client';
import { useState, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import MarketTicker from '@/components/market/MarketTicker';
import { simulatorApi } from '@/lib/api';
import { formatPrice, formatPct, VN_TICKERS } from '@/lib/utils';
import toast from 'react-hot-toast';

const SCENARIOS = [
  { id: 'normal',         label: 'Bình thường',     icon: '📊' },
  { id: 'vnindex_down_5', label: 'VN-Index −5%',    icon: '📉' },
  { id: 'vnindex_up_5',   label: 'VN-Index +5%',    icon: '📈' },
  { id: 'rate_up_05',     label: 'Lãi suất +0.5%',  icon: '🏦' },
  { id: 'usd_up_2',       label: 'USD/VND +2%',     icon: '💵' },
];

const DEMO_HOLDINGS = [
  { ticker: 'VCB',  quantity: 1000, avg_cost: 82000 },
  { ticker: 'HPG',  quantity: 2000, avg_cost: 22000 },
  { ticker: 'FPT',  quantity: 500,  avg_cost: 110000 },
  { ticker: 'VNM',  quantity: 800,  avg_cost: 76000 },
];

interface Holding { ticker: string; quantity: number; avg_cost: number; }

function MiniDonut({ sectorAlloc }: { sectorAlloc: Record<string, number> }) {
  const colors = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4'];
  const sectors = Object.entries(sectorAlloc);
  const r = 36, cx = 40, cy = 40;
  const circ = 2 * Math.PI * r;
  let off = 0;
  const slices = sectors.map(([name, pct], i) => {
    const dash = (pct / 100) * circ;
    const s = { name, pct, dash, off, color: colors[i % colors.length] };
    off += dash; return s;
  });
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <svg width={80} height={80}>
        {slices.map(s => (
          <circle key={s.name} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={12}
            strokeDasharray={`${s.dash} ${circ}`} strokeDashoffset={-s.off}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '40px 40px' }} />
        ))}
      </svg>
      <div style={{ flex: 1 }}>
        {slices.map(s => (
          <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)', flex: 1 }}>{s.name}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: s.color }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WhatIfSimulatorPage() {
  const [holdings, setHoldings] = useState<Holding[]>(DEMO_HOLDINGS);
  const [scenario, setScenario] = useState('normal');
  const [newTicker, setNewTicker] = useState('');
  const [newQty, setNewQty] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<any>(null);
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});

  const runSimulation = useCallback(async () => {
    setLoading(true);
    try {
      const body: any = { holdings, scenario };
      if (newTicker && newQty) { body.new_ticker = newTicker; body.new_quantity = parseFloat(newQty); }
      if (Object.keys(adjustments).length) body.adjustments = adjustments;
      const r = await simulatorApi.analyze(body);
      setResult(r);
    } catch { toast.error('Lỗi mô phỏng'); }
    finally { setLoading(false); }
  }, [holdings, scenario, newTicker, newQty, adjustments]);

  const runOptimize = async () => {
    setLoading(true);
    try {
      const r = await simulatorApi.optimizeSuggest({ holdings, scenario });
      setOptimizeResult(r);
      toast.success('Tối ưu hóa thành công!');
    } catch { toast.error('Lỗi tối ưu'); }
    finally { setLoading(false); }
  };

  const updateQty = (ticker: string, qty: number) => {
    setAdjustments(prev => ({ ...prev, [ticker]: qty }));
  };

  const metrics = result?.metrics;
  const baseMet = result?.base_metrics;
  const navDelta = result?.nav_delta ?? 0;
  const riskDelta = result?.risk_delta ?? 0;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <MarketTicker />
        <div className="topbar">
          <h2 style={{ fontWeight: 700, fontSize: 18 }}>🧪 What-If Simulator</h2>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={runSimulation} disabled={loading}>
            {loading ? '⏳ Đang chạy...' : '▶ Chạy mô phỏng'}
          </button>
        </div>

        <div className="page">
          <div className="page-header">
            <h1 className="page-title text-gradient">Trình Giả Lập Danh Mục</h1>
            <p className="page-subtitle">Thử nghiệm điều chỉnh danh mục và xem tác động ngay lập tức</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
            {/* Left panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Scenario selector */}
              <div className="card">
                <div className="section-title" style={{ marginBottom: 12 }}><span>🌐</span> Kịch bản thị trường</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {SCENARIOS.map(s => (
                    <button key={s.id} onClick={() => setScenario(s.id)}
                      className={`btn ${scenario === s.id ? 'btn-primary' : 'btn-outline'}`}
                      style={{ fontSize: 13 }}>
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Holdings with sliders */}
              <div className="card">
                <div className="section-header">
                  <div className="section-title"><span>📋</span> Điều chỉnh vị thế</div>
                  <button className="btn btn-outline btn-sm" onClick={() => setAdjustments({})}>Reset</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {holdings.map(h => {
                    const adjQty = adjustments[h.ticker] ?? h.quantity;
                    const resultH = result?.holdings?.find((r: any) => r.ticker === h.ticker);
                    return (
                      <div key={h.ticker} style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-accent)', fontSize: 14 }}>{h.ticker}</span>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {resultH && (
                              <span className={`badge ${resultH.pnl_pct >= 0 ? 'change-up' : 'change-down'}`}>
                                {resultH.pnl_pct > 0 ? '+' : ''}{resultH.pnl_pct?.toFixed(1)}%
                              </span>
                            )}
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Giá mua: {formatPrice(h.avg_cost, 0)}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <input type="range" min={0} max={h.quantity * 3} step={100}
                            value={adjQty}
                            onChange={e => updateQty(h.ticker, parseInt(e.target.value))}
                            style={{ flex: 1, accentColor: 'var(--accent-blue)' }} />
                          <input type="number" value={adjQty} onChange={e => updateQty(h.ticker, parseInt(e.target.value))}
                            className="input" style={{ width: 90, textAlign: 'right', fontSize: 13 }} />
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>CP</span>
                        </div>
                        {resultH && (
                          <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                            <span>Giá TT: <b style={{ color: 'var(--text-accent)' }}>{formatPrice(resultH.current_price, 0)}</b></span>
                            <span>Giá trị: <b style={{ color: 'var(--accent-blue)' }}>{formatPrice(resultH.market_value, 0)}</b></span>
                            <span>Tỷ trọng: <b>{resultH.weight}%</b></span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add new ticker */}
              <div className="card">
                <div className="section-title" style={{ marginBottom: 12 }}><span>➕</span> Thêm mã mới vào mô phỏng</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input" placeholder="Mã CK (VD: SSI)" value={newTicker}
                    onChange={e => setNewTicker(e.target.value.toUpperCase())} style={{ width: 140 }} />
                  <input className="input" type="number" placeholder="Số lượng" value={newQty}
                    onChange={e => setNewQty(e.target.value)} style={{ width: 120 }} />
                  <button className="btn btn-outline" onClick={runSimulation}>Thêm & Chạy</button>
                </div>
                {result?.correlation_warning && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--accent-yellow)' }}>
                    {result.correlation_warning}
                  </div>
                )}
              </div>

              {/* Optimize suggestions */}
              {optimizeResult && (
                <div className="card">
                  <div className="section-title" style={{ marginBottom: 12 }}><span>🚀</span> Gợi ý tối ưu AI</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                    Sharpe ước tính tối ưu: <b style={{ color: 'var(--accent-blue)' }}>{optimizeResult.estimated_sharpe}</b>
                  </div>
                  <table className="data-table">
                    <thead><tr><th>Mã</th><th style={{ textAlign: 'right' }}>Hiện tại</th><th style={{ textAlign: 'right' }}>Mục tiêu</th><th style={{ textAlign: 'right' }}>Thay đổi</th><th>Hành động</th></tr></thead>
                    <tbody>
                      {optimizeResult.suggestions.map((s: any) => (
                        <tr key={s.ticker}>
                          <td className="ticker-cell">{s.ticker}</td>
                          <td className="num-cell">{s.current_weight}%</td>
                          <td className="num-cell">{s.target_weight}%</td>
                          <td className={`num-cell ${s.delta > 0 ? 'change-up' : s.delta < 0 ? 'change-down' : ''}`}>
                            {s.delta > 0 ? '+' : ''}{s.delta}%
                          </td>
                          <td>
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                              background: s.action === 'Tăng' ? 'rgba(16,185,129,0.12)' : s.action === 'Giảm' ? 'rgba(239,68,68,0.12)' : 'rgba(148,163,184,0.1)',
                              color: s.action === 'Tăng' ? 'var(--accent-green)' : s.action === 'Giảm' ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                              {s.action}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{optimizeResult.note}</div>
                </div>
              )}
            </div>

            {/* Right panel — Impact Analysis */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card">
                <div className="section-title" style={{ marginBottom: 16 }}><span>⚡</span> Impact Analysis</div>
                {metrics ? (
                  <>
                    {[
                      { label: 'NAV', value: formatPrice(metrics.nav, 0), delta: navDelta, isDelta: true, color: 'var(--text-accent)' },
                      { label: 'Risk Score', value: `${metrics.risk_score}/100`, delta: riskDelta, isDelta: true, color: metrics.risk_score > 60 ? 'var(--accent-red)' : 'var(--accent-yellow)' },
                      { label: 'Đa dạng hóa', value: `${metrics.diversification}%`, delta: null, color: 'var(--accent-blue)' },
                      { label: 'Biến động', value: `${metrics.volatility}%`, delta: null, color: 'var(--accent-yellow)' },
                      { label: 'Lợi nhuận KV', value: `${metrics.expected_return}%/năm`, delta: null, color: 'var(--accent-green)' },
                      { label: 'Sharpe Est.', value: metrics.sharpe?.toFixed(3), delta: null, color: 'var(--accent-purple)' },
                    ].map(m => (
                      <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{m.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {m.isDelta && m.delta !== null && m.delta !== 0 && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: (m.label === 'Risk Score' ? m.delta < 0 : m.delta > 0) ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                              {m.delta > 0 ? '▲' : '▼'} {Math.abs(m.delta) > 1000 ? formatPrice(Math.abs(m.delta), 0) : Math.abs(m.delta).toFixed(1)}
                            </span>
                          )}
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: m.color }}>{m.value}</span>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    Nhấn <b>Chạy mô phỏng</b> để xem kết quả
                  </div>
                )}
              </div>

              {/* Sector allocation donut */}
              {metrics?.sector_alloc && (
                <div className="card">
                  <div className="section-title" style={{ marginBottom: 12 }}><span>🥧</span> Phân bổ ngành</div>
                  <MiniDonut sectorAlloc={metrics.sector_alloc} />
                </div>
              )}

              {/* Optimize button */}
              <button className="btn btn-primary" onClick={runOptimize} disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                🚀 Tối ưu hóa Danh mục (AI)
              </button>

              {/* Scenario description */}
              <div className="card">
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Kịch bản đang chạy</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-accent)' }}>
                  {SCENARIOS.find(s => s.id === scenario)?.icon} {SCENARIOS.find(s => s.id === scenario)?.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {scenario === 'normal' && 'Điều kiện thị trường bình thường, giá phản ánh thực tế.'}
                  {scenario === 'vnindex_down_5' && 'Thị trường điều chỉnh 5% — các ngành rủi ro cao bị ảnh hưởng mạnh nhất.'}
                  {scenario === 'vnindex_up_5' && 'Thị trường tăng mạnh — chứng khoán & thép dẫn đầu tăng.'}
                  {scenario === 'rate_up_05' && 'Lãi suất tăng — ngân hàng hưởng lợi, BĐS & chứng khoán bị áp lực.'}
                  {scenario === 'usd_up_2' && 'USD tăng — xuất khẩu có lợi, nhập khẩu & tiêu dùng bị ảnh hưởng.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
