'use client';
import useSWR from 'swr';
import { marketApi } from '@/lib/api';
import { formatPrice, formatPct, formatVolume, changeClass } from '@/lib/utils';

export default function IndexPulse() {
  const { data, isLoading } = useSWR('market-overview', marketApi.getOverview, {
    revalidateOnFocus: false
  });

  const indices = [
    { key: 'vnindex', label: 'VNINDEX' },
    { key: 'hnx',     label: 'HNX'   },
    { key: 'upcom',   label: 'UPCOM'   },
  ];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ width: 150, height: 72, borderRadius: 12 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {indices.map(({ key, label }) => {
        const idx = data?.[key];
        if (!idx) return null;
        const cls = changeClass(idx.change_pct);
        return (
          <div key={key} className="index-badge" style={{ animationDelay: `${Math.random() * 0.3}s` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="label">{label}</span>
              <div className="live-dot" style={{ width: 5, height: 5 }} />
            </div>
            <div className={`price ${cls}`} style={{ marginTop: 2 }}>
              {formatPrice(idx.price)}
            </div>
            <div className={`change ${cls}`}>
              {formatPct(idx.change_pct)} &nbsp;({formatPrice(idx.change, 2)})
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              KL: {formatVolume(idx.volume)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
