// ─────────────────────────────────────────────────────────
// AgentWallet — Unit Tests
// Tests type construction and utility function behaviour.
// ─────────────────────────────────────────────────────────

use aiken/interval.{between, after, before}
use types.{
  AssetId,
  WalletPolicyDatum,
  WalletRedeemer,
  SpendAgent,
  SpendOwner,
  SpendMultisig,
  UpdatePolicy,
  PauseWallet,
  UnpauseWallet,
  DrainToOwner,
  DelegateAgent,
}
use utils.{signed_by, count_signatures, time_has_passed, time_not_passed}

// ── Helper: default WalletPolicyDatum ────────────────────

fn make_wallet_datum() -> WalletPolicyDatum {
  WalletPolicyDatum {
    owner_pkh: #"aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00",
    agent_pkh: #"bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00",
    daily_limit_lovelace: 50_000_000,
    per_tx_limit_lovelace: 10_000_000,
    whitelisted_scripts: [
      #"cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00",
    ],
    whitelisted_addresses: [
      #"dd00dd00dd00dd00dd00dd00dd00dd00dd00dd00dd00dd00dd00dd00dd00dd00",
    ],
    require_owner_above: 20_000_000,
    allowed_tokens: [
      AssetId {
        policy_id: #"ee00ee00ee00ee00ee00ee00ee00ee00ee00ee00ee00ee00ee00ee00",
        asset_name: #"6955534400",
      },
    ],
    max_fee_lovelace: 500_000,
    pause_until: None,
    multisig_threshold: None,
    nonce: 0,
    policy_version: 1,
  }
}

// ── 1. WalletPolicyDatum construction ─────────────────────

test wallet_datum_constructs() {
  let datum = make_wallet_datum()
  datum.owner_pkh == #"aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00"
}

test wallet_datum_agent_pkh() {
  let datum = make_wallet_datum()
  datum.agent_pkh == #"bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00"
}

test wallet_datum_limits() {
  let datum = make_wallet_datum()
  datum.daily_limit_lovelace == 50_000_000 && datum.per_tx_limit_lovelace == 10_000_000
}

// ── 2. Redeemer variants ───────────────────────────────────

test spend_agent_redeemer() {
  let r: WalletRedeemer = SpendAgent
  r == SpendAgent
}

test spend_owner_redeemer() {
  let r: WalletRedeemer = SpendOwner
  r == SpendOwner
}

test spend_multisig_redeemer() {
  let r: WalletRedeemer = SpendMultisig
  r == SpendMultisig
}

test update_policy_redeemer() {
  let r: WalletRedeemer = UpdatePolicy
  r == UpdatePolicy
}

test pause_wallet_redeemer() {
  let r: WalletRedeemer = PauseWallet { until: 1_700_000_000_000 }
  when r is {
    PauseWallet { until } -> until == 1_700_000_000_000
    _ -> False
  }
}

test unpause_wallet_redeemer() {
  let r: WalletRedeemer = UnpauseWallet
  r == UnpauseWallet
}

test drain_to_owner_redeemer() {
  let r: WalletRedeemer = DrainToOwner
  r == DrainToOwner
}

test delegate_agent_redeemer() {
  let new_pkh = #"ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00"
  let r: WalletRedeemer = DelegateAgent { new_agent_pkh: new_pkh }
  when r is {
    DelegateAgent { new_agent_pkh } -> new_agent_pkh == new_pkh
    _ -> False
  }
}

// ── 3. Pause/unpause logic ──────────────────────────────────

test wallet_not_paused_by_default() {
  let datum = make_wallet_datum()
  datum.pause_until == None
}

test wallet_paused_with_future_timestamp() {
  let datum =
    WalletPolicyDatum {
      ..make_wallet_datum(),
      pause_until: Some(1_900_000_000_000),
    }
  datum.pause_until == Some(1_900_000_000_000)
}

// ── 4. Multisig threshold ───────────────────────────────────

test multisig_not_set_by_default() {
  let datum = make_wallet_datum()
  datum.multisig_threshold == None
}

test multisig_threshold_set() {
  let keys =
    [
      #"aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00",
      #"bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00",
      #"cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00",
    ]
  let datum =
    WalletPolicyDatum { ..make_wallet_datum(), multisig_threshold: Some((2, keys)) }
  when datum.multisig_threshold is {
    Some((threshold, _)) -> threshold == 2
    None -> False
  }
}

test count_multisig_signatures() {
  let signatories =
    [
      #"aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00",
      #"cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00",
    ]
  let required =
    [
      #"aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00",
      #"bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00",
      #"cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00",
    ]
  count_signatures(signatories, required) == 2
}

// ── 5. Nonce increment ──────────────────────────────────────

test nonce_starts_at_zero() {
  let datum = make_wallet_datum()
  datum.nonce == 0
}

test nonce_incremented() {
  let datum = WalletPolicyDatum { ..make_wallet_datum(), nonce: 1 }
  datum.nonce == make_wallet_datum().nonce + 1
}

// ── 6. Policy version ───────────────────────────────────────

test policy_version_default() {
  let datum = make_wallet_datum()
  datum.policy_version == 1
}

// ── 7. Whitelist checks ─────────────────────────────────────

test whitelisted_scripts_present() {
  let datum = make_wallet_datum()
  let expected =
    #"cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00cc00"
  when datum.whitelisted_scripts is {
    [first, ..] -> first == expected
    _ -> False
  }
}

test whitelisted_addresses_present() {
  let datum = make_wallet_datum()
  let expected =
    #"dd00dd00dd00dd00dd00dd00dd00dd00dd00dd00dd00dd00dd00dd00dd00dd00"
  when datum.whitelisted_addresses is {
    [first, ..] -> first == expected
    _ -> False
  }
}

// ── 8. Allowed tokens ───────────────────────────────────────

test allowed_tokens_present() {
  let datum = make_wallet_datum()
  when datum.allowed_tokens is {
    [first, ..] ->
      first.policy_id == #"ee00ee00ee00ee00ee00ee00ee00ee00ee00ee00ee00ee00ee00ee00"
    _ -> False
  }
}

// ── 9. Signed_by for owner vs agent ─────────────────────────

test owner_signs() {
  let owner = #"aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00"
  let sigs = [owner]
  signed_by(sigs, owner)
}

test agent_signs() {
  let agent = #"bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00bb00"
  let sigs = [agent]
  signed_by(sigs, agent)
}

test unauthorized_signer_fails() {
  let intruder = #"ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00"
  let owner = #"aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00"
  let sigs = [intruder]
  !signed_by(sigs, owner)
}
