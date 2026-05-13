'use client';
import useSWR from 'swr';
import { marketApi } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function TopFactors() {
  const { data: macroData } = useSWR('market-macro', () => marketApi.getMacro('2023-01-01'), {
    refreshInterval: 3_600_000,
  });
  const { data: sectors } = useSWR('market-sectors', marketApi.getSectors, {
    refreshInterval: 300_000,
  });

  // macroData is now { latest: {...}, series: [...] }
  const latest = macroData?.latest ?? macroData?.[macroData?.length - 1];

  const macroItems = [
    {
      label: 'Lãi suất NN',
      value: latest?.interest_rate != null ? latest.interest_rate.toFixed(2) + '%' : '—',
      icon: '🏦',
    },
    {
      label: 'CPI',
      value: latest?.cpi != null ? latest.cpi.toFixed(2) + '%' : '—',
      icon: '📈',
    },
    {
      label: 'USD/VND',
      value: latest?.usd_vnd != null
        ? Number(latest.usd_vnd).toLocaleString('vi-VN', { maximumFractionDigits: 0 })
        : '—',
      icon: '💱',
    },
  ];

  const sectorData = (sectors ?? [])
    .map((s: any) => ({
      name: (s.sector ?? s.name ?? '').substring(0, 8),
      value: parseFloat((s.change_pct ?? 0).toFixed(2)),
    }))
    .sort((a: any, b: any) => b.value - a.value);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="section-title"><span>🌐</span> Yếu tố vĩ mô &amp; Ngành</div>

      {/* Macro Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {macroItems.map(item => (
          <div
            key={item.label}
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 10,
              padding: '12px',
              border: '1px solid var(--border-color)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-accent)' }}>
              {item.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* GDP growth if available */}
      {latest?.gdp_growth != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
          <span style={{ fontSize: 20 }}>📊</span>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tăng trưởng GDP</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>
              {latest.gdp_growth.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Sector Chart */}
      {sectorData.length > 0 ? (
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
            HIỆU SUẤT NGÀNH (%)
          </div>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorData} layout="vertical" margin={{ left: 0, right: 10 }}>
                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={55} />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, 'Thay đổi']}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {sectorData.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.value >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Đang tải dữ liệu ngành...
        </div>
      )}
    </div>
  );
}
