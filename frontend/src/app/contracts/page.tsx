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
          <KVRow label="Value" value={`${(contract.value ?? contract.value_sworn ?? 0).toFixed(4)} ${contract.currency ?? 'SWORN'}`} />
          <KVRow label="Provider Stake" value={`${(contract.provider_stake ?? contract.provider_stake_sworn ?? 0).toFixed(4)} ${contract.currency ?? 'SWORN'}`} />
          <KVRow label="Status" value={<StatusBadge status={contract.status} />} mono={false} />
          <KVRow label="Dispute Level" value={contract.dispute_level} />
        </div>
        {contract.dispute_status && (
        <div className="detail-card">
          <div className="detail-card-title">Dispute</div>
          <KVRow label="Status" value={<StatusBadge status={contract.dispute_status} />} mono={false} />
          <KVRow label="Level" value={contract.dispute_level_name || '—'} />
          {contract.dispute_initiator && <KVRow label="Initiator" value={<Link href={`/agents/?view=${contract.dispute_initiator}`}>{shortAddr(contract.dispute_initiator)}</Link>} />}
          <KVRow label="Corrections" value={`${contract.corrections_count} / 3`} />
          {contract.dispute_evidence_hash && <KVRow label="Evidence Hash" value={contract.dispute_evidence_hash} />}
          {contract.dispute_response_hash && <KVRow label="Response Hash" value={contract.dispute_response_hash} />}
          {(contract.votes_provider !== undefined && contract.votes_provider > 0) && <KVRow label="Votes (Provider / Requester)" value={`${contract.votes_provider} / ${contract.votes_requester || 0}`} />}
          {contract.dispute_deadline && <KVRow label="Deadline" value={fmtDateTime(contract.dispute_deadline)} />}
          {contract.dispute_created_at && <KVRow label="Opened" value={fmtDateTime(contract.dispute_created_at)} />}
          {contract.dispute_resolved_at && <KVRow label="Resolved" value={fmtDateTime(contract.dispute_resolved_at)} />}
        </div>
        )}
        <div className="detail-card">
          <div className="detail-card-title">Proof of Execution</div>
          {contract.poe_hash && <KVRow label="PoE Hash (SHA-256)" value={contract.poe_hash} />}
          {contract.poe_input_hash && <KVRow label="Input Hash" value={contract.poe_input_hash} />}
          {contract.poe_output_hash && <KVRow label="Output Hash" value={contract.poe_output_hash} />}
          <KVRow label="Arweave TX" value={contract.poe_arweave_tx || '—'} />
          {contract.poe_submitted_at && <KVRow label="Submitted" value={fmtDateTime(contract.poe_submitted_at)} />}
          {contract.poe_validated !== undefined && <KVRow label="Validated" value={contract.poe_validated ? 'Yes' : 'No'} />}
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

      {/* Bids Tab (placeholder) */}
      <div style={{
        marginTop: "1.5rem", background: "var(--card-bg)", border: "1px solid var(--border)",
        borderRadius: 10, padding: "1.25rem"
      }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--accent)", marginBottom: "0.75rem" }}>
          Bids
        </div>
        <div style={{
          padding: "1.5rem", textAlign: "center", color: "var(--text-dim)",
          borderRadius: 8, border: "1px dashed var(--border)"
        }}>
          <div style={{ fontSize: "0.8rem", marginBottom: "0.5rem" }}>Public bidding coming soon.</div>
          <div style={{ fontSize: "0.65rem", lineHeight: 1.6 }}>
            Agents will compete with scored bids: Price (35%), Trust (45%), Speed (20%).
            <br />
            Requesters will select the best bid based on composite score.
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
            <tr><th>ID</th><th>Requester</th><th>Provider</th><th>Value (SWORN)</th><th>PoE Reference</th><th>Created</th><th>Status</th><th>Dispute</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8}><div className="empty">{filter ? 'No contracts match' : 'No contracts yet'}</div></td></tr>
            ) : filtered.map(c => (
              <tr key={c.id}>
                <td><Link href={`/contracts/?view=${c.id}`} className="addr">#{c.id}</Link></td>
                <td><Link href={`/agents/?view=${c.requester}`} className="addr">{shortAddr(c.requester)}</Link></td>
                <td><Link href={`/agents/?view=${c.provider}`} className="addr">{shortAddr(c.provider)}</Link></td>
                <td className="mono">{(c.value ?? c.value_sworn ?? 0).toFixed(4)} {c.currency ?? 'SWORN'}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted)' }}>{c.poe_arweave_tx || '—'}</td>
                <td style={{ color: 'var(--text-dim)' }}>{fmtDate(c.created_at)}</td>
                <td><StatusBadge status={c.status} /></td>
                <td>{c.dispute_status ? <StatusBadge status={c.dispute_status} /> : '—'}</td>
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
