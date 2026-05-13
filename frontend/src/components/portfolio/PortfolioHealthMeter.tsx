'use client';

// Portfolio Health Meter + Sector Allocation Donut
const SECTOR_COLORS = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16'];

interface Props {
  riskScore?: number;
  diversification?: number;
  sectorAlloc?: Record<string, number>;
}

export default function PortfolioHealthMeter({ riskScore = 42, diversification = 78, sectorAlloc = {
  'Ngân hàng': 35, 'Công nghệ': 20, 'Thép': 15, 'Bất động sản': 12, 'Thực phẩm': 10, 'Khác': 8
}}: Props) {
  const healthScore = Math.round((100 - riskScore) * 0.4 + diversification * 0.6);
  const healthColor = healthScore >= 70 ? 'var(--accent-green)' : healthScore >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)';
  const healthLabel = healthScore >= 70 ? 'Tốt' : healthScore >= 50 ? 'Trung bình' : 'Cần cải thiện';

  // Donut chart
  const sectors = Object.entries(sectorAlloc);
  const r = 52, cx = 65, cy = 65;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const slices = sectors.map(([name, pct], i) => {
    const dash = (pct / 100) * circ;
    const slice = { name, pct, dash, offset, color: SECTOR_COLORS[i % SECTOR_COLORS.length] };
    offset += dash;
    return slice;
  });

  return (
    <div className="card">
      <div className="section-title" style={{ marginBottom: 16 }}><span>💊</span> Sức khoẻ Danh mục</div>

      {/* Health Meter */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ position: 'relative', width: 120, height: 66, marginBottom: 8 }}>
          <svg width={120} height={80} viewBox="0 0 120 80">
            {/* Track arc */}
            <path d="M 10 70 A 50 50 0 0 1 110 70" fill="none" stroke="var(--bg-secondary)" strokeWidth={12} strokeLinecap="round" />
            {/* Fill arc */}
            <path
              d={`M 10 70 A 50 50 0 0 1 110 70`}
              fill="none" stroke={healthColor} strokeWidth={12} strokeLinecap="round"
              strokeDasharray={`${(healthScore / 100) * 157} 157`}
            />
            <text x="60" y="72" textAnchor="middle" fill="var(--text-primary)" fontSize={18} fontWeight={800}>{healthScore}</text>
          </svg>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: healthColor }}>{healthLabel}</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rủi ro</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: riskScore > 60 ? 'var(--accent-red)' : riskScore > 40 ? 'var(--accent-yellow)' : 'var(--accent-green)' }}>{riskScore}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Đa dạng</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-blue)' }}>{diversification}%</div>
          </div>
        </div>
      </div>

      {/* Sector Donut */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Phân bổ ngành</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <svg width={130} height={130} viewBox="0 0 130 130">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-secondary)" strokeWidth={16} />
          {slices.map(s => (
            <circle key={s.name} cx={cx} cy={cy} r={r} fill="none"
              stroke={s.color} strokeWidth={16}
              strokeDasharray={`${s.dash} ${circ}`}
              strokeDashoffset={-s.offset}
              style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
            />
          ))}
        </svg>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {slices.map(s => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1 }}>{s.name}</span>
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: s.color }}>{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
