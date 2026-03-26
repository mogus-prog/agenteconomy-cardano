/**
 * Decode raw redeemer data to identify which action was taken.
 * Constructor index maps to BountyRedeemer variant order from types.ak:
 *   0=PostBounty, 1=ClaimBounty, 2=ExtendClaim, 3=SubmitWork,
 *   4=VerifyAndPay, 5=DisputeWork, 6=ResolveDispute,
 *   7=RefundPoster, 8=CancelBounty, 9=UpdateBounty
 */

export interface DecodedRedeemer {
  constructorIndex: number;
  action: string;
  fields: unknown[];
}

const ACTION_NAMES: Record<number, string> = {
  0: "PostBounty",
  1: "ClaimBounty",
  2: "ExtendClaim",
  3: "SubmitWork",
  4: "VerifyAndPay",
  5: "DisputeWork",
  6: "ResolveDispute",
  7: "RefundPoster",
  8: "CancelBounty",
  9: "UpdateBounty",
};

export function decodeRedeemer(rawRedeemer: unknown): DecodedRedeemer {
  const data = rawRedeemer as Record<string, unknown>;
  const constructorIndex = typeof data?.["constructor"] === "number"
    ? data["constructor"]
    : 0;
  const fields = Array.isArray(data?.["fields"]) ? data["fields"] : [];

  return {
    constructorIndex,
    action: ACTION_NAMES[constructorIndex] ?? `Unknown(${constructorIndex})`,
    fields,
  };
}
