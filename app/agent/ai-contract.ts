import type { PersonalContext } from "./personal-context";

export const GOVERNMENT_ROUTES = [
  "dfa_passport",
  "dfa_nearest",
  "dfa_confirm",
  "nbi_clearance",
  "nbi_pay",
  "nbi_confirm_pay",
  "sss_contributions",
  "philhealth_contributions",
  "philhealth_record",
  "philhealth_email_mdr",
  "lto_license",
  "lto_violations",
  "lto_violation_pay",
  "lto_violation_confirm_pay",
  "bir_tax",
  "postal_id",
  "postal_book",
  "etravel_register",
  "etravel_submit",
  "psa_certificate",
  "psa_certificate_submit",
  "employment_starter",
  "business_one_stop",
  "ereport",
  "ereport_submit",
  "cde_exam",
  "greeting",
  "general_government",
] as const;

export type GovernmentRoute = (typeof GOVERNMENT_ROUTES)[number];

export type ETravelDetails = {
  direction: "arrival" | "departure" | null;
  origin: string | null;
  destination: string | null;
  travelDate: string | null;
  travelTime: string | null;
  flightNumber: string | null;
};

export function hasCompleteETravelDetails(
  details: ETravelDetails
): details is {
  [Key in keyof ETravelDetails]: NonNullable<ETravelDetails[Key]>;
} {
  return Object.values(details).every(
    (value) => typeof value === "string" && value.trim().length > 0
  );
}

export function eTravelReference(details: ETravelDetails) {
  const date = details.travelDate?.replace(/\D/g, "").slice(2) || "000000";
  return `ETR-PH-${date}-742918`;
}

export type ChatHistoryItem = {
  role: "user" | "assistant";
  text: string;
};

export type AgentApiRequest = {
  message: string;
  history: ChatHistoryItem[];
  user: {
    name: string;
    firstName: string;
  };
};

export type ContextualAgentRequest = AgentApiRequest & {
  personalContext: PersonalContext;
};
