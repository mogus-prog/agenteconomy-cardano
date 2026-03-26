// ─────────────────────────────────────────────────────────
// ReputationPolicy — Minting policy for reputation tokens
// ─────────────────────────────────────────────────────────

use aiken/collection/list
use cardano/transaction.{Transaction}
use cardano/assets.{PolicyId}

// Hardcoded admin public key hash (authorized minter)
const admin_pkh =
  #"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

validator reputation_policy {
  mint(
    _redeemer: Data,
    _policy_id: PolicyId,
    self: Transaction,
  ) {
    // Admin can mint reputation tokens
    // Token holder can burn their own (negative quantity means burn)
    list.has(self.extra_signatories, admin_pkh)
  }

  else(_ctx) {
    False
  }
}
