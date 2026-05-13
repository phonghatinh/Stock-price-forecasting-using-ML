'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TickerSearch() {
  const [ticker, setTicker] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticker.trim()) {
      router.push(`/analysis/${ticker.trim().toUpperCase()}`);
    }
  };

  return (
    <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 400 }}>
      <input
        type="text"
        className="input"
        placeholder="Nhập mã chứng khoán (VD: FPT, HPG)..."
        value={ticker}
        onChange={(e) => setTicker(e.target.value)}
        style={{ flex: 1 }}
      />
      <button type="submit" className="btn btn-primary">
        Tìm kiếm
      </button>
    </form>
  );
}
