"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Briefcase,
  CalendarDays,
  Lock,
  MapPin,
  MessageCircle,
  Folder,
  Users,
} from "lucide-react";
import { DEMO_DATES as D } from "../dates";

const MEMORIES: {
  icon: React.ReactNode;
  text: string;
  source: string;
}[] = [
  {
    icon: <MapPin size={13} />,
    text: "Lives in Mandaluyong City — prefers appointments and offices nearby",
    source: "Learned from conversations · Jul 2026",
  },
  {
    icon: <CalendarDays size={13} />,
    text: `Has a DFA passport renewal appointment on ${D.dfaShortYear} · 10:30 AM`,
    source: "Booked via agent · Jul 2026",
  },
  {
    icon: <Briefcase size={13} />,
    text: "Employed — income tax filed through substituted filing",
    source: "Synced from BIR · 2025",
  },
  {
    icon: <Users size={13} />,
    text: "Has 2 registered PhilHealth dependents",
    source: "Synced from PhilHealth",
  },
  {
    icon: <MessageCircle size={13} />,
    text: "Prefers replies in English with a bit of Filipino",
    source: "Learned from conversations",
  },
  {
    icon: <Bell size={13} />,
    text: "Wants SMS and email reminders for every appointment and payment",
    source: "Learned from conversations · Jun 2026",
  },
];

export default function MemoryPage() {
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
          <h1 className="text-[24px] font-semibold tracking-tight">Memory</h1>
          <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500">
            What your agent remembers about you — from your conversations and
            your connected agencies. It uses this to skip questions it
            shouldn&apos;t have to ask.
          </p>
        </div>

        {/* What the agent remembers */}
        <section className="animate-fade-up delay-200 mt-8">
          <h2 className="font-pixel text-[10px] uppercase tracking-[0.18em] text-[#0a4f9e]">
            What your agent remembers
          </h2>
          <div className="mt-4 space-y-4">
            {MEMORIES.map((m) => (
              <div key={m.text} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f2f7ff] text-[#0a4f9e]">
                  {m.icon}
                </span>
                <div className="min-w-0">
                  <div className="text-[14px] font-medium leading-snug text-slate-700">
                    {m.text}
                  </div>
                  <div className="font-pixel mt-1 text-[8.5px] uppercase tracking-[0.16em] text-slate-400">
                    {m.source}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pointer to the vault */}
        <button
          type="button"
          onClick={() => router.push("/agent/vault")}
          className="group animate-fade-up delay-300 mt-8 flex w-full cursor-pointer items-center gap-3 rounded-xl bg-white p-4 text-left shadow-[0_18px_44px_-30px_rgba(6,61,125,0.3)] transition hover:shadow-[0_18px_44px_-24px_rgba(6,61,125,0.4)]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f2f7ff] text-[#0a4f9e]">
            <Folder size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-slate-700 transition group-hover:text-[#0a4f9e]">
              Personal documents live in your Vault
            </span>
            <span className="mt-0.5 block text-[12.5px] text-slate-400">
              Birth certificate, proof of billing, ID photo — the agent attaches
              them to applications for you.
            </span>
          </span>
          <ArrowRight
            size={15}
            className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#0a4f9e]"
          />
        </button>

        <div className="animate-fade-up delay-400 mt-6 flex items-start gap-2.5 rounded-xl bg-[#0a4f9e]/[0.04] px-4 py-3.5 text-[12.5px] leading-relaxed text-slate-500">
          <Lock size={14} className="mt-0.5 shrink-0 text-[#0a4f9e]" />
          <span>
            Everything here is encrypted and stays on your eGov account. Your
            agent only uses a memory when a transaction needs it — and shows
            you when it does.
          </span>
        </div>
      </div>
    </div>
  );
}
