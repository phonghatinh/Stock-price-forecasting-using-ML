'use client';

const HEATMAP_DATA = [
  { ticker: 'VCB',  chg: +1.42, sector: 'Ngân hàng', size: 3 },
  { ticker: 'BID',  chg: +0.83, sector: 'Ngân hàng', size: 2 },
  { ticker: 'CTG',  chg: -0.51, sector: 'Ngân hàng', size: 2 },
  { ticker: 'MBB',  chg: +0.62, sector: 'Ngân hàng', size: 2 },
  { ticker: 'TCB',  chg: -1.23, sector: 'Ngân hàng', size: 2 },
  { ticker: 'ACB',  chg: +0.44, sector: 'Ngân hàng', size: 1 },
  { ticker: 'HPG',  chg: +2.05, sector: 'Thép', size: 3 },
  { ticker: 'HSG',  chg: +1.20, sector: 'Thép', size: 1 },
  { ticker: 'NKG',  chg: -0.35, sector: 'Thép', size: 1 },
  { ticker: 'FPT',  chg: +1.88, sector: 'Công nghệ', size: 3 },
  { ticker: 'CMG',  chg: -0.67, sector: 'Công nghệ', size: 1 },
  { ticker: 'VNM',  chg: -0.82, sector: 'Tiêu dùng', size: 3 },
  { ticker: 'SAB',  chg: +0.30, sector: 'Tiêu dùng', size: 2 },
  { ticker: 'MSN',  chg: +0.55, sector: 'Tiêu dùng', size: 2 },
  { ticker: 'MWG',  chg: -1.45, sector: 'Bán lẻ', size: 2 },
  { ticker: 'PNJ',  chg: +0.77, sector: 'Bán lẻ', size: 1 },
  { ticker: 'VHM',  chg: -2.10, sector: 'BĐS', size: 3 },
  { ticker: 'VIC',  chg: -1.33, sector: 'BĐS', size: 3 },
  { ticker: 'NVL',  chg: +0.22, sector: 'BĐS', size: 1 },
  { ticker: 'SSI',  chg: +2.34, sector: 'CK', size: 2 },
  { ticker: 'VND',  chg: +1.76, sector: 'CK', size: 2 },
  { ticker: 'GAS',  chg: +0.45, sector: 'Năng lượng', size: 2 },
  { ticker: 'PLX',  chg: -0.22, sector: 'Năng lượng', size: 2 },
];

function getColor(chg: number) {
  // Rich green/red palette with good contrast
  if (chg >= 2)   return { bg: 'rgba(5,150,105,0.55)',  border: 'rgba(16,185,129,0.7)',  text: '#6ee7b7' };
  if (chg >= 1)   return { bg: 'rgba(16,185,129,0.30)', border: 'rgba(16,185,129,0.5)',  text: '#34d399' };
  if (chg >= 0.1) return { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.25)', text: '#10b981' };
  if (chg >= -0.1) return { bg: 'rgba(100,116,139,0.20)',border: 'rgba(100,116,139,0.3)', text: '#94a3b8' };
  if (chg >= -1)  return { bg: 'rgba(239,68,68,0.18)',  border: 'rgba(239,68,68,0.35)',  text: '#f87171' };
  if (chg >= -2)  return { bg: 'rgba(239,68,68,0.33)',  border: 'rgba(239,68,68,0.55)',  text: '#ef4444' };
  return          { bg: 'rgba(185,28,28,0.50)',  border: 'rgba(239,68,68,0.75)',  text: '#fca5a5' };
}

export default function MarketHeatmap() {
  const sectors = Array.from(new Set(HEATMAP_DATA.map(d => d.sector)));

  return (
    <div className="card" style={{ padding: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>🔥</span> Heatmap
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Phiên hôm nay</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sectors.map(sector => {
          const items = HEATMAP_DATA.filter(d => d.sector === sector);
          return (
            <div key={sector}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3 }}>
                {sector}
              </div>
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {items.map(item => {
                  const c = getColor(item.chg);
                  // Compact sizes to fit in 300px right panel
                  const sz = item.size === 3 ? 58 : item.size === 2 ? 46 : 36;
                  return (
                    <div
                      key={item.ticker}
                      style={{
                        width: sz, height: sz, borderRadius: 6,
                        background: c.bg, border: `1px solid ${c.border}`,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all 0.18s',
                        position: 'relative',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'scale(1.08)';
                        e.currentTarget.style.zIndex = '10';
                        e.currentTarget.style.boxShadow = `0 4px 12px ${c.border}`;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.zIndex = '1';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      title={`${item.ticker}: ${item.chg > 0 ? '+' : ''}${item.chg}%`}
                    >
                      <div style={{ fontSize: item.size === 3 ? 10 : 9, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                        {item.ticker}
                      </div>
                      <div style={{ fontSize: item.size === 3 ? 9 : 8, fontWeight: 600, color: c.text, marginTop: 2 }}>
                        {item.chg > 0 ? '+' : ''}{item.chg.toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
        {[
          { label: '≥+2%', chg: 2.5 },
          { label: '+1%', chg: 1.5 },
          { label: '0%', chg: 0.2 },
          { label: '-1%', chg: -1.5 },
          { label: '≤-2%', chg: -2.5 },
        ].map(l => {
          const c = getColor(l.chg);
          return (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: c.bg, border: `1px solid ${c.border}` }} />
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{l.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
