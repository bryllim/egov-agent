import Image from "next/image";

const PREVIEW_TILTS = ["-rotate-3", "rotate-2", "-rotate-2", "rotate-3"];

type VaultFileStampProps = {
  name: string;
  preview?: string;
  index: number;
};

export function VaultFileStamp({ name, preview, index }: VaultFileStampProps) {
  const extension = name.split(".").pop()?.slice(0, 4).toUpperCase() ?? "FILE";

  return (
    <div
      aria-hidden="true"
      className={`relative h-[84px] w-16 shrink-0 rounded-[3px] ${PREVIEW_TILTS[index % PREVIEW_TILTS.length]} shadow-[0_7px_14px_-8px_oklch(0_0_0/0.3),0_18px_28px_-20px_rgba(6,61,125,0.42)] transition-transform duration-300 ease-out motion-reduce:transform-none motion-reduce:transition-none group-hover:-translate-y-1 group-hover:rotate-0 group-hover:scale-[1.04] group-focus-visible:-translate-y-1 group-focus-visible:rotate-0 group-focus-visible:scale-[1.04] group-active:scale-[0.96]`}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[3px] bg-[#edf4fc]">
        {preview ? (
          <Image
            src={preview}
            alt=""
            width={64}
            height={84}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col bg-white px-2.5 pb-2.5 pt-3">
            <span className="h-1.5 w-6 bg-[#0a4f9e]/75" />
            <span className="mt-2.5 h-1 w-full bg-slate-200" />
            <span className="mt-1.5 h-1 w-4/5 bg-slate-200" />
            <span className="mt-1.5 h-1 w-2/3 bg-slate-200" />
            <span className="mt-auto h-3.5 w-3.5 bg-emerald-100" />
          </div>
        )}
      </div>
      <span className="font-pixel absolute -bottom-1 -right-1 bg-[#0a4f9e] px-1.5 py-0.5 text-[7px] uppercase tracking-[0.08em] text-white shadow-[0_3px_8px_-4px_rgba(6,61,125,0.8)]">
        {extension}
      </span>
    </div>
  );
}
