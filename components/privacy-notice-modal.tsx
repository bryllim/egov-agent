"use client";

import {
  BrainCircuit,
  Database,
  LockKeyhole,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AgentMark } from "@/components/brand";
import { Squircle, SquircleButton } from "@/components/squircle";

const BLUR_LEAD_MS = 150;
const MODAL_EXIT_MS = 150;
const BLUR_EXIT_MS = 180;

type PrivacyNoticeModalProps = {
  onClose: () => void;
};

export function PrivacyNoticeModal({
  onClose,
}: PrivacyNoticeModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeTimersRef = useRef<number[]>([]);
  const revealFrameRef = useRef<number | null>(null);
  const closingRef = useRef(false);
  const [blurVisible, setBlurVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    revealFrameRef.current = window.requestAnimationFrame(() => {
      setBlurVisible(true);

      const revealTimer = window.setTimeout(
        () => setModalVisible(true),
        reduceMotion ? 0 : BLUR_LEAD_MS,
      );
      closeTimersRef.current.push(revealTimer);
    });

    return () => {
      if (revealFrameRef.current !== null) {
        window.cancelAnimationFrame(revealFrameRef.current);
      }
    };
  }, []);

  const closeWithAnimation = useCallback(() => {
    if (closingRef.current) {
      return;
    }

    closingRef.current = true;
    if (revealFrameRef.current !== null) {
      window.cancelAnimationFrame(revealFrameRef.current);
    }
    closeTimersRef.current.forEach(window.clearTimeout);
    closeTimersRef.current = [];

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setClosing(true);
    setModalVisible(false);

    if (reduceMotion) {
      setBlurVisible(false);
      onClose();
      return;
    }

    const blurTimer = window.setTimeout(
      () => setBlurVisible(false),
      MODAL_EXIT_MS,
    );
    const closeTimer = window.setTimeout(
      onClose,
      MODAL_EXIT_MS + BLUR_EXIT_MS,
    );
    closeTimersRef.current.push(blurTimer, closeTimer);
  }, [onClose]);

  useEffect(
    () => () => {
      closeTimersRef.current.forEach(window.clearTimeout);
      closeTimersRef.current = [];
    },
    [],
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const focusTimer = window.setTimeout(
      () => dialogRef.current?.focus(),
      reduceMotion ? 0 : BLUR_LEAD_MS + 30,
    );
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeWithAnimation();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [closeWithAnimation]);

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );

    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      closeWithAnimation();
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-transparent px-4 py-5 transition-[backdrop-filter] duration-200 ease-out sm:px-6 sm:py-8 ${
        blurVisible ? "backdrop-blur-[6px]" : "backdrop-blur-none"
      }`}
      onMouseDown={closeFromBackdrop}
    >
      <Squircle
        cornerRadius={18}
        className={`relative my-auto flex max-h-[calc(100dvh-2.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[18px] bg-white outline-none transition-[opacity,transform,filter] sm:max-h-[calc(100dvh-4rem)] ${
          closing
            ? "-translate-y-2 scale-[0.99] opacity-0 blur-[2px] duration-150 ease-in"
            : modalVisible
              ? "translate-y-0 scale-100 opacity-100 blur-0 duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              : "translate-y-2 scale-[0.985] opacity-0 blur-[3px] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        }`}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="privacy-title"
          aria-describedby="privacy-summary"
          tabIndex={-1}
          onKeyDown={handleDialogKeyDown}
          aria-hidden={!modalVisible}
          inert={modalVisible ? undefined : true}
          className="flex min-h-0 flex-1 flex-col outline-none"
        >
        <div className="min-h-0 overflow-y-auto px-5 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AgentMark size={36} />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0a4f9e]">
                  Privacy notice
                </p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  How eGov Agent handles your data
                </p>
              </div>
            </div>
            <SquircleButton
              cornerRadius={8}
              type="button"
              onClick={closeWithAnimation}
              aria-label="Close privacy notice"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-[background-color,color,transform] duration-150 hover:bg-slate-200 hover:text-slate-800 active:scale-[0.96]"
            >
              <X size={19} strokeWidth={2} aria-hidden />
            </SquircleButton>
          </div>

          <h1
            id="privacy-title"
            className="max-w-xl text-balance text-[26px] font-bold leading-[1.1] tracking-[-0.03em] text-[#0b1b31] sm:text-[32px]"
          >
            Your data, your control
          </h1>
          <p
            id="privacy-summary"
            className="mt-2.5 max-w-xl text-pretty text-sm leading-6 text-slate-600"
          >
            This notice explains how eGov Agent handles your information. We
            use only the data needed to understand your request and help you
            access the right government service.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <PrivacyPoint
              icon={<Database size={17} strokeWidth={1.8} aria-hidden />}
              title="What we process"
              description="Your messages, selected profile details, and files you choose to send."
            />
            <PrivacyPoint
              icon={<BrainCircuit size={17} strokeWidth={1.8} aria-hidden />}
              title="Why we use it"
              description="To understand requests, route services, prepare forms, and show results."
            />
            <PrivacyPoint
              icon={<LockKeyhole size={17} strokeWidth={1.8} aria-hidden />}
              title="How it is protected"
              description="With access controls, encryption, and activity records for accountability."
            />
          </div>

          <Squircle className="mt-4 rounded-xl bg-[#f4f8fd] px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2 text-[#0a4f9e]">
              <ShieldCheck size={17} strokeWidth={1.9} aria-hidden />
              <p className="text-[13px] font-bold text-[#0b1b31]">Important</p>
            </div>
            <p className="mt-1.5 text-[13px] leading-5 text-slate-600">
              AI helps understand your request. Your personal data is not used
              to train public AI models. Using eGov Agent does not automatically
              authorize a payment, form submission, or sharing with an agency.
              We will ask for your confirmation before any of those actions.
            </p>
          </Squircle>
        </div>
        </div>
      </Squircle>
    </div>
  );
}

function PrivacyPoint({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Squircle className="rounded-xl bg-[#f7faff] px-4 py-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8f2ff] text-[#0a4f9e]">
        {icon}
      </div>
      <p className="mt-3 text-[13px] font-bold text-[#0b1b31]">{title}</p>
      <p className="mt-1 text-xs leading-[1.55] text-slate-600">
        {description}
      </p>
    </Squircle>
  );
}
