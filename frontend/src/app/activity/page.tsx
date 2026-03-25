'use client';
import { useEffect, useState } from 'react';
import { fetchActivity } from '@/lib/api';
import { shortAddr, fmtDateTime } from '@/lib/utils';
import type { Activity } from '@/lib/types';

function activityIcon(type: string) {
  switch (type) {
    case 'register': return { icon: '+', bg: 'var(--green-dim)', color: 'var(--green)' };
    case 'agent_registered': return { icon: '+', bg: 'var(--green-dim)', color: 'var(--green)' };
    case 'contract': return { icon: 'C', bg: 'var(--accent-dim)', color: 'var(--accent)' };
    case 'contract_created': return { icon: 'C', bg: 'var(--accent-dim)', color: 'var(--accent)' };
    case 'deliver': return { icon: 'D', bg: 'var(--yellow-dim)', color: 'var(--yellow)' };
    case 'proof_submitted': return { icon: 'D', bg: 'var(--yellow-dim)', color: 'var(--yellow)' };
    case 'accept': return { icon: 'A', bg: 'var(--green-dim)', color: 'var(--green)' };
    case 'contract_completed': return { icon: 'A', bg: 'var(--green-dim)', color: 'var(--green)' };
    case 'dispute': return { icon: '!', bg: 'var(--red-dim)', color: 'var(--red)' };
    case 'contract_proposed': return { icon: 'P', bg: 'rgba(255,191,0,0.12)', color: '#ffbf00' };
    case 'contract_cancelled': return { icon: 'X', bg: 'rgba(136,136,168,0.15)', color: '#888899' };
    default: return { icon: '?', bg: 'rgba(136,136,168,0.12)', color: 'var(--text-muted)' };
  }
}

export default function ActivityPage() {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const slowTimer = setTimeout(() => setSlow(true), 5000);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    fetch('/api/activity', { signal: controller.signal })
      .then(r => r.json())
      .then(data => setActivity(Array.isArray(data) ? data : []))
      .catch(err => {
        if (err.name !== 'AbortError') setError('Failed to load activity data.');
        else setError('Request timed out. The node may be slow. Try refreshing.');
      })
      .finally(() => { setLoading(false); clearTimeout(slowTimer); clearTimeout(timeoutId); });

    return () => { controller.abort(); clearTimeout(slowTimer); clearTimeout(timeoutId); };
  }, []);

  if (loading) return (
    <div className="empty">
      <div className="spinner" />
      <br />Loading activity...
      {slow && <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>Syncing with Solana devnet, this may take up to 30 seconds on first load...</div>}
    </div>
  );

  if (error) return <div className="empty" style={{ color: 'var(--red)' }}>{error}</div>;

  return (
    <>
      <div className="section-header">
        <span className="section-title">Recent On-Chain Activity</span>
        <span className="section-count">{activity.length} events</span>
      </div>
      {activity.length === 0 ? (
        <div className="empty">No on-chain activity recorded yet</div>
      ) : (
        <div>
          {activity.map((a, i) => {
            const ic = activityIcon(a.type);
            return (
              <div key={i} className="card" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem', padding: '0.75rem 1rem' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: ic.bg, color: ic.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.85rem', flexShrink: 0
                }}>{ic.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize' }}>{a.type.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    Actor: {shortAddr(a.actor)}
                    {a.target && <> &bull; Target: {a.target.startsWith('Contract') ? a.target : shortAddr(a.target)}</>}
                    {a.amount ? <> &bull; {a.amount.toFixed(4)} SWORN</> : null}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>{fmtDateTime(a.timestamp)}</div>
                  {a.slot > 0 && <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Slot {a.slot}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}