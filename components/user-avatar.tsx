"use client";

import { useState } from "react";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UserAvatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string;
  className: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (src && failedSrc !== src) {
    return (
      // eGovPH returns a consent-scoped HTTPS image URL at runtime.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(src)}
        className={`${className} outline outline-1 -outline-offset-1 outline-black/10`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={name}
      className={`${className} grid place-items-center bg-[#eaf2fc] font-semibold text-[#0a4f9e] outline outline-1 -outline-offset-1 outline-black/10`}
    >
      {initials(name)}
    </div>
  );
}
