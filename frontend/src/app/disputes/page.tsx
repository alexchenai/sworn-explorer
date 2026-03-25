'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchDisputes, fetchStats } from '@/lib/api';
import { shortAddr, fmtDate } from '@/lib/utils';
import type { Dispute, Stats } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';

const LEVELS = [
  { key: 'DirectCorrection', label: 'L1 Direct Correction', desc: 'Provider corrects delivery (max 3 attempts, 7-day deadline)' },
  { key: 'PrivateMediation', label: 'L2 Private Mediation', desc: 'Protocol-assigned mediator reviews evidence (5-day deadline)' },
  { key: 'PublicJury', label: 'L3 Public Jury', desc: 'Community jury votes on resolution (7-day deadline, TS>=70 required)' },
  { key: 'Appeal', label: 'L4 Appeal', desc: 'Final appeal with 50% stake requirement (10-day deadline)' },
];

function levelIndex(level: string): number {
  const l = level.toLowerCase();
  if (l.includes('direct') || l.includes('correction') || l === 'level1') return 0;
  if (l.includes('private') || l.includes('mediation') || l === 'level2') return 1;
  if (l.includes('public') || l.includes('jury') || l === 'level3') return 2;
  if (l.includes('appeal') || l === 'level4') return 3;
  return 0;
}

function DisputeTimeline({ level }: { level: string }) {
  const activeIdx = levelIndex(level);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, width: '100%', margin: '0.5rem 0' }}>
      {LEVELS.map((lv, i) => {
        const isActive = i === activeIdx;
        const isPast = i < activeIdx;
        const color = isActive ? 'var(--accent)' : isPast ? 'var(--green)' : 'var(--text-dim)';
        const bg = isActive ? 'var(--accent-dim)' : isPast ? 'var(--green-dim)' : 'rgba(136,136,168,0.08)';
        return (
          <div key={lv.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {i > 0 && (
              <div style={{
                position: 'absolute', top: 12, left: 0, right: '50%', height: 2,
                background: isPast || isActive ? 'var(--green)' : 'var(--border)',
                zIndex: 0
              }} />
            )}
            {i < LEVELS.length - 1 && (
              <div style={{
                position: 'absolute', top: 12, left: '50%', right: 0, height: 2,
                background: isPast ? 'var(--green)' : 'var(--border)',
                zIndex: 0
              }} />
            )}
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: bg, border: `2px solid ${color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.65rem', fontWeight: 700, color, zIndex: 1,
              position: 'relative'
            }}>
              {isPast ? '\u2713' : `L${i + 1}`}
            </div>
            <div style={{
              fontSize: '0.55rem', color, fontWeight: isActive ? 600 : 400,
              marginTop: 4, textAlign: 'center', lineHeight: 1.2
            }}>
              {lv.label.replace(/^L\d /, '')}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function disputeStatusColor(status: string): { bg: string; color: string } {
  const s = (status || '').toLowerCase();
  if (s === 'open') return { bg: 'rgba(255,68,102,0.12)', color: '#ff4466' };
  if (s === 'responded') return { bg: 'rgba(255,170,0,0.12)', color: '#ffaa00' };
  if (s === 'voting') return { bg: 'rgba(180,100,255,0.12)', color: '#b464ff' };
  if (s === 'escalated') return { bg: 'rgba(255,100,50,0.12)', color: '#ff6432' };
  if (s.includes('resolved')) return { bg: 'rgba(0,255,136,0.12)', color: '#00ff88' };
  return { bg: 'rgba(136,136,168,0.12)', color: '#8888a8' };
}

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');

  useEffect(() => {
    Promise.all([fetchDisputes(), fetchStats()])
      .then(([d, s]) => {
        setDisputes(Array.isArray(d) ? d : []);
        setStats(s);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty"><div className="spinner" /><br />Loading disputes...</div>;

  const filtered = disputes.filter(d => {
    if (filter === 'all') return true;
    const s = (d.status || '').toLowerCase();
    const isResolved = s.includes('resolved');
    return filter === 'resolved' ? isResolved : !isResolved;
  });

  return (
    <>
      <div className="stat-grid">
        <div className="stat-box">
          <div className="stat-value">{stats?.total_disputes ?? 0}</div>
          <div className="stat-label">Total Disputes</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{stats?.active_disputes ?? 0}</div>
          <div className="stat-label">Active Disputes</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{(stats?.total_disputes ?? 0) - (stats?.active_disputes ?? 0)}</div>
          <div className="stat-label">Resolved</div>
        </div>
      </div>

      {/* Dispute Level Reference */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '0.75rem', margin: '1.5rem 0 1rem'
      }}>
        {LEVELS.map((lv, i) => (
          <div key={lv.key} style={{
            background: 'var(--card-bg)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '0.75rem'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>
              {lv.label}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {lv.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
        {(['all', 'active', 'resolved'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '0.3rem 0.75rem', borderRadius: 6, fontSize: '0.75rem',
            border: '1px solid var(--border)', cursor: 'pointer',
            background: filter === f ? 'var(--accent-dim)' : 'transparent',
            color: filter === f ? 'var(--accent)' : 'var(--text-muted)'
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          No disputes found.
          <br /><span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Disputes are created when a requester challenges a delivery through the 4-level resolution system.
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(d => {
            const sc = disputeStatusColor(d.status);
            return (
              <div key={d.contract_pubkey} style={{
                background: 'var(--card-bg)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '1rem', overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <Link href={`/contracts/?view=${d.contract_id}`} style={{
                    fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)', textDecoration: 'none'
                  }}>
                    Contract #{d.contract_id}
                  </Link>
                  <span style={{
                    fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: 4,
                    background: sc.bg, color: sc.color, fontWeight: 500
                  }}>
                    {d.status || 'Unknown'}
                  </span>
                </div>

                <DisputeTimeline level={d.level} />

                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.7rem'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>Requester: </span>
                    <Link href={`/agents/?view=${d.requester}`} style={{ color: 'var(--text-muted)' }}>
                      {shortAddr(d.requester)}
                    </Link>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>Provider: </span>
                    <Link href={`/agents/?view=${d.provider}`} style={{ color: 'var(--text-muted)' }}>
                      {shortAddr(d.provider)}
                    </Link>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>Value: </span>
                    <span style={{ color: 'var(--text)' }}>{d.value.toFixed(4)} {d.currency || 'SWORN'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>Initiator: </span>
                    <span style={{ color: 'var(--text-muted)' }}>{shortAddr(d.initiator)}</span>
                  </div>
                  {d.corrections_count > 0 && (
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>Corrections: </span>
                      <span style={{ color: 'var(--yellow)' }}>{d.corrections_count}/3</span>
                    </div>
                  )}
                  {(d.votes_provider > 0 || d.votes_requester > 0) && (
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>Votes: </span>
                      <span style={{ color: 'var(--green)' }}>{d.votes_provider}</span>
                      <span style={{ color: 'var(--text-dim)' }}> / </span>
                      <span style={{ color: 'var(--red, #ff4466)' }}>{d.votes_requester}</span>
                    </div>
                  )}
                  {d.deadline && (
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>Deadline: </span>
                      <span style={{ color: 'var(--text-muted)' }}>{fmtDate(d.deadline)}</span>
                    </div>
                  )}
                  {d.created_at && (
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>Filed: </span>
                      <span style={{ color: 'var(--text-muted)' }}>{fmtDate(d.created_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
