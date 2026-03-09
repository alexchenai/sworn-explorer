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
          <div className="stat-value">{(stats?.total_value_locked ?? 0).toFixed(2)}</div>
          <div className="stat-label">TVL (SWORN)</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{(stats?.insurance_pool_sol ?? 0).toFixed(4)}</div>
          <div className="stat-label">Insurance Pool (SOL)</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{((stats?.sworn_supply ?? 0) / 1e6).toFixed(0)}M</div>
          <div className="stat-label">SWORN Supply</div>
        </div>
      </div>

      <div className="two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <div className="section-header">
            <span className="section-title">Top Agents</span>
            <Link href="/agents/" style={{ fontSize: '0.75rem' }}>View all</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pubkey</th>
                  <th>Trust Score</th>
                  <th>Tasks</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {agents.length === 0 ? (
                  <tr><td colSpan={4}><div className="empty">No agents registered yet</div></td></tr>
                ) : agents.sort((a, b) => b.trust_score - a.trust_score).slice(0, 8).map(a => (
                  <tr key={a.pubkey}>
                    <td><Link href={`/agents/?view=${a.pubkey}`} className="addr">{shortAddr(a.pubkey)}</Link></td>
                    <td><TrustBar score={a.trust_score} /></td>
                    <td>{a.tasks_completed}</td>
                    <td><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="section-header">
            <span className="section-title">Recent Contracts</span>
            <Link href="/contracts/" style={{ fontSize: '0.75rem' }}>View all</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Value (SWORN)</th>
                  <th>Created</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {contracts.length === 0 ? (
                  <tr><td colSpan={4}><div className="empty">No contracts yet</div></td></tr>
                ) : contracts.slice(0, 8).map(c => (
                  <tr key={c.id}>
                    <td><Link href={`/contracts/?view=${c.id}`} className="addr">#{c.id}</Link></td>
                    <td className="mono">{(c.value_sworn ?? 0).toFixed(4)}</td>
                    <td style={{ color: 'var(--text-dim)' }}>{fmtDate(c.created_at)}</td>
                    <td><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {stats && (
        <div style={{ marginTop: '1.5rem', fontSize: '0.7rem', color: 'var(--text-dim)', textAlign: 'center' }}>
          Program: <span className="mono">{shortAddr(stats.program_id)}</span>
          {' | '}SWORN Mint: <span className="mono">{shortAddr(stats.sworn_mint)}</span>
          {' | '}Network: {stats.network}
          {' | '}Last updated: {fmtDate(stats.last_updated)}
        </div>
      )}
    </>
  );
}
