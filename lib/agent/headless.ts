import "server-only";

import {
  hasCompleteETravelDetails,
  type AgentApiRequest,
  type ETravelDetails,
  type GovernmentRoute,
} from "@/app/agent/ai-contract";
import {
  agentPlan,
  buildETravelPlan,
  step,
  type Card,
  type User,
} from "@/app/agent/brain";
import { PRINT_FILE_PREVIEWS } from "@/app/agent/forms";
import { PERSONAL_CONTEXT } from "@/app/agent/personal-context";
import { AiRouterError, routeGovernmentRequest } from "@/lib/ai/egov-router";

const MAX_MESSAGE_LENGTH = 4_000;
const MAX_HISTORY_ITEMS = 10;

const SERVICE_PROMPTS: Partial<Record<GovernmentRoute, string>> = {
  dfa_passport: "Renew my passport",
  dfa_nearest: "Find the nearest DFA passport office",
  dfa_confirm: "Confirm the passport appointment slot",
  nbi_clearance: "Get an NBI clearance",
  nbi_pay: "Open eGovPay checkout for my NBI clearance",
  nbi_confirm_pay: "Confirm eGovPay payment for my NBI clearance",
  sss_contributions: "Check my SSS contributions",
  philhealth_contributions: "Check my PhilHealth premium contributions",
  philhealth_record: "Show my PhilHealth member record",
  philhealth_email_mdr: "Email my certified PhilHealth MDR",
  lto_license: "Renew my driver's license",
  lto_violations: "Check my LTO violations",
  lto_violation_pay: "Proceed to payment for my LTO OGA violation",
  lto_violation_confirm_pay:
    "Confirm eGovPay payment for my LTO OGA violation",
  bir_tax: "Check my BIR tax record",
  postal_id: "Apply for a Postal ID",
  postal_book: "Book the Postal ID capture slot",
  psa_certificate: "Request my PSA birth certificate",
  psa_certificate_submit: "Confirm my PSA request",
  employment_starter: "Prepare my employment starter pack",
  business_one_stop: "Help me start a sole proprietorship in Mandaluyong",
  ereport: "File a flooding eReport",
  ereport_submit: "Submit this flooding eReport",
  cde_exam: "Start the LTO CDE exam",
  greeting: "Hello",
};

function documentHref(printKind: string, travelDetails: ETravelDetails) {
  if (
    printKind !== "etravel-qr" ||
    !hasCompleteETravelDetails(travelDetails)
  ) {
    return `/agent/documents/${printKind}`;
  }

  const search = new URLSearchParams({
    direction: travelDetails.direction,
    origin: travelDetails.origin,
    destination: travelDetails.destination,
    date: travelDetails.travelDate,
    time: travelDetails.travelTime,
    flight: travelDetails.flightNumber,
  });
  return `/agent/documents/${printKind}?${search.toString()}`;
}

function isChatRole(value: unknown): value is "user" | "assistant" {
  return value === "user" || value === "assistant";
}

function parseRequest(value: unknown): AgentApiRequest {
  if (!value || typeof value !== "object") {
    throw new AiRouterError("A JSON request body is required.", 400);
  }

  const body = value as Partial<AgentApiRequest>;
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    throw new AiRouterError("Message is required.", 400);
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new AiRouterError(
      `Message must be ${MAX_MESSAGE_LENGTH.toLocaleString()} characters or less.`,
      400
    );
  }

  const firstName =
    typeof body.user?.firstName === "string"
      ? body.user.firstName.trim().slice(0, 80)
      : "User";
  const name =
    typeof body.user?.name === "string"
      ? body.user.name.trim().slice(0, 160)
      : firstName;
  const history = Array.isArray(body.history)
    ? body.history
        .filter(
          (item) =>
            item &&
            typeof item === "object" &&
            isChatRole(item.role) &&
            typeof item.text === "string"
        )
        .slice(-MAX_HISTORY_ITEMS)
        .map((item) => ({
          role: item.role,
          text: item.text.trim().slice(0, 1_500),
        }))
    : [];

  return {
    message,
    history,
    user: { name, firstName },
  };
}

function groundResponseInServiceResult(
  aiResponse: string,
  card: Card | undefined,
  user: User
) {
  if (card?.kind === "employmentPack") {
    return `Your **Employment Starter Pack** is ready, ${user.firstName}. **${card.ready} of ${card.total}** government checks are complete. Your PhilHealth, SSS, and Pag-IBIG memberships are active.

Your PSA birth certificate and Barangay Clearance remain private in your Vault until you approve sharing them. The only pending action is reviewing your **NBI clearance renewal**.`;
  }

  if (
    card?.kind === "contributions" &&
    card.title.startsWith("PhilHealth")
  ) {
    const latestMonth = card.rows[0]?.month ?? "the latest recorded month";
    return `Here is your latest **PhilHealth premium contribution history**, ${user.firstName}. The three displayed monthly premiums are posted through **${latestMonth}**, with no missed posting in this period.`;
  }

  if (card?.kind === "record" && card.title.startsWith("PhilHealth")) {
    return `Your PhilHealth membership is **active**, ${user.firstName}. Your Member Data Record below shows your member type and registered dependents. Premium contribution history is available through a separate request.`;
  }

  if (card?.kind !== "ltoViolation") return aiResponse;

  return `I checked your connected LTO record, ${user.firstName}. It is **not clear**: you have **one pending OGA alarm** for **${card.violation}**. The alarm blocks LTO transactions until it is lifted.

A violation check alone cannot confirm that you may legally drive today. Your driver's license must also be valid, active, appropriate for the vehicle, and not suspended. Review the official case details below before driving.`;
}

function groundActionsInServiceResult(
  aiActions: string[],
  card: Card | undefined
) {
  if (
    card?.kind !== "ltoViolation" &&
    card?.kind !== "employmentPack"
  ) {
    return aiActions;
  }
  return card.intent ? [card.intent] : [];
}

export async function runHeadlessAgent(value: unknown) {
  const body = parseRequest(value);
  const { result } = await routeGovernmentRequest({
    ...body,
    personalContext: PERSONAL_CONTEXT,
  });
  const servicePrompt =
    result.route === "psa_certificate" ||
    result.route === "business_one_stop"
      ? body.message
      : SERVICE_PROMPTS[result.route];
  const serviceUser: User = {
    ...body.user,
    pcn: "6302-6431-0891-2530",
  };
  const isETravel =
    result.route === "etravel_register" ||
    result.route === "etravel_submit";
  const servicePlan = isETravel
    ? buildETravelPlan(
        result.travel_details,
        serviceUser,
        result.route === "etravel_submit"
      )
    : servicePrompt
      ? agentPlan(
          result.route === "ereport" && body.message.includes("Attachments:")
            ? `${servicePrompt}\n${body.message}`
            : servicePrompt,
          serviceUser
        )
      : { steps: [] };
  const routingSteps = [
    step(
      "spark",
      "Understanding your request",
      "eGov Agent",
      result.intent_summary,
      480
    ),
    step(
      "search",
      `Routing to ${result.service}`,
      result.agency,
      result.routing_reason,
      560
    ),
  ];
  const connectorSteps =
    "steps" in servicePlan
      ? servicePlan.steps.map((traceStep) => ({
          ...traceStep,
          base: Math.min(
            720,
            Math.max(420, Math.round(traceStep.base / 2))
          ),
        }))
      : [];
  const serviceCard = "card" in servicePlan ? servicePlan.card : undefined;
  const groundedResponse = groundResponseInServiceResult(
    result.response,
    serviceCard,
    serviceUser
  );
  const groundedActions = groundActionsInServiceResult(
    result.suggested_actions,
    serviceCard
  );
  const printKind = serviceCard?.print;
  const generatedDocument = printKind
    ? {
        name: PRINT_FILE_PREVIEWS[printKind].name,
        href: documentHref(printKind, result.travel_details),
        preview: PRINT_FILE_PREVIEWS[printKind].preview,
      }
    : null;
  const attachments = [
    ...("attachments" in servicePlan && servicePlan.attachments
      ? servicePlan.attachments
      : []),
    ...(generatedDocument ? [generatedDocument] : []),
  ];

  return {
    plan: {
      text: groundedResponse,
      steps: [...routingSteps, ...connectorSteps],
      ...(serviceCard ? { card: serviceCard } : {}),
      ...(attachments.length ? { attachments } : {}),
    },
    suggestedActions: groundedActions,
  };
}

export type HeadlessAgentResult = Awaited<
  ReturnType<typeof runHeadlessAgent>
>;
