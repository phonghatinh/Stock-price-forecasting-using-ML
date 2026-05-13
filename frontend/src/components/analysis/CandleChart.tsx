'use client';
import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi, LineStyle } from 'lightweight-charts';
import useSWR from 'swr';
import { marketApi, analysisApi } from '@/lib/api';

interface Props {
  ticker: string;
  showSignal?: boolean;
}

export default function CandleChart({ ticker, showSignal = false }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().substring(0, 10);
  });
  const [interval, setInterval] = useState('1D');

  const { data: candleData } = useSWR(
    `candles-${ticker}-${fromDate}-${interval}`,
    () => marketApi.getCandles(ticker, fromDate, interval),
    { refreshInterval: 60_000, revalidateOnFocus: false }
  );

  const { data: signalData } = useSWR(
    showSignal ? `signal-${ticker}` : null,
    () => analysisApi.getSignal(ticker),
    { refreshInterval: 300_000 }
  );

  // Initialize chart once
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = createChart(chartRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(99,179,237,0.05)' },
        horzLines: { color: 'rgba(99,179,237,0.05)' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: 'rgba(99,179,237,0.1)',
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: 'rgba(99,179,237,0.1)',
        timeVisible: true,
      },
      width: chartRef.current.clientWidth,
      height: 360,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    const volumeSeries = chart.addHistogramSeries({
      color: '#3b82f680',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartInstance.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const ro = new ResizeObserver(() => {
      if (chartRef.current) {
        chart.applyOptions({ width: chartRef.current.clientWidth });
      }
    });
    ro.observe(chartRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartInstance.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);  // Only init once per mount (key prop forces remount on ticker change)

  // Update data when candleData changes
  useEffect(() => {
    if (!candleSeriesRef.current || !candleData?.bars?.length) return;

    const bars = candleData.bars;
    const formatted = bars
      .filter((b: any) => b.close > 0)
      .map((b: any) => ({
        time: b.date.substring(0, 10) as any,
        open: Number(b.open) || Number(b.close),
        high: Number(b.high) || Number(b.close),
        low: Number(b.low) || Number(b.close),
        close: Number(b.close),
      }))
      .sort((a: any, b: any) => a.time.localeCompare(b.time));

    const volumes = bars
      .filter((b: any) => b.close > 0)
      .map((b: any) => ({
        time: b.date.substring(0, 10) as any,
        value: Number(b.volume) || 0,
        color: (Number(b.close) >= Number(b.open)) ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)',
      }))
      .sort((a: any, b: any) => a.time.localeCompare(b.time));

    if (formatted.length > 0) {
      candleSeriesRef.current.setData(formatted);
      volumeSeriesRef.current?.setData(volumes);
      chartInstance.current?.timeScale().fitContent();
    }
  }, [candleData]);

  const ranges = [
    { label: '3T', months: 3 },
    { label: '6T', months: 6 },
    { label: '1N', months: 12 },
    { label: '2N', months: 24 },
    { label: '5N', months: 60 },
  ];

  const setRange = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    setFromDate(d.toISOString().substring(0, 10));
  };

  const intervals = ['1D', '1W'];

  return (
    <div className="card" style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-accent)' }}>{ticker}</span>
          {showSignal && signalData && (
            <span className={`signal-badge signal-${signalData.signal}`}>
              {signalData.label_vi} {(signalData.confidence * 100).toFixed(0)}%
            </span>
          )}
          <div className="live-dot" />
          {candleData?.bars?.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {candleData.bars.length} phiên
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          {ranges.map(r => (
            <button
              key={r.label}
              onClick={() => setRange(r.months)}
              className={`btn btn-sm btn-ghost`}
            >
              {r.label}
            </button>
          ))}
          <div style={{ width: 1, background: 'var(--border-color)', margin: '0 4px', height: 20 }} />
          {intervals.map(iv => (
            <button
              key={iv}
              onClick={() => setInterval(iv)}
              className={`btn btn-sm ${interval === iv ? 'btn-outline' : 'btn-ghost'}`}
            >
              {iv}
            </button>
          ))}
        </div>
      </div>

      {/* Chart container */}
      <div ref={chartRef} style={{ width: '100%', height: 360 }} />

      {/* No data placeholder */}
      {candleData && candleData.bars?.length === 0 && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)', fontSize: 14, pointerEvents: 'none',
        }}>
          Chưa có dữ liệu lịch sử cho {ticker} — đang chạy seed dữ liệu...
        </div>
      )}
    </div>
  );
}
