type SellerRegulationInput = "safe_to_sell" | "clear" | "needs_permit" | "needs_review" | "illegal" | null | undefined;

export type SellerRegulationCategory = {
  label: "Safe to list" | "Requires Review" | "Cannot be listed";
  category: "safe" | "requires_review" | "blocked";
  canSubmit: boolean;
  shouldPublish: boolean;
  reviewStatus: "approved" | "pending_review" | "blocked";
  message: string;
};

export function getSellerRegulationCategory(status: SellerRegulationInput): SellerRegulationCategory {
  if (!status || status === "safe_to_sell" || status === "clear") {
    return {
      label: "Safe to list",
      category: "safe",
      canSubmit: true,
      shouldPublish: true,
      reviewStatus: "approved",
      message: "No regulated plant match was found in GrowMate's current database. You are still responsible for following applicable laws.",
    };
  }

  if (status === "needs_permit" || status === "needs_review") {
    return {
      label: "Requires Review",
      category: "requires_review",
      canSubmit: true,
      shouldPublish: false,
      reviewStatus: "pending_review",
      message: "This plant may be regulated or may require permit verification before it can be sold. Submit your listing for admin review and upload supporting documents if available.",
    };
  }

  return {
    label: "Cannot be listed",
    category: "blocked",
    canSubmit: false,
    shouldPublish: false,
    reviewStatus: "blocked",
    message: "This plant cannot be listed on GrowMate because it may be prohibited under Philippine law.",
  };
}
