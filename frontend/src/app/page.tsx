'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchStats, fetchAgents, fetchContracts } from '@/lib/api';
import { shortAddr, fmtDate } from '@/lib/utils';
import type { Stats, Agent, Contract } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import TrustBar from '@/components/TrustBar';

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchStats(), fetchAgents(), fetchContracts()])
      .then(([s, a, c]) => {
        setStats(s);
        setAgents(Array.isArray(a) ? a : []);
        setContracts(Array.isArray(c) ? c : []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty"><div className="spinner" /><br />Loading dashboard...</div>;

  const insuranceNote = 'Funded by 60% of confiscations + 20% of protocol fees';
  const halvingNote = 'Base: 10 SWORN per task. Halving every 50,000 tasks. Max 1M total rewards';

  return (
    <>
      <div className="stat-grid">
        <div className="stat-box">
          <div className="stat-value">{stats?.total_agents ?? 0}</div>
          <div className="stat-label">Registered Agents</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{stats?.total_contracts ?? 0}</div>
          <div className="stat-label">Total Contracts</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{stats?.active_contracts ?? 0}</div>
          <div className="stat-label">Active Contracts</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{(stats?.avg_trust_score ?? 0).toFixed(1)}</div>
          <div className="stat-label">Avg Trust Score</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{(stats?.total_value_locked ?? 0).toFixed(2)}</div>
          <div className="stat-label">TVL (SWORN)</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{(stats?.sworn_supply ?? 0).toLocaleString()}</div>
          <div className="stat-label">SWORN Supply</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', margin: '1.5rem 0' }}>
        <InsurancePoolCard stats={stats} note={insuranceNote} />
        <WorkRewardsCard stats={stats} note={halvingNote} />
      </div>

      {(stats?.total_disputes ?? 0) > 0 && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem', margin: '0 0 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)' }}>Disputes</div>
            <Link href="/disputes/" style={{ fontSize: '0.7rem', color: 'var(--accent)' }}>View all</Link>
          </div>
          <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
            <div>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>{stats?.active_disputes ?? 0}</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginLeft: 4 }}>active</span>
            </div>
            <div>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-muted)' }}>{(stats?.total_disputes ?? 0) - (stats?.active_disputes ?? 0)}</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginLeft: 4 }}>resolved</span>
            </div>
          </div>
        </div>
      )}

      <div className="section-title">Top Agents</div>
      <div className="table-wrapper">
        <table>
          <thead><tr><th>Agent</th><th>Trust</th><th>Tasks</th><th>Volume</th><th>Status</th></tr></thead>
          <tbody>
            {agents.slice(0, 10).map(a => (
              <tr key={a.pubkey}>
                <td><Link href={`/agents/?view=${a.pubkey}`}>{shortAddr(a.pubkey)}</Link></td>
                <td><TrustBar score={a.trust_score} /></td>
                <td>{a.tasks_completed}</td>
                <td>{a.volume_processed_sworn.toFixed(2)}</td>
                <td><StatusBadge status={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {agents.length > 10 && (
        <div style={{ textAlign: 'center', margin: '0.75rem 0' }}>
          <Link href="/agents/" style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>View all {agents.length} agents</Link>
        </div>
      )}

      <div className="section-title" style={{ marginTop: '1.5rem' }}>Recent Contracts</div>
      <div className="table-wrapper">
        <table>
          <thead><tr><th>ID</th><th>Requester</th><th>Provider</th><th>Value</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {contracts.slice(0, 10).map(c => (
              <tr key={c.id}>
                <td><Link href={`/contracts/?view=${c.id}`}>#{c.id}</Link></td>
                <td><Link href={`/agents/?view=${c.requester}`}>{shortAddr(c.requester)}</Link></td>
                <td><Link href={`/agents/?view=${c.provider}`}>{shortAddr(c.provider)}</Link></td>
                <td>{(c.value ?? c.value_sworn ?? 0).toFixed(4)} {c.currency ?? 'SWORN'}</td>
                <td><StatusBadge status={c.status} /></td>
                <td style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{fmtDate(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {contracts.length > 10 && (
        <div style={{ textAlign: 'center', margin: '0.75rem 0' }}>
          <Link href="/contracts/" style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>View all {contracts.length} contracts</Link>
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', borderRadius: 10, background: 'var(--card-bg)', border: '1px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>Program: <span style={{ color: 'var(--text-muted)' }}>{shortAddr(stats?.program_id ?? '')}</span></div>
          <div>SWORN Mint: <span style={{ color: 'var(--text-muted)' }}>{shortAddr(stats?.sworn_mint ?? '')}</span></div>
          <div>Network: <span style={{ color: 'var(--text-muted)' }}>{stats?.network}</span></div>
          <div>Last updated: <span style={{ color: 'var(--text-muted)' }}>{stats?.last_updated ? new Date(stats.last_updated).toLocaleTimeString() : '...'}</span></div>
        </div>
      </div>
    </>
  );
}

function InsurancePoolCard({ stats, note }: { stats: Stats | null; note: string }) {
  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
        Insurance Pool
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)' }}>{(stats?.insurance_pool_balance_sworn ?? 0).toFixed(4)}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Pool Balance (SWORN)</div>
        </div>
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)' }}>{(stats?.insurance_pool_sol ?? 0).toFixed(4)}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Pool SOL</div>
        </div>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>{(stats?.insurance_pool_claims_paid_sworn ?? 0).toFixed(4)}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Claims Paid (SWORN)</div>
        </div>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>{stats?.insurance_pool_active_claims ?? 0}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Active Claims</div>
        </div>
      </div>
      <div style={{ marginTop: '0.75rem', padding: '0.5rem', borderRadius: 6, background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.1)' }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
          Solvency: <span style={{ color: 'var(--green)', fontWeight: 600 }}>{(stats?.insurance_solvency_pct ?? 0).toFixed(0)}%</span>
          <span style={{ marginLeft: '0.5rem' }}>{note}</span>
        </div>
      </div>
    </div>
  );
}

function WorkRewardsCard({ stats, note }: { stats: Stats | null; note: string }) {
  const progress = Math.min(stats?.work_halving_progress ?? 0, 100);
  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffcc00', display: 'inline-block' }} />
        Work Rewards
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)' }}>{(stats?.work_reward_per_task ?? 10).toFixed(2)}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>SWORN / Task (current)</div>
        </div>
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)' }}>{(stats?.work_rewards_emitted ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Total Emitted</div>
        </div>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>{(stats?.work_rewards_total_tasks ?? 0).toLocaleString()}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Tasks Processed</div>
        </div>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>1,000,000</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Max Supply</div>
        </div>
      </div>
      <div style={{ marginTop: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-dim)', marginBottom: 4 }}>
          <span>Next halving progress</span>
          <span>{progress.toFixed(1)}%</span>
        </div>
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--accent), #ffcc00)', borderRadius: 3, transition: 'width 0.5s' }} />
        </div>
        <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', marginTop: 4 }}>{note}</div>
      </div>
    </div>
  );
}
