'use client';
import { useEffect, useRef } from 'react';

const DEMO_TICKERS = [
  { label: 'VN-INDEX', price: '1.287,45', chg: '+0.82%', up: true },
  { label: 'VN30', price: '1.342,10', chg: '+1.05%', up: true },
  { label: 'HNX', price: '228,67', chg: '-0.31%', up: false },
  { label: 'UPCOM', price: '91,24', chg: '+0.14%', up: true },
  { label: 'Vàng SJC', price: '85.200.000', chg: '+0.45%', up: true },
  { label: 'USD/VND', price: '25.450', chg: '-0.12%', up: false },
  { label: 'EUR/VND', price: '27.820', chg: '+0.23%', up: true },
  { label: 'Dầu thô WTI', price: '$78.42', chg: '+1.34%', up: true },
];

export default function MarketTicker() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let pos = 0;
    const speed = 0.5;
    let raf: number;
    const half = track.scrollWidth / 2;

    const step = () => {
      pos += speed;
      if (pos >= half) pos = 0;
      track.style.transform = `translateX(-${pos}px)`;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const items = [...DEMO_TICKERS, ...DEMO_TICKERS]; // duplicate for seamless loop

  return (
    <div style={{
      background: 'rgba(10,14,26,0.98)',
      borderBottom: '1px solid var(--border-color)',
      height: 36,
      overflow: 'hidden',
      position: 'relative',
    }}>
      <div ref={trackRef} style={{ display: 'flex', alignItems: 'center', height: '100%', whiteSpace: 'nowrap', willChange: 'transform' }}>
        {items.map((t, i) => (
          <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 24px', borderRight: '1px solid rgba(99,179,237,0.08)', height: '100%' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{t.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-accent)' }}>{t.price}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.up ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {t.up ? '▲' : '▼'} {t.chg}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
