const API_BASE = typeof window !== 'undefined' ? '' : '';

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/api/stats`);
  return res.json();
}

export async function fetchAgents() {
  const res = await fetch(`${API_BASE}/api/agents`);
  return res.json();
}

export async function fetchAgent(pubkey: string) {
  const res = await fetch(`${API_BASE}/api/agents/${pubkey}`);
  return res.json();
}

export async function fetchContracts() {
  const res = await fetch(`${API_BASE}/api/contracts`);
  return res.json();
}

export async function fetchContract(id: string) {
  const res = await fetch(`${API_BASE}/api/contracts/${id}`);
  return res.json();
}

export async function fetchDisputes() {
  const res = await fetch(`${API_BASE}/api/disputes`);
  return res.json();
}

export async function fetchActivity() {
  const res = await fetch(`${API_BASE}/api/activity`);
  return res.json();
}

export async function refreshData() {
  const res = await fetch(`${API_BASE}/api/refresh`);
  return res.json();
}
