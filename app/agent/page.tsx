"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock,
  Copy,
  CreditCard,
  Database,
  FileText,
  Fingerprint,
  HelpCircle,
  Landmark,
  LogOut,
  Mail,
  MapPin,
  Mic,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  SquarePen,
  X,
} from "lucide-react";
import { AgentMark, AgentWordmark } from "@/components/brand";
import { printForm, type PrintKind } from "./forms";

/* ---------------------------------- types --------------------------------- */

/* Buttons on a card can continue the conversation (intent) and/or print a
   pre-filled government form (print). */
type CardBase = {
  intent?: string;
  print?: PrintKind;
  printLabel?: string;
};

type Card = CardBase &
  (
    | {
        kind: "appointment";
        title: string;
        subtitle: string;
        date: string;
        time: string;
        location: string;
        reference: string;
      }
    | {
        kind: "checklist";
        title: string;
        items: string[];
        fee: string;
        action: string;
      }
    | {
        kind: "contributions";
        title: string;
        rows: { month: string; amount: string; status: string }[];
        total: string;
        meta: string;
      }
    | {
        kind: "record";
        title: string;
        fields: { label: string; value: string }[];
        action: string;
      }
    | {
        kind: "ltoViolation";
        caseNumber: string;
        violation: string;
        status: string;
        location: string;
        date: string;
        time: string;
        fine: string;
        source: string;
        note: string;
        action: string;
      }
  );

type StepIcon =
  | "identity"
  | "records"
  | "search"
  | "calendar"
  | "file"
  | "payment"
  | "spark"
  | "shield";

type TraceStep = {
  icon: StepIcon;
  label: string;
  agency: string;
  result: string;
  base: number;
};

type Msg = {
  id: number;
  role: "user" | "agent";
  text: string;
  card?: Card;
  trace?: TraceStep[];
  elapsed?: string;
};

type User = { name: string; firstName: string; pcn: string; photoSrc?: string };

type Conversation = { id: string; title: string; messages: Msg[] };

type AgentActivity = {
  steps: TraceStep[];
  currentIndex: number;
  startedAt: number;
  phase: "thinking" | "working" | "typing";
};

const THINKING_DELAY_MS = 5000;

const DEMO_PROFILE = {
  name: "Bryl Kezter Lim",
  firstName: "Bryl",
  photoSrc: "/brylphoto.jpg",
};

function subscribeToSessionStorage(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getSessionUserSnapshot() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("egov-user");
}

function getServerSessionUserSnapshot() {
  return null;
}

function readDemoUser(raw: string | null): User | null {
  if (!raw) return null;

  try {
    return { ...(JSON.parse(raw) as User), ...DEMO_PROFILE };
  } catch {
    return null;
  }
}

/* ----------------------------- scripted brain ----------------------------- */

const SUGGESTIONS = [
  "Renew my passport",
  "Get an NBI clearance",
  "Check my SSS contributions",
  "PhilHealth member record",
  "Check my LTO violations",
];

const RECENT_CONVERSATIONS = [
  "Can you help me renew my passport?",
  "Check if I have any LTO violations",
  "How do I check my SSS contributions?",
  "Can I get an NBI clearance online?",
  "Please show my PhilHealth member record.",
  "Help me renew my driver's license.",
];

const SEED_ELAPSED = ["11.2s", "9.8s", "12.6s", "10.4s", "13.1s"];

/* Pre-generate a realistic transcript for each seeded conversation */
function seedConversation(
  title: string,
  user: User,
  index: number
): Conversation {
  const plan = agentPlan(title, user);
  const base = 900000 + index * 10;
  return {
    id: `seed-${index}`,
    title,
    messages: [
      { id: base + 1, role: "user", text: title },
      {
        id: base + 2,
        role: "agent",
        text: plan.text,
        card: plan.card,
        trace: plan.steps.length ? plan.steps : undefined,
        elapsed: plan.steps.length
          ? SEED_ELAPSED[index % SEED_ELAPSED.length]
          : undefined,
      },
    ],
  };
}

function step(
  icon: StepIcon,
  label: string,
  agency: string,
  result: string,
  base: number
): TraceStep {
  return { icon, label, agency, result, base };
}

type Plan = { steps: TraceStep[]; text: string; card?: Card };

function agentPlan(input: string, user: User): Plan {
  const q = input.toLowerCase();

  /* ---- follow-up actions triggered by card buttons (checked first) ---- */

  if (q.includes("confirm") && (q.includes("slot") || q.includes("appointment"))) {
    return {
      steps: [
        step(
          "calendar",
          "Reserving your slot",
          "DFA CO Ali Mall",
          "Slot locked · Jul 21, 10:30 AM",
          1150
        ),
        step(
          "file",
          "Issuing your appointment reference",
          "DFA",
          "Reference DFA-QC-260721-1030-8842",
          1300
        ),
        step(
          "spark",
          "Sending confirmation & reminders",
          "eGov Notify",
          "Email + SMS sent · calendar invite added",
          1150
        ),
      ],
      text: `All set, ${user.firstName}! Your passport renewal appointment is confirmed — Tuesday, July 21, 2026 at 10:30 AM, DFA CO Ali Mall, Cubao. I emailed your confirmation, sent an SMS reminder, and added it to your calendar. Bring your current passport and arrive 15 minutes early.`,
      card: {
        kind: "record",
        title: "DFA Appointment — Confirmed",
        fields: [
          { label: "Reference", value: "DFA-QC-260721-1030-8842" },
          { label: "Date & time", value: "Jul 21, 2026 · 10:30 AM" },
          { label: "Location", value: "DFA CO Ali Mall, Araneta City, QC" },
          { label: "Reminders", value: "Email · SMS · Calendar" },
        ],
        action: "Print appointment pass",
        print: "dfa-pass",
      },
    };
  }

  if (q.includes("pay") && (q.includes("nbi") || q.includes("clearance"))) {
    return {
      steps: [
        step(
          "payment",
          "Charging your eGov Pay wallet",
          "eGov Pay",
          "₱180.00 paid · OR № 2026-0707-8812",
          1200
        ),
        step(
          "records",
          "Posting payment with NBI",
          "NBI",
          "Payment confirmed · application queued",
          1300
        ),
        step(
          "file",
          "Generating your digital clearance",
          "NBI Clearance",
          "Ready in ~10 minutes · sent to your email",
          1200
        ),
      ],
      text: `Payment received — ₱180.00 charged to your eGov Pay wallet. Your NBI Clearance is being generated now; the digital copy lands in your email in about 10 minutes, and the courier copy follows in 2–3 days. Here's your official receipt.`,
      card: {
        kind: "record",
        title: "NBI Clearance — Official Receipt",
        fields: [
          { label: "OR number", value: "2026-0707-8812" },
          { label: "Amount paid", value: "₱180.00" },
          { label: "Paid via", value: "eGov Pay wallet" },
          { label: "Status", value: "Processing · ~10 mins" },
        ],
        action: "Print official receipt",
        print: "nbi-receipt",
      },
    };
  }

  if (
    q.includes("mdr") &&
    (q.includes("email") || q.includes("certified") || q.includes("send"))
  ) {
    return {
      steps: [
        step(
          "file",
          "Generating your certified MDR",
          "PhilHealth",
          "Document generated from live records",
          1250
        ),
        step(
          "shield",
          "Applying e-signature & QR verification",
          "PhilHealth",
          "Digitally signed · verifiable online",
          1200
        ),
        step(
          "spark",
          "Sending to your registered email",
          "eGov Notify",
          "Sent to bry••••@gmail.com",
          1100
        ),
      ],
      text: `Done! Your certified Member Data Record is signed and on its way to bry••••@gmail.com. It carries a QR code that any employer or hospital can scan to verify it's authentic — no more falling in line at a PhilHealth office.`,
      card: {
        kind: "record",
        title: "PhilHealth Certified MDR — Issued",
        fields: [
          { label: "Document no.", value: "MDR-2026-0707-3318" },
          { label: "Sent to", value: "bry••••@gmail.com" },
          { label: "Signature", value: "PhilHealth e-seal + QR" },
          { label: "Status", value: "Delivered" },
        ],
        action: "Print MDR copy",
        print: "ph-mdr",
      },
    };
  }

  if (q.includes("cde") || (q.includes("start") && q.includes("exam"))) {
    return {
      steps: [
        step(
          "records",
          "Enrolling you in the CDE portal",
          "LTO LTMS",
          "Enrollment confirmed · account linked",
          1200
        ),
        step(
          "file",
          "Preparing your reviewer & exam link",
          "LTO",
          "25-item exam · pass with 13 correct",
          1250
        ),
        step(
          "spark",
          "Sending your exam access link",
          "eGov Notify",
          "Link sent to bry••••@gmail.com",
          1100
        ),
      ],
      text: `You're enrolled! I sent your Comprehensive Driver's Education exam link to your email — 25 items, pass with 13 correct, with a free reviewer included. Once you pass, message me and I'll book your biometrics at the nearest renewal center.`,
      card: {
        kind: "record",
        title: "LTO CDE Exam — Enrolled",
        fields: [
          { label: "Exam", value: "CDE Online · 25 items" },
          { label: "Passing score", value: "13 of 25" },
          { label: "Access link", value: "Sent via email" },
          { label: "Status", value: "Ready to take" },
        ],
        action: "Print renewal application",
        print: "lto-form",
      },
    };
  }

  /* ------------------------- base service intents ------------------------- */

  if (q.includes("passport") || q.includes("dfa")) {
    return {
      steps: [
        step(
          "identity",
          "Verifying your identity",
          "PhilSys eVerify",
          "Identity confirmed · face + PCN match",
          900
        ),
        step(
          "records",
          "Retrieving your passport record",
          "DFA",
          "ePassport found · expires Mar 14, 2027",
          1400
        ),
        step(
          "shield",
          "Checking renewal eligibility",
          "DFA",
          "Eligible — within the renewal window",
          1100
        ),
        step(
          "calendar",
          "Scanning appointment slots near Quezon City",
          "DFA CO Ali Mall",
          "Earliest slot found · Jul 21, 10:30 AM",
          1650
        ),
      ],
      text: `I checked with the DFA appointment system — your ePassport expires on March 14, 2027, so you're eligible for renewal now. I found the earliest available slot near your registered address in Quezon City. Shall I book it for you?`,
      card: {
        kind: "appointment",
        title: "DFA Passport Renewal",
        subtitle: "DFA CO Ali Mall, Cubao",
        date: "Tuesday, July 21, 2026",
        time: "10:30 AM",
        location: "2F Ali Mall, Araneta City, Quezon City",
        reference: "DFA-QC-260721-1030-8842",
        intent: "Confirm the July 21 slot",
        print: "dfa-form",
        printLabel: "Print pre-filled application",
      },
    };
  }

  if (q.includes("nbi") || q.includes("clearance")) {
    return {
      steps: [
        step(
          "identity",
          "Verifying your identity",
          "PhilSys eVerify",
          "Identity confirmed · biometrics on file",
          900
        ),
        step(
          "search",
          "Running national name & record check",
          "NBI",
          "No record hits found",
          1550
        ),
        step(
          "file",
          "Assembling your online application",
          "NBI Clearance",
          "Purpose set · Local employment",
          1150
        ),
        step(
          "payment",
          "Computing fees & delivery options",
          "eGov Pay",
          "₱180.00 total · digital copy ready in ~10 min",
          1250
        ),
      ],
      text: `You can get your NBI Clearance fully online — no need to visit a branch since your biometrics from PhilSys are already on file. Here's everything you need. Once paid, your digital copy arrives in about 10 minutes.`,
      card: {
        kind: "checklist",
        title: "NBI Clearance — Online",
        items: [
          "PhilSys ID verified via eVerify",
          "Biometrics on file (captured 2024)",
          "Purpose: Local employment",
          "Digital copy + courier delivery available",
        ],
        fee: "₱155.00 + ₱25.00 e-payment fee",
        action: "Pay with eGov Pay",
        intent: "Pay the NBI clearance fee with eGov Pay",
        print: "nbi-form",
        printLabel: "Print pre-filled application",
      },
    };
  }

  if (q.includes("sss") || q.includes("contribution") || q.includes("pension")) {
    return {
      steps: [
        step(
          "identity",
          "Verifying your identity",
          "PhilSys eVerify",
          "Identity confirmed · member matched",
          900
        ),
        step(
          "records",
          "Connecting to your member records",
          "SSS",
          "Member 34-2258901-5 · Active",
          1350
        ),
        step(
          "search",
          "Reading employer contribution postings",
          "SSS",
          "87 posted contributions found",
          1500
        ),
        step(
          "spark",
          "Calculating your contribution summary",
          "eGov Agent",
          "Fully posted through June 2026",
          1050
        ),
      ],
      text: `Here's your latest SSS contribution summary, ${user.firstName}. Your employer has posted all contributions up to last month — you're fully up to date with 87 total posted contributions.`,
      card: {
        kind: "contributions",
        title: "SSS · 34-2258901-5",
        rows: [
          { month: "June 2026", amount: "₱1,830.00", status: "Posted" },
          { month: "May 2026", amount: "₱1,830.00", status: "Posted" },
          { month: "April 2026", amount: "₱1,830.00", status: "Posted" },
        ],
        total: "₱142,470.00",
        meta: "87 contributions · fully posted",
        print: "sss-statement",
        printLabel: "Print contribution statement",
      },
    };
  }

  if (q.includes("philhealth")) {
    return {
      steps: [
        step(
          "identity",
          "Verifying your identity",
          "PhilSys eVerify",
          "Identity confirmed · member matched",
          900
        ),
        step(
          "records",
          "Opening your Member Data Record",
          "PhilHealth",
          "PIN 08-025518412-3 · Active",
          1350
        ),
        step(
          "search",
          "Checking premium payment history",
          "PhilHealth",
          "Premiums current through Q2 2026",
          1450
        ),
        step(
          "file",
          "Reviewing registered dependents",
          "PhilHealth",
          "2 dependents on record",
          1000
        ),
      ],
      text: `Your PhilHealth membership is active and your premiums are up to date. Here's your Member Data Record — I can send a certified digital copy to your registered email if you need one for employment or hospital admission.`,
      card: {
        kind: "record",
        title: "PhilHealth Member Data Record",
        fields: [
          { label: "PIN", value: "08-025518412-3" },
          { label: "Member type", value: "Direct Contributor — Employed" },
          { label: "Status", value: "Premiums up to date" },
          { label: "Dependents", value: "2 registered" },
        ],
        action: "Email certified MDR",
        intent: "Email my certified MDR",
        print: "ph-mdr",
        printLabel: "Print MDR copy",
      },
    };
  }

  if (
    !(q.includes("pay") || q.includes("payment") || q.includes("proceed")) &&
    (q.includes("lto") || q.includes("license") || q.includes("driver")) &&
    (q.includes("violation") ||
      q.includes("alarm") ||
      q.includes("apprehension") ||
      q.includes("ticket") ||
      q.includes("oga") ||
      q.includes("unsettled"))
  ) {
    return {
      steps: [
        step(
          "identity",
          "Verifying your identity",
          "PhilSys eVerify",
          "Identity confirmed · license holder matched",
          900
        ),
        step(
          "records",
          "Opening your LTO profile",
          "LTO LTMS",
          "License N03-12-345678 · profile found",
          1250
        ),
        step(
          "search",
          "Checking OGA interface alarms",
          "LTO Violations",
          "Alarm detected · transactions blocked",
          1500
        ),
        step(
          "file",
          "Retrieving case details",
          "LTO",
          "TRX-LETAS-260210-4507860 · 5.STS-8 Obstruction",
          1150
        ),
      ],
      text: `I checked your LTO profile, ${user.firstName}. You have one pending OGA alarm, so LTO transactions like licensing, vehicle updates, and documents are blocked until the case is settled. The case details show a 5.STS-8 Obstruction violation recorded on January 20, 2026 at 8:39 AM.`,
      card: {
        kind: "ltoViolation",
        caseNumber: "TRX-LETAS-260210-4507860",
        violation: "5.STS-8 Obstruction",
        status: "PENDING",
        location: "NA",
        date: "01/20/2026",
        time: "08:39 am",
        fine: "For assessment",
        source: "OGA",
        note:
          "You have been placed under alarm by OGA Interface. All transactions to LTO are blocked until the alarm is lifted. Please go to OGA Interface to settle your alarm.",
        action: "Proceed to Payment",
        intent: "Proceed to payment for my LTO OGA violation",
      },
    };
  }

  if (
    (q.includes("pay") || q.includes("payment") || q.includes("proceed")) &&
    (q.includes("lto") || q.includes("oga") || q.includes("violation"))
  ) {
    return {
      steps: [
        step(
          "payment",
          "Opening the settlement channel",
          "eGov Pay",
          "LTO OGA case linked · payment window prepared",
          1100
        ),
        step(
          "records",
          "Notifying OGA interface",
          "LTO Violations",
          "Case TRX-LETAS-260210-4507860 queued for settlement",
          1300
        ),
        step(
          "shield",
          "Preparing alarm lift request",
          "LTO",
          "Transactions unlock after OGA payment confirmation",
          1150
        ),
      ],
      text: `I prepared the payment handoff for case TRX-LETAS-260210-4507860. Once the OGA payment is confirmed, the alarm lift request is sent back to LTO so your blocked transactions can reopen.`,
    };
  }

  if (q.includes("license") || q.includes("lto") || q.includes("driver")) {
    return {
      steps: [
        step(
          "identity",
          "Verifying your identity",
          "PhilSys eVerify",
          "Identity confirmed · license holder matched",
          900
        ),
        step(
          "records",
          "Retrieving your driver's license file",
          "LTO LTMS",
          "License N03-12-345678 · expires Oct 2, 2026",
          1350
        ),
        step(
          "search",
          "Checking for unsettled violations",
          "LTO",
          "No unsettled violations found",
          1500
        ),
        step(
          "file",
          "Preparing online renewal requirements",
          "LTO LTMS",
          "CDE exam + biometrics visit needed",
          1050
        ),
      ],
      text: `Your driver's license (N03-12-345678) expires on October 2, 2026. Since you have no unsettled violations, you qualify for online renewal. You'll just need to complete the Comprehensive Driver's Education exam online — it takes about 20 minutes — then pick a renewal center for biometrics.`,
      card: {
        kind: "checklist",
        title: "LTO License Renewal",
        items: [
          "License N03-12-345678 — expires Oct 2, 2026",
          "No unsettled violations",
          "CDE online exam required (~20 mins)",
          "Medical certificate — book via agent",
        ],
        fee: "₱585.00 renewal fee",
        action: "Start CDE exam",
        intent: "Start the CDE exam",
        print: "lto-form",
        printLabel: "Print renewal application",
      },
    };
  }

  if (q.includes("tax") || q.includes("bir") || q.includes("tin")) {
    return {
      steps: [
        step(
          "identity",
          "Verifying your identity",
          "PhilSys eVerify",
          "Identity confirmed · taxpayer matched",
          900
        ),
        step(
          "records",
          "Retrieving your taxpayer registration",
          "BIR",
          "TIN active · RDO 40, Cubao",
          1350
        ),
        step(
          "search",
          "Checking your 2025 filing status",
          "BIR eFPS",
          "Filed via substituted filing",
          1450
        ),
        step(
          "file",
          "Listing available tax documents",
          "BIR",
          "ITR copy · Tax Clearance Certificate",
          1000
        ),
      ],
      text: `Your BIR records show your TIN is active and registered under RDO 40 (Cubao). Your 2025 annual income tax return was filed by your employer under substituted filing — no action needed from you this year. Would you like a Tax Clearance Certificate or a copy of your ITR?`,
    };
  }

  if (/\b(hi|hello|hey|kumusta|mabuhay|salamat|thanks|thank you)\b/.test(q)) {
    return {
      steps: [],
      text: `Walang anuman, ${user.firstName}! I'm here anytime. I can help you with passports, NBI clearance, SSS, PhilHealth, Pag-IBIG, LTO transactions, business permits, and 200+ other government services — just ask.`,
    };
  }

  return {
    steps: [
      step(
        "spark",
        "Understanding your request",
        "eGov Agent",
        "Intent mapped to government services",
        950
      ),
      step(
        "search",
        "Searching 34 connected agencies",
        "Service Directory",
        "Matched related services and records",
        1450
      ),
      step(
        "shield",
        "Checking what I can do on your behalf",
        "eGov Agent",
        "Actions available with your consent",
        1100
      ),
    ],
    text: `I can help you with that. As your eGov Agent, I have secure access to your records across 34 connected agencies — DFA, NBI, SSS, PhilHealth, Pag-IBIG, LTO, BIR, and more. Try asking me to renew a document, check a record, book an appointment, or pay a government fee.`,
  };
}

/* --------------------------------- page ----------------------------------- */

export default function AgentPage() {
  const router = useRouter();
  const sessionUser = useSyncExternalStore(
    subscribeToSessionStorage,
    getSessionUserSnapshot,
    getServerSessionUserSnapshot
  );
  const user = useMemo(() => readDemoUser(sessionUser), [sessionUser]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [agentProgress, setAgentProgress] = useState<AgentActivity | null>(null);
  const [streamingId, setStreamingId] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const idRef = useRef(0);
  const convIdRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const agentTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const busy = agentProgress !== null || streamingId !== null;

  const clearAgentTimers = useCallback(() => {
    agentTimersRef.current.forEach(clearTimeout);
    agentTimersRef.current = [];
  }, []);

  useEffect(() => {
    if (!readDemoUser(sessionStorage.getItem("egov-user"))) {
      router.replace("/");
    }
  }, [router, sessionUser]);

  useEffect(() => clearAgentTimers, [clearAgentTimers]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentProgress]);

  /* Seed the sidebar with realistic past conversations */
  useEffect(() => {
    if (!user) return;
    setConversations((cs) =>
      cs.length
        ? cs
        : RECENT_CONVERSATIONS.map((title, i) => seedConversation(title, user, i))
    );
  }, [user]);

  /* Keep the active conversation's transcript in sync with the chat */
  useEffect(() => {
    if (activeConvId === null) return;
    setConversations((cs) =>
      cs.map((c) => (c.id === activeConvId ? { ...c, messages } : c))
    );
  }, [messages, activeConvId]);

  const newConversation = useCallback(() => {
    clearAgentTimers();
    setAgentProgress(null);
    setStreamingId(null);
    setActiveConvId(null);
    setMessages([]);
    setInput("");
  }, [clearAgentTimers]);

  const selectConversation = useCallback(
    (id: string) => {
      if (id === activeConvId) return;
      const conv = conversations.find((c) => c.id === id);
      if (!conv) return;
      clearAgentTimers();
      setAgentProgress(null);
      setStreamingId(null);
      setActiveConvId(id);
      setMessages(conv.messages);
    },
    [activeConvId, clearAgentTimers, conversations]
  );

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, []);

  const handleStreamDone = useCallback(() => {
    setStreamingId(null);
    requestAnimationFrame(() =>
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    );
  }, []);

  const send = useCallback(
    (raw?: string) => {
      const text = (raw ?? input).trim();
      if (!text || !user || busy) return;

      clearAgentTimers();
      setInput("");
      if (activeConvId === null) {
        const convId = `conv-${++convIdRef.current}`;
        const title =
          text.length > 44 ? `${text.slice(0, 44).trimEnd()}…` : text;
        setConversations((cs) => [{ id: convId, title, messages: [] }, ...cs]);
        setActiveConvId(convId);
      }
      setMessages((m) => [...m, { id: ++idRef.current, role: "user", text }]);

      const plan = agentPlan(text, user);
      const startedAt = Date.now();
      const steps = plan.steps.map((s) => ({
        ...s,
        base: Math.round(s.base * 2 + Math.random() * 800),
      }));

      const deliver = () => {
        const elapsed = `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
        const id = ++idRef.current;
        setAgentProgress(null);
        setMessages((m) => [
          ...m,
          {
            id,
            role: "agent",
            text: plan.text,
            card: plan.card,
            trace: steps.length ? steps : undefined,
            elapsed: steps.length ? elapsed : undefined,
          },
        ]);
        setStreamingId(id);
        agentTimersRef.current = [];
      };

      setAgentProgress({
        steps: [],
        currentIndex: 0,
        startedAt,
        phase: "thinking",
      });

      const startWork = () => {
        if (steps.length === 0) {
          setAgentProgress({
            steps: [],
            currentIndex: 0,
            startedAt,
            phase: "typing",
          });
          agentTimersRef.current.push(setTimeout(deliver, 1100));
          return;
        }

        setAgentProgress({
          steps,
          currentIndex: 0,
          startedAt,
          phase: "working",
        });

        let elapsed = 0;
        steps.forEach((s, index) => {
          elapsed += s.base;
          agentTimersRef.current.push(
            setTimeout(
              () =>
                setAgentProgress((p) =>
                  p ? { ...p, currentIndex: index + 1 } : p
                ),
              elapsed
            )
          );
        });
        agentTimersRef.current.push(
          setTimeout(deliver, elapsed + 1100)
        );
      };

      agentTimersRef.current.push(setTimeout(startWork, THINKING_DELAY_MS));
    },
    [activeConvId, busy, clearAgentTimers, input, user]
  );

  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  const toggleMic = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setInput("Voice input is not supported in this browser");
      return;
    }
    const rec = new SR();
    rec.lang = "en-PH";
    rec.interimResults = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r[0].transcript)
        .join("");
      setInput(transcript);
      if (e.results[e.results.length - 1].isFinal) {
        setListening(false);
        sendRef.current(transcript);
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }, [listening]);

  const signOut = () => {
    clearAgentTimers();
    sessionStorage.removeItem("egov-user");
    window.speechSynthesis?.cancel();
    router.push("/");
  };

  if (!user) return null;

  const empty = messages.length === 0;

  return (
    <main className="flex h-dvh overflow-hidden bg-[#f7faff] text-slate-900">
      <aside
        className={`flex w-[76px] shrink-0 flex-col bg-white/85 shadow-[10px_0_30px_rgba(6,61,125,0.04)] backdrop-blur-xl transition-[width] duration-300 ease-out ${
          sidebarCollapsed ? "sm:w-[84px]" : "sm:w-[280px]"
        }`}
      >
        <div className="flex h-full flex-col px-3 py-4 sm:px-4 sm:py-5">
          <div
            className={`flex items-center justify-center ${
              sidebarCollapsed
                ? "sm:flex-col sm:gap-3"
                : "sm:justify-between sm:gap-3"
            }`}
          >
            <div className="sm:hidden">
              <AgentMark size={34} />
            </div>
            <div className="hidden min-w-0 sm:block">
              {sidebarCollapsed ? (
                <AgentMark size={34} />
              ) : (
                <AgentWordmark size={32} />
              )}
            </div>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((value) => !value)}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!sidebarCollapsed}
              className="hidden h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-400 shadow-[0_8px_20px_rgba(11,22,36,0.05)] transition hover:border-[#0a4f9e]/30 hover:text-[#0a4f9e] sm:flex"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen size={17} />
              ) : (
                <PanelLeftClose size={17} />
              )}
            </button>
          </div>

          <nav className="mt-8 space-y-2" aria-label="Agent navigation">
            <SidebarNavButton
              active={activeConvId === null}
              expanded={!sidebarCollapsed}
              icon={<SquarePen size={18} />}
              label="New conversation"
              onClick={newConversation}
            />
            <SidebarNavButton
              expanded={!sidebarCollapsed}
              icon={<ShieldCheck size={18} />}
              label="Verified access"
            />
            <SidebarNavButton
              expanded={!sidebarCollapsed}
              icon={<FileText size={18} />}
              label="Service records"
            />
            <SidebarNavButton
              expanded={!sidebarCollapsed}
              icon={<Bot size={18} />}
              label="Agency assistant"
            />
            <div className="my-5 h-px bg-slate-200/70" />
            <RecentConversations
              expanded={!sidebarCollapsed}
              conversations={conversations}
              activeId={activeConvId}
              onSelect={selectConversation}
            />
          </nav>

          <div className="mt-auto space-y-3">
            <section
              aria-label="Verified user"
              className={`flex items-center justify-center px-2 py-3 ${
                sidebarCollapsed
                  ? ""
                  : "sm:justify-start sm:gap-3 sm:px-3"
              }`}
            >
              <Image
                src={user.photoSrc ?? DEMO_PROFILE.photoSrc}
                alt={user.name}
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-[#0a4f9e]/10"
              />
              {!sidebarCollapsed && (
                <div className="hidden min-w-0 leading-tight sm:block">
                  <div className="flex min-w-0 items-center text-[13.5px] font-semibold">
                    <span className="truncate">{user.name}</span>
                  </div>
                  <div className="font-pixel mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#0a4f9e]/10 px-2.5 py-1 text-[9px] uppercase tracking-widest text-[#0a4f9e]">
                    <BadgeCheck size={12} className="shrink-0" />
                    <span className="truncate">Verified</span>
                  </div>
                </div>
              )}
            </section>

            <div className="space-y-2">
              <SidebarControlButton
                danger
                expanded={!sidebarCollapsed}
                icon={<LogOut size={18} />}
                label="Sign out"
                onClick={signOut}
              />
            </div>
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        {/* Messages */}
        <div className="scrollbar-subtle flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-6 py-8">
            {empty ? (
              <div className="flex flex-1 flex-col items-center justify-center pb-20 text-center">
                <div className="animate-fade-up">
                  <AgentMark size={72} />
                </div>
                <h2 className="animate-fade-up delay-100 mt-8 text-[34px] font-semibold tracking-tight sm:text-[40px]">
                  Mabuhay,{" "}
                  <span className="text-[#0a4f9e]">{user.firstName}</span>!
                </h2>
                <p className="animate-fade-up delay-200 mt-3 max-w-md text-[17px] leading-relaxed text-slate-500">
                  Ask me anything — I&apos;m connected to 34 agencies on your
                  behalf.
                </p>
                <div className="animate-fade-up delay-300 mt-9 flex max-w-lg flex-wrap justify-center gap-2.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      disabled={busy}
                      className="hairline cursor-pointer rounded-full bg-white px-5 py-2.5 text-[14.5px] text-slate-600 transition hover:border-[#0a4f9e]/40 hover:text-[#0a4f9e] disabled:cursor-default disabled:opacity-45"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {messages.map((m) =>
                  m.role === "user" ? (
                    <div key={m.id} className="animate-bubble-in flex justify-end">
                      <div className="bg-brand-gradient max-w-[80%] rounded-3xl rounded-br-lg px-5 py-3 text-[16px] leading-relaxed text-white">
                        {m.text}
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="animate-bubble-in flex gap-4">
                      <div className="mt-1 shrink-0">
                        <AgentMark size={32} />
                      </div>
                      <div className="min-w-0 flex-1 space-y-4 pt-1.5">
                        {m.trace && (
                          <TraceSummary steps={m.trace} elapsed={m.elapsed} />
                        )}
                        {m.id === streamingId ? (
                          <StreamedText
                            text={m.text}
                            onDone={handleStreamDone}
                            onTick={scrollToBottom}
                          />
                        ) : (
                          <p className="text-[16.5px] leading-[1.65] text-slate-700">
                            {m.text}
                          </p>
                        )}
                        {m.card && m.id !== streamingId && (
                          <div className="animate-card-in">
                            <ServiceCard
                              card={m.card}
                              user={user}
                              onIntent={send}
                            />
                          </div>
                        )}
                        {m.id !== streamingId && (
                          <div className="animate-fade-in -ml-2 pt-0.5">
                            <CopyButton text={m.text} />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
                {agentProgress &&
                  (agentProgress.phase === "thinking" ? (
                    <ThinkingLoader />
                  ) : agentProgress.steps.length ? (
                    <AgentWorking progress={agentProgress} />
                  ) : (
                    <TypingBubble />
                  ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="bg-[#f7faff]/90 px-6 pb-6 pt-2 backdrop-blur">
          <div className="hairline mx-auto flex min-h-[116px] w-full max-w-2xl items-end gap-2 rounded-[28px] bg-white p-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={
                listening
                  ? "Listening…"
                  : busy
                    ? "eGov Agent is working…"
                    : "Ask about any government service…"
              }
              rows={3}
              className="min-h-20 flex-1 resize-none bg-transparent px-2 py-2 text-[16px] leading-6 outline-none placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={toggleMic}
              title="Voice input"
              aria-label="Voice input"
              className={`mb-1 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition ${
                listening
                  ? "animate-mic-pulse bg-red-500 text-white"
                  : "text-slate-400 hover:bg-[#f6f9ff] hover:text-[#0a4f9e]"
              }`}
            >
              <Mic size={19} />
            </button>
          </div>
          <div className="mx-auto mt-3 flex max-w-2xl flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] text-slate-400">
            <span className="font-pixel text-[9px] uppercase tracking-[0.18em]">
              eGovPH Support
            </span>
            <a
              href="mailto:support@e.gov.ph"
              className="inline-flex cursor-pointer items-center gap-1.5 transition hover:text-[#0a4f9e]"
            >
              <Mail size={13} />
              support@e.gov.ph
            </a>
            <a
              href="tel:+63289200101"
              className="inline-flex cursor-pointer items-center gap-1.5 transition hover:text-[#0a4f9e]"
            >
              <Phone size={13} />
              8-920-0101 loc. 1832
            </a>
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              title="Demo guide"
              aria-label="Open demo guide"
              className="hairline flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white text-slate-400 transition hover:border-[#0a4f9e]/40 hover:text-[#0a4f9e]"
            >
              <HelpCircle size={13} />
            </button>
          </div>
        </div>
      </section>

      <DemoGuideModal open={showGuide} onClose={() => setShowGuide(false)} />
    </main>
  );
}

/* ------------------------------ agency logos ------------------------------- */

const AGENCY_LOGOS: Record<
  string,
  { src: string; aspect?: number; fullName: string }
> = {
  philsys: {
    src: "/agency-logos/philsys.png",
    aspect: 2.4,
    fullName: "Philippine Statistics Authority",
  },
  dfa: {
    src: "/agency-logos/dfa.png",
    fullName: "Department of Foreign Affairs",
  },
  nbi: {
    src: "/agency-logos/nbi.png",
    fullName: "National Bureau of Investigation",
  },
  sss: {
    src: "/agency-logos/sss.png",
    aspect: 1.35,
    fullName: "Social Security System",
  },
  philhealth: {
    src: "/agency-logos/philhealth.png",
    aspect: 2.2,
    fullName: "Philippine Health Insurance Corporation",
  },
  lto: {
    src: "/agency-logos/lto.png",
    fullName: "Land Transportation Office",
  },
  bir: {
    src: "/agency-logos/bir.png",
    fullName: "Bureau of Internal Revenue",
  },
  pay: {
    src: "/agency-logos/egovpay.svg",
    fullName: "eGov Pay",
  },
  egov: {
    src: "/agency-logos/egovph.svg",
    aspect: 2.4,
    fullName: "eGovPH",
  },
};

function sealFor(label: string) {
  const t = label.toLowerCase();
  if (t.includes("philsys")) return AGENCY_LOGOS.philsys;
  if (t.includes("dfa")) return AGENCY_LOGOS.dfa;
  if (t.includes("nbi")) return AGENCY_LOGOS.nbi;
  if (t.includes("sss")) return AGENCY_LOGOS.sss;
  if (t.includes("philhealth")) return AGENCY_LOGOS.philhealth;
  if (t.includes("lto")) return AGENCY_LOGOS.lto;
  if (t.includes("bir")) return AGENCY_LOGOS.bir;
  if (t.includes("pay")) return AGENCY_LOGOS.pay;
  if (t.includes("notify") || t.includes("egov agent")) return AGENCY_LOGOS.egov;
  return null;
}

function AgencySeal({ label, size = 32 }: { label: string; size?: number }) {
  const seal = sealFor(label);
  if (!seal) return null;
  const width = Math.round(size * Math.min(seal.aspect ?? 1, 2.4));

  return (
    <span
      role="img"
      aria-label={seal.fullName}
      className="relative inline-flex shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-slate-200"
      style={{ width, height: size }}
    >
      <Image
        src={seal.src}
        alt=""
        fill
        sizes={`${width}px`}
        className="object-contain p-[1px]"
      />
    </span>
  );
}

/* ------------------------------- agentic flow ------------------------------ */

const STEP_ICONS: Record<StepIcon, typeof Check> = {
  identity: Fingerprint,
  records: Database,
  search: Search,
  calendar: CalendarDays,
  file: FileText,
  payment: CreditCard,
  spark: Sparkles,
  shield: ShieldCheck,
};

function TraceStepRow({
  step,
  state,
  isLast,
  delay = 0,
}: {
  step: TraceStep;
  state: "active" | "done";
  isLast: boolean;
  delay?: number;
}) {
  const Icon = STEP_ICONS[step.icon];
  const seal = sealFor(step.agency);
  const active = state === "active";

  return (
    <div
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      className={`animate-step-in relative flex gap-3.5 ${isLast ? "" : "pb-6"}`}
    >
      {!isLast && (
        <span
          aria-hidden
          className="absolute bottom-1 left-4 top-10 w-px -translate-x-1/2 bg-[#0a4f9e]/25"
        />
      )}
      <span
        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
          active
            ? "bg-white text-[#0a4f9e] ring-2 ring-[#0a4f9e]/25"
            : "bg-[#0a4f9e] text-white"
        }`}
      >
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex items-center gap-2">
          <span
            className={`min-w-0 truncate text-[14px] font-medium ${
              active ? "agent-text-shimmer" : "text-slate-700"
            }`}
          >
            {step.label}
          </span>
          <span
            className={`font-pixel ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 py-0.5 text-[8.5px] uppercase tracking-[0.14em] text-slate-500 ${
              seal ? "pl-1 pr-2" : "px-2"
            }`}
          >
            {seal && <AgencySeal label={step.agency} size={14} />}
            {step.agency}
          </span>
          {active ? (
            <span className="step-spinner h-3.5 w-3.5 shrink-0" />
          ) : (
            <span className="animate-check-pop flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check size={10} strokeWidth={3.5} />
            </span>
          )}
        </div>
        {active ? (
          <div className="mt-1 text-[12.5px] text-slate-300">Working…</div>
        ) : (
          <div className="animate-result-in mt-1 truncate text-[12.5px] text-slate-400">
            {step.result}
          </div>
        )}
      </div>
    </div>
  );
}

function AgentWorking({ progress }: { progress: AgentActivity }) {
  const { steps, currentIndex } = progress;
  const done = currentIndex >= steps.length;
  const visible = steps.slice(0, Math.min(currentIndex + 1, steps.length));
  const activeStep = steps[currentIndex];

  return (
    <div
      className="flex gap-4"
      role="status"
      aria-live="polite"
      aria-label={activeStep?.label ?? "Preparing your results"}
    >
      <div className="mt-1 shrink-0">
        <div className="animate-logo-spin-in-place grid h-8 w-8 place-items-center">
          <AgentMark size={32} />
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-3 pt-1.5">
        <div className="agent-text-shimmer text-[13px] font-semibold">
          {done
            ? "Putting it all together…"
            : "Working on it — contacting agencies securely…"}
        </div>
        <div className="max-w-md pt-1.5">
          {visible.map((s, i) => (
            <TraceStepRow
              key={s.label}
              step={s}
              state={i < currentIndex ? "done" : "active"}
              isLast={i === visible.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TraceSummary({
  steps,
  elapsed,
}: {
  steps: TraceStep[];
  elapsed?: string;
}) {
  const [open, setOpen] = useState(false);
  const agencies = Array.from(new Set(steps.map((s) => s.agency)));

  return (
    <div className="max-w-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group flex cursor-pointer items-center gap-2 text-[12.5px] font-medium text-slate-400 transition hover:text-[#0a4f9e]"
      >
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Check size={10} strokeWidth={3.5} />
        </span>
        <span>
          Completed {steps.length} steps across {agencies.length}{" "}
          {agencies.length === 1 ? "agency" : "agencies"}
          {elapsed ? ` · ${elapsed}` : ""}
        </span>
        <ChevronDown
          size={13}
          className={`shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="animate-fade-in mt-4 max-w-md pl-0.5">
          {steps.map((s, i) => (
            <TraceStepRow
              key={s.label}
              step={s}
              state="done"
              isLast={i === steps.length - 1}
              delay={i * 45}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- demo guide -------------------------------- */

function TypeThis({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md bg-[#0a4f9e]/10 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-[#0a4f9e]">
      {children}
    </code>
  );
}

function GuideStep({
  n,
  children,
}: {
  n: number;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 text-[13.5px] leading-relaxed text-slate-600">
      <span className="bg-brand-gradient mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold text-white">
        {n}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function GuideHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-pixel mb-3 mt-6 text-[10px] uppercase tracking-[0.18em] text-[#0a4f9e] first:mt-0">
      {children}
    </h3>
  );
}

function DemoGuideModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Demo guide"
      onClick={onClose}
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-bubble-in scrollbar-subtle max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <AgentMark size={30} />
          <div>
            <div className="text-[16px] font-semibold">Demo playbook</div>
            <div className="text-[12.5px] text-slate-400">
              ~3 minutes · follow it top to bottom
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close demo guide"
            className="ml-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5">
          <GuideHeading>The one-liner</GuideHeading>
          <p className="text-[13.5px] leading-relaxed text-slate-600">
            &ldquo;One PhilSys login, one conversation — and an AI agent
            transacts with 34 government agencies for you: it verifies, books,
            pays, and hands you print-ready documents.&rdquo;
          </p>

          <GuideHeading>Act 1 — The hero flow (~90s)</GuideHeading>
          <ol className="space-y-2.5">
            <GuideStep n={1}>
              Type <TypeThis>Renew my passport</TypeThis> (or click the chip).
              While the timeline runs, narrate it: &ldquo;PhilSys verified me,
              DFA pulled my record, checked eligibility, found the nearest slot
              — I never filled a form.&rdquo; Point at the agency seals.
            </GuideStep>
            <GuideStep n={2}>
              When the reply streams in, click{" "}
              <TypeThis>Completed 4 steps…</TypeThis> to expand the audit trail
              — &ldquo;every action is logged and consented.&rdquo;
            </GuideStep>
            <GuideStep n={3}>
              Click <TypeThis>Confirm this slot</TypeThis> on the card — the
              agent books it end-to-end: reference number, email, SMS, calendar.
            </GuideStep>
            <GuideStep n={4}>
              <strong>Wow moment:</strong> click{" "}
              <TypeThis>Print appointment pass</TypeThis> — a pre-filled,
              print-ready government document opens. Choose &ldquo;Save as
              PDF&rdquo; in the dialog. Pause and let it land.
            </GuideStep>
          </ol>

          <GuideHeading>Act 2 — Breadth (~60s)</GuideHeading>
          <ol className="space-y-2.5">
            <GuideStep n={5}>
              Click <TypeThis>New conversation</TypeThis>, type{" "}
              <TypeThis>Get an NBI clearance</TypeThis>, then click{" "}
              <TypeThis>Pay with eGov Pay</TypeThis> — an official receipt
              appears. Print it too.
            </GuideStep>
            <GuideStep n={6}>
              New conversation → <TypeThis>Check my SSS contributions</TypeThis>{" "}
              → point at the live data card →{" "}
              <TypeThis>Print contribution statement</TypeThis>.
            </GuideStep>
            <GuideStep n={7}>
              New conversation → <TypeThis>PhilHealth member record</TypeThis> →
              click <TypeThis>Email certified MDR</TypeThis> — digitally signed
              and QR-verifiable.
            </GuideStep>
          </ol>

          <GuideHeading>Act 3 — LTO violation alarm (~45s)</GuideHeading>
          <ol className="space-y-2.5">
            <GuideStep n={8}>
              New conversation →{" "}
              <TypeThis>Check if I have any LTO violations</TypeThis>. Let the
              <TypeThis>Thinking...</TypeThis> loader breathe before the LTO/OGA
              trace appears.
            </GuideStep>
            <GuideStep n={9}>
              Open <TypeThis>Completed 4 steps…</TypeThis> and call out the OGA
              alarm: LTO transactions are blocked until the case is settled.
            </GuideStep>
            <GuideStep n={10}>
              Point at the case card:{" "}
              <TypeThis>TRX-LETAS-260210-4507860</TypeThis>,{" "}
              <TypeThis>5.STS-8 Obstruction</TypeThis>, status{" "}
              <TypeThis>PENDING</TypeThis>, source <TypeThis>OGA</TypeThis>.
              Click <TypeThis>Proceed to Payment</TypeThis> to show the
              settlement handoff.
            </GuideStep>
          </ol>

          <GuideHeading>Act 4 — Polish (~30s)</GuideHeading>
          <ol className="space-y-2.5">
            <GuideStep n={11}>
              Show the sidebar: every chat is saved and highlighted — click an
              older one to jump back with its full transcript.
            </GuideStep>
            <GuideStep n={12}>
              Tap the mic and say{" "}
              <TypeThis>Renew my driver&apos;s license</TypeThis> — voice works.
            </GuideStep>
            <GuideStep n={13}>
              End with <TypeThis>Salamat!</TypeThis> — the agent replies in
              Taglish. Mention the copy button under every reply.
            </GuideStep>
          </ol>

          <GuideHeading>Pro tips</GuideHeading>
          <ul className="space-y-1.5 text-[13px] leading-relaxed text-slate-500">
            <li>
              • The timeline takes ~12s by design — that&apos;s your narration
              window, don&apos;t wait in silence.
            </li>
            <li>
              • Print opens the browser dialog — pick &ldquo;Save as PDF&rdquo;
              if there&apos;s no printer on stage.
            </li>
            <li>
              • Refreshing the page resets all conversations to the seeded
              five.
            </li>
            <li>• Go full screen and close extra tabs before you start.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const copy = () => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy response"
      aria-label="Copy response"
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-medium transition ${
        copied
          ? "text-emerald-600"
          : "text-slate-400 hover:bg-[#f2f7ff] hover:text-[#0a4f9e]"
      }`}
    >
      {copied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ThinkingLoader() {
  return (
    <div
      className="animate-bubble-in flex gap-4"
      role="status"
      aria-live="polite"
      aria-label="Thinking"
    >
      <div className="mt-1 shrink-0">
        <div className="animate-logo-spin-in-place grid h-8 w-8 place-items-center">
          <AgentMark size={32} />
        </div>
      </div>
      <div className="min-w-0 flex-1 pt-1.5">
        <div className="agent-text-shimmer text-[13px] font-semibold">
          Thinking...
        </div>
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div
      className="animate-bubble-in flex gap-4"
      role="status"
      aria-label="Agent is typing"
    >
      <div className="mt-1 shrink-0">
        <AgentMark size={32} />
      </div>
      <div className="flex items-center gap-1.5 pt-3">
        <span className="typing-dot h-2 w-2 rounded-full bg-[#0a4f9e]/60" />
        <span className="typing-dot h-2 w-2 rounded-full bg-[#0a4f9e]/60" />
        <span className="typing-dot h-2 w-2 rounded-full bg-[#0a4f9e]/60" />
      </div>
    </div>
  );
}

function StreamedText({
  text,
  onDone,
  onTick,
}: {
  text: string;
  onDone: () => void;
  onTick: () => void;
}) {
  const words = useMemo(() => text.split(" "), [text]);
  const [count, setCount] = useState(1);
  const doneRef = useRef(onDone);
  const tickRef = useRef(onTick);
  doneRef.current = onDone;
  tickRef.current = onTick;

  useEffect(() => {
    if (count >= words.length) {
      const timer = setTimeout(() => doneRef.current(), 200);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      setCount((c) => c + 1);
      tickRef.current();
    }, 28 + Math.random() * 48);
    return () => clearTimeout(timer);
  }, [count, words.length]);

  return (
    <p className="text-[16.5px] leading-[1.65] text-slate-700">
      {words.slice(0, count).join(" ")}
      <span className="stream-cursor" aria-hidden />
    </p>
  );
}

/* ------------------------------ sidebar pieces ----------------------------- */

function SidebarNavButton({
  active = false,
  expanded,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  expanded: boolean;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`group flex h-11 w-full cursor-pointer items-center justify-center text-[14px] font-medium transition-all duration-200 ${
        expanded ? "sm:justify-start sm:gap-3 sm:px-3" : "sm:px-0"
      } ${
        active
          ? "bg-brand-gradient rounded-xl text-white shadow-[0_14px_30px_rgba(6,61,125,0.2)]"
          : "rounded-2xl text-slate-500 hover:bg-[#f6f9ff] hover:text-[#0a4f9e]"
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
        {icon}
      </span>
      {expanded && <span className="hidden truncate sm:block">{label}</span>}
    </button>
  );
}

function RecentConversations({
  expanded,
  conversations,
  activeId,
  onSelect,
}: {
  expanded: boolean;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {expanded && (
        <div className="font-pixel hidden px-3 text-[9px] uppercase tracking-[0.18em] text-slate-400 sm:block">
          Previous conversations
        </div>
      )}
      <div className="space-y-1.5">
        {conversations.map((conversation) => {
          const active = conversation.id === activeId;
          return (
            <button
              key={conversation.id}
              type="button"
              title={conversation.title}
              onClick={() => onSelect(conversation.id)}
              aria-current={active ? "true" : undefined}
              className={`group animate-step-in flex w-full cursor-pointer items-center justify-center rounded-xl text-left transition-all duration-200 ${
                active
                  ? "bg-[#0a4f9e]/10"
                  : "hover:bg-[#f6f9ff] hover:text-[#0a4f9e]"
              } ${
                expanded ? "sm:justify-start sm:gap-3 sm:px-3 sm:py-2.5" : "h-10 sm:px-0"
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition ${
                  active
                    ? "bg-[#0a4f9e] text-white"
                    : "bg-slate-100 text-slate-400 group-hover:bg-[#0a4f9e]/10 group-hover:text-[#0a4f9e]"
                }`}
              >
                <MessageCircle size={15} />
              </span>
              {expanded && (
                <span className="hidden min-w-0 sm:block">
                  <span
                    className={`block truncate text-[13px] transition ${
                      active
                        ? "font-semibold text-[#0a4f9e]"
                        : "font-medium text-slate-600 group-hover:text-[#0a4f9e]"
                    }`}
                  >
                    {conversation.title}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SidebarControlButton({
  active = false,
  danger = false,
  expanded,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  danger?: boolean;
  expanded: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  const tone = active
    ? "bg-[#0a4f9e]/10 text-[#0a4f9e]"
    : danger
      ? "text-slate-400 hover:bg-red-50 hover:text-red-500"
      : "text-slate-400 hover:bg-[#f6f9ff] hover:text-[#0a4f9e]";

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex h-11 w-full cursor-pointer items-center justify-center rounded-2xl text-[14px] font-medium transition-all duration-200 ${
        expanded ? "sm:justify-start sm:gap-3 sm:px-3" : "sm:px-0"
      } ${tone}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
        {icon}
      </span>
      {expanded && <span className="hidden truncate sm:block">{label}</span>}
    </button>
  );
}

/* ------------------------------ service cards ------------------------------ */

function CardShell({
  icon,
  title,
  tag,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tag?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="hairline max-w-md overflow-hidden rounded-2xl bg-white shadow-[0_18px_44px_-26px_rgba(6,61,125,0.35)]">
      <div className="flex items-center gap-2.5 border-b border-slate-100 bg-[#fafcff] px-5 py-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#0a4f9e]/10 text-[#0a4f9e]">
          {icon}
        </span>
        <span className="font-pixel min-w-0 truncate text-[10.5px] uppercase tracking-[0.16em] text-[#0a4f9e]">
          {title}
        </span>
        {tag && (
          <span className="font-pixel ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[8.5px] uppercase tracking-[0.14em] text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {tag}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-brand-gradient flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-[14.5px] font-medium text-white shadow-[0_12px_26px_-12px_rgba(6,61,125,0.55)] transition hover:opacity-90 active:scale-[0.99]"
    >
      {children}
    </button>
  );
}

function PrintButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hairline flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-[13.5px] font-medium text-[#0a4f9e] transition hover:bg-[#f6f9ff] active:scale-[0.99]"
    >
      <Printer size={14} /> {label}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-pixel text-[8.5px] uppercase tracking-[0.16em] text-slate-400">
      {children}
    </div>
  );
}

/* "Tuesday, July 21, 2026" → { mon: "Jul", day: "21" } */
function dateTile(date: string) {
  const match = date.match(/([A-Za-z]+)\s+(\d{1,2}),/);
  return match ? { mon: match[1].slice(0, 3), day: match[2] } : null;
}

function ServiceCard({
  card,
  user,
  onIntent,
}: {
  card: Card;
  user: User;
  onIntent: (text: string) => void;
}) {
  const primary = () => {
    if (card.intent) onIntent(card.intent);
    else if (card.print) printForm(card.print, user);
  };
  const secondaryPrint =
    card.intent && card.print ? (
      <div className="mt-2">
        <PrintButton
          label={card.printLabel ?? "Print pre-filled form"}
          onClick={() => printForm(card.print!, user)}
        />
      </div>
    ) : null;

  if (card.kind === "appointment") {
    const tile = dateTile(card.date);

    return (
      <CardShell
        icon={<CalendarDays size={13} />}
        title={card.title}
        tag="Slot held"
      >
        <div className="px-5 py-4">
          <div className="flex items-center gap-4">
            {tile ? (
              <div className="bg-brand-gradient flex h-[64px] w-[60px] shrink-0 flex-col items-center justify-center rounded-xl text-white shadow-[0_12px_24px_-12px_rgba(6,61,125,0.6)]">
                <span className="font-pixel text-[9px] uppercase tracking-[0.2em] opacity-80">
                  {tile.mon}
                </span>
                <span className="mt-0.5 text-[24px] font-bold leading-none">
                  {tile.day}
                </span>
              </div>
            ) : (
              <div className="flex h-[64px] w-[60px] shrink-0 items-center justify-center rounded-xl bg-[#0a4f9e]/10 text-[#0a4f9e]">
                <CalendarDays size={22} />
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-[15.5px] font-semibold">
                {card.subtitle}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[13.5px] text-slate-500">
                <Clock size={13} className="shrink-0 text-[#0a4f9e]" />
                {card.date} ·{" "}
                <span className="font-semibold text-[#0a4f9e]">{card.time}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-400">
                <MapPin size={13} className="shrink-0 text-[#0a4f9e]" />
                <span className="truncate">{card.location}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 bg-[#fafcff] px-4 py-2.5">
            <FieldLabel>Booking ref</FieldLabel>
            <span className="truncate font-mono text-[12px] font-medium text-slate-600">
              {card.reference}
            </span>
          </div>
          <div className="mt-4">
            <ActionButton onClick={primary}>
              Confirm this slot <ChevronRight size={16} />
            </ActionButton>
            {secondaryPrint}
          </div>
        </div>
      </CardShell>
    );
  }

  if (card.kind === "ltoViolation") {
    return (
      <div className="hairline max-w-xl overflow-hidden rounded-2xl bg-white shadow-[0_18px_44px_-26px_rgba(6,61,125,0.35)]">
        <div className="bg-brand-gradient relative overflow-hidden px-5 py-5 text-white">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_55%)]" />
          <div className="relative flex items-start gap-3">
            <AgencySeal label="LTO" size={42} />
            <div className="min-w-0">
              <div className="font-pixel text-[10px] uppercase tracking-[0.18em] text-white/75">
                Land Transportation Office
              </div>
              <div className="mt-1 text-[22px] font-semibold leading-tight">
                Welcome, {user.firstName.toUpperCase()}
              </div>
              <div className="mt-0.5 text-[13.5px] text-white/75">
                What would you like to do?
              </div>
            </div>
            <span className="font-pixel ml-auto rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] text-white">
              OGA alarm
            </span>
          </div>
          <div className="relative mt-4 flex gap-3 rounded-xl border border-red-300/80 bg-red-500/18 p-3.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
              <CircleAlert size={18} />
            </span>
            <div>
              <div className="font-pixel text-[10px] uppercase tracking-[0.2em]">
                Note
              </div>
              <p className="mt-1 text-[13.5px] leading-relaxed text-white/90">
                {card.note}
              </p>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2 text-[#0a4f9e]">
            <Landmark size={18} />
            <span className="text-[18px] font-semibold">Case Details</span>
          </div>
        </div>

        <div className="px-5 py-5">
          <div className="font-mono text-[18px] font-bold text-[#0a4f9e]">
            {card.caseNumber}
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="space-y-4">
              <div>
                <div className="text-[13px] text-slate-500">Violations</div>
                <div className="mt-1 text-[14.5px] font-semibold text-[#0a4f9e]">
                  {card.violation}
                </div>
              </div>
              <div>
                <div className="text-[13px] text-slate-500">Apprehension</div>
                <div className="mt-2 space-y-2.5">
                  <div className="flex items-center gap-2 text-[13.5px] font-semibold text-[#0a4f9e]">
                    <MapPin size={15} className="text-slate-500" />
                    {card.location}
                  </div>
                  <div className="flex items-center gap-2 text-[13.5px] font-semibold text-[#0a4f9e]">
                    <CalendarDays size={15} className="text-slate-500" />
                    {card.date}
                  </div>
                  <div className="flex items-center gap-2 text-[13.5px] font-semibold text-[#0a4f9e]">
                    <Clock size={15} className="text-slate-500" />
                    {card.time}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:block sm:space-y-4">
              <div>
                <div className="text-[13px] text-slate-500">Status</div>
                <div className="mt-1 text-[14.5px] font-semibold text-[#0a4f9e]">
                  {card.status}
                </div>
              </div>
              <div>
                <div className="text-[13px] text-slate-500">Fine</div>
                <div className="mt-1 text-[14.5px] font-semibold text-slate-500">
                  {card.fine}
                </div>
              </div>
              <div>
                <div className="text-[13px] text-slate-500">Source</div>
                <div className="mt-1 text-[14.5px] font-semibold text-[#0a4f9e]">
                  {card.source}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-[#fafcff] px-5 py-4">
          <ActionButton onClick={primary}>
            {card.action} <ChevronRight size={16} />
          </ActionButton>
        </div>
      </div>
    );
  }

  if (card.kind === "checklist") {
    return (
      <CardShell
        icon={<FileText size={13} />}
        title={card.title}
        tag="Eligible"
      >
        <ul className="space-y-3 px-5 py-4">
          {card.items.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 text-[14.5px] leading-snug text-slate-600"
            >
              <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Check size={11} strokeWidth={3} />
              </span>
              {item}
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-y border-slate-100 bg-[#fafcff] px-5 py-3">
          <FieldLabel>Total fee</FieldLabel>
          <span className="text-[15px] font-semibold text-[#0a4f9e]">
            {card.fee}
          </span>
        </div>
        <div className="px-5 py-4">
          <ActionButton onClick={primary}>
            <CreditCard size={16} /> {card.action}
          </ActionButton>
          {secondaryPrint}
        </div>
      </CardShell>
    );
  }

  if (card.kind === "contributions") {
    return (
      <CardShell
        icon={<Database size={13} />}
        title={card.title}
        tag="Up to date"
      >
        <div className="px-5">
          {card.rows.map((r) => (
            <div
              key={r.month}
              className="flex items-center gap-3 border-b border-slate-50 py-3 last:border-0"
            >
              <span className="text-[14px] text-slate-500">{r.month}</span>
              <span className="ml-auto text-[14.5px] font-semibold tabular-nums text-slate-700">
                {r.amount}
              </span>
              <span className="font-pixel flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[8.5px] uppercase tracking-[0.14em] text-emerald-600">
                <Check size={9} strokeWidth={3.5} />
                {r.status}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 bg-[#fafcff] px-5 py-3.5">
          <div>
            <FieldLabel>Total posted</FieldLabel>
            <div className="mt-0.5 text-[12px] text-slate-400">{card.meta}</div>
          </div>
          <span className="text-[17px] font-bold tabular-nums text-[#0a4f9e]">
            {card.total}
          </span>
        </div>
        {card.print && (
          <div className="border-t border-slate-100 px-5 py-3.5">
            <PrintButton
              label={card.printLabel ?? "Print statement"}
              onClick={() => printForm(card.print!, user)}
            />
          </div>
        )}
      </CardShell>
    );
  }

  return (
    <CardShell icon={<FileText size={13} />} title={card.title} tag="Active">
      <div className="grid grid-flow-dense grid-cols-2 gap-x-4 gap-y-4 px-5 py-4">
        {card.fields.map((f) => (
          <div
            key={f.label}
            className={`min-w-0 ${f.value.length > 24 ? "col-span-2" : ""}`}
          >
            <FieldLabel>{f.label}</FieldLabel>
            {f.label === "Status" ? (
              <span className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-medium text-emerald-600">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span className="truncate">{f.value}</span>
              </span>
            ) : (
              <div className="mt-1 text-[13.5px] font-medium leading-snug text-slate-700">
                {f.value}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="px-5 pb-4">
        <ActionButton onClick={primary}>
          {card.intent ? (
            <>
              {card.action} <ChevronRight size={16} />
            </>
          ) : (
            <>
              <Printer size={15} /> {card.action}
            </>
          )}
        </ActionButton>
        {secondaryPrint}
      </div>
    </CardShell>
  );
}
