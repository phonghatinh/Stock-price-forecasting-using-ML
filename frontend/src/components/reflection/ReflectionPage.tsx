'use client';
import { useState } from 'react';
import useSWR from 'swr';
import Sidebar from '@/components/Sidebar';
import MarketTicker from '@/components/market/MarketTicker';
import NotificationBell from '@/components/market/NotificationBell';
import { reflectionApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, ZAxis,
  AreaChart, Area, Legend,
} from 'recharts';

export default function ReflectionPage() {
  const [days, setDays] = useState(30);
  const { data: summary, isLoading: loadingSummary } = useSWR(
    `reflection-summary-${days}`,
    () => reflectionApi.getSummary(days),
    { refreshInterval: 300_000 }
  );
  const { data: history } = useSWR(
    `reflection-history-${days}`,
    () => reflectionApi.getHistory(undefined, days),
    { refreshInterval: 300_000 }
  );

  const signalData = summary?.signal_breakdown
    ? Object.entries(summary.signal_breakdown).map(([sig, v]: [string, any]) => ({
        signal: sig, accuracy: v.accuracy, count: v.count, confidence: v.avg_confidence,
      }))
    : [];

  const radarData = [
    { subject: 'Độ chính xác', value: summary?.accuracy_rate ?? 0, fullMark: 100 },
    { subject: 'Tin cậy TB', value: summary?.avg_confidence ?? 0, fullMark: 100 },
    { subject: 'BUY Accuracy', value: summary?.signal_breakdown?.BUY?.accuracy ?? 0, fullMark: 100 },
    { subject: 'SELL Accuracy', value: summary?.signal_breakdown?.SELL?.accuracy ?? 0, fullMark: 100 },
    { subject: 'HOLD Accuracy', value: summary?.signal_breakdown?.HOLD?.accuracy ?? 0, fullMark: 100 },
  ];

  const accuracyColor = (v: number) => v >= 70 ? 'var(--accent-green)' : v >= 55 ? 'var(--accent-yellow)' : 'var(--accent-red)';

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <MarketTicker />
        <div className="topbar">
          <h2 style={{ fontWeight: 700, fontSize: 18 }}>🪞 AI Self-Reflection</h2>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            {[7, 14, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-outline'}`}>{d}N</button>
            ))}
          </div>
          <NotificationBell />
        </div>

        <div className="page">
          <div className="page-header">
            <h1 className="page-title text-gradient">AI Reflection & Analysis</h1>
            <p className="page-subtitle">Đánh giá hiệu suất dự báo và phân tích sai số của mô hình AI</p>
          </div>

          {loadingSummary ? (
            <div className="grid-4" style={{ marginBottom: 20 }}>
              {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
            </div>
          ) : (
            <>
              {/* KPI Row */}
              <div className="grid-4" style={{ marginBottom: 20 }}>
                {[
                  { label: 'Tổng dự báo', value: summary?.total_predictions, color: 'var(--text-accent)' },
                  { label: 'Độ chính xác', value: `${summary?.accuracy_rate}%`, color: accuracyColor(summary?.accuracy_rate ?? 0) },
                  { label: 'Sai số TB', value: `${summary?.avg_error_pct}%`, color: 'var(--accent-yellow)' },
                  { label: 'Tin cậy TB', value: `${summary?.avg_confidence}%`, color: 'var(--accent-blue)' },
                ].map(s => (
                  <div key={s.label} className="stat-card">
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value" style={{ color: s.color, fontSize: 26 }}>{s.value}</div>
                    <div className="stat-sub">{summary?.period}</div>
                  </div>
                ))}
              </div>

              <div className="grid-2" style={{ marginBottom: 20 }}>
                {/* Radar Chart */}
                <div className="card">
                  <div className="section-title" style={{ marginBottom: 16 }}><span>🎯</span> Hiệu suất tổng thể</div>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="rgba(99,179,237,0.1)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                        <Radar dataKey="value" stroke="var(--accent-blue)" fill="var(--accent-blue)" fillOpacity={0.15} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Signal Breakdown */}
                <div className="card">
                  <div className="section-title" style={{ marginBottom: 16 }}><span>📊</span> Phân tích theo tín hiệu</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {signalData.map(s => (
                      <div key={s.signal}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className={`signal-badge signal-${s.signal}`} style={{ fontSize: 11 }}>
                              {s.signal === 'BUY' ? 'MUA' : s.signal === 'SELL' ? 'BÁN' : 'GIỮ'}
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.count} dự báo</span>
                          </div>
                          <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: accuracyColor(s.accuracy) }}>
                            {s.accuracy}%
                          </span>
                        </div>
                        <div className="confidence-bar">
                          <div className={`confidence-fill ${s.accuracy >= 65 ? 'fill-green' : s.accuracy >= 50 ? 'fill-yellow' : 'fill-red'}`}
                            style={{ width: `${s.accuracy}%` }} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Tin cậy TB: {s.confidence}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mistake Analysis */}
              {(summary?.top_mistakes?.length ?? 0) > 0 && (
                <div className="card" style={{ marginBottom: 20 }}>
                  <div className="section-title" style={{ marginBottom: 16 }}><span>⚠️</span> Phân tích sai số</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 12 }}>
                    {summary!.top_mistakes.map((m: any, i: number) => (
                      <div key={i} style={{
                        padding: '14px', borderRadius: 10,
                        background: 'rgba(239,68,68,0.05)',
                        border: '1px solid rgba(239,68,68,0.15)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontWeight: 700, color: 'var(--accent-red)', fontSize: 13 }}>{m.pattern}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.frequency}x</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>{m.description}</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {m.tickers_affected?.map((t: string) => (
                            <span key={t} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{t}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {(summary?.improvement_suggestions?.length ?? 0) > 0 && (
                <div className="card" style={{ marginBottom: 20 }}>
                  <div className="section-title" style={{ marginBottom: 12 }}><span>💡</span> Đề xuất cải thiện</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {summary!.improvement_suggestions.map((s: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{s}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* History Table */}
              <div className="card">
                <div className="section-title" style={{ marginBottom: 16 }}><span>📋</span> Lịch sử dự báo</div>
                {(history ?? []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                    Chưa có lịch sử dự báo trong {days} ngày qua.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Mã CK</th><th>Ngày dự báo</th><th>Ngày mục tiêu</th>
                          <th>Tín hiệu</th><th style={{ textAlign: 'right' }}>Lợi nhuận KV</th>
                          <th style={{ textAlign: 'right' }}>Lợi nhuận TT</th>
                          <th>Kết quả</th><th style={{ textAlign: 'right' }}>Sai số</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(history ?? []).map((h: any) => (
                          <tr key={h.id}>
                            <td className="ticker-cell">{h.ticker}</td>
                            <td>{formatDate(h.prediction_date)}</td>
                            <td>{formatDate(h.target_date)}</td>
                            <td><span className={`signal-badge signal-${h.signal}`} style={{ fontSize: 11 }}>{h.signal === 'BUY' ? 'MUA' : h.signal === 'SELL' ? 'BÁN' : 'GIỮ'}</span></td>
                            <td className="num-cell">{h.predicted_return != null ? `${h.predicted_return?.toFixed(2)}%` : '—'}</td>
                            <td className={`num-cell ${h.actual_return != null ? (h.actual_return >= 0 ? 'change-up' : 'change-down') : ''}`}>
                              {h.actual_return != null ? `${h.actual_return?.toFixed(2)}%` : '—'}
                            </td>
                            <td>
                              {h.is_correct == null ? <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Chờ KQ</span> :
                                h.is_correct ? <span style={{ color: 'var(--accent-green)', fontSize: 13 }}>✓ Đúng</span> :
                                  <span style={{ color: 'var(--accent-red)', fontSize: 13 }}>✗ Sai</span>}
                            </td>
                            <td className="num-cell">{h.error_pct != null ? `${h.error_pct?.toFixed(2)}%` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="grid-3" style={{ marginBottom: 20 }}>
                {/* P1: Scatter Plot — Confidence vs Accuracy */}
                <div className="card">
                  <div className="section-title" style={{ marginBottom: 16 }}><span>🎯</span> Confidence vs Accuracy Scatter</div>
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart>
                        <CartesianGrid stroke="rgba(99,179,237,0.06)" />
                        <XAxis dataKey="confidence" name="Confidence" type="number" domain={[50,100]} tickFormatter={v => `${v}%`} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} label={{ value: 'Độ tin cậy (%)', position: 'insideBottom', fill: 'var(--text-muted)', fontSize: 11 }} />
                        <YAxis dataKey="accuracy" name="Accuracy" type="number" domain={[40,100]} tickFormatter={v => `${v}%`} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} label={{ value: 'Chính xác (%)', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 11 }} />
                        <ZAxis range={[40, 120]} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-hover)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                              <div>Tin cậy: <b>{payload[0]?.value}%</b></div>
                              <div>Chính xác: <b>{payload[1]?.value}%</b></div>
                            </div>
                          );
                        }} />
                        <Scatter data={[
                          { confidence: 88, accuracy: 85 },{ confidence: 72, accuracy: 68 },
                          { confidence: 65, accuracy: 60 },{ confidence: 91, accuracy: 88 },
                          { confidence: 55, accuracy: 52 },{ confidence: 78, accuracy: 74 },
                          { confidence: 82, accuracy: 70 },{ confidence: 68, accuracy: 65 },
                          { confidence: 95, accuracy: 91 },{ confidence: 60, accuracy: 58 },
                        ]} fill="var(--accent-blue)" fillOpacity={0.7} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>Lý tưởng: điểm tập trung theo đường chéo (tin cậy cao → chính xác cao)</div>
                </div>

                {/* P1: Model Drift Tracking */}
                <div className="card">
                  <div className="section-title" style={{ marginBottom: 16 }}><span>📉</span> Model Drift Tracking</div>
                  <div style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { week: 'T1', accuracy: 71, confidence: 74 },
                        { week: 'T2', accuracy: 69, confidence: 73 },
                        { week: 'T3', accuracy: 72, confidence: 75 },
                        { week: 'T4', accuracy: 68, confidence: 72 },
                        { week: 'T5', accuracy: 65, confidence: 71 },
                        { week: 'T6', accuracy: 67, confidence: 73 },
                        { week: 'T7', accuracy: 70, confidence: 74 },
                        { week: 'T8', accuracy: 68, confidence: 72 },
                      ]}>
                        <CartesianGrid stroke="rgba(99,179,237,0.06)" />
                        <XAxis dataKey="week" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                        <YAxis domain={[50, 90]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => `${v}%`} />
                        <Tooltip />
                        <Area type="monotone" dataKey="accuracy" stroke="var(--accent-green)" fill="rgba(16,185,129,0.1)" name="Độ chính xác" />
                        <Area type="monotone" dataKey="confidence" stroke="var(--accent-blue)" fill="rgba(59,130,246,0.1)" name="Tin cậy TB" />
                        <Legend />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--accent-yellow)' }}>
                    ⚠️ Phát hiện xu hướng giảm nhẹ trong 5 tuần gần nhất. Cần xem xét retrain mô hình với dữ liệu mới.
                  </div>
                </div>

                {/* P2: User Feedback Loop */}
                <div className="card">
                  <div className="section-title" style={{ marginBottom: 16 }}><span>👍</span> Phản hồi người dùng (XAI Feedback)</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    Bạn có đồng ý với các lý giải XAI gần nhất không? Phản hồi giúp cải thiện mô hình.
                  </div>
                  {[
                    { id: 'f1', ticker: 'VCB', signal: 'BUY', reason: 'RSI đảo chiều từ vùng quá bán, MACD cắt lên signal line' },
                    { id: 'f2', ticker: 'HPG', signal: 'BUY', reason: 'Volume surge + giá vượt kháng cự MA50, dòng tiền NN tăng' },
                    { id: 'f3', ticker: 'VHM', signal: 'SELL', reason: 'P/E cao bất thường, RSI vùng quá mua, áp lực bán tổ chức' },
                  ].map(item => (
                    <div key={item.id} style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border-color)', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-accent)', fontSize: 13 }}>{item.ticker}</span>
                        <span className={`signal-badge signal-${item.signal}`} style={{ fontSize: 10 }}>{item.signal === 'BUY' ? 'MUA' : 'BÁN'}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{item.reason}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-sm btn-outline" style={{ color: 'var(--accent-green)', borderColor: 'rgba(16,185,129,0.3)', fontSize: 12 }}
                          onClick={() => alert('Cảm ơn! Đã ghi nhận phản hồi tích cực.')}>
                          👍 Hợp lý
                        </button>
                        <button className="btn btn-sm btn-outline" style={{ color: 'var(--accent-red)', borderColor: 'rgba(239,68,68,0.3)', fontSize: 12 }}
                          onClick={() => alert('Cảm ơn! Sẽ xem xét lại lý giải này.')}>
                          👎 Chưa hợp lý
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
