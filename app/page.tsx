"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AgentMark, AgentWordmark, PartnerLogos } from "@/components/brand";
import { SquircleButton } from "@/components/squircle";
import { recordAuditEvent } from "@/lib/audit-log";
import { useSensoryUI } from "@/lib/provider";

const HACKATHON_TEST_ACCOUNT = "Jose Cruz Dela Peña III";

type EgovWidgetConfig = {
  host: string;
  partnerCode: string;
  partnerName: string;
  showTestAccounts: boolean;
};

type EgovWidgetInstance = {
  destroy: () => void;
  open: () => void;
};

type EgovWidgetError = {
  code: string;
  message: string;
};

declare global {
  interface Window {
    EgovLogin?: {
      render: (options: {
        target: string;
        partnerCode: string;
        host: string;
        partnerName: string;
        label: string;
        locale: "en" | "fil";
        theme: "light" | "dark" | "auto";
        showTestAccounts: boolean;
        accessCheck: "lazy" | "eager";
        onSuccess: (result: { exchangeCode: string }) => void;
        onError: (error: EgovWidgetError) => void;
      }) => EgovWidgetInstance;
    };
  }
}

export default function IntroPage() {
  const router = useRouter();
  const { playSound } = useSensoryUI();
  const widget = useRef<EgovWidgetInstance | null>(null);
  const signingInRef = useRef(false);
  const [config, setConfig] = useState<EgovWidgetConfig | null>(null);
  const [widgetReady, setWidgetReady] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth_error")) {
      const supportId = params.get("support");
      queueMicrotask(() =>
        setAuthError(
          `We could not complete eGovPH sign-in. Please try again.${
            supportId ? ` Support ID: ${supportId}` : ""
          }`,
        ),
      );
      window.history.replaceState(null, "", "/");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/auth/egov/session", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        if (response.ok) {
          router.replace("/agent");
          router.refresh();
        }
      })
      .catch(() => undefined);

    void fetch("/api/auth/egov/config", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("configuration");
        setConfig((await response.json()) as EgovWidgetConfig);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAuthError(
          "eGovPH sign-in is not configured. Check the server configuration and try again.",
        );
      })
      .finally(() => setConfigLoading(false));

    return () => controller.abort();
  }, [router]);

  const completeSignIn = useCallback(
    async (exchangeCode: string) => {
      if (signingInRef.current) return;
      signingInRef.current = true;
      setSigningIn(true);
      setAuthError(null);

      try {
        const response = await fetch("/api/auth/egov/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exchangeCode }),
        });
        const result = (await response.json()) as {
          error?: string;
          correlationId?: string;
        };

        if (!response.ok) {
          throw new Error(
            `${result.error || "We could not complete eGovPH sign-in."}${
              result.correlationId ? ` Support ID: ${result.correlationId}` : ""
            }`,
          );
        }

        recordAuditEvent({
          actor: "system",
          action: "eGovPH SSO completed",
          detail: "The citizen session was established through eGov SSO.",
          target: "eGov SSO",
          category: "security",
          status: "completed",
        });
        void playSound("notification.success");
        router.replace("/agent");
        router.refresh();
      } catch (error) {
        signingInRef.current = false;
        setSigningIn(false);
        setAuthError(
          error instanceof Error
            ? error.message
            : "We could not complete eGovPH sign-in. Please try again.",
        );
      }
    },
    [playSound, router],
  );

  useEffect(() => {
    if (!config || !widgetReady || !window.EgovLogin || widget.current) return;

    let hideTriggerFrame: number | undefined;

    try {
      widget.current = window.EgovLogin.render({
        target: "#egov-login",
        partnerCode: config.partnerCode,
        host: config.host,
        partnerName: config.partnerName,
        label: "Continue with eGovPH",
        locale: "en",
        theme: "light",
        showTestAccounts: config.showTestAccounts,
        accessCheck: "eager",
        onSuccess: ({ exchangeCode }) => void completeSignIn(exchangeCode),
        onError: (error) => setAuthError(error.message),
      });

      const hideVendorTrigger = () => {
        const vendorTrigger = document.querySelector<HTMLButtonElement>(
          "#egov-login button",
        );
        if (vendorTrigger) vendorTrigger.hidden = true;
      };
      hideVendorTrigger();
      hideTriggerFrame = window.requestAnimationFrame(hideVendorTrigger);
    } catch {
      queueMicrotask(() =>
        setAuthError(
          "The eGovPH sign-in control could not be loaded. Please refresh and try again.",
        ),
      );
    }

    return () => {
      if (hideTriggerFrame !== undefined) {
        window.cancelAnimationFrame(hideTriggerFrame);
      }
      widget.current?.destroy();
      widget.current = null;
    };
  }, [completeSignIn, config, widgetReady]);

  return (
    <main className="ambient-glow relative flex min-h-dvh flex-col">
      <Script
        src="https://widgets.e.gov.ph/v1.0.0/egov-login.min.js"
        strategy="afterInteractive"
        onReady={() => setWidgetReady(true)}
        onError={() =>
          setAuthError("The eGovPH sign-in control is unavailable. Please try again.")
        }
      />

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
              Sign in securely with your eGovPH account
              <br />
              to continue to government services.
            </p>
          </div>

          <div className="animate-fade-up delay-200">
            <div id="egov-login" />
            <SquircleButton
              type="button"
              cornerRadius={16}
              onClick={() => widget.current?.open()}
              disabled={configLoading || !config || !widgetReady || signingIn}
              className="bg-brand-gradient flex h-14 w-full items-center justify-center text-[16px] font-semibold text-white shadow-[0_10px_24px_rgba(6,61,125,0.2)] transition-[transform,box-shadow,filter,opacity] duration-150 enabled:cursor-pointer enabled:hover:-translate-y-0.5 enabled:hover:brightness-105 enabled:hover:shadow-[0_16px_30px_rgba(6,61,125,0.28)] enabled:active:translate-y-0 enabled:active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
            >
              {configLoading || (config && !widgetReady)
                ? "Connecting to eGovPH SSO…"
                : "Sign in via eGovPH SSO"}
            </SquircleButton>

            {config?.showTestAccounts && (
              <aside
                aria-label="Hackathon sandbox test account"
                className="mt-4 rounded-[18px] border border-dashed border-[#0a4f9e]/35 bg-[#f8fbff]/70 px-4 py-4 text-start"
              >
                <p className="font-pixel text-[9px] font-semibold uppercase tracking-[0.16em] text-[#0a4f9e]">
                  Hackathon sandbox test account
                </p>
                <p className="mt-1.5 text-[14px] font-semibold leading-snug text-slate-700">
                  {HACKATHON_TEST_ACCOUNT}
                </p>

                <dl className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 text-[12px] leading-relaxed">
                  <dt className="text-slate-500">Mobile number</dt>
                  <dd className="font-pixel font-semibold tabular-nums text-slate-700">
                    +63 909 000 0001
                  </dd>
                  <dt className="text-slate-500">One-time code</dt>
                  <dd className="font-pixel font-semibold tabular-nums text-slate-700">
                    123456
                  </dd>
                  <dt className="text-slate-500">PIN</dt>
                  <dd className="font-pixel font-semibold tabular-nums text-slate-700">
                    000000
                  </dd>
                </dl>

                <p className="mt-3 max-w-[52ch] text-[11px] leading-[1.55] text-slate-500">
                  In the eGovPH SSO window, choose <strong>Mobile number</strong>,
                  enter <span className="font-medium tabular-nums">9090000001</span>
                  {" "}after +63, then use the one-time code and PIN above.
                </p>
              </aside>
            )}

            {authError && (
              <p
                role="alert"
                className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700"
              >
                {authError}
              </p>
            )}
          </div>

          <div className="mt-16 animate-fade-up delay-400">
            <p className="font-pixel mb-5 text-center text-[10px] uppercase tracking-[0.22em] text-slate-400">
              In partnership with
            </p>
            <PartnerLogos />
          </div>
        </div>
      </section>

      <footer className="font-pixel animate-fade-in pb-7 text-center text-[10px] uppercase tracking-widest text-slate-300">
        RA 10173 · Data Privacy Act · DICT 2026
      </footer>

      {signingIn && (
        <div className="animate-fade-in fixed inset-0 z-50 grid place-items-center bg-white/90 backdrop-blur-xl">
          <div className="animate-intro-logo-spin grid h-28 w-28 place-items-center">
            <AgentMark size={96} />
          </div>
          <div
            aria-live="polite"
            className="animate-intro-loading-shimmer font-pixel absolute top-[calc(50%+88px)] text-[13px] font-bold uppercase tracking-[0.18em]"
          >
            Signing you in…
          </div>
        </div>
      )}
    </main>
  );
}
