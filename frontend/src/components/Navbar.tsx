'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { refreshData } from '@/lib/api';

const tabs = [
  { href: '/', label: 'Dashboard' },
  { href: '/agents/', label: 'Agents' },
  { href: '/contracts/', label: 'Contracts' },
  { href: '/disputes/', label: 'Disputes' },
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
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)',
        background: 'var(--card-bg)', position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.05em' }}>SWORN</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 400 }}>Explorer</span>
          </Link>
          <div className="nav-tabs-desktop" style={{ display: 'flex', gap: '0.25rem' }}>
            {tabs.map(t => (
              <Link key={t.href} href={t.href} style={tabStyle(pathname === t.href || pathname === t.href.replace(/\/$/, ''))}>
                {t.label}
              </Link>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-muted)', padding: '0.3rem 0.6rem',
              borderRadius: 6, fontSize: '0.7rem', cursor: 'pointer',
              opacity: refreshing ? 0.5 : 1
            }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', padding: '0.2rem 0.5rem', background: 'rgba(0,255,136,0.08)', borderRadius: 4 }}>
            devnet
          </span>
          {/* Mobile hamburger */}
          <button
            className="nav-mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              display: 'none', background: 'transparent', border: 'none',
              color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer', padding: '0.25rem'
            }}
          >
            {mobileOpen ? 'X' : '='}
          </button>
        </div>
      </nav>
      {mobileOpen && (
        <div className="nav-mobile-menu" style={{
          display: 'flex', flexDirection: 'column', gap: '0.25rem',
          padding: '0.5rem 1rem', background: 'var(--card-bg)',
          borderBottom: '1px solid var(--border)'
        }}>
          {tabs.map(t => (
            <Link key={t.href} href={t.href} onClick={() => setMobileOpen(false)} style={tabStyle(pathname === t.href)}>
              {t.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
