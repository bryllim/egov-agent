"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Smartphone } from "lucide-react";
import {
  AgentMark,
  AgentWordmark,
  EVerifyMark,
  PartnerLogos,
} from "@/components/brand";

const VERIFY_DURATION_MS = 4800;

const DEMO_USER = {
  name: "Bryl Kezter Lim",
  firstName: "Bryl",
  pcn: "6302-6431-0891-2530",
  photoSrc: "/brylphoto.jpg",
};

function formatPcn(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1-");
}

export default function IntroPage() {
  const router = useRouter();
  const [pcn, setPcn] = useState("");
  const [verifying, setVerifying] = useState(false);
  const verificationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearVerificationTimer = useCallback(() => {
    if (!verificationTimer.current) return;
    clearTimeout(verificationTimer.current);
    verificationTimer.current = null;
  }, []);

  useEffect(() => clearVerificationTimer, [clearVerificationTimer]);

  const startVerification = useCallback(() => {
    if (verifying) return;

    clearVerificationTimer();
    setVerifying(true);

    verificationTimer.current = setTimeout(() => {
      sessionStorage.setItem(
        "egov-user",
        JSON.stringify({
          ...DEMO_USER,
          pcn: pcn || DEMO_USER.pcn,
        })
      );
      router.push("/agent");
    }, VERIFY_DURATION_MS);
  }, [clearVerificationTimer, pcn, router, verifying]);

  const pcnComplete = pcn.replace(/\D/g, "").length === 16;

  return (
    <main className="ambient-glow relative flex min-h-dvh flex-col">
      {/* Center */}
      <section className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[480px]">
          <div className="mb-12 animate-fade-up">
            <div className="mb-10">
              <AgentWordmark size={40} />
            </div>
            <h1 className="text-[44px] font-semibold leading-[1.05] tracking-tight sm:text-[56px]">
              Mabuhay<span className="text-[#0a4f9e]">!</span>
            </h1>
            <p className="mt-5 text-[19px] leading-relaxed text-slate-500">
              Your secure AI guide to Philippine services,
              <br />
              ready when you are.
            </p>
          </div>

          <div className="animate-fade-up delay-200 space-y-3">
            <div className="hairline flex items-center overflow-hidden rounded-2xl bg-white transition focus-within:border-[#0a4f9e]/40">
              <input
                id="pcn"
                inputMode="numeric"
                autoComplete="off"
                aria-label="PhilSys Card Number"
                placeholder="0000-0000-0000-0000"
                value={pcn}
                onChange={(e) => setPcn(formatPcn(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && pcnComplete) startVerification();
                }}
                className="font-pixel h-16 flex-1 bg-transparent px-6 text-[17px] tracking-wide outline-none placeholder:text-slate-300"
              />
              <button
                onClick={startVerification}
                disabled={!pcnComplete}
                aria-label="Continue"
                className="bg-brand-gradient m-2 flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-[0_8px_18px_rgba(6,61,125,0.16)] transition-all duration-200 ease-out enabled:cursor-pointer enabled:hover:-translate-y-0.5 enabled:hover:brightness-105 enabled:hover:shadow-[0_16px_30px_rgba(6,61,125,0.28)] enabled:active:translate-y-0 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-25 disabled:shadow-none"
              >
                <ArrowRight size={20} />
              </button>
            </div>
            <p className="font-pixel px-1 text-[11px] uppercase tracking-widest text-slate-400">
              PhilSys Card Number
            </p>

            <div className="pt-4 space-y-2.5">
              <button
                onClick={startVerification}
                className="hairline flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-white text-[16px] text-slate-700 shadow-[0_8px_22px_rgba(11,22,36,0.04)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[#0a4f9e]/50 hover:bg-[#f8fbff] hover:text-[#0a4f9e] hover:shadow-[0_16px_34px_rgba(6,61,125,0.12)] active:translate-y-0 active:scale-[0.99]"
              >
                <EVerifyMark size={20} />
                Sign in with <span className="-ml-1.5 font-semibold">eVerify</span>
              </button>
              <button
                onClick={startVerification}
                className="hairline flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-white text-[16px] text-slate-700 shadow-[0_8px_22px_rgba(11,22,36,0.04)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[#0a4f9e]/50 hover:bg-[#f8fbff] hover:text-[#0a4f9e] hover:shadow-[0_16px_34px_rgba(6,61,125,0.12)] active:translate-y-0 active:scale-[0.99]"
              >
                <Smartphone size={19} className="text-[#0a4f9e]" />
                Continue with <span className="-ml-1.5 font-semibold">eGovPH</span>
              </button>
            </div>
          </div>

          {/* Partners */}
          <div className="mt-16 animate-fade-up delay-400">
            <p className="font-pixel mb-5 text-center text-[10px] uppercase tracking-[0.22em] text-slate-400">
              In partnership with
            </p>
            <PartnerLogos />
          </div>
        </div>
      </section>

      <footer className="font-pixel pb-7 text-center text-[10px] uppercase tracking-widest text-slate-300 animate-fade-in">
        RA 10173 · Data Privacy Act · DICT 2026
      </footer>

      {/* Loading overlay */}
      {verifying && (
        <div className="animate-fade-in fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-xl">
          <div className="relative flex h-28 w-28 items-center justify-center">
            <div className="animate-spin-slow absolute inset-0 rounded-full border-2 border-[#0a4f9e]/10 border-t-[#063d7d]" />
            <AgentMark size={64} />
          </div>
          <div
            aria-live="polite"
            className="font-pixel mt-9 text-[13px] uppercase tracking-[0.18em] text-slate-600"
          >
            Loading...
          </div>
        </div>
      )}
    </main>
  );
}
