'use client';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';

interface FrontierPoint {
  expected_return: number;
  volatility: number;
  sharpe: number;
}

interface Props {
  data: FrontierPoint[];
  optPoint: { expected_return: number; volatility: number };
}

export default function EfficientFrontier({ data, optPoint }: Props) {
  const formatted = data.map(d => ({
    x: parseFloat(d.volatility.toFixed(2)),
    y: parseFloat(d.expected_return.toFixed(2)),
    sharpe: d.sharpe?.toFixed(3),
  }));

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        ĐƯỜNG BIÊN HIỆU QUẢ (Efficient Frontier)
      </div>
      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 20 }}>
            <CartesianGrid stroke="rgba(99,179,237,0.06)" />
            <XAxis
              dataKey="x" type="number" name="Rủi ro (%)" unit="%"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              label={{ value: 'Độ biến động (%)', position: 'bottom', fill: 'var(--text-muted)', fontSize: 11 }}
            />
            <YAxis
              dataKey="y" type="number" name="Lợi nhuận (%)" unit="%"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              label={{ value: 'Lợi nhuận (%)', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 11 }}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: 'var(--border-hover)' }}
              content={({ payload }) => {
                if (!payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-hover)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                    <div style={{ color: 'var(--text-muted)' }}>Rủi ro: <strong style={{ color: 'var(--accent-red)' }}>{d.x}%</strong></div>
                    <div style={{ color: 'var(--text-muted)' }}>Lợi nhuận: <strong style={{ color: 'var(--accent-green)' }}>{d.y}%</strong></div>
                    <div style={{ color: 'var(--text-muted)' }}>Sharpe: <strong style={{ color: 'var(--text-accent)' }}>{d.sharpe}</strong></div>
                  </div>
                );
              }}
            />
            <Scatter data={formatted} fill="rgba(59,130,246,0.4)" r={3} />
            {/* Optimal point */}
            <ReferenceDot
              x={parseFloat(optPoint.volatility.toFixed(2))}
              y={parseFloat(optPoint.expected_return.toFixed(2))}
              r={8} fill="#f59e0b" stroke="#fbbf24" strokeWidth={2}
              label={{ value: '★ Tối ưu', position: 'top', fill: '#f59e0b', fontSize: 11 }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
