"use client";

import Image from "next/image";
import {
  Archive,
  BadgeCheck,
  Bell,
  Database,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Download,
  FileText,
  Info,
  LockKeyhole,
  Menu,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Paperclip,
  Phone,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Smile,
  UserRound,
  UsersRound,
  Video,
  WalletCards,
  X,
} from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { AgentMark } from "@/components/brand";
import { Squircle, SquircleButton } from "@/components/squircle";
import { DEMO_DATES as D } from "@/app/agent/dates";
import { previewForm } from "@/app/agent/forms";

type Message = {
  id: number;
  author: "agent" | "user";
  text?: string;
  time: string;
  card?: "passport" | "application" | "help" | "sss";
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    author: "agent",
    text: "Mabuhay, Bryl! 👋 I’m your official eGov Agent. I can help you access Philippine government services right here on Viber.",
    time: "10:32 AM",
  },
  {
    id: 2,
    author: "user",
    text: "I need to renew my passport.",
    time: "10:33 AM",
  },
  {
    id: 3,
    author: "agent",
    time: "10:33 AM",
    card: "passport",
  },
];

const QUICK_REPLIES = [
  "Renew my passport",
  "Get an NBI clearance",
  "Check my SSS contributions",
];

function currentTime() {
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

function ViberAgentAvatar({
  className = "",
  size,
}: {
  className?: string;
  size: number;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[oklch(0.12_0.004_294)] outline outline-1 outline-white/12 ${className}`}
      style={{ width: size, height: size }}
    >
      <AgentMark size={size} />
    </span>
  );
}

function ViberGlyph({ size = 28 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
    >
      <path
        d="M16 3.5c-7.2 0-12.5 4.9-12.5 11.7 0 3.7 1.6 6.8 4.6 9l-.8 4.3 4.3-2.2c1.4.4 2.8.6 4.4.6 7.2 0 12.5-4.9 12.5-11.7S23.2 3.5 16 3.5Z"
        fill="currentColor"
      />
      <path
        d="M12.2 9.6c.3-.3.8-.4 1.2-.1l1.6 1.2c.4.3.5.8.3 1.2l-.7 1.3c-.1.3-.1.6.1.8.8 1.2 1.8 2.2 3 3 .3.2.6.2.8 0l1.2-.8c.4-.2.9-.2 1.2.2l1.1 1.5c.3.4.2.9-.1 1.2l-.9.9c-.7.7-1.8 1-2.8.7-4.4-1.3-7.8-4.8-9-9.2-.3-1 .1-2 .8-2.7l.2-.2Z"
        fill="white"
      />
      <path
        d="M17.1 8.4a6.5 6.5 0 0 1 6.5 6.5M17.2 11.1a3.8 3.8 0 0 1 3.7 3.8"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NavButton({
  active = false,
  children,
  label,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <SquircleButton
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`relative grid h-11 w-11 cursor-pointer place-items-center rounded-xl transition-[background-color,transform,opacity] duration-200 active:scale-[0.96] ${
        active
          ? "bg-white/18 text-white shadow-[0_8px_18px_oklch(0.22_0.11_294/0.2)]"
          : "text-white/65 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
      {active && (
        <span className="absolute -left-[14px] h-6 w-1 rounded-e-full bg-white" />
      )}
    </SquircleButton>
  );
}

function IconButton({
  children,
  label,
  onClick,
  pressed,
  variant = "ghost",
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  pressed?: boolean;
  variant?: "ghost" | "soft";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
      className={`grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full transition-[background-color,color,transform] duration-200 active:scale-[0.96] ${
        variant === "soft"
          ? "bg-[oklch(0.28_0.035_294)] text-[oklch(0.73_0.18_294)] hover:bg-[oklch(0.33_0.055_294)]"
          : "text-[oklch(0.68_0.018_294)] hover:bg-[oklch(0.25_0.012_294)] hover:text-[oklch(0.9_0.035_294)]"
      } ${pressed ? "bg-[oklch(0.3_0.055_294)] text-[oklch(0.82_0.12_294)]" : ""}`}
    >
      {children}
    </button>
  );
}

function PassportCard({ onStart }: { onStart: () => void }) {
  return (
    <Squircle cornerRadius={18} className="w-full overflow-hidden rounded-[18px] bg-[oklch(0.23_0.012_294)] shadow-[0_8px_30px_oklch(0_0_0/0.34),0_1px_2px_oklch(0_0_0/0.28)] outline outline-1 outline-white/10">
      <div className="relative overflow-hidden bg-[linear-gradient(135deg,oklch(0.47_0.17_255),oklch(0.34_0.13_255))] px-5 pb-5 pt-4 text-white">
        <div className="relative flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/65">
            Department of Foreign Affairs
          </span>
          <ShieldCheck size={18} className="text-[oklch(0.85_0.12_205)]" />
        </div>
        <h3 className="relative mt-3 text-[18px] font-semibold leading-tight tracking-[-0.02em]">
          Passport renewal
        </h3>
        <p className="relative mt-1 text-[13px] leading-normal text-white/72">
          Online application · ePassport
        </p>
      </div>

      <div className="space-y-3 px-5 py-4">
        {[
          "PhilSys identity verified",
          "Current passport found",
          "Appointment booking available",
        ].map((item) => (
          <div key={item} className="flex items-center gap-3 text-[13px] text-[oklch(0.86_0.012_294)]">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[oklch(0.34_0.065_155)] text-[oklch(0.79_0.13_155)]">
              <Check size={12} strokeWidth={3} />
            </span>
            {item}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onStart}
        className="flex min-h-12 w-full cursor-pointer items-center justify-between bg-[oklch(0.27_0.02_294)] px-5 text-[14px] font-semibold text-[oklch(0.77_0.16_294)] shadow-[inset_0_1px_0_oklch(1_0_0/0.08)] transition-[background-color,transform] duration-200 hover:bg-[oklch(0.32_0.045_294)] active:scale-[0.96]"
      >
        Start passport renewal
        <ChevronRight size={17} />
      </button>
    </Squircle>
  );
}

function ApplicationCard() {
  return (
    <Squircle cornerRadius={18} className="w-full overflow-hidden rounded-[18px] bg-[oklch(0.23_0.012_294)] p-4 shadow-[0_8px_30px_oklch(0_0_0/0.34),0_1px_2px_oklch(0_0_0/0.28)] outline outline-1 outline-white/10">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[oklch(0.31_0.06_294)] text-[oklch(0.77_0.16_294)]">
          <FileText size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[oklch(0.94_0.008_294)]">
            Application ready
          </p>
          <p className="mt-0.5 text-[12px] leading-normal text-[oklch(0.68_0.018_294)]">
            DFA Passport Renewal · Ref. EG-260717-0842
          </p>
        </div>
        <span className="rounded-full bg-[oklch(0.34_0.065_155)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.07em] text-[oklch(0.82_0.12_155)]">
          Verified
        </span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[oklch(0.34_0.012_294)]">
        <div className="h-full w-2/3 rounded-full bg-[oklch(0.56_0.2_294)]" />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-[oklch(0.68_0.018_294)]">
        <span>Details pre-filled</span>
        <span className="tabular-nums">2 of 3 steps</span>
      </div>
      <SquircleButton
        type="button"
        className="mt-4 h-11 w-full cursor-pointer rounded-xl bg-[oklch(0.56_0.2_294)] text-[13px] font-semibold text-white shadow-[0_7px_18px_oklch(0.42_0.18_294/0.24)] transition-[background-color,transform] duration-200 hover:bg-[oklch(0.51_0.2_294)] active:scale-[0.96]"
      >
        Review application
      </SquircleButton>
    </Squircle>
  );
}

function SssContributionCard({ onPreview }: { onPreview: () => void }) {
  const rows = [D.sssMonth1, D.sssMonth2, D.sssMonth3];
  return (
    <Squircle cornerRadius={18} className="w-full overflow-hidden rounded-[18px] bg-[oklch(0.23_0.012_294)] shadow-[0_8px_30px_oklch(0_0_0/0.34),0_1px_2px_oklch(0_0_0/0.28)] outline outline-1 outline-white/10">
      <div className="flex items-center gap-3 bg-[linear-gradient(135deg,oklch(0.34_0.12_255),oklch(0.25_0.09_255))] px-5 py-4 text-white">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 outline outline-1 outline-white/12">
          <Database size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold tracking-[-0.01em]">SSS · 34-2258901-5</p>
          <p className="mt-0.5 text-[11px] text-white/65">Contribution summary</p>
        </div>
        <span className="rounded-full bg-[oklch(0.36_0.08_155)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[oklch(0.86_0.12_155)]">
          Up to date
        </span>
      </div>

      <div className="px-5">
        {rows.map((month) => (
          <div key={month} className="flex items-center gap-3 py-3 shadow-[inset_0_-1px_0_oklch(1_0_0/0.06)] last:shadow-none">
            <span className="min-w-0 flex-1 text-[12px] text-[oklch(0.68_0.018_294)]">{month}</span>
            <span className="text-[13px] font-semibold tabular-nums text-[oklch(0.9_0.008_294)]">₱1,830.00</span>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-[oklch(0.32_0.06_155)] px-2 py-1 text-[8px] font-bold uppercase tracking-[0.08em] text-[oklch(0.8_0.12_155)]">
              <Check size={9} strokeWidth={3} />
              Posted
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-end justify-between bg-[oklch(0.2_0.012_294)] px-5 py-3.5 shadow-[inset_0_1px_0_oklch(1_0_0/0.07)]">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[oklch(0.58_0.025_294)]">Total posted</p>
          <p className="mt-1 text-[10px] text-[oklch(0.66_0.018_294)]">87 contributions · fully posted</p>
        </div>
        <p className="text-[17px] font-bold tabular-nums text-[oklch(0.78_0.14_255)]">₱142,470.00</p>
      </div>

      <button
        type="button"
        onClick={onPreview}
        className="flex min-h-12 w-full cursor-pointer items-center justify-between bg-[oklch(0.27_0.02_294)] px-5 text-[13px] font-semibold text-[oklch(0.77_0.16_294)] shadow-[inset_0_1px_0_oklch(1_0_0/0.08)] transition-[background-color,transform] duration-200 hover:bg-[oklch(0.32_0.045_294)] active:scale-[0.96]"
      >
        <span className="flex items-center gap-2">
          <Download size={16} />
          Preview contribution statement
        </span>
        <ChevronRight size={16} />
      </button>
    </Squircle>
  );
}

function HelpCard({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <Squircle cornerRadius={18} className="w-full overflow-hidden rounded-[18px] bg-[oklch(0.23_0.012_294)] shadow-[0_8px_30px_oklch(0_0_0/0.34),0_1px_2px_oklch(0_0_0/0.28)] outline outline-1 outline-white/10">
      <div className="px-5 pb-3 pt-4">
        <div className="flex items-center gap-2 text-[14px] font-semibold text-[oklch(0.94_0.008_294)]">
          <Menu size={17} className="text-[oklch(0.75_0.17_294)]" />
          Popular services
        </div>
      </div>
      {QUICK_REPLIES.map((reply) => (
        <button
          type="button"
          key={reply}
          onClick={() => onSelect(reply)}
          className="flex min-h-11 w-full cursor-pointer items-center justify-between px-5 text-start text-[13px] text-[oklch(0.79_0.018_294)] shadow-[inset_0_1px_0_oklch(1_0_0/0.07)] transition-[background-color,color,transform] duration-200 hover:bg-[oklch(0.29_0.035_294)] hover:text-[oklch(0.82_0.14_294)] active:scale-[0.96]"
        >
          {reply}
          <ChevronRight size={15} />
        </button>
      ))}
    </Squircle>
  );
}

function MessageBubble({
  message,
  onPreviewStatement,
  onQuickReply,
  onStart,
}: {
  message: Message;
  onPreviewStatement: () => void;
  onQuickReply: (text: string) => void;
  onStart: () => void;
}) {
  const fromUser = message.author === "user";
  return (
    <div className={`flex ${fromUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[min(82%,510px)] space-y-2 sm:max-w-[min(72%,540px)]">
        {message.text && (
          <div
            className={`relative rounded-[18px] px-4 py-2.5 text-[14px] leading-[1.5] shadow-[0_4px_14px_oklch(0_0_0/0.28)] outline outline-1 outline-white/8 ${
              fromUser
                ? "rounded-br-[5px] bg-[oklch(0.34_0.095_294)] text-[oklch(0.95_0.008_294)]"
                : "rounded-bl-[5px] bg-[oklch(0.24_0.012_294)] text-[oklch(0.94_0.008_294)]"
            }`}
          >
            {!fromUser && (
              <p className="mb-1 text-[14px] font-semibold leading-tight text-[oklch(0.72_0.2_294)]">
                eGov Agent
              </p>
            )}
            <p className="text-pretty">{message.text}</p>
            <div
              className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] tabular-nums ${
                fromUser
                  ? "text-[oklch(0.76_0.06_294)]"
                  : "text-[oklch(0.67_0.018_294)]"
              }`}
            >
              {message.time}
              {fromUser && (
                <CheckCheck
                  size={14}
                  strokeWidth={2.2}
                  className="text-[oklch(0.78_0.15_294)]"
                />
              )}
            </div>
          </div>
        )}
        {message.card && (
          <div className="space-y-1">
            {message.card === "passport" && <PassportCard onStart={onStart} />}
            {message.card === "application" && <ApplicationCard />}
            {message.card === "sss" && <SssContributionCard onPreview={onPreviewStatement} />}
            {message.card === "help" && <HelpCard onSelect={onQuickReply} />}
            <p className="px-1 text-end text-[10px] tabular-nums text-[oklch(0.67_0.018_294)]">
              {message.time}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div
        aria-label="eGov Agent is typing"
        className="flex h-10 items-center gap-1 rounded-[18px] rounded-bl-[5px] bg-[oklch(0.24_0.012_294)] px-4 shadow-[0_4px_14px_oklch(0_0_0/0.28)] outline outline-1 outline-white/8"
      >
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="typing-dot h-1.5 w-1.5 rounded-full bg-[oklch(0.73_0.14_294)]"
          />
        ))}
      </div>
    </div>
  );
}

export function ViberDemo() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const scrollArea = useRef<HTMLDivElement>(null);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const area = scrollArea.current;
    if (area) area.scrollTo({ top: area.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  useEffect(
    () => () => {
      if (replyTimer.current) clearTimeout(replyTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  const agentReply = (query: string): Pick<Message, "text" | "card"> => {
    const value = query.toLowerCase();
    if (value.includes("passport") || value.includes("renewal")) {
      return {
        text: "I found your DFA record. Your identity is verified and your current passport is eligible for renewal. Here’s what I can prepare for you.",
        card: "passport",
      };
    }
    if (value.includes("nbi") || value.includes("clearance")) {
      return {
        text: "I can start your NBI clearance application using your verified PhilSys details. The total fee is ₱180, and you can pay securely through eGov Pay.",
      };
    }
    if (value.includes("sss") || value.includes("contribution")) {
      return {
        text: `Here’s your latest SSS contribution summary, Bryl. Your employer has posted all contributions through ${D.sssMonth1} — you’re fully up to date with 87 total posted contributions.`,
        card: "sss",
      };
    }
    if (value.includes("hello") || value.includes("hi") || value.includes("help")) {
      return {
        text: "Mabuhay! Tell me what government service you need, or choose one of these popular options.",
        card: "help",
      };
    }
    return {
      text: "I can help with that. I’ll securely use your verified eGov profile to find the right government service and guide you through the next steps.",
      card: "help",
    };
  };

  const sendMessage = (raw: string) => {
    const text = raw.trim();
    if (!text || typing) return;

    setInput("");
    setMessages((current) => [
      ...current,
      { id: Date.now(), author: "user", text, time: currentTime() },
    ]);
    setTyping(true);

    if (replyTimer.current) clearTimeout(replyTimer.current);
    const reply = agentReply(text);
    replyTimer.current = setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          author: "agent",
          text: reply.text,
          card: reply.card,
          time: currentTime(),
        },
      ]);
      setTyping(false);
    }, reply.card === "sss" ? 6000 : 1150);
  };

  const startPassport = () => {
    if (typing) return;
    const text = "Start my passport renewal";
    setMessages((current) => [
      ...current,
      { id: Date.now(), author: "user", text, time: currentTime() },
    ]);
    setTyping(true);
    replyTimer.current = setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          author: "agent",
          text: "Your application is pre-filled from your verified profile. Review the details, then I’ll help you choose a DFA appointment slot.",
          card: "application",
          time: currentTime(),
        },
      ]);
      setTyping(false);
    }, 1350);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    sendMessage(input);
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") setInput("");
  };

  const contactPreview = messages.some((message) => message.card === "sss")
    ? "SSS contributions · Up to date"
    : "Passport renewal · Application ready";

  return (
    <main className="relative flex h-dvh min-h-[560px] overflow-hidden bg-[oklch(0.11_0.006_294)] pt-0 [font-synthesis:none] text-[oklch(0.94_0.008_294)] selection:bg-[oklch(0.52_0.15_294)] selection:text-white md:pt-12">
      <div className="absolute inset-x-0 top-0 z-[80] hidden h-12 items-center bg-[oklch(0.19_0.006_294)] px-3 text-[oklch(0.62_0.012_294)] shadow-[inset_0_-1px_0_oklch(1_0_0/0.1)] md:flex">
        <div aria-hidden="true" className="flex items-center gap-2.5">
          <span className="h-3.5 w-3.5 rounded-full bg-[oklch(0.65_0.24_25)] shadow-[inset_0_0_0_1px_oklch(0_0_0/0.18)]" />
          <span className="h-3.5 w-3.5 rounded-full bg-[oklch(0.82_0.18_90)] shadow-[inset_0_0_0_1px_oklch(0_0_0/0.18)]" />
          <span className="h-3.5 w-3.5 rounded-full bg-[oklch(0.7_0.2_145)] shadow-[inset_0_0_0_1px_oklch(0_0_0/0.18)]" />
        </div>
        <span className="ms-5 text-[14px] font-semibold tracking-[-0.01em]">Rakuten Viber</span>
      </div>

      <aside className="hidden w-[72px] shrink-0 flex-col items-center bg-[linear-gradient(180deg,oklch(0.18_0.018_294),oklch(0.13_0.009_294))] py-4 shadow-[inset_-1px_0_0_oklch(1_0_0/0.09)] md:flex">
        <div className="grid h-11 w-11 place-items-center text-white">
          <ViberGlyph size={34} />
        </div>

        <nav aria-label="Viber navigation" className="mt-9 flex flex-1 flex-col items-center gap-2.5">
          <NavButton active label="Chats">
            <MessageCircle size={22} />
          </NavButton>
          <NavButton label="Calls" onClick={() => showToast("No recent Viber calls") }>
            <Phone size={21} />
          </NavButton>
          <NavButton label="Contacts" onClick={() => showToast("eGov Agent is your only contact") }>
            <UserRound size={21} />
          </NavButton>
          <NavButton label="Communities" onClick={() => showToast("No communities to show") }>
            <UsersRound size={21} />
          </NavButton>
          <NavButton label="Viber Pay" onClick={() => showToast("eGov Pay is securely connected") }>
            <WalletCards size={21} />
          </NavButton>
        </nav>

        <div className="flex flex-col items-center gap-2.5">
          <NavButton label="Settings" onClick={() => showToast("Viber demo settings") }>
            <Settings size={21} />
          </NavButton>
          <button
            type="button"
            aria-label="Your profile"
            title="Bryl Kezter Lim"
            onClick={() => showToast("Signed in as Bryl Kezter Lim")}
            className="relative h-10 w-10 cursor-pointer overflow-hidden rounded-full shadow-[0_5px_14px_oklch(0_0_0/0.4)] outline outline-1 outline-white/15 transition-transform duration-200 active:scale-[0.96]"
          >
            <Image src="/brylphoto.jpg" alt="Bryl Kezter Lim" fill sizes="40px" className="object-cover" />
          </button>
        </div>
      </aside>

      <aside className="hidden w-[318px] shrink-0 flex-col bg-[oklch(0.12_0.004_294)] shadow-[inset_-1px_0_0_oklch(1_0_0/0.1)] lg:flex">
        <div className="px-5 pb-3 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-semibold tracking-[-0.025em]">Chats</h1>
              <ChevronDown size={16} className="text-[oklch(0.58_0.012_294)]" />
            </div>
            <div className="flex items-center gap-1">
              <IconButton label="More options">
                <MoreHorizontal size={19} />
              </IconButton>
              <IconButton label="New message" variant="soft">
                <MessageCircle size={18} />
              </IconButton>
            </div>
          </div>

          <label className="mt-4 flex h-10 items-center gap-2.5 rounded-xl bg-[oklch(0.25_0.008_294)] px-3 text-[oklch(0.62_0.012_294)] shadow-[inset_0_1px_2px_oklch(0_0_0/0.28)] focus-within:bg-[oklch(0.28_0.012_294)] focus-within:outline focus-within:outline-2 focus-within:outline-[oklch(0.69_0.17_294/0.5)]">
            <Search size={16} />
            <input
              aria-label="Search chats"
              placeholder="Search"
              className="min-w-0 flex-1 bg-transparent text-base text-[oklch(0.92_0.008_294)] outline-none placeholder:text-[oklch(0.61_0.012_294)] sm:text-[13px]"
            />
          </label>
        </div>

        <div className="flex gap-2 overflow-hidden px-4 pb-3">
          {["All", "Unread", "★ Favorites"].map((filter, index) => (
            <button
              type="button"
              key={filter}
              className={`h-9 shrink-0 cursor-pointer rounded-full px-4 text-[12px] transition-[background-color,color,transform] duration-200 active:scale-[0.96] ${
                index === 0
                  ? "bg-[oklch(0.32_0.012_294)] text-white"
                  : "bg-[oklch(0.25_0.008_294)] text-[oklch(0.78_0.012_294)] hover:bg-[oklch(0.29_0.025_294)]"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="px-2">
          <SquircleButton
            cornerRadius={14}
            type="button"
            className="flex w-full cursor-pointer items-center gap-3 rounded-[14px] bg-[oklch(0.27_0.04_294)] px-3 py-3 text-start transition-[background-color,transform] duration-200 hover:bg-[oklch(0.3_0.055_294)] active:scale-[0.96]"
          >
            <div className="relative">
              <ViberAgentAvatar size={48} />
              <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-[oklch(0.67_0.18_150)] outline outline-[3px] outline-[oklch(0.27_0.04_294)]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[14px] font-semibold">eGov Agent</span>
                <BadgeCheck size={15} className="shrink-0 fill-[oklch(0.56_0.2_294)] text-white" />
              </div>
              <p className="mt-1 truncate text-[12px] text-[oklch(0.66_0.012_294)]">
                {contactPreview}
              </p>
            </div>
            <div className="self-start pt-0.5 text-[10px] tabular-nums text-[oklch(0.62_0.012_294)]">
              10:33 AM
            </div>
          </SquircleButton>
        </div>

        <div className="mt-auto flex items-center gap-3 px-6 py-5 text-[11px] text-[oklch(0.58_0.012_294)]">
          <LockKeyhole size={14} />
          <span>Messages are end-to-end encrypted</span>
        </div>
      </aside>

      <section className="relative flex min-w-0 flex-1 flex-col bg-[oklch(0.1_0.004_294)]">
        <header className="z-20 flex h-[72px] shrink-0 items-center justify-between bg-[oklch(0.12_0.004_294/0.96)] px-3 shadow-[inset_0_-1px_0_oklch(1_0_0/0.1),0_2px_14px_oklch(0_0_0/0.18)] backdrop-blur-xl sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <IconButton label="Open menu" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={21} />
            </IconButton>
            <ViberAgentAvatar size={43} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em]">eGov Agent</h2>
                <BadgeCheck size={16} className="shrink-0 fill-[oklch(0.56_0.2_294)] text-white" />
              </div>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[oklch(0.66_0.012_294)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.67_0.18_150)]" />
                Official public account
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <IconButton label="Voice call" onClick={() => showToast("Calls are unavailable for public accounts") }>
              <Phone size={19} />
            </IconButton>
            <span className="hidden sm:block">
              <IconButton label="Video call" onClick={() => showToast("Video is unavailable for public accounts") }>
                <Video size={20} />
              </IconButton>
            </span>
            <IconButton label="Conversation info" pressed={detailsOpen} onClick={() => setDetailsOpen((open) => !open)}>
              <Info size={20} />
            </IconButton>
          </div>
        </header>

        <div
          ref={scrollArea}
          className="relative flex-1 overflow-y-auto px-3 pb-7 pt-5 sm:px-8"
          style={{
            backgroundImage:
              "radial-gradient(circle at 12% 18%, oklch(0.48 0.025 294 / 0.18) 0 1px, transparent 1.5px), radial-gradient(circle at 78% 62%, oklch(0.48 0.025 294 / 0.14) 0 1px, transparent 1.5px), repeating-linear-gradient(45deg, transparent 0 31px, oklch(0.38 0.016 294 / 0.07) 32px 33px, transparent 34px 64px), linear-gradient(135deg, oklch(0.115 0.006 294), oklch(0.08 0.004 294))",
            backgroundSize: "42px 42px, 54px 54px, 96px 96px, 100% 100%",
          }}
        >
          <div className="mx-auto flex w-full max-w-[860px] flex-col gap-2.5">
            <div className="mb-1 flex justify-center">
              <span className="rounded-full bg-[oklch(0.45_0.015_294/0.9)] px-3 py-1 text-[10px] font-medium text-white shadow-[0_3px_10px_oklch(0_0_0/0.28)] backdrop-blur">
                Today
              </span>
            </div>

            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onPreviewStatement={() => {
                  previewForm("sss-statement", {
                    name: "Bryl Kezter Lim",
                    firstName: "Bryl",
                    pcn: "6302-6431-0891-2530",
                  });
                  showToast("Opening your SSS contribution statement");
                }}
                onQuickReply={sendMessage}
                onStart={startPassport}
              />
            ))}
            {typing && <TypingBubble />}
          </div>
        </div>

        <div className="shrink-0 bg-[oklch(0.12_0.004_294)] px-2.5 py-2.5 shadow-[inset_0_1px_0_oklch(1_0_0/0.1),0_-3px_16px_oklch(0_0_0/0.22)] sm:px-4 sm:py-3">
          <form onSubmit={submit} className="mx-auto flex max-w-[920px] items-end gap-1.5">
            <IconButton label="Add attachment">
              <Paperclip size={20} />
            </IconButton>
            <div className="flex min-h-11 min-w-0 flex-1 items-center gap-1 rounded-[22px] bg-[oklch(0.2_0.008_294)] px-4 shadow-[inset_0_0_0_1px_oklch(1_0_0/0.11),0_2px_8px_oklch(0_0_0/0.22)] focus-within:shadow-[inset_0_0_0_2px_oklch(0.68_0.17_294/0.5),0_3px_10px_oklch(0_0_0/0.26)]">
              <input
                aria-label="Write a message"
                autoComplete="off"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Write a message…"
                className="min-w-0 flex-1 bg-transparent py-2.5 text-base leading-normal text-[oklch(0.94_0.008_294)] outline-none placeholder:text-[oklch(0.58_0.012_294)] sm:text-[14px]"
              />
              <button
                type="button"
                aria-label="Choose an emoji"
                className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-[oklch(0.65_0.012_294)] transition-[background-color,color,transform] duration-200 hover:bg-[oklch(0.27_0.025_294)] hover:text-[oklch(0.78_0.15_294)] active:scale-[0.96]"
              >
                <Smile size={20} />
              </button>
            </div>
            <button
              type="submit"
              aria-label={input.trim() ? "Send message" : "Record voice message"}
              disabled={typing}
              className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full bg-[oklch(0.56_0.2_294)] text-white shadow-[0_7px_16px_oklch(0.42_0.18_294/0.25)] transition-[background-color,transform,opacity] duration-200 hover:bg-[oklch(0.51_0.2_294)] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {input.trim() ? <Send size={18} className="translate-x-px" /> : <Mic size={19} />}
            </button>
          </form>
        </div>
      </section>

      <aside
        aria-label="Conversation details"
        aria-hidden={!detailsOpen}
        className={`absolute inset-y-0 right-0 z-40 flex w-[min(88vw,310px)] shrink-0 flex-col bg-[oklch(0.14_0.006_294)] shadow-[-14px_0_35px_oklch(0_0_0/0.4)] transition-transform duration-300 ease-out xl:relative xl:z-auto xl:shadow-[inset_1px_0_0_oklch(1_0_0/0.1)] ${
          detailsOpen ? "translate-x-0" : "translate-x-full xl:hidden"
        }`}
      >
        <div className="flex h-[72px] shrink-0 items-center justify-between px-5 shadow-[inset_0_-1px_0_oklch(1_0_0/0.1)]">
          <h2 className="text-[15px] font-semibold">Conversation info</h2>
          <IconButton label="Close details" onClick={() => setDetailsOpen(false)}>
            <X size={20} />
          </IconButton>
        </div>
        <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
          <ViberAgentAvatar
            size={82}
            className="shadow-[0_9px_24px_oklch(0_0_0/0.34)]"
          />
          <div className="mt-4 flex items-center gap-1.5">
            <h3 className="text-[17px] font-semibold">eGov Agent</h3>
            <BadgeCheck size={17} className="fill-[oklch(0.56_0.2_294)] text-white" />
          </div>
          <p className="mt-1 text-[12px] text-[oklch(0.66_0.012_294)]">Official public account</p>
          <p className="mt-4 max-w-[240px] text-pretty text-[12px] leading-[1.55] text-[oklch(0.72_0.012_294)]">
            Your secure AI guide to Philippine government services, powered by eGovPH.
          </p>
        </div>
        <Squircle cornerRadius={16} className="mx-4 rounded-[16px] bg-[oklch(0.22_0.018_294)] p-4 shadow-[inset_0_0_0_1px_oklch(1_0_0/0.07)]">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[oklch(0.32_0.06_155)] text-[oklch(0.78_0.13_155)]">
              <ShieldCheck size={19} />
            </span>
            <div className="text-start">
              <p className="text-[12px] font-semibold">Verified integration</p>
              <p className="mt-0.5 text-[10px] text-[oklch(0.64_0.012_294)]">PhilSys · eVerify · eGov Pay</p>
            </div>
          </div>
        </Squircle>
        <div className="mt-4 px-3">
          {[
            { icon: Bell, label: "Mute notifications" },
            { icon: Archive, label: "Chat history" },
            { icon: CircleHelp, label: "Help and support" },
          ].map(({ icon: ItemIcon, label }) => (
            <SquircleButton
              type="button"
              key={label}
              onClick={() => showToast(label)}
              className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-start text-[13px] text-[oklch(0.78_0.012_294)] transition-[background-color,transform] duration-200 hover:bg-[oklch(0.22_0.015_294)] active:scale-[0.96]"
            >
              <ItemIcon size={18} className="text-[oklch(0.68_0.08_294)]" />
              {label}
            </SquircleButton>
          ))}
        </div>
      </aside>

      <button
        type="button"
        aria-label="Close mobile menu"
        onClick={() => setMobileMenuOpen(false)}
        className={`fixed inset-0 z-40 bg-[oklch(0.18_0.04_294/0.38)] backdrop-blur-[2px] transition-opacity duration-300 md:hidden ${
          mobileMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-label="Viber menu"
        aria-hidden={!mobileMenuOpen}
        inert={mobileMenuOpen ? undefined : true}
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(86vw,320px)] flex-col bg-[oklch(0.14_0.006_294)] text-[oklch(0.94_0.008_294)] shadow-[18px_0_44px_oklch(0_0_0/0.42)] transition-transform duration-300 ease-out md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between bg-[oklch(0.2_0.025_294)] p-5 text-white shadow-[inset_0_-1px_0_oklch(1_0_0/0.1)]">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 overflow-hidden rounded-full outline outline-2 outline-white/70">
              <Image src="/brylphoto.jpg" alt="Bryl Kezter Lim" fill sizes="44px" className="object-cover" />
            </div>
            <div>
              <p className="text-[14px] font-semibold">Bryl Kezter Lim</p>
              <p className="mt-0.5 text-[11px] text-white/70">Viber Desktop</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
            className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 active:scale-[0.96]"
          >
            <X size={21} />
          </button>
        </div>
        <div className="px-3 py-4">
          {[
            { icon: MessageCircle, label: "Chats" },
            { icon: Phone, label: "Calls" },
            { icon: UserRound, label: "Contacts" },
            { icon: WalletCards, label: "Viber Pay" },
            { icon: Settings, label: "Settings" },
          ].map(({ icon: ItemIcon, label }, index) => (
            <SquircleButton
              type="button"
              key={label}
              onClick={() => {
                setMobileMenuOpen(false);
                if (index > 0) showToast(label);
              }}
              className={`flex min-h-12 w-full items-center gap-4 rounded-xl px-4 text-[14px] transition-[background-color,color,transform] duration-200 active:scale-[0.96] ${
                index === 0
                  ? "bg-[oklch(0.3_0.06_294)] font-semibold text-[oklch(0.84_0.12_294)]"
                  : "text-[oklch(0.76_0.012_294)] hover:bg-[oklch(0.22_0.015_294)]"
              }`}
            >
              <ItemIcon size={20} />
              {label}
            </SquircleButton>
          ))}
        </div>
      </aside>

      <div
        aria-live="polite"
        className={`pointer-events-none fixed bottom-20 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-[oklch(0.26_0.03_294/0.92)] px-4 py-2 text-center text-[12px] text-white shadow-[0_10px_30px_oklch(0.18_0.04_294/0.25)] backdrop-blur transition-[opacity,transform] duration-200 ${
          toast ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        {toast}
      </div>
    </main>
  );
}
