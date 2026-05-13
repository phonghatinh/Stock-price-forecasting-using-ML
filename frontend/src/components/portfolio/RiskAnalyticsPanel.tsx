'use client';
import { formatPct } from '@/lib/utils';

interface Props {
  sharpe?: number;
  beta?: number;
  alpha?: number;
  maxDrawdown?: number;
  volatility?: number;
  winRate?: number;
}

function GaugeBar({ value, min, max, good, color }: { value: number; min: number; max: number; good: string; color: string }) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  return (
    <div style={{ flex: 1, height: 4, background: 'var(--bg-secondary)', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.8s ease' }} />
    </div>
  );
}

export default function RiskAnalyticsPanel({ sharpe = 1.24, beta = 0.87, alpha = 3.2, maxDrawdown = -12.4, volatility = 18.6, winRate = 62.5 }: Props) {
  const metrics = [
    {
      label: 'Sharpe Ratio', value: sharpe.toFixed(2), desc: 'Lợi nhuận/Rủi ro',
      color: sharpe >= 1 ? 'var(--accent-green)' : sharpe >= 0.5 ? 'var(--accent-yellow)' : 'var(--accent-red)',
      bar: { value: sharpe, min: -1, max: 3, color: '#10b981' },
      tip: sharpe >= 1 ? '✓ Tốt' : sharpe >= 0.5 ? '~ Trung bình' : '✗ Thấp',
    },
    {
      label: 'Beta (β)', value: beta.toFixed(2), desc: 'Tương quan với VN30',
      color: beta <= 1 ? 'var(--accent-green)' : 'var(--accent-yellow)',
      bar: { value: beta, min: 0, max: 2, color: '#3b82f6' },
      tip: beta < 1 ? '📉 Phòng thủ' : beta > 1.2 ? '📈 Tích cực' : '⚖ Cân bằng',
    },
    {
      label: 'Alpha (α)', value: `+${alpha.toFixed(1)}%`, desc: 'Vượt trội benchmark',
      color: alpha >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
      bar: { value: alpha + 10, min: 0, max: 20, color: '#8b5cf6' },
      tip: alpha > 3 ? '🏆 Vượt trội' : alpha > 0 ? '✓ Dương' : '✗ Thua benchmark',
    },
    {
      label: 'Max Drawdown', value: `${maxDrawdown.toFixed(1)}%`, desc: 'Giảm tối đa từ đỉnh',
      color: maxDrawdown > -10 ? 'var(--accent-green)' : maxDrawdown > -20 ? 'var(--accent-yellow)' : 'var(--accent-red)',
      bar: { value: -maxDrawdown, min: 0, max: 50, color: '#ef4444' },
      tip: maxDrawdown > -10 ? '✓ Kiểm soát tốt' : maxDrawdown > -20 ? '~ Chấp nhận được' : '✗ Rủi ro cao',
    },
    {
      label: 'Biến động (Vol)', value: `${volatility.toFixed(1)}%`, desc: 'Độ lệch chuẩn lợi nhuận',
      color: volatility < 15 ? 'var(--accent-green)' : volatility < 25 ? 'var(--accent-yellow)' : 'var(--accent-red)',
      bar: { value: volatility, min: 0, max: 50, color: '#f59e0b' },
      tip: volatility < 15 ? '✓ Thấp' : volatility < 25 ? '~ Trung bình' : '✗ Cao',
    },
    {
      label: 'Win Rate', value: `${winRate.toFixed(1)}%`, desc: 'Tỷ lệ giao dịch thắng',
      color: winRate >= 55 ? 'var(--accent-green)' : winRate >= 45 ? 'var(--accent-yellow)' : 'var(--accent-red)',
      bar: { value: winRate, min: 0, max: 100, color: '#06b6d4' },
      tip: winRate >= 55 ? '✓ Tốt' : '~ Cần cải thiện',
    },
  ];

  return (
    <div className="card">
      <div className="section-title" style={{ marginBottom: 16 }}><span>📐</span> Risk Analytics</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {metrics.map(m => (
          <div key={m.label} style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{m.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)', color: m.color }}>{m.value}</div>
              </div>
              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>{m.tip}</span>
            </div>
            <GaugeBar {...m.bar} good="" />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{m.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
