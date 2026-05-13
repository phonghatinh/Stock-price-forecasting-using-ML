export function formatPrice(n: number | undefined | null, decimals = 2): string {
  if (n == null || isNaN(n as number)) return '—';
  const num = n as number;
  if (num >= 1_000_000_000_000) return (num / 1_000_000_000_000).toFixed(1) + ' Nghìn Tỷ';
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + ' Tỷ';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + ' Tr';
  return num.toLocaleString('vi-VN', { maximumFractionDigits: decimals });
}

export function formatPct(n: number | undefined | null, sign = true): string {
  if (n == null || isNaN(n as number)) return '—';
  const s = sign && (n as number) > 0 ? '+' : '';
  return `${s}${(n as number).toFixed(2)}%`;
}

export function formatVolume(n: number | undefined | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toLocaleString();
}

export function formatDate(d: string | Date | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export function changeClass(v: number | null | undefined): string {
  if (v == null) return 'change-flat';
  if (v > 0) return 'change-up';
  if (v < 0) return 'change-down';
  return 'change-flat';
}

export function signalClass(signal: string): string {
  return `signal-${signal}`;
}

export function riskColor(level: string): string {
  const map: Record<string, string> = {
    'THẤP': 'var(--accent-green)',
    'TRUNG BÌNH': 'var(--accent-yellow)',
    'CAO': 'var(--accent-red)',
    'LOW': 'var(--accent-green)',
    'MEDIUM': 'var(--accent-yellow)',
    'HIGH': 'var(--accent-red)',
  };
  return map[level] || 'var(--text-secondary)';
}

// All major HOSE + HNX blue-chip and mid-cap tickers
export const VN_TICKERS = [
  // HOSE Blue chips
  'VNM', 'VCB', 'BID', 'CTG', 'HPG',
  'SSI', 'VND', 'HDB', 'MBB', 'TCB',
  'ACB', 'STB', 'FPT', 'MWG', 'MSN',
  'VHM', 'VIC', 'VPB', 'SAB', 'GVR',
  'EIB', 'SHB', 'TPB', 'LPB', 'OCB',
  'PLX', 'GAS', 'POW', 'PVD', 'BSR',
  'VJC', 'HVN', 'DIG', 'NLG', 'PDR',
  'KDH', 'DXG', 'NVL', 'BCM', 'CII',
  'REE', 'PNJ', 'DBC', 'BAF', 'HAH',
  // HNX
  'SHB', 'PVS', 'CEO', 'HUT', 'IDC',
  'NRC', 'TNG', 'VCS', 'BVS', 'SHS',
  'KLB', 'NVB', 'ABB', 'HCC', 'PGS',
];
