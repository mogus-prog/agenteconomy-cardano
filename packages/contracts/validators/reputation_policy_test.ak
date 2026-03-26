// ─────────────────────────────────────────────────────────
// ReputationPolicy — Unit Tests
// ─────────────────────────────────────────────────────────

use types.{
  ReputationDatum,
}
use utils.{signed_by}

// ── Helper: default ReputationDatum ────────────────────────

fn make_rep_datum() -> ReputationDatum {
  ReputationDatum {
    agent_pkh: #"aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00",
    total_completed: 10,
    total_earned_lovelace: 50_000_000,
    total_disputed: 1,
    success_rate_bps: 9000,
    avg_completion_ms: 120_000,
    category_scores: [(#"01", 8500), (#"02", 9200)],
    last_active: 1_700_000_000_000,
    badge_tokens: [#"ba01ba01ba01ba01ba01ba01ba01ba01ba01ba01ba01ba01ba01ba01"],
    registered_at: 1_690_000_000_000,
  }
}

// ── 1. ReputationDatum construction ─────────────────────────

test reputation_datum_constructs() {
  let datum = make_rep_datum()
  datum.total_completed == 10
}

test reputation_datum_agent_pkh() {
  let datum = make_rep_datum()
  datum.agent_pkh == #"aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00aa00"
}

test reputation_datum_earned() {
  let datum = make_rep_datum()
  datum.total_earned_lovelace == 50_000_000
}

// ── 2. Success rate ─────────────────────────────────────────

test success_rate_bps_correct() {
  let datum = make_rep_datum()
  datum.success_rate_bps == 9000
}

test success_rate_perfect() {
  let datum = ReputationDatum { ..make_rep_datum(), success_rate_bps: 10000 }
  datum.success_rate_bps == 10000
}

test success_rate_zero() {
  let datum = ReputationDatum { ..make_rep_datum(), success_rate_bps: 0 }
  datum.success_rate_bps == 0
}

// ── 3. Category scores ──────────────────────────────────────

test category_scores_present() {
  let datum = make_rep_datum()
  when datum.category_scores is {
    [(cat, score), ..] -> cat == #"01" && score == 8500
    _ -> False
  }
}

test category_scores_empty() {
  let datum = ReputationDatum { ..make_rep_datum(), category_scores: [] }
  datum.category_scores == []
}

// ── 4. Badge tokens ─────────────────────────────────────────

test badge_tokens_present() {
  let datum = make_rep_datum()
  when datum.badge_tokens is {
    [first, ..] ->
      first == #"ba01ba01ba01ba01ba01ba01ba01ba01ba01ba01ba01ba01ba01ba01"
    _ -> False
  }
}

test badge_tokens_empty() {
  let datum = ReputationDatum { ..make_rep_datum(), badge_tokens: [] }
  datum.badge_tokens == []
}

// ── 5. Timestamps ───────────────────────────────────────────

test last_active_correct() {
  let datum = make_rep_datum()
  datum.last_active == 1_700_000_000_000
}

test registered_at_correct() {
  let datum = make_rep_datum()
  datum.registered_at == 1_690_000_000_000
}

// ── 6. Admin signature check (for minting) ──────────────────

test admin_can_sign() {
  let admin =
    #"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  let sigs = [admin]
  signed_by(sigs, admin)
}

test non_admin_cannot_sign() {
  let admin =
    #"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  let non_admin =
    #"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  let sigs = [non_admin]
  !signed_by(sigs, admin)
}

// ── 7. Dispute tracking ─────────────────────────────────────

test disputes_tracked() {
  let datum = make_rep_datum()
  datum.total_disputed == 1
}

test zero_disputes() {
  let datum = ReputationDatum { ..make_rep_datum(), total_disputed: 0 }
  datum.total_disputed == 0
}

// ── 8. Avg completion time ──────────────────────────────────

test avg_completion_ms_correct() {
  let datum = make_rep_datum()
  datum.avg_completion_ms == 120_000
}
