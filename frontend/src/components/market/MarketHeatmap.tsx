'use client';

// Demo heatmap data — sector/stocks grid
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
  { ticker: 'VNM',  chg: -0.82, sector: 'Thực phẩm', size: 3 },
  { ticker: 'SAB',  chg: +0.30, sector: 'Thực phẩm', size: 2 },
  { ticker: 'MSN',  chg: +0.55, sector: 'Hàng tiêu dùng', size: 2 },
  { ticker: 'MWG',  chg: -1.45, sector: 'Bán lẻ', size: 2 },
  { ticker: 'PNJ',  chg: +0.77, sector: 'Bán lẻ', size: 1 },
  { ticker: 'VHM',  chg: -2.10, sector: 'BĐS', size: 3 },
  { ticker: 'VIC',  chg: -1.33, sector: 'BĐS', size: 3 },
  { ticker: 'NVL',  chg: +0.22, sector: 'BĐS', size: 1 },
  { ticker: 'SSI',  chg: +2.34, sector: 'Chứng khoán', size: 2 },
  { ticker: 'VND',  chg: +1.76, sector: 'Chứng khoán', size: 2 },
  { ticker: 'HCM',  chg: +0.98, sector: 'Chứng khoán', size: 1 },
  { ticker: 'GAS',  chg: +0.45, sector: 'Năng lượng', size: 2 },
  { ticker: 'PLX',  chg: -0.22, sector: 'Năng lượng', size: 2 },
];

function getColor(chg: number) {
  if (chg >= 2)   return { bg: 'rgba(16,185,129,0.45)', border: 'rgba(16,185,129,0.6)', text: '#34d399' };
  if (chg >= 1)   return { bg: 'rgba(16,185,129,0.25)', border: 'rgba(16,185,129,0.4)', text: '#10b981' };
  if (chg >= 0)   return { bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.2)', text: '#10b981' };
  if (chg >= -1)  return { bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.2)',  text: '#ef4444' };
  if (chg >= -2)  return { bg: 'rgba(239,68,68,0.25)',  border: 'rgba(239,68,68,0.4)',  text: '#ef4444' };
                  return { bg: 'rgba(239,68,68,0.45)',  border: 'rgba(239,68,68,0.6)',  text: '#f87171' };
}

export default function MarketHeatmap() {
  const sectors = Array.from(new Set(HEATMAP_DATA.map(d => d.sector)));

  return (
    <div className="card">
      <div className="section-title" style={{ marginBottom: 16 }}>
        <span>🔥</span> Market Heatmap
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8, fontWeight: 400 }}>Phiên hôm nay</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sectors.map(sector => {
          const items = HEATMAP_DATA.filter(d => d.sector === sector);
          return (
            <div key={sector}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{sector}</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {items.map(item => {
                  const c = getColor(item.chg);
                  const sz = item.size === 3 ? 80 : item.size === 2 ? 64 : 52;
                  return (
                    <div key={item.ticker} style={{
                      width: sz, height: sz, borderRadius: 8,
                      background: c.bg, border: `1px solid ${c.border}`,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.zIndex = '10'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.zIndex = '1'; }}
                      title={`${item.ticker}: ${item.chg > 0 ? '+' : ''}${item.chg}%`}
                    >
                      <div style={{ fontSize: item.size === 3 ? 12 : 10, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{item.ticker}</div>
                      <div style={{ fontSize: item.size === 3 ? 11 : 9, fontWeight: 600, color: c.text }}>
                        {item.chg > 0 ? '+' : ''}{item.chg.toFixed(2)}%
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
      <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', justifyContent: 'center' }}>
        {[{ label: '≥+2%', chg: 2.5 }, { label: '+1%', chg: 1.5 }, { label: '0%', chg: 0.2 }, { label: '-1%', chg: -1.5 }, { label: '≤-2%', chg: -2.5 }].map(l => {
          const c = getColor(l.chg);
          return (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: c.bg, border: `1px solid ${c.border}` }} />
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{l.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
