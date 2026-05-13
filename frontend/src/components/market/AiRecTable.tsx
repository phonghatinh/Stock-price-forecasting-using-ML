'use client';
import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { predictionApi } from '@/lib/api';
import { formatPrice, formatPct, changeClass } from '@/lib/utils';
import { VN_TICKERS } from '@/lib/utils';

const SIGNAL_LABELS: Record<string, string> = {
  BUY: 'MUA', SELL: 'BÁN', HOLD: 'NẮM GIỮ',
};

interface Props {
  onTickerClick?: (ticker: string) => void;
  selectedTicker?: string | null;
}

export default function AiRecTable({ onTickerClick, selectedTicker }: Props) {
  const [horizon, setHorizon] = useState(5);
  const { data, isLoading } = useSWR(
    `ai-recs-${horizon}`,
    () => predictionApi.getRecommendations(VN_TICKERS.slice(0, 15).join(','), horizon),
    { revalidateOnFocus: false, refreshInterval: 300_000 }
  );

  const recs = data?.recommendations ?? [];

  return (
    <div className="card">
      <div className="section-header">
        <div className="section-title">
          <span>🤖</span> AI Khuyến nghị
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[3, 5, 10].map(d => (
            <button
              key={d}
              onClick={() => setHorizon(d)}
              className={`btn btn-sm ${horizon === d ? 'btn-primary' : 'btn-outline'}`}
            >
              {d}D
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8 }} />
          ))}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã CK</th>
                <th>Tín hiệu</th>
                <th style={{ textAlign: 'right' }}>Giá hiện tại</th>
                <th style={{ textAlign: 'right' }}>Giá mục tiêu</th>
                <th style={{ textAlign: 'right' }}>Lợi nhuận KV</th>
                <th style={{ textAlign: 'right' }}>Tin cậy</th>
                <th>Rủi ro</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recs.map((rec: any) => {
                const retCls = changeClass(rec.predicted_return);
                const isSelected = selectedTicker === rec.ticker;
                return (
                  <tr
                    key={rec.ticker}
                    onClick={() => onTickerClick?.(rec.ticker)}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(59,130,246,0.08)' : undefined,
                      outline: isSelected ? '1px solid rgba(59,130,246,0.3)' : undefined,
                      transition: 'background 0.15s',
                    }}
                  >
                    <td className="ticker-cell" style={{ color: isSelected ? 'var(--accent-blue)' : undefined, fontWeight: isSelected ? 800 : undefined }}>
                      {rec.ticker}
                    </td>
                    <td>
                      <span className={`signal-badge signal-${rec.signal}`}>
                        {rec.signal === 'BUY' ? '▲' : rec.signal === 'SELL' ? '▼' : '●'}&nbsp;
                        {SIGNAL_LABELS[rec.signal]}
                      </span>
                    </td>
                    <td className="num-cell">{formatPrice(rec.current_price)}</td>
                    <td className="num-cell">{formatPrice(rec.target_price)}</td>
                    <td className={`num-cell ${retCls}`}>{formatPct(rec.predicted_return)}</td>
                    <td className="num-cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="confidence-bar" style={{ width: 60 }}>
                          <div
                            className={`confidence-fill ${rec.signal === 'BUY' ? 'fill-green' : rec.signal === 'SELL' ? 'fill-red' : 'fill-yellow'}`}
                            style={{ width: `${rec.confidence * 100}%` }}
                          />
                        </div>
                        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                          {(rec.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                        background: rec.risk_level === 'THẤP' ? 'rgba(16,185,129,0.1)' :
                          rec.risk_level === 'CAO' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                        color: rec.risk_level === 'THẤP' ? 'var(--accent-green)' :
                          rec.risk_level === 'CAO' ? 'var(--accent-red)' : 'var(--accent-yellow)',
                      }}>
                        {rec.risk_level}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <Link href={`/analysis/${rec.ticker}`} className="btn btn-sm btn-outline">
                        XAI →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
