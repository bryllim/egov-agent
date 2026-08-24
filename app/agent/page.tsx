"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Briefcase,
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
import { Squircle, SquircleButton } from "@/components/squircle";
import { recordAuditEvent } from "@/lib/audit-log";
import { useSensoryUI } from "@/lib/provider";
import {
  Map as SiteMap,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MarkerTooltip,
} from "@/components/ui/map";
import { useAgentShell } from "./shell";
import {
  type AgentActivity,
  type Card,
  type Msg,
  type Plan,
  type StepIcon,
  type TraceStep,
  type UserUpload,
} from "./brain";

type AgentApiResponse = {
  plan: Plan;
  suggestedActions: string[];
};

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
        data-audit="Removed an attachment"
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

function QuickActions({
  actions,
  disabled,
  onAction,
}: {
  actions: string[];
  disabled: boolean;
  onAction: (action: string) => void;
}) {
  if (actions.length === 0) return null;

  return (
    <div className="animate-fade-in pt-1" aria-label="Quick actions">
      <div className="flex flex-wrap gap-2">
        {actions.map((action, index) => (
          <SquircleButton
            key={action}
            type="button"
            disabled={disabled}
            onClick={() => onAction(action)}
            style={{ animationDelay: `${index * 70}ms` }}
            className="animate-card-in flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#0a4f9e] pl-3.5 pr-3 text-left text-[12.5px] font-semibold text-white shadow-[0_9px_20px_-13px_rgba(6,61,125,0.72)] transition-[background-color,box-shadow,transform] duration-150 ease-out hover:bg-[#063d7d] hover:shadow-[0_12px_24px_-13px_rgba(6,61,125,0.82)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a4f9e]/35 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:active:scale-100"
          >
            <span>{action}</span>
            <ChevronRight size={14} className="shrink-0" />
          </SquircleButton>
        ))}
      </div>
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
    openPrivacyNotice,
  } = useAgentShell();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [agentProgress, setAgentProgress] = useState<AgentActivity | null>(null);
  const [streamingId, setStreamingId] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<UserUpload[]>([]);
  const idRef = useRef(0);
  const lastHandledConvRef = useRef<string | null | undefined>(undefined);
  const chatViewportRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const agentTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const agentRequestRef = useRef<AbortController | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const busy = agentProgress !== null || streamingId !== null;

  const clearAgentTimers = useCallback(() => {
    agentTimersRef.current.forEach(clearTimeout);
    agentTimersRef.current = [];
  }, []);

  useEffect(
    () => () => {
      clearAgentTimers();
      agentRequestRef.current?.abort();
    },
    [clearAgentTimers]
  );

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
    agentRequestRef.current?.abort();
    agentRequestRef.current = null;
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
    async (raw?: string, uploads: UserUpload[] = []) => {
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
      const requestController = new AbortController();
      agentRequestRef.current = requestController;
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
      recordAuditEvent({
        actor: "user",
        action: "Submitted a government service request",
        detail:
          uploads.length > 0
            ? `Request included ${uploads.length} attachment${
                uploads.length === 1 ? "" : "s"
              }. Message contents were excluded from the audit log.`
            : "Message contents were excluded from the audit log.",
        category: "service",
        status: "completed",
      });

      const startedAt = Date.now();
      setAgentProgress({
        steps: [],
        currentIndex: 0,
        startedAt,
        phase: "thinking",
      });

      try {
        const response = await fetch("/api/agent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: planInput,
            history: messages.slice(-10).map((message) => ({
              role: message.role === "agent" ? "assistant" : "user",
              text: message.text,
            })),
            user: {
              name: user.name,
              firstName: user.firstName,
            },
          }),
          signal: requestController.signal,
        });
        const payload = (await response.json().catch(() => null)) as
          | AgentApiResponse
          | { error?: string }
          | null;

        if (!response.ok || !payload || !("plan" in payload)) {
          throw new Error(
            payload && "error" in payload && payload.error
              ? payload.error
              : `The live AI request failed with HTTP ${response.status}.`
          );
        }
        if (requestController.signal.aborted) return;

        const { plan, suggestedActions } = payload;
        const steps = plan.steps.map((traceStep) => ({
          ...traceStep,
          base: Math.round(traceStep.base + Math.random() * 120),
        }));
        const deliver = () => {
          const elapsed = `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
          const routingStep = steps.find((traceStep) =>
            traceStep.label.toLowerCase().startsWith("routing to"),
          );
          const id = ++idRef.current;
          setAgentProgress(null);
          setMessages((current) => [
            ...current,
            {
              id,
              role: "agent",
              text: plan.text,
              quickActions: suggestedActions,
              card: plan.card,
              trace: steps.length ? steps : undefined,
              elapsed: steps.length ? elapsed : undefined,
              attachments: plan.attachments,
            },
          ]);
          setStreamingId(id);
          recordAuditEvent({
            actor: "agent",
            action: "Returned a government service response",
            detail: plan.card
              ? `Generated a ${plan.card.kind} result after ${elapsed}.`
              : `Completed the request after ${elapsed}.`,
            target: routingStep?.agency,
            category: "service",
            status: "completed",
          });
          void playSound("notification.info");
          agentTimersRef.current = [];
        };

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
                recordAuditEvent({
                  actor: "agent",
                  action: step.label,
                  detail:
                    "Workflow step completed. Sensitive result values were excluded from the audit log.",
                  target: step.agency,
                  category: "service",
                  status: "completed",
                });
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
      } catch {
        if (requestController.signal.aborted) return;

        setAgentProgress(null);
        setMessages((current) => [
          ...current,
          {
            id: ++idRef.current,
            role: "agent",
            text: "I couldn’t complete that request right now. **Please try again in a moment.**",
          },
        ]);
        recordAuditEvent({
          actor: "agent",
          action: "Government service request failed",
          detail:
            "The request could not be completed. Message contents were excluded from the audit log.",
          category: "service",
          status: "failed",
        });
        void playSound("notification.error");
      } finally {
        if (agentRequestRef.current === requestController) {
          agentRequestRef.current = null;
        }
      }
    },
    [
      activeConvId,
      busy,
      clearAgentTimers,
      input,
      messages,
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
    void send(undefined, pendingUploads);
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
        void sendRef.current(transcript);
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
                          <ServiceCard card={m.card} />
                        </div>
                      )}
                      {m.quickActions &&
                        m.quickActions.length > 0 &&
                        m.id !== streamingId && (
                          <QuickActions
                            actions={m.quickActions}
                            disabled={busy}
                            onAction={send}
                          />
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
        <Squircle
          cornerRadius={28}
          className="mx-auto flex min-h-[116px] w-full max-w-2xl rounded-[28px] bg-[rgba(11,22,36,0.09)] p-px"
        >
          <Squircle
            cornerRadius={27}
            className="flex min-h-[114px] w-full flex-1 flex-col rounded-[27px] bg-white p-3"
          >
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
                data-audit="none"
                title="Submit message"
                aria-label="Submit message"
                disabled={busy || (!input.trim() && pendingUploads.length === 0)}
                className="bg-brand-gradient flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-white shadow-[0_8px_18px_-10px_rgba(6,61,125,0.75)] transition-[opacity,transform,box-shadow] duration-150 hover:shadow-[0_10px_22px_-10px_rgba(6,61,125,0.85)] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none disabled:active:scale-100"
              >
                <ArrowUp size={18} strokeWidth={2.5} />
              </button>
            </div>
          </Squircle>
        </Squircle>
        <div className="mx-auto mt-3 flex max-w-2xl flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] text-slate-400">
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
            onClick={openPrivacyNotice}
            data-audit="Opened data and privacy notice"
            data-sound="overlay.open"
            className="inline-flex min-h-10 cursor-pointer items-center px-1 text-[12px] font-bold text-slate-400 transition-colors duration-150 hover:text-[#0a4f9e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a4f9e]/30"
          >
            Data &amp; Privacy
          </button>
          <Link
            href="/agent/how-it-works"
            data-audit="Opened How it works"
            title="How it works"
            aria-label="Open how it works"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-[background-color,color,transform] duration-150 hover:bg-white hover:text-[#0a4f9e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a4f9e]/30 active:scale-[0.96]"
          >
            <HelpCircle size={13} strokeWidth={2.6} />
          </Link>
        </div>
      </div>
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
          <div className="animate-result-in mt-1 line-clamp-2 text-pretty text-[12.5px] leading-relaxed text-slate-400">
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
    <SquircleButton
      cornerRadius={8}
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
    </SquircleButton>
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

type RichBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "unordered-list"; items: string[] }
  | { kind: "ordered-list"; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "rule" };

function parseRichBlocks(text: string): RichBlock[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: RichBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      blocks.push({ kind: "heading", text: heading[1] });
      index += 1;
      continue;
    }

    if (/^---+$/.test(line)) {
      blocks.push({ kind: "rule" });
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].trim().match(/^[-*]\s+(.+)$/);
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      blocks.push({ kind: "unordered-list", items });
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].trim().match(/^\d+[.)]\s+(.+)$/);
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      blocks.push({ kind: "ordered-list", items });
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length) {
        const quote = lines[index].trim().match(/^>\s?(.+)$/);
        if (!quote) break;
        quoteLines.push(quote[1]);
        index += 1;
      }
      blocks.push({ kind: "quote", text: quoteLines.join(" ") });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const candidate = lines[index].trim();
      if (
        !candidate ||
        /^#{1,3}\s+/.test(candidate) ||
        /^---+$/.test(candidate) ||
        /^[-*]\s+/.test(candidate) ||
        /^\d+[.)]\s+/.test(candidate) ||
        /^>\s?/.test(candidate)
      ) {
        break;
      }
      paragraphLines.push(candidate);
      index += 1;
    }
    blocks.push({ kind: "paragraph", text: paragraphLines.join(" ") });
  }

  return blocks;
}

function inlineRich(text: string, keyPrefix: string) {
  const pattern =
    /(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*\n]+)\*\*|`([^`\n]+)`|\*([^*\n]+)\*)/g;
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let tokenIndex = 0;

  while ((match = pattern.exec(text))) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }

    const key = `${keyPrefix}-${tokenIndex++}`;
    if (match[2] && match[3]) {
      nodes.push(
        <a
          key={key}
          href={match[3]}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-[#0a4f9e] underline decoration-[#0a4f9e]/35 underline-offset-[3px] [text-decoration-skip-ink:auto] [text-decoration-thickness:from-font] [text-underline-position:from-font] transition-colors duration-150 hover:decoration-[#0a4f9e]"
        >
          {match[2]}
        </a>
      );
    } else if (match[4]) {
      nodes.push(
        <strong key={key} className="font-semibold text-slate-900">
          {match[4]}
        </strong>
      );
    } else if (match[5]) {
      nodes.push(
        <code
          key={key}
          className="rounded-md bg-[#0a4f9e]/8 px-1.5 py-0.5 font-mono text-[0.9em] text-[#0a4f9e]"
        >
          {match[5]}
        </code>
      );
    } else if (match[6]) {
      nodes.push(
        <em key={key} className="italic text-slate-700">
          {match[6]}
        </em>
      );
    }

    cursor = pattern.lastIndex;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

function RichText({
  text,
  cursor = false,
}: {
  text: string;
  cursor?: boolean;
}) {
  const blocks = useMemo(() => parseRichBlocks(text), [text]);
  const streamCursor = (
    <span className="stream-cursor ml-0.5 inline-block" aria-hidden />
  );

  return (
    <div className="max-w-[65ch] space-y-3 break-words text-[16.5px] leading-[1.65] text-slate-700">
      {blocks.map((block, blockIndex) => {
        const isLastBlock = blockIndex === blocks.length - 1;

        if (block.kind === "heading") {
          return (
            <h3
              key={blockIndex}
              className="text-balance text-[17px] font-semibold leading-snug tracking-tight text-slate-900"
            >
              {inlineRich(block.text, `heading-${blockIndex}`)}
              {isLastBlock && cursor ? streamCursor : null}
            </h3>
          );
        }

        if (block.kind === "unordered-list" || block.kind === "ordered-list") {
          const ListTag = block.kind === "ordered-list" ? "ol" : "ul";
          return (
            <ListTag
              key={blockIndex}
              className={`space-y-1.5 pl-5 ${
                block.kind === "ordered-list" ? "list-decimal" : "list-disc"
              } marker:font-semibold marker:text-[#0a4f9e]`}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="pl-1">
                  {inlineRich(item, `list-${blockIndex}-${itemIndex}`)}
                  {isLastBlock &&
                  cursor &&
                  itemIndex === block.items.length - 1
                    ? streamCursor
                    : null}
                </li>
              ))}
            </ListTag>
          );
        }

        if (block.kind === "quote") {
          return (
            <blockquote
              key={blockIndex}
              className="border-l-2 border-[#0a4f9e]/25 pl-4 text-slate-600"
            >
              {inlineRich(block.text, `quote-${blockIndex}`)}
              {isLastBlock && cursor ? streamCursor : null}
            </blockquote>
          );
        }

        if (block.kind === "rule") {
          return (
            <hr
              key={blockIndex}
              className="my-4 border-0 border-t border-slate-200"
            />
          );
        }

        return (
          <p key={blockIndex}>
            {inlineRich(block.text, `paragraph-${blockIndex}`)}
            {isLastBlock && cursor ? streamCursor : null}
          </p>
        );
      })}
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
  const chunks = useMemo(() => text.match(/\S+\s*/g) ?? [], [text]);
  const [count, setCount] = useState(chunks.length ? 1 : 0);

  useEffect(() => {
    if (count >= chunks.length) {
      const timer = setTimeout(onDone, 200);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      setCount((c) => c + 1);
    }, 28 + Math.random() * 48);
    return () => clearTimeout(timer);
  }, [chunks.length, count, onDone]);

  useEffect(() => {
    onTick();
  }, [count, onTick]);

  return <RichText text={chunks.slice(0, count).join("")} cursor />;
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
    <Squircle cornerRadius={16} className="max-w-md overflow-hidden rounded-2xl bg-white shadow-[0_18px_44px_-26px_rgba(6,61,125,0.35)]">
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
    </Squircle>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-pixel text-[8.5px] uppercase tracking-[0.16em] text-slate-400">
      {children}
    </div>
  );
}

function FakeQrPreview({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const size = 21;
  const seed = [...value].reduce(
    (total, character, index) =>
      (total + character.charCodeAt(0) * (index + 11)) % 997,
    0
  );

  const finderValue = (x: number, y: number, left: number, top: number) => {
    const localX = x - left;
    const localY = y - top;
    if (localX < 0 || localX > 6 || localY < 0 || localY > 6) return null;
    return (
      localX === 0 ||
      localX === 6 ||
      localY === 0 ||
      localY === 6 ||
      (localX >= 2 && localX <= 4 && localY >= 2 && localY <= 4)
    );
  };

  const isDark = (x: number, y: number) => {
    for (const [left, top] of [
      [0, 0],
      [14, 0],
      [0, 14],
    ]) {
      const finder = finderValue(x, y, left, top);
      if (finder !== null) return finder;
    }

    if ((x === 7 && y <= 7) || (y === 7 && x <= 7)) return false;
    if ((x === 13 && y <= 7) || (y === 7 && x >= 13)) return false;
    if ((x === 7 && y >= 13) || (y === 13 && x <= 7)) return false;
    if (x === 6 || y === 6) return (x + y) % 2 === 0;

    const character = value.charCodeAt((x * 3 + y * 5) % value.length);
    return (x * 17 + y * 31 + seed + character) % 11 < 5;
  };

  const cells = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (isDark(x, y)) {
        cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
      }
    }
  }

  return (
    <Squircle cornerRadius={8} className="flex items-center gap-3 rounded-lg bg-[#f3f7fc] p-3 sm:flex-col sm:text-center">
      <svg
        aria-label={`${label} preview`}
        className="h-[104px] w-[104px] shrink-0 bg-white p-2 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.55)]"
        role="img"
        viewBox="-2 -2 25 25"
      >
        <title>{label} preview</title>
        <rect x="-2" y="-2" width="25" height="25" fill="white" />
        <g fill="#101820" shapeRendering="crispEdges">
          {cells}
        </g>
      </svg>
      <div className="min-w-0">
        <div className="font-pixel text-[8px] uppercase tracking-[0.14em] text-[#0a4f9e]">
          {label}
        </div>
        <div className="mt-1 break-all font-mono text-[10px] font-semibold leading-snug text-slate-600">
          {value}
        </div>
        <div className="mt-1 text-[10px] leading-snug text-slate-400">
          Present at travel check-in
        </div>
      </div>
    </Squircle>
  );
}

/* "Tuesday, July 21, 2026" → { mon: "Jul", day: "21" } */
function dateTile(date: string) {
  const match = date.match(/([A-Za-z]+)\s+(\d{1,2}),/);
  return match ? { mon: match[1].slice(0, 3), day: match[2] } : null;
}

function ServiceCard({ card }: { card: Card }) {
  if (card.kind === "employmentPack") {
    return (
      <Squircle cornerRadius={16} className="max-w-xl overflow-hidden rounded-2xl bg-white shadow-[0_18px_44px_-26px_rgba(6,61,125,0.42)]">
        <div className="bg-brand-gradient relative overflow-hidden px-5 py-5 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.18),transparent_34%)]" />
          <div className="relative flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/14 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.13)]">
              <Briefcase size={21} />
            </span>
            <div className="min-w-0">
              <div className="font-pixel text-[9px] uppercase tracking-[0.18em] text-white/70">
                Multi-agency employment readiness
              </div>
              <div className="mt-1 text-[22px] font-semibold leading-tight">
                {card.title}
              </div>
              <div className="mt-1 text-[12.5px] leading-snug text-white/72">
                {card.subtitle}
              </div>
            </div>
            <span className="font-pixel ml-auto shrink-0 rounded-full bg-emerald-400/18 px-2.5 py-1 text-[8.5px] uppercase tracking-[0.14em] text-emerald-100">
              {card.ready}/{card.total} ready
            </span>
          </div>

          <div
            className="relative mt-4 grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${card.total}, minmax(0, 1fr))` }}
            aria-label={`${card.ready} of ${card.total} employment checks ready`}
          >
            {Array.from({ length: card.total }, (_, index) => (
              <span
                key={index}
                className={`h-1.5 rounded-full ${
                  index < card.ready ? "bg-emerald-300" : "bg-white/24"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <FieldLabel>Government service checks</FieldLabel>
            <span className="text-[10.5px] font-medium text-slate-400">
              One request · separate sources
            </span>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {card.services.map((service, index) => {
              const hasSeal = Boolean(sealFor(service.agency));
              const needsAction = service.status === "Needs action";
              return (
                <Squircle
                  key={service.agency}
                  style={{ animationDelay: `${index * 55}ms` }}
                  className="animate-result-in flex min-w-0 items-center gap-3 rounded-xl bg-[#f6f9fd] px-3 py-3"
                >
                  {hasSeal ? (
                    <AgencySeal label={service.agency} size={28} />
                  ) : (
                    <span className="font-pixel flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg bg-[#0a4f9e]/9 px-1.5 text-[7px] tracking-[0.08em] text-[#0a4f9e]">
                      {service.initials}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold text-slate-700">
                      {service.agency} · {service.service}
                    </span>
                    <span className="mt-0.5 block truncate text-[10.5px] text-slate-400">
                      {service.detail}
                    </span>
                  </span>
                  <span
                    className={`font-pixel flex shrink-0 items-center gap-1 text-[7.5px] uppercase tracking-[0.1em] ${
                      needsAction ? "text-amber-600" : "text-emerald-600"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        needsAction ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                    />
                    {service.status}
                  </span>
                </Squircle>
              );
            })}
          </div>

          <Squircle className="mt-4 rounded-xl bg-[#fbfcfe] px-4 py-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-[#0a4f9e]" />
              <FieldLabel>Private documents found in your Vault</FieldLabel>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {card.vaultDocuments.map((document) => (
                <div key={document.name} className="flex items-center gap-1.5">
                  <FileText size={12} className="text-slate-400" />
                  <span className="text-[10.5px] font-medium text-slate-600">
                    {document.name}
                  </span>
                  <span className="text-[9.5px] text-slate-400">
                    · {document.status}
                  </span>
                </div>
              ))}
            </div>
          </Squircle>
        </div>
      </Squircle>
    );
  }

  if (card.kind === "ereportDraft") {
    return (
      <Squircle cornerRadius={16} className="max-w-xl overflow-hidden rounded-2xl bg-white shadow-[0_18px_44px_-26px_rgba(6,61,125,0.45)]">
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

        </div>
      </Squircle>
    );
  }

  if (card.kind === "ereportConfirmation") {
    return (
      <Squircle cornerRadius={16} className="max-w-xl overflow-hidden rounded-2xl bg-white shadow-[0_18px_44px_-26px_rgba(6,61,125,0.45)]">
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
        </div>
      </Squircle>
    );
  }

  if (card.kind === "payment") {
    return (
      <CardShell
        icon={<AgencySeal label="eGov Pay" size={20} />}
        title={card.title}
        tag="Secure"
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

          <div className="mt-3 flex items-start gap-2.5 bg-[#eef6ff] px-3.5 py-3 text-[12px] leading-relaxed text-[#0a4f9e]">
            <ShieldCheck size={15} className="mt-0.5 shrink-0" />
            <span>
              Payment details are encrypted and require your authorization.
            </span>
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
            Verified eReceipt · issued after payment confirmation · reference
            available for agency verification
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
        </div>
      </CardShell>
    );
  }

  if (card.kind === "ltoViolation") {
    return (
      <Squircle cornerRadius={16} className="max-w-xl overflow-hidden rounded-2xl bg-white shadow-[0_18px_44px_-26px_rgba(6,61,125,0.35)]">
        <div className="bg-brand-gradient relative overflow-hidden px-5 py-5 text-white">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_55%)]" />
          <div className="relative flex items-start gap-3">
            <AgencySeal label="LTO" size={42} />
            <div className="min-w-0">
              <div className="font-pixel text-[10px] uppercase tracking-[0.18em] text-white/75">
                Land Transportation Office
              </div>
              <div className="mt-1 text-[22px] font-semibold leading-tight">
                Official violation record
              </div>
              <div className="mt-0.5 text-[13.5px] text-white/75">
                Verified through the connected LTO service
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
      </Squircle>
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
      </CardShell>
    );
  }

  if (card.kind === "map") {
    return (
      <Squircle cornerRadius={16} className="max-w-xl overflow-hidden rounded-2xl bg-white shadow-[0_18px_44px_-26px_rgba(6,61,125,0.35)]">
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

        <div className="px-5 pb-2">
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
      </Squircle>
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
      </CardShell>
    );
  }

  return (
    <CardShell icon={<FileText size={13} />} title={card.title} tag="Active">
      <div
        className={
          card.qr
            ? "grid gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_132px] sm:items-center"
            : "px-5 py-4"
        }
      >
        <div className="grid grid-flow-dense grid-cols-2 gap-x-4 gap-y-4">
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
        {card.qr && <FakeQrPreview label={card.qr.label} value={card.qr.value} />}
      </div>
    </CardShell>
  );
}
