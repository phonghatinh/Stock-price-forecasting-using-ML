'use client';
import { riskColor } from '@/lib/utils';

interface Narrative {
  summary: string;
  bullet_points: string[];
  risk_level: string;
  recommendation: string;
}

interface Props {
  narrative: Narrative;
  ticker: string;
}

function renderMarkdown(text: string) {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

export default function XaiNarrative({ narrative, ticker }: Props) {
  const riskColor_ = riskColor(narrative.risk_level);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Risk Level */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          padding: '4px 12px', borderRadius: 6,
          background: `${riskColor_}18`,
          border: `1px solid ${riskColor_}40`,
          fontSize: 12, fontWeight: 700, color: riskColor_,
          letterSpacing: '0.08em',
        }}>
          ⚠ RỦI RO {narrative.risk_level}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ticker} • AI Analysis</span>
      </div>

      {/* Summary */}
      <div style={{
        background: 'rgba(59,130,246,0.05)',
        border: '1px solid rgba(59,130,246,0.15)',
        borderRadius: 10,
        padding: '14px 16px',
        fontSize: 14,
        lineHeight: 1.7,
        color: 'var(--text-primary)',
      }}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(narrative.summary) }}
      />

      {/* Key Factors */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          📍 Các yếu tố chính
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {narrative.bullet_points.map((point, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--accent-blue)',
                marginTop: 6, flexShrink: 0,
              }} />
              <div
                style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(point) }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <div style={{
        background: 'rgba(139,92,246,0.06)',
        border: '1px solid rgba(139,92,246,0.2)',
        borderRadius: 10,
        padding: '14px 16px',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-purple)', marginBottom: 6, letterSpacing: '0.08em' }}>
          💡 KHUYẾN NGHỊ AI
        </div>
        <div
          style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(narrative.recommendation) }}
        />
      </div>
    </div>
  );
}
