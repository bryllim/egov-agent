import "server-only";

const REQUEST_TIMEOUT_MS = 20_000;
const TOKEN_EXPIRY_SKEW_MS = 60_000;

type CachedToken = {
  value: string;
  expiresAt: number;
};

let cachedToken: CachedToken | null = null;

export type EreportDatasetItem = {
  id: string;
  code?: string;
  name: string;
  description?: string;
};

export type EreportComplaint = {
  mobile: string;
  first_name: string;
  last_name: string;
  gender: string;
  complainant_email: string;
  report_type: string;
  subject: string;
  message: string;
  evidences?: string[];
  region_code: string;
  province_code: string;
  municipality_code: string;
  barangay_code: string;
  latitude?: string;
  longitude?: string;
};

export type EreportSubmission = {
  code: number;
  message: string;
  caseNumber: string;
};

export class EreportApiError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "EreportApiError";
  }
}

function configuration() {
  const baseUrl = (
    process.env.EREPORT_BASE_URL?.trim() ||
    "https://platforms-api.e.gov.ph/ereport"
  ).replace(/\/$/, "");
  const accessCode =
    process.env.EREPORT_ACCESS_CODE?.trim() ||
    process.env.EREPORT_ACCESS_TOKEN?.trim();

  if (!baseUrl || !accessCode) {
    throw new EreportApiError("eReport is not configured.", 503);
  }

  try {
    new URL(baseUrl);
  } catch {
    throw new EreportApiError("The eReport gateway URL is invalid.", 503);
  }

  return { baseUrl, accessCode };
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new EreportApiError("eReport returned an invalid response.");
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
      throw new EreportApiError("eReport took too long to respond.", 504);
    }
    throw new EreportApiError("eReport is temporarily unavailable.", 503);
  } finally {
    clearTimeout(timeout);
  }
}

function responseError(status: number) {
  if (status === 401 || status === 403) {
    cachedToken = null;
    return new EreportApiError("The eReport credential was rejected.", 503);
  }
  if (status === 429) {
    return new EreportApiError(
      "eReport credits are unavailable. Please try again later.",
      429,
    );
  }
  if (status >= 400 && status < 500) {
    return new EreportApiError("eReport rejected the request.", 400);
  }
  return new EreportApiError("eReport is temporarily unavailable.");
}

async function integrationToken() {
  if (
    cachedToken &&
    Date.now() < cachedToken.expiresAt - TOKEN_EXPIRY_SKEW_MS
  ) {
    return cachedToken.value;
  }

  const { baseUrl, accessCode } = configuration();
  const response = await fetchWithTimeout(
    `${baseUrl}/api/integration/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_code: accessCode }),
    },
  );
  const body = await readJson(response);
  if (!response.ok) throw responseError(response.status);

  const tokenBody = body as {
    access_token?: unknown;
    expires_at?: unknown;
  } | null;
  if (typeof tokenBody?.access_token !== "string") {
    throw new EreportApiError("eReport returned an invalid access token.");
  }

  const parsedExpiry =
    typeof tokenBody.expires_at === "string"
      ? Date.parse(tokenBody.expires_at)
      : Number.NaN;
  cachedToken = {
    value: tokenBody.access_token,
    expiresAt: Number.isFinite(parsedExpiry)
      ? parsedExpiry
      : Date.now() + 5 * 60_000,
  };
  return cachedToken.value;
}

async function integrationRequest(
  path: string,
  init: RequestInit = {},
) {
  const { baseUrl } = configuration();
  const token = await integrationToken();
  const response = await fetchWithTimeout(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const body = await readJson(response);
  if (!response.ok) throw responseError(response.status);
  return body;
}

function dataset(body: unknown) {
  const records = (body as { data?: unknown } | null)?.data;
  if (!Array.isArray(records)) {
    throw new EreportApiError("eReport returned an invalid dataset.");
  }

  return records.map((record) => {
    const item = record as {
      id?: unknown;
      attributes?: {
        code?: unknown;
        name?: unknown;
        description?: unknown;
      };
    };
    if (
      typeof item.id !== "string" ||
      typeof item.attributes?.name !== "string"
    ) {
      throw new EreportApiError("eReport returned an invalid dataset item.");
    }
    return {
      id: item.id,
      code:
        typeof item.attributes.code === "string"
          ? item.attributes.code
          : undefined,
      name: item.attributes.name,
      description:
        typeof item.attributes.description === "string"
          ? item.attributes.description
          : undefined,
    } satisfies EreportDatasetItem;
  });
}

async function getDataset(path: string) {
  return dataset(await integrationRequest(path));
}

export function getEreportReportTypes() {
  return getDataset("/api/integration/datasets/report_types");
}

export function getEreportRegions() {
  return getDataset("/api/integration/datasets/regions");
}

export function getEreportProvinces(regionCode: string) {
  const query = new URLSearchParams({ region_code: regionCode });
  return getDataset(`/api/integration/datasets/provinces?${query}`);
}

export function getEreportMunicipalities(provinceCode: string) {
  const query = new URLSearchParams({ province_code: provinceCode });
  return getDataset(`/api/integration/datasets/municipalities?${query}`);
}

export function getEreportBarangays(municipalityCode: string) {
  const query = new URLSearchParams({ municipality_code: municipalityCode });
  return getDataset(`/api/integration/datasets/barangays?${query}`);
}

export async function submitEreportComplaint(
  complaint: EreportComplaint,
): Promise<EreportSubmission> {
  const body = await integrationRequest(
    "/api/integration/submit_complaint",
    {
      method: "POST",
      body: JSON.stringify(complaint),
    },
  );
  const result = body as {
    code?: unknown;
    message?: unknown;
    case_number?: unknown;
  } | null;
  if (typeof result?.case_number !== "string") {
    throw new EreportApiError("eReport did not return a case number.");
  }
  return {
    code: typeof result.code === "number" ? result.code : 200,
    message:
      typeof result.message === "string"
        ? result.message
        : "The report was received.",
    caseNumber: result.case_number,
  };
}

export function requestEreportOtp(email: string) {
  return integrationRequest("/api/integration/verify/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function confirmEreportOtp(email: string, otp: string) {
  return integrationRequest("/api/integration/verify/confirm", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
}

async function viewRequest(path: string) {
  const { baseUrl } = configuration();
  const viewToken = process.env.EREPORT_VIEW_TOKEN?.trim();
  if (!viewToken) {
    throw new EreportApiError("eReport viewing is not configured.", 503);
  }
  const response = await fetchWithTimeout(`${baseUrl}${path}`, {
    headers: { "X-EReport-View-Token": viewToken },
  });
  const body = await readJson(response);
  if (!response.ok) throw responseError(response.status);
  return body;
}

export function listEreports(options: {
  query?: string;
  page?: number;
  limit?: number;
} = {}) {
  const query = new URLSearchParams();
  if (options.query) query.set("q", options.query);
  if (options.page) query.set("page", String(options.page));
  if (options.limit) query.set("limit", String(options.limit));
  const suffix = query.size ? `?${query}` : "";
  return viewRequest(`/api/integration/reports${suffix}`);
}

export function getEreport(caseNumber: string) {
  return viewRequest(
    `/api/integration/reports/${encodeURIComponent(caseNumber)}`,
  );
}
