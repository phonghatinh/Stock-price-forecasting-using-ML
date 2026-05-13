'use client';
import { useState } from 'react';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import Sidebar from '@/components/Sidebar';
import MarketTicker from '@/components/market/MarketTicker';
import NotificationBell from '@/components/market/NotificationBell';
import EfficientFrontier from './EfficientFrontier';
import RebalanceCard from './RebalanceCard';
import RiskAnalyticsPanel from './RiskAnalyticsPanel';
import PortfolioHealthMeter from './PortfolioHealthMeter';
import { portfolioApi, marketApi, analysisApi } from '@/lib/api';
import { formatPrice, formatPct, changeClass, VN_TICKERS } from '@/lib/utils';

const POPULAR_TICKERS = ['VNM', 'VCB', 'BID', 'CTG', 'HPG', 'SSI', 'FPT', 'MBB', 'TCB', 'ACB', 'STB', 'VHM', 'VIC', 'MWG', 'MSN'];

export default function PortfolioPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [newTicker, setNewTicker] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newCost, setNewCost] = useState('');
  const [optimizeResult, setOptimizeResult] = useState<any>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [objective, setObjective] = useState('sharpe');
  const [tickerSearch, setTickerSearch] = useState('');
  const [showTickerPicker, setShowTickerPicker] = useState(false);

  const { data: portfolios, mutate: mutatePF } = useSWR('portfolios', portfolioApi.list);
  const { data: portfolio, mutate: mutateDetail } = useSWR(
    selectedId ? `portfolio-${selectedId}` : null,
    () => portfolioApi.get(selectedId!),
    { refreshInterval: 60_000 }
  );

  const createPortfolio = async () => {
    const name = prompt('Tên danh mục:');
    if (!name) return;
    await portfolioApi.create(name);
    await mutatePF();
    toast.success('Đã tạo danh mục mới!');
  };

  const addHolding = async () => {
    if (!selectedId || !newTicker || !newQty || !newCost) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    try {
      await portfolioApi.addHolding(selectedId, newTicker, parseFloat(newQty), parseFloat(newCost));
      await mutateDetail();
      setShowAddHolding(false);
      setNewTicker(''); setNewQty(''); setNewCost('');
      toast.success(`Đã thêm ${newTicker}`);
    } catch { toast.error('Lỗi thêm cổ phiếu'); }
  };

  const deleteHolding = async (hId: number) => {
    if (!selectedId) return;
    try {
      await portfolioApi.deleteHolding(selectedId, hId);
      await mutateDetail();
      toast.success('Đã xóa');
    } catch { toast.error('Lỗi xóa'); }
  };

  const optimize = async () => {
    if (!selectedId) return;
    setOptimizing(true);
    try {
      const result = await portfolioApi.optimize(selectedId, objective);
      setOptimizeResult(result);
      toast.success('Tối ưu hóa thành công!');
    } catch { toast.error('Lỗi tối ưu hóa'); }
    finally { setOptimizing(false); }
  };

  const selectTicker = (t: string) => {
    setNewTicker(t);
    setShowTickerPicker(false);
    setTickerSearch('');
  };

  const filteredTickers = VN_TICKERS.filter(t =>
    tickerSearch === '' || t.includes(tickerSearch.toUpperCase())
  );

  const holdings = portfolio?.holdings ?? [];
  const totalValue = portfolio?.total_value ?? 0;
  const totalPnl = portfolio?.total_pnl ?? 0;
  const totalPnlPct = portfolio?.total_pnl_pct ?? 0;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <MarketTicker />
        <div className="topbar">
          <h2 style={{ fontWeight: 700, fontSize: 18 }}>💼 Danh mục đầu tư</h2>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={createPortfolio}>+ Tạo danh mục</button>
          <NotificationBell />
        </div>


        <div className="page">
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20, alignItems: 'start' }}>
            {/* Portfolio List */}
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.08em', paddingLeft: 4 }}>
                DANH MỤC CỦA BẠN
              </div>
              {(portfolios ?? []).length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                  Chưa có danh mục nào.<br />
                  <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={createPortfolio}>Tạo mới</button>
                </div>
              ) : (
                (portfolios ?? []).map((p: any) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    style={{
                      padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                      background: selectedId === p.id ? 'rgba(59,130,246,0.12)' : 'transparent',
                      border: selectedId === p.id ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                      marginBottom: 4,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14, color: selectedId === p.id ? 'var(--accent-blue)' : 'var(--text-primary)' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {p.holdings?.length ?? 0} cổ phiếu
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Portfolio Detail */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {!selectedId ? (
                <div className="card" style={{ textAlign: 'center', padding: 60 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>💼</div>
                  <div style={{ color: 'var(--text-muted)' }}>Chọn một danh mục để xem chi tiết</div>
                </div>
              ) : (
                <>
                  {/* Summary Stats */}
                  <div className="grid-4">
                    {[
                      { label: 'Tổng giá trị (NAV)', value: formatPrice(totalValue) + ' VND', color: 'var(--text-accent)' },
                      { label: 'Lãi/Lỗ (%)', value: formatPct(totalPnlPct), color: totalPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
                      { label: 'P&L (VND)', value: formatPrice(totalPnl), color: totalPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
                      { label: 'Số vị thế', value: holdings.length.toString(), color: 'var(--text-primary)' },
                    ].map(s => (
                      <div key={s.label} className="stat-card">
                        <div className="stat-label">{s.label}</div>
                        <div className="stat-value" style={{ color: s.color, fontSize: 20 }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Risk Analytics + Health Meter */}
                  <div className="grid-2" style={{ gap: 16 }}>
                    <RiskAnalyticsPanel />
                    <PortfolioHealthMeter />
                  </div>

                  {/* Holdings Table */}
                  <div className="card">
                    <div className="section-header">
                      <div className="section-title"><span>📋</span> Danh sách cổ phiếu</div>
                      <button className="btn btn-outline btn-sm" onClick={() => { setShowAddHolding(!showAddHolding); setOptimizeResult(null); }}>
                        {showAddHolding ? 'Hủy' : '+ Thêm CP'}
                      </button>
                    </div>

                    {showAddHolding && (
                      <div style={{ marginBottom: 16, padding: 14, background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text-secondary)' }}>Thêm cổ phiếu vào danh mục</div>

                        {/* Ticker selection with picker */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                          <div style={{ position: 'relative' }}>
                            <input
                              className="input"
                              placeholder="Mã CK (VD: VNM)"
                              value={newTicker}
                              onChange={e => { setNewTicker(e.target.value.toUpperCase()); setShowTickerPicker(true); setTickerSearch(e.target.value.toUpperCase()); }}
                              onFocus={() => setShowTickerPicker(true)}
                              style={{ width: 150 }}
                            />
                            {showTickerPicker && (
                              <div style={{
                                position: 'absolute', top: '100%', left: 0, zIndex: 100,
                                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                borderRadius: 8, maxHeight: 200, overflowY: 'auto', minWidth: 150,
                                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                              }}>
                                {filteredTickers.slice(0, 20).map(t => (
                                  <div
                                    key={t}
                                    onClick={() => selectTicker(t)}
                                    style={{
                                      padding: '8px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                      color: 'var(--text-primary)',
                                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.1)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                  >
                                    {t}
                                  </div>
                                ))}
                                {filteredTickers.length === 0 && (
                                  <div style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: 12 }}>Không tìm thấy mã</div>
                                )}
                              </div>
                            )}
                          </div>
                          <input className="input" type="number" placeholder="Số lượng" value={newQty}
                            onChange={e => setNewQty(e.target.value)} style={{ width: 120 }} />
                          <input className="input" type="number" placeholder="Giá mua TB" value={newCost}
                            onChange={e => setNewCost(e.target.value)} style={{ width: 140 }} />
                          <button className="btn btn-primary" onClick={addHolding}>Thêm</button>
                          <button className="btn btn-ghost" onClick={() => setShowTickerPicker(false)} style={{ fontSize: 11 }}>Đóng</button>
                        </div>

                        {/* Popular tickers shortcut */}
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Mã phổ biến:</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {POPULAR_TICKERS.map(t => (
                            <button
                              key={t}
                              className={`btn btn-sm ${newTicker === t ? 'btn-primary' : 'btn-ghost'}`}
                              onClick={() => { setNewTicker(t); setShowTickerPicker(false); }}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Mã CK</th>
                          <th style={{ textAlign: 'right' }}>SL</th>
                          <th style={{ textAlign: 'right' }}>Giá mua TB</th>
                          <th style={{ textAlign: 'right' }}>Giá hiện tại</th>
                          <th style={{ textAlign: 'right' }}>Giá trị TT</th>
                          <th style={{ textAlign: 'right' }}>P&L</th>
                          <th style={{ textAlign: 'right' }}>Tỷ trọng</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {holdings.length === 0 ? (
                          <tr>
                            <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: 13 }}>
                              Chưa có cổ phiếu nào. Nhấn "+ Thêm CP" để bắt đầu.
                            </td>
                          </tr>
                        ) : holdings.map((h: any) => (
                          <tr key={h.id}>
                            <td className="ticker-cell">{h.ticker}</td>
                            <td className="num-cell">{h.quantity?.toLocaleString()}</td>
                            <td className="num-cell">{formatPrice(h.avg_cost)}</td>
                            <td className="num-cell">{formatPrice(h.current_price)}</td>
                            <td className="num-cell">{formatPrice(h.market_value)}</td>
                            <td className={`num-cell ${changeClass(h.pnl_pct)}`}>{formatPct(h.pnl_pct)}</td>
                            <td className="num-cell">
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                                <div className="confidence-bar" style={{ width: 40 }}>
                                  <div className="confidence-fill fill-blue" style={{ width: `${h.weight ?? 0}%` }} />
                                </div>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{h.weight?.toFixed(1)}%</span>
                              </div>
                            </td>
                            <td>
                              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-red)' }}
                                onClick={() => deleteHolding(h.id)}>✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Optimize */}
                  {holdings.length >= 2 && (
                    <div className="card">
                      <div className="section-header">
                        <div className="section-title"><span>⚙️</span> Tối ưu hóa Markowitz</div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {['sharpe', 'min_volatility', 'max_return'].map(obj => (
                            <button key={obj} onClick={() => setObjective(obj)}
                              className={`btn btn-sm ${objective === obj ? 'btn-primary' : 'btn-outline'}`}>
                              {obj === 'sharpe' ? 'Max Sharpe' : obj === 'min_volatility' ? 'Min Risk' : 'Max Return'}
                            </button>
                          ))}
                          <button className="btn btn-primary" onClick={optimize} disabled={optimizing}>
                            {optimizing ? '⏳ Đang tính...' : '🚀 Tối ưu'}
                          </button>
                        </div>
                      </div>

                      {optimizeResult && (
                        <>
                          <div className="grid-3" style={{ marginBottom: 16 }}>
                            {[
                              { label: 'Lợi nhuận kỳ vọng', value: formatPct(optimizeResult.expected_return) },
                              { label: 'Độ biến động', value: formatPct(optimizeResult.volatility) },
                              { label: 'Sharpe Ratio', value: optimizeResult.sharpe_ratio?.toFixed(3) },
                            ].map(s => (
                              <div key={s.label} className="stat-card">
                                <div className="stat-label">{s.label}</div>
                                <div className="stat-value" style={{ fontSize: 18, color: 'var(--accent-blue)' }}>{s.value}</div>
                              </div>
                            ))}
                          </div>
                          <EfficientFrontier data={optimizeResult.frontier} optPoint={{
                            expected_return: optimizeResult.expected_return,
                            volatility: optimizeResult.volatility,
                          }} />
                          {optimizeResult.rebalance_trades?.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Đề xuất tái cơ cấu</div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 10 }}>
                                {optimizeResult.rebalance_trades.map((r: any) => (
                                  <RebalanceCard key={r.ticker} item={r} />
                                ))}
                              </div>
                            </div>
                          )}
                          {optimizeResult.xai_explanation && (
                            <div style={{
                              marginTop: 12, padding: '12px 16px', background: 'rgba(139,92,246,0.06)',
                              border: '1px solid rgba(139,92,246,0.2)', borderRadius: 10,
                              fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7,
                            }}
                              dangerouslySetInnerHTML={{ __html: optimizeResult.xai_explanation.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                            />
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
