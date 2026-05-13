'use client';

interface Signal {
  signal: string;
  confidence: number;
  label_vi: string;
  color: string;
}

interface Props {
  signal: Signal;
  size?: 'sm' | 'md' | 'lg';
}

const ICONS: Record<string, string> = {
  BUY: '▲', SELL: '▼', HOLD: '●',
};

export default function SignalBadge({ signal, size = 'md' }: Props) {
  const sizes = {
    sm: { fontSize: 11, padding: '3px 10px', iconSize: 10 },
    md: { fontSize: 14, padding: '6px 16px', iconSize: 13 },
    lg: { fontSize: 18, padding: '10px 24px', iconSize: 16 },
  };
  const s = sizes[size];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
      <span
        className={`signal-badge signal-${signal.signal}`}
        style={{ fontSize: s.fontSize, padding: s.padding }}
      >
        <span style={{ fontSize: s.iconSize }}>{ICONS[signal.signal]}</span>
        {signal.label_vi}
      </span>

      {/* Confidence gauge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
        <div className="confidence-bar" style={{ flex: 1 }}>
          <div
            className={`confidence-fill ${
              signal.signal === 'BUY' ? 'fill-green' :
              signal.signal === 'SELL' ? 'fill-red' : 'fill-yellow'
            }`}
            style={{ width: `${signal.confidence * 100}%` }}
          />
        </div>
        <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-accent)', minWidth: 40 }}>
          {(signal.confidence * 100).toFixed(1)}%
        </span>
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Độ tin cậy</span>
    </div>
  );
}
