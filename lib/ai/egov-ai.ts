import "server-only";

const TOKEN_PATH = "/api/v1/egov/integration/token";
const ASSISTANT_PATH = "/api/v1/egov/integration/ai_assistant/generate";
const REQUEST_TIMEOUT_MS = 120_000;
const TOKEN_EXPIRY_SKEW_MS = 60_000;

type CachedToken = {
  value: string;
  expiresAt: number;
};

let cachedToken: CachedToken | null = null;

export class EgovAiApiError extends Error {
  constructor(
    message: string,
    readonly status = 502
  ) {
    super(message);
    this.name = "EgovAiApiError";
  }
}

function configuration() {
  const baseUrl = process.env.EGOV_AI_BASE_URL?.trim().replace(/\/$/, "");
  const accessCode = process.env.EGOV_AI_ACCESS_CODE?.trim();

  if (!baseUrl || !accessCode) {
    throw new EgovAiApiError("eGov AI is not configured.", 503);
  }

  try {
    new URL(baseUrl);
  } catch {
    throw new EgovAiApiError("The eGov AI gateway URL is invalid.", 503);
  }

  return { baseUrl, accessCode };
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new EgovAiApiError("eGov AI returned an invalid response.");
  }
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new EgovAiApiError("eGov AI took too long to respond.", 504);
    }
    throw new EgovAiApiError("eGov AI is temporarily unavailable.", 503);
  } finally {
    clearTimeout(timeout);
  }
}

async function getAccessToken() {
  if (
    cachedToken &&
    Date.now() < cachedToken.expiresAt - TOKEN_EXPIRY_SKEW_MS
  ) {
    return cachedToken.value;
  }

  const { baseUrl, accessCode } = configuration();
  const response = await fetchWithTimeout(`${baseUrl}${TOKEN_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_code: accessCode }),
  });
  const body = await readJson(response);

  if (!response.ok) {
    throw new EgovAiApiError(
      response.status === 401 || response.status === 403
        ? "The eGov AI access code was rejected."
        : "eGov AI authentication is temporarily unavailable.",
      response.status === 401 || response.status === 403 ? 503 : 502
    );
  }

  const tokenResponse = body as {
    access_token?: unknown;
    expires_in_seconds?: unknown;
  } | null;
  if (typeof tokenResponse?.access_token !== "string") {
    throw new EgovAiApiError("eGov AI returned an invalid access token.");
  }

  const expiresInSeconds =
    typeof tokenResponse.expires_in_seconds === "number"
      ? Math.max(60, tokenResponse.expires_in_seconds)
      : 300;
  cachedToken = {
    value: tokenResponse.access_token,
    expiresAt: Date.now() + expiresInSeconds * 1_000,
  };

  return cachedToken.value;
}

export async function generateEgovAiAssistant(prompt: string) {
  const { baseUrl } = configuration();
  const accessToken = await getAccessToken();
  const response = await fetchWithTimeout(`${baseUrl}${ASSISTANT_PATH}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, category: "PH" }),
  });
  const body = await readJson(response);

  if (!response.ok) {
    const errorBody = body as { code?: unknown; message?: unknown } | null;
    const validationDetails = (
      body as {
        detail?: Array<{
          type?: unknown;
          loc?: unknown;
          msg?: unknown;
          ctx?: unknown;
        }>;
      } | null
    )?.detail?.map((detail) => ({
      type: detail.type,
      loc: detail.loc,
      msg: detail.msg,
      ctx: detail.ctx,
    }));
    console.error("eGov AI assistant request failed", {
      status: response.status,
      code:
        typeof errorBody?.code === "string" ? errorBody.code : "unknown",
      message:
        typeof errorBody?.message === "string"
          ? errorBody.message.slice(0, 300)
          : "No error message returned",
      validationDetails,
    });
    if (response.status === 401 || response.status === 403) {
      cachedToken = null;
      throw new EgovAiApiError("eGov AI authentication failed.", 503);
    }
    if (response.status === 429) {
      throw new EgovAiApiError(
        "eGov AI credits are unavailable. Please try again later.",
        429
      );
    }
    throw new EgovAiApiError("eGov AI could not process the request.");
  }

  const assistantResponse = body as { data?: unknown } | null;
  if (
    typeof assistantResponse?.data !== "string" ||
    !assistantResponse.data.trim()
  ) {
    throw new EgovAiApiError("eGov AI returned an invalid assistant response.");
  }

  return assistantResponse.data.trim();
}
