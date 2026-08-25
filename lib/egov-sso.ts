import "server-only";

import { createHash } from "node:crypto";
import type { User } from "@/app/agent/brain";
import { formatPersonName, formatProfileValue } from "@/lib/identity-display";

const REQUEST_TIMEOUT_MS = 10_000;
const EXCHANGE_CODE_TTL_MS = 5 * 60_000;
const claimedExchangeCodes = new Map<string, number>();

type JsonRecord = Record<string, unknown>;

export type EgovSsoPublicConfig = {
  host: string;
  partnerCode: string;
  partnerName: string;
  showTestAccounts: boolean;
};

export type EgovIdentity = {
  subject: string;
  user: User;
};

export type EgovSsoErrorCode =
  | "configuration_error"
  | "invalid_exchange_code"
  | "partner_forbidden"
  | "profile_unauthorized"
  | "quota_exceeded"
  | "service_unavailable"
  | "invalid_response";

export class EgovSsoError extends Error {
  constructor(
    public readonly code: EgovSsoErrorCode,
    public readonly status: number,
  ) {
    super(code);
    this.name = "EgovSsoError";
  }
}

function requiredEnvironmentValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new EgovSsoError("configuration_error", 503);
  }
  return value;
}

function gatewayBaseUrl() {
  const raw = requiredEnvironmentValue("EGOV_SSO_BASE_URL");

  try {
    const url = new URL(raw);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error("The eGov SSO gateway must use HTTPS.");
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    throw new EgovSsoError("configuration_error", 503);
  }
}

export function getEgovSsoPublicConfig(): EgovSsoPublicConfig {
  return {
    host: gatewayBaseUrl(),
    partnerCode: requiredEnvironmentValue("EGOV_SSO_PARTNER_CODE"),
    partnerName: process.env.EGOV_SSO_PARTNER_NAME?.trim() || "eGov Agent",
    showTestAccounts: process.env.EGOV_SSO_DEMO_MODE === "true",
  };
}

function getPrivateConfig() {
  return {
    ...getEgovSsoPublicConfig(),
    partnerSecret: requiredEnvironmentValue("EGOV_SSO_PARTNER_SECRET"),
  };
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function valueAtPath(value: unknown, path: string): unknown {
  return path
    .split(".")
    .filter(Boolean)
    .reduce<unknown>((current, part) => {
      return isJsonRecord(current) ? current[part] : undefined;
    }, value);
}

function stringAtPaths(value: unknown, paths: string[]) {
  for (const path of paths) {
    const candidate = valueAtPath(value, path);
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
    if (typeof candidate === "number") {
      return String(candidate);
    }
  }
  return undefined;
}

function configuredPath(name: string, fallback: string) {
  return process.env[name]?.trim() || fallback;
}

function safePhotoUrl(raw: string | undefined) {
  if (!raw || raw.length > 2048) return undefined;

  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function formatPcn(raw: string | undefined) {
  if (!raw) return "Not shared by eGovPH";
  const digits = raw.replace(/\D/g, "");
  return digits.length === 16
    ? digits.replace(/(\d{4})(?=\d)/g, "$1-")
    : raw.slice(0, 80);
}

function limited(value: string | undefined, maxLength: number) {
  return value?.slice(0, maxLength);
}

function normalizeIdentity(payload: unknown): EgovIdentity {
  const subject = stringAtPaths(payload, [
    configuredPath("EGOV_SSO_SUBJECT_PATH", "data.uniqid"),
    "data.uniqid",
  ]);
  const firstName = stringAtPaths(payload, [
    configuredPath("EGOV_SSO_FIRST_NAME_PATH", "data.first_name"),
    "data.first_name",
  ]);
  const middleName = stringAtPaths(payload, [
    configuredPath("EGOV_SSO_MIDDLE_NAME_PATH", "data.middle_name"),
    "data.middle_name",
  ]);
  const lastName = stringAtPaths(payload, [
    configuredPath("EGOV_SSO_LAST_NAME_PATH", "data.last_name"),
    "data.last_name",
  ]);
  const suffix = stringAtPaths(payload, ["data.suffix"]);

  if (!subject || !firstName || !lastName) {
    throw new EgovSsoError("invalid_response", 502);
  }

  const name = formatPersonName([firstName, middleName, lastName, suffix]
    .filter(Boolean)
    .join(" "))
    .slice(0, 180);

  return {
    subject: subject.slice(0, 180),
    user: {
      name,
      firstName: formatPersonName(firstName).slice(0, 80),
      pcn: formatPcn(
        stringAtPaths(payload, [
          configuredPath("EGOV_SSO_PCN_PATH", "data.pcn"),
          "data.pcn",
          "data.PCN",
          "data.national_id",
          "data.philsys_card_number",
        ]),
      ),
      photoSrc: safePhotoUrl(stringAtPaths(payload, ["data.photo"])),
      birthDate: limited(stringAtPaths(payload, ["data.birth_date"]), 40),
      sex: formatProfileValue(
        limited(stringAtPaths(payload, ["data.sex", "data.gender"]), 40),
      ),
      nationality: limited(stringAtPaths(payload, ["data.nationality"]), 80),
      mobile: limited(stringAtPaths(payload, ["data.mobile"]), 80),
      email: limited(stringAtPaths(payload, ["data.email"]), 254),
      address: limited(stringAtPaths(payload, ["data.address"]), 600),
    },
  };
}

async function readJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new EgovSsoError("invalid_response", 502);
  }
}

async function callEgov(url: string, init: RequestInit) {
  try {
    return await fetch(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new EgovSsoError("service_unavailable", 503);
  }
}

function tokenFailure(status: number): never {
  if (status === 403) throw new EgovSsoError("partner_forbidden", 503);
  if (status === 422) throw new EgovSsoError("invalid_exchange_code", 401);
  if (status === 429) throw new EgovSsoError("quota_exceeded", 503);
  if (status === 502 || status === 504) {
    throw new EgovSsoError("service_unavailable", 503);
  }
  throw new EgovSsoError("invalid_response", 502);
}

function profileFailure(status: number): never {
  if (status === 401) throw new EgovSsoError("profile_unauthorized", 401);
  if (status === 429) throw new EgovSsoError("quota_exceeded", 503);
  if (status === 502 || status === 504) {
    throw new EgovSsoError("service_unavailable", 503);
  }
  throw new EgovSsoError("invalid_response", 502);
}

export function claimExchangeCode(exchangeCode: string) {
  const now = Date.now();
  for (const [digest, expiresAt] of claimedExchangeCodes) {
    if (expiresAt <= now) claimedExchangeCodes.delete(digest);
  }

  const digest = createHash("sha256").update(exchangeCode).digest("base64url");
  if (claimedExchangeCodes.has(digest)) return false;

  claimedExchangeCodes.set(digest, now + EXCHANGE_CODE_TTL_MS);
  return true;
}

export async function authenticateEgovExchangeCode(
  exchangeCode: string,
): Promise<EgovIdentity> {
  const config = getPrivateConfig();
  const tokenResponse = await callEgov(`${config.host}/api/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      exchange_code: exchangeCode,
      scope: "SSO_AUTHENTICATION",
      partner_code: config.partnerCode,
      partner_secret: config.partnerSecret,
    }),
  });

  if (!tokenResponse.ok) tokenFailure(tokenResponse.status);
  const tokenPayload = await readJson(tokenResponse);
  const accessToken = stringAtPaths(tokenPayload, [
    configuredPath("EGOV_SSO_ACCESS_TOKEN_PATH", "access_token"),
    "access_token",
  ]);
  if (!accessToken) throw new EgovSsoError("invalid_response", 502);

  const profileResponse = await callEgov(
    `${config.host}/api/partner/sso_authentication`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!profileResponse.ok) profileFailure(profileResponse.status);
  return normalizeIdentity(await readJson(profileResponse));
}
