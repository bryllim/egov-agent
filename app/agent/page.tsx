"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
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
  ImagePlus,
  Mail,
  MapPin,
  Mic,
  Paperclip,
  Phone,
  Search,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";
import { AgentMark } from "@/components/brand";
import { AgencySeal, sealFor } from "@/components/agency";
import { VaultFileStamp } from "@/components/vault-file-stamp";
import { useSensoryUI } from "@/lib/provider";
import {
  Map as SiteMap,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MarkerTooltip,
} from "@/components/ui/map";
import { PRINT_FILE_PREVIEWS, previewForm, type PrintKind } from "./forms";
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
  type UserUpload,
} from "./brain";

function latestMessageId(messages: Msg[]) {
  return messages.reduce((latest, message) => Math.max(latest, message.id), 0);
}

function ComposerUploadStamp({
  upload,
  index,
  onRemove,
}: {
  upload: UserUpload;
  index: number;
  onRemove: () => void;
}) {
  return (
    <div
      role="group"
      aria-label={`Attached ${upload.kind}: ${upload.name}`}
      title={upload.name}
      style={{ animationDelay: `${index * 60}ms` }}
      className="animate-card-in group relative flex h-[96px] w-[94px] shrink-0 items-start justify-center pt-1"
    >
      <VaultFileStamp
        name={upload.name}
        preview={upload.preview}
        index={index}
        label={upload.name}
      />
      <button
        type="button"
        aria-label={`Remove ${upload.name}`}
        title={`Remove ${upload.name}`}
        onClick={onRemove}
        className="absolute right-0 top-0 flex h-10 w-10 cursor-pointer items-center justify-center text-slate-400 transition-[color,transform] duration-150 hover:text-slate-700 active:scale-[0.96] active:text-[#0a4f9e]"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-[0_0_0_1px_oklch(0_0_0/0.06),0_4px_12px_-6px_oklch(0_0_0/0.35)]">
          <X size={12} />
        </span>
      </button>
    </div>
  );
}

/* --------------------------------- page ----------------------------------- */

export default function AgentPage() {
  const { playSound } = useSensoryUI();
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
  const [pendingUploads, setPendingUploads] = useState<UserUpload[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const idRef = useRef(0);
  const lastHandledConvRef = useRef<string | null | undefined>(undefined);
  const chatViewportRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const agentTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const busy = agentProgress !== null || streamingId !== null;

  const clearAgentTimers = useCallback(() => {
    agentTimersRef.current.forEach(clearTimeout);
    agentTimersRef.current = [];
  }, []);

  useEffect(() => clearAgentTimers, [clearAgentTimers]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (scrollFrameRef.current !== null) {
      cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const viewport = chatViewportRef.current;
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior });
        return;
      }
      bottomRef.current?.scrollIntoView({ behavior, block: "end" });
    });
  }, []);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages, agentProgress, streamingId, scrollToBottom]);

  /* Load the transcript when the sidebar switches conversations */
  useEffect(() => {
    if (lastHandledConvRef.current === activeConvId) return;
    lastHandledConvRef.current = activeConvId;
    clearAgentTimers();
    setAgentProgress(null);
    setStreamingId(null);
    setInput("");
    setPendingUploads([]);
    if (activeConvId === null) {
      idRef.current = 0;
      setMessages([]);
    } else {
      const conv = conversations.find((c) => c.id === activeConvId);
      const transcript = conv ? conv.messages : [];
      idRef.current = latestMessageId(transcript);
      setMessages(transcript);
    }
  }, [activeConvId, conversations, clearAgentTimers]);

  /* Keep the active conversation's transcript in sync with the chat */
  useEffect(() => {
    if (activeConvId === null) return;
    setConversations((cs) =>
      cs.map((c) => (c.id === activeConvId ? { ...c, messages } : c))
    );
  }, [messages, activeConvId, setConversations]);

  const handleStreamDone = useCallback(() => {
    setStreamingId(null);
    scrollToBottom("smooth");
  }, [scrollToBottom]);

  const send = useCallback(
    (raw?: string, uploads: UserUpload[] = []) => {
      const typedText = (raw ?? input).trim();
      if ((!typedText && uploads.length === 0) || !user || busy) return;

      const text =
        typedText ||
        (uploads.length === 1
          ? `Shared ${uploads[0].name}`
          : `Shared ${uploads.length} attachments`);
      const planInput = uploads.length
        ? `${typedText || "Please review these attachments."}\n\nAttachments: ${uploads
            .map((upload) => upload.name)
            .join(", ")}`
        : text;

      clearAgentTimers();
      setInput("");
      setPendingUploads([]);
      if (activeConvId === null) {
        const convId = `conv-${crypto.randomUUID()}`;
        const title =
          text.length > 44 ? `${text.slice(0, 44).trimEnd()}…` : text;
        lastHandledConvRef.current = convId;
        setConversations((cs) => [{ id: convId, title, messages: [] }, ...cs]);
        setActiveConvId(convId);
      }
      setMessages((m) => [
        ...m,
        {
          id: ++idRef.current,
          role: "user",
          text,
          uploads: uploads.length ? uploads : undefined,
        },
      ]);

      const plan = agentPlan(planInput, user);
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
        void playSound("notification.info");
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
        steps.forEach((step, index) => {
          elapsed += step.base;
          agentTimersRef.current.push(
            setTimeout(
              () => {
                void playSound(
                  index === steps.length - 1
                    ? "interaction.confirm"
                    : "interaction.subtle"
                );
                setAgentProgress((p) =>
                  p ? { ...p, currentIndex: index + 1 } : p
                );
              },
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
      playSound,
      setActiveConvId,
      setConversations,
      user,
    ]
  );

  const queueUploads = useCallback(
    (files: FileList | null, kind: UserUpload["kind"]) => {
      if (!files?.length) return;

      const additions = Array.from(files).map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        kind,
        preview: kind === "image" ? URL.createObjectURL(file) : undefined,
      }));
      setPendingUploads((current) => {
        const next = [...current, ...additions];
        next
          .slice(8)
          .forEach((upload) =>
            upload.preview ? URL.revokeObjectURL(upload.preview) : undefined
          );
        return next.slice(0, 8);
      });
      void playSound("interaction.subtle");
    },
    [playSound]
  );

  const submitComposer = useCallback(() => {
    if ((!input.trim() && pendingUploads.length === 0) || busy) return;
    void playSound("interaction.confirm");
    send(undefined, pendingUploads);
  }, [busy, input, pendingUploads, playSound, send]);

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
      void playSound("notification.error");
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
        void playSound("interaction.confirm");
        sendRef.current(transcript);
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }, [listening, playSound]);

  const empty = messages.length === 0;

  return (
    <>
      {/* Messages */}
      <div
        ref={chatViewportRef}
        className="scrollbar-subtle relative flex-1 overflow-y-auto scroll-smooth"
      >
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
              <p className="animate-fade-up delay-200 mt-3 max-w-md text-pretty text-[17px] leading-relaxed text-slate-500">
                Ask for anything you need from government — I&apos;ll understand
                your goal, coordinate the right services, and handle the steps.
              </p>
              <div className="animate-fade-up delay-300 mt-6">
                <TodayChip />
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {messages.map((m, messageIndex) =>
                m.role === "user" ? (
                  <div
                    key={`${activeConvId ?? "draft"}-${m.id}-${messageIndex}`}
                    className="animate-bubble-in flex justify-end"
                  >
                    <div className="flex max-w-[80%] flex-col items-end">
                      <div className="bg-brand-gradient rounded-3xl rounded-br-lg px-5 py-3 text-[16px] leading-relaxed text-white">
                        {m.text}
                      </div>
                      {m.uploads && (
                        <div className="mt-2 flex flex-wrap justify-end gap-2 pr-1">
                          {m.uploads.map((upload, index) => (
                            <div
                              key={upload.id}
                              role="group"
                              aria-label={`Attached ${upload.kind}: ${upload.name}`}
                              title={upload.name}
                              className="group flex h-[96px] w-[94px] items-start justify-center pt-1"
                            >
                              <VaultFileStamp
                                name={upload.name}
                                preview={upload.preview}
                                index={index}
                                label={upload.name}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    key={`${activeConvId ?? "draft"}-${m.id}-${messageIndex}`}
                    className="animate-bubble-in flex gap-4"
                  >
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
                        <div className="animate-fade-in flex flex-wrap gap-x-5 gap-y-3 pt-1">
                          {m.attachments.map((a, index) => (
                            <a
                              key={a.name}
                              href={a.href}
                              target="_blank"
                              rel="noreferrer"
                              className="group flex min-w-[180px] max-w-[230px] cursor-pointer items-center gap-3 py-1 pr-2 text-left transition-transform duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0a4f9e]/30 active:scale-[0.96]"
                            >
                              <VaultFileStamp
                                name={a.name}
                                preview={a.preview}
                                index={index}
                              />
                              <span className="min-w-0">
                                <span className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-slate-700 transition-colors duration-200 group-hover:text-[#0a4f9e] group-focus-visible:text-[#0a4f9e]">
                                  {a.name}
                                </span>
                                <span className="font-pixel mt-1 block text-[7.5px] uppercase tracking-[0.12em] text-[#0a4f9e]/65">
                                  Open file
                                </span>
                              </span>
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
        <div className="hairline mx-auto flex min-h-[116px] w-full max-w-2xl flex-col rounded-[28px] bg-white p-3">
          {pendingUploads.length > 0 && (
            <div
              className="scrollbar-subtle mb-2 flex max-w-full gap-2 overflow-x-auto overscroll-x-contain px-1 pb-2 pt-1"
              aria-label="Pending attachments"
            >
              {pendingUploads.map((upload, index) => (
                <ComposerUploadStamp
                  key={upload.id}
                  upload={upload}
                  index={index}
                  onRemove={() => {
                    if (upload.preview) URL.revokeObjectURL(upload.preview);
                    setPendingUploads((current) =>
                      current.filter((item) => item.id !== upload.id)
                    );
                  }}
                />
              ))}
            </div>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitComposer();
              }
            }}
            placeholder={
              listening
                ? "Listening…"
                : busy
                  ? "eGov Agent is working…"
                  : "Ask about any government service…"
            }
            rows={2}
            className="min-h-16 w-full resize-none bg-transparent px-2 py-2 text-[16px] leading-6 outline-none placeholder:text-slate-400"
          />
          <div className="flex w-full items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
              onChange={(event) => {
                queueUploads(event.currentTarget.files, "file");
                event.currentTarget.value = "";
              }}
            />
            <input
              ref={imageInputRef}
              type="file"
              multiple
              hidden
              accept="image/*"
              onChange={(event) => {
                queueUploads(event.currentTarget.files, "image");
                event.currentTarget.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach files"
              aria-label="Attach files"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-[background-color,color,transform] duration-150 hover:bg-[#f6f9ff] hover:text-[#0a4f9e] active:scale-[0.96]"
            >
              <Paperclip size={18} />
            </button>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              title="Upload images"
              aria-label="Upload images"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-[background-color,color,transform] duration-150 hover:bg-[#f6f9ff] hover:text-[#0a4f9e] active:scale-[0.96]"
            >
              <ImagePlus size={18} />
            </button>
            <button
              type="button"
              onClick={toggleMic}
              title="Voice input"
              aria-label="Voice input"
              className={`ml-auto flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-[background-color,color,transform] duration-150 active:scale-[0.96] ${
                listening
                  ? "animate-mic-pulse bg-red-500 text-white"
                  : "text-slate-400 hover:bg-[#f6f9ff] hover:text-[#0a4f9e]"
              }`}
            >
              <Mic size={19} />
            </button>
            <button
              type="button"
              onClick={submitComposer}
              title="Submit message"
              aria-label="Submit message"
              disabled={busy || (!input.trim() && pendingUploads.length === 0)}
              className="bg-brand-gradient flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-white shadow-[0_8px_18px_-10px_rgba(6,61,125,0.75)] transition-[opacity,transform,box-shadow] duration-150 hover:shadow-[0_10px_22px_-10px_rgba(6,61,125,0.85)] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none disabled:active:scale-100"
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
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
            data-sound="overlay.open"
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
            data-sound="overlay.close"
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
            pays, and hands you preview-ready documents.&rdquo;
          </p>

          <div className="mt-4 bg-[linear-gradient(135deg,#eef6ff,#f0fdfa)] px-4 py-4 shadow-[0_0_0_1px_oklch(0_0_0/0.05),0_10px_30px_-24px_rgba(6,61,125,0.5)]">
            <div className="flex items-center gap-2 text-[#0a4f9e]">
              <Zap size={15} />
              <span className="font-pixel text-[9px] uppercase tracking-[0.16em]">
                New wow flow — eReport
              </span>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600">
              Optionally attach any flooding photo, then type{" "}
              <TypeThis>
                There&apos;s severe flooding on Pioneer Street near Reliance in
                Mandaluyong. File an eReport and alert the right responders.
              </TypeThis>
            </p>
            <p className="mt-2 text-[11.5px] leading-relaxed text-slate-500">
              Let the AI triage and four-agency routing land, click{" "}
              <strong>Submit eReport to 4 response desks</strong>, then open the
              issued acknowledgement stamp.
            </p>
          </div>

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
                  <TypeThis>Preview appointment pass</TypeThis> — a pre-filled
                  government document opens in a new preview tab. Pause and let
                  it land.
                </GuideStep>
              </ol>

              <GuideHeading>Act 2 — Breadth (~60s)</GuideHeading>
              <ol className="space-y-2.5">
                <GuideStep n={5}>
                  Click <TypeThis>New conversation</TypeThis>, type{" "}
                  <TypeThis>Get an NBI clearance</TypeThis>, then click{" "}
                  <TypeThis>Continue with eGovPay</TypeThis>, review the
                  checkout, and authorize the demo payment. Open the issued
                  e-receipt stamp too.
                </GuideStep>
                <GuideStep n={6}>
                  New conversation →{" "}
                  <TypeThis>Check my SSS contributions</TypeThis> → point at the
                  live data card →{" "}
                  <TypeThis>Preview contribution statement</TypeThis>.
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
                  Click <TypeThis>Proceed to Payment</TypeThis>, authorize the
                  demo checkout, then open the issued LTO e-receipt stamp.
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
              phrase="There's severe flooding on Pioneer Street near Reliance in Mandaluyong. File an eReport and alert the right responders."
              result="AI incident triage + evidence analysis + exact jurisdiction resolution, followed by one coordinated draft for CDRRMO, the barangay, MMDA, and DPWH."
              chain="Submit eReport to 4 response desks → live dispatch statuses → mock 15–20 minute assessment ETA → open the acknowledgement stamp."
            />
            <ScenarioCard
              phrase="Find the nearest DFA office"
              result="4-agency run (PhilSys → PSA → DFA → rank), then a live map of 5 passport sites with your location and the recommended pin."
              chain={`Book Megamall · ${D.dfaShort}, 10:30 AM → booking confirmation → Preview appointment pass.`}
            />
            <ScenarioCard
              phrase="Renew my passport"
              result="DFA eligibility check + earliest-slot appointment card."
              chain="Confirm this slot → booked with email/SMS/calendar. Preview pre-filled application → the REAL DFA form, filled out."
            />
            <ScenarioCard
              phrase="Get an NBI clearance"
              result="Fully-online checklist: biometrics on file, purpose, fees."
              chain="Continue with eGovPay → review checkout → authorize → open the issued e-receipt stamp."
            />
            <ScenarioCard
              phrase="Check my SSS contributions"
              result="Live contribution table — monthly postings, ₱142,470 total, 87 months."
              chain="Preview contribution statement."
            />
            <ScenarioCard
              phrase="PhilHealth member record"
              result="Member Data Record card: PIN, member type, dependents, premium status."
              chain="Email certified MDR → issued + sent → Preview MDR copy → the REAL PhilHealth PMRF, filled out."
            />
            <ScenarioCard
              phrase="Renew my driver's license"
              result="LTO renewal checklist — license on file, no violations, CDE exam required."
              chain="Start CDE exam → enrolled + link emailed → Preview renewal application → the REAL LTO Form 21, filled out."
            />
            <ScenarioCard
              phrase="Check if I have any LTO violations"
              result="OGA alarm case card — TRX-LETAS case no., 5.STS-8 Obstruction, PENDING, all LTO transactions blocked."
              chain="Proceed to Payment → authorize checkout → issued e-receipt + alarm-lift request."
            />
            <ScenarioCard
              phrase="Apply for a Postal ID"
              result={`The memory flex: recalls you're in Mandaluyong, your SMS + email reminder preference, and your ${D.dfaShort} DFA appointment — then attaches all 3 requirements from your Vault as clickable file chips. Open one live: the real PSA certificate PDF renders.`}
              chain={`Book capture · ${D.postalShort}, 9:00 AM → booked around your existing schedule → Preview appointment pass listing the vault documents.`}
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
              • Preview opens the document in a new tab, with no automatic
              browser print dialog.
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

  useEffect(() => {
    if (count >= words.length) {
      const timer = setTimeout(onDone, 200);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      setCount((c) => c + 1);
    }, 28 + Math.random() * 48);
    return () => clearTimeout(timer);
  }, [count, onDone, words.length]);

  useEffect(() => {
    onTick();
  }, [count, onTick]);

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
      className="bg-brand-gradient flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-[14.5px] font-medium text-white shadow-[0_12px_26px_-12px_rgba(6,61,125,0.55)] transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.96]"
    >
      {children}
    </button>
  );
}

function PreviewStampButton({
  kind,
  label,
  onClick,
}: {
  kind: PrintKind;
  label: string;
  onClick: () => void;
}) {
  const file = PRINT_FILE_PREVIEWS[kind];

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="group flex min-h-[92px] w-full cursor-pointer items-center gap-3 py-1 pr-2 text-left transition-transform duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0a4f9e]/30 active:scale-[0.96]"
    >
      <VaultFileStamp
        name={file.name}
        preview={file.preview}
        index={file.stampIndex}
      />
      <span className="min-w-0">
        <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-700 transition-colors duration-200 group-hover:text-[#0a4f9e] group-focus-visible:text-[#0a4f9e]">
          {file.name}
        </span>
        <span className="font-pixel mt-1 block text-[7.5px] uppercase tracking-[0.12em] text-[#0a4f9e]/65">
          Open preview
        </span>
      </span>
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
    else if (card.print) previewForm(card.print, user);
  };
  const secondaryPreview =
    card.intent && card.print ? (
      <div className="mt-2">
        <PreviewStampButton
          kind={card.print}
          label={card.printLabel ?? "Preview pre-filled form"}
          onClick={() => previewForm(card.print!, user)}
        />
      </div>
    ) : null;

  if (card.kind === "ereportDraft") {
    return (
      <div className="max-w-xl overflow-hidden rounded-2xl bg-white shadow-[0_18px_44px_-26px_rgba(6,61,125,0.45)]">
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,#073b7a_0%,#0a62ad_52%,#1595c8_100%)] px-5 py-5 text-white">
          <div className="relative flex items-start gap-3">
            <FileText size={24} className="mt-0.5 shrink-0 text-white/90" />
            <div className="min-w-0">
              <div className="font-pixel text-[9px] uppercase tracking-[0.18em] text-white/70">
                One report · coordinated response
              </div>
              <div className="mt-1 text-[21px] font-semibold leading-tight">
                {card.title}
              </div>
            </div>
            <span className="font-pixel ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-[8.5px] uppercase tracking-[0.14em] text-white shadow-[0_6px_18px_-10px_rgba(127,29,29,0.9)]">
              {card.severity}
            </span>
          </div>
          <div className="relative mt-4 flex items-start gap-2.5 bg-white/10 px-3.5 py-3 backdrop-blur-sm">
            <MapPin size={16} className="mt-0.5 shrink-0 text-cyan-200" />
            <div className="min-w-0">
              <div className="text-[13.5px] font-medium">{card.location}</div>
              <div className="mt-0.5 font-mono text-[10.5px] text-white/60">
                {card.coordinates} · jurisdiction resolved
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <FieldLabel>Incident</FieldLabel>
              <div className="mt-1 text-[13px] font-semibold text-slate-700">
                {card.reportType}
              </div>
            </div>
            <div>
              <FieldLabel>AI confidence</FieldLabel>
              <div className="mt-1 text-[13px] font-semibold tabular-nums text-[#0a4f9e]">
                94%
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <FieldLabel>Evidence</FieldLabel>
              <div className="mt-1 text-[12px] font-medium leading-snug text-slate-600">
                {card.evidence}
              </div>
            </div>
          </div>

          <div className="mt-4 bg-amber-50/80 px-4 py-3.5">
            <div className="flex items-center gap-2 text-amber-800">
              <CircleAlert size={15} />
              <span className="font-pixel text-[8.5px] uppercase tracking-[0.15em]">
                AI incident assessment
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-amber-950/75">
              {card.summary}
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <FieldLabel>Response desks selected</FieldLabel>
            <span className="font-pixel text-[8px] uppercase tracking-[0.12em] text-emerald-600">
              Duplicate routing prevented
            </span>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {card.responders.map((responder, index) => (
              <div
                key={responder.agency}
                style={{ animationDelay: `${index * 70}ms` }}
                className="animate-result-in flex items-center gap-2.5 bg-[#f7faff] px-3 py-2.5"
              >
                <span className="font-pixel w-5 shrink-0 text-[8px] tracking-[0.1em] text-[#0a4f9e]/55">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11.5px] font-semibold text-slate-700">
                    {responder.agency}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                    {responder.role}
                  </span>
                </span>
                <Check size={12} className="ml-auto shrink-0 text-emerald-500" />
              </div>
            ))}
          </div>

          <div className="mt-4">
            <ActionButton onClick={primary}>
              <ShieldCheck size={16} /> {card.action}
            </ActionButton>
          </div>
        </div>
      </div>
    );
  }

  if (card.kind === "ereportConfirmation") {
    return (
      <div className="max-w-xl overflow-hidden rounded-2xl bg-white shadow-[0_18px_44px_-26px_rgba(6,61,125,0.45)]">
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,#047857_0%,#059669_55%,#0d9488_100%)] px-5 py-5 text-white">
          <div className="relative flex items-center gap-3.5">
            <Check size={28} strokeWidth={3.2} className="shrink-0 text-white" />
            <div className="min-w-0">
              <div className="font-pixel text-[9px] uppercase tracking-[0.18em] text-white/70">
                eGovPH coordinated response
              </div>
              <div className="mt-1 text-[21px] font-semibold leading-tight">
                {card.title}
              </div>
            </div>
          </div>
          <div className="relative mt-4 flex items-center justify-between gap-3 bg-black/10 px-3.5 py-3">
            <span className="font-pixel text-[8px] uppercase tracking-[0.14em] text-white/60">
              Report number
            </span>
            <span className="truncate font-mono text-[13px] font-semibold tracking-wide">
              {card.reportNumber}
            </span>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-start gap-2.5">
            <MapPin size={15} className="mt-0.5 shrink-0 text-[#0a4f9e]" />
            <div>
              <div className="text-[13.5px] font-semibold text-slate-700">
                {card.incident}
              </div>
              <div className="mt-0.5 text-[11.5px] text-slate-400">
                {card.location} · submitted {card.submittedAt}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Zap size={14} className="text-emerald-600" />
            <FieldLabel>Four desks dispatched simultaneously</FieldLabel>
          </div>
          <div className="mt-2">
            {card.responders.map((responder, index) => (
              <div
                key={responder.agency}
                style={{ animationDelay: `${index * 80}ms` }}
                className="animate-result-in relative flex gap-3 pb-3 last:pb-0"
              >
                {index < card.responders.length - 1 && (
                  <span className="absolute bottom-0 left-[7px] top-6 w-px bg-emerald-200" />
                )}
                <Check
                  size={15}
                  strokeWidth={3.2}
                  className="relative z-10 mt-0.5 shrink-0 text-emerald-600"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[12.5px] font-semibold text-slate-700">
                      {responder.agency}
                    </span>
                    <span className="font-pixel ml-auto shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[7.5px] uppercase tracking-[0.1em] text-emerald-600">
                      {responder.status}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10.5px] text-slate-400">
                    {responder.role}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3 bg-emerald-50/80 px-4 py-3">
            <Clock size={17} className="shrink-0 text-emerald-600" />
            <div>
              <FieldLabel>Next expected update</FieldLabel>
              <div className="mt-1 text-[13px] font-semibold text-emerald-700">
                {card.eta}
              </div>
            </div>
          </div>

          <div className="mt-2">
            <PreviewStampButton
              kind={card.print}
              label={card.action}
              onClick={() => previewForm(card.print, user)}
            />
          </div>
        </div>
      </div>
    );
  }

  if (card.kind === "payment") {
    return (
      <CardShell
        icon={<AgencySeal label="eGov Pay" size={20} />}
        title={card.title}
        tag="Simulation"
      >
        <div className="px-5 py-4">
          <div className="flex items-center gap-3">
            <AgencySeal label={card.agency} size={38} />
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold text-slate-800">
                {card.service}
              </div>
              <div className="mt-0.5 truncate text-[12.5px] text-slate-400">
                {card.agency}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2.5 bg-[#f7faff] px-4 py-3.5">
            {card.lineItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 text-[13.5px]"
              >
                <span className="text-slate-500">{item.label}</span>
                <span className="font-medium tabular-nums text-slate-700">
                  {item.amount}
                </span>
              </div>
            ))}
            <div className="flex items-end justify-between gap-3 border-t border-slate-200/70 pt-3">
              <div>
                <FieldLabel>Total due</FieldLabel>
                <div className="mt-1 text-[11.5px] text-slate-400">
                  {card.method}
                </div>
              </div>
              <span className="text-[21px] font-bold tabular-nums text-[#0a4f9e]">
                {card.total}
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2.5 bg-amber-50/80 px-3.5 py-3 text-[12px] leading-relaxed text-amber-800">
            <ShieldCheck size={15} className="mt-0.5 shrink-0" />
            <span>
              Demo checkout only. No real funds will be charged or transferred.
            </span>
          </div>

          <div className="mt-4">
            <ActionButton onClick={primary}>
              <ShieldCheck size={16} /> {card.action}
            </ActionButton>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-[10.5px] text-slate-400">
            <span>Payment reference</span>
            <span className="truncate font-mono font-medium text-slate-500">
              {card.reference}
            </span>
          </div>
        </div>
      </CardShell>
    );
  }

  if (card.kind === "receipt") {
    return (
      <CardShell
        icon={<AgencySeal label="eGov Pay" size={20} />}
        title={card.title}
        tag="eReceipt issued"
      >
        <div className="px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_10px_24px_-12px_rgba(16,185,129,0.8)]">
              <Check size={20} strokeWidth={3} />
            </span>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-slate-800">
                Payment confirmed
              </div>
              <div className="mt-0.5 truncate text-[12.5px] text-slate-400">
                {card.service} · {card.agency}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 bg-[#f7faff] px-4 py-3.5">
            <div>
              <FieldLabel>Receipt no.</FieldLabel>
              <div className="mt-1 font-mono text-[12px] font-medium text-slate-700">
                {card.receiptNumber}
              </div>
            </div>
            <div>
              <FieldLabel>Paid at</FieldLabel>
              <div className="mt-1 text-[12px] font-medium text-slate-700">
                {card.paidAt}
              </div>
            </div>
            <div className="col-span-2">
              <FieldLabel>eGovPay reference</FieldLabel>
              <div className="mt-1 truncate font-mono text-[12px] font-medium text-slate-700">
                {card.transactionNumber}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {card.lineItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 text-[13.5px]"
              >
                <span className="text-slate-500">{item.label}</span>
                <span className="font-medium tabular-nums text-slate-700">
                  {item.amount}
                </span>
              </div>
            ))}
            <div className="flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
              <div>
                <FieldLabel>Total paid</FieldLabel>
                <div className="mt-1 text-[11.5px] text-slate-400">
                  {card.method}
                </div>
              </div>
              <span className="text-[21px] font-bold tabular-nums text-emerald-600">
                {card.total}
              </span>
            </div>
          </div>

          <div className="mt-3 bg-slate-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-slate-500">
            Simulation eReceipt · issued after simulated payment confirmation ·
            no real funds charged
          </div>

          <div className="mt-2">
            <PreviewStampButton
              kind={card.print}
              label={card.action}
              onClick={() => previewForm(card.print, user)}
            />
          </div>
        </div>
      </CardShell>
    );
  }

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
            {secondaryPreview}
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
          {secondaryPreview}
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
          {secondaryPreview}
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
            <PreviewStampButton
              kind={card.print}
              label={card.printLabel ?? "Preview statement"}
              onClick={() => previewForm(card.print!, user)}
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
        {card.intent ? (
          <ActionButton onClick={primary}>
            {card.action} <ChevronRight size={16} />
          </ActionButton>
        ) : card.print ? (
          <PreviewStampButton
            kind={card.print}
            label={card.action}
            onClick={() => previewForm(card.print!, user)}
          />
        ) : null}
        {secondaryPreview}
      </div>
    </CardShell>
  );
}
