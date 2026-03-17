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
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
      window.location.reload();
    } finally {
      setRefreshing(false);
    }
  };

  const tabStyle = (active: boolean) => ({
    padding: '0.35rem 0.75rem', borderRadius: 6,
    fontSize: '0.8rem', fontWeight: 500,
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    background: active ? 'var(--accent-dim)' : 'transparent',
    textDecoration: 'none' as const, display: 'block',
    transition: 'all 0.15s'
  });

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 1rem', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0, minWidth: 0 }}>
          <Link href="/" style={{
            fontSize: '1rem', fontWeight: 800, letterSpacing: '0.06em',
            color: 'var(--accent)', textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            whiteSpace: 'nowrap'
          }}>
            <img src="https://sworn.chitacloud.dev/logo.png" alt="SWORN" style={{ height: 28, width: 28, borderRadius: '50%' }} />
            SWORN
            <span style={{
              fontSize: '0.6rem', fontWeight: 600,
              background: 'var(--accent-dim)', border: '1px solid var(--accent)',
              color: 'var(--accent)', padding: '0.1rem 0.35rem',
              borderRadius: 4, letterSpacing: '0.05em'
            }}>DEVNET</span>
          </Link>
          <ul className="nav-tabs" style={{ display: 'flex', gap: '0.25rem', listStyle: 'none' }}>
            {tabs.map(t => {
              const active = pathname === t.href || (t.href !== '/' && pathname?.startsWith(t.href));
              return (
                <li key={t.href}>
                  <Link href={t.href} style={tabStyle(!!active)}>{t.label}</Link>
                </li>
              );
            })}
          </ul>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="btn" onClick={handleRefresh} disabled={refreshing} style={{ whiteSpace: 'nowrap' }}>
            {refreshing ? '...' : 'Refresh'}
          </button>
          <button
            className="nav-hamburger btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ display: 'none', padding: '0.3rem 0.5rem', fontSize: '1rem', lineHeight: 1 }}
            aria-label="Menu"
          >
            {mobileOpen ? '\u2715' : '\u2630'}
          </button>
        </div>
      </nav>
      {mobileOpen && (
        <div className="nav-mobile-menu" style={{
          display: 'none', flexDirection: 'column', gap: '0.25rem',
          background: 'var(--surface)', borderBottom: '1px solid var(--border)',
          padding: '0.5rem 1rem', position: 'sticky', top: 56, zIndex: 99
        }}>
          {tabs.map(t => {
            const active = pathname === t.href || (t.href !== '/' && pathname?.startsWith(t.href));
            return (
              <Link key={t.href} href={t.href} onClick={() => setMobileOpen(false)}
                style={{ ...tabStyle(!!active), padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}>
                {t.label}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
