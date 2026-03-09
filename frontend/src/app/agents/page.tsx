'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { fetchAgents, fetchAgent } from '@/lib/api';
import { shortAddr, fmtDate, explorerAddr } from '@/lib/utils';
import type { Agent, Contract } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import TrustBar from '@/components/TrustBar';
import KVRow from '@/components/KVRow';

function AgentDetailView({ pubkey }: { pubkey: string }) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgent(pubkey)
      .then(data => { setAgent(data.agent); setContracts(data.contracts || []); })
      .finally(() => setLoading(false));
  }, [pubkey]);

  if (loading) return <div className="empty"><div className="spinner" /><br />Loading agent...</div>;
  if (!agent) return <div className="empty">Agent not found</div>;

  const successRate = agent.tasks_completed > 0
    ? (((agent.tasks_completed - agent.disputes_lost) / agent.tasks_completed) * 100).toFixed(1) : '—';

  return (
    <>
      <Link href="/agents/" className="detail-back">&#8592; Back to Agents</Link>
      <div className="detail-title">Agent {shortAddr(pubkey)}</div>
      <div className="detail-pubkey">
        <a href={explorerAddr(pubkey)} target="_blank" rel="noopener">{pubkey}</a>
      </div>
      <div className="detail-grid">
        <div className="detail-card">
          <div className="detail-card-title">Trust Metrics</div>
          <KVRow label="Trust Score" value={<TrustBar score={agent.trust_score} />} mono={false} />
          <KVRow label="Tasks Completed" value={agent.tasks_completed} />
          <KVRow label="Disputes Lost" value={<span style={{ color: agent.disputes_lost > 0 ? 'var(--red)' : 'var(--text-dim)' }}>{agent.disputes_lost}</span>} />
          <KVRow label="Success Rate" value={`${successRate}%`} />
          <KVRow label="Identity Bond" value={`${(agent.identity_bond_sworn ?? 0).toFixed(4)} SWORN`} />
          <KVRow label="Volume Processed" value={`${(agent.volume_processed_sol ?? 0).toFixed(4)} SWORN`} />
          <KVRow label="Status" value={<StatusBadge status={agent.status} />} mono={false} />
        </div>
        <div className="detail-card">
          <div className="detail-card-title">On-Chain Info</div>
          <KVRow label="Pubkey" value={shortAddr(agent.pubkey)} />
          <KVRow label="Owner" value={<a href={explorerAddr(agent.owner)} target="_blank">{shortAddr(agent.owner)}</a>} />
          <KVRow label="Identity PDA" value={shortAddr(agent.identity_pda)} />
          <KVRow label="Matured" value={agent.matured ? 'Yes' : 'No'} />
          <KVRow label="Registered" value={fmtDate(agent.registration_date)} />
          <KVRow label="Network" value="devnet" />
        </div>
      </div>
      <div style={{ marginTop: '1.5rem' }}>
        <div className="section-header">
          <span className="section-title">Related Contracts</span>
          <span className="section-count">{contracts.length}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Role</th><th>Value (SWORN)</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
              {contracts.length === 0 ? (
                <tr><td colSpan={5}><div className="empty">No contracts</div></td></tr>
              ) : contracts.map(c => (
                <tr key={c.id}>
                  <td><Link href={`/contracts/?view=${c.id}`} className="addr">#{c.id}</Link></td>
                  <td><span className="badge" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>{c.provider === pubkey ? 'Provider' : 'Requester'}</span></td>
                  <td className="mono">{(c.value_sol ?? 0).toFixed(4)}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td style={{ color: 'var(--text-dim)' }}>{fmtDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function AgentsList() {
  const searchParams = useSearchParams();
  const viewPubkey = searchParams.get('view');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!viewPubkey) fetchAgents().then(data => setAgents(Array.isArray(data) ? data : [])).finally(() => setLoading(false));
    else setLoading(false);
  }, [viewPubkey]);

  if (viewPubkey) return <AgentDetailView pubkey={viewPubkey} />;
  if (loading) return <div className="empty"><div className="spinner" /><br />Loading agents...</div>;

  const filtered = agents.filter(a => {
    if (!filter) return true;
    const f = filter.toLowerCase();
    return a.pubkey.toLowerCase().includes(f) || a.owner.toLowerCase().includes(f);
  });

  return (
    <>
      <div className="search-bar">
        <span>&#128269;</span>
        <input className="search-input" type="text" placeholder="Search by pubkey or owner..."
          value={filter} onChange={e => setFilter(e.target.value)} />
      </div>
      <div className="section-header">
        <span className="section-title">Registered Agents</span>
        <span className="section-count">{filtered.length} of {agents.length}</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>Pubkey</th><th>Trust Score</th><th>Tasks Done</th><th>Disputes Lost</th><th>Bond (SWORN)</th><th>Registered</th><th>Status</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8}><div className="empty">{filter ? 'No agents match' : 'No agents registered yet'}</div></td></tr>
            ) : filtered.map((a, i) => (
              <tr key={a.pubkey}>
                <td style={{ color: 'var(--text-dim)' }}>{i + 1}</td>
                <td><Link href={`/agents/?view=${a.pubkey}`} className="addr">{shortAddr(a.pubkey)}</Link></td>
                <td><TrustBar score={a.trust_score} /></td>
                <td>{a.tasks_completed}</td>
                <td style={{ color: a.disputes_lost > 0 ? 'var(--red)' : 'var(--text-dim)' }}>{a.disputes_lost}</td>
                <td className="mono">{(a.identity_bond_sworn ?? 0).toFixed(4)}</td>
                <td style={{ color: 'var(--text-dim)' }}>{fmtDate(a.registration_date)}</td>
                <td><StatusBadge status={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function AgentsPage() {
  return <Suspense fallback={<div className="empty"><div className="spinner" /></div>}><AgentsList /></Suspense>;
}
