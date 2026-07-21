"use client";

import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bell,
  Brain,
  Check,
  ChevronsRight,
  Cloud,
  Cpu,
  CreditCard,
  FileText,
  Fingerprint,
  Landmark,
  Lock,
  MessageCircle,
  Route,
  ScrollText,
  Server,
  ShieldCheck,
  Smartphone,
  Timer,
  Trash2,
  TriangleAlert,
  Workflow,
  Zap,
} from "lucide-react";
import { AgencySeal } from "@/components/agency";

/* Tier palette — validated (CVD ΔE 22.5, contrast ≥ 3:1 on #f7faff) */
const TIER_COLORS = {
  heuristics: "#059669",
  local: "#2f89e6",
  cloud: "#0a4f9e",
};

const TIERS = [
  {
    key: "heuristics",
    icon: <Zap size={16} />,
    color: TIER_COLORS.heuristics,
    name: "Tier 1 — Heuristics",
    what: "Pattern rules & intent matching",
    handles: "Known intents, lookups, status checks",
    cost: "~₱0.00 / query",
    latency: "< 10 ms",
    share: 78,
  },
  {
    key: "local",
    icon: <Cpu size={16} />,
    color: TIER_COLORS.local,
    name: "Tier 2 — Local AI",
    what: "Small model on DICT servers",
    handles: "Taglish understanding & extraction — PII stays on gov infra",
    cost: "~₱0.02 / query",
    latency: "~120 ms",
    share: 17,
  },
  {
    key: "cloud",
    icon: <Cloud size={16} />,
    color: TIER_COLORS.cloud,
    name: "Tier 3 — Cloud AI",
    what: "Frontier model, on demand",
    handles: "Hard multi-agency planning — PII redacted first",
    cost: "~₱1.50 / query",
    latency: "1–3 s",
    share: 5,
  },
];

const FLOW: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  chips?: { icon: React.ReactNode; label: string; color: string }[];
  logos?: string[];
}[] = [
  {
    icon: <MessageCircle size={15} />,
    title: "Headless channel adapter",
    detail: "Web chat · Viber · messaging apps · agency apps · any API client",
  },
  {
    icon: <Fingerprint size={15} />,
    title: "eGov Gateway",
    detail: "PhilSys eVerify session · end-to-end encrypted",
  },
  {
    icon: <Route size={15} />,
    title: "Intent Router",
    detail: "Cheapest path that can answer — escalates only on low confidence",
    chips: [
      { icon: <Zap size={11} />, label: "Heuristics", color: TIER_COLORS.heuristics },
      { icon: <Cpu size={11} />, label: "Local AI", color: TIER_COLORS.local },
      { icon: <Cloud size={11} />, label: "Cloud AI", color: TIER_COLORS.cloud },
    ],
  },
  {
    icon: <Workflow size={15} />,
    title: "Agent Orchestrator",
    detail: "Plans with your context · asks consent · executes · logs",
  },
  {
    icon: <Landmark size={15} />,
    title: "Agency integrations",
    detail: "Official APIs · records stay at the source",
    logos: ["PhilSys", "DFA", "NBI", "SSS", "PhilHealth", "LTO", "BIR", "eGov Pay"],
  },
  {
    icon: <ScrollText size={15} />,
    title: "Your result",
    detail: "Streamed reply · live cards · print-ready forms",
  },
];

const CONTEXT_SOURCES = [
  {
    icon: <MessageCircle size={15} />,
    title: "Conversation memory",
    detail: "Preferences & facts it learns",
  },
  {
    icon: <Lock size={15} />,
    title: "Document vault",
    detail: "Birth certificate, IDs, proofs",
  },
  {
    icon: <Landmark size={15} />,
    title: "Linked records",
    detail: "Live data from 34 agencies",
  },
];

const CONTEXT_OUTCOMES = [
  "Pre-fills every form",
  "Never asks twice",
  "Picks offices near you",
  "Remembers your appointments",
];

const VM_STEPS = [
  {
    icon: <Server size={15} />,
    title: "Provision",
    detail: "Isolated VM spins up — your data mounted, encrypted",
  },
  {
    icon: <Workflow size={15} />,
    title: "Execute",
    detail: "Runs the task: portals, forms, batch steps",
  },
  {
    icon: <FileText size={15} />,
    title: "Deliver",
    detail: "Documents & receipts return to your chat",
  },
  {
    icon: <Trash2 size={15} />,
    title: "Destroy",
    detail: "Wiped clean — nothing persists",
  },
];

const ORCHESTRATOR_BRANCHES = [
  {
    icon: <Landmark size={13} />,
    title: "Agency connectors",
    detail: "Records, eligibility, appointment slots",
    logos: true,
  },
  {
    icon: <CreditCard size={13} />,
    title: "eGov Pay",
    detail: "Fees charged, receipts issued",
  },
  {
    icon: <FileText size={13} />,
    title: "Document engine",
    detail: "Real agency forms, pre-filled & printable",
  },
  {
    icon: <Bell size={13} />,
    title: "eGov Notify",
    detail: "Email · SMS · calendar reminders",
  },
  {
    icon: <Server size={13} />,
    title: "Sandbox VMs",
    detail: "Own isolated machine for long agentic tasks",
  },
  {
    icon: <ShieldCheck size={13} />,
    title: "Consent & audit",
    detail: "Approval first · every call logged",
  },
];

const ZONES = [
  {
    icon: <Smartphone size={14} />,
    name: "Your device",
    tone: "border-slate-200 bg-white",
    tag: null,
    items: ["Chat UI", "Session key only", "Nothing stored"],
  },
  {
    icon: <Server size={14} />,
    name: "Government infrastructure",
    tone: "border-[#0a4f9e]/20 bg-[#f2f7ff]",
    tag: { text: "PII stays here", cls: "bg-emerald-50 text-emerald-600" },
    items: [
      "Heuristics + router",
      "Local AI model",
      "Memory & document vault",
      "Ephemeral task VMs — destroyed after use",
      "Audit log",
    ],
  },
  {
    icon: <Cloud size={14} />,
    name: "Cloud AI",
    tone: "border-dashed border-slate-300 bg-slate-50/60",
    tag: { text: "Redacted prompts only", cls: "bg-[#0a4f9e]/5 text-[#0a4f9e]" },
    items: ["The hard 5% only", "Names & IDs stripped", "No retention"],
  },
];

const TRUST = [
  {
    icon: <Fingerprint size={13} />,
    title: "PhilSys-verified identity",
    detail: "Every session is a verified person, not an account.",
  },
  {
    icon: <ShieldCheck size={13} />,
    title: "Consent gate",
    detail: "Asks before any read, booking, or payment.",
  },
  {
    icon: <ScrollText size={13} />,
    title: "Full audit trail",
    detail: "Every agency call logged & reviewable.",
  },
  {
    icon: <Lock size={13} />,
    title: "Zero data hoarding",
    detail: "Records stay at agencies; vault encrypted.",
  },
];

const PAIN_POINTS = [
  "One app & login per agency",
  "Same data re-typed on every form",
  "Queues & repeat visits",
  "No single status or receipt trail",
];

const WINS = [
  "One verified conversation",
  "PhilSys fills forms once",
  "Agent books & pays for you",
  "One trail: receipts & documents",
];

const RAILS: { label: string; name: string; role: string }[] = [
  { label: "PhilSys", name: "PhilSys + eVerify (PSA)", role: "Identity rails" },
  { label: "eGovPH", name: "eGovPH super app (DICT)", role: "SSO & service directory" },
  { label: "eGov Pay", name: "eGov Pay", role: "One wallet for fees" },
  { label: "DFA", name: "DFA e-Appointment", role: "Passport slots" },
  { label: "NBI", name: "NBI Clearance Online", role: "Digital clearances" },
  { label: "SSS", name: "My.SSS", role: "Contributions & benefits" },
  { label: "PhilHealth", name: "PhilHealth Member Portal", role: "Member records" },
  { label: "LTO", name: "LTO LTMS", role: "License transactions" },
  { label: "BIR", name: "BIR eFPS", role: "Tax records" },
];

function Section({
  n,
  title,
  lead,
  children,
}: {
  n: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="animate-fade-up mt-10 border-t border-slate-200/70 pt-8">
      <div className="flex items-center gap-3">
        <span className="bg-brand-gradient font-pixel flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white">
          {n}
        </span>
        <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
      </div>
      {lead && (
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-slate-500">
          {lead}
        </p>
      )}
      <div className="mt-5">{children}</div>
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
    <div
      className={`rounded-xl bg-white p-4 shadow-[0_18px_44px_-30px_rgba(6,61,125,0.3)] ${className}`}
    >
      {children}
    </div>
  );
}

export default function HowItWorksPage() {
  const router = useRouter();

  return (
    <div className="scrollbar-subtle flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <div className="animate-fade-up flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/agent")}
            className="group flex cursor-pointer items-center gap-2 rounded-full text-[13.5px] font-medium text-slate-500 transition hover:text-[#0a4f9e]"
          >
            <ArrowLeft
              size={16}
              className="transition group-hover:-translate-x-0.5"
            />
            Back to conversation
          </button>
        </div>

        <div className="animate-fade-up delay-100 mt-7">
          <h1 className="text-[24px] font-semibold tracking-tight">
            How eGov Agent works
          </h1>
          <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-slate-500">
            One completely headless agent behind any conversation channel —
            with tiered AI, personal context, and disposable task machines.
          </p>
        </div>

        {/* ------------------------ 01 challenge & big picture ------------------------ */}
        <Section
          n="01"
          title="The challenge & the big picture"
          lead="E-government works — but fragmented. Citizens carry the integration burden."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Panel>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
                  <TriangleAlert size={13} />
                </span>
                <span className="text-[13px] font-semibold text-slate-700">
                  Today
                </span>
              </div>
              <ul className="mt-3 space-y-2">
                {PAIN_POINTS.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-2 text-[12px] leading-snug text-slate-500"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-red-300" />
                    {p}
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Check size={13} strokeWidth={3} />
                </span>
                <span className="text-[13px] font-semibold text-slate-700">
                  With eGov Agent
                </span>
              </div>
              <ul className="mt-3 space-y-2">
                {WINS.map((w) => (
                  <li
                    key={w}
                    className="flex items-start gap-2 text-[12px] leading-snug text-slate-500"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                    {w}
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <div className="mt-4 grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1.15fr_auto_1fr]">
            <Panel className="flex flex-col items-center justify-center py-5 text-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f2f7ff] text-[#0a4f9e]">
                <Smartphone size={16} />
              </span>
              <div className="mt-2.5 text-[13.5px] font-semibold text-slate-700">
                You
              </div>
              <div className="mt-1 text-[11.5px] leading-snug text-slate-400">
                One chat, in your language
              </div>
            </Panel>
            <div className="flex items-center justify-center">
              <ArrowRight size={16} className="hidden text-slate-300 sm:block" />
              <ArrowDown size={16} className="text-slate-300 sm:hidden" />
            </div>
            <Panel className="flex flex-col items-center justify-center py-5 text-center">
              <span className="bg-brand-gradient flex h-9 w-9 items-center justify-center rounded-full text-white">
                <Workflow size={16} />
              </span>
              <div className="mt-2.5 text-[13.5px] font-semibold text-slate-700">
                eGov Agent
              </div>
              <div className="mt-1 text-[11.5px] leading-snug text-slate-400">
                Verifies, plans, executes & documents
              </div>
            </Panel>
            <div className="flex items-center justify-center">
              <ArrowRight size={16} className="hidden text-slate-300 sm:block" />
              <ArrowDown size={16} className="text-slate-300 sm:hidden" />
            </div>
            <Panel className="flex flex-col items-center justify-center py-5 text-center">
              <div className="flex items-center justify-center -space-x-1.5">
                {["DFA", "SSS", "LTO"].map((l) => (
                  <AgencySeal key={l} label={l} size={24} />
                ))}
              </div>
              <div className="mt-2.5 text-[13.5px] font-semibold text-slate-700">
                34 agencies
              </div>
              <div className="mt-1 text-[11.5px] leading-snug text-slate-400">
                Records stay at the source
              </div>
            </Panel>
          </div>

          <Panel className="mt-4 bg-[linear-gradient(135deg,rgba(242,247,255,0.92),rgba(255,255,255,0.98))]">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0a4f9e] text-white shadow-[0_10px_24px_-14px_rgba(6,61,125,0.7)]">
                <MessageCircle size={16} />
              </span>
              <div className="min-w-0">
                <h3 className="text-balance text-[14px] font-semibold leading-tight text-slate-700">
                  Completely headless — built for any messaging app
                </h3>
                <p className="mt-1.5 max-w-2xl text-pretty text-[12.5px] leading-relaxed text-slate-500">
                  The orchestration engine has no dependency on this web
                  interface. Channel adapters can embed the same agent in
                  Viber, other messaging platforms, agency apps, or any
                  API-capable client without rebuilding the government-service
                  logic.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {["Web chat", "Viber", "Messaging APIs", "Agency apps"].map(
                    (channel) => (
                      <span
                        key={channel}
                        className="font-pixel rounded-full bg-white px-2.5 py-1 text-[8.5px] uppercase tracking-[0.12em] text-[#0a4f9e] shadow-[0_8px_20px_-14px_rgba(6,61,125,0.35)]"
                      >
                        {channel}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="mt-4">
            <div className="text-[13px] font-semibold text-slate-700">
              Built on rails the government already runs
            </div>
            <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {RAILS.map((r) => (
                <div key={r.name} className="flex items-center gap-3">
                  <AgencySeal label={r.label} size={26} />
                  <div className="min-w-0">
                    <div className="truncate text-[12.5px] font-semibold text-slate-700">
                      {r.name}
                    </div>
                    <div className="truncate text-[11.5px] text-slate-400">
                      {r.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </Section>

        {/* --------------------------- 02 life of a request --------------------------- */}
        <Section
          n="02"
          title="The life of a request"
          lead="Message → booked appointment in ~12 seconds."
        >
          <div className="bg-brand-gradient mb-1 ml-12 inline-block max-w-xs rounded-3xl rounded-br-lg px-4 py-2 text-[13px] text-white">
            Renew my passport
          </div>
          {FLOW.map((node, i) => (
            <div key={node.title} className="relative flex gap-4 pt-4">
              {i < FLOW.length - 1 && (
                <span
                  aria-hidden
                  className="absolute bottom-[-16px] left-4 top-12 w-px -translate-x-1/2 bg-[#0a4f9e]/25"
                />
              )}
              <span className="z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0a4f9e] text-white">
                {node.icon}
              </span>
              <Panel className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[13.5px] font-semibold text-slate-700">
                    {node.title}
                  </span>
                  <span className="text-[12px] text-slate-400">
                    {node.detail}
                  </span>
                </div>
                {node.chips && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {node.chips.map((c) => (
                      <span
                        key={c.label}
                        className="font-pixel flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[8.5px] uppercase tracking-[0.14em] text-slate-600"
                      >
                        <span style={{ color: c.color }}>{c.icon}</span>
                        {c.label}
                      </span>
                    ))}
                  </div>
                )}
                {node.logos && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {node.logos.map((l) => (
                      <AgencySeal key={l} label={l} size={22} />
                    ))}
                    <span className="font-pixel text-[8.5px] uppercase tracking-[0.14em] text-slate-400">
                      +26 more
                    </span>
                  </div>
                )}
              </Panel>
            </div>
          ))}
        </Section>

        {/* -------------------------- 03 tiered intelligence -------------------------- */}
        <Section
          n="03"
          title="Tiered intelligence — built for cost"
          lead="Rules first, local model second, cloud only for the hard 5%."
        >
          <Panel>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#f2f7ff] text-[#0a4f9e]">
                <Route size={13} />
              </span>
              <span className="text-[13px] font-semibold text-slate-700">
                How a message is routed
              </span>
            </div>
            <div className="mt-3.5 ml-3 border-l-2 border-slate-100">
              {[
                {
                  q: "Rule matches?",
                  a: "Heuristics",
                  cost: "free",
                  color: TIER_COLORS.heuristics,
                },
                {
                  q: "Local model confident?",
                  a: "On-prem AI",
                  cost: "~₱0.02",
                  color: TIER_COLORS.local,
                },
                {
                  q: "Still unsure — the hard 5%",
                  a: "Cloud, PII redacted",
                  cost: "~₱1.50",
                  color: TIER_COLORS.cloud,
                },
              ].map((b) => (
                <div key={b.q} className="relative py-2.5 pl-5">
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-px w-3.5 bg-slate-200"
                  />
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="text-[12.5px] font-medium text-slate-600">
                      {b.q}
                    </span>
                    <ChevronsRight size={13} className="shrink-0 text-slate-300" />
                    <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-700">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: b.color }}
                      />
                      {b.a}
                    </span>
                    <span className="font-pixel rounded-full bg-slate-50 px-2 py-0.5 text-[8.5px] uppercase tracking-[0.12em] text-slate-500">
                      {b.cost}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch">
            {TIERS.map((t, i) => (
              <div key={t.key} className="contents">
                {i > 0 && (
                  <div className="hidden flex-col items-center justify-center sm:flex">
                    <ChevronsRight size={16} className="text-slate-300" />
                    <span className="font-pixel mt-1 w-16 text-center text-[7.5px] uppercase leading-relaxed tracking-[0.12em] text-slate-400">
                      low confidence
                    </span>
                  </div>
                )}
                <Panel>
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
                      style={{ background: t.color }}
                    >
                      {t.icon}
                    </span>
                    <span className="text-[13px] font-semibold text-slate-700">
                      {t.name}
                    </span>
                  </div>
                  <div className="mt-2.5 text-[12.5px] font-medium text-slate-600">
                    {t.what}
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-slate-400">
                    {t.handles}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 pt-2.5">
                    <span className="font-pixel text-[8.5px] uppercase tracking-[0.12em] text-slate-500">
                      {t.cost}
                    </span>
                    <span className="font-pixel text-[8.5px] uppercase tracking-[0.12em] text-slate-500">
                      {t.latency}
                    </span>
                  </div>
                </Panel>
              </div>
            ))}
          </div>

          {/* distribution meter */}
          <div className="mt-6">
            <div className="flex items-baseline justify-between">
              <span className="text-[12.5px] font-medium text-slate-600">
                Where messages get answered
              </span>
              <span className="font-pixel text-[8.5px] uppercase tracking-[0.14em] text-slate-400">
                Projected traffic share
              </span>
            </div>
            <div
              className="mt-2 flex h-3.5 w-full gap-[2px] overflow-hidden rounded-full"
              role="img"
              aria-label="Heuristics 78%, Local AI 17%, Cloud AI 5%"
            >
              {TIERS.map((t) => (
                <div
                  key={t.key}
                  style={{ width: `${t.share}%`, background: t.color }}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                />
              ))}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5">
              {TIERS.map((t) => (
                <span
                  key={t.key}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-slate-600"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: t.color }}
                  />
                  {t.name.split("— ")[1]} · {t.share}%
                </span>
              ))}
            </div>
          </div>

          {/* daily cost comparison */}
          <div className="mt-6">
            <span className="text-[12.5px] font-medium text-slate-600">
              Daily inference cost at 1M messages
            </span>
            <div className="mt-2.5 space-y-2.5">
              <div className="grid grid-cols-[92px_1fr_56px] items-center gap-3">
                <span className="text-[12px] text-slate-500">Cloud-only</span>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-full rounded-full bg-slate-400" />
                </div>
                <span className="text-right text-[12px] font-semibold text-slate-700">
                  ₱1.5M
                </span>
              </div>
              <div className="grid grid-cols-[92px_1fr_56px] items-center gap-3">
                <span className="text-[12px] text-slate-500">Tiered</span>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: "6%", background: TIER_COLORS.heuristics }}
                  />
                </div>
                <span className="text-right text-[12px] font-semibold text-emerald-600">
                  ₱92k
                </span>
              </div>
            </div>
          </div>

          {/* stat tiles */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { n: "95%", d: "never touches cloud AI" },
              { n: "−94%", d: "inference cost vs cloud-only" },
              { n: "<150 ms", d: "median first response" },
            ].map((s) => (
              <Panel key={s.n}>
                <div className="text-[24px] font-bold tracking-tight text-slate-800">
                  {s.n}
                </div>
                <div className="mt-1 text-[12px] leading-relaxed text-slate-500">
                  {s.d}
                </div>
              </Panel>
            ))}
          </div>
        </Section>

        {/* ------------------------- 04 personal context & memory --------------------- */}
        <Section
          n="04"
          title="It knows you — context & memory"
          lead="Every request runs with your personal context. Nothing is asked twice."
        >
          <div className="grid gap-2 sm:grid-cols-3">
            {CONTEXT_SOURCES.map((s) => (
              <Panel key={s.title} className="text-center">
                <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-[#f2f7ff] text-[#0a4f9e]">
                  {s.icon}
                </span>
                <div className="mt-2 text-[13px] font-semibold text-slate-700">
                  {s.title}
                </div>
                <div className="mt-0.5 text-[11.5px] text-slate-400">
                  {s.detail}
                </div>
              </Panel>
            ))}
          </div>
          <div className="my-2.5 flex justify-center">
            <ArrowDown size={16} className="text-slate-300" />
          </div>
          <Panel className="text-center">
            <span className="bg-brand-gradient mx-auto flex h-9 w-9 items-center justify-center rounded-full text-white">
              <Brain size={16} />
            </span>
            <div className="mt-2 text-[13.5px] font-semibold text-slate-700">
              Personal context layer
            </div>
            <div className="mx-auto mt-3 flex max-w-md flex-wrap justify-center gap-1.5">
              {CONTEXT_OUTCOMES.map((o) => (
                <span
                  key={o}
                  className="font-pixel rounded-full bg-[#0a4f9e]/5 px-2.5 py-1 text-[8.5px] uppercase tracking-[0.14em] text-[#0a4f9e]"
                >
                  {o}
                </span>
              ))}
            </div>
          </Panel>
        </Section>

        {/* -------------------------- 05 orchestrator toolbox ------------------------- */}
        <Section
          n="05"
          title="The orchestrator's toolbox"
          lead="Understood intent becomes real transactions — every tool behind the consent gate."
        >
          <Panel>
            <div className="flex items-center gap-2.5">
              <span className="bg-brand-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white">
                <Workflow size={15} />
              </span>
              <div>
                <div className="text-[13.5px] font-semibold text-slate-700">
                  Agent Orchestrator
                </div>
                <div className="text-[11.5px] text-slate-400">
                  Plans multi-step transactions, then calls its tools
                </div>
              </div>
            </div>
            <div className="mt-3.5 ml-4 border-l-2 border-slate-100">
              {ORCHESTRATOR_BRANCHES.map((b) => (
                <div key={b.title} className="relative py-2.5 pl-5">
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-px w-3.5 bg-slate-200"
                  />
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#f2f7ff] text-[#0a4f9e]">
                      {b.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-semibold text-slate-700">
                          {b.title}
                        </span>
                        {b.logos && (
                          <span className="flex items-center -space-x-1">
                            {["DFA", "NBI", "SSS", "PhilHealth", "LTO"].map(
                              (l) => (
                                <AgencySeal key={l} label={l} size={16} />
                              )
                            )}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[12px] leading-relaxed text-slate-400">
                        {b.detail}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </Section>

        {/* ----------------------------- 06 sandbox VMs ------------------------------- */}
        <Section
          n="06"
          title="Agentic tasks get their own machine"
          lead="Long or complex jobs never run on shared servers — each spins up a disposable VM with your data."
        >
          <div className="rounded-xl border-2 border-dashed border-[#0a4f9e]/25 bg-[#f7faff] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-pixel flex items-center gap-1.5 rounded-full bg-[#0a4f9e] px-2.5 py-1 text-[8.5px] uppercase tracking-[0.14em] text-white">
                <Server size={10} />
                Per-task sandbox VM
              </span>
              <span className="font-pixel flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[8.5px] uppercase tracking-[0.14em] text-slate-500 shadow-sm">
                <Timer size={10} />
                Lives only minutes
              </span>
              <span className="font-pixel flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[8.5px] uppercase tracking-[0.14em] text-slate-500 shadow-sm">
                <Lock size={10} />
                One per citizen task
              </span>
            </div>

            <div className="mt-4 grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
              {VM_STEPS.map((s, i) => (
                <div key={s.title} className="contents">
                  {i > 0 && (
                    <div className="flex items-center justify-center">
                      <ArrowRight
                        size={14}
                        className="hidden text-[#0a4f9e]/40 sm:block"
                      />
                      <ArrowDown
                        size={14}
                        className="text-[#0a4f9e]/40 sm:hidden"
                      />
                    </div>
                  )}
                  <Panel className="text-center">
                    <span
                      className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg ${
                        s.title === "Destroy"
                          ? "bg-red-50 text-red-500"
                          : "bg-[#f2f7ff] text-[#0a4f9e]"
                      }`}
                    >
                      {s.icon}
                    </span>
                    <div className="mt-2 text-[13px] font-semibold text-slate-700">
                      {s.title}
                    </div>
                    <div className="mt-1 text-[11px] leading-snug text-slate-400">
                      {s.detail}
                    </div>
                  </Panel>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ---------------------------- 07 data boundaries ---------------------------- */}
        <Section
          n="07"
          title="Where your data lives"
          lead="Three zones, one hard boundary: PII never crosses into the cloud."
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_1.2fr_1fr]">
            {ZONES.map((z) => (
              <div key={z.name} className={`rounded-xl border p-4 ${z.tone}`}>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-[#0a4f9e] shadow-sm">
                    {z.icon}
                  </span>
                  <span className="text-[13px] font-semibold text-slate-700">
                    {z.name}
                  </span>
                </div>
                {z.tag && (
                  <span
                    className={`font-pixel mt-2.5 inline-block rounded-full px-2.5 py-1 text-[8.5px] uppercase tracking-[0.14em] ${z.tag.cls}`}
                  >
                    {z.tag.text}
                  </span>
                )}
                <ul className="mt-3 space-y-2">
                  {z.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-[12px] leading-snug text-slate-500"
                    >
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* ------------------------------ 08 trust layer ------------------------------ */}
        <Section n="08" title="The trust layer">
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {TRUST.map((t) => (
              <div key={t.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f2f7ff] text-[#0a4f9e]">
                  {t.icon}
                </span>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold text-slate-700">
                    {t.title}
                  </div>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500">
                    {t.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <div className="animate-fade-up mt-8 flex items-start gap-2.5 rounded-xl bg-[#0a4f9e]/[0.04] px-4 py-3.5 text-[12.5px] leading-relaxed text-slate-500">
          <Lock size={14} className="mt-0.5 shrink-0 text-[#0a4f9e]" />
          <span>
            The same completely headless architecture scales from this demo to
            national deployment — messaging channels and the cloud tier can be
            swapped or removed without changing the agent&apos;s core logic.
          </span>
        </div>
      </div>
    </div>
  );
}
