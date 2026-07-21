"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Lock, Plug } from "lucide-react";
import { AgencySeal, sealFor } from "@/components/agency";
import { recordAuditEvent } from "@/lib/audit-log";
import { useSensoryUI } from "@/lib/provider";
import { Squircle } from "@/components/squircle";

type Agency = {
  label: string; // used for logo lookup
  name: string;
  desc: string;
  connected: boolean;
  fallback?: { initials: string; color: string };
};

const AGENCIES: Agency[] = [
  {
    label: "PhilSys",
    name: "PhilSys — National ID (PSA)",
    desc: "Identity verification via eVerify",
    connected: true,
  },
  {
    label: "DFA",
    name: "Department of Foreign Affairs",
    desc: "Passports & consular services",
    connected: true,
  },
  {
    label: "NBI",
    name: "National Bureau of Investigation",
    desc: "Clearances & record checks",
    connected: true,
  },
  {
    label: "SSS",
    name: "Social Security System",
    desc: "Contributions, loans & benefits",
    connected: true,
  },
  {
    label: "PhilHealth",
    name: "PhilHealth",
    desc: "Health insurance & member records",
    connected: true,
  },
  {
    label: "LTO",
    name: "Land Transportation Office",
    desc: "Driver's licenses & vehicle registration",
    connected: true,
  },
  {
    label: "BIR",
    name: "Bureau of Internal Revenue",
    desc: "TIN, filing status & tax documents",
    connected: true,
  },
  {
    label: "eGov Pay",
    name: "eGov Pay",
    desc: "Unified payments for government fees",
    connected: true,
  },
  {
    label: "eMessage",
    name: "eMessage",
    desc: "Consent-based government SMS notifications",
    connected: true,
    fallback: { initials: "SMS", color: "#0a4f9e" },
  },
  {
    label: "DBM Compass",
    name: "DBM Compass",
    desc: "Public appropriations and budget-execution data",
    connected: true,
    fallback: { initials: "DBM", color: "#173f73" },
  },
  {
    label: "Pag-IBIG",
    name: "Pag-IBIG Fund",
    desc: "Savings, MP2 & housing loans",
    connected: true,
    fallback: { initials: "HDMF", color: "#0f6f3c" },
  },
  {
    label: "PSA CRS",
    name: "PSA Civil Registry",
    desc: "Birth, marriage & CENOMAR certificates",
    connected: false,
    fallback: { initials: "PSA", color: "#12315f" },
  },
  {
    label: "PRC",
    name: "Professional Regulation Commission",
    desc: "Professional licenses & renewals",
    connected: false,
    fallback: { initials: "PRC", color: "#1e3a8a" },
  },
  {
    label: "COMELEC",
    name: "Commission on Elections",
    desc: "Voter registration & certifications",
    connected: false,
    fallback: { initials: "COM", color: "#7a1c1c" },
  },
  {
    label: "DMW",
    name: "Department of Migrant Workers",
    desc: "OEC & OFW services",
    connected: false,
    fallback: { initials: "DMW", color: "#0b3d91" },
  },
  {
    label: "PhilPost",
    name: "Philippine Postal Corporation",
    desc: "Postal ID & document delivery",
    connected: false,
    fallback: { initials: "PHL", color: "#8a6d1a" },
  },
];

function AgencyLogo({ agency }: { agency: Agency }) {
  if (sealFor(agency.label)) {
    return <AgencySeal label={agency.label} size={34} />;
  }
  const fb = agency.fallback ?? { initials: "GOV", color: "#0a4f9e" };
  return (
    <span
      role="img"
      aria-label={agency.name}
      className="font-pixel inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[9px] font-bold tracking-wide text-white"
      style={{ background: fb.color }}
    >
      {fb.initials}
    </span>
  );
}

function ConnectButton({ name }: { name: string }) {
  const { playSound } = useSensoryUI();
  const [state, setState] = useState<"idle" | "connecting" | "connected">(
    "idle"
  );

  useEffect(() => {
    if (state !== "connecting") return;
    const timer = setTimeout(() => {
      setState("connected");
      recordAuditEvent({
        actor: "system",
        action: "Connected government agency",
        detail: `${name} is now available to the agent.`,
        target: name,
        category: "integration",
        status: "completed",
      });
      void playSound("notification.success");
    }, 1300 + Math.random() * 700);
    return () => clearTimeout(timer);
  }, [name, playSound, state]);

  if (state === "connected") {
    return (
      <span className="font-pixel animate-check-pop flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[8.5px] uppercase tracking-[0.14em] text-emerald-600">
        <Check size={10} strokeWidth={3.5} />
        Connected
      </span>
    );
  }

  if (state === "connecting") {
    return (
      <span className="font-pixel flex shrink-0 items-center gap-1.5 rounded-full bg-[#0a4f9e]/5 px-2.5 py-1 text-[8.5px] uppercase tracking-[0.14em] text-[#0a4f9e]">
        <span className="step-spinner h-3 w-3 shrink-0" />
        Connecting…
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setState("connecting")}
      aria-label={`Connect ${name}`}
      className="font-pixel flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-[#0a4f9e] px-3 py-1.5 text-[8.5px] uppercase tracking-[0.14em] text-white transition hover:opacity-90 active:scale-[0.97]"
    >
      <Plug size={10} />
      Connect
    </button>
  );
}

export default function AgenciesPage() {
  const router = useRouter();

  const connectedCount = AGENCIES.filter((a) => a.connected).length;

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
            Connected agencies
          </h1>
          <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500">
            Your agent can act on your behalf in agencies you&apos;ve connected.
            Connecting shares only what each transaction needs — with your
            consent, every time.
          </p>
          <span className="font-pixel mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] uppercase tracking-widest text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {connectedCount} of {AGENCIES.length} connected
          </span>
        </div>

        <div className="animate-fade-up delay-200 mt-6 space-y-1">
          {AGENCIES.map((a) => (
            <div key={a.name} className="flex items-center gap-4 py-3">
              <AgencyLogo agency={a} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold text-slate-700">
                  {a.name}
                </div>
                <div className="mt-0.5 truncate text-[12.5px] text-slate-400">
                  {a.desc}
                </div>
              </div>
              {a.connected ? (
                <span className="font-pixel flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[8.5px] uppercase tracking-[0.14em] text-emerald-600">
                  <Check size={10} strokeWidth={3.5} />
                  Connected
                </span>
              ) : (
                <ConnectButton name={a.name} />
              )}
            </div>
          ))}
        </div>

        <Squircle className="animate-fade-up delay-300 mt-6 flex items-start gap-2.5 rounded-xl bg-[#0a4f9e]/[0.04] px-4 py-3.5 text-[12.5px] leading-relaxed text-slate-500">
          <Lock size={14} className="mt-0.5 shrink-0 text-[#0a4f9e]" />
          <span>
            Connections use PhilSys eVerify and each agency&apos;s official API.
            You can disconnect an agency anytime — your records stay with the
            agency, never with the agent.
          </span>
        </Squircle>
      </div>
    </div>
  );
}
