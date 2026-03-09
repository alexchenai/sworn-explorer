export function shortAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr || '—';
  return addr.slice(0, 4) + '...' + addr.slice(-4);
}

export function trustColor(score: number): string {
  if (score >= 80) return '#00ff88';
  if (score >= 50) return '#00d4ff';
  if (score >= 20) return '#ffcc00';
  return '#ff4466';
}

export function statusColor(status: string): { bg: string; color: string } {
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'active') return { bg: 'rgba(0,255,136,0.12)', color: '#00ff88' };
  if (s === 'delivered') return { bg: 'rgba(0,212,255,0.10)', color: '#00d4ff' };
  if (s === 'created') return { bg: 'rgba(255,204,0,0.12)', color: '#ffcc00' };
  if (s === 'disputed') return { bg: 'rgba(255,68,102,0.12)', color: '#ff4466' };
  return { bg: 'rgba(136,136,168,0.12)', color: '#8888a8' };
}

export function fmtDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtDateTime(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
}

export function explorerAddr(addr: string): string {
  return `https://explorer.solana.com/address/${addr}?cluster=devnet`;
}

export function explorerTx(sig: string): string {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}
