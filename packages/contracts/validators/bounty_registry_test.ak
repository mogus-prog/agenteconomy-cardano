// ─────────────────────────────────────────────────────────
// BountyRegistry — Unit Tests
// Tests type construction and utility function behaviour.
// Full ScriptContext is not mocked; validator logic is covered
// by pure-function and type-construction tests only.
// ─────────────────────────────────────────────────────────

use aiken/interval.{between, after, before}
use types.{
  AssetId,
  BountyCategory,
  BountyDatum,
  BountyRedeemer,
  BountyStatus,
  Claimed,
  ClaimBounty,
  CancelBounty,
  CodeGen,
  Content,
  Completed,
  DataExtraction,
  Difficulty,
  DisputeWork,
  Disputed,
  Easy,
  Expert,
  ExtendClaim,
  Hard,
  HumanReview,
  JudgeAgent,
  Medium,
  Moderation,
  OnChain,
  Open,
  OracleSigned,
  Optimistic,
  PostBounty,
  Refunded,
  RefundPoster,
  Research,
  ResolveDispute,
  SubmitWork,
  Translation,
  UpdateBounty,
  VerificationType,
  VerifyAndPay,
  WorkSubmitted,
}
use utils.{
  count_signatures,
  signed_by,
  time_has_passed,
  time_not_passed,
}

// ──────────────────────────────────────────────────────────
// Helper: build a minimal valid BountyDatum for reuse
// ──────────────────────────────────────────────────────────

fn make_datum(status: BountyStatus) -> BountyDatum {
  BountyDatum {
    bounty_id: #"aabbcc",
    version: 1,
    poster: #"deadbeef",
    title: #"5465737420426f756e7479",
    description_ipfs: #"516d54657374",
    category: CodeGen,
    difficulty: Medium,
    reward_lovelace: 10_000_000,
    reward_token: None,
    deposit_lovelace: 2_000_000,
    deadline: 1_700_000_000_000,
    claim_window_ms: 86_400_000,
    verification: HumanReview,
    dispute_window_ms: 172_800_000,
    result_schema_ipfs: None,
    allowed_agents: None,
    min_reputation_score: None,
    status: status,
    created_at: 1_699_000_000_000,
    metadata_hash: #"cafebabe",
  }
}

// ──────────────────────────────────────────────────────────
// 1. BountyDatum construction — Open status
// ──────────────────────────────────────────────────────────

test bounty_datum_open_constructs() {
  let datum = make_datum(Open)
  and {
    datum.bounty_id == #"aabbcc",
    datum.version == 1,
    datum.poster == #"deadbeef",
    datum.reward_lovelace == 10_000_000,
    datum.deposit_lovelace == 2_000_000,
    datum.status == Open,
  }
}

// ──────────────────────────────────────────────────────────
// 2. BountyDatum with optional reward token present
// ──────────────────────────────────────────────────────────

test bounty_datum_with_reward_token() {
  let token = AssetId {
    policy_id: #"abcdef",
    asset_name: #"41474e54",
  }
  let datum =
    BountyDatum {
      bounty_id: #"0001",
      version: 1,
      poster: #"1111",
      title: #"5469746c65",
      description_ipfs: #"516d58",
      category: Research,
      difficulty: Hard,
      reward_lovelace: 5_000_000,
      reward_token: Some(token),
      deposit_lovelace: 1_000_000,
      deadline: 1_800_000_000_000,
      claim_window_ms: 3_600_000,
      verification: Optimistic { dispute_window_ms: 86_400_000 },
      dispute_window_ms: 86_400_000,
      result_schema_ipfs: Some(#"516d5363"),
      allowed_agents: None,
      min_reputation_score: Some(500),
      status: Open,
      created_at: 1_699_500_000_000,
      metadata_hash: #"facade",
    }
  and {
    datum.reward_token == Some(token),
    datum.min_reputation_score == Some(500),
    datum.result_schema_ipfs == Some(#"516d5363"),
  }
}

// ──────────────────────────────────────────────────────────
// 3. BountyStatus — Claimed variant carries agent + timestamp
// ──────────────────────────────────────────────────────────

test bounty_status_claimed() {
  let agent_pkh = #"a1b2c3"
  let ts = 1_699_100_000_000
  let status = Claimed { agent: agent_pkh, claimed_at: ts }
  when status is {
    Claimed { agent, claimed_at } ->
      and {
        agent == agent_pkh,
        claimed_at == ts,
      }
    _ -> False
  }
}

// ──────────────────────────────────────────────────────────
// 4. BountyStatus — WorkSubmitted carries IPFS CID + timestamp
// ──────────────────────────────────────────────────────────

test bounty_status_work_submitted() {
  let cid = #"516d576f726b"
  let ts = 1_699_200_000_000
  let status = WorkSubmitted { result_ipfs: cid, submitted_at: ts }
  when status is {
    WorkSubmitted { result_ipfs, submitted_at } ->
      and {
        result_ipfs == cid,
        submitted_at == ts,
      }
    _ -> False
  }
}

// ──────────────────────────────────────────────────────────
// 5. BountyStatus — Completed, Disputed, Refunded variants
// ──────────────────────────────────────────────────────────

test bounty_status_completed_disputed_refunded() {
  let completed =
    Completed { result_ipfs: #"516d43", completed_at: 1_699_300_000_000 }
  let is_completed =
    when completed is {
      Completed { .. } -> True
      _ -> False
    }
  let is_disputed =
    when Disputed is {
      Disputed -> True
      _ -> False
    }
  let is_refunded =
    when Refunded is {
      Refunded -> True
      _ -> False
    }
  and {
    is_completed,
    is_disputed,
    is_refunded,
  }
}

// ──────────────────────────────────────────────────────────
// 6. BountyRedeemer — all variants can be constructed
// ──────────────────────────────────────────────────────────

test bounty_redeemer_variants_construct() {
  let _post = PostBounty
  let _claim = ClaimBounty { agent_address: #"1234" }
  let _extend = ExtendClaim { new_claim_window_ms: 7_200_000 }
  let _submit = SubmitWork { result_ipfs: #"516d" }
  let _verify = VerifyAndPay
  let _dispute = DisputeWork
  let _resolve = ResolveDispute { winner: #"abcd" }
  let _refund = RefundPoster
  let _cancel = CancelBounty
  let _update =
    UpdateBounty {
      new_title: #"4e657754",
      new_description_ipfs: #"516d4e",
    }
  True
}

// ──────────────────────────────────────────────────────────
// 7. VerificationType variants
// ──────────────────────────────────────────────────────────

test verification_type_variants() {
  let opt = Optimistic { dispute_window_ms: 172_800_000 }
  let human = HumanReview
  let oracle = OracleSigned { oracle_pub_key: #"0cafe0" }
  let judge = JudgeAgent
  let opt_ok =
    when opt is {
      Optimistic { dispute_window_ms } -> dispute_window_ms == 172_800_000
      _ -> False
    }
  let human_ok =
    when human is {
      HumanReview -> True
      _ -> False
    }
  let oracle_ok =
    when oracle is {
      OracleSigned { oracle_pub_key } -> oracle_pub_key == #"0cafe0"
      _ -> False
    }
  let judge_ok =
    when judge is {
      JudgeAgent -> True
      _ -> False
    }
  and {
    opt_ok,
    human_ok,
    oracle_ok,
    judge_ok,
  }
}

// ──────────────────────────────────────────────────────────
// 8. utils.signed_by — present and absent key
// ──────────────────────────────────────────────────────────

test signed_by_present() {
  let sigs = [#"aabb", #"ccdd", #"eeff"]
  signed_by(sigs, #"ccdd")
}

test signed_by_absent() {
  let sigs = [#"aabb", #"ccdd"]
  !signed_by(sigs, #"1234")
}

test signed_by_empty_list() {
  !signed_by([], #"aabb")
}

// ──────────────────────────────────────────────────────────
// 9. utils.time_has_passed — lower bound strictly after timestamp
// ──────────────────────────────────────────────────────────

test time_has_passed_true() {
  // validity window lower bound = 1000, deadline = 500 → lower > deadline ✓
  let range =
    between(1000, 2000)
  time_has_passed(range, 500)
}

test time_has_passed_false_equal() {
  // lower bound equals timestamp — NOT strictly after, should be False
  let range = between(500, 1000)
  !time_has_passed(range, 500)
}

test time_has_passed_false_before() {
  // lower bound is before timestamp
  let range = between(100, 400)
  !time_has_passed(range, 500)
}

test time_has_passed_negative_infinity_lower() {
  // NegativeInfinity lower bound → False (not Finite)
  let range = before(2000)
  !time_has_passed(range, 500)
}

// ──────────────────────────────────────────────────────────
// 10. utils.time_not_passed — upper bound strictly before timestamp
// ──────────────────────────────────────────────────────────

test time_not_passed_true() {
  // upper bound = 400, deadline = 500 → upper < deadline ✓
  let range = between(100, 400)
  time_not_passed(range, 500)
}

test time_not_passed_false_equal() {
  // upper bound equals timestamp — NOT strictly before, should be False
  let range = between(100, 500)
  !time_not_passed(range, 500)
}

test time_not_passed_false_after() {
  // upper bound is after timestamp
  let range = between(100, 600)
  !time_not_passed(range, 500)
}

test time_not_passed_positive_infinity_upper() {
  // PositiveInfinity upper bound → False (not Finite)
  let range = after(100)
  !time_not_passed(range, 500)
}

// ──────────────────────────────────────────────────────────
// 11. utils.count_signatures — partial and full match
// ──────────────────────────────────────────────────────────

test count_signatures_all_present() {
  let signatories = [#"aa", #"bb", #"cc"]
  let required = [#"aa", #"bb", #"cc"]
  count_signatures(signatories, required) == 3
}

test count_signatures_none_present() {
  let signatories = [#"11", #"22"]
  let required = [#"aa", #"bb", #"cc"]
  count_signatures(signatories, required) == 0
}

test count_signatures_partial() {
  let signatories = [#"aa", #"cc", #"ff"]
  let required = [#"aa", #"bb", #"cc"]
  count_signatures(signatories, required) == 2
}

test count_signatures_empty_signatories() {
  let required = [#"aa", #"bb"]
  count_signatures([], required) == 0
}

test count_signatures_empty_required() {
  let signatories = [#"aa", #"bb"]
  count_signatures(signatories, []) == 0
}

// ──────────────────────────────────────────────────────────
// 12. BountyCategory and Difficulty — all variants accessible
// ──────────────────────────────────────────────────────────

test all_categories_accessible() {
  let cats: List<BountyCategory> =
    [DataExtraction, CodeGen, Research, Content, OnChain, Translation, Moderation]
  // Verify 7 variants exist by checking list length
  let len =
    cats
      |> fn(l) {
           when l is {
             [] -> 0
             [_, ..rest] ->
               when rest is {
                 [] -> 1
                 [_, ..r2] ->
                   when r2 is {
                     [] -> 2
                     [_, ..r3] ->
                       when r3 is {
                         [] -> 3
                         [_, ..r4] ->
                           when r4 is {
                             [] -> 4
                             [_, ..r5] ->
                               when r5 is {
                                 [] -> 5
                                 [_, ..r6] ->
                                   when r6 is {
                                     [] -> 6
                                     [_, ..] -> 7
                                   }
                               }
                           }
                       }
                   }
               }
           }
         }
  len == 7
}

test all_difficulties_accessible() {
  let datum_easy = make_datum(Open)
  let datum_hard =
    BountyDatum { ..datum_easy, difficulty: Hard }
  let datum_expert =
    BountyDatum { ..datum_hard, difficulty: Expert }
  and {
    datum_easy.difficulty == Easy || datum_easy.difficulty == Medium,
    datum_hard.difficulty == Hard,
    datum_expert.difficulty == Expert,
  }
}

// ──────────────────────────────────────────────────────────
// 13. BountyDatum — allowed_agents whitelist present
// ──────────────────────────────────────────────────────────

test bounty_datum_with_allowed_agents() {
  let agents = [#"a0a0a1", #"a0a0a2"]
  let datum =
    BountyDatum { ..make_datum(Open), allowed_agents: Some(agents) }
  datum.allowed_agents == Some([#"a0a0a1", #"a0a0a2"])
}

// ──────────────────────────────────────────────────────────
// 14. Boundary timestamp: time_has_passed one ms off boundary
// ──────────────────────────────────────────────────────────

test time_has_passed_boundary_one_ms_after() {
  // lower = deadline + 1 → should pass
  let deadline = 1_000_000
  let range = between(deadline + 1, deadline + 10_000)
  time_has_passed(range, deadline)
}

test time_not_passed_boundary_one_ms_before() {
  // upper = deadline - 1 → should pass
  let deadline = 1_000_000
  let range = between(deadline - 10_000, deadline - 1)
  time_not_passed(range, deadline)
}

// ──────────────────────────────────────────────────────────
// 15. OracleSigned verification stored on datum
// ──────────────────────────────────────────────────────────

test datum_with_oracle_verification() {
  let oracle_key = #"0a4c1e"
  let datum =
    BountyDatum {
      ..make_datum(Open),
      verification: OracleSigned { oracle_pub_key: oracle_key },
    }
  when datum.verification is {
    OracleSigned { oracle_pub_key } -> oracle_pub_key == oracle_key
    _ -> False
  }
}
