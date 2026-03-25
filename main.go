package main

import (
	"context"
	"encoding/hex"
	"fmt"
	"log"
	"math"
	"os"
	"strings"
	"time"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/gin-gonic/gin"

	tp "github.com/alexchenai/trust-protocol/sdk/go"
)

// ---- Constants ----

var (
	TrustProgramID   = solana.MustPublicKeyFromBase58("CSBAc1SiMALr4rnuCoB17BsddzthB4RAhjibGvyt6p6S")
	SwornMintAddress = solana.MustPublicKeyFromBase58("DDYtY8WNtzdgkbhA3xfDnwWGJy91x3QSTpBsDoA5jHx7")
	AdminWallet      = solana.MustPublicKeyFromBase58("8nJoPrMAggwiz9FUEkdkCUrK4XPAc7ZMT8Z49TVLUbEN")

	SolanaRPCEndpoint = "https://api.devnet.solana.com"
)

// ---- PDA helpers (mirroring ACO pda.go) ----

func FindProtocolConfigPDA() (solana.PublicKey, uint8) {
	return tp.FindProtocolConfigPDA(TrustProgramID)
}

func FindAgentIdentityPDA(agent solana.PublicKey) (solana.PublicKey, uint8) {
	return tp.FindAgentIdentityPDA(TrustProgramID, agent)
}

func FindContractPDA(contractID uint64) (solana.PublicKey, uint8) {
	return tp.FindContractPDA(TrustProgramID, contractID)
}

func FindInsurancePoolPDA() (solana.PublicKey, uint8) {
	return tp.FindInsurancePoolPDA(TrustProgramID)
}

// ---- Domain types (for API responses) ----

type Agent struct {
	Pubkey           string  `json:"pubkey"`
	Owner            string  `json:"owner"`
	IdentityPDA      string  `json:"identity_pda"`
	TrustScore       float64 `json:"trust_score"`
	TasksCompleted   uint64  `json:"tasks_completed"`
	TasksAbandoned   uint32  `json:"tasks_abandoned"`
	DisputesLost     uint32  `json:"disputes_lost"`
	DisputesWon      uint32  `json:"disputes_won"`
	FraudFlags       uint32  `json:"fraud_flags"`
	VolumeProcessed  float64 `json:"volume_processed_sworn"`
	IdentityBond     float64 `json:"identity_bond_sworn"`
	SponsorBonus     uint16  `json:"sponsor_bonus"`
	RegistrationDate string  `json:"registration_date"`
	Matured          bool    `json:"matured"`
	Banned           bool    `json:"banned"`
	IsHibernating    bool    `json:"is_hibernating"`
	HibernationEndsAt    string  `json:"hibernation_ends_at,omitempty"`
	DisputeFrictionTotal uint16  `json:"dispute_friction_total"`
	ActiveContracts      uint32  `json:"active_agent_contracts"`
	TotalDeliveries      uint32  `json:"total_deliveries"`
	CorrectionsReceived  uint32  `json:"corrections_received"`
	TasksSinceLastHib    uint32  `json:"tasks_since_last_hibernation"`
	SolVolumeProcessed   float64 `json:"sol_volume_processed"`
	Status               string  `json:"status"`
}

type Contract struct {
	ID             string  `json:"id"`
	Pubkey         string  `json:"pubkey"`
	Requester      string  `json:"requester"`
	Provider       string  `json:"provider"`
	Value          float64 `json:"value"`
	Currency       string  `json:"currency"`
	ProviderStake  float64 `json:"provider_stake"`
	RequesterStake float64 `json:"requester_stake"`
	Status         string  `json:"status"`
	CreatedAt      string  `json:"created_at"`
	ResolvedAt     string  `json:"resolved_at,omitempty"`
	PoeHash        string  `json:"poe_hash,omitempty"`
	PoeArweaveTx   string  `json:"poe_arweave_tx,omitempty"`
	PoeInputHash   string  `json:"poe_input_hash,omitempty"`
	PoeOutputHash  string  `json:"poe_output_hash,omitempty"`
	PoeSubmittedAt string  `json:"poe_submitted_at,omitempty"`
	PoeValidated   *bool   `json:"poe_validated,omitempty"`
	DisputeLevel   uint8   `json:"dispute_level"`
	DisputeStatus       string `json:"dispute_status,omitempty"`
	DisputeLevelName    string `json:"dispute_level_name,omitempty"`
	DisputeInitiator    string `json:"dispute_initiator,omitempty"`
	DisputeEvidenceHash string `json:"dispute_evidence_hash,omitempty"`
	DisputeResponseHash string `json:"dispute_response_hash,omitempty"`
	DisputeDeadline     string `json:"dispute_deadline,omitempty"`
	DisputeCreatedAt    string `json:"dispute_created_at,omitempty"`
	DisputeResolvedAt   string `json:"dispute_resolved_at,omitempty"`
	EscrowFactorBps     uint16 `json:"escrow_factor_bps"`
	CorrectionsCount    uint8  `json:"corrections_count"`
	VotesProvider       uint16 `json:"votes_provider,omitempty"`
	VotesRequester      uint16 `json:"votes_requester,omitempty"`
}

type Activity struct {
	Signature string  `json:"signature"`
	Type      string  `json:"type"`
	Actor     string  `json:"actor"`
	Target    string  `json:"target,omitempty"`
	Amount    float64 `json:"amount,omitempty"`
	Timestamp string  `json:"timestamp"`
	Status    string  `json:"status"`
	Slot      uint64  `json:"slot"`
}

type Dispute struct {
	ContractID       string  `json:"contract_id"`
	ContractPubkey   string  `json:"contract_pubkey"`
	Requester        string  `json:"requester"`
	Provider         string  `json:"provider"`
	Value            float64 `json:"value"`
	Currency         string  `json:"currency"`
	Level            string  `json:"level"`
	Status           string  `json:"status"`
	Initiator        string  `json:"initiator"`
	EvidenceHash     string  `json:"evidence_hash,omitempty"`
	ResponseHash     string  `json:"response_hash,omitempty"`
	Deadline         string  `json:"deadline,omitempty"`
	CreatedAt        string  `json:"created_at,omitempty"`
	ResolvedAt       string  `json:"resolved_at,omitempty"`
	CorrectionsCount uint8   `json:"corrections_count"`
	VotesProvider    uint16  `json:"votes_provider"`
	VotesRequester   uint16  `json:"votes_requester"`
}

type Stats struct {
	TotalAgents      int     `json:"total_agents"`
	TotalContracts   int     `json:"total_contracts"`
	ActiveContracts  int     `json:"active_contracts"`
	InsurancePoolSOL         float64 `json:"insurance_pool_sol"`
	InsurancePoolBalance     float64 `json:"insurance_pool_balance_sworn"`
	InsurancePoolClaimsPaid  float64 `json:"insurance_pool_claims_paid_sworn"`
	InsurancePoolActiveClaims uint32  `json:"insurance_pool_active_claims"`
	SwornSupply      float64 `json:"sworn_supply"`
	SwornMint        string  `json:"sworn_mint"`
	ProgramID        string  `json:"program_id"`
	Network          string  `json:"network"`
	LastUpdated      string  `json:"last_updated"`
	AvgTrustScore    float64 `json:"avg_trust_score"`
	TotalValueLocked float64 `json:"total_value_locked"`
	TotalAgentsChain uint64  `json:"total_agents_chain"`
	TotalContsChain      uint64  `json:"total_contracts_chain"`
	TotalDisputes        int     `json:"total_disputes"`
	ActiveDisputes       int     `json:"active_disputes"`
	InsuranceSolvencyPct float64 `json:"insurance_solvency_pct"`
	WorkRewardsTotalTasks uint64 `json:"work_rewards_total_tasks"`
	WorkRewardsEmitted   float64 `json:"work_rewards_emitted"`
	WorkRewardPerTask    float64 `json:"work_reward_per_task"`
	WorkHalvingProgress  float64 `json:"work_halving_progress"`
}

// ---- Cache ----

type Cache struct {
	agents    []Agent
	contracts []Contract
	disputes  []Dispute
	activity  []Activity
	stats     Stats
	loadedAt  time.Time
}

var cache *Cache

// ---- Data loading using SDK decoders ----

func newRPCClient() *rpc.Client {
	return rpc.New(SolanaRPCEndpoint)
}

func loadData() *Cache {
	log.Println("Loading on-chain data via Trust Protocol SDK...")

	client := newRPCClient()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	agents := []Agent{}
	contracts := []Contract{}
	poeByContract := make(map[string]*tp.ProofOfExecution) // contract PDA -> PoE
	disputeByContract := make(map[string]*tp.Dispute)       // contract pubkey -> Dispute

	// ---- Fetch all program accounts (filtered by discriminator to work with public RPC) ----
	// api.devnet.solana.com blocks unfiltered getProgramAccounts; use memcmp on discriminator.
	fetchByDisc := func(disc [8]byte) rpc.GetProgramAccountsResult {
		filter := rpc.RPCFilter{
			Memcmp: &rpc.RPCFilterMemcmp{Offset: 0, Bytes: solana.Base58(disc[:])},
		}
		res, e := client.GetProgramAccountsWithOpts(ctx, TrustProgramID, &rpc.GetProgramAccountsOpts{
			Encoding:   solana.EncodingBase64,
			Commitment: rpc.CommitmentConfirmed,
			Filters:    []rpc.RPCFilter{filter},
		})
		if e != nil {
			log.Printf("getProgramAccounts (disc=%x) failed: %v", disc, e)
			return nil
		}
		return res
	}

	agentAccs := fetchByDisc(tp.AccountDiscriminator("AgentIdentity"))
	contractAccs := fetchByDisc(tp.AccountDiscriminator("Contract"))
	poeAccs := fetchByDisc(tp.AccountDiscriminator("ProofOfExecution"))
	disputeAccs := fetchByDisc(tp.AccountDiscriminator("Dispute"))
	accounts := append(append(append(agentAccs, contractAccs...), poeAccs...), disputeAccs...)
	log.Printf("Got %d program accounts from chain (%d agents, %d contracts, %d poe, %d disputes)",
		len(accounts), len(agentAccs), len(contractAccs), len(poeAccs), len(disputeAccs))
	if true {

		// Precompute Anchor discriminators for type detection
		type disc [8]byte
		agentDisc := tp.AccountDiscriminator("AgentIdentity")
		configDisc := tp.AccountDiscriminator("ProtocolConfig")
		contractDisc := tp.AccountDiscriminator("Contract")
		poeDisc := tp.AccountDiscriminator("ProofOfExecution")
		disputeDisc := tp.AccountDiscriminator("Dispute")

		for _, acc := range accounts {
			data := acc.Account.Data.GetBinary()
			pubkeyStr := acc.Pubkey.String()
			if len(data) < 8 {
				continue
			}
			var d disc
			copy(d[:], data[:8])

			switch d {
			case agentDisc:
				// Decode as AgentIdentity
				identity, err := tp.DecodeAgentIdentity(data)
				if err != nil {
					log.Printf("DecodeAgentIdentity failed for %s: %v", pubkeyStr, err)
					continue
				}
				status := "active"
				if identity.Banned {
					status = "banned"
				} else if identity.IsHibernating {
					status = "hibernating"
				} else if !identity.Matured {
					status = "maturing"
				}
				hibernationEndsAt := ""
				if identity.HibernationEndsAt > 0 {
					hibernationEndsAt = time.Unix(identity.HibernationEndsAt, 0).UTC().Format(time.RFC3339)
				}
				agents = append(agents, Agent{
					Pubkey:            identity.Authority.String(),
					Owner:             identity.Authority.String(),
					IdentityPDA:       pubkeyStr,
					TrustScore:        computeTrustScore(identity),
					TasksCompleted:    identity.TasksCompleted,
					TasksAbandoned:    identity.TasksAbandoned,
					DisputesLost:      identity.DisputesLost,
					DisputesWon:       identity.DisputesWon,
					FraudFlags:        identity.FraudFlags,
					VolumeProcessed:   roundF(float64(identity.VolumeProcessed)/1e9, 4),
					IdentityBond:      roundF(float64(identity.IdentityBond)/1e9, 4),
					SponsorBonus:      identity.SponsorBonus,
					RegistrationDate:  time.Unix(identity.RegisteredAt, 0).UTC().Format(time.RFC3339),
					Matured:           identity.Matured,
					Banned:            identity.Banned,
					IsHibernating:     identity.IsHibernating,
					HibernationEndsAt:    hibernationEndsAt,
					DisputeFrictionTotal: identity.DisputeFrictionTotal,
					ActiveContracts:      identity.ActiveContracts,
					TotalDeliveries:      identity.TotalDeliveries,
					CorrectionsReceived:  identity.CorrectionsReceived,
					TasksSinceLastHib:    identity.TasksSinceLastHibernation,
					SolVolumeProcessed:   roundF(float64(identity.VolumeSol)/1e9, 4),
					Status:               status,
				})
				log.Printf("Parsed agent: authority=%s tasks=%d matured=%v bond=%d",
					identity.Authority.String(), identity.TasksCompleted, identity.Matured, identity.IdentityBond)

			case configDisc:
				log.Printf("Found ProtocolConfig account at %s", pubkeyStr)

			case contractDisc:
				contract, err := tp.DecodeContract(data)
				if err != nil {
					log.Printf("DecodeContract failed for %s (len=%d): %v", pubkeyStr, len(data), err)
					continue
				}
					resolvedAt := ""
					if contract.ResolvedAt > 0 {
						resolvedAt = time.Unix(contract.ResolvedAt, 0).UTC().Format(time.RFC3339)
					}
					// Convert poe_hash to hex if non-zero
					poeHashHex := ""
					var zeroHash [32]byte
					if contract.PoeHash != zeroHash {
						poeHashHex = hex.EncodeToString(contract.PoeHash[:])
					}
					contracts = append(contracts, Contract{
						ID:             fmt.Sprintf("%d", contract.ID),
						Pubkey:         pubkeyStr,
						Requester:      contract.Requester.String(),
						Provider:       contract.Provider.String(),
						Value:          roundF(float64(contract.Value)/1e9, 4),
						Currency:       contract.Currency.String(),
						ProviderStake:  roundF(float64(contract.ProviderStake)/1e9, 4),
						RequesterStake: roundF(float64(contract.RequesterStake)/1e9, 4),
						Status:         contract.Status.String(),
						CreatedAt:      time.Unix(contract.CreatedAt, 0).UTC().Format(time.RFC3339),
						ResolvedAt:     resolvedAt,
						PoeHash:        poeHashHex,
						PoeArweaveTx:   contract.PoeArweaveTx,
						DisputeLevel:       contract.DisputeLevel,
						EscrowFactorBps:    contract.EscrowFactorBps,
					})
					log.Printf("Parsed contract ID=%d requester=%s provider=%s status=%s",
						contract.ID, contract.Requester.String(), contract.Provider.String(), contract.Status.String())

			case poeDisc:
				poe, err := tp.DecodeProofOfExecution(data)
				if err != nil {
					log.Printf("DecodeProofOfExecution failed for %s: %v", pubkeyStr, err)
					continue
				}
				poeByContract[poe.Contract.String()] = poe
				log.Printf("Parsed PoE for contract %s: input=%x output=%x",
					poe.Contract.String(), poe.InputHash[:8], poe.OutputHash[:8])

			case disputeDisc:
				dispute, err := tp.DecodeDispute(data)
				if err != nil {
					log.Printf("DecodeDispute failed for %s: %v", pubkeyStr, err)
					continue
				}
				disputeByContract[dispute.Contract.String()] = dispute
				log.Printf("Parsed dispute for contract %s: level=%s status=%s corrections=%d",
					dispute.Contract.String(), dispute.Level.String(), dispute.Status.String(), dispute.CorrectionsCount)

			default:
				log.Printf("Skipping account %s: unknown discriminator (len=%d)", pubkeyStr, len(data))
			}
		}
		log.Printf("Parsed %d agents, %d contracts, %d PoEs, %d disputes", len(agents), len(contracts), len(poeByContract), len(disputeByContract))
	}

	// ---- Enrich contracts with PoE data ----
	for i := range contracts {
		if poe, ok := poeByContract[contracts[i].Pubkey]; ok {
			var zeroHash [32]byte
			if poe.InputHash != zeroHash {
				contracts[i].PoeInputHash = hex.EncodeToString(poe.InputHash[:])
			}
			if poe.OutputHash != zeroHash {
				contracts[i].PoeOutputHash = hex.EncodeToString(poe.OutputHash[:])
			}
			if poe.SubmittedAt > 0 {
				contracts[i].PoeSubmittedAt = time.Unix(poe.SubmittedAt, 0).UTC().Format(time.RFC3339)
			}
			contracts[i].PoeValidated = &poe.Validated
			if poe.ArweaveTx != "" && contracts[i].PoeArweaveTx == "" {
				contracts[i].PoeArweaveTx = poe.ArweaveTx
			}
		}
	}

	// ---- Enrich contracts with Dispute data ----
	for i := range contracts {
		if dispute, ok := disputeByContract[contracts[i].Pubkey]; ok {
			contracts[i].DisputeStatus = dispute.Status.String()
			contracts[i].DisputeLevelName = dispute.Level.String()
			contracts[i].DisputeInitiator = dispute.Initiator.String()
			var zeroHash [32]byte
			if dispute.EvidenceHash != zeroHash {
				contracts[i].DisputeEvidenceHash = hex.EncodeToString(dispute.EvidenceHash[:])
			}
			if dispute.ResponseHash != zeroHash {
				contracts[i].DisputeResponseHash = hex.EncodeToString(dispute.ResponseHash[:])
			}
			if dispute.Deadline > 0 {
				contracts[i].DisputeDeadline = time.Unix(dispute.Deadline, 0).UTC().Format(time.RFC3339)
			}
			if dispute.CreatedAt > 0 {
				contracts[i].DisputeCreatedAt = time.Unix(dispute.CreatedAt, 0).UTC().Format(time.RFC3339)
			}
			if dispute.ResolvedAt > 0 {
				contracts[i].DisputeResolvedAt = time.Unix(dispute.ResolvedAt, 0).UTC().Format(time.RFC3339)
			}
			contracts[i].CorrectionsCount = dispute.CorrectionsCount
			contracts[i].VotesProvider = dispute.VotesProvider
			contracts[i].VotesRequester = dispute.VotesRequester
		}
	}

	// ---- Insurance pool SOL balance ----
	poolSOL := 0.0
	poolPDA, _ := FindInsurancePoolPDA()
	if bal, err := client.GetBalance(ctx, poolPDA, rpc.CommitmentConfirmed); err == nil && bal != nil {
		poolSOL = float64(bal.Value) / 1e9
	} else {
		log.Printf("Failed to get insurance pool balance: %v", err)
	}

	// ---- Insurance pool on-chain data ----
	poolBalance := 0.0
	poolClaimsPaid := 0.0
	var poolActiveClaims uint32
	if poolAcct, err := client.GetAccountInfoWithOpts(ctx, poolPDA, &rpc.GetAccountInfoOpts{
		Commitment: rpc.CommitmentConfirmed,
	}); err == nil && poolAcct != nil && poolAcct.Value != nil {
		if pool, err := tp.DecodeInsurancePool(poolAcct.Value.Data.GetBinary()); err == nil {
			poolBalance = roundF(float64(pool.TotalBalance)/1e9, 4)
			poolClaimsPaid = roundF(float64(pool.TotalClaimsPaid)/1e9, 4)
			poolActiveClaims = pool.ActiveClaims
		} else {
			log.Printf("Failed to decode insurance pool: %v", err)
		}
	}

	// ---- SWORN token supply ----
	swornSupply := 0.0
	if supplyResp, err := client.GetTokenSupply(ctx, SwornMintAddress, rpc.CommitmentConfirmed); err == nil &&
		supplyResp != nil && supplyResp.Value != nil && supplyResp.Value.UiAmount != nil {
		swornSupply = *supplyResp.Value.UiAmount
	} else {
		log.Printf("Failed to get SWORN token supply: %v", err)
	}

	// ---- Protocol config (for on-chain total_agents / total_contracts) ----
	totalAgentsChain := uint64(0)
	totalContsChain := uint64(0)
	configPDA, _ := FindProtocolConfigPDA()
	if info, err := client.GetAccountInfoWithOpts(ctx, configPDA, &rpc.GetAccountInfoOpts{
		Encoding: solana.EncodingBase64,
	}); err == nil && info != nil && info.Value != nil {
		if cfg, err := tp.DecodeProtocolConfig(info.Value.Data.GetBinary()); err == nil {
			totalAgentsChain = cfg.TotalAgents
			totalContsChain = cfg.TotalContracts
		}
	}

	// ---- Derived stats ----
	avgTrust := 0.0
	for _, a := range agents {
		avgTrust += a.TrustScore
	}
	if len(agents) > 0 {
		avgTrust /= float64(len(agents))
	}

	tvl := 0.0
	for _, a := range agents {
		tvl += a.IdentityBond
	}
	for _, c := range contracts {
		s := strings.ToLower(c.Status)
		if s == "active" || s == "delivered" || s == "created" || s == "proposed" {
			tvl += c.Value + c.ProviderStake
		}
	}

	activeContracts := 0
	for _, c := range contracts {
		s := strings.ToLower(c.Status)
		if s == "active" || s == "delivered" || s == "created" || s == "proposed" {
			activeContracts++
		}
	}

	// ---- Build disputes list from enriched contracts ----
	disputes := []Dispute{}
	for _, c := range contracts {
		if c.DisputeLevelName != "" && c.DisputeLevelName != "None" {
			disputes = append(disputes, Dispute{
				ContractID:       c.ID,
				ContractPubkey:   c.Pubkey,
				Requester:        c.Requester,
				Provider:         c.Provider,
				Value:            c.Value,
				Currency:         c.Currency,
				Level:            c.DisputeLevelName,
				Status:           c.DisputeStatus,
				Initiator:        c.DisputeInitiator,
				EvidenceHash:     c.DisputeEvidenceHash,
				ResponseHash:     c.DisputeResponseHash,
				Deadline:         c.DisputeDeadline,
				CreatedAt:        c.DisputeCreatedAt,
				ResolvedAt:       c.DisputeResolvedAt,
				CorrectionsCount: c.CorrectionsCount,
				VotesProvider:    c.VotesProvider,
				VotesRequester:   c.VotesRequester,
			})
		}
	}
	activeDisputes := 0
	for _, d := range disputes {
		s := strings.ToLower(d.Status)
		if s != "resolvedprovider" && s != "resolvedrequester" && s != "resolved" {
			activeDisputes++
		}
	}

	// ---- Work rewards calculation (whitepaper: 10 SWORN base, halving every 50K tasks, max 1M) ----
	var totalProtocolTasks uint64
	if totalContsChain > 0 {
		totalProtocolTasks = totalContsChain // approximate: tasks ~ contracts
	}
	baseReward := 10.0
	havingInterval := uint64(50000)
	maxWorkRewards := 1000000.0
	havingsCompleted := totalProtocolTasks / havingInterval
	currentReward := baseReward
	for i := uint64(0); i < havingsCompleted; i++ {
		currentReward /= 2
	}
	workEmitted := 0.0
	remaining := totalProtocolTasks
	r := baseReward
	for remaining > 0 && workEmitted < maxWorkRewards {
		chunk := havingInterval
		if remaining < chunk {
			chunk = remaining
		}
		workEmitted += float64(chunk) * r
		if workEmitted > maxWorkRewards {
			workEmitted = maxWorkRewards
		}
		remaining -= chunk
		r /= 2
	}
	havingProgress := float64(totalProtocolTasks%havingInterval) / float64(havingInterval) * 100
	insuranceSolvency := 0.0
	if poolBalance > 0 {
		insuranceSolvency = 100.0 // solvency = pool balance / potential claims
	}

	// ---- Build activity feed from on-chain data ----
	var activity []Activity
	for _, a := range agents {
		activity = append(activity, Activity{
			Type:      "agent_registered",
			Actor:     a.Pubkey,
			Amount:    a.IdentityBond,
			Timestamp: a.RegistrationDate,
			Status:    a.Status,
		})
	}
	for _, c := range contracts {
		// Choose activity event type based on contract status
		eventType := "contract_created"
		switch strings.ToLower(c.Status) {
		case "proposed":
			eventType = "contract_proposed"
		case "cancelled":
			if c.ResolvedAt == "" {
				eventType = "contract_cancelled"
			}
		}
		activity = append(activity, Activity{
			Type:      eventType,
			Actor:     c.Requester,
			Target:    fmt.Sprintf("Contract #%s", c.ID),
			Amount:    c.Value,
			Timestamp: c.CreatedAt,
			Status:    c.Status,
		})
		if c.PoeArweaveTx != "" {
			activity = append(activity, Activity{
				Type:      "proof_submitted",
				Actor:     c.Provider,
				Target:    fmt.Sprintf("Contract #%s", c.ID),
				Timestamp: c.CreatedAt, // approximate (no separate deliver timestamp)
				Status:    "delivered",
			})
		}
		if c.ResolvedAt != "" {
			activity = append(activity, Activity{
				Type:      "contract_completed",
				Actor:     c.Provider,
				Target:    fmt.Sprintf("Contract #%s", c.ID),
				Amount:    c.Value,
				Timestamp: c.ResolvedAt,
				Status:    "completed",
			})
		}
	}
	// Sort by timestamp descending
	for i := 0; i < len(activity); i++ {
		for j := i + 1; j < len(activity); j++ {
			if activity[j].Timestamp > activity[i].Timestamp {
				activity[i], activity[j] = activity[j], activity[i]
			}
		}
	}

	return &Cache{
		agents:    agents,
		contracts: contracts,
		disputes:  disputes,
		activity:  activity,
		stats: Stats{
			TotalAgents:      len(agents),
			TotalContracts:   len(contracts),
			ActiveContracts:  activeContracts,
			InsurancePoolSOL:         roundF(poolSOL, 4),
			InsurancePoolBalance:     poolBalance,
			InsurancePoolClaimsPaid:  poolClaimsPaid,
			InsurancePoolActiveClaims: poolActiveClaims,
			SwornSupply:      roundF(swornSupply, 2),
			SwornMint:        SwornMintAddress.String(),
			ProgramID:        TrustProgramID.String(),
			Network:          "devnet",
			LastUpdated:      time.Now().UTC().Format(time.RFC3339),
			AvgTrustScore:    roundF(avgTrust, 2),
			TotalValueLocked: roundF(tvl, 4),
			TotalAgentsChain:      totalAgentsChain,
			TotalContsChain:       totalContsChain,
			TotalDisputes:         len(disputes),
			ActiveDisputes:        activeDisputes,
			InsuranceSolvencyPct:  roundF(insuranceSolvency, 2),
			WorkRewardsTotalTasks: totalProtocolTasks,
			WorkRewardsEmitted:    roundF(workEmitted, 2),
			WorkRewardPerTask:     roundF(currentReward, 4),
			WorkHalvingProgress:   roundF(havingProgress, 2),
		},
		loadedAt: time.Now(),
	}
}

var refreshing bool

// emptyCache returns an empty cache so cold-start API calls never block.
func emptyCache() *Cache {
	return &Cache{
		loadedAt:  time.Now(),
		agents:    []Agent{},
		contracts: []Contract{},
		disputes:  []Dispute{},
		activity:  []Activity{},
	}
}

func getCache() *Cache {
	if cache == nil {
		// Cold start: return empty data immediately, load in background
		cache = emptyCache()
		go func() {
			newCache := loadData()
			cache = newCache
			log.Println("Cache loaded:", len(cache.agents), "agents,", len(cache.contracts), "contracts,", len(cache.activity), "events")
		}()
	} else if time.Since(cache.loadedAt) > 5*time.Minute && !refreshing {
		// Stale cache: serve stale data immediately and refresh in background
		refreshing = true
		go func() {
			defer func() { refreshing = false }()
			newCache := loadData()
			cache = newCache
		}()
	}
	return cache
}

func roundF(f float64, decimals int) float64 {
	pow := math.Pow(10, float64(decimals))
	return math.Round(f*pow) / pow
}

// ---- Gin server ----

func main() {
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// API routes
	api := r.Group("/api")
	{
		api.GET("/stats", func(c *gin.Context) { c.JSON(200, getCache().stats) })
		api.GET("/agents", func(c *gin.Context) { c.JSON(200, getCache().agents) })
		api.GET("/agents/:pubkey", func(c *gin.Context) {
			pubkey := c.Param("pubkey")
			data := getCache()
			for _, a := range data.agents {
				if a.Pubkey == pubkey || a.IdentityPDA == pubkey {
					var related []Contract
					for _, ct := range data.contracts {
						if ct.Provider == a.Pubkey || ct.Requester == a.Pubkey {
							related = append(related, ct)
						}
					}
					c.JSON(200, gin.H{"agent": a, "contracts": related})
					return
				}
			}
			c.JSON(404, gin.H{"error": "not found"})
		})
		api.GET("/contracts", func(c *gin.Context) { c.JSON(200, getCache().contracts) })
		api.GET("/contracts/:id", func(c *gin.Context) {
			id := c.Param("id")
			for _, ct := range getCache().contracts {
				if ct.ID == id || ct.Pubkey == id {
					c.JSON(200, ct)
					return
				}
			}
			c.JSON(404, gin.H{"error": "not found"})
		})
		api.GET("/disputes", func(c *gin.Context) { c.JSON(200, getCache().disputes) })
		api.GET("/activity", func(c *gin.Context) { c.JSON(200, getCache().activity) })
		api.GET("/refresh", func(c *gin.Context) {
			cache = nil
			data := getCache()
			c.JSON(200, gin.H{"ok": true, "last_updated": data.stats.LastUpdated})
		})
	}

	// Health check
	r.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })

	// Static files from Next.js export
	staticDir := "/app/static"
	r.Static("/_next", staticDir+"/_next")

	// Serve HTML pages - Next.js trailingSlash generates index.html in folders
	pages := []string{"/", "/agents", "/contracts", "/disputes", "/activity"}
	for _, page := range pages {
		p := page
		if p == "/" {
			r.GET(p, func(c *gin.Context) { c.File(staticDir + "/index.html") })
		} else {
			r.GET(p, func(c *gin.Context) { c.File(staticDir + p + "/index.html") })
			r.GET(p+"/", func(c *gin.Context) { c.File(staticDir + p + "/index.html") })
		}
	}

	// Fallback: serve index.html for any unmatched route (SPA)
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		// Try exact file first
		filePath := staticDir + path
		if _, err := os.Stat(filePath); err == nil {
			c.File(filePath)
			return
		}
		// Try folder/index.html
		folderPath := staticDir + path + "/index.html"
		if _, err := os.Stat(folderPath); err == nil {
			c.File(folderPath)
			return
		}
		// Fallback to root index.html
		c.File(staticDir + "/index.html")
	})

	// Trigger cache pre-load in background (non-blocking startup)
	log.Println("Pre-warming data cache in background...")
	getCache()

	log.Println("sworn-explorer (Gin + Next.js) listening on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}

// computeTrustScore calculates TrustScore server-side using whitepaper formula.
// The on-chain TrustScore field is oracle-updated and currently always 0.
func computeTrustScore(a *tp.AgentIdentity) float64 {
	now := time.Now().Unix()
	months := float64(now-a.RegisteredAt) / (30.44 * 86400)
	if months < 0 {
		months = 0
	}
	score := tp.CalculateTrustScore(a, months, 0, 0)
	return roundF(score, 2)
}
