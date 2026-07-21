import Image from "next/image";

/* Real agency logos used across the agent chat and profile pages */

export const AGENCY_LOGOS: Record<
  string,
  { src: string; aspect?: number; fullName: string }
> = {
  philsys: {
    src: "/agency-logos/philsys.png",
    aspect: 2.4,
    fullName: "Philippine Statistics Authority",
  },
  dfa: {
    src: "/agency-logos/dfa.png",
    fullName: "Department of Foreign Affairs",
  },
  nbi: {
    src: "/agency-logos/nbi.png",
    fullName: "National Bureau of Investigation",
  },
  sss: {
    src: "/agency-logos/sss.png",
    aspect: 1.35,
    fullName: "Social Security System",
  },
  philhealth: {
    src: "/agency-logos/philhealth.png",
    aspect: 2.2,
    fullName: "Philippine Health Insurance Corporation",
  },
  lto: {
    src: "/agency-logos/lto.png",
    fullName: "Land Transportation Office",
  },
  bir: {
    src: "/agency-logos/bir.png",
    fullName: "Bureau of Internal Revenue",
  },
  pay: {
    src: "/agency-logos/egovpay.svg",
    fullName: "eGov Pay",
  },
  egov: {
    src: "/agency-logos/egovph.svg",
    aspect: 2.4,
    fullName: "eGovPH",
  },
};

export function sealFor(label: string) {
  const t = label.toLowerCase();
  if (t.includes("philsys")) return AGENCY_LOGOS.philsys;
  if (t.includes("dfa")) return AGENCY_LOGOS.dfa;
  if (t.includes("nbi")) return AGENCY_LOGOS.nbi;
  if (t.includes("sss")) return AGENCY_LOGOS.sss;
  if (t.includes("philhealth")) return AGENCY_LOGOS.philhealth;
  if (t.includes("lto")) return AGENCY_LOGOS.lto;
  if (t.includes("bir")) return AGENCY_LOGOS.bir;
  if (t.includes("pay")) return AGENCY_LOGOS.pay;
  if (t.includes("notify") || t.includes("egov agent") || t.includes("egovph"))
    return AGENCY_LOGOS.egov;
  return null;
}

export function AgencySeal({ label, size = 32 }: { label: string; size?: number }) {
  const seal = sealFor(label);
  if (!seal) return null;
  const width = Math.round(size * Math.min(seal.aspect ?? 1, 2.4));

  return (
    <span
      role="img"
      aria-label={seal.fullName}
      className="relative inline-flex shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-slate-200"
      style={{ width, height: size }}
    >
      <Image
        src={seal.src}
        alt=""
        fill
        sizes={`${width}px`}
        className="object-contain p-[1px]"
      />
    </span>
  );
}
