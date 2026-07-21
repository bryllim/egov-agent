"use client";

import Image from "next/image";
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
  User as UserIcon,
} from "lucide-react";
import { AgencySeal } from "@/components/agency";
import { useAgentShell } from "../shell";
import { DEMO_PROFILE } from "../brain";

const PERSONAL: { icon: React.ReactNode; label: string; value: string }[] = [
  { icon: <UserIcon size={13} />, label: "Full legal name", value: "Bryl Kezter Lim" },
  { icon: <CalendarDays size={13} />, label: "Date of birth", value: "March 8, 1998" },
  { icon: <UserIcon size={13} />, label: "Sex", value: "Male" },
  { icon: <UserIcon size={13} />, label: "Civil status", value: "Single" },
  { icon: <ShieldCheck size={13} />, label: "Citizenship", value: "Filipino" },
  { icon: <UserIcon size={13} />, label: "Blood type", value: "O+" },
];

const CONTACT: { icon: React.ReactNode; label: string; value: string }[] = [
  { icon: <Phone size={13} />, label: "Mobile number", value: "+63 917 ••• 4482" },
  { icon: <Mail size={13} />, label: "Email address", value: "bry••••@gmail.com" },
  { icon: <MapPin size={13} />, label: "Permanent address", value: "Mandaluyong City, Metro Manila" },
  { icon: <BadgeCheck size={13} />, label: "eGov member since", value: "August 2023" },
];

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
    <section
      className={`animate-fade-up rounded-xl bg-white p-6 shadow-[0_18px_44px_-30px_rgba(6,61,125,0.3)] ${delay ?? ""} ${className}`}
    >
      <h2 className="font-pixel text-[10px] uppercase tracking-[0.18em] text-[#0a4f9e]">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
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
        <section className="animate-fade-up delay-100 mt-6 flex flex-col items-center gap-5 rounded-xl bg-white p-7 shadow-[0_18px_44px_-30px_rgba(6,61,125,0.3)] sm:flex-row sm:items-center">
          <Image
            src={user.photoSrc ?? DEMO_PROFILE.photoSrc}
            alt={user.name}
            width={84}
            height={84}
            className="h-[84px] w-[84px] shrink-0 rounded-full object-cover ring-4 ring-[#0a4f9e]/10"
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

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SectionCard title="Personal information" delay="delay-200">
            <div className="space-y-4">
              {PERSONAL.map((f) => (
                <InfoField key={f.label} {...f} />
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Contact & address" delay="delay-200">
            <div className="space-y-4">
              {CONTACT.map((f) => (
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

        <div className="animate-fade-up delay-400 mt-5 flex items-start gap-2.5 rounded-xl bg-[#0a4f9e]/[0.04] px-4 py-3.5 text-[12.5px] leading-relaxed text-slate-500">
          <Lock size={14} className="mt-0.5 shrink-0 text-[#0a4f9e]" />
          <span>
            This information is read-only — it&apos;s synced from your PhilSys
            record via eVerify and from each agency&apos;s live registry. To
            update your personal details, visit any PhilSys registration center
            or ask the eGov Agent where to go.
          </span>
        </div>
      </div>
    </div>
  );
}
