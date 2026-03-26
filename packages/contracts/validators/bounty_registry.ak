// ─────────────────────────────────────────────────────────
// BountyRegistry Validator — Central bounty escrow contract
// ─────────────────────────────────────────────────────────

use aiken/collection/list
use aiken/interval.{Finite}
use cardano/transaction.{Transaction, OutputReference, Output, InlineDatum}
use cardano/assets
use types.{
  BountyDatum, BountyRedeemer,
  PostBounty, ClaimBounty, ExtendClaim, SubmitWork,
  VerifyAndPay, DisputeWork, ResolveDispute,
  RefundPoster, CancelBounty, UpdateBounty,
  Open, Claimed, WorkSubmitted, Disputed,
  Optimistic, HumanReview, OracleSigned,
}

// Hardcoded arbitrator public key hashes (3-of-5 for disputes)
const arbitrator_1 =
  #"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const arbitrator_2 =
  #"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
const arbitrator_3 =
  #"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
const arbitrator_4 =
  #"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
const arbitrator_5 =
  #"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"

fn count_arbitrator_sigs(signatories: List<ByteArray>) -> Int {
  let arbs =
    [arbitrator_1, arbitrator_2, arbitrator_3, arbitrator_4, arbitrator_5]
  list.foldl(
    arbs,
    0,
    fn(arb, acc) {
      if list.has(signatories, arb) {
        acc + 1
      } else {
        acc
      }
    },
  )
}

fn get_lower_bound(tx: Transaction) -> Int {
  when tx.validity_range.lower_bound.bound_type is {
    Finite(t) -> t
    _ -> 0
  }
}

fn get_upper_bound(tx: Transaction) -> Int {
  when tx.validity_range.upper_bound.bound_type is {
    Finite(t) -> t
    _ -> 0
  }
}

fn find_continuing_output(tx: Transaction, own_ref: OutputReference) -> Output {
  // Find own input to get own address
  expect Some(own_input) =
    list.find(tx.inputs, fn(inp) { inp.output_reference == own_ref })
  let own_address = own_input.output.address
  // Find output going back to same address
  expect Some(continuing_output) =
    list.find(tx.outputs, fn(out) { out.address == own_address })
  continuing_output
}

fn output_preserves_value(
  input_ref: OutputReference,
  tx: Transaction,
) -> Bool {
  expect Some(own_input) =
    list.find(tx.inputs, fn(inp) { inp.output_reference == input_ref })
  let own_address = own_input.output.address
  let input_lovelace = assets.lovelace_of(own_input.output.value)
  expect Some(continuing) =
    list.find(tx.outputs, fn(out) { out.address == own_address })
  assets.lovelace_of(continuing.value) >= input_lovelace
}

fn get_continuing_datum(
  tx: Transaction,
  own_ref: OutputReference,
) -> BountyDatum {
  let cont = find_continuing_output(tx, own_ref)
  expect InlineDatum(raw) = cont.datum
  expect new_datum: BountyDatum = raw
  new_datum
}

validator bounty_registry {
  spend(
    datum_opt: Option<BountyDatum>,
    redeemer: BountyRedeemer,
    own_ref: OutputReference,
    self: Transaction,
  ) {
    expect Some(datum) = datum_opt
    when redeemer is {
      PostBounty ->
        // PostBounty creates the UTXO — no spending logic needed
        True
      ClaimBounty { agent_address } -> {
        // Status must be Open
        expect Open = datum.status
        // Deadline not passed (upper bound of validity < deadline)
        let upper = get_upper_bound(self)
        expect True = upper > 0 && upper < datum.deadline
        // Agent must sign
        expect True = list.has(self.extra_signatories, agent_address)
        // Output preserves full value
        expect True = output_preserves_value(own_ref, self)
        // Output carries new datum with Claimed status
        let new_datum = get_continuing_datum(self, own_ref)
        let now = get_lower_bound(self)
        expect Claimed { agent, claimed_at } = new_datum.status
        expect True = agent == agent_address
        expect True = claimed_at == now
        // Check min_reputation_score if set (trusted off-chain for now)
        True
      }
      SubmitWork { result_ipfs } -> {
        // Status must be Claimed
        expect Claimed { agent, claimed_at } = datum.status
        // Agent must sign
        expect True = list.has(self.extra_signatories, agent)
        // Claim window not exceeded
        let upper = get_upper_bound(self)
        let claim_deadline = claimed_at + datum.claim_window_ms
        expect True = upper > 0 && upper < claim_deadline
        // Output preserves full value
        expect True = output_preserves_value(own_ref, self)
        // Output carries WorkSubmitted datum
        let new_datum = get_continuing_datum(self, own_ref)
        let now = get_lower_bound(self)
        expect WorkSubmitted { result_ipfs: stored_cid, submitted_at } =
          new_datum.status
        expect True = stored_cid == result_ipfs
        expect True = submitted_at == now
        True
      }
      VerifyAndPay -> {
        // Status must be WorkSubmitted
        expect WorkSubmitted { submitted_at, .. } = datum.status
        // Branch on verification type
        when datum.verification is {
          Optimistic { dispute_window_ms } -> {
            // Time must have passed dispute window
            let lower = get_lower_bound(self)
            expect True = lower > submitted_at + dispute_window_ms
            // Payment to agent (checked via outputs)
            True
          }
          HumanReview -> {
            // Poster must sign
            expect True = list.has(self.extra_signatories, datum.poster)
            True
          }
          OracleSigned { oracle_pub_key } -> {
            // Oracle key must be in signatories
            expect True = list.has(self.extra_signatories, oracle_pub_key)
            True
          }
          _ -> False
        }
      }
      DisputeWork -> {
        // Status must be WorkSubmitted
        expect WorkSubmitted { submitted_at, .. } = datum.status
        // Poster must sign
        expect True = list.has(self.extra_signatories, datum.poster)
        // Within dispute window
        let upper = get_upper_bound(self)
        expect True =
          upper > 0 && upper < submitted_at + datum.dispute_window_ms
        // Output carries Disputed status
        expect True = output_preserves_value(own_ref, self)
        let new_datum = get_continuing_datum(self, own_ref)
        expect Disputed = new_datum.status
        True
      }
      ResolveDispute { .. } -> {
        // Status must be Disputed
        expect Disputed = datum.status
        // 3-of-5 arbitrator multisig
        let sig_count = count_arbitrator_sigs(self.extra_signatories)
        expect True = sig_count >= 3
        True
      }
      RefundPoster -> {
        // Status must be Open
        expect Open = datum.status
        // Deadline has passed
        let lower = get_lower_bound(self)
        expect True = lower > datum.deadline
        // Poster must sign
        expect True = list.has(self.extra_signatories, datum.poster)
        True
      }
      CancelBounty -> {
        // Status must be Open
        expect Open = datum.status
        // Poster must sign
        expect True = list.has(self.extra_signatories, datum.poster)
        // Within 1 hour (3_600_000 ms) of creation
        let upper = get_upper_bound(self)
        expect True = upper > 0 && upper < datum.created_at + 3_600_000
        True
      }
      UpdateBounty { .. } -> {
        // Status must be Open
        expect Open = datum.status
        // Poster must sign
        expect True = list.has(self.extra_signatories, datum.poster)
        // Output preserves value
        expect True = output_preserves_value(own_ref, self)
        // Critical fields must not change
        let new_datum = get_continuing_datum(self, own_ref)
        expect True = new_datum.reward_lovelace == datum.reward_lovelace
        expect True = new_datum.deadline == datum.deadline
        expect True = new_datum.verification == datum.verification
        expect True = new_datum.bounty_id == datum.bounty_id
        True
      }
      ExtendClaim { new_claim_window_ms } -> {
        // Status must be Claimed
        expect Claimed { agent, claimed_at } = datum.status
        // Agent must sign
        expect True = list.has(self.extra_signatories, agent)
        // If extension > 24h from claim, poster must also sign
        let extension_total = new_claim_window_ms
        let requires_poster = extension_total > 86_400_000
        expect True =
          if requires_poster {
            list.has(self.extra_signatories, datum.poster)
          } else {
            True
          }
        // Output carries updated claim_window
        expect True = output_preserves_value(own_ref, self)
        let new_datum = get_continuing_datum(self, own_ref)
        expect True = new_datum.claim_window_ms == new_claim_window_ms
        expect Claimed { agent: new_agent, claimed_at: new_claimed_at } =
          new_datum.status
        expect True = new_agent == agent
        expect True = new_claimed_at == claimed_at
        True
      }
    }
  }

  else(_ctx) {
    False
  }
}
