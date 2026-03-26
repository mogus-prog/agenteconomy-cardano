// ─────────────────────────────────────────────────────────
// AgentWallet Validator — Policy-locked spending for AI agents
// ─────────────────────────────────────────────────────────

use aiken/collection/list
use aiken/interval.{Finite}
use cardano/transaction.{Transaction, OutputReference, InlineDatum}
use cardano/address.{Credential}
use cardano/assets
use types.{
  WalletPolicyDatum, WalletRedeemer,
  SpendAgent, SpendOwner, SpendMultisig,
  UpdatePolicy, PauseWallet, UnpauseWallet,
  DrainToOwner, DelegateAgent,
}

fn get_lower_bound(tx: Transaction) -> Int {
  when tx.validity_range.lower_bound.bound_type is {
    Finite(t) -> t
    _ -> 0
  }
}

fn is_paused(datum: WalletPolicyDatum, tx: Transaction) -> Bool {
  when datum.pause_until is {
    Some(until) -> {
      let now = get_lower_bound(tx)
      now < until
    }
    None -> False
  }
}

fn get_continuing_datum(
  tx: Transaction,
  own_ref: OutputReference,
) -> WalletPolicyDatum {
  expect Some(own_input) =
    list.find(tx.inputs, fn(inp) { inp.output_reference == own_ref })
  let own_address = own_input.output.address
  expect Some(cont) =
    list.find(tx.outputs, fn(out) { out.address == own_address })
  expect InlineDatum(raw) = cont.datum
  expect new_datum: WalletPolicyDatum = raw
  new_datum
}

fn output_preserves_value(
  own_ref: OutputReference,
  tx: Transaction,
) -> Bool {
  expect Some(own_input) =
    list.find(tx.inputs, fn(inp) { inp.output_reference == own_ref })
  let own_address = own_input.output.address
  let input_lovelace = assets.lovelace_of(own_input.output.value)
  expect Some(continuing) =
    list.find(tx.outputs, fn(out) { out.address == own_address })
  assets.lovelace_of(continuing.value) >= input_lovelace
}

fn total_outflow_to_others(
  tx: Transaction,
  own_ref: OutputReference,
) -> Int {
  expect Some(own_input) =
    list.find(tx.inputs, fn(inp) { inp.output_reference == own_ref })
  let own_address = own_input.output.address
  list.foldl(
    tx.outputs,
    0,
    fn(output, acc) {
      if output.address != own_address {
        acc + assets.lovelace_of(output.value)
      } else {
        acc
      }
    },
  )
}

fn all_recipients_whitelisted(
  tx: Transaction,
  own_ref: OutputReference,
  datum: WalletPolicyDatum,
) -> Bool {
  expect Some(own_input) =
    list.find(tx.inputs, fn(inp) { inp.output_reference == own_ref })
  let own_address = own_input.output.address
  list.all(
    tx.outputs,
    fn(output) {
      if output.address == own_address {
        True
      } else {
        when output.address.payment_credential is {
          Credential.VerificationKey(pkh) ->
            list.has(datum.whitelisted_addresses, pkh) || list.has(
              datum.whitelisted_scripts,
              pkh,
            )
          Credential.Script(sh) ->
            list.has(datum.whitelisted_scripts, sh)
        }
      }
    },
  )
}

fn count_multisig(
  signatories: List<ByteArray>,
  required_keys: List<ByteArray>,
) -> Int {
  list.foldl(
    required_keys,
    0,
    fn(key, acc) {
      if list.has(signatories, key) {
        acc + 1
      } else {
        acc
      }
    },
  )
}

validator agent_wallet {
  spend(
    datum_opt: Option<WalletPolicyDatum>,
    redeemer: WalletRedeemer,
    own_ref: OutputReference,
    self: Transaction,
  ) {
    expect Some(datum) = datum_opt
    when redeemer is {
      SpendAgent -> {
        // Must not be paused
        expect False = is_paused(datum, self)
        // Agent must sign
        expect True = list.has(self.extra_signatories, datum.agent_pkh)
        // Per-tx limit check
        let outflow = total_outflow_to_others(self, own_ref)
        expect True = outflow <= datum.per_tx_limit_lovelace
        // All recipients must be whitelisted
        expect True = all_recipients_whitelisted(self, own_ref, datum)
        // Nonce must increment in continuing output
        let new_datum = get_continuing_datum(self, own_ref)
        expect True = new_datum.nonce == datum.nonce + 1
        True
      }
      SpendOwner -> {
        // Owner must sign — full control, no policy limits
        expect True = list.has(self.extra_signatories, datum.owner_pkh)
        // Nonce must increment
        let new_datum = get_continuing_datum(self, own_ref)
        expect True = new_datum.nonce == datum.nonce + 1
        True
      }
      SpendMultisig -> {
        // Multisig threshold must be set
        expect Some((threshold, keys)) = datum.multisig_threshold
        // Count matching signatures
        let sig_count = count_multisig(self.extra_signatories, keys)
        expect True = sig_count >= threshold
        // Nonce must increment
        let new_datum = get_continuing_datum(self, own_ref)
        expect True = new_datum.nonce == datum.nonce + 1
        True
      }
      UpdatePolicy -> {
        // Owner must sign
        expect True = list.has(self.extra_signatories, datum.owner_pkh)
        // Output must preserve value
        expect True = output_preserves_value(own_ref, self)
        // Nonce must increment
        let new_datum = get_continuing_datum(self, own_ref)
        expect True = new_datum.nonce == datum.nonce + 1
        True
      }
      PauseWallet { until } -> {
        // Owner must sign
        expect True = list.has(self.extra_signatories, datum.owner_pkh)
        // Output must preserve value
        expect True = output_preserves_value(own_ref, self)
        // New datum must have pause_until set
        let new_datum = get_continuing_datum(self, own_ref)
        expect Some(stored_until) = new_datum.pause_until
        expect True = stored_until == until
        expect True = new_datum.nonce == datum.nonce + 1
        True
      }
      UnpauseWallet -> {
        // Owner must sign
        expect True = list.has(self.extra_signatories, datum.owner_pkh)
        // Output must preserve value
        expect True = output_preserves_value(own_ref, self)
        // New datum must have pause_until cleared
        let new_datum = get_continuing_datum(self, own_ref)
        expect None = new_datum.pause_until
        expect True = new_datum.nonce == datum.nonce + 1
        True
      }
      DrainToOwner -> {
        // Owner must sign
        expect True = list.has(self.extra_signatories, datum.owner_pkh)
        // All funds go to owner — verified off-chain that outputs go to owner_pkh address
        True
      }
      DelegateAgent { new_agent_pkh } -> {
        // Owner must sign
        expect True = list.has(self.extra_signatories, datum.owner_pkh)
        // Output must preserve value
        expect True = output_preserves_value(own_ref, self)
        // New datum must have updated agent_pkh
        let new_datum = get_continuing_datum(self, own_ref)
        expect True = new_datum.agent_pkh == new_agent_pkh
        expect True = new_datum.nonce == datum.nonce + 1
        // All other fields unchanged
        expect True = new_datum.owner_pkh == datum.owner_pkh
        expect True =
          new_datum.daily_limit_lovelace == datum.daily_limit_lovelace
        expect True =
          new_datum.per_tx_limit_lovelace == datum.per_tx_limit_lovelace
        True
      }
    }
  }

  else(_ctx) {
    False
  }
}
