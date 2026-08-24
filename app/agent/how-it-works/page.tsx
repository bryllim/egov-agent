"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Box,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Code2,
  CreditCard,
  Database,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSearch,
  FileText,
  Fingerprint,
  Gauge,
  Globe2,
  HardDrive,
  Info,
  KeyRound,
  Landmark,
  Layers3,
  Link2,
  Lock,
  MessageCircle,
  Network,
  Play,
  RefreshCcw,
  Route,
  ScanFace,
  ScrollText,
  Send,
  Server,
  ShieldCheck,
  Smartphone,
  Timer,
  TriangleAlert,
  UserCheck,
  Vault,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { Squircle, SquircleButton } from "@/components/squircle";

type GlossaryEntry = {
  title: string;
  short: string;
  plain: string;
  example: string;
  why: string;
};

const GLOSSARY = {
  headless: {
    title: "Headless architecture",
    short: "Frontend and backend are decoupled",
    plain:
      "The backend service logic is separate from each frontend client. The same APIs can serve eGovPH, a website, Viber, or an agency app.",
    example:
      "A booking started in Viber can appear in the eGovPH app without rebuilding the booking logic.",
    why: "Government can add new channels without copying the core system.",
  },
  apiGateway: {
    title: "API gateway",
    short: "The secure front door",
    plain:
      "The API gateway checks traffic before it reaches eGov Agent. It blocks abuse, limits request volume, and gives every request a tracking ID.",
    example:
      "If one device sends thousands of requests, the gateway can slow or block it.",
    why: "It protects the service and gives operators one place to control access.",
  },
  sso: {
    title: "eGovPH SSO",
    short: "Sign in once",
    plain:
      "Single Sign-On lets a citizen use one trusted eGovPH login across connected services.",
    example:
      "The citizen signs in to eGovPH and does not create another password for eGov Agent.",
    why: "It reduces login friction and avoids a second identity system.",
  },
  oauth: {
    title: "OAuth 2.0",
    short: "Safe delegated access",
    plain:
      "OAuth gives eGov Agent a short-lived permission token instead of the citizen's password.",
    example:
      "The token may allow one profile check for a few minutes, then it expires.",
    why: "A stolen token has limited time and limited power.",
  },
  eVerify: {
    title: "National ID eVerify",
    short: "Trusted identity check",
    plain:
      "eVerify confirms that the person matches a National ID record, with consent.",
    example:
      "Before a sensitive request, the agent asks eVerify to confirm the citizen.",
    why: "It reduces fake accounts and identity fraud.",
  },
  liveness: {
    title: "Face Liveness",
    short: "Checks for a real person",
    plain:
      "Liveness checks that a real person is present, not a photo, replayed video, or deepfake.",
    example:
      "A high-risk payment or document request can ask for a quick live face check.",
    why: "It adds stronger protection only when the risk is high.",
  },
  orchestrator: {
    title: "Agent orchestrator",
    short: "The workflow coordinator",
    plain:
      "The orchestrator turns one request into safe steps and coordinates the approved services needed to finish it.",
    example:
      "It can check requirements, request a file, ask for consent, book a slot, and send a receipt.",
    why: "The citizen sees one journey even when several systems are involved.",
  },
  cloudAgnostic: {
    title: "Cloud-agnostic design",
    short: "Clouds are replaceable",
    plain:
      "The application uses standard APIs and adapters instead of putting government logic inside one cloud product.",
    example:
      "Compute, SQL, file storage, queues, encryption keys, and monitoring can be mapped to GCP, AWS, Azure, or another approved environment.",
    why:
      "Government can choose its cloud, use more than one, or move later without rewriting the citizen journey.",
  },
  costRouting: {
    title: "Cost-aware model routing",
    short: "Use the cheapest safe execution path",
    plain:
      "The backend classifies each request and sends it to deterministic code, a smaller approved model, or an advanced model based on complexity, risk, and confidence.",
    example:
      "A contribution lookup uses a direct API. Taglish extraction may use a smaller model. Complex multi-agency planning escalates only when simpler paths are not enough.",
    why:
      "Most routine transactions avoid expensive inference while difficult requests can still receive stronger reasoning.",
  },
  finOps: {
    title: "FinOps",
    short: "Measure, allocate, and optimize spend",
    plain:
      "FinOps connects technical usage with cost ownership. Every backend request records its compute, model, storage, network, and external API cost.",
    example:
      "An operations team can compare cost by agency, workflow, channel, and completed transaction.",
    why:
      "Teams can find waste, set budgets, and improve the parts of the architecture that create the most cost.",
  },
  unitEconomics: {
    title: "Cost per completed transaction",
    short: "The production unit-cost metric",
    plain:
      "The main cost metric is the total backend cost required to complete one verified government transaction, not the number of chat messages.",
    example:
      "A workflow with five messages but one successful appointment is measured as one completed appointment transaction.",
    why:
      "It rewards successful outcomes and prevents teams from optimizing for short conversations that do not finish the citizen's task.",
  },
  costEstimate: {
    title: "Illustrative cost estimate",
    short: "Marginal cost after eGov integration",
    plain:
      "These figures estimate the additional operating cost after integration with eGov's existing identity, gateway, data, queue, security, and monitoring capabilities. They are not a vendor quote or government procurement estimate.",
    example:
      "The sample assumes a 90% API-only, 9% efficient AI, and 1% advanced AI request mix, plus a ₱5,000 monthly allocation for shared platform capacity.",
    why:
      "eGov does not need to fund a second platform. Every assumption can be replaced with actual contracts and measured usage during a pilot.",
  },
  sandbox: {
    title: "Isolated sandbox",
    short: "A separate safe workspace",
    plain:
      "A sandbox keeps agent-run code away from the main application and trusted citizen data.",
    example:
      "A document conversion can run in a temporary container with no direct access to the personal vault.",
    why:
      "A bad file or unsafe generated command cannot freely reach the production system.",
  },
  evals: {
    title: "Agent evals",
    short: "Automated behavior tests",
    plain:
      "Evals are repeatable tests that check whether the agent follows policy, uses the correct tools, and returns the expected result.",
    example:
      "A test can fail the release if the agent tries to pay before showing the fee and asking for consent.",
    why:
      "Prompt or model changes are tested before they reach citizens.",
  },
  egovAi: {
    title: "eGovAI",
    short: "Government AI service",
    plain:
      "eGovAI helps understand language, extract document details, translate text, and suggest a structured plan.",
    example:
      "It can understand a Taglish request and read approved fields from an uploaded document.",
    why: "It adds natural language support without giving the model direct authority.",
  },
  policy: {
    title: "Policy engine",
    short: "Rules decide, not AI",
    plain:
      "The policy engine is fixed code that decides which data and actions are allowed for a request.",
    example:
      "The AI may suggest a payment, but policy requires identity, consent, and a valid agency fee first.",
    why: "AI can suggest a plan, but it cannot grant itself permission.",
  },
  consent: {
    title: "Consent gate",
    short: "Approval before action",
    plain:
      "The citizen sees what will be read, shared, or changed before an important action happens.",
    example:
      "Before sharing a vault file, the screen names the file, agency, purpose, and expiry.",
    why: "People stay in control of their data and transactions.",
  },
  durableWorkflow: {
    title: "Durable workflow",
    short: "Work survives failures",
    plain:
      "A durable workflow saves every step, so a long task can continue after a restart or temporary API outage.",
    example:
      "If an agency is offline, the request stays pending and resumes later instead of disappearing.",
    why: "Government work often takes longer than one chat response.",
  },
  eventBus: {
    title: "Queue and event bus",
    short: "Safe background delivery",
    plain:
      "A queue holds work until a service is ready. An event bus delivers status changes to the systems that need them.",
    example:
      "A payment confirmation event can update the workflow, audit log, and notification service.",
    why: "Slow systems do not freeze the chat, and accepted work is not lost.",
  },
  egovDx: {
    title: "eGovDX",
    short: "Government data exchange",
    plain:
      "eGovDX is the shared integration layer that connects government platforms and agency systems.",
    example:
      "eGov Agent uses a governed connector instead of directly opening an agency database.",
    why: "Agencies keep ownership of their records while services can work together.",
  },
  systemOfRecord: {
    title: "System of record",
    short: "The official source",
    plain:
      "The agency system remains the official source of a record, decision, booking, or payment status.",
    example:
      "A booking is complete only after the agency system returns a confirmed reference.",
    why: "The agent never treats an AI answer as an official government result.",
  },
  memory: {
    title: "Personal context memory",
    short: "Useful facts with controls",
    plain:
      "Memory stores approved preferences and sourced facts so the citizen does not repeat safe information.",
    example:
      "It may remember a preferred language or that an appointment already occupies a date.",
    why: "It saves time while keeping a source, purpose, and expiry for every fact.",
  },
  provenance: {
    title: "Provenance",
    short: "Where a fact came from",
    plain:
      "Provenance records the source, date, purpose, and confidence of stored information.",
    example:
      "A home address can show that it came from a citizen update or a verified agency record.",
    why: "The system can explain, correct, expire, or re-check information.",
  },
  vault: {
    title: "Personal vault",
    short: "Encrypted document broker",
    plain:
      "The vault securely stores approved documents and shares only the needed file for an approved purpose.",
    example:
      "A proof of address can be shared with one agency for one application using a short-lived link.",
    why: "Citizens avoid repeat uploads without creating an open folder of sensitive files.",
  },
  kms: {
    title: "KMS or HSM",
    short: "Protected encryption keys",
    plain:
      "A Key Management System or Hardware Security Module protects the keys used to encrypt sensitive data.",
    example:
      "The document server can request a key for an approved operation, but the key is not stored in the file.",
    why: "Stealing the storage file alone is not enough to read it.",
  },
  pii: {
    title: "PII",
    short: "Personal information",
    plain:
      "Personally Identifiable Information includes names, ID numbers, addresses, faces, and other data that can identify someone.",
    example:
      "A National ID number is PII and should not appear in logs or an unnecessary AI prompt.",
    why: "PII must be minimized, encrypted, and accessed only for a valid purpose.",
  },
  dlp: {
    title: "DLP",
    short: "Stops unsafe data sharing",
    plain:
      "Data Loss Prevention checks content before it leaves a trusted area and blocks sensitive information that is not needed.",
    example:
      "It can remove an ID number before sending a document summary to a language model.",
    why: "It reduces accidental exposure of citizen data.",
  },
  generativeUi: {
    title: "Generative UI",
    short: "The right screen for the task",
    plain:
      "The agent selects an approved interface such as a form, map, checklist, receipt, or status tracker.",
    example:
      "A location request shows a map while a payment request shows a fee summary and consent screen.",
    why: "Citizens get clear controls instead of a long block of chat text.",
  },
  schema: {
    title: "UI schema",
    short: "A safe screen blueprint",
    plain:
      "A schema is a strict data format that describes which approved component and fields should appear.",
    example:
      "The model can request an appointment card with a date and office, but it cannot send raw HTML or JavaScript.",
    why: "It prevents unsafe or invented controls from appearing.",
  },
  idempotency: {
    title: "Idempotency key",
    short: "Prevents duplicate actions",
    plain:
      "A unique key tells the system that a retry belongs to the same transaction.",
    example:
      "If the network drops after payment, the retry checks the original key instead of charging again.",
    why: "It prevents duplicate payments, bookings, and reports.",
  },
  webhook: {
    title: "Webhook",
    short: "A secure status callback",
    plain:
      "A webhook lets another service notify the workflow when a transaction changes.",
    example:
      "eGovPay can notify the backend that a payment moved from pending to paid.",
    why: "The citizen can receive updates without keeping the chat open.",
  },
  audit: {
    title: "Append-only audit log",
    short: "A reviewable history",
    plain:
      "The audit log records who accessed what, why, when, and what the system decided. Existing entries are not silently changed.",
    example:
      "A reviewer can trace the consent, policy decision, API request, and official reference for one transaction.",
    why: "It supports accountability, security review, and dispute handling.",
  },
} satisfies Record<string, GlossaryEntry>;

type GlossaryKey = keyof typeof GLOSSARY;

type DiagramItem = {
  title: string;
  detail: string;
  metric?: string;
  icon: LucideIcon;
  logoSrc?: string;
  logoAlt?: string;
  term?: GlossaryKey;
  tone?: "blue" | "green" | "gold" | "purple" | "red";
};

const CHANNELS: DiagramItem[] = [
  {
    title: "eGovPH",
    detail: "Native mobile client",
    icon: Smartphone,
    logoSrc: "/agency-logos/egovph.svg",
    logoAlt: "eGovPH",
  },
  { title: "Web", detail: "Responsive web frontend", icon: Globe2 },
  { title: "Messaging", detail: "Messaging client adapter", icon: MessageCircle },
  { title: "Agency apps", detail: "Embedded frontend", icon: Landmark },
];

const EGOV_APIS: DiagramItem[] = [
  {
    title: "eGovPH SSO",
    detail: "OIDC / OAuth identity provider",
    icon: KeyRound,
    logoSrc: "/agency-logos/egovph.svg",
    logoAlt: "eGovPH",
    term: "sso",
    tone: "blue",
  },
  {
    title: "eVerify",
    detail: "Identity verification API",
    icon: Fingerprint,
    logoSrc: "/agency-logos/philsys.png",
    logoAlt: "PhilSys",
    term: "eVerify",
    tone: "blue",
  },
  {
    title: "Face Liveness",
    detail: "Biometric anti-spoof API",
    icon: ScanFace,
    logoSrc: "/agency-logos/philsys.png",
    logoAlt: "PhilSys",
    term: "liveness",
    tone: "blue",
  },
  {
    title: "eGovAI",
    detail: "Language and document inference API",
    icon: Brain,
    term: "egovAi",
    tone: "purple",
  },
  {
    title: "Compass",
    detail: "Geospatial directory API",
    icon: Route,
    tone: "green",
  },
  {
    title: "eReport",
    detail: "Case management API",
    icon: Send,
    tone: "red",
  },
  {
    title: "eGovPay",
    detail: "Payment gateway API",
    icon: CreditCard,
    logoSrc: "/agency-logos/egovpay.svg",
    logoAlt: "eGovPay",
    tone: "gold",
  },
  {
    title: "eMessage",
    detail: "Notification delivery API",
    icon: Bell,
    tone: "green",
  },
  {
    title: "eGovChain",
    detail: "Document hash verification API",
    icon: Link2,
    tone: "purple",
  },
];

const REQUEST_STEPS: DiagramItem[] = [
  {
    title: "1. Authentication",
    detail: "Create an OIDC session through eGovPH",
    icon: KeyRound,
    logoSrc: "/agency-logos/egovph.svg",
    logoAlt: "eGovPH",
    term: "sso",
  },
  {
    title: "2. Identity verification",
    detail: "Call eVerify or liveness for step-up auth",
    icon: UserCheck,
    logoSrc: "/agency-logos/philsys.png",
    logoAlt: "PhilSys",
    term: "eVerify",
  },
  {
    title: "3. Intent classification",
    detail: "eGovAI returns a typed request intent",
    icon: Route,
    term: "egovAi",
  },
  {
    title: "4. Context retrieval",
    detail: "Read authorized memory and file metadata",
    icon: Brain,
    term: "memory",
  },
  {
    title: "5. UI schema generation",
    detail: "Return an approved frontend component schema",
    icon: Layers3,
    term: "generativeUi",
  },
  {
    title: "6. Consent authorization",
    detail: "Capture data scope, recipient, purpose and fee",
    icon: ShieldCheck,
    term: "consent",
  },
  {
    title: "7. Workflow execution",
    detail: "Persist state and invoke allowlisted API tools",
    icon: Workflow,
    term: "durableWorkflow",
  },
  {
    title: "8. Read-after-write check",
    detail: "Verify the agency system-of-record response",
    icon: CheckCircle2,
    term: "systemOfRecord",
  },
];

const VAULT_STEPS: DiagramItem[] = [
  { title: "File upload", detail: "Client sends a multipart upload", icon: HardDrive },
  { title: "Quarantine bucket", detail: "Isolate the untrusted object", icon: Lock },
  { title: "Malware scan", detail: "Validate type and active content", icon: FileSearch },
  {
    title: "Field extraction",
    detail: "Parse approved fields through eGovAI",
    icon: FileSearch,
    term: "egovAi",
  },
  {
    title: "Envelope encryption",
    detail: "Encrypt with a protected per-object data key",
    icon: KeyRound,
    term: "kms",
  },
  {
    title: "Pre-signed share URL",
    detail: "Issue one short-lived, purpose-bound link",
    icon: Send,
    term: "consent",
  },
];

const MEMORY_SOURCES: DiagramItem[] = [
  {
    title: "Citizen preferences",
    detail: "Language, reminders and accessibility",
    icon: UserCheck,
  },
  {
    title: "Completed tasks",
    detail: "Appointments, receipts and references",
    icon: CheckCircle2,
  },
  {
    title: "Verified facts",
    detail: "Sourced claims from approved systems",
    icon: Landmark,
    term: "provenance",
  },
];

const UI_COMPONENTS: DiagramItem[] = [
  { title: "Form", detail: "Approved fields only", icon: FileText },
  { title: "Checklist", detail: "Clear requirements", icon: CheckCircle2 },
  { title: "Map", detail: "Nearby offices", icon: Route },
  { title: "Appointment", detail: "Date and location", icon: Timer },
  { title: "Payment", detail: "Fees and consent", icon: CreditCard },
  { title: "Tracker", detail: "Pending to complete", icon: Gauge },
];

const GUARDRAILS: DiagramItem[] = [
  {
    title: "PII detection",
    detail: "Classify sensitive fields in requests and files",
    icon: Eye,
    term: "pii",
  },
  {
    title: "Purpose-based access",
    detail: "Evaluate data scope against policy",
    icon: ShieldCheck,
    term: "policy",
  },
  {
    title: "Redaction",
    detail: "Remove or tokenize unnecessary identifiers",
    icon: Lock,
    term: "dlp",
  },
  {
    title: "Schema validation",
    detail: "Accept only typed, allowlisted output fields",
    icon: Code2,
    term: "schema",
  },
  {
    title: "Tool allowlist",
    detail: "Permit only policy-approved backend functions",
    icon: Workflow,
    term: "policy",
  },
  {
    title: "Append-only audit log",
    detail: "Record identity, policy and API decisions",
    icon: ScrollText,
    term: "audit",
  },
];

const WORKFLOW_STATES = [
  { label: "Draft", tone: "bg-slate-100 text-slate-600" },
  { label: "Needs consent", tone: "bg-amber-50 text-amber-700" },
  { label: "Running", tone: "bg-blue-50 text-[#0a4f9e]" },
  { label: "Waiting for agency", tone: "bg-violet-50 text-violet-700" },
  { label: "Verifying", tone: "bg-cyan-50 text-cyan-700" },
  { label: "Complete", tone: "bg-emerald-50 text-emerald-700" },
];

const STACK_LAYERS = [
  {
    title: "Client and frontend",
    tech: "Web client · Native app shell · Channel adapters",
    icon: Smartphone,
    term: "headless" as GlossaryKey,
  },
  {
    title: "Backend control plane",
    tech: "Agent runtime · Typed tools · Durable sessions",
    icon: Server,
    term: "orchestrator" as GlossaryKey,
  },
  {
    title: "Control and safety",
    tech: "Policy · Consent · Human approval · Sandbox · Evals",
    icon: ShieldCheck,
    term: "sandbox" as GlossaryKey,
  },
  {
    title: "Backend service layer",
    tech: "REST APIs · OpenAPI · Queues · OpenTelemetry",
    icon: Cloud,
    term: "cloudAgnostic" as GlossaryKey,
  },
  {
    title: "Data layer",
    tech: "Portable SQL · Encrypted object storage · Cache · Audit",
    icon: Database,
    term: "vault" as GlossaryKey,
  },
  {
    title: "Integration layer",
    tech: "eGov APIs · eGovDX · Agency and LGU backends",
    icon: Landmark,
    term: "egovDx" as GlossaryKey,
  },
];

const COST_PATHS: DiagramItem[] = [
  {
    title: "API-only path",
    detail: "No AI call · 90% sample mix",
    metric: "< ₱0.01 / transaction",
    icon: Code2,
    term: "costRouting",
    tone: "green",
  },
  {
    title: "Efficient AI path",
    detail: "Language + extraction · 9% sample mix",
    metric: "₱0.20 / transaction",
    icon: Gauge,
    term: "costRouting",
    tone: "blue",
  },
  {
    title: "Advanced AI path",
    detail: "Complex planning only · 1% sample mix",
    metric: "₱1.50 / transaction",
    icon: Brain,
    term: "costRouting",
    tone: "purple",
  },
];

const COST_CONTROLS: DiagramItem[] = [
  {
    title: "API first",
    detail: "Known requests run without an AI model",
    icon: Code2,
  },
  {
    title: "Reuse eGov platform",
    detail: "Share approved gateway, data, queue, and monitoring",
    icon: Landmark,
  },
  {
    title: "Small context",
    detail: "Load only the memory and fields needed",
    icon: Gauge,
  },
  {
    title: "Cache and deduplicate",
    detail: "Reuse safe lookups and block duplicate work",
    icon: RefreshCcw,
  },
  {
    title: "Elastic and async",
    detail: "Scale workers down and queue background jobs",
    icon: Timer,
  },
  {
    title: "Hard spend caps",
    detail: "Apply quotas, rate limits, budgets, and alerts",
    icon: ShieldCheck,
  },
];

const COST_SCENARIOS = [
  {
    volume: "10K",
    monthly: "₱5,400 / month",
    unit: "₱0.54 each",
  },
  {
    volume: "100K",
    monthly: "₱9,000 / month",
    unit: "₱0.09 each",
  },
  {
    volume: "1M",
    monthly: "₱45,000 / month",
    unit: "≈ ₱0.05 each",
  },
];

const QUICK_QA = [
  {
    q: "Is this only an AI chatbot?",
    a: "No. Chat is one frontend client. The backend coordinates identity, consent, files, payments, reports, notifications, and official results.",
  },
  {
    q: "Why use AI for simple requests?",
    a: "We do not. Known requests use rules and direct APIs. eGovAI is used when language, Taglish, translation, or document reading adds value.",
  },
  {
    q: "What stops hallucinations?",
    a: "AI only suggests a typed plan. Fixed policies, user consent, approved tools, and official agency read-back control the real result.",
  },
  {
    q: "How is personal data protected?",
    a: "The system minimizes data, encrypts it, removes unnecessary identifiers, uses short-lived access, and logs every read and share.",
  },
  {
    q: "What if an agency API is down?",
    a: "The task stays pending in the durable workflow. It retries safely, shows the real status, and moves to human review when needed.",
  },
  {
    q: "How do you stop duplicate payments?",
    a: "Every write uses an idempotency key. The workflow checks eGovPay and the agency ledger before it marks a payment complete.",
  },
  {
    q: "Does this replace eGovAI?",
    a: "No. eGovAI is the intelligence service. eGov Agent adds orchestration, policy, consent, memory, vault access, UI, and workflow recovery.",
  },
  {
    q: "Who owns the records?",
    a: "The agencies do. eGov Agent keeps only the minimum workflow state, approved context, file copies, and audit evidence needed for the task.",
  },
  {
    q: "Can eGov use its existing technology?",
    a: "Yes. The agent framework, models, database, storage, queue, and cloud are replaceable. eGov can connect the design to its approved tools through standard APIs and adapters.",
  },
  {
    q: "Are we locked to one cloud?",
    a: "No. The design can map compute, SQL, storage, queues, encryption keys, and monitoring to GCP, AWS, Azure, a government cloud, or another approved environment.",
  },
  {
    q: "How do you control AI and infrastructure cost?",
    a: "Known requests make no AI call. The design reuses eGov's existing platform and sends only ambiguous requests to AI. In our integration-mode sample, variable runtime is about ₱0.04 per transaction. At 100,000 transactions, the added operating cost is about ₱9,000 per month, excluding external transaction fees.",
  },
];

const PRESENTATION_SLIDES = [
  { id: "big-picture", label: "Client, frontend, and backend" },
  { id: "architecture", label: "Backend and integration map" },
  { id: "apis", label: "Service API layer" },
  { id: "request", label: "Backend request lifecycle" },
  { id: "data", label: "Encrypted data layer" },
  { id: "generative-ui", label: "Schema-driven frontend" },
  { id: "safety", label: "Backend security controls" },
  { id: "reliability", label: "Workflow and payment backend" },
  { id: "stack", label: "Deployment architecture" },
  { id: "costs", label: "Low-cost eGov integration" },
  { id: "qa", label: "Technical Q&A" },
];

const TERM_TONE = {
  blue: "bg-[#f1f7ff] text-[#0a4f9e]",
  green: "bg-emerald-50 text-emerald-700",
  gold: "bg-amber-50 text-amber-700",
  purple: "bg-violet-50 text-violet-700",
  red: "bg-red-50 text-red-600",
};

function Section({
  id,
  number,
  title,
  caption,
  children,
  presentationMode = false,
  active = true,
}: {
  id: string;
  number: string;
  title: string;
  caption: string;
  children: React.ReactNode;
  presentationMode?: boolean;
  active?: boolean;
}) {
  if (presentationMode && !active) return null;

  return (
    <section
      id={id}
      aria-label={presentationMode ? `Presentation slide ${number}: ${title}` : undefined}
      className={
        presentationMode
          ? `min-h-full ${id === "costs" ? "py-1" : "py-3 sm:py-5"}`
          : "scroll-mt-24 border-t border-slate-200/70 pt-9"
      }
    >
      <div className="flex items-start gap-3">
        <span
          className={`bg-brand-gradient font-pixel flex shrink-0 items-center justify-center text-[10px] font-bold text-white shadow-[0_10px_22px_-14px_rgba(6,61,125,0.7)] ${
            presentationMode
              ? "h-10 w-10 rounded-xl"
              : "h-8 w-8 rounded-[10px]"
          }`}
        >
          {number}
        </span>
        <div>
          <h2
            className={`font-semibold tracking-tight text-slate-800 ${
              presentationMode ? "text-[24px] sm:text-[30px]" : "text-[19px]"
            }`}
          >
            {title}
          </h2>
          <p
            className={`mt-1 max-w-3xl leading-relaxed text-slate-500 ${
              presentationMode ? "text-[14px] sm:text-[15px]" : "text-[13px]"
            }`}
          >
            {caption}
          </p>
        </div>
      </div>
      <div className={presentationMode ? "mt-6" : "mt-5"}>{children}</div>
    </section>
  );
}

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Squircle
      cornerRadius={8}
      className={`architecture-card bg-white p-4 shadow-[0_10px_30px_-24px_rgba(6,61,125,0.32)] ${className}`}
    >
      {children}
    </Squircle>
  );
}

function ExplainButton({
  term,
  onOpen,
  className = "",
}: {
  term: GlossaryKey;
  onOpen: (term: GlossaryKey) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(term)}
      className={`inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full bg-[#edf5ff] px-3 text-[11px] font-semibold text-[#0a4f9e] transition-[background-color,box-shadow,scale] duration-150 ease-out hover:bg-[#e4f0ff] hover:shadow-[0_10px_22px_-18px_rgba(6,61,125,0.45)] active:scale-[0.96] ${className}`}
    >
      <Info size={12} />
      {GLOSSARY[term].title}
    </button>
  );
}

function DiagramCard({
  item,
  onOpen,
  tile = false,
  compactTile = false,
}: {
  item: DiagramItem;
  onOpen: (term: GlossaryKey) => void;
  tile?: boolean;
  compactTile?: boolean;
}) {
  const Icon = item.icon;
  const content = (
    <>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          item.logoSrc
            ? "bg-white"
            : item.tone
              ? TERM_TONE[item.tone]
              : "bg-[#f1f7ff] text-[#0a4f9e]"
        }`}
      >
        {item.logoSrc ? (
          <Image
            src={item.logoSrc}
            alt={item.logoAlt ?? ""}
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
          />
        ) : (
          <Icon size={16} />
        )}
      </span>
      <span className={`min-w-0 ${tile ? "sm:text-center" : ""}`}>
        <span className="block text-[12.5px] font-semibold text-slate-700">
          {item.title}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-slate-400">
          {item.detail}
        </span>
        {item.metric && (
          <span className="font-pixel mt-2 block text-[8.5px] font-bold text-[#0a4f9e]">
            {item.metric}
          </span>
        )}
      </span>
      {item.term && (
        <Info
          size={12}
          className={`shrink-0 text-[#0a4f9e]/55 ${
            tile ? "absolute right-2.5 top-2.5" : "ml-auto"
          }`}
          aria-hidden
        />
      )}
    </>
  );

  const classes = `architecture-card architecture-node relative flex w-full bg-white p-3 ${
    tile
      ? `${
          compactTile
            ? "aspect-square max-w-[140px]"
            : "aspect-square max-w-[156px]"
        } flex-col items-center justify-center gap-2 text-center`
      : "min-h-[68px] items-center gap-3 text-left"
  }`;

  if (!item.term) {
    return (
      <Squircle cornerRadius={8} className={classes}>
        {content}
      </Squircle>
    );
  }

  return (
    <SquircleButton
      cornerRadius={8}
      type="button"
      onClick={() => onOpen(item.term!)}
      aria-label={`Explain ${GLOSSARY[item.term].title}`}
      className={`${classes} cursor-pointer transition-[box-shadow,scale] duration-150 ease-out hover:shadow-[0_18px_34px_-25px_rgba(6,61,125,0.48)] active:scale-[0.96]`}
    >
      {content}
    </SquircleButton>
  );
}

function FlowArrow({ label, light = false }: { label?: string; light?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-2 text-[#0a4f9e]/35">
      {label && (
        <span
          className={`font-pixel text-[8px] uppercase tracking-[0.14em] ${
            light ? "text-blue-100/75" : "text-slate-400"
          }`}
        >
          {label}
        </span>
      )}
      <span
        className={`architecture-connector-v ${
          light ? "architecture-connector-light" : ""
        }`}
        aria-hidden
      />
    </div>
  );
}

function ResponsiveFlowConnector({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-1">
      {label && (
        <span className="font-pixel whitespace-nowrap text-[7px] font-bold uppercase tracking-[0.12em] text-slate-400">
          {label}
        </span>
      )}
      <div aria-hidden>
        <span className="architecture-connector-h hidden lg:block" />
        <span className="architecture-connector-v lg:hidden" />
      </div>
    </div>
  );
}

function DiagramLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-pixel mb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
      {children}
    </div>
  );
}

function GlossaryModal({
  term,
  onClose,
}: {
  term: GlossaryKey | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const entry = term ? GLOSSARY[term] : null;

  useEffect(() => {
    if (!entry) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [entry, onClose]);

  if (!entry) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[3px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="architecture-term-title"
        className="architecture-card architecture-modal w-full max-w-lg bg-white shadow-[0_26px_80px_-28px_rgba(2,22,47,0.5)]"
      >
        <div className="px-6 pb-7 pt-6 sm:px-9 sm:pb-9 sm:pt-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="bg-brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
                <Info size={17} />
              </span>
              <div>
                <div className="font-pixel text-[9px] font-bold uppercase tracking-[0.16em] text-[#0a4f9e]">
                  {entry.short}
                </div>
                <h2
                  id="architecture-term-title"
                  className="mt-1 text-[20px] font-semibold tracking-tight text-slate-800"
                >
                  {entry.title}
                </h2>
              </div>
            </div>
            <Squircle className="h-11 w-11 shrink-0" cornerRadius={12}>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close explanation"
                className="flex h-full w-full cursor-pointer items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition-[background-color,color,scale] duration-150 ease-out hover:bg-slate-100 hover:text-slate-800 active:scale-[0.96]"
              >
                <X size={18} />
              </button>
            </Squircle>
          </div>

          <p className="mt-5 text-[14px] leading-relaxed text-slate-600">
            {entry.plain}
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Squircle cornerRadius={8} className="architecture-card bg-[#f3f8ff] p-4">
              <div className="font-pixel text-[9px] font-bold uppercase tracking-[0.14em] text-[#0a4f9e]">
                Simple example
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600">
                {entry.example}
              </p>
            </Squircle>
            <Squircle cornerRadius={8} className="architecture-card bg-emerald-50 p-4">
              <div className="font-pixel text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                Why it matters
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600">
                {entry.why}
              </p>
            </Squircle>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HowItWorksPage() {
  const router = useRouter();
  const [activeTerm, setActiveTerm] = useState<GlossaryKey | null>(null);
  const [presentationMode, setPresentationMode] = useState(false);
  const [presentationSlide, setPresentationSlide] = useState(0);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const presentationScrollRef = useRef<HTMLDivElement>(null);

  const openTerm = (term: GlossaryKey) => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    setActiveTerm(term);
  };

  const closeTerm = () => {
    setActiveTerm(null);
    requestAnimationFrame(() => returnFocusRef.current?.focus());
  };

  const goToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const startPresentation = () => {
    setPresentationSlide(0);
    setPresentationMode(true);
  };

  useEffect(() => {
    if (!presentationMode) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (activeTerm) return;

      const isInteractiveTarget =
        event.target instanceof HTMLElement &&
        Boolean(event.target.closest("button, a, input, textarea, select"));

      if (
        event.key === "ArrowRight" ||
        event.key === "PageDown" ||
        (event.code === "Space" && !isInteractiveTarget)
      ) {
        event.preventDefault();
        setPresentationSlide((current) =>
          Math.min(current + 1, PRESENTATION_SLIDES.length - 1),
        );
      }

      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        setPresentationSlide((current) => Math.max(current - 1, 0));
      }

      if (event.key === "Home") {
        event.preventDefault();
        setPresentationSlide(0);
      }

      if (event.key === "End") {
        event.preventDefault();
        setPresentationSlide(PRESENTATION_SLIDES.length - 1);
      }

      if (event.key === "Escape") {
        setPresentationMode(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeTerm, presentationMode]);

  useEffect(() => {
    if (presentationMode) {
      presentationScrollRef.current?.scrollTo({ top: 0 });
    }
  }, [presentationMode, presentationSlide]);

  return (
    <div
      data-presentation-mode={presentationMode ? "true" : "false"}
      className={
        presentationMode
          ? "fixed inset-0 z-[70] bg-[#f7faff]"
          : "scrollbar-subtle flex-1 overflow-y-auto"
      }
    >
      {presentationMode && (
        <>
          <div
            role="region"
            aria-label="Presentation controls"
            className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between bg-white/88 px-4 shadow-[0_12px_32px_-26px_rgba(6,61,125,0.45)] backdrop-blur-xl sm:px-7"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="bg-brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white">
                <Play size={16} className="ml-px" fill="currentColor" />
              </span>
              <div className="min-w-0">
                <div className="font-pixel text-[8px] font-bold uppercase tracking-[0.15em] text-[#0a4f9e]">
                  Technical architecture review
                </div>
                <div
                  className="truncate text-[12px] font-semibold text-slate-700"
                  aria-live="polite"
                >
                  {presentationSlide + 1}.{" "}
                  {PRESENTATION_SLIDES[presentationSlide].label}
                </div>
              </div>
            </div>
            <div className="hidden text-[10.5px] text-slate-400 md:block">
              Use ← →, Page Up, Page Down, or Space
            </div>
            <SquircleButton
              type="button"
              onClick={() => setPresentationMode(false)}
              aria-label="Exit presentation mode"
              className="flex h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 text-[11px] font-semibold text-slate-600 transition-[background-color,color,scale] duration-150 ease-out hover:bg-slate-200 hover:text-slate-800 active:scale-[0.96]"
            >
              <X size={16} />
              <span className="hidden sm:inline">Exit</span>
            </SquircleButton>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-40 bg-white/88 px-4 py-3 shadow-[0_-12px_32px_-26px_rgba(6,61,125,0.45)] backdrop-blur-xl sm:px-7">
            <div className="mx-auto flex max-w-6xl items-center gap-3">
              <SquircleButton
                type="button"
                onClick={() =>
                  setPresentationSlide((current) => Math.max(current - 1, 0))
                }
                disabled={presentationSlide === 0}
                aria-label="Previous slide"
                className="flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-[background-color,color,opacity,scale] duration-150 ease-out hover:bg-slate-200 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronLeft size={18} />
              </SquircleButton>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold text-slate-400">
                  <span>{PRESENTATION_SLIDES[presentationSlide].label}</span>
                  <span className="font-pixel tabular-nums">
                    {String(presentationSlide + 1).padStart(2, "0")} /{" "}
                    {String(PRESENTATION_SLIDES.length).padStart(2, "0")}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="bg-brand-gradient h-full rounded-full transition-[width] duration-200 ease-out"
                    style={{
                      width: `${((presentationSlide + 1) / PRESENTATION_SLIDES.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <SquircleButton
                type="button"
                onClick={() =>
                  setPresentationSlide((current) =>
                    Math.min(current + 1, PRESENTATION_SLIDES.length - 1),
                  )
                }
                disabled={presentationSlide === PRESENTATION_SLIDES.length - 1}
                aria-label="Next slide"
                className="bg-brand-gradient flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl text-white shadow-[0_12px_26px_-18px_rgba(6,61,125,0.65)] transition-[filter,opacity,scale] duration-150 ease-out hover:brightness-105 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronRight size={18} />
              </SquircleButton>
            </div>
          </div>
        </>
      )}

      <div
        ref={presentationScrollRef}
        className={
          presentationMode
            ? "scrollbar-subtle h-full overflow-y-auto px-4 pb-24 pt-20 sm:px-8 lg:px-12"
            : "mx-auto w-full max-w-5xl px-5 py-8 sm:px-7"
        }
      >
        {!presentationMode && (
          <>
            <button
              type="button"
              onClick={() => router.push("/agent")}
              className="group flex min-h-11 cursor-pointer items-center gap-2 rounded-full pr-3 text-[13px] font-medium text-slate-500 transition-[color,scale] duration-150 ease-out hover:text-[#0a4f9e] active:scale-[0.96]"
            >
              <ArrowLeft
                size={16}
                className="transition-transform duration-150 ease-out group-hover:-translate-x-0.5"
              />
              Back to conversation
            </button>

            <header className="mt-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-pixel rounded-full bg-emerald-50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-700">
                  Production architecture
                </span>
                <span className="font-pixel rounded-full bg-[#edf5ff] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-[#0a4f9e]">
                  Judge review
                </span>
              </div>
              <h1 className="mt-4 max-w-3xl text-balance text-[30px] font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-[38px]">
                eGov Agent production architecture
              </h1>
              <p className="mt-3 max-w-3xl text-pretty text-[15px] leading-relaxed text-slate-500">
                This reference architecture separates client applications,
                frontend rendering, the backend control plane, integration
                APIs, and agency systems of record. AI helps interpret
                requests, while backend policy, consent, and official APIs
                authorize every real action.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <ExplainButton term="headless" onOpen={openTerm} />
                <ExplainButton term="cloudAgnostic" onOpen={openTerm} />
                <ExplainButton term="orchestrator" onOpen={openTerm} />
                <ExplainButton term="generativeUi" onOpen={openTerm} />
                <ExplainButton term="pii" onOpen={openTerm} />
              </div>
              <SquircleButton
                type="button"
                onClick={startPresentation}
                className="bg-brand-gradient mt-5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-4 text-[12px] font-semibold text-white shadow-[0_14px_28px_-20px_rgba(6,61,125,0.72)] transition-[filter,scale] duration-150 ease-out hover:brightness-105 active:scale-[0.96]"
              >
                <Play size={15} fill="currentColor" />
                Open judge presentation
              </SquircleButton>
            </header>

            <nav
              aria-label="Technical architecture review sections"
              className="sticky top-0 z-20 -mx-5 mt-7 flex flex-wrap gap-1.5 border-y border-slate-200/65 bg-[#f7faff]/90 px-5 py-2.5 backdrop-blur-xl sm:-mx-7 sm:px-7"
            >
              {[
                ["architecture", "System map"],
                ["apis", "9 APIs"],
                ["request", "Request"],
                ["data", "Vault + memory"],
                ["safety", "Safety"],
                ["reliability", "Reliability"],
                ["costs", "Costs"],
              ].map(([id, label], index) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => goToSection(id)}
                  className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 text-[10.5px] font-semibold text-slate-500 transition-[color,background-color,box-shadow,scale] duration-150 ease-out hover:bg-[#edf5ff] hover:text-[#0a4f9e] hover:shadow-[0_10px_22px_-18px_rgba(6,61,125,0.35)] active:scale-[0.96]"
                >
                  <span className="font-pixel text-[8px] text-[#0a4f9e]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {label}
                </button>
              ))}
            </nav>
          </>
        )}

        <div
          className={
            presentationMode
              ? "mx-auto min-h-full w-full max-w-6xl"
              : "mt-9 space-y-10"
          }
        >
          <Section
            id="big-picture"
            number="01"
            title="Client, frontend, and backend"
            caption="Multiple client applications use one frontend contract and one secured backend control plane."
            presentationMode={presentationMode}
            active={presentationSlide === 0}
          >
            <Squircle cornerRadius={8} className="architecture-card bg-[#f8fafc] p-3 sm:p-5">
              <div className="grid items-center gap-3 lg:grid-cols-[1fr_auto_0.82fr_auto_1fr]">
                <Squircle cornerRadius={12} className="architecture-boundary p-3">
                  <DiagramLabel>Client / frontend layer</DiagramLabel>
                  <div className="grid grid-cols-2 justify-items-center gap-2">
                    {CHANNELS.map((item) => (
                      <DiagramCard
                        key={item.title}
                        item={item}
                        onOpen={openTerm}
                        tile
                      />
                    ))}
                  </div>
                </Squircle>

                <ResponsiveFlowConnector label="HTTPS / JSON" />

                <SquircleButton
                  cornerRadius={8}
                  type="button"
                  onClick={() => openTerm("headless")}
                  className="architecture-card architecture-node bg-brand-gradient relative mx-auto flex aspect-square w-full max-w-[230px] cursor-pointer flex-col items-center justify-center gap-3 px-5 text-center text-white transition-[filter,scale] duration-150 ease-out hover:brightness-105 active:scale-[0.96]"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                    <Network size={21} />
                  </span>
                  <span>
                    <span className="block text-[16px] font-semibold">
                      Agent backend
                    </span>
                    <span className="mt-1 block text-[12px] leading-relaxed text-blue-100">
                      Orchestration · policy · workflow state
                    </span>
                  </span>
                  <Info
                    size={14}
                    className="absolute right-3 top-3 shrink-0 text-white/65"
                  />
                </SquircleButton>

                <ResponsiveFlowConnector label="REST APIs / events" />

                <Squircle cornerRadius={12} className="architecture-boundary p-3">
                  <DiagramLabel>Integration / API layer</DiagramLabel>
                  <div className="grid grid-cols-2 justify-items-center gap-2">
                    <DiagramCard
                      item={{
                        title: "Shared service APIs",
                        detail: "Identity, AI, payment and messaging",
                        icon: Layers3,
                        logoSrc: "/agency-logos/egovph.svg",
                        logoAlt: "eGovPH",
                      }}
                      onOpen={openTerm}
                      tile
                    />
                    <DiagramCard
                      item={{
                        title: "eGovDX",
                        detail: "Government integration gateway",
                        icon: Route,
                        term: "egovDx",
                      }}
                      onOpen={openTerm}
                      tile
                    />
                    <DiagramCard
                      item={{
                        title: "Agency backends",
                        detail: "Systems of record and transactions",
                        icon: Landmark,
                        term: "systemOfRecord",
                      }}
                      onOpen={openTerm}
                      tile
                    />
                  </div>
                </Squircle>
              </div>

              <FlowArrow label="Validated response payload" />

              <Squircle cornerRadius={12} className="architecture-boundary p-3">
                <DiagramLabel>Client-rendered frontend outputs</DiagramLabel>
                <div className="grid grid-cols-2 justify-items-center gap-2 sm:grid-cols-4">
                  {[
                    ["Form", FileText],
                    ["Appointment", Timer],
                    ["Receipt", FileCheck2],
                    ["Status tracker", Gauge],
                  ].map(([label, Icon]) => {
                    const ResultIcon = Icon as LucideIcon;
                    return (
                      <Squircle
                        cornerRadius={8}
                        key={label as string}
                        className="architecture-card architecture-node flex aspect-square w-full max-w-[112px] flex-col items-center justify-center gap-2 bg-white px-3 text-center text-[11.5px] font-semibold text-slate-700"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                          <ResultIcon size={15} />
                        </span>
                        {label as string}
                      </Squircle>
                    );
                  })}
                </div>
              </Squircle>
            </Squircle>
            <p className="mt-4 text-[13px] leading-relaxed text-slate-500">
              The client or frontend can change without rewriting the backend
              policies, workflows, integration APIs, or agency systems of
              record.
            </p>
          </Section>

          <Section
            id="architecture"
            number="02"
            title="Backend and integration architecture"
            caption="The frontend calls the API gateway. Only the backend control plane can access eGov and agency APIs."
            presentationMode={presentationMode}
            active={presentationSlide === 1}
          >
            <div className="space-y-2">
              <DiagramLabel>1. Edge and API gateway</DiagramLabel>
              <div className="grid grid-cols-2 justify-items-center gap-2 sm:grid-cols-3">
                {[
                  {
                    title: "API gateway",
                    detail: "WAF, limits and tracking IDs",
                    icon: ShieldCheck,
                    term: "apiGateway" as GlossaryKey,
                  },
                  {
                    title: "eGovPH SSO",
                    detail: "OAuth 2.0 session",
                    icon: KeyRound,
                    logoSrc: "/agency-logos/egovph.svg",
                    logoAlt: "eGovPH",
                    term: "oauth" as GlossaryKey,
                  },
                  {
                    title: "Step-up identity",
                    detail: "eVerify and Face Liveness",
                    icon: ScanFace,
                    logoSrc: "/agency-logos/philsys.png",
                    logoAlt: "PhilSys",
                    term: "liveness" as GlossaryKey,
                  },
                ].map((item) => (
                  <DiagramCard
                    key={item.title}
                    item={item}
                    onOpen={openTerm}
                    tile
                  />
                ))}
              </div>

              <FlowArrow />

              <DiagramLabel>2. Backend control plane</DiagramLabel>
              <Squircle cornerRadius={8} className="architecture-card bg-[#0a4f9e] p-3 shadow-[0_24px_52px_-30px_rgba(6,61,125,0.72)] sm:p-5">
                <div className="grid grid-cols-2 justify-items-center gap-2 lg:grid-cols-4">
                  {[
                    {
                      title: "Agent orchestration runtime",
                      detail: "Typed tool calling and session state",
                      icon: Workflow,
                      term: "orchestrator" as GlossaryKey,
                    },
                    {
                      title: "Intent classification service",
                      detail: "Structured inference through eGovAI",
                      icon: Brain,
                      term: "egovAi" as GlossaryKey,
                    },
                    {
                      title: "Authorization policy engine",
                      detail: "Deterministic rules and human approval",
                      icon: ShieldCheck,
                      term: "policy" as GlossaryKey,
                    },
                    {
                      title: "Sandbox and eval pipeline",
                      detail: "Isolated execution and behavior tests",
                      icon: Box,
                      term: "sandbox" as GlossaryKey,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <SquircleButton
                        cornerRadius={8}
                        key={item.title}
                        type="button"
                        onClick={() => openTerm(item.term)}
                        className="architecture-card relative flex aspect-square w-full max-w-[156px] cursor-pointer flex-col items-center justify-center gap-2 bg-white/10 p-3 text-center text-white transition-[background-color,scale] duration-150 ease-out hover:bg-white/15 active:scale-[0.96]"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                          <Icon size={16} />
                        </span>
                        <span>
                          <span className="block text-[12.5px] font-semibold">
                            {item.title}
                          </span>
                          <span className="mt-0.5 block text-[10.5px] leading-snug text-blue-100">
                            {item.detail}
                          </span>
                        </span>
                      </SquircleButton>
                    );
                  })}
                </div>
              </Squircle>

              <FlowArrow />

              <div className="grid gap-3 lg:grid-cols-2">
                <div>
                  <DiagramLabel>3. Encrypted data layer</DiagramLabel>
                  <div className="grid grid-cols-2 justify-items-center gap-2 sm:grid-cols-3">
                    <DiagramCard
                      item={{
                        title: "Context memory store",
                        detail: "Sourced records with TTL and purpose",
                        icon: Brain,
                        term: "memory",
                      }}
                      onOpen={openTerm}
                      tile
                    />
                    <DiagramCard
                      item={{
                        title: "Encrypted object vault",
                        detail: "KMS-backed document storage",
                        icon: Vault,
                        term: "vault",
                      }}
                      onOpen={openTerm}
                      tile
                    />
                    <DiagramCard
                      item={{
                        title: "Append-only audit log",
                        detail: "Immutable access and decision events",
                        icon: ScrollText,
                        term: "audit",
                      }}
                      onOpen={openTerm}
                      tile
                    />
                  </div>
                </div>
                <div>
                  <DiagramLabel>4. Integration and systems of record</DiagramLabel>
                  <div className="grid grid-cols-2 justify-items-center gap-2 sm:grid-cols-3">
                    <DiagramCard
                      item={{
                        title: "eGov service APIs",
                        detail: "Authenticated platform capabilities",
                        icon: Layers3,
                        logoSrc: "/agency-logos/egovph.svg",
                        logoAlt: "eGovPH",
                      }}
                      onOpen={openTerm}
                      tile
                    />
                    <DiagramCard
                      item={{
                        title: "eGovDX gateway",
                        detail: "Agency and LGU integration fabric",
                        icon: Route,
                        term: "egovDx",
                      }}
                      onOpen={openTerm}
                      tile
                    />
                    <DiagramCard
                      item={{
                        title: "Agency backends",
                        detail: "Authoritative systems of record",
                        icon: Landmark,
                        term: "systemOfRecord",
                      }}
                      onOpen={openTerm}
                      tile
                    />
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <Section
            id="apis"
            number="03"
            title="Service API integration layer"
            caption="The backend orchestrator calls nine typed eGov APIs through authenticated, policy-controlled adapters."
            presentationMode={presentationMode}
            active={presentationSlide === 2}
          >
            <div className="relative bg-[radial-gradient(circle_at_center,rgba(10,79,158,0.1),transparent_58%)] p-3 sm:p-5">
              <div className="grid grid-cols-2 justify-items-center gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {EGOV_APIS.map((item) => (
                  <DiagramCard
                    key={item.title}
                    item={item}
                    onOpen={openTerm}
                    tile
                  />
                ))}
                <SquircleButton
                  cornerRadius={8}
                  type="button"
                  onClick={() => openTerm("orchestrator")}
                  className="architecture-card bg-brand-gradient relative flex aspect-square w-full max-w-[156px] cursor-pointer flex-col items-center justify-center gap-2 px-3 text-center text-white shadow-[0_18px_40px_-24px_rgba(6,61,125,0.72)] transition-[filter,scale] duration-150 ease-out hover:brightness-105 active:scale-[0.96]"
                >
                  <Network size={18} />
                  <span>
                    <span className="block text-[13.5px] font-semibold">
                      Backend orchestrator
                    </span>
                    <span className="mt-0.5 block text-[10.5px] text-blue-100">
                      Executes typed service calls in dependency order
                    </span>
                  </span>
                  <Info
                    size={12}
                    className="absolute right-2.5 top-2.5 text-white/65"
                  />
                </SquircleButton>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <ExplainButton term="egovDx" onOpen={openTerm} />
              <ExplainButton term="systemOfRecord" onOpen={openTerm} />
            </div>
          </Section>

          <Section
            id="request"
            number="04"
            title="Backend request lifecycle"
            caption="A client request becomes a verified government transaction through eight controlled backend steps."
            presentationMode={presentationMode}
            active={presentationSlide === 3}
          >
            <div className="grid grid-cols-2 justify-items-center gap-3 lg:grid-cols-4">
              {REQUEST_STEPS.map((item, index) => (
                <div
                  key={item.title}
                  className="relative flex w-full justify-center"
                >
                  <DiagramCard item={item} onOpen={openTerm} tile />
                  {index < REQUEST_STEPS.length - 1 &&
                    index % 4 !== 3 && (
                      <span
                        aria-hidden
                        className="architecture-connector-h absolute -right-3 top-1/2 hidden -translate-y-1/2 lg:block"
                      />
                    )}
                </div>
              ))}
            </div>

            <Panel className="mt-2 bg-[linear-gradient(135deg,#f2f7ff,#ffffff)]">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <CheckCircle2 size={18} />
                </span>
                <div>
                  <div className="text-[13.5px] font-semibold text-slate-700">
                    A frontend success state is not proof
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">
                    The workflow checks the official API or agency system again
                    before showing a booking, payment, report, or document as
                    complete.
                  </p>
                </div>
              </div>
            </Panel>
          </Section>

          <Section
            id="data"
            number="05"
            title="Encrypted data layer: vault and memory"
            caption="Object storage handles encrypted files. The memory store handles approved context with provenance and expiry."
            presentationMode={presentationMode}
            active={presentationSlide === 4}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf5ff] text-[#0a4f9e]">
                    <Vault size={17} />
                  </span>
                  <div>
                    <div className="text-[13.5px] font-semibold text-slate-700">
                      Document vault
                    </div>
                    <button
                      type="button"
                      onClick={() => openTerm("vault")}
                      className="mt-0.5 cursor-pointer text-[11px] font-medium text-[#0a4f9e] transition-[color,scale] duration-150 ease-out hover:text-[#073c78] active:scale-[0.96]"
                    >
                      What makes it safe?
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 justify-items-center gap-2 sm:grid-cols-3">
                  {VAULT_STEPS.map((item) => (
                    <DiagramCard
                      key={item.title}
                      item={item}
                      onOpen={openTerm}
                      tile
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                    <Brain size={17} />
                  </span>
                  <div>
                    <div className="text-[13.5px] font-semibold text-slate-700">
                      Personal context memory
                    </div>
                    <button
                      type="button"
                      onClick={() => openTerm("provenance")}
                      className="mt-0.5 cursor-pointer text-[11px] font-medium text-[#0a4f9e] transition-[color,scale] duration-150 ease-out hover:text-[#073c78] active:scale-[0.96]"
                    >
                      How does it know the source?
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 justify-items-center gap-2 sm:grid-cols-3">
                  {MEMORY_SOURCES.map((item) => (
                    <DiagramCard
                      key={item.title}
                      item={item}
                      onOpen={openTerm}
                      tile
                    />
                  ))}
                </div>
                <FlowArrow label="Purpose + consent filter" />
                <SquircleButton
                  cornerRadius={8}
                  type="button"
                  onClick={() => openTerm("memory")}
                  className="architecture-card mx-auto flex aspect-[3/2] w-full max-w-[300px] cursor-pointer flex-col items-center justify-center gap-3 bg-violet-700 p-4 text-center text-white shadow-[0_18px_38px_-26px_rgba(109,40,217,0.68)] transition-[filter,scale] duration-150 ease-out hover:brightness-105 active:scale-[0.96]"
                >
                  <Brain size={21} />
                  <span>
                    <span className="block text-[13.5px] font-semibold">
                      Minimum context bundle
                    </span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-violet-100">
                      Only the facts allowed for this request, with source and
                      expiry
                    </span>
                  </span>
                </SquircleButton>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {["Correct", "Revoke", "Expire"].map((label) => (
                    <Squircle
                      cornerRadius={8}
                      key={label}
                      className="architecture-card bg-white px-2 py-3 text-center text-[10.5px] font-semibold text-slate-500 shadow-[0_10px_24px_-22px_rgba(6,61,125,0.3)]"
                    >
                      {label}
                    </Squircle>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          <Section
            id="generative-ui"
            number="06"
            title="Schema-driven frontend rendering"
            caption="The backend returns a validated UI schema. The frontend renders only approved components, never model-generated code."
            presentationMode={presentationMode}
            active={presentationSlide === 5}
          >
            <div className="grid items-stretch gap-2 lg:grid-cols-[1fr_auto_1fr_auto_1.6fr]">
              <SquircleButton
                cornerRadius={8}
                type="button"
                onClick={() => openTerm("orchestrator")}
                className="architecture-card flex aspect-square w-full max-w-[156px] cursor-pointer flex-col items-center justify-center gap-2 justify-self-center bg-white p-3 text-center shadow-[0_12px_30px_-25px_rgba(6,61,125,0.35)] transition-[box-shadow,scale] duration-150 ease-out hover:shadow-[0_18px_34px_-25px_rgba(6,61,125,0.48)] active:scale-[0.96]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf5ff] text-[#0a4f9e]">
                  <Workflow size={16} />
                </span>
                <span>
                  <span className="block text-[12.5px] font-semibold text-slate-700">
                    Typed execution plan
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-400">
                    Intent, dependencies and tool calls
                  </span>
                </span>
              </SquircleButton>
              <ResponsiveFlowConnector />
              <SquircleButton
                cornerRadius={8}
                type="button"
                onClick={() => openTerm("schema")}
                className="architecture-card flex aspect-square w-full max-w-[156px] cursor-pointer flex-col items-center justify-center gap-2 justify-self-center bg-[#0a4f9e] p-3 text-center text-white shadow-[0_18px_38px_-28px_rgba(6,61,125,0.7)] transition-[filter,scale] duration-150 ease-out hover:brightness-105 active:scale-[0.96]"
              >
                <Code2 size={18} />
                <span>
                  <span className="block text-[12.5px] font-semibold">
                    UI schema validator
                  </span>
                  <span className="mt-0.5 block text-[11px] text-blue-100">
                    Rejects unknown components and fields
                  </span>
                </span>
              </SquircleButton>
              <ResponsiveFlowConnector />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {UI_COMPONENTS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Squircle
                      cornerRadius={8}
                      key={item.title}
                      className="architecture-card flex aspect-square w-full flex-col items-center justify-center bg-white p-2 text-center shadow-[0_12px_28px_-24px_rgba(6,61,125,0.32)]"
                    >
                      <Icon size={15} className="text-[#0a4f9e]" />
                      <div className="mt-1.5 text-[10.5px] font-semibold text-slate-600">
                        {item.title}
                      </div>
                    </Squircle>
                  );
                })}
              </div>
            </div>
            <div className="mt-4">
              <ExplainButton term="generativeUi" onOpen={openTerm} />
            </div>
          </Section>

          <Section
            id="safety"
            number="07"
            title="Backend PII controls and AI guardrails"
            caption="PII remains inside the trusted backend boundary. Models propose outputs, while deterministic policy authorizes actions."
            presentationMode={presentationMode}
            active={presentationSlide === 6}
          >
            <Squircle cornerRadius={8} className="architecture-card bg-[linear-gradient(145deg,#f8fbff,#eef6ff)] p-3 sm:p-5">
              <div className="grid grid-cols-2 justify-items-center gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {GUARDRAILS.map((item, index) => (
                  <div
                    key={item.title}
                    className="relative flex w-full justify-center"
                  >
                    <DiagramCard item={item} onOpen={openTerm} tile />
                    {index < GUARDRAILS.length - 1 && (
                      <span
                        aria-hidden
                        className="architecture-connector-h absolute -right-3 top-1/2 hidden -translate-y-1/2 lg:block"
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 justify-items-center gap-2 sm:grid-cols-4">
                {[
                  ["Encrypted", Lock],
                  ["Short-lived access", Timer],
                  ["No AI training", Brain],
                  ["Fully logged", ScrollText],
                ].map(([label, Icon]) => {
                  const GuardIcon = Icon as LucideIcon;
                  return (
                    <Squircle
                      cornerRadius={8}
                      key={label as string}
                      className="architecture-card flex aspect-square w-full max-w-[124px] flex-col items-center justify-center gap-2 bg-emerald-600 px-3 text-center text-[10.5px] font-semibold text-white"
                    >
                      <GuardIcon size={14} />
                      {label as string}
                    </Squircle>
                  );
                })}
              </div>
            </Squircle>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Panel>
                <DiagramLabel>Citizen device</DiagramLabel>
                <div className="flex items-center gap-3">
                  <Smartphone size={18} className="text-slate-400" />
                  <span className="text-[12px] leading-relaxed text-slate-500">
                    Screen and short session only
                  </span>
                </div>
              </Panel>
              <Panel className="bg-[#f2f7ff]">
                <DiagramLabel>Government zone</DiagramLabel>
                <div className="flex items-center gap-3">
                  <Server size={18} className="text-[#0a4f9e]" />
                  <span className="text-[12px] leading-relaxed text-slate-600">
                    PII, vault, memory, policy and audit
                  </span>
                </div>
              </Panel>
              <Panel>
                <DiagramLabel>eGovAI request</DiagramLabel>
                <div className="flex items-center gap-3">
                  <Brain size={18} className="text-violet-600" />
                  <span className="text-[12px] leading-relaxed text-slate-500">
                    Minimum approved context only
                  </span>
                </div>
              </Panel>
            </div>
          </Section>

          <Section
            id="reliability"
            number="08"
            title="Durable backend workflows and payments"
            caption="The workflow engine persists state, retries idempotently, and verifies payment status against official backends."
            presentationMode={presentationMode}
            active={presentationSlide === 7}
          >
            <DiagramLabel>Every task has a visible state</DiagramLabel>
            <div className="grid grid-cols-2 justify-items-center gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {WORKFLOW_STATES.map((state, index) => (
                <div
                  key={state.label}
                  className="relative flex w-full justify-center"
                >
                  <Squircle
                    cornerRadius={8}
                    className={`architecture-card flex aspect-square w-full max-w-[124px] items-center justify-center px-2 text-center text-[10.5px] font-semibold ${state.tone}`}
                  >
                    {state.label}
                  </Squircle>
                  {index < WORKFLOW_STATES.length - 1 && (
                    <span
                      aria-hidden
                      className="architecture-connector-h absolute -right-5 top-1/2 z-10 hidden -translate-y-1/2 lg:block"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1.3fr_1fr]">
              <Panel>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13.5px] font-semibold text-slate-700">
                      Secure eGovPay flow
                    </div>
                    <p className="mt-1 text-[11.5px] text-slate-400">
                      Payment credentials never enter eGov Agent.
                    </p>
                  </div>
                  <CreditCard size={19} className="text-[#0a4f9e]" />
                </div>
                <div className="mt-4 space-y-1">
                  {[
                    ["1", "Create one order", "Unique transaction ID"],
                    ["2", "Open eGovPay", "Hosted checkout"],
                    ["3", "Receive update", "Webhook or status check"],
                    ["4", "Read back status", "eGovPay and agency ledger"],
                    ["5", "Show receipt", "Only after confirmation"],
                  ].map(([n, title, detail], index) => (
                    <div key={n}>
                      <Squircle cornerRadius={8} className="architecture-card flex min-h-14 items-center gap-3 bg-slate-50 px-3">
                        <span className="font-pixel flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[9px] font-bold text-[#0a4f9e] shadow-[0_8px_18px_-16px_rgba(6,61,125,0.3)]">
                          {n}
                        </span>
                        <span>
                          <span className="block text-[11.5px] font-semibold text-slate-600">
                            {title}
                          </span>
                          <span className="block text-[10.5px] text-slate-400">
                            {detail}
                          </span>
                        </span>
                      </Squircle>
                      {index < 4 && (
                        <div className="architecture-connector-v ml-6" />
                      )}
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel>
                <div className="text-[13.5px] font-semibold text-slate-700">
                  What if something fails?
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    {
                      icon: Timer,
                      title: "API is offline",
                      text: "Keep the task pending and retry with backoff.",
                    },
                    {
                      icon: RefreshCcw,
                      title: "Network drops",
                      text: "Use the same idempotency key, not a new action.",
                    },
                    {
                      icon: TriangleAlert,
                      title: "Partial success",
                      text: "Show the real status and start safe recovery.",
                    },
                    {
                      icon: UserCheck,
                      title: "Automation stops",
                      text: "Move the case to human review with full history.",
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                          <Icon size={14} />
                        </span>
                        <div>
                          <div className="text-[11.5px] font-semibold text-slate-600">
                            {item.title}
                          </div>
                          <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-400">
                            {item.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ExplainButton term="idempotency" onOpen={openTerm} />
                  <ExplainButton term="webhook" onOpen={openTerm} />
                </div>
              </Panel>
            </div>
          </Section>

          <Section
            id="stack"
            number="09"
            title="Cloud-agnostic deployment architecture"
            caption="Frontend, backend, data, security, and integration components map to approved government infrastructure."
            presentationMode={presentationMode}
            active={presentationSlide === 8}
          >
            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <div className="space-y-2">
                <DiagramLabel>Portable deployment layers</DiagramLabel>
                <div className="grid grid-cols-2 justify-items-center gap-3 sm:grid-cols-3">
                  {STACK_LAYERS.map((layer, index) => {
                    const Icon = layer.icon;
                    return (
                      <SquircleButton
                        cornerRadius={8}
                        key={layer.title}
                        type="button"
                        onClick={() => openTerm(layer.term)}
                        className="architecture-card relative flex aspect-square w-full max-w-[156px] cursor-pointer flex-col items-center justify-center gap-2 bg-white p-3 text-center shadow-[0_14px_34px_-28px_rgba(6,61,125,0.35)] transition-[box-shadow,scale] duration-150 ease-out hover:shadow-[0_18px_34px_-25px_rgba(6,61,125,0.48)] active:scale-[0.96]"
                      >
                        <span className="font-pixel absolute left-2.5 top-2.5 text-[8px] font-bold text-[#0a4f9e]/55">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="bg-brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
                          <Icon size={17} />
                        </span>
                        <span>
                          <span className="block text-[12.5px] font-semibold text-slate-700">
                            {layer.title}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-400">
                            {layer.tech}
                          </span>
                        </span>
                        <Info
                          size={12}
                          className="absolute right-2.5 top-2.5 shrink-0 text-[#0a4f9e]/55"
                        />
                      </SquircleButton>
                    );
                  })}
                </div>
              </div>

              <div>
                <DiagramLabel>Choose the approved cloud</DiagramLabel>
                <Squircle cornerRadius={8} className="architecture-card bg-[linear-gradient(145deg,#0a4f9e,#063d7d)] p-4 text-white shadow-[0_22px_46px_-30px_rgba(6,61,125,0.72)]">
                  <SquircleButton
                    cornerRadius={8}
                    type="button"
                    onClick={() => openTerm("cloudAgnostic")}
                    className="architecture-card flex min-h-[76px] w-full cursor-pointer items-center gap-3 bg-white/10 p-3 text-left transition-[background-color,scale] duration-150 ease-out hover:bg-white/15 active:scale-[0.96]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                      <Box size={18} />
                    </span>
                    <span>
                      <span className="block text-[12.5px] font-semibold">
                        Portable backend deployment package
                      </span>
                      <span className="mt-0.5 block text-[10.5px] leading-relaxed text-blue-100">
                        Containers · REST APIs · event queues · telemetry
                      </span>
                    </span>
                    <Info size={12} className="ml-auto text-blue-100" />
                  </SquircleButton>

                  <FlowArrow label="Provider adapters" light />

                  <div className="grid grid-cols-2 justify-items-center gap-2">
                    {[
                      {
                        name: "GCP",
                        logo: "/architecture-logos/google-cloud.svg",
                        alt: "Google Cloud",
                      },
                      {
                        name: "AWS",
                        logo: "/architecture-logos/aws.svg",
                        alt: "Amazon Web Services",
                      },
                      {
                        name: "Azure",
                        logo: "/architecture-logos/azure.svg",
                        alt: "Microsoft Azure",
                      },
                      {
                        name: "eGov stack",
                        logo: "/dict.svg",
                        alt: "Department of Information and Communications Technology",
                      },
                    ].map((cloud) => (
                      <Squircle
                        cornerRadius={8}
                        key={cloud.name}
                        className="architecture-card flex aspect-square w-full max-w-[132px] flex-col items-center justify-center bg-white px-2 text-center"
                      >
                        <Image
                          src={cloud.logo}
                          alt={cloud.alt}
                          width={28}
                          height={28}
                          className="h-7 w-7 object-contain"
                        />
                        <div className="mt-1.5 text-[11px] font-bold text-slate-700">
                          {cloud.name}
                        </div>
                        <div className="mt-0.5 text-[8.5px] leading-tight text-slate-400">
                          Compute · data · keys
                        </div>
                      </Squircle>
                    ))}
                  </div>
                </Squircle>

                <Panel className="mt-3 bg-amber-50">
                  <div className="flex items-start gap-3">
                    <Info
                      size={17}
                      className="mt-0.5 shrink-0 text-amber-700"
                    />
                    <div>
                      <div className="text-[11.5px] font-semibold text-amber-800">
                        Integration compatibility
                      </div>
                      <p className="mt-1 text-[10.5px] leading-relaxed text-amber-800/70">
                        No specific agent framework or cloud is required. The
                        eGov team can connect its approved runtime, identity,
                        data, security, and observability services through
                        standard APIs and replaceable adapters.
                      </p>
                    </div>
                  </div>
                </Panel>

                <div className="mt-3 flex flex-wrap gap-2">
                  <ExplainButton term="orchestrator" onOpen={openTerm} />
                  <ExplainButton term="cloudAgnostic" onOpen={openTerm} />
                  <ExplainButton term="evals" onOpen={openTerm} />
                </div>
              </div>
            </div>
          </Section>

          <Section
            id="costs"
            number="10"
            title="Low-cost eGov integration"
            caption="This is a thin orchestration layer, not a second government platform. It reuses approved eGov capabilities and makes no AI call for known transactions."
            presentationMode={presentationMode}
            active={presentationSlide === 9}
          >
            <Squircle cornerRadius={12} className="architecture-boundary p-3 sm:p-4">
              <DiagramLabel>Cost-aware request routing</DiagramLabel>
              <SquircleButton
                cornerRadius={8}
                type="button"
                onClick={() => openTerm("costRouting")}
                className="architecture-card architecture-node bg-brand-gradient relative mx-auto flex min-h-16 w-full max-w-sm cursor-pointer items-center gap-3 px-4 text-left text-white transition-[filter,scale] duration-150 ease-out hover:brightness-105 active:scale-[0.96]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Route size={17} />
                </span>
                <span>
                  <span className="block text-[13px] font-semibold">
                    Backend cost router
                  </span>
                  <span className="mt-0.5 block text-[10.5px] text-blue-100">
                    Intent · risk · confidence · latency budget
                  </span>
                </span>
                <Info
                  size={12}
                  className="ml-auto shrink-0 text-white/65"
                />
              </SquircleButton>

              <FlowArrow label="Escalate only when needed" />

              <div className="grid grid-cols-2 justify-items-center gap-3 sm:grid-cols-3">
                {COST_PATHS.map((item) => (
                  <DiagramCard
                    key={item.title}
                    item={item}
                    onOpen={openTerm}
                    tile
                    compactTile={presentationMode}
                  />
                ))}
              </div>
            </Squircle>

            <Squircle cornerRadius={12} className="architecture-boundary mt-3 p-3 sm:p-4">
              <DiagramLabel>Cost reduction controls</DiagramLabel>
              <div className="grid grid-cols-2 justify-items-center gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {COST_CONTROLS.map((item) => (
                  <DiagramCard
                    key={item.title}
                    item={item}
                    onOpen={openTerm}
                    tile
                    compactTile={presentationMode}
                  />
                ))}
              </div>
            </Squircle>

            <div className="mt-3 grid gap-3 lg:grid-cols-[1.35fr_1fr]">
              <Panel>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold text-slate-700">
                      Added monthly operating cost
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      ₱5,000 shared capacity allocation + ₱0.04 variable cost per transaction
                    </p>
                  </div>
                  <Gauge size={18} className="text-[#0a4f9e]" />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {COST_SCENARIOS.map((scenario) => (
                    <Squircle
                      cornerRadius={8}
                      key={scenario.volume}
                      className="architecture-card bg-slate-50 px-2 py-2.5 text-center"
                    >
                      <div className="font-pixel text-[9px] font-bold text-[#0a4f9e]">
                        {scenario.volume} transactions
                      </div>
                      <div className="mt-1 text-[10.5px] font-semibold text-slate-700">
                        {scenario.monthly}
                      </div>
                      <div className="mt-0.5 text-[9.5px] text-slate-400">
                        {scenario.unit}
                      </div>
                    </Squircle>
                  ))}
                </div>
              </Panel>

              <Panel className="bg-emerald-50">
                <div className="font-pixel text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                  Integration-mode target
                </div>
                <div className="mt-2 text-[20px] font-semibold tracking-tight text-emerald-900">
                  ≈ ₱0.04 / transaction
                </div>
                <p className="mt-1 text-[10.5px] leading-relaxed text-emerald-900/65">
                  90% × ₱0.005 + 9% × ₱0.20 + 1% × ₱1.50
                </p>
                <p className="mt-2 text-[9.5px] leading-relaxed text-emerald-900/55">
                  Sample marginal cost, not a quote. Reuses existing eGov
                  infrastructure. Excludes existing platform costs, agency API,
                  payment and carrier fees, taxes, and people.
                </p>
              </Panel>
            </div>

            {!presentationMode && (
              <div className="mt-3 flex flex-wrap gap-2">
                <ExplainButton term="costRouting" onOpen={openTerm} />
                <ExplainButton term="finOps" onOpen={openTerm} />
                <ExplainButton term="unitEconomics" onOpen={openTerm} />
                <ExplainButton term="costEstimate" onOpen={openTerm} />
              </div>
            )}
          </Section>

          <Section
            id="qa"
            number="11"
            title="Technical review answers"
            caption="Direct answers to common questions about security, integration, cost, reliability, and ownership."
            presentationMode={presentationMode}
            active={presentationSlide === 10}
          >
            <div className="grid gap-3 lg:grid-cols-2">
              {QUICK_QA.map((item) => (
                <Panel key={item.q}>
                  <div className="flex items-start gap-3">
                    <span className="font-pixel flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#edf5ff] text-[10px] font-bold text-[#0a4f9e]">
                      Q
                    </span>
                    <div>
                      <h3 className="text-[12.5px] font-semibold text-slate-700">
                        {item.q}
                      </h3>
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-500">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </Panel>
              ))}
            </div>
          </Section>

          {!presentationMode && (
            <Squircle cornerRadius={8} className="architecture-card mt-6 bg-[#0a4f9e] p-5 text-white shadow-[0_24px_52px_-30px_rgba(6,61,125,0.72)] sm:p-6">
              <div className="font-pixel text-[9px] font-bold uppercase tracking-[0.16em] text-blue-200">
                Architecture summary
              </div>
              <p className="mt-3 max-w-3xl text-[15px] font-medium leading-relaxed">
                eGov Agent is a compatible backend orchestration layer, not a
                replacement for government systems. Frontend clients access it
                through authenticated APIs. It does not centralize government
                data or let AI control official actions. Identity stays with
                eVerify, payments stay with eGovPay, AI stays with eGovAI, and
                official records stay with agency backends. Standard interfaces
                let the eGov team integrate the design into its approved
                technology and cloud environment.
              </p>
            </Squircle>
          )}

          {presentationMode && presentationSlide === 10 && (
            <Squircle cornerRadius={8} className="architecture-card mt-3 bg-[#0a4f9e] px-4 py-3 text-[12px] font-medium leading-relaxed text-white shadow-[0_18px_38px_-28px_rgba(6,61,125,0.7)]">
              eGov Agent is a compatible backend orchestration layer. Frontend
              clients use authenticated APIs, while identity, payments, AI,
              and official records remain with their trusted eGov and agency
              systems.
            </Squircle>
          )}

          {!presentationMode && (
            <div className="flex flex-wrap items-center gap-2 pb-4">
              <span className="text-[11px] font-medium text-slate-400">
                Official references
              </span>
              {[
                ["eGov API Marketplace", "https://platforms.e.gov.ph/"],
                [
                  "eGovAI docs",
                  "https://egov-ai.e.gov.ph/developers/egov-ai",
                ],
                ["eGovPay docs", "https://egovpay.gov.ph/developers"],
                ["eVerify", "https://everify.gov.ph/faqs"],
              ].map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-3 text-[10.5px] font-semibold text-[#0a4f9e] transition-[box-shadow,scale] duration-150 ease-out hover:shadow-[0_12px_26px_-20px_rgba(6,61,125,0.42)] active:scale-[0.96]"
                >
                  {label}
                  <ExternalLink size={11} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <GlossaryModal term={activeTerm} onClose={closeTerm} />
    </div>
  );
}
