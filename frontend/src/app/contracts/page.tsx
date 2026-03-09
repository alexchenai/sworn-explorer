'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { fetchContracts, fetchContract } from '@/lib/api';
import { shortAddr, fmtDate, fmtDateTime, explorerAddr } from '@/lib/utils';
import type { Contract } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import KVRow from '@/components/KVRow';

function ContractDetailView({ id }: { id: string }) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContract(id).then(setContract).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="empty"><div className="spinner" /><br />Loading contract...</div>;
  if (!contract) return <div className="empty">Contract not found</div>;

  const stages = [
    { label: 'Contract Created', ts: contract.created_at, done: true },
    { label: 'Delivery Submitted', done: !!contract.poe_arweave_tx },
    { label: 'Accepted / Resolved', ts: contract.resolved_at, done: contract.status === 'Completed' || contract.status === 'completed' },
  ];

  return (
    <>
      <Link href="/contracts/" className="detail-back">&#8592; Back to Contracts</Link>
      <div className="detail-title">Contract #{contract.id}</div>
      <div className="detail-pubkey">
        <a href={explorerAddr(contract.pubkey)} target="_blank" rel="noopener">{contract.pubkey}</a>
      </div>
      <div className="detail-grid">
        <div className="detail-card">
          <div className="detail-card-title">Contract Info</div>
          <KVRow label="Requester" value={<Link href={`/agents/?view=${contract.requester}`}>{shortAddr(contract.requester)}</Link>} />
          <KVRow label="Provider" value={<Link href={`/agents/?view=${contract.provider}`}>{shortAddr(contract.provider)}</Link>} />
          <KVRow label="Value" value={`${(contract.value_sworn ?? 0).toFixed(4)} SWORN`} />
          <KVRow label="Provider Stake" value={`${(contract.provider_stake_sworn ?? 0).toFixed(4)} SWORN`} />
          <KVRow label="Status" value={<StatusBadge status={contract.status} />} mono={false} />
          <KVRow label="Dispute Level" value={contract.dispute_level} />
        </div>
        <div className="detail-card">
          <div className="detail-card-title">Proof of Execution</div>
          <KVRow label="PoE Arweave TX" value={contract.poe_arweave_tx || '—'} />
          <KVRow label="Created" value={fmtDateTime(contract.created_at)} />
          {contract.resolved_at && <KVRow label="Resolved" value={fmtDateTime(contract.resolved_at)} />}
        </div>
      </div>
      <div style={{ marginTop: '1.5rem' }}>
        <div className="section-header"><span className="section-title">Timeline</span></div>
        <div className="detail-card">
          <div className="timeline">
            {stages.map((s, i) => (
              <div className="timeline-item" key={i}>
                <div className="timeline-line">
                  <div className={`timeline-dot ${s.done ? 'done' : ''}`} />
                  {i < stages.length - 1 && <div className="timeline-connector" />}
                </div>
                <div>
                  <div className="timeline-stage" style={{ color: s.done ? 'var(--text)' : 'var(--text-dim)' }}>{s.label}</div>
                  <div className="timeline-ts">{s.ts ? fmtDateTime(s.ts) : s.done ? 'Completed' : 'Pending'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function ContractsList() {
  const searchParams = useSearchParams();
  const viewId = searchParams.get('view');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!viewId) fetchContracts().then(data => setContracts(Array.isArray(data) ? data : [])).finally(() => setLoading(false));
    else setLoading(false);
  }, [viewId]);

  if (viewId) return <ContractDetailView id={viewId} />;
  if (loading) return <div className="empty"><div className="spinner" /><br />Loading contracts...</div>;

  const filtered = contracts.filter(c => {
    if (!filter) return true;
    const f = filter.toLowerCase();
    return c.id.toLowerCase().includes(f) || c.pubkey.toLowerCase().includes(f)
      || c.requester.toLowerCase().includes(f) || c.provider.toLowerCase().includes(f);
  });

  return (
    <>
      <div className="search-bar">
        <span>&#128269;</span>
        <input className="search-input" type="text" placeholder="Search by ID, pubkey, requester, or provider..."
          value={filter} onChange={e => setFilter(e.target.value)} />
      </div>
      <div className="section-header">
        <span className="section-title">Contracts</span>
        <span className="section-count">{filtered.length} of {contracts.length}</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Requester</th><th>Provider</th><th>Value (SWORN)</th><th>PoE Reference</th><th>Created</th><th>Status</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7}><div className="empty">{filter ? 'No contracts match' : 'No contracts yet'}</div></td></tr>
            ) : filtered.map(c => (
              <tr key={c.id}>
                <td><Link href={`/contracts/?view=${c.id}`} className="addr">#{c.id}</Link></td>
                <td><Link href={`/agents/?view=${c.requester}`} className="addr">{shortAddr(c.requester)}</Link></td>
                <td><Link href={`/agents/?view=${c.provider}`} className="addr">{shortAddr(c.provider)}</Link></td>
                <td className="mono">{(c.value_sworn ?? 0).toFixed(4)}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted)' }}>{c.poe_arweave_tx || '—'}</td>
                <td style={{ color: 'var(--text-dim)' }}>{fmtDate(c.created_at)}</td>
                <td><StatusBadge status={c.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function ContractsPage() {
  return <Suspense fallback={<div className="empty"><div className="spinner" /></div>}><ContractsList /></Suspense>;
}
