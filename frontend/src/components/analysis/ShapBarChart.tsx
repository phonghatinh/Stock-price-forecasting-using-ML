'use client';

interface ShapFeature {
  feature: string;
  label: string;
  value: number;
  shap_value: number;
  impact: 'positive' | 'negative';
}

interface Props {
  features: ShapFeature[];
  maxItems?: number;
}

export default function ShapBarChart({ features, maxItems = 10 }: Props) {
  const top = features.slice(0, maxItems);
  const maxAbs = Math.max(...top.map(f => Math.abs(f.shap_value)), 0.001);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>FEATURE</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>SHAP VALUE</span>
      </div>

      {top.map((feat, i) => {
        const pct = (Math.abs(feat.shap_value) / maxAbs) * 100;
        const isPos = feat.impact === 'positive';
        const color = isPos ? 'var(--accent-green)' : 'var(--accent-red)';
        const bg = isPos ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';

        return (
          <div key={feat.feature} className="shap-bar" style={{ animationDelay: `${i * 0.04}s` }}>
            <div className="shap-label" title={feat.feature}>
              {feat.label || feat.feature}
              <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 6 }}>
                = {typeof feat.value === 'number' ? feat.value.toFixed(2) : feat.value}
              </span>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              {/* Center line */}
              <div style={{
                position: 'absolute', left: 0, right: 0, top: '50%',
                height: 1, background: 'var(--border-color)', transform: 'translateY(-50%)',
              }} />
              {/* Bar */}
              <div style={{
                height: 14,
                background: bg,
                border: `1px solid ${color}30`,
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0, bottom: 0,
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${color}40, ${color})`,
                  borderRadius: 4,
                  transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                }} />
              </div>
            </div>
            <div className="shap-value-text" style={{ color }}>
              {feat.shap_value > 0 ? '+' : ''}{feat.shap_value.toFixed(3)}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, background: 'var(--accent-green)', borderRadius: 2 }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tác động tích cực (tăng)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, background: 'var(--accent-red)', borderRadius: 2 }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tác động tiêu cực (giảm)</span>
        </div>
      </div>
    </div>
  );
}
