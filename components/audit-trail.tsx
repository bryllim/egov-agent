"use client";

import { useEffect, type ReactNode } from "react";
import {
  recordAuditEvent,
  type AuditCategory,
} from "@/lib/audit-log";

function cleanLabel(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

function categoryForAction(label: string, element: HTMLElement): AuditCategory {
  const normalized = label.toLowerCase();

  if (
    element.tagName === "A" ||
    normalized.startsWith("opened ") ||
    /\b(back|previous|conversation|profile|logs)\b/.test(normalized)
  ) {
    return "navigation";
  }
  if (/\b(upload|attach|file|document|vault)\b/.test(normalized)) {
    return "data";
  }
  if (/\b(privacy|sign out|sound|verify|identity)\b/.test(normalized)) {
    return "security";
  }
  if (/\b(connect|agency|service)\b/.test(normalized)) {
    return "integration";
  }

  return "interaction";
}

export function AuditTrail({ children }: { children: ReactNode }) {
  useEffect(() => {
    const captureInteraction = (event: MouseEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const element = target.closest<HTMLElement>(
        "button, a[href], [role='button'], [data-audit]",
      );
      if (
        !element ||
        element.dataset.audit === "none" ||
        element.closest("[data-nextjs-dev-tools-button]")
      ) {
        return;
      }
      if (element instanceof HTMLButtonElement && element.disabled) {
        return;
      }

      const fallbackLabel =
        element.getAttribute("aria-label") ??
        element.getAttribute("title") ??
        element.textContent ??
        "";
      const label = cleanLabel(element.dataset.audit ?? fallbackLabel);
      if (!label) {
        return;
      }

      recordAuditEvent({
        actor: "user",
        action: label,
        category: categoryForAction(label, element),
        status: "completed",
        target:
          element instanceof HTMLAnchorElement
            ? element.getAttribute("href") ?? undefined
            : undefined,
      });
    };

    document.addEventListener("click", captureInteraction, true);
    return () =>
      document.removeEventListener("click", captureInteraction, true);
  }, []);

  return children;
}
