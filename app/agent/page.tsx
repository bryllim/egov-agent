"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
  Image as ImageIcon,
  Landmark,
  Mail,
  MapPin,
  Mic,
  Phone,
  Printer,
  Search,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";
import { AgentMark } from "@/components/brand";
import { AgencySeal, sealFor } from "@/components/agency";
import {
  Map as SiteMap,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MarkerTooltip,
} from "@/components/ui/map";
import { printForm } from "./forms";
import { useAgentShell } from "./shell";
import { DEMO_DATES as D } from "./dates";
import {
  agentPlan,
  THINKING_DELAY_MS,
  type AgentActivity,
  type Card,
  type Msg,
  type StepIcon,
  type TraceStep,
  type User,
} from "./brain";

/* --------------------------------- page ----------------------------------- */

export default function AgentPage() {
  const {
    user,
    conversations,
    setConversations,
    activeConvId,
    setActiveConvId,
  } = useAgentShell();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [agentProgress, setAgentProgress] = useState<AgentActivity | null>(null);
  const [streamingId, setStreamingId] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const idRef = useRef(0);
  const convIdRef = useRef(0);
  const lastHandledConvRef = useRef<string | null | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);
  const agentTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const busy = agentProgress !== null || streamingId !== null;

  const clearAgentTimers = useCallback(() => {
    agentTimersRef.current.forEach(clearTimeout);
    agentTimersRef.current = [];
  }, []);

  useEffect(() => clearAgentTimers, [clearAgentTimers]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentProgress]);

  /* Load the transcript when the sidebar switches conversations */
  useEffect(() => {
    if (lastHandledConvRef.current === activeConvId) return;
    lastHandledConvRef.current = activeConvId;
    clearAgentTimers();
    setAgentProgress(null);
    setStreamingId(null);
    setInput("");
    if (activeConvId === null) {
      setMessages([]);
    } else {
      const conv = conversations.find((c) => c.id === activeConvId);
      setMessages(conv ? conv.messages : []);
    }
  }, [activeConvId, conversations, clearAgentTimers]);

  /* Keep the active conversation's transcript in sync with the chat */
  useEffect(() => {
    if (activeConvId === null) return;
    setConversations((cs) =>
      cs.map((c) => (c.id === activeConvId ? { ...c, messages } : c))
    );
  }, [messages, activeConvId, setConversations]);

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
        lastHandledConvRef.current = convId;
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
            attachments: plan.attachments,
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
    [
      activeConvId,
      busy,
      clearAgentTimers,
      input,
      setActiveConvId,
      setConversations,
      user,
    ]
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

  const empty = messages.length === 0;

  return (
    <>
      {/* Messages */}
      <div className="scrollbar-subtle relative flex-1 overflow-y-auto">
        {empty && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 flex justify-center overflow-hidden"
          >
            <div className="aurora absolute top-[3%] h-[480px] w-[760px]" />
            <div className="aurora-reverse absolute top-[10%] h-[400px] w-[600px]" />
          </div>
        )}
        <div className="relative z-10 mx-auto flex min-h-full w-full max-w-2xl flex-col px-6 py-8">
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
                Passports, clearances, contributions, licenses — just ask,
                and I&apos;ll take care of it.
              </p>
              <div className="animate-fade-up delay-300 mt-6">
                <TodayChip />
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
                        <RichText text={m.text} />
                      )}
                      {m.attachments && m.id !== streamingId && (
                        <div className="animate-fade-in flex flex-wrap gap-2">
                          {m.attachments.map((a) => (
                            <a
                              key={a.name}
                              href={a.href}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 rounded-full bg-white py-1.5 pl-2.5 pr-3 text-[12.5px] font-medium text-[#0a4f9e] shadow-[0_8px_20px_-10px_rgba(6,61,125,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-10px_rgba(6,61,125,0.45)]"
                            >
                              {/\.(jpe?g|png|webp)$/i.test(a.href) ? (
                                <ImageIcon size={12} className="shrink-0" />
                              ) : (
                                <FileText size={12} className="shrink-0" />
                              )}
                              {a.name}
                            </a>
                          ))}
                        </div>
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

      <DemoGuideModal open={showGuide} onClose={() => setShowGuide(false)} />
    </>
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
  spark: Zap,
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

function ScenarioCard({
  phrase,
  result,
  chain,
}: {
  phrase: string;
  result: string;
  chain?: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50/80 p-3.5">
      <TypeThis>{phrase}</TypeThis>
      <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
        {result}
      </p>
      {chain && (
        <p className="mt-1.5 text-[12px] leading-relaxed text-slate-600">
          <span className="font-semibold text-[#0a4f9e]">Then:</span> {chain}
        </p>
      )}
    </div>
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
        className="animate-bubble-in scrollbar-subtle max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"
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
          <p className="max-w-2xl text-[13.5px] leading-relaxed text-slate-600">
            &ldquo;One PhilSys login, one conversation — and an AI agent
            transacts with 34 government agencies for you: it verifies, books,
            pays, and hands you print-ready documents.&rdquo;
          </p>

          <div className="grid gap-x-8 sm:grid-cols-2">
            <div>
              <GuideHeading>Act 1 — The hero flow (~90s)</GuideHeading>
              <ol className="space-y-2.5">
                <GuideStep n={1}>
                  Type <TypeThis>Find the nearest DFA office</TypeThis>. While
                  the timeline runs, narrate it: &ldquo;PhilSys verified me, PSA
                  located my address, DFA returned live slots — I never filled a
                  form.&rdquo; A real map of passport sites appears — point at
                  the pulsing recommended pin, hover the others.
                </GuideStep>
                <GuideStep n={2}>
                  When the reply streams in, click{" "}
                  <TypeThis>Completed 4 steps…</TypeThis> to expand the audit
                  trail — &ldquo;every action is logged and consented.&rdquo;
                </GuideStep>
                <GuideStep n={3}>
                  Click{" "}
                  <TypeThis>{`Book Megamall · ${D.dfaShort}, 10:30 AM`}</TypeThis>{" "}
                  under the map — the agent books it end-to-end: reference
                  number, email, SMS, calendar.
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
                  New conversation →{" "}
                  <TypeThis>Check my SSS contributions</TypeThis> → point at the
                  live data card →{" "}
                  <TypeThis>Print contribution statement</TypeThis>.
                </GuideStep>
                <GuideStep n={7}>
                  New conversation → <TypeThis>PhilHealth member record</TypeThis>{" "}
                  → click <TypeThis>Email certified MDR</TypeThis> — digitally
                  signed and QR-verifiable.
                </GuideStep>
              </ol>
            </div>

            <div>
              <GuideHeading>Act 3 — LTO violation alarm (~45s)</GuideHeading>
              <ol className="space-y-2.5">
                <GuideStep n={8}>
                  New conversation →{" "}
                  <TypeThis>Check if I have any LTO violations</TypeThis>. Let
                  the <TypeThis>Thinking...</TypeThis> loader breathe before the
                  LTO/OGA trace appears.
                </GuideStep>
                <GuideStep n={9}>
                  Open <TypeThis>Completed 4 steps…</TypeThis> and call out the
                  OGA alarm: LTO transactions are blocked until the case is
                  settled.
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
                  Show the sidebar: every chat is saved and highlighted — click
                  an older one to jump back with its full transcript.
                </GuideStep>
                <GuideStep n={12}>
                  Tap the mic and say{" "}
                  <TypeThis>Renew my driver&apos;s license</TypeThis> — voice
                  works.
                </GuideStep>
                <GuideStep n={13}>
                  End with <TypeThis>Salamat!</TypeThis> — the agent replies in
                  Taglish. Mention the copy button under every reply.
                </GuideStep>
              </ol>
            </div>
          </div>

          <GuideHeading>
            Scenario library — everything you can type
          </GuideHeading>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <ScenarioCard
              phrase="Find the nearest DFA office"
              result="4-agency run (PhilSys → PSA → DFA → rank), then a live map of 5 passport sites with your location and the recommended pin."
              chain={`Book Megamall · ${D.dfaShort}, 10:30 AM → booking confirmation → Print appointment pass.`}
            />
            <ScenarioCard
              phrase="Renew my passport"
              result="DFA eligibility check + earliest-slot appointment card."
              chain="Confirm this slot → booked with email/SMS/calendar. Print pre-filled application → the REAL DFA form, filled out."
            />
            <ScenarioCard
              phrase="Get an NBI clearance"
              result="Fully-online checklist: biometrics on file, purpose, fees."
              chain="Pay with eGov Pay → official receipt card → Print official receipt or the application form."
            />
            <ScenarioCard
              phrase="Check my SSS contributions"
              result="Live contribution table — monthly postings, ₱142,470 total, 87 months."
              chain="Print contribution statement."
            />
            <ScenarioCard
              phrase="PhilHealth member record"
              result="Member Data Record card: PIN, member type, dependents, premium status."
              chain="Email certified MDR → issued + sent → Print MDR copy → the REAL PhilHealth PMRF, filled out."
            />
            <ScenarioCard
              phrase="Renew my driver's license"
              result="LTO renewal checklist — license on file, no violations, CDE exam required."
              chain="Start CDE exam → enrolled + link emailed → Print renewal application → the REAL LTO Form 21, filled out."
            />
            <ScenarioCard
              phrase="Check if I have any LTO violations"
              result="OGA alarm case card — TRX-LETAS case no., 5.STS-8 Obstruction, PENDING, all LTO transactions blocked."
              chain="Proceed to Payment → settlement handoff + alarm-lift request."
            />
            <ScenarioCard
              phrase="Apply for a Postal ID"
              result={`The memory flex: recalls you're in Mandaluyong, your SMS + email reminder preference, and your ${D.dfaShort} DFA appointment — then attaches all 3 requirements from your Vault as clickable file chips. Open one live: the real PSA certificate PDF renders.`}
              chain={`Book capture · ${D.postalShort}, 9:00 AM → booked around your existing schedule → Print appointment pass listing the vault documents.`}
            />
            <ScenarioCard
              phrase="Do I need to file my taxes?"
              result="BIR breadth answer: TIN active at RDO 40, 2025 return filed via substituted filing — no card, pure knowledge."
            />
            <ScenarioCard
              phrase="Salamat!"
              result="Instant Taglish reply with no agency run — perfect for the tiering story: “heuristics answered that one for free.”"
            />
            <ScenarioCard
              phrase="Help me get a business permit"
              result="Anything unscripted falls back to a 3-step service-directory discovery run — the agent never dead-ends."
            />
          </div>

          <GuideHeading>Beyond the chat</GuideHeading>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <ScenarioCard
              phrase="Connected agencies"
              result="Sidebar page — 8 agencies live with real logos; click Connect on Pag-IBIG and watch it handshake and flip to Connected."
            />
            <ScenarioCard
              phrase="Memory"
              result={`What the agent remembers with sources — the Mandaluyong address, reminder preferences, and the ${D.dfaShort} appointment it uses in the Postal ID scenario.`}
            />
            <ScenarioCard
              phrase="Vault"
              result="The document vault: open the actual PSA birth certificate, Meralco bill, and 2×2 photo — the same files the Postal ID chat links to. Upload any file live and it lands encrypted on top."
            />
            <ScenarioCard
              phrase="How it works"
              result="The architecture page: challenge, request lifecycle, tiered AI with the −94% cost story, data boundaries. Your ammo for judges' technical questions."
            />
            <ScenarioCard
              phrase="Profile (click your avatar)"
              result="Read-only PhilSys identity: personal info, contact details, and every linked agency record with live statuses."
            />
          </div>

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
              • The map needs internet (basemap tiles) — everything else runs
              offline.
            </li>
            <li>
              • All scenario dates are computed from today — the DFA slot is
              always in two weeks, the Postal ID capture two days after, so
              the story matches whatever day you present.
            </li>
            <li>
              • Refreshing the page resets all conversations to the seeded
              list.
            </li>
            <li>• Go full screen and close extra tabs before you start.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function TodayChip() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="font-pixel inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-[9px] uppercase tracking-[0.16em] text-slate-500 shadow-[0_8px_20px_-10px_rgba(6,61,125,0.3)] backdrop-blur">
      <CalendarDays size={11} className="shrink-0 text-[#0a4f9e]" />
      {now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })}
      <span className="h-1 w-1 rounded-full bg-slate-300" />
      {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
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
    navigator.clipboard?.writeText(text.replaceAll("**", "")).catch(() => {});
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

/* Tokenize "**bold**" markers into word tokens that survive streaming.
   Bold is tracked as character ranges so punctuation stays glued to words. */
function tokenizeRich(text: string): { t: string; b: boolean }[] {
  const ranges: [number, number][] = [];
  let plain = "";
  let bold = false;
  let rangeStart = 0;
  let i = 0;
  while (i < text.length) {
    if (text.startsWith("**", i)) {
      if (!bold) {
        rangeStart = plain.length;
        bold = true;
      } else {
        ranges.push([rangeStart, plain.length]);
        bold = false;
      }
      i += 2;
    } else {
      plain += text[i];
      i += 1;
    }
  }
  if (bold) ranges.push([rangeStart, plain.length]);

  const tokens: { t: string; b: boolean }[] = [];
  let idx = 0;
  for (const w of plain.split(" ")) {
    const wordStart = idx;
    idx += w.length + 1;
    if (!w) continue;
    const b = ranges.some(
      ([s, e]) => wordStart < e && wordStart + w.length > s
    );
    tokens.push({ t: w, b });
  }
  return tokens;
}

function RichTokens({ tokens }: { tokens: { t: string; b: boolean }[] }) {
  return (
    <>
      {tokens.map((tok, i) => (
        <span key={i}>
          {tok.b ? (
            <strong className="font-semibold text-slate-900">{tok.t}</strong>
          ) : (
            tok.t
          )}
          {i < tokens.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

function RichText({ text }: { text: string }) {
  const tokens = useMemo(() => tokenizeRich(text), [text]);
  return (
    <p className="text-[16.5px] leading-[1.65] text-slate-700">
      <RichTokens tokens={tokens} />
    </p>
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
  const words = useMemo(() => tokenizeRich(text), [text]);
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
      <RichTokens tokens={words.slice(0, count)} />
      <span className="stream-cursor" aria-hidden />
    </p>
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
    <div className="max-w-md overflow-hidden rounded-2xl bg-white shadow-[0_18px_44px_-26px_rgba(6,61,125,0.35)]">
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
      <div className="max-w-xl overflow-hidden rounded-2xl bg-white shadow-[0_18px_44px_-26px_rgba(6,61,125,0.35)]">
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

  if (card.kind === "map") {
    return (
      <div className="max-w-xl overflow-hidden rounded-2xl bg-white shadow-[0_18px_44px_-26px_rgba(6,61,125,0.35)]">
        <div className="flex items-center gap-2.5 border-b border-slate-100 bg-[#fafcff] px-5 py-3">
          <AgencySeal label="DFA" size={24} />
          <span className="font-pixel min-w-0 truncate text-[10.5px] uppercase tracking-[0.16em] text-[#0a4f9e]">
            {card.title}
          </span>
          <span className="font-pixel ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[8.5px] uppercase tracking-[0.14em] text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {card.sites.length} sites live
          </span>
        </div>

        <div className="h-64 w-full">
          <SiteMap
            theme="light"
            center={[card.center[0], card.center[1]]}
            zoom={card.zoom}
          >
            <MapControls />

            {/* your location */}
            <MapMarker longitude={card.you.lng} latitude={card.you.lat}>
              <MarkerContent>
                <span className="relative flex h-4 w-4">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2f89e6] opacity-40" />
                  <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-[#2f89e6] shadow-md" />
                </span>
              </MarkerContent>
              <MarkerTooltip>{card.you.label}</MarkerTooltip>
            </MapMarker>

            {card.sites.map((s) => (
              <MapMarker key={s.id} longitude={s.lng} latitude={s.lat}>
                <MarkerContent>
                  {s.recommended ? (
                    <span className="relative block">
                      <span className="absolute -inset-1.5 animate-ping rounded-full bg-[#0a4f9e]/25" />
                      <span className="relative flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-2.5 shadow-lg ring-2 ring-[#0a4f9e]">
                        <AgencySeal label="DFA" size={20} />
                        <span className="whitespace-nowrap text-[10px] font-bold text-[#0a4f9e]">
                          {s.slot.split(" · ")[0]}
                        </span>
                      </span>
                    </span>
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-300">
                      <AgencySeal label="DFA" size={20} />
                    </span>
                  )}
                </MarkerContent>
                <MarkerTooltip>{s.name}</MarkerTooltip>
                <MarkerPopup>
                  <div className="min-w-40 p-1">
                    <div className="text-[12.5px] font-semibold text-slate-700">
                      {s.name}
                    </div>
                    <div className="mt-1 text-[11.5px] text-slate-500">
                      {s.distance} away · earliest slot {s.slot}
                    </div>
                  </div>
                </MarkerPopup>
              </MapMarker>
            ))}
          </SiteMap>
        </div>

        <div className="px-5">
          {card.sites.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 border-b border-slate-50 py-2.5 last:border-0"
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  s.recommended ? "bg-[#0a4f9e]" : "bg-slate-300"
                }`}
              />
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-slate-700">
                {s.name}
              </span>
              <span className="font-pixel shrink-0 text-[9px] uppercase tracking-[0.12em] text-slate-400">
                {s.distance} · {s.slot}
              </span>
              {s.recommended && (
                <span className="font-pixel shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[8.5px] uppercase tracking-[0.14em] text-emerald-600">
                  Nearest
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="px-5 py-4">
          <ActionButton onClick={primary}>
            {card.action} <ChevronRight size={16} />
          </ActionButton>
          {secondaryPrint}
        </div>
      </div>
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
