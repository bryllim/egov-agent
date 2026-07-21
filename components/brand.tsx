import Image from "next/image";

/** The eGovPH ring logo (high-quality export) */
export function AgentMark({ size = 40 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ width: size, height: size }}
    >
      <Image
        src="/egov-logo-hq.png"
        alt="eGov PH"
        width={size}
        height={size}
        className="h-full w-full scale-[1.16] object-contain"
        priority
      />
    </span>
  );
}

export function AgentWordmark({ size = 34 }: { size?: number }) {
  const wordmarkTextSize = size >= 40 ? "text-[22px]" : "text-[18px]";

  return (
    <div className="flex items-center gap-3">
      <AgentMark size={size} />
      <span className={`font-pixel ${wordmarkTextSize} font-bold text-foreground`}>
        eGov <span className="text-[#0a4f9e]">Agent</span>
      </span>
    </div>
  );
}

/** eVerify brand mark — check-shield used on the SSO button */
export function EVerifyMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path
        d="M16 2l11 4.2v7.1c0 7-4.5 13.1-11 15.4C9.5 26.4 5 20.3 5 13.3V6.2L16 2z"
        fill="#063d7d"
      />
      <path
        d="M11 15.5l3.6 3.6L21.5 12"
        fill="none"
        stroke="#fff"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Partner logo strip shown on the intro screen footer */
export function PartnerLogos() {
  return (
    <div className="flex items-center justify-center gap-8 opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0">
      <Image
        src="/coat-of-arms.svg"
        alt="Republic of the Philippines"
        width={34}
        height={34}
        className="h-8 w-auto"
      />
      <Image
        src="/bagong-pilipinas.png"
        alt="Bagong Pilipinas"
        width={36}
        height={36}
        className="h-9 w-auto"
      />
      <Image
        src="/dict.svg"
        alt="Department of Information and Communications Technology"
        width={34}
        height={34}
        className="h-8 w-auto"
      />
      <Image
        src="/philsys.png"
        alt="Philippine Identification System"
        width={80}
        height={24}
        className="h-5 w-auto"
      />
    </div>
  );
}
