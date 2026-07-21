"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  FileText,
  Image as ImageIcon,
  Lock,
  Upload,
} from "lucide-react";
import { VAULT_FILES } from "../brain";
import { useSensoryUI } from "@/lib/provider";

type VaultDoc = {
  name: string;
  href?: string;
  size: string;
  added: string;
  tag: "PSA-verified" | "Encrypted";
  usedFor?: string;
};

const INITIAL_DOCS: VaultDoc[] = [
  {
    name: VAULT_FILES.birthCert.name,
    href: VAULT_FILES.birthCert.href,
    size: "1.4 MB",
    added: "Added Aug 2023",
    tag: "PSA-verified",
    usedFor: "Postal ID",
  },
  {
    name: VAULT_FILES.meralco.name,
    href: VAULT_FILES.meralco.href,
    size: "480 KB",
    added: "Added Jun 2026",
    tag: "Encrypted",
    usedFor: "Postal ID",
  },
  {
    name: VAULT_FILES.photo.name,
    href: VAULT_FILES.photo.href,
    size: "210 KB",
    added: "Added Jun 2026",
    tag: "Encrypted",
    usedFor: "Postal ID",
  },
  {
    name: VAULT_FILES.brgyClearance.name,
    href: VAULT_FILES.brgyClearance.href,
    size: "320 KB",
    added: "Added Feb 2026",
    tag: "Encrypted",
  },
];

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const VAULT_CAPACITY = 1024 * 1024 * 1024; // 1 GB
const INITIAL_USED = 2_502_246; // ≈ 2.4 MB across the seeded documents

function CapacityDonut({ usedBytes }: { usedBytes: number }) {
  const pct = Math.min(usedBytes / VAULT_CAPACITY, 1);
  const R = 30;
  const C = 2 * Math.PI * R;
  const visual = Math.max(pct, 0.02); // keep a visible sliver at tiny usage

  return (
    <svg
      width={84}
      height={84}
      viewBox="0 0 84 84"
      role="img"
      aria-label={`${formatSize(usedBytes)} of 1 GB used`}
    >
      <circle cx="42" cy="42" r={R} fill="none" stroke="#eef2f8" strokeWidth="10" />
      <circle
        cx="42"
        cy="42"
        r={R}
        fill="none"
        stroke="#0a4f9e"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${C * visual} ${C}`}
        transform="rotate(-90 42 42)"
      />
      <text
        x="42"
        y="40"
        textAnchor="middle"
        fontSize="12"
        fontWeight="700"
        fill="#0f172a"
        fontFamily="inherit"
      >
        {formatSize(usedBytes)}
      </text>
      <text x="42" y="53" textAnchor="middle" fontSize="8" fill="#94a3b8">
        of 1 GB
      </text>
    </svg>
  );
}

function DocIcon({ name }: { name: string }) {
  const isImage = /\.(jpe?g|png|heic|webp)$/i.test(name);
  const Icon = isImage ? ImageIcon : FileText;
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f2f7ff] text-[#0a4f9e]">
      <Icon size={16} />
    </span>
  );
}

function DocRow({ doc }: { doc: VaultDoc }) {
  const inner = (
    <>
      <DocIcon name={doc.name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-semibold text-slate-700 transition group-hover:text-[#0a4f9e]">
            {doc.name}
          </span>
          {doc.href && (
            <ArrowUpRight
              size={13}
              className="shrink-0 text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#0a4f9e]"
            />
          )}
        </div>
        <div className="mt-0.5 truncate text-[12.5px] text-slate-400">
          {doc.size} · {doc.added}
          {doc.usedFor ? ` · used for ${doc.usedFor}` : ""}
        </div>
      </div>
      <span
        className={`font-pixel flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[8.5px] uppercase tracking-[0.14em] ${
          doc.tag === "PSA-verified"
            ? "bg-emerald-50 text-emerald-600"
            : "bg-[#0a4f9e]/5 text-[#0a4f9e]"
        }`}
      >
        {doc.tag === "PSA-verified" ? (
          <BadgeCheck size={10} />
        ) : (
          <Lock size={10} />
        )}
        {doc.tag}
      </span>
    </>
  );

  if (doc.href) {
    return (
      <a
        href={doc.href}
        target="_blank"
        rel="noreferrer"
        className="group animate-step-in flex cursor-pointer items-center gap-4 rounded-xl px-2 py-2.5 transition hover:bg-white hover:shadow-[0_12px_30px_-18px_rgba(6,61,125,0.35)]"
      >
        {inner}
      </a>
    );
  }
  return (
    <div className="group animate-step-in flex items-center gap-4 px-2 py-2.5">
      {inner}
    </div>
  );
}

export default function VaultPage() {
  const router = useRouter();
  const { playSound } = useSensoryUI();
  const [docs, setDocs] = useState<VaultDoc[]>(INITIAL_DOCS);
  const [usedBytes, setUsedBytes] = useState(INITIAL_USED);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const files = Array.from(list);
    if (!files.length) return;
    const added = files.map((f) => ({
      name: f.name,
      size: formatSize(f.size),
      added: "Added just now",
      tag: "Encrypted" as const,
    }));
    setDocs((prev) => [...added, ...prev]);
    setUsedBytes((prev) => prev + files.reduce((sum, f) => sum + f.size, 0));
    void playSound("notification.success");
  };

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

        <div className="animate-fade-up delay-100 mt-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight">Vault</h1>
            <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-slate-500">
              Your personal documents, encrypted and ready. When a transaction
              needs one — like your Postal ID application — the agent attaches
              it for you and links it in the chat.
            </p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="font-pixel flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-[#0a4f9e] px-3.5 py-2 text-[8.5px] uppercase tracking-[0.14em] text-white transition hover:opacity-90 active:scale-[0.97]"
          >
            <Upload size={10} />
            Upload document
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {/* storage capacity */}
        <div className="animate-fade-up delay-200 mt-6 flex items-center gap-5 rounded-xl bg-white p-4 shadow-[0_18px_44px_-30px_rgba(6,61,125,0.3)]">
          <CapacityDonut usedBytes={usedBytes} />
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold text-slate-700">
              Vault storage
            </div>
            <div className="mt-1 text-[12.5px] leading-relaxed text-slate-500">
              {formatSize(usedBytes)} used of 1 GB ·{" "}
              {(100 - (usedBytes / VAULT_CAPACITY) * 100).toFixed(1)}% free
            </div>
            <div className="font-pixel mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[8.5px] uppercase tracking-[0.14em] text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Room for ~700 more documents
            </div>
          </div>
        </div>

        <div className="animate-fade-up delay-200 mt-6 -mx-2 space-y-1">
          {docs.map((d, i) => (
            <DocRow key={`${d.name}-${i}`} doc={d} />
          ))}
        </div>

        <div className="animate-fade-up delay-300 mt-6 flex items-start gap-2.5 rounded-xl bg-[#0a4f9e]/[0.04] px-4 py-3.5 text-[12.5px] leading-relaxed text-slate-500">
          <Lock size={14} className="mt-0.5 shrink-0 text-[#0a4f9e]" />
          <span>
            Files are encrypted at rest and only opened when a transaction
            needs them — with your consent, every time. Click any document to
            view it.
          </span>
        </div>
      </div>
    </div>
  );
}
