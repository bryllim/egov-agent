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
  PencilLine,
  Users,
} from "lucide-react";
import {
  PERSONAL_CONTEXT,
  type MemoryKind,
} from "../personal-context";
import { Squircle, SquircleButton } from "@/components/squircle";

const MEMORY_ICONS: Record<MemoryKind, React.ReactNode> = {
  location: <MapPin size={13} />,
  appointment: <CalendarDays size={13} />,
  employment: <Briefcase size={13} />,
  dependents: <Users size={13} />,
  language: <MessageCircle size={13} />,
  reminders: <Bell size={13} />,
};

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
            {PERSONAL_CONTEXT.memories.map((m) => (
              <div key={m.text} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f2f7ff] text-[#0a4f9e]">
                  {MEMORY_ICONS[m.kind]}
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
        <SquircleButton
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
        </SquircleButton>

        <Squircle className="animate-fade-up delay-400 mt-6 flex items-start gap-2.5 rounded-xl bg-[#0a4f9e]/[0.04] px-4 py-3.5 text-[12.5px] leading-relaxed text-slate-500">
          <Lock size={14} className="mt-0.5 shrink-0 text-[#0a4f9e]" />
          <span>
            Everything here is encrypted and stays on your eGov account. Your
            agent only uses a memory when a transaction needs it — and shows
            you when it does.
          </span>
        </Squircle>

        <SquircleButton
          type="button"
          className="animate-fade-up delay-400 mt-4 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 text-[13.5px] font-semibold text-[#0a4f9e] shadow-[inset_0_0_0_1px_rgba(10,79,158,0.12),0_14px_32px_-24px_rgba(6,61,125,0.38)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[#f6f9ff] hover:shadow-[inset_0_0_0_1px_rgba(10,79,158,0.18),0_16px_34px_-22px_rgba(6,61,125,0.46)] active:scale-[0.96]"
        >
          <PencilLine size={15} />
          Clear and edit memory
        </SquircleButton>
      </div>
    </div>
  );
}
