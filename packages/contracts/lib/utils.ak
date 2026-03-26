// ─────────────────────────────────────────────────────────
// BotBrained.ai on Cardano — Utility Functions
// ─────────────────────────────────────────────────────────

use aiken/collection/list
use aiken/interval.{Finite}
use cardano/transaction.{Output, Input, InlineDatum, ValidityRange}
use cardano/address.{Address, Credential}
use cardano/assets

/// Check if any output carries the given inline datum
pub fn check_output_has_datum(outputs: List<Output>, target_datum: Data) -> Bool {
  list.any(
    outputs,
    fn(output) {
      when output.datum is {
        InlineDatum(d) -> d == target_datum
        _ -> False
      }
    },
  )
}

/// Check if any output pays at least min_lovelace to recipient address
pub fn check_payment_to(
  outputs: List<Output>,
  recipient: Address,
  min_lovelace: Int,
) -> Bool {
  list.any(
    outputs,
    fn(output) {
      output.address == recipient && assets.lovelace_of(output.value) >= min_lovelace
    },
  )
}

/// Sum lovelace of all inputs from a specific address being consumed
pub fn total_outflow(inputs: List<Input>, own_address: Address) -> Int {
  list.foldl(
    inputs,
    0,
    fn(input, acc) {
      if input.output.address == own_address {
        acc + assets.lovelace_of(input.output.value)
      } else {
        acc
      }
    },
  )
}

/// Check that every non-change output goes to a whitelisted address
pub fn all_outputs_to_whitelist(
  outputs: List<Output>,
  whitelist: List<ByteArray>,
  own_address: Address,
) -> Bool {
  list.all(
    outputs,
    fn(output) {
      if output.address == own_address {
        True
      } else {
        when output.address.payment_credential is {
          Credential.VerificationKey(pkh) ->
            list.has(whitelist, pkh)
          Credential.Script(sh) ->
            list.has(whitelist, sh)
        }
      }
    },
  )
}

/// Check if a public key hash is in the signatories list
pub fn signed_by(signatories: List<ByteArray>, pkh: ByteArray) -> Bool {
  list.has(signatories, pkh)
}

/// Check that transaction lower_bound is after the given timestamp
pub fn time_has_passed(validity_range: ValidityRange, timestamp: Int) -> Bool {
  when validity_range.lower_bound.bound_type is {
    Finite(lower) -> lower > timestamp
    _ -> False
  }
}

/// Check that transaction upper_bound is before the given timestamp
pub fn time_not_passed(validity_range: ValidityRange, timestamp: Int) -> Bool {
  when validity_range.upper_bound.bound_type is {
    Finite(upper) -> upper < timestamp
    _ -> False
  }
}

/// Get current time from the validity range lower bound
pub fn get_lower_bound(validity_range: ValidityRange) -> Int {
  when validity_range.lower_bound.bound_type is {
    Finite(t) -> t
    _ -> 0
  }
}

/// Count how many signatures from a list of required keys are present
pub fn count_signatures(
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

/// Get lovelace value from an output
pub fn output_lovelace(output: Output) -> Int {
  assets.lovelace_of(output.value)
}
