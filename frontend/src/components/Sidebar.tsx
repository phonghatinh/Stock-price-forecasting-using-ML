'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_GROUPS = [
  {
    label: 'THỊ TRƯỜNG',
    items: [
      { href: '/',           icon: '📊', label: 'Dashboard'   },
      { href: '/prediction', icon: '🤖', label: 'AI Prediction' },
    ],
  },
  {
    label: 'DANH MỤC',
    items: [
      { href: '/portfolio',  icon: '💼', label: 'Portfolio'   },
      { href: '/simulator',  icon: '🧪', label: 'Simulator'   },
    ],
  },
  {
    label: 'PHÂN TÍCH',
    items: [
      { href: '/analysis/VNM', icon: '🔬', label: 'Phân tích XAI' },
      { href: '/reflection', icon: '🪞', label: 'AI Reflection' },
    ],
  },
  {
    label: 'HỆ THỐNG',
    items: [
      { href: '/settings',   icon: '⚙️', label: 'Cài đặt'    },
    ],
  },
];

export default function Sidebar() {
  const path = usePathname();

  const isActive = (href: string) =>
    href === '/' ? path === '/' : path.startsWith(href === '/analysis/VNM' ? '/analysis' : href);

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📈</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.1 }}>FiinQuant</div>
            <div style={{ fontSize: 10, color: 'var(--accent-blue)', fontWeight: 600, letterSpacing: '0.1em' }}>AI PLATFORM</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <div style={{ padding: '10px 16px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {group.label}
            </div>
            {group.items.map(item => (
              <Link key={item.href} href={item.href} className={`nav-item ${isActive(item.href) ? 'active' : ''}`}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Status indicator */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-green)', animation: 'pulse-dot 1.5s ease infinite' }} />
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Dữ liệu cuối phiên</span>
      </div>

      {/* User info */}
      <div style={{ padding: '12px 16px 16px', background: 'rgba(59,130,246,0.05)', margin: '0 8px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Đăng nhập với</div>
        <div style={{ fontSize: 12, color: 'var(--text-accent)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          anh.phamthitu@fiingroup.vn
        </div>
      </div>
    </aside>
  );
}

