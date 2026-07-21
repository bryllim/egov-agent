"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Fingerprint,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Volume2,
  VolumeX,
  User as UserIcon,
} from "lucide-react";
import { AgencySeal } from "@/components/agency";
import { useSoundEffects } from "@/components/sound-effects";
import { Squircle } from "@/components/squircle";
import { UserAvatar } from "@/components/user-avatar";
import { useAgentShell } from "../shell";

function displayDate(value: string | undefined) {
  if (!value) return "Not shared by eGovPH";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "long" }).format(date);
}

function sharedValue(value: string | undefined) {
  return value || "Not shared by eGovPH";
}

const RECORDS: {
  agency: string;
  name: string;
  detail: string;
  status: string;
}[] = [
  {
    agency: "DFA",
    name: "Department of Foreign Affairs",
    detail: "ePassport P4519028B · expires Mar 14, 2027",
    status: "Active",
  },
  {
    agency: "SSS",
    name: "Social Security System",
    detail: "Member 34-2258901-5 · 87 contributions posted",
    status: "Active",
  },
  {
    agency: "PhilHealth",
    name: "Philippine Health Insurance Corp.",
    detail: "PIN 08-025518412-3 · premiums up to date",
    status: "Active",
  },
  {
    agency: "LTO",
    name: "Land Transportation Office",
    detail: "License N03-12-345678 · expires Oct 2, 2026",
    status: "Active",
  },
  {
    agency: "BIR",
    name: "Bureau of Internal Revenue",
    detail: "TIN registered · RDO 41A, Mandaluyong",
    status: "Active",
  },
  {
    agency: "NBI",
    name: "National Bureau of Investigation",
    detail: "Biometrics on file · captured 2024",
    status: "Linked",
  },
];

function SectionCard({
  title,
  children,
  className = "",
  delay,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  delay?: string;
}) {
  return (
    <Squircle asChild>
      <section
        className={`animate-fade-up rounded-xl bg-white p-6 shadow-[0_18px_44px_-30px_rgba(6,61,125,0.3)] ${delay ?? ""} ${className}`}
      >
        <h2 className="font-pixel text-[10px] uppercase tracking-[0.18em] text-[#0a4f9e]">
          {title}
        </h2>
        <div className="mt-4">{children}</div>
      </section>
    </Squircle>
  );
}

function InfoField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f2f7ff] text-[#0a4f9e]">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="font-pixel text-[8.5px] uppercase tracking-[0.16em] text-slate-400">
          {label}
        </div>
        <div className="mt-1 text-[14px] font-medium leading-snug text-slate-700">
          {value}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAgentShell();
  const {
    reducedMotion,
    setSoundEffectsEnabled,
    soundEffectsEnabled,
  } = useSoundEffects();
  const personal: { icon: React.ReactNode; label: string; value: string }[] = [
    { icon: <UserIcon size={13} />, label: "Full legal name", value: user.name },
    { icon: <CalendarDays size={13} />, label: "Date of birth", value: displayDate(user.birthDate) },
    { icon: <UserIcon size={13} />, label: "Sex", value: sharedValue(user.sex) },
    { icon: <ShieldCheck size={13} />, label: "Citizenship", value: sharedValue(user.nationality) },
  ];
  const contact: { icon: React.ReactNode; label: string; value: string }[] = [
    { icon: <Phone size={13} />, label: "Mobile number", value: sharedValue(user.mobile) },
    { icon: <Mail size={13} />, label: "Email address", value: sharedValue(user.email) },
    { icon: <MapPin size={13} />, label: "Permanent address", value: sharedValue(user.address) },
  ];

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

        {/* Identity header */}
        <Squircle asChild>
          <section className="animate-fade-up delay-100 mt-6 flex flex-col items-center gap-5 rounded-xl bg-white p-7 shadow-[0_18px_44px_-30px_rgba(6,61,125,0.3)] sm:flex-row sm:items-center">
          <UserAvatar
            src={user.photoSrc}
            name={user.name}
            className="h-[84px] w-[84px] shrink-0 rounded-full object-cover text-xl ring-4 ring-[#0a4f9e]/10"
          />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="text-[24px] font-semibold tracking-tight">
              {user.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="font-pixel inline-flex items-center gap-1.5 rounded-full bg-[#0a4f9e]/10 px-2.5 py-1 text-[9px] uppercase tracking-widest text-[#0a4f9e]">
                <BadgeCheck size={12} />
                PhilSys Verified
              </span>
              <span className="font-pixel inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] uppercase tracking-widest text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                34 agencies connected
              </span>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 text-[13px] text-slate-500 sm:justify-start">
              <Fingerprint size={14} className="shrink-0 text-[#0a4f9e]" />
              <span className="font-pixel tracking-wide">
                PCN {user.pcn}
              </span>
            </div>
          </div>
          </section>
        </Squircle>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SectionCard title="Personal information" delay="delay-200">
            <div className="space-y-4">
              {personal.map((f) => (
                <InfoField key={f.label} {...f} />
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Contact & address" delay="delay-200">
            <div className="space-y-4">
              {contact.map((f) => (
                <InfoField key={f.label} {...f} />
              ))}
            </div>
          </SectionCard>
        </div>

        <section className="animate-fade-up delay-300 mt-8 px-1">
          <h2 className="font-pixel text-[10px] uppercase tracking-[0.18em] text-[#0a4f9e]">
            Linked agency records
          </h2>
          <div className="mt-4 space-y-1.5">
            {RECORDS.map((r) => (
              <div key={r.agency} className="flex items-center gap-4 py-2.5">
                <AgencySeal label={r.agency} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold text-slate-700">
                    {r.name}
                  </div>
                  <div className="mt-0.5 truncate text-[12.5px] text-slate-400">
                    {r.detail}
                  </div>
                </div>
                <span className="font-pixel flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[8.5px] uppercase tracking-[0.14em] text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        <Squircle className="animate-fade-up delay-400 mt-5 flex items-start gap-2.5 rounded-xl bg-[#0a4f9e]/[0.04] px-4 py-3.5 text-[12.5px] leading-relaxed text-slate-500">
          <Lock size={14} className="mt-0.5 shrink-0 text-[#0a4f9e]" />
          <span>
            This information is read-only — it&apos;s synced from your PhilSys
            record via eVerify and from each agency&apos;s live registry. To
            update your personal details, visit any PhilSys registration center
            or ask the eGov Agent where to go.
          </span>
        </Squircle>

        <section className="animate-fade-up delay-400 mt-8 border-t border-slate-200/80 px-1 pb-2 pt-6">
          <div className="flex items-center gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#0a4f9e] shadow-[0_10px_26px_-16px_rgba(6,61,125,0.45)]">
              {soundEffectsEnabled ? (
                <Volume2 size={18} />
              ) : (
                <VolumeX size={18} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[14px] font-semibold text-slate-700">
                Sound effects
              </h2>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-400">
                {reducedMotion && soundEffectsEnabled
                  ? "On, but currently muted by your reduced motion setting."
                  : "Play subtle feedback for taps, navigation, chat, and status updates."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={soundEffectsEnabled}
              aria-label="Sound effects"
              data-sound="interaction.toggle"
              onClick={() => setSoundEffectsEnabled(!soundEffectsEnabled)}
              className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a4f9e] ${
                soundEffectsEnabled ? "bg-[#0a4f9e]" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  soundEffectsEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
              <span className="sr-only">
                {soundEffectsEnabled
                  ? "Turn sound effects off"
                  : "Turn sound effects on"}
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
