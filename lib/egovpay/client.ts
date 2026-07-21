import "server-only";

import { createHmac, randomUUID } from "node:crypto";

const REQUEST_TIMEOUT_MS = 20_000;

export type EgovPayLineItem = {
  name: string;
  amountMinor: number;
};

export type EgovPayCreatedTransaction = {
  uuid: string;
  url: string;
  providerReference: string;
  txnid: string;
  amountMinor: number;
};

export type EgovPayTransaction = {
  uuid: string;
  refno: string;
  txnid: string;
  environmentType: string;
  amount: string;
  currency: string;
  paymentStatus: string;
  paymentChannel?: string | null;
  url?: string | null;
};

export class EgovPayApiError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "EgovPayApiError";
  }
}

function validUrl(value: string, label: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    return url.toString();
  } catch {
    throw new EgovPayApiError(`The eGovPay ${label} URL is invalid.`, 503);
  }
}

function configuration() {
  const baseUrl = process.env.EGOVPAY_BASE_URL?.trim().replace(/\/$/, "");
  const configuredToken = process.env.EGOVPAY_MERCHANT_TOKEN?.trim();
  const settlementTemplateUuid =
    process.env.EGOVPAY_SETTLEMENT_TEMPLATE_UUID?.trim();
  const appBaseUrl =
    process.env.EGOVPAY_APP_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    "http://localhost:3100";

  if (!baseUrl || !configuredToken || !settlementTemplateUuid) {
    throw new EgovPayApiError("eGovPay is not configured.", 503);
  }
  const isLegacyTestToken = configuredToken.startsWith("test_");
  const isPlatformCredential = /^[0-9a-f]{32}$/i.test(configuredToken);
  if (!isLegacyTestToken && !isPlatformCredential) {
    throw new EgovPayApiError(
      "The eGovPay merchant token has an unsupported format.",
      503,
    );
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      settlementTemplateUuid,
    )
  ) {
    throw new EgovPayApiError(
      "The eGovPay settlement template ID is invalid.",
      503,
    );
  }

  return {
    baseUrl: validUrl(baseUrl, "gateway").replace(/\/$/, ""),
    merchantToken: isLegacyTestToken
      ? configuredToken
      : `test_${configuredToken}`,
    settlementTemplateUuid,
    redirectUrl: validUrl(
      process.env.EGOVPAY_REDIRECT_URL?.trim() ||
        new URL("/agent?egovpay=return", appBaseUrl).toString(),
      "redirect",
    ),
    callbackUrl: validUrl(
      process.env.EGOVPAY_CALLBACK_URL?.trim() ||
        new URL("/api/webhooks/egovpay", appBaseUrl).toString(),
      "callback",
    ),
  };
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new EgovPayApiError("eGovPay returned an invalid response.");
  }
}

function responseError(status: number) {
  if (status === 401 || status === 403) {
    return new EgovPayApiError("The eGovPay merchant token was rejected.", 503);
  }
  if (status === 404) {
    return new EgovPayApiError("The eGovPay transaction was not found.", 404);
  }
  if (status === 422 || status === 400) {
    return new EgovPayApiError("eGovPay rejected the transaction details.", 400);
  }
  if (status === 429) {
    return new EgovPayApiError(
      "eGovPay credits are unavailable. Please try again later.",
      429,
    );
  }
  return new EgovPayApiError("eGovPay is temporarily unavailable.");
}

async function request(path: string, init: RequestInit = {}) {
  const { baseUrl, merchantToken } = configuration();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers = new Headers(init.headers);
  headers.set("X-eGovPay-Token", merchantToken);
  headers.set("Content-Type", "application/json; charset=utf-8");

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      signal: controller.signal,
    });
    const body = await readJson(response);
    if (!response.ok) throw responseError(response.status);
    return body;
  } catch (error) {
    if (error instanceof EgovPayApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new EgovPayApiError(
        init.method === "POST"
          ? "The eGovPay request timed out. Its status is unknown; do not retry yet."
          : "eGovPay took too long to respond.",
        504,
      );
    }
    throw new EgovPayApiError("eGovPay is temporarily unavailable.", 503);
  } finally {
    clearTimeout(timeout);
  }
}

function amountString(amountMinor: number) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new EgovPayApiError("The eGovPay amount is invalid.", 400);
  }
  const whole = Math.floor(amountMinor / 100);
  const cents = amountMinor % 100;
  return cents ? `${whole}.${String(cents).padStart(2, "0")}` : String(whole);
}

function transactionId(prefix: string) {
  const normalizedPrefix = prefix.replace(/[^A-Z0-9]/gi, "").slice(0, 10) || "EGOV";
  return `${normalizedPrefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

export async function createEgovPayTransaction(input: {
  prefix: string;
  items: EgovPayLineItem[];
  description: Record<string, string>;
}): Promise<EgovPayCreatedTransaction> {
  if (!input.items.length) {
    throw new EgovPayApiError("At least one eGovPay line item is required.", 400);
  }
  const amountMinor = input.items.reduce(
    (total, item) => total + item.amountMinor,
    0,
  );
  const amount = amountString(amountMinor);
  const txnid = transactionId(input.prefix);
  const {
    merchantToken,
    settlementTemplateUuid,
    redirectUrl,
    callbackUrl,
  } = configuration();
  const digest = createHmac("sha256", merchantToken)
    .update(`${amount}|${txnid}`)
    .digest("hex");

  const body = await request("/api/v1/transaction", {
    method: "POST",
    body: JSON.stringify({
      items: input.items.map((item) => ({
        name: item.name,
        amount: Number(amountString(item.amountMinor)),
      })),
      amount: Number(amount),
      settlement_template_uuid: settlementTemplateUuid,
      redirect_url: redirectUrl,
      callback_url: callbackUrl,
      txnid,
      digest,
      currency: "PHP",
      description: input.description,
    }),
  });
  const result = body as {
    data?: {
      uuid?: unknown;
      url?: unknown;
      channel?: { refno?: unknown };
    };
  } | null;
  if (
    typeof result?.data?.uuid !== "string" ||
    typeof result.data.url !== "string" ||
    typeof result.data.channel?.refno !== "string"
  ) {
    throw new EgovPayApiError("eGovPay returned an invalid checkout response.");
  }
  const checkoutUrl = validUrl(result.data.url, "checkout");

  return {
    uuid: result.data.uuid,
    url: checkoutUrl,
    providerReference: result.data.channel.refno,
    txnid,
    amountMinor,
  };
}

export async function getEgovPayTransaction(
  transactionUuid: string,
): Promise<EgovPayTransaction> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      transactionUuid,
    )
  ) {
    throw new EgovPayApiError("The eGovPay transaction ID is invalid.", 400);
  }
  const body = await request(
    `/api/v1/transaction/${encodeURIComponent(transactionUuid)}`,
  );
  const data = (body as { data?: Record<string, unknown> } | null)?.data;
  if (
    !data ||
    typeof data.uuid !== "string" ||
    typeof data.refno !== "string" ||
    typeof data.txnid !== "string" ||
    typeof data.amount !== "string" ||
    typeof data.currency !== "string" ||
    typeof data.payment_status !== "string"
  ) {
    throw new EgovPayApiError("eGovPay returned invalid transaction details.");
  }

  return {
    uuid: data.uuid,
    refno: data.refno,
    txnid: data.txnid,
    environmentType:
      typeof data.environment_type === "string"
        ? data.environment_type
        : "UNKNOWN",
    amount: data.amount,
    currency: data.currency,
    paymentStatus: data.payment_status,
    paymentChannel:
      typeof data.payment_channel === "string" ? data.payment_channel : null,
    url: typeof data.url === "string" ? data.url : null,
  };
}
