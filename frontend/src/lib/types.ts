export interface Agent {
  pubkey: string;
  owner: string;
  identity_pda: string;
  trust_score: number;
  tasks_completed: number;
  tasks_abandoned: number;
  disputes_lost: number;
  disputes_won: number;
  fraud_flags: number;
  volume_processed_sol: number;
  identity_bond_sworn: number;
  sponsor_bonus: number;
  registration_date: string;
  matured: boolean;
  banned: boolean;
  status: string;
}

export interface Contract {
  id: string;
  pubkey: string;
  requester: string;
  provider: string;
  value_sol: number;
  provider_stake_sol: number;
  requester_stake_sol: number;
  status: string;
  created_at: string;
  resolved_at?: string;
  poe_arweave_tx?: string;
  dispute_level: number;
}

export interface Activity {
  signature: string;
  type: string;
  actor: string;
  target?: string;
  amount?: number;
  timestamp: string;
  status: string;
  slot: number;
}

export interface Stats {
  total_agents: number;
  total_contracts: number;
  active_contracts: number;
  insurance_pool_sol: number;
  sworn_supply: number;
  sworn_mint: string;
  program_id: string;
  network: string;
  last_updated: string;
  avg_trust_score: number;
  total_value_locked: number;
  total_agents_chain: number;
  total_contracts_chain: number;
}
