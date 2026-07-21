import "client-only";

const AUDIT_LOG_KEY = "egov-audit-log";
const AUDIT_LOG_EVENT = "egov-audit-log-change";
const MAX_AUDIT_EVENTS = 250;

export type AuditActor = "user" | "agent" | "system";
export type AuditCategory =
  | "navigation"
  | "interaction"
  | "service"
  | "data"
  | "security"
  | "integration";
export type AuditStatus = "completed" | "failed";

export type AuditEvent = {
  id: string;
  occurredAt: string;
  actor: AuditActor;
  action: string;
  detail?: string;
  target?: string;
  category: AuditCategory;
  status: AuditStatus;
};

type NewAuditEvent = Omit<AuditEvent, "id" | "occurredAt"> & {
  occurredAt?: string;
};

function isAuditEvent(value: unknown): value is AuditEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const event = value as Partial<AuditEvent>;
  return (
    typeof event.id === "string" &&
    typeof event.occurredAt === "string" &&
    typeof event.actor === "string" &&
    typeof event.action === "string" &&
    typeof event.category === "string" &&
    typeof event.status === "string"
  );
}

export function parseAuditEvents(raw: string | null): AuditEvent[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isAuditEvent) : [];
  } catch {
    return [];
  }
}

export function recordAuditEvent(input: NewAuditEvent) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const current = parseAuditEvents(
      window.localStorage.getItem(AUDIT_LOG_KEY),
    );
    const event: AuditEvent = {
      ...input,
      id: window.crypto.randomUUID(),
      occurredAt: input.occurredAt ?? new Date().toISOString(),
    };
    const next = [event, ...current].slice(0, MAX_AUDIT_EVENTS);
    window.localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(AUDIT_LOG_EVENT));
  } catch {
    // Audit logging must never interrupt the citizen's primary task.
  }
}

export function subscribeToAuditLog(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === AUDIT_LOG_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(AUDIT_LOG_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(AUDIT_LOG_EVENT, onStoreChange);
  };
}

export function getAuditLogSnapshot() {
  return window.localStorage.getItem(AUDIT_LOG_KEY) ?? "[]";
}

export function getServerAuditLogSnapshot() {
  return "[]";
}
