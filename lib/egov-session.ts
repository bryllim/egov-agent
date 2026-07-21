import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import type { User } from "@/app/agent/brain";

export const EGOV_SESSION_COOKIE = "egov_session";
export const EGOV_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export type EgovSession = {
  version: 1;
  subject: string;
  user: User;
  issuedAt: number;
  expiresAt: number;
};

function encryptionKey() {
  const secret = process.env.EGOV_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("EGOV_SESSION_SECRET must contain at least 32 characters.");
  }
  return createHash("sha256").update(secret).digest();
}

export function createEgovSession(subject: string, user: User): EgovSession {
  const issuedAt = Date.now();
  return {
    version: 1,
    subject,
    user,
    issuedAt,
    expiresAt: issuedAt + EGOV_SESSION_MAX_AGE_SECONDS * 1000,
  };
}

export function sealEgovSession(session: EgovSession) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(session), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, ciphertext, tag].map((part) => part.toString("base64url")).join(".");
}

function isSession(value: unknown): value is EgovSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<EgovSession>;
  return (
    session.version === 1 &&
    typeof session.subject === "string" &&
    typeof session.issuedAt === "number" &&
    typeof session.expiresAt === "number" &&
    Boolean(session.user) &&
    typeof session.user?.name === "string" &&
    typeof session.user?.firstName === "string" &&
    typeof session.user?.pcn === "string"
  );
}

export function openEgovSession(token: string | undefined) {
  if (!token) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [ivPart, ciphertextPart, tagPart] = parts;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(ivPart, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const session = JSON.parse(plaintext) as unknown;

    if (!isSession(session) || session.expiresAt <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(requestUrl: URL) {
  const callbackUrl = process.env.EGOV_SSO_CALLBACK_URL?.trim();
  let secure = requestUrl.protocol === "https:";

  if (callbackUrl) {
    try {
      secure ||= new URL(callbackUrl).protocol === "https:";
    } catch {
      // The callback route reports invalid environment configuration separately.
    }
  }

  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: EGOV_SESSION_MAX_AGE_SECONDS,
    priority: "high" as const,
  };
}
