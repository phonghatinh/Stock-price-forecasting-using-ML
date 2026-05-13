'use client';
import useSWR from 'swr';
import { settingsApi } from '@/lib/api';
import { useState } from 'react';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: notifications, mutate } = useSWR('notifications', settingsApi.getNotifications, {
    refreshInterval: 30_000,
    fallbackData: [],
  });

  const unread = (notifications ?? []).filter((n: any) => !n.read).length;

  const typeIcon = (type: string) => ({ signal: '🤖', price: '💰', ai: '✨' }[type] ?? '🔔');
  const typeColor = (type: string) => ({ signal: 'var(--accent-blue)', price: 'var(--accent-yellow)', ai: 'var(--accent-purple)' }[type] ?? 'var(--text-secondary)');

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', position: 'relative',
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8, transition: 'background 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      >
        <span style={{ fontSize: 18 }}>🔔</span>
        {unread > 0 && (
          <div style={{
            position: 'absolute', top: 4, right: 4, width: 16, height: 16,
            background: 'var(--accent-red)', borderRadius: '50%',
            fontSize: 9, fontWeight: 700, color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{unread}</div>
        )}
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', right: 0, top: '110%', zIndex: 300,
            width: 360, background: 'var(--bg-card)',
            border: '1px solid var(--border-hover)', borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            maxHeight: 420, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>🔔 Thông báo</span>
              {unread > 0 && <span style={{ fontSize: 11, color: 'var(--accent-blue)', fontWeight: 600 }}>{unread} chưa đọc</span>}
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {(notifications ?? []).length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Không có thông báo mới</div>
              ) : (notifications ?? []).map((n: any) => (
                <div key={n.id} style={{
                  padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                  background: n.read ? 'transparent' : 'rgba(59,130,246,0.04)',
                  transition: 'background 0.2s', cursor: 'pointer',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(59,130,246,0.04)')}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 16, marginTop: 1 }}>{typeIcon(n.type)}</span>
                    <div style={{ flex: 1 }}>
                      {n.ticker && <div style={{ fontSize: 11, fontWeight: 700, color: typeColor(n.type), fontFamily: 'var(--font-mono)', marginBottom: 2 }}>{n.ticker}</div>}
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{n.message}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                        {new Date(n.timestamp).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {!n.read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-blue)', flexShrink: 0, marginTop: 4 }} />}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-color)' }}>
              <a href="/settings" style={{ fontSize: 12, color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>Quản lý thông báo →</a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
