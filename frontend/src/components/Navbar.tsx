'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { refreshData } from '@/lib/api';

const tabs = [
  { href: '/', label: 'Dashboard' },
  { href: '/agents/', label: 'Agents' },
  { href: '/contracts/', label: 'Contracts' },
  { href: '/activity/', label: 'Activity' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
      window.location.reload();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
      padding: '0 1.5rem', height: 56,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexShrink: 0 }}>
        <Link href="/" style={{
          fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.08em',
          color: 'var(--accent)', textDecoration: 'none',
          display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          SWORN EXPLORER
          <span style={{
            fontSize: '0.65rem', fontWeight: 600,
            background: 'var(--accent-dim)', border: '1px solid var(--accent)',
            color: 'var(--accent)', padding: '0.1rem 0.45rem',
            borderRadius: 4, letterSpacing: '0.05em'
          }}>DEVNET</span>
        </Link>
        <ul style={{ display: 'flex', gap: '0.25rem', listStyle: 'none' }}>
          {tabs.map(t => {
            const active = pathname === t.href || (t.href !== '/' && pathname?.startsWith(t.href));
            return (
              <li key={t.href}>
                <Link href={t.href} style={{
                  padding: '0.35rem 0.75rem', borderRadius: 6,
                  fontSize: '0.8rem', fontWeight: 500,
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                  background: active ? 'var(--accent-dim)' : 'transparent',
                  textDecoration: 'none', display: 'block',
                  transition: 'all 0.15s'
                }}>
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <button className="btn" onClick={handleRefresh} disabled={refreshing}>
        {refreshing ? 'Loading...' : 'Refresh'}
      </button>
    </nav>
  );
}
