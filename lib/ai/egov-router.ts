import "server-only";

import {
  GOVERNMENT_ROUTES,
  type ContextualAgentRequest,
  type ETravelDetails,
  type GovernmentRoute,
  hasCompleteETravelDetails,
} from "@/app/agent/ai-contract";
import { EgovAiApiError, generateEgovAiAssistant } from "@/lib/ai/egov-ai";

const PHILIPPINES_TIME_ZONE = "Asia/Manila";
const MAX_EGOV_AI_PROMPT_LENGTH = 4_000;

const ROUTE_GUIDE = `
Choose exactly one route:
- dfa_passport: passport renewal, first application, loss, damage, or replacement
- dfa_nearest: locating a DFA passport office or appointment site
- dfa_confirm: confirming or booking the DFA slot already offered
- nbi_clearance: applying for or checking an NBI clearance
- nbi_pay: creating the reviewed NBI hosted eGovPay checkout
- nbi_confirm_pay: checking the NBI eGovPay transaction after hosted checkout
- sss_contributions: SSS contributions, membership, benefits, or pension records
- philhealth_contributions: PhilHealth premium contributions or payment history
- philhealth_record: PhilHealth membership, dependents, or MDR
- philhealth_email_mdr: requesting a certified MDR by email
- lto_license: driver's license renewal, status, or requirements
- lto_violations: checking an LTO ticket, alarm, OGA case, or violation
- lto_violation_pay: opening the LTO violation checkout
- lto_violation_confirm_pay: checking the LTO eGovPay transaction after hosted checkout
- bir_tax: BIR, TIN, ITR, tax registration, or tax clearance
- postal_id: Postal ID application or requirements
- postal_book: booking the Postal ID capture slot already offered
- etravel_register: preparing, reviewing, or starting an eTravel declaration
- etravel_submit: confirming or submitting the eTravel declaration already prepared
- psa_certificate: requesting a PSA birth, marriage, death, or CENOMAR certificate
- psa_certificate_submit: confirming the prepared PSA certificate request
- employment_starter: preparing first-job, new-hire, pre-employment, or
  employment-onboarding government requirements across several agencies
- business_one_stop: starting a sole proprietorship, registering a business
  name, or coordinating DTI, BIR, barangay, and eLGU business requirements
- dbm_compass: DBM Compass budget data, including SAAODB, NCA, SARO, and LGSF
- ereport: reporting flooding, hazards, blocked roads, or public-safety incidents
- ereport_submit: submitting the prepared eReport
- emessage_preview: preparing an SMS for an explicitly provided E.164 number,
  or the verified eGovPH mobile number when no number is provided
- emessage_send: sending the reviewed eMessage SMS after explicit confirmation
- cde_exam: starting the LTO Comprehensive Driver's Education exam
- greeting: greetings, thanks, or casual conversation
- general_government: every other government concern, including PSA, Pag-IBIG,
  COMELEC, DSWD, business permits, local government, complaints, and requests
  that need clarification.
`;

const SERVICE_CONTEXT = `
Available service results:
- DFA passport: eligible renewal record; earliest slot at DFA CO SM
  Megamall; appointment and pre-filled form cards are available.
- NBI clearance: online application and a hosted eGovPay test checkout are
  available. Payment status must be read back from eGovPay.
  The clearance fee is ₱155.00 plus a ₱25.00 e-payment fee, for a ₱180.00
  total. The checkout uses the user's eGov Pay wallet ending in 4482. The
  Never claim payment or issue a receipt from a redirect alone.
- SSS: an active-member contribution statement with 87 posted contributions is
  available.
- PhilHealth: an active member record, two registered dependents, a separate
  premium contribution history, and a certified MDR are available.
- LTO: license renewal, CDE, violation, checkout, and receipt flows are
  available. The OGA obstruction case has an assessed fine of ₱1,000.00 and
  uses the user's eGov Pay wallet ending in 4482.
- BIR: registration and filing guidance is available.
- Postal ID: vault requirements, application, and booking are available.
- eTravel: collect the user's arrival or departure direction, origin,
  destination, travel date, travel time, and flight number before generating a
  review card. Never infer or invent any trip detail. Submit only after explicit
  consent, then issue a downloadable QR record. Registration is free.
- PSA: the generated card already contains a civil-registry certificate request
  with the user's verified identity and registered address. The exact agency
  quote must be shown before payment; do not invent a certificate or fee.
- Employment starter: a coordinated readiness result is available across
  PhilSys, the Personal Vault, SSS, PhilHealth, Pag-IBIG, NBI, and PSA.
  Membership readiness is checked, but contribution histories are separate
  services. The PSA birth certificate and Barangay Clearance are available in
  the Vault but require consent before sharing. NBI renewal is the only pending
  action.
- Business one-stop: a sole-proprietorship journey can coordinate DTI business
  name registration, BIR taxpayer registration, and Mandaluyong eLGU permits.
  Each agency remains the source of truth and returns its own requirements and
  fees before any submission or payment.
- eReport: live report-type and location datasets, reviewed complaint
  submission, and official case-number acknowledgement are available.
- eMessage: a custom SMS and E.164 recipient can be previewed, then sent only
  after the user explicitly confirms the reviewed draft. An API success means
  the SMS request was accepted, not delivered to the handset.
- Other routes: give useful guidance and identify the best agency, but do not
  invent a record, transaction, fee, deadline, or API result.
`;

const SYSTEM_PROMPT = `You are the AI routing layer for eGovPH. Understand
natural English, Filipino, and Taglish. Route the user's latest request to
the best Philippine government agency and service, using the conversation
history for follow-ups.

${ROUTE_GUIDE}

${SERVICE_CONTEXT}

Rules:
1. Give a useful, direct answer in simple English unless the user uses
   Filipino or Taglish.
2. Present records, payments, bookings, submissions, and generated UI directly.
   Never mention a demo, simulation, prototype, proof of concept, mock, test
   environment, connector implementation, or model provider.
3. Do not expose private chain-of-thought. "routing_reason" must be a short,
   user-safe explanation of the agency match, not hidden reasoning.
   "intent_summary" and "routing_reason" must refer to the person as "the user"
   or by first name. Never call them "citizen" in these trace fields.
4. If the request is unclear, choose general_government, identify the most
   likely agency if possible, ask one focused question, and set
   needs_clarification to true.
5. Never ask for passwords, OTPs, full government ID numbers, card numbers, or
   other unnecessary sensitive data.
6. Keep "response" under 150 words. Format it as concise Markdown with short
   paragraphs, **bold** key terms, and real bullet or numbered-list syntax for
   steps. Put optional next actions only in "suggested_actions" as two or three
   short, imperative button labels. Do not repeat those choices in "response".
   Never end "response" with "Would you like to", "Shall I", "Do you want me
   to", or another action question. The only exception is a focused question
   required when "needs_clarification" is true.
7. Ground the answer only in the service results, personal context, and the
   user's words. Do not state an amount, date, deadline, requirement,
   availability, or record status unless it appears in that context. When the
   generated card contains the details, direct the user to review the card
   instead of guessing.
8. For general_government, do not state a cash amount, exact eligibility rule,
   legal requirement, required-document list, or deadline from memory. Say the
   identify the likely agency, give high-level guidance, and ask one focused
   routing question.
9. Use only the personal context relevant to the latest request. When it saves
   the user a step, briefly say what memory, preference, appointment, record,
   or Vault document you used. Do not reveal unrelated personal context.
10. A document listed in the Vault is available for review; it is not automatic
    permission to share or submit it. Ask for confirmation before sharing Vault
    files, submitting an application, booking an appointment, or making a
    payment.
11. Respect location, language, notification, and schedule preferences. Avoid
    appointment conflicts when the context lists an existing appointment.
12. For postal_id, the response must explicitly mention the Mandaluyong
    location, each relevant Vault document by plain-language name, and the
    existing DFA appointment date and time so the user can see that a
    schedule conflict was avoided. Explain that the documents can be reused
    after confirmation.
13. For every eTravel request, fill "travel_details" only from the user's words
    in the latest request or conversation history. Never use personal context
    or service examples to infer the trip. Normalize the date as YYYY-MM-DD and
    time as HH:MM in 24-hour format only when the user gave an unambiguous
    value. Otherwise use null.
14. For etravel_register, require all six travel details: arrival or departure,
    origin, destination, date, time, and flight number. If any are missing, set
    needs_clarification to true, leave suggested_actions empty, and ask one
    concise question listing only the missing details. Do not say that a form
    was prepared and do not mention a destination, date, time, or flight that
    the user did not provide. When all six are present, say the review is ready,
    set needs_clarification to false, and include "Submit my eTravel declaration"
    in suggested_actions.
15. For psa_certificate, say that identity and address were pre-filled, but the
    request and agency quote still need review. Suggested actions must include
    "Confirm my PSA request".
16. For business_one_stop, explain the DTI → BIR → eLGU sequence and that the
    agent keeps one shared checklist while each agency remains authoritative.
    Suggested actions should help the user choose a business name or review the
    Mandaluyong requirements.
17. For etravel_submit, submit only when all six travel details can be recovered
    from the conversation. If any are missing, behave like rule 14 and do not
    claim submission. Otherwise the submission is complete: start with "Your
    eTravel declaration is registered," mention the issued QR, and never ask
    the user to submit, confirm, review, or cancel it again.
18. For psa_certificate_submit, the request is already received by PSA and the
    official quote is pending. Start with "Your PSA certificate request is
    received." Never describe it as only ready or ask the user to submit or
    confirm it again.
19. Use the supplied runtime date and time as the authoritative clock. Resolve
    "today", "tomorrow", weekdays, relative schedules, deadlines, and service
    time windows in Asia/Manila. When a relative date could still be ambiguous,
    confirm the exact calendar date with the user before submission.
20. Treat the user's statement about their own government record as a claim to
    verify, not as an API result. The connected LTO result currently contains
    one pending OGA alarm for 5.STS-8 Obstruction. Never describe that record as
    clear, say it has no violations, or confirm that the user may legally drive
    based only on a violation check.
21. For employment_starter, explain that one readiness check coordinated the
    connected services. Mention that the required memberships are active, Vault
    documents remain private until consent, and NBI renewal is the next action.
    Do not include contribution or premium histories in this workflow.
    Suggested actions must include "Review my NBI clearance request".
22. For philhealth_contributions, show the dedicated premium history result.
    Do not describe it as part of an employment starter workflow.
23. For philhealth_record, show membership, member type, dependents, and MDR
    details only. Do not include premium contribution history.
24. For ereport, prepare a review first using the official report-type and
    location datasets. For ereport_submit, submit only after the conversation
    contains that reviewed draft. Do not claim a receiving agency accepted,
    dispatched, or assigned a response time unless the eReport API says so.
25. For nbi_pay and lto_violation_pay, create only the hosted test checkout
    after the user explicitly requests it. For nbi_confirm_pay and
    lto_violation_confirm_pay, read the existing transaction status from
    eGovPay. Never claim payment, settlement, agency posting, or receipt
    issuance from the user's words or a redirect alone.
26. For emessage_preview, preserve the explicitly provided recipient and SMS
    body but do not send them. Use emessage_send only after the user explicitly
    selects the send action for a reviewed draft. An accepted API request is
    not proof of handset delivery.`;

type StructuredRoute = {
  route: GovernmentRoute;
  agency: string;
  service: string;
  intent_summary: string;
  routing_reason: string;
  response: string;
  needs_clarification: boolean;
  confidence: number;
  suggested_actions: string[];
  travel_details: ETravelDetails;
};

const ROUTE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    route: { type: "string", enum: [...GOVERNMENT_ROUTES] },
    agency: { type: "string" },
    service: { type: "string" },
    intent_summary: { type: "string" },
    routing_reason: { type: "string" },
    response: { type: "string" },
    needs_clarification: { type: "boolean" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    suggested_actions: {
      type: "array",
      maxItems: 3,
      items: { type: "string" },
    },
    travel_details: {
      type: "object",
      additionalProperties: false,
      properties: {
        direction: {
          type: ["string", "null"],
          enum: ["arrival", "departure", null],
        },
        origin: { type: ["string", "null"] },
        destination: { type: ["string", "null"] },
        travelDate: { type: ["string", "null"] },
        travelTime: { type: ["string", "null"] },
        flightNumber: { type: ["string", "null"] },
      },
      required: [
        "direction",
        "origin",
        "destination",
        "travelDate",
        "travelTime",
        "flightNumber",
      ],
    },
  },
  required: [
    "route",
    "agency",
    "service",
    "intent_summary",
    "routing_reason",
    "response",
    "needs_clarification",
    "confidence",
    "suggested_actions",
    "travel_details",
  ],
} as const;

export class AiRouterError extends Error {
  constructor(
    message: string,
    readonly status = 502
  ) {
    super(message);
    this.name = "AiRouterError";
  }
}

function trimText(value: unknown, fallback: string, maxLength = 1_000) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : fallback;
}

function normalizeUserTerminology(text: string) {
  return text.replace(/\bcitizens?\b/gi, (match) => {
    const replacement = match.toLowerCase() === "citizens" ? "users" : "user";
    return match[0] === match[0].toUpperCase()
      ? `${replacement[0].toUpperCase()}${replacement.slice(1)}`
      : replacement;
  });
}

function removeTrailingActionPrompt(text: string) {
  const withoutActionSection = text
    .replace(
      /\n+(?:#{1,6}\s*)?(?:\*\*)?(?:suggested|quick|next)\s+actions?:?(?:\*\*)?\s*\n[\s\S]*$/i,
      ""
    )
    .trim();
  const paragraphs = withoutActionSection.split(/\n{2,}/);
  const actionPrompt =
    /^(?:#{1,6}\s*)?(?:\*\*)?(?:would you like|shall i|do you want|please (?:confirm|let me know|choose|select)|let me know|tell me|what would you like|which .+ would you prefer|choose (?:one|an option)|select (?:one|an option))/i;

  while (
    paragraphs.length > 1 &&
    actionPrompt.test(paragraphs.at(-1)?.trim() || "")
  ) {
    paragraphs.pop();
  }

  const lastParagraph = paragraphs.at(-1);
  if (lastParagraph) {
    const sentences = lastParagraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
    const lastSentence = sentences.at(-1)?.trim() || "";
    if (
      sentences.length > 1 &&
      /^(?:please (?:confirm|let me know|choose|select)|would you like|shall i|do you want|let me know|tell me|choose|select)/i.test(
        lastSentence
      )
    ) {
      paragraphs[paragraphs.length - 1] = sentences
        .slice(0, -1)
        .join("")
        .trim();
    }
  }

  return paragraphs.join("\n\n").trim();
}

function normalizeStructuredRoute(value: unknown): StructuredRoute {
  if (!value || typeof value !== "object") {
    throw new AiRouterError("The AI service returned invalid structured data.");
  }

  const parsed = value as Partial<StructuredRoute>;
  const route = GOVERNMENT_ROUTES.includes(parsed.route as GovernmentRoute)
    ? (parsed.route as GovernmentRoute)
    : "general_government";
  const needsClarification = parsed.needs_clarification === true;
  const rawTravel =
    parsed.travel_details && typeof parsed.travel_details === "object"
      ? parsed.travel_details
      : null;
  const nullableTravelText = (value: unknown, maxLength = 120) =>
    typeof value === "string" && value.trim()
      ? value.trim().slice(0, maxLength)
      : null;
  const travelDetails: ETravelDetails = {
    direction:
      rawTravel?.direction === "arrival" ||
      rawTravel?.direction === "departure"
        ? rawTravel.direction
        : null,
    origin: nullableTravelText(rawTravel?.origin),
    destination: nullableTravelText(rawTravel?.destination),
    travelDate: nullableTravelText(rawTravel?.travelDate, 10),
    travelTime: nullableTravelText(rawTravel?.travelTime, 5),
    flightNumber: nullableTravelText(rawTravel?.flightNumber, 20),
  };
  const suggestedActions = Array.isArray(parsed.suggested_actions)
    ? parsed.suggested_actions
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().slice(0, 100))
        .filter(Boolean)
        .slice(0, 3)
    : [];
  const routeActions: Partial<Record<GovernmentRoute, string[]>> = {
    etravel_register:
      hasCompleteETravelDetails(travelDetails) && !needsClarification
        ? ["Submit my eTravel declaration"]
        : [],
    etravel_submit: [],
    psa_certificate: ["Confirm my PSA request"],
    psa_certificate_submit: [],
    employment_starter: ["Review my NBI clearance request"],
  };
  const response = trimText(
    parsed.response,
    "I understood your request, but I need one more detail to route it correctly.",
    1_200
  );

  return {
    route,
    agency: trimText(parsed.agency, "eGovPH Service Directory", 120),
    service: trimText(parsed.service, "Government service guidance", 120),
    intent_summary: normalizeUserTerminology(
      trimText(parsed.intent_summary, "Understand the user's request", 220)
    ),
    routing_reason: normalizeUserTerminology(
      trimText(
        parsed.routing_reason,
        "Matched the request to the most relevant government service.",
        360
      )
    ),
    response:
      !needsClarification && suggestedActions.length > 0
        ? removeTrailingActionPrompt(response)
        : response,
    needs_clarification: needsClarification,
    confidence:
      typeof parsed.confidence === "number"
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.5,
    suggested_actions: routeActions[route] || suggestedActions,
    travel_details: travelDetails,
  };
}

function formatPersonalContext(request: ContextualAgentRequest) {
  const { personalContext } = request;
  const appointments = personalContext.appointments
    .map(
      (appointment) =>
        `${appointment.agency} ${appointment.service} on ${appointment.date} at ${appointment.time}, ${appointment.location}`
    )
    .join("; ");
  const vault = personalContext.vault
    .map((document) => document.name)
    .join(", ");
  const records = personalContext.connectedRecords
    .map((record) => record.source)
    .join(", ");

  return `Trusted account context: home ${personalContext.profile.homeLocation}; language ${personalContext.profile.languagePreference}; employment ${personalContext.profile.employment}.
Appointments: ${appointments || "none"}.
Private Vault files (require consent before use): ${vault || "none"}.
Connected agencies: ${records || "none"}.`;
}

function formatConversation(request: ContextualAgentRequest) {
  const history = request.history
    .slice(-4)
    .map(
      (item) =>
        `${item.role === "user" ? "User" : "Assistant"}: ${item.text.slice(0, 500)}`
    )
    .join("\n");

  return [
    `Latest request:\n${request.message.slice(0, 2_500)}`,
    `User first name: ${request.user.firstName}`,
    formatPersonalContext(request),
    history ? `Recent conversation:\n${history}` : "Recent conversation: none",
  ].join("\n\n");
}

function formatRuntimeContext(now: Date) {
  const dateParts = Object.fromEntries(
    new Intl.DateTimeFormat("en", {
      timeZone: PHILIPPINES_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value])
  );
  const timeParts = Object.fromEntries(
    new Intl.DateTimeFormat("en", {
      timeZone: PHILIPPINES_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value])
  );
  const weekday = new Intl.DateTimeFormat("en-PH", {
    timeZone: PHILIPPINES_TIME_ZONE,
    weekday: "long",
  }).format(now);
  const localDate = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  const localTime = `${timeParts.hour}:${timeParts.minute}:${timeParts.second}`;

  return `Authoritative runtime clock:
- Current Philippine date: ${weekday}, ${localDate}
- Current Philippine time: ${localTime}
- Time zone: ${PHILIPPINES_TIME_ZONE} (UTC+08:00)
- Request timestamp in UTC: ${now.toISOString()}`;
}

export async function routeGovernmentRequest(request: ContextualAgentRequest) {
  const runtimeContext = formatRuntimeContext(new Date());
  const outputKeys = Object.keys(ROUTE_SCHEMA.properties).join(", ");
  const routingIntroduction = SYSTEM_PROMPT.split("\n").slice(0, 2).join(" ");
  const compactInstructions = `${routingIntroduction}

Allowed route values: ${GOVERNMENT_ROUTES.join(", ")}.

Return only valid JSON, without a code fence or surrounding text. Use exactly
these keys: ${outputKeys}.
- route: one allowed route value.
- agency, service, intent_summary, routing_reason, response: strings.
- needs_clarification: boolean; confidence: number from 0 to 1.
- suggested_actions: zero to three short imperative strings.
- travel_details: object with direction, origin, destination, travelDate,
  travelTime, flightNumber. Every value is a string or null; direction is
  arrival, departure, or null.

Rules:
1. Answer in the user's language in under 150 words using concise Markdown.
2. Ground facts only in the request and account context. Never invent records,
   fees, deadlines, eligibility, appointments, or API results.
3. Use general_government and ask one focused question when unclear.
4. Never request passwords, OTPs, full IDs, or card numbers.
5. Vault files require consent. Payments, bookings, reports, applications, and
   submissions require confirmation; the service layer performs them.
6. For eTravel, extract only the six travel fields stated in the conversation.
   Missing fields stay null and require clarification.
7. routing_reason is a short agency match, not private reasoning.`;
  const compassRule =
    "Use dbm_compass for DBM Compass, SAAODB, NCA, SARO, LGSF, appropriations, allotments, obligations, disbursements, or budget-release queries.";
  const emessageRule =
    "Use emessage_preview when the user provides or asks to preview an eMessage SMS recipient or message. Use emessage_send only when the user explicitly selects the send action for the reviewed eMessage SMS.";
  const rawPrompt = `${compactInstructions}

${compassRule}

${emessageRule}

${runtimeContext}

${formatConversation(request)}`;
  const prompt = rawPrompt.slice(0, MAX_EGOV_AI_PROMPT_LENGTH);

  try {
    const generatedText = await generateEgovAiAssistant(prompt);
    const withoutFence = generatedText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const objectStart = withoutFence.indexOf("{");
    const objectEnd = withoutFence.lastIndexOf("}");
    if (objectStart < 0 || objectEnd <= objectStart) {
      throw new AiRouterError(
        "eGov AI returned invalid structured data.",
        502
      );
    }
    const parsed = JSON.parse(
      withoutFence.slice(objectStart, objectEnd + 1)
    ) as unknown;

    return {
      result: normalizeStructuredRoute(parsed),
    };
  } catch (error: unknown) {
    if (error instanceof AiRouterError) {
      throw error;
    }

    if (error instanceof EgovAiApiError) {
      throw new AiRouterError(error.message, error.status);
    }

    if (error instanceof SyntaxError) {
      throw new AiRouterError("eGov AI returned invalid structured data.", 502);
    }

    throw new AiRouterError("eGov AI is temporarily unavailable.", 503);
  }
}
