'use client';
import { useState } from 'react';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import Sidebar from '@/components/Sidebar';
import MarketTicker from '@/components/market/MarketTicker';
import { settingsApi } from '@/lib/api';

const RISK_PROFILES = [
  { id: 'conservative', label: 'Bảo thủ', icon: '🛡️', desc: 'Ưu tiên bảo toàn vốn, danh mục trái phiếu & blue-chip', color: '#10b981' },
  { id: 'moderate',     label: 'Trung lập', icon: '⚖️', desc: 'Cân bằng rủi ro và lợi nhuận', color: '#f59e0b' },
  { id: 'aggressive',   label: 'Tích cực',  icon: '🚀', desc: 'Chấp nhận biến động cao để tối đa lợi nhuận', color: '#ef4444' },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<'profile' | 'alerts' | 'notifications'>('profile');
  const [riskApps, setRiskApps] = useState('moderate');
  const [theme, setTheme] = useState('dark');
  const [horizon, setHorizon] = useState(5);
  const [newAlertTicker, setNewAlertTicker] = useState('');
  const [newAlertThreshold, setNewAlertThreshold] = useState('');
  const [newAlertType, setNewAlertType] = useState<'above' | 'below'>('above');
  const [saving, setSaving] = useState(false);

  const { data: profile } = useSWR('settings-profile', settingsApi.getProfile, {
    onSuccess: d => { setRiskApps(d.risk_appetite); setTheme(d.theme); setHorizon(d.default_horizon); }
  });

  const { data: alerts, mutate: mutateAlerts } = useSWR('settings-alerts', settingsApi.getAlerts, { fallbackData: [] });
  const { data: notifications } = useSWR('settings-notifications', settingsApi.getNotifications, { fallbackData: [] });

  const saveProfile = async () => {
    setSaving(true);
    try {
      await settingsApi.updateProfile({ risk_appetite: riskApps, theme, default_horizon: horizon, auto_refresh_interval: 60 });
      toast.success('Đã lưu cài đặt!');
    } catch { toast.error('Lỗi lưu cài đặt'); }
    finally { setSaving(false); }
  };

  const addAlert = async () => {
    if (!newAlertTicker || !newAlertThreshold) { toast.error('Nhập đầy đủ thông tin'); return; }
    try {
      await settingsApi.createPriceAlert({ ticker: newAlertTicker, alert_type: newAlertType, threshold: parseFloat(newAlertThreshold) });
      await mutateAlerts();
      setNewAlertTicker(''); setNewAlertThreshold('');
      toast.success('Đã tạo cảnh báo!');
    } catch { toast.error('Lỗi tạo cảnh báo'); }
  };

  const deleteAlert = async (id: string) => {
    try { await settingsApi.deleteAlert(id); await mutateAlerts(); toast.success('Đã xóa'); }
    catch { toast.error('Lỗi xóa'); }
  };

  const typeIcon = (type: string) => ({ signal: '🤖', price: '💰', ai: '✨' }[type] ?? '🔔');

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <MarketTicker />
        <div className="topbar">
          <h2 style={{ fontWeight: 700, fontSize: 18 }}>⚙️ Cài đặt & Thông báo</h2>
        </div>

        <div className="page">
          <div className="page-header">
            <h1 className="page-title text-gradient">Cài đặt Hệ thống</h1>
            <p className="page-subtitle">Tuỳ chỉnh hồ sơ, thông báo và khẩu vị rủi ro</p>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border-color)', paddingBottom: 0 }}>
            {([['profile', '👤 Hồ sơ'], ['alerts', '🔔 Cảnh báo giá'], ['notifications', '📬 Thông báo']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                style={{
                  padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 600, color: tab === id ? 'var(--accent-blue)' : 'var(--text-muted)',
                  borderBottom: tab === id ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  transition: 'all 0.2s', marginBottom: -1,
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* Profile Tab */}
          {tab === 'profile' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* User info */}
                <div className="card">
                  <div className="section-title" style={{ marginBottom: 16 }}><span>👤</span> Thông tin tài khoản</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>👤</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{profile?.name ?? 'Nhà đầu tư'}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{profile?.email ?? 'user@fiinquant.vn'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Benchmark', value: profile?.benchmark ?? 'VN30' },
                      { label: 'Horizon mặc định', value: `${profile?.default_horizon ?? 5} phiên` },
                    ].map(f => (
                      <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{f.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-blue)' }}>{f.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Theme */}
                <div className="card">
                  <div className="section-title" style={{ marginBottom: 14 }}><span>🎨</span> Giao diện</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[{ id: 'dark', label: '🌙 Dark Mode' }, { id: 'light', label: '☀️ Light Mode' }].map(t => (
                      <button key={t.id} onClick={() => setTheme(t.id)}
                        className={`btn ${theme === t.id ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1, justifyContent: 'center' }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Horizon dự báo mặc định</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[3, 5, 10, 15].map(d => (
                        <button key={d} onClick={() => setHorizon(d)}
                          className={`btn btn-sm ${horizon === d ? 'btn-primary' : 'btn-outline'}`}>{d} ngày</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk profile */}
              <div className="card">
                <div className="section-title" style={{ marginBottom: 16 }}><span>⚠️</span> Khẩu vị rủi ro</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {RISK_PROFILES.map(rp => (
                    <div key={rp.id} onClick={() => setRiskApps(rp.id)} style={{
                      padding: '16px', borderRadius: 12, cursor: 'pointer',
                      border: `1px solid ${riskApps === rp.id ? rp.color + '60' : 'var(--border-color)'}`,
                      background: riskApps === rp.id ? `${rp.color}12` : 'var(--bg-secondary)',
                      transition: 'all 0.2s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 24 }}>{rp.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, color: riskApps === rp.id ? rp.color : 'var(--text-primary)' }}>{rp.label}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{rp.desc}</div>
                        </div>
                        {riskApps === rp.id && <div style={{ width: 20, height: 20, borderRadius: '50%', background: rp.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'white', fontWeight: 700 }}>✓</div>}
                      </div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary" onClick={saveProfile} disabled={saving} style={{ width: '100%', justifyContent: 'center', marginTop: 16, padding: '12px' }}>
                  {saving ? '⏳ Đang lưu...' : '💾 Lưu cài đặt'}
                </button>
              </div>
            </div>
          )}

          {/* Alerts Tab */}
          {tab === 'alerts' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Create alert */}
              <div className="card">
                <div className="section-title" style={{ marginBottom: 16 }}><span>➕</span> Tạo cảnh báo giá mới</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input className="input" placeholder="Mã cổ phiếu (VD: VNM)" value={newAlertTicker}
                    onChange={e => setNewAlertTicker(e.target.value.toUpperCase())} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['above', 'below'] as const).map(t => (
                      <button key={t} onClick={() => setNewAlertType(t)}
                        className={`btn btn-sm ${newAlertType === t ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1, justifyContent: 'center' }}>
                        {t === 'above' ? '▲ Giá vượt' : '▼ Giá xuống'}
                      </button>
                    ))}
                  </div>
                  <input className="input" type="number" placeholder="Ngưỡng giá (VND)" value={newAlertThreshold}
                    onChange={e => setNewAlertThreshold(e.target.value)} />
                  <button className="btn btn-primary" onClick={addAlert} style={{ justifyContent: 'center' }}>
                    🔔 Tạo cảnh báo
                  </button>
                </div>

                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cảnh báo tín hiệu AI</div>
                  <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                    💡 Hệ thống tự động thông báo khi AI thay đổi tín hiệu (BUY/SELL/HOLD) cho các mã trong danh mục.
                    <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(16,185,129,0.12)', color: 'var(--accent-green)', fontSize: 12, fontWeight: 700 }}>MUA</span>
                      <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(239,68,68,0.12)', color: 'var(--accent-red)', fontSize: 12, fontWeight: 700 }}>BÁN</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active alerts */}
              <div className="card">
                <div className="section-title" style={{ marginBottom: 16 }}><span>📋</span> Cảnh báo đang hoạt động</div>
                {(alerts ?? []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: 13 }}>
                    Chưa có cảnh báo nào. Tạo cảnh báo đầu tiên!
                  </div>
                ) : (alerts ?? []).map((a: any) => (
                  <div key={a.id} style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border-color)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                      {a.type === 'signal_change' ? '🤖' : '💰'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-accent)', fontFamily: 'var(--font-mono)' }}>{a.ticker ?? 'Tất cả'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.label}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.active ? 'var(--accent-green)' : 'var(--text-muted)' }} />
                      <button onClick={() => deleteAlert(a.id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-red)', padding: '4px 8px' }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {tab === 'notifications' && (
            <div className="card" style={{ maxWidth: 700 }}>
              <div className="section-title" style={{ marginBottom: 16 }}><span>📬</span> Thông báo gần đây</div>
              {(notifications ?? []).map((n: any) => (
                <div key={n.id} style={{
                  padding: '14px 16px', borderRadius: 10, marginBottom: 10,
                  background: n.read ? 'var(--bg-secondary)' : 'rgba(59,130,246,0.06)',
                  border: `1px solid ${n.read ? 'var(--border-color)' : 'rgba(59,130,246,0.2)'}`,
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                }}>
                  <span style={{ fontSize: 20 }}>{typeIcon(n.type)}</span>
                  <div style={{ flex: 1 }}>
                    {n.ticker && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-blue)', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>{n.ticker}</div>}
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{n.message}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      {new Date(n.timestamp).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  {!n.read && <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)', fontSize: 11, fontWeight: 700 }}>MỚI</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
