'use client';

interface RebalanceItem {
  ticker: string;
  current_weight: number;
  target_weight: number;
  action: string;
  diff_pct: number;
  reason: string;
}

interface Props { item: RebalanceItem; }

const ACTION_STYLES: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  BUY:  { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)',  color: 'var(--accent-green)',  icon: '↑ MUA' },
  SELL: { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)',   color: 'var(--accent-red)',    icon: '↓ BÁN' },
  HOLD: { bg: 'rgba(148,163,184,0.06)', border: 'rgba(148,163,184,0.15)', color: 'var(--text-secondary)', icon: '— GIỮ' },
};

export default function RebalanceCard({ item }: Props) {
  const style = ACTION_STYLES[item.action] ?? ACTION_STYLES.HOLD;

  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: 10,
      background: style.bg,
      border: `1px solid ${style.border}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-accent)', fontFamily: 'var(--font-mono)' }}>{item.ticker}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: style.color, padding: '2px 8px', borderRadius: 4, background: style.border }}>{style.icon}</span>
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.current_weight?.toFixed(1)}%</span>
        <div style={{ flex: 1, height: 4, background: 'var(--bg-secondary)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, height: '100%', width: `${item.current_weight}%`, background: 'var(--text-muted)', borderRadius: 2 }} />
          <div style={{ position: 'absolute', left: 0, height: '100%', width: `${item.target_weight}%`, background: style.color, borderRadius: 2, opacity: 0.7 }} />
        </div>
        <span style={{ fontSize: 11, color: style.color, fontWeight: 700 }}>{item.target_weight?.toFixed(1)}%</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.reason}</div>
    </div>
  );
}
