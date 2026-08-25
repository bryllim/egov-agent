import "server-only";

import { createHash } from "node:crypto";

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_MESSAGE_LENGTH = 480;
const SEND_WINDOW_MS = 10 * 60 * 1_000;
const MAX_SENDS_PER_WINDOW = 3;
const sendAttempts = new Map<string, number[]>();

export type EMessageAcceptedSms = {
  status: "accepted";
  providerMessage: string;
};

export class EMessageApiError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "EMessageApiError";
  }
}

function configuration() {
  const baseUrl = process.env.EMESSAGE_BASE_URL?.trim().replace(/\/$/, "");
  const authToken = process.env.EMESSAGE_AUTH_TOKEN?.trim();

  if (!baseUrl || !authToken) {
    throw new EMessageApiError("eMessage is not configured.", 503);
  }

  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new EMessageApiError("The eMessage gateway URL is invalid.", 503);
  }
  if (url.protocol !== "https:") {
    throw new EMessageApiError("The eMessage gateway must use HTTPS.", 503);
  }
  if (!/^[0-9a-f]{32}$/i.test(authToken)) {
    throw new EMessageApiError(
      "The eMessage authentication token has an unsupported format.",
      503,
    );
  }

  return { baseUrl: url.toString().replace(/\/$/, ""), authToken };
}

function normalizeRecipient(number: string) {
  const normalized = number.trim().replace(/[\s()-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new EMessageApiError(
      "The verified mobile number is not in E.164 format.",
      400,
    );
  }
  return normalized;
}

function normalizeMessage(message: string) {
  const normalized = message.trim();
  if (!normalized || normalized.length > MAX_MESSAGE_LENGTH) {
    throw new EMessageApiError(
      `The SMS must contain 1 to ${MAX_MESSAGE_LENGTH} characters.`,
      400,
    );
  }
  return normalized;
}

function assertSendRateLimit(number: string) {
  const now = Date.now();
  const fingerprint = createHash("sha256").update(number).digest("hex");
  const recent = (sendAttempts.get(fingerprint) ?? []).filter(
    (attemptedAt) => now - attemptedAt < SEND_WINDOW_MS,
  );
  if (recent.length >= MAX_SENDS_PER_WINDOW) {
    throw new EMessageApiError(
      "This recipient has reached the eMessage demo limit. Try again in 10 minutes.",
      429,
    );
  }
  recent.push(now);
  sendAttempts.set(fingerprint, recent);
}

function responseError(status: number, body: unknown) {
  const errorCode = (body as { error?: unknown } | null)?.error;
  if (
    status === 401 ||
    status === 403 ||
    errorCode === "token_was_invalid"
  ) {
    return new EMessageApiError(
      "The eMessage authentication token was rejected.",
      503,
    );
  }
  if (status === 400 || status === 422) {
    return new EMessageApiError("eMessage rejected the SMS details.", 400);
  }
  if (status === 429) {
    return new EMessageApiError(
      "eMessage credits are unavailable. Please try again later.",
      429,
    );
  }
  return new EMessageApiError("eMessage is temporarily unavailable.", 503);
}

export async function pushEMessageSms(input: {
  number: string;
  message: string;
}): Promise<EMessageAcceptedSms> {
  const { baseUrl, authToken } = configuration();
  const number = normalizeRecipient(input.number);
  const message = normalizeMessage(input.message);
  assertSendRateLimit(number);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/messaging/v1/sms/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-EMESSAGE-Auth": authToken,
      },
      body: JSON.stringify({ number, message }),
      cache: "no-store",
      signal: controller.signal,
    });
    const text = await response.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        throw new EMessageApiError("eMessage returned an invalid response.");
      }
    }
    if (!response.ok) throw responseError(response.status, body);

    const providerMessage = (body as { data?: { message?: unknown } } | null)
      ?.data?.message;
    if (typeof providerMessage !== "string" || !providerMessage.trim()) {
      throw new EMessageApiError("eMessage returned an invalid SMS response.");
    }

    return { status: "accepted", providerMessage: providerMessage.trim() };
  } catch (error) {
    if (error instanceof EMessageApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new EMessageApiError(
        "The eMessage request timed out. Its acceptance status is unknown; do not resend yet.",
        504,
      );
    }
    throw new EMessageApiError("eMessage is temporarily unavailable.", 503);
  } finally {
    clearTimeout(timeout);
  }
}
