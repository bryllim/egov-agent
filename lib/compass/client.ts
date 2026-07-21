import "server-only";

const REQUEST_TIMEOUT_MS = 20_000;

export type CompassPage<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type SaaodbDashboard = {
  reportYear: number;
  sheetScope: "summary" | "agency" | "sucs";
  cascade: {
    appropriations: number;
    adjustments: number;
    totalAvailable: number;
    allotments: number;
    obligations: number;
    unobligated: number;
    disbursements: number;
    unreleased: number;
  };
  rates: {
    obligationRate: number;
    disbRateOblig: number;
    disbRateAppro: number;
  };
};

export type SaaodbRecord = {
  entityName?: string | null;
  reportYear?: number | null;
  period?: string | null;
  class?: string | null;
  appropriations?: string | number | null;
  allotments?: string | number | null;
  obligations?: string | number | null;
  disbursements?: string | number | null;
};

export type NcaRecord = {
  ncaNumber?: string | null;
  budgetYear?: number | null;
  deptName?: string | null;
  agencyName?: string | null;
  purpose?: string | null;
  releasedDate?: string | null;
  ncaTotal?: string | null;
};

export type SaroRecord = {
  saroNo?: string | null;
  deptName?: string | null;
  agencyName?: string | null;
  purpose?: string | null;
  releasedDate?: string | null;
  amount?: string | null;
  expenseClass?: string | null;
};

export type LgsfRecord = {
  programCode?: string | null;
  fiscalYear?: number | null;
  region?: string | null;
  province?: string | null;
  cityMunicipality?: string | null;
  projectName?: string | null;
  amountSaro?: string | number | null;
  amountNca?: string | number | null;
  amountTotal?: string | number | null;
};

export type LgsfDashboard = {
  programCode: string;
  reportYear?: number | null;
  kpis: {
    totalReleased: number;
    projectCount: number;
    lguCount: number;
    barangayCount: number;
    regionCount: number;
    provinceCount: number;
    fiscalYearCount: number;
  };
  projects: {
    rows: LgsfRecord[];
    total: number;
    page: number;
    pageSize: number;
  };
};

export class CompassApiError extends Error {
  constructor(
    message: string,
    readonly status = 502
  ) {
    super(message);
    this.name = "CompassApiError";
  }
}

function configuration() {
  const baseUrl = process.env.COMPASS_BASE_URL?.trim().replace(/\/$/, "");
  const apiKey = process.env.COMPASS_API_KEY?.trim();
  if (!baseUrl || !apiKey) {
    throw new CompassApiError("DBM Compass is not configured.", 503);
  }

  try {
    new URL(baseUrl);
  } catch {
    throw new CompassApiError("The DBM Compass gateway URL is invalid.", 503);
  }

  return { baseUrl, apiKey };
}

function positiveInteger(value: number, name: string, maximum?: number) {
  if (!Number.isInteger(value) || value < 1 || (maximum && value > maximum)) {
    throw new CompassApiError(`Invalid Compass ${name}.`, 400);
  }
  return String(value);
}

async function compassGet<T>(
  path: string,
  parameters: Record<string, string | undefined>
) {
  const { baseUrl, apiKey } = configuration();
  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(parameters)) {
    if (value) url.searchParams.set(key, value);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { "X-API-Key": apiKey },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new CompassApiError("The DBM Compass token was rejected.", 503);
      }
      if (response.status === 429) {
        throw new CompassApiError(
          "DBM Compass credits are unavailable. Please try again later.",
          429
        );
      }
      if (response.status >= 400 && response.status < 500) {
        throw new CompassApiError("DBM Compass rejected the query.", 400);
      }
      throw new CompassApiError("DBM Compass is temporarily unavailable.");
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof CompassApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new CompassApiError("DBM Compass took too long to respond.", 504);
    }
    throw new CompassApiError("DBM Compass is temporarily unavailable.", 503);
  } finally {
    clearTimeout(timeout);
  }
}

export function getSaaodbDashboard(
  reportYear: number,
  sheetScope: "summary" | "agency" | "sucs"
) {
  return compassGet<SaaodbDashboard>("/api/v1/records/saaodb/dashboard", {
    reportYear: positiveInteger(reportYear, "report year"),
    sheetScope,
  });
}

export function getSaaodbRecords(input: {
  reportYear: number;
  period: "Q1" | "Q2" | "Q3" | "Q4" | "FY";
  expenseClass?: "PS" | "MOOE" | "FINEX" | "CO";
  sheetScope?: "summary" | "agency" | "sucs";
  entityName?: string;
  page?: number;
  limit?: number;
}) {
  return compassGet<CompassPage<SaaodbRecord>>("/api/v1/records/saaodb", {
    reportYear: positiveInteger(input.reportYear, "report year"),
    period: input.period,
    class: input.expenseClass,
    sheetScope: input.sheetScope,
    entityName: input.entityName?.slice(0, 120),
    page: positiveInteger(input.page ?? 1, "page"),
    limit: positiveInteger(input.limit ?? 5, "limit", 1_000),
  });
}

export function getNcaRecords(input: {
  budgetYear: number;
  page?: number;
  limit?: number;
}) {
  return compassGet<CompassPage<NcaRecord>>("/api/v1/records/nca", {
    budgetYear: positiveInteger(input.budgetYear, "budget year"),
    page: positiveInteger(input.page ?? 1, "page"),
    limit: positiveInteger(input.limit ?? 5, "limit", 1_000),
  });
}

export function getSaroRecords(input: { page?: number; limit?: number }) {
  return compassGet<CompassPage<SaroRecord>>("/api/v1/records/saro", {
    page: positiveInteger(input.page ?? 1, "page"),
    limit: positiveInteger(input.limit ?? 5, "limit", 1_000),
  });
}

export function getLgsfRecords(input: {
  fiscalYear?: number;
  programCode?: "FALGU" | "GEF" | "GGG" | "SBDP" | "SAFPB";
  page?: number;
  limit?: number;
}) {
  return compassGet<CompassPage<LgsfRecord>>("/api/v1/records/lgsf", {
    fiscalYear: input.fiscalYear
      ? positiveInteger(input.fiscalYear, "fiscal year")
      : undefined,
    programCode: input.programCode,
    page: positiveInteger(input.page ?? 1, "page"),
    limit: positiveInteger(input.limit ?? 5, "limit", 1_000),
  });
}

export function getLgsfDashboard(input: {
  programCode: "FALGU" | "GEF" | "GGG" | "SBDP" | "SAFPB";
  reportYear?: number;
  page?: number;
  limit?: number;
}) {
  return compassGet<LgsfDashboard>("/api/v1/records/lgsf/dashboard", {
    programCode: input.programCode,
    reportYear: input.reportYear
      ? positiveInteger(input.reportYear, "report year")
      : undefined,
    page: positiveInteger(input.page ?? 1, "page"),
    limit: positiveInteger(input.limit ?? 5, "limit", 200),
  });
}
