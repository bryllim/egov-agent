"use client";

import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  CircleX,
  ListChecks,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  getAuditLogSnapshot,
  getServerAuditLogSnapshot,
  parseAuditEvents,
  subscribeToAuditLog,
  type AuditActor,
  type AuditEvent,
} from "@/lib/audit-log";

type ActorFilter = "all" | AuditActor;

const ACTOR_FILTERS: { value: ActorFilter; label: string }[] = [
  { value: "all", label: "All activity" },
  { value: "user", label: "User" },
  { value: "agent", label: "Agent" },
  { value: "system", label: "System" },
];

const ACTOR_STYLE: Record<
  AuditActor,
  { label: string; className: string; icon: React.ReactNode }
> = {
  user: {
    label: "User",
    className: "bg-[#eaf3ff] text-[#0a4f9e]",
    icon: <UserRound size={15} aria-hidden />,
  },
  agent: {
    label: "Agent",
    className: "bg-violet-50 text-violet-600",
    icon: <Bot size={15} aria-hidden />,
  },
  system: {
    label: "System",
    className: "bg-emerald-50 text-emerald-600",
    icon: <ShieldCheck size={15} aria-hidden />,
  },
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(date);
}

function dayKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Manila",
  }).format(date);
}

function formatDayLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  const today = dayKey(new Date().toISOString());
  const eventDay = dayKey(value);

  if (eventDay === today) {
    return "Today";
  }

  return new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

export default function LogsPage() {
  const router = useRouter();
  const rawEvents = useSyncExternalStore(
    subscribeToAuditLog,
    getAuditLogSnapshot,
    getServerAuditLogSnapshot,
  );
  const events = useMemo(() => parseAuditEvents(rawEvents), [rawEvents]);
  const [actorFilter, setActorFilter] = useState<ActorFilter>("all");
  const [query, setQuery] = useState("");

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return events.filter((event) => {
      const matchesActor =
        actorFilter === "all" || event.actor === actorFilter;
      const matchesQuery =
        !normalizedQuery ||
        [event.action, event.detail, event.target, event.category]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery));
      return matchesActor && matchesQuery;
    });
  }, [actorFilter, events, query]);

  return (
    <div className="scrollbar-subtle flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-5 py-7 sm:px-7 sm:py-8">
        <div className="animate-fade-up">
          <button
            type="button"
            data-audit="Returned to conversation"
            onClick={() => router.push("/agent")}
            className="group flex min-h-10 cursor-pointer items-center gap-2 text-[13px] font-medium text-slate-500 transition-colors duration-150 hover:text-[#0a4f9e]"
          >
            <ArrowLeft
              size={15}
              className="transition-transform duration-150 group-hover:-translate-x-0.5"
              aria-hidden
            />
            Back to conversation
          </button>
        </div>

        <header className="animate-fade-up delay-100 mt-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf3ff] text-[#0a4f9e]">
              <ListChecks size={18} aria-hidden />
            </span>
            <h1 className="text-[24px] font-semibold tracking-tight text-slate-900">
              Audit logs
            </h1>
          </div>
          <p className="mt-2 max-w-2xl text-pretty text-[14px] leading-6 text-slate-500">
            A chronological record of actions taken by you, your agent, and
            connected systems. Sensitive message contents and form values are
            excluded.
          </p>
        </header>

        <section className="animate-fade-up delay-200 mt-5">
          <div className="flex flex-col gap-3 rounded-xl bg-white p-3 shadow-[0_16px_36px_-28px_rgba(6,61,125,0.35)] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1">
              {ACTOR_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  data-audit="none"
                  aria-pressed={actorFilter === filter.value}
                  onClick={() => setActorFilter(filter.value)}
                  className={`min-h-10 rounded-lg px-3 text-[12px] font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.96] ${
                    actorFilter === filter.value
                      ? "bg-[#0a4f9e] text-white"
                      : "text-slate-500 hover:bg-[#f4f8fd] hover:text-[#0a4f9e]"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <label className="flex min-h-10 min-w-0 items-center gap-2 rounded-lg bg-[#f5f8fc] px-3 sm:w-64">
              <Search size={14} className="shrink-0 text-slate-400" aria-hidden />
              <span className="sr-only">Search audit logs</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search activity"
                className="min-w-0 flex-1 bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-400 sm:text-[13px]"
              />
            </label>
          </div>
        </section>

        <section
          aria-label="Activity records"
          className="animate-fade-up delay-300 mt-4 overflow-hidden rounded-xl bg-white px-4 py-2 shadow-[0_18px_48px_-34px_rgba(6,61,125,0.42)] sm:px-5"
        >
          {filteredEvents.length > 0 ? (
            <div>
              {filteredEvents.map((event, index) => {
                const previousEvent = filteredEvents[index - 1];
                const nextEvent = filteredEvents[index + 1];
                const startsDay =
                  !previousEvent ||
                  dayKey(previousEvent.occurredAt) !==
                    dayKey(event.occurredAt);
                const continuesDay =
                  Boolean(nextEvent) &&
                  dayKey(nextEvent.occurredAt) === dayKey(event.occurredAt);

                return (
                  <div key={event.id}>
                    {startsDay && (
                      <div
                        className={`flex items-center gap-3 pb-1 ${
                          index === 0 ? "pt-2" : "pt-4"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0a4f9e]">
                          {formatDayLabel(event.occurredAt)}
                        </span>
                        <span className="h-px flex-1 bg-slate-100" />
                      </div>
                    )}
                    <AuditEventRow
                      event={event}
                      showConnector={continuesDay}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-52 flex-col items-center justify-center px-6 py-10 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f1f6fc] text-slate-400">
                <ListChecks size={20} aria-hidden />
              </span>
              <h2 className="mt-4 text-[14px] font-semibold text-slate-700">
                No matching activity
              </h2>
              <p className="mt-1.5 max-w-sm text-[12.5px] leading-5 text-slate-400">
                Actions will appear here as you use eGov Agent and connected
                services.
              </p>
            </div>
          )}
        </section>

        <p className="mt-4 text-center text-[11px] leading-5 text-slate-400">
          The latest 250 activity records are retained on this device.
        </p>
      </div>
    </div>
  );
}

function AuditEventRow({
  event,
  showConnector,
}: {
  event: AuditEvent;
  showConnector: boolean;
}) {
  const actor = ACTOR_STYLE[event.actor];

  return (
    <article className="flex gap-3 py-2.5">
      <div className="relative flex w-7 shrink-0 justify-center">
        {showConnector && (
          <span className="absolute left-1/2 top-7 -bottom-3 w-px -translate-x-1/2 bg-slate-200" />
        )}
        <span
          className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${actor.className}`}
        >
          {actor.icon}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <h2 className="text-[13px] font-semibold leading-5 text-slate-800">
              {event.action}
            </h2>
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-slate-400">
              {actor.label}
            </span>
          </div>
          <span className="shrink-0 font-mono text-[10px] tabular-nums text-slate-400">
            {formatTime(event.occurredAt)}
          </span>
        </div>
        {event.detail && (
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-[1.55] text-slate-500">
            {event.detail}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-slate-400">
          {event.target && <span className="truncate">{event.target}</span>}
          <span className="capitalize">{event.category}</span>
          <span
            title={event.status}
            className={
              event.status === "completed"
                ? "inline-flex items-center gap-1 text-emerald-600"
                : "inline-flex items-center gap-1 text-red-500"
            }
          >
            {event.status === "completed" ? (
              <CheckCircle2 size={11} aria-hidden />
            ) : (
              <CircleX size={11} aria-hidden />
            )}
            <span className="capitalize">{event.status}</span>
          </span>
        </div>
      </div>
    </article>
  );
}
