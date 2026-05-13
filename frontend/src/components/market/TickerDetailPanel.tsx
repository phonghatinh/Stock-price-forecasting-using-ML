'use client';
import useSWR from 'swr';
import Link from 'next/link';
import { marketApi } from '@/lib/api';
import { formatPrice, formatPct, formatVolume, changeClass } from '@/lib/utils';

interface Props {
  ticker: string;
  onClose: () => void;
}

export default function TickerDetailPanel({ ticker, onClose }: Props) {
  const { data, isLoading } = useSWR(
    `ticker-detail-${ticker}`,
    () => marketApi.getTickerDetail(ticker),
    { refreshInterval: 30_000 }
  );

  const tech = data?.technicals ?? {};
  const chgCls = changeClass(data?.change_pct ?? 0);

  return (
    <div className="card" style={{ position: 'relative', padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--accent-blue)' }}>{ticker}</span>
          <div className="live-dot" />
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}
        >✕</button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 28, borderRadius: 6 }} />)}
        </div>
      ) : data ? (
        <>
          {/* Price summary */}
          <div style={{ marginBottom: 14, padding: '12px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-accent)' }}>
              {formatPrice(data.close)}
            </div>
            <div className={chgCls} style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
              {data.change_pct > 0 ? '▲' : data.change_pct < 0 ? '▼' : '●'} {formatPct(data.change_pct)} ({formatPrice(data.change, 0)})
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{data.date}</div>
          </div>

          {/* OHLCV */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
            {[
              { label: 'Mở cửa', val: formatPrice(data.open, 0) },
              { label: 'Cao nhất', val: formatPrice(data.high, 0) },
              { label: 'Thấp nhất', val: formatPrice(data.low, 0) },
              { label: 'KL Giao dịch', val: formatVolume(data.volume) },
            ].map(item => (
              <div key={item.label} style={{ padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{item.val}</div>
              </div>
            ))}
          </div>

          {/* Technical indicators */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.05em' }}>
              CHỈ SỐ KỸ THUẬT
            </div>
            {[
              { label: 'RSI (14)', val: tech.rsi_14, fmt: (v: number) => v?.toFixed(1), color: tech.rsi_14 > 70 ? 'var(--accent-red)' : tech.rsi_14 < 30 ? 'var(--accent-green)' : 'var(--text-accent)' },
              { label: 'MACD', val: tech.macd, fmt: (v: number) => v?.toFixed(2), color: tech.macd > 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
              { label: 'SMA 20', val: tech.sma_20, fmt: (v: number) => formatPrice(v, 0) },
              { label: 'SMA 50', val: tech.sma_50, fmt: (v: number) => formatPrice(v, 0) },
              { label: 'Vol Ratio', val: tech.volume_ratio, fmt: (v: number) => v?.toFixed(2) + 'x' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: item.color ?? 'var(--text-accent)' }}>
                  {item.val != null ? item.fmt(item.val) : '—'}
                </span>
              </div>
            ))}
          </div>

          {/* RSI Bar */}
          {tech.rsi_14 != null && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                <span>Quá bán (30)</span>
                <span>RSI: <strong style={{ color: 'var(--text-accent)' }}>{tech.rsi_14?.toFixed(1)}</strong></span>
                <span>Quá mua (70)</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: '30%', right: '30%', top: 0, bottom: 0,
                  background: 'rgba(16,185,129,0.15)', borderRadius: 3,
                }} />
                <div style={{
                  position: 'absolute', top: -1, width: 8, height: 8, borderRadius: 4,
                  background: tech.rsi_14 > 70 ? 'var(--accent-red)' : tech.rsi_14 < 30 ? 'var(--accent-green)' : 'var(--accent-blue)',
                  left: `calc(${Math.min(tech.rsi_14, 100)}% - 4px)`,
                  transition: 'left 0.4s ease',
                }} />
              </div>
            </div>
          )}

          <Link href={`/analysis/${ticker}`} className="btn btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
            Phân tích XAI →
          </Link>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Không có dữ liệu</div>
      )}
    </div>
  );
}
