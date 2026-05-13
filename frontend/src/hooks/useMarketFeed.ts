'use client';
import { useEffect, useRef, useCallback } from 'react';

interface MarketData {
  type: string;
  data: Record<string, unknown>;
}

export function useMarketFeed(onMessage: (data: MarketData) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${window.location.host}/ws/market`;
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => console.log('[WS] Market feed connected');
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type !== 'ping') onMessage(data);
        } catch {}
      };
      ws.onclose = () => {
        console.log('[WS] Disconnected, reconnecting in 5s...');
        reconnectRef.current = setTimeout(connect, 5000);
      };
      ws.onerror = () => ws.close();
    } catch (err) {
      console.warn('[WS] WebSocket not available:', err);
    }
  }, [onMessage]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { ws: wsRef.current };
}

export function useTickerFeed(ticker: string, onMessage: (data: unknown) => void) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!ticker) return;
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${window.location.host}/ws/ticker/${ticker}`;
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        try { onMessage(JSON.parse(e.data)); } catch {}
      };
      ws.onclose = () => {};
    } catch {}
    return () => wsRef.current?.close();
  }, [ticker, onMessage]);
}
