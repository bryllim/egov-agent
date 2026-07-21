import "server-only";

import { randomUUID } from "node:crypto";

import {
  hasCompleteETravelDetails,
  type AgentApiRequest,
  type ETravelDetails,
  type GovernmentRoute,
} from "@/app/agent/ai-contract";
import {
  agentPlan,
  buildETravelPlan,
  step,
  type Card,
  type Plan,
  type User,
} from "@/app/agent/brain";
import { PRINT_FILE_PREVIEWS } from "@/app/agent/forms";
import { PERSONAL_CONTEXT } from "@/app/agent/personal-context";
import { AiRouterError, routeGovernmentRequest } from "@/lib/ai/egov-router";
import {
  CompassApiError,
  getLgsfDashboard,
  getLgsfRecords,
  getNcaRecords,
  getSaaodbDashboard,
  getSaaodbRecords,
  getSaroRecords,
} from "@/lib/compass/client";
import {
  EreportApiError,
  getEreportBarangays,
  getEreportMunicipalities,
  getEreportProvinces,
  getEreportRegions,
  getEreportReportTypes,
  submitEreportComplaint,
  type EreportDatasetItem,
} from "@/lib/ereport/client";
import {
  createEgovPayTransaction,
  EgovPayApiError,
  getEgovPayTransaction,
  type EgovPayLineItem,
} from "@/lib/egovpay/client";
import {
  EMessageApiError,
  pushEMessageSms,
} from "@/lib/emessage/client";

const MAX_MESSAGE_LENGTH = 4_000;
const MAX_HISTORY_ITEMS = 10;
const EMESSAGE_SEND_ACTION = "Send this eMessage SMS";
const LEGACY_EMESSAGE_SEND_ACTION = "Send this eMessage test SMS";
const EMESSAGE_TEST_BODY =
  "eGov Agent test: Your eGovPH SMS notification channel is connected for the hackathon sandbox.";
const EMESSAGE_DRAFT_TTL_MS = 10 * 60 * 1_000;

type EMessageDraft = {
  number: string;
  message: string;
  createdAt: number;
  used: boolean;
};

const eMessageDrafts = new Map<string, EMessageDraft>();

const SERVICE_PROMPTS: Partial<Record<GovernmentRoute, string>> = {
  dfa_passport: "Renew my passport",
  dfa_nearest: "Find the nearest DFA passport office",
  dfa_confirm: "Confirm the passport appointment slot",
  nbi_clearance: "Get an NBI clearance",
  nbi_pay: "Open eGovPay checkout for my NBI clearance",
  nbi_confirm_pay: "Confirm eGovPay payment for my NBI clearance",
  sss_contributions: "Check my SSS contributions",
  philhealth_contributions: "Check my PhilHealth premium contributions",
  philhealth_record: "Show my PhilHealth member record",
  philhealth_email_mdr: "Email my certified PhilHealth MDR",
  lto_license: "Renew my driver's license",
  lto_violations: "Check my LTO violations",
  lto_violation_pay: "Proceed to payment for my LTO OGA violation",
  lto_violation_confirm_pay:
    "Confirm eGovPay payment for my LTO OGA violation",
  bir_tax: "Check my BIR tax record",
  postal_id: "Apply for a Postal ID",
  postal_book: "Book the Postal ID capture slot",
  psa_certificate: "Request my PSA birth certificate",
  psa_certificate_submit: "Confirm my PSA request",
  employment_starter: "Prepare my employment starter pack",
  business_one_stop: "Help me start a sole proprietorship in Mandaluyong",
  ereport: "File a flooding eReport",
  ereport_submit: "Submit this flooding eReport",
  emessage_preview: "Prepare an eMessage test SMS",
  emessage_send: EMESSAGE_SEND_ACTION,
  cde_exam: "Start the LTO CDE exam",
  greeting: "Hello",
};

function documentHref(printKind: string, travelDetails: ETravelDetails) {
  if (
    printKind !== "etravel-qr" ||
    !hasCompleteETravelDetails(travelDetails)
  ) {
    return `/agent/documents/${printKind}`;
  }

  const search = new URLSearchParams({
    direction: travelDetails.direction,
    origin: travelDetails.origin,
    destination: travelDetails.destination,
    date: travelDetails.travelDate,
    time: travelDetails.travelTime,
    flight: travelDetails.flightNumber,
  });
  return `/agent/documents/${printKind}?${search.toString()}`;
}

function isChatRole(value: unknown): value is "user" | "assistant" {
  return value === "user" || value === "assistant";
}

function parseRequest(value: unknown): AgentApiRequest {
  if (!value || typeof value !== "object") {
    throw new AiRouterError("A JSON request body is required.", 400);
  }

  const body = value as Partial<AgentApiRequest>;
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    throw new AiRouterError("Message is required.", 400);
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new AiRouterError(
      `Message must be ${MAX_MESSAGE_LENGTH.toLocaleString()} characters or less.`,
      400
    );
  }

  const firstName =
    typeof body.user?.firstName === "string"
      ? body.user.firstName.trim().slice(0, 80)
      : "User";
  const name =
    typeof body.user?.name === "string"
      ? body.user.name.trim().slice(0, 160)
      : firstName;
  const history = Array.isArray(body.history)
    ? body.history
        .filter(
          (item) =>
            item &&
            typeof item === "object" &&
            isChatRole(item.role) &&
            typeof item.text === "string"
        )
        .slice(-MAX_HISTORY_ITEMS)
        .map((item) => ({
          role: item.role,
          text: item.text.trim().slice(0, 1_500),
        }))
    : [];

  const optionalProfileValue = (value: unknown, maximum: number) =>
    typeof value === "string" && value.trim()
      ? value.trim().slice(0, maximum)
      : undefined;

  return {
    message,
    history,
    user: {
      name,
      firstName,
      mobile: optionalProfileValue(body.user?.mobile, 80),
      email: optionalProfileValue(body.user?.email, 254),
      sex: optionalProfileValue(body.user?.sex, 40),
      address: optionalProfileValue(body.user?.address, 600),
    },
  };
}

function groundResponseInServiceResult(
  aiResponse: string,
  card: Card | undefined,
  user: User
) {
  if (card?.kind === "employmentPack") {
    return `Your **Employment Starter Pack** is ready, ${user.firstName}. **${card.ready} of ${card.total}** government checks are complete. Your PhilHealth, SSS, and Pag-IBIG memberships are active.

Your PSA birth certificate and Barangay Clearance remain private in your Vault until you approve sharing them. The only pending action is reviewing your **NBI clearance renewal**.`;
  }

  if (
    card?.kind === "contributions" &&
    card.title.startsWith("PhilHealth")
  ) {
    const latestMonth = card.rows[0]?.month ?? "the latest recorded month";
    return `Here is your latest **PhilHealth premium contribution history**, ${user.firstName}. The three displayed monthly premiums are posted through **${latestMonth}**, with no missed posting in this period.`;
  }

  if (card?.kind === "record" && card.title.startsWith("PhilHealth")) {
    return `Your PhilHealth membership is **active**, ${user.firstName}. Your Member Data Record below shows your member type and registered dependents. Premium contribution history is available through a separate request.`;
  }

  if (card?.kind !== "ltoViolation") return aiResponse;

  return `I checked your connected LTO record, ${user.firstName}. It is **not clear**: you have **one pending OGA alarm** for **${card.violation}**. The alarm blocks LTO transactions until it is lifted.

A violation check alone cannot confirm that you may legally drive today. Your driver's license must also be valid, active, appropriate for the vehicle, and not suspended. Review the official case details below before driving.`;
}

function groundActionsInServiceResult(
  aiActions: string[],
  card: Card | undefined
) {
  if (
    card?.kind !== "ltoViolation" &&
    card?.kind !== "employmentPack" &&
    card?.kind !== "ereportDraft" &&
    card?.kind !== "ereportConfirmation"
  ) {
    return aiActions;
  }
  return card.intent ? [card.intent] : [];
}

function compassYear(message: string) {
  const match = message.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function compassLimit(message: string) {
  const match = message.match(/\b(?:top|first|latest|show|list)\s+(\d{1,3})\b/i);
  return match ? Math.min(10, Math.max(1, Number(match[1]))) : 5;
}

function compassProgram(message: string) {
  return message.match(/\b(FALGU|GEF|GGG|SBDP|SAFPB)\b/i)?.[1].toUpperCase() as
    | "FALGU"
    | "GEF"
    | "GGG"
    | "SBDP"
    | "SAFPB"
    | undefined;
}

function peso(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "Unavailable";
  }
  if (typeof value === "string") {
    const match = value.trim().match(/^(-?)(\d+)(?:\.(\d+))?$/);
    if (!match) return `₱${value}`;
    const [, sign, integer, fraction] = match;
    const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `₱${sign}${grouped}${fraction ? `.${fraction}` : ""}`;
  }
  if (!Number.isFinite(value)) return "Unavailable";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function percentage(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function chartValue(value: string | number | null | undefined) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function compassRetrievedAt() {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
}

function compassSteps(query: string, result: string) {
  return [
    step(
      "search",
      "Validating the budget query",
      "Department of Budget and Management",
      query,
      650
    ),
    step(
      "records",
      "Reading the official public dataset",
      "DBM Compass API",
      result,
      900
    ),
  ];
}

function compassClarification(text: string): Plan {
  return {
    steps: [],
    text,
  };
}

async function buildCompassPlan(message: string): Promise<Plan> {
  const query = message.toUpperCase();
  const year = compassYear(message);
  const limit = compassLimit(message);
  const retrievedAt = compassRetrievedAt();

  try {
    if (query.includes("SAAODB")) {
      if (!year) {
        return compassClarification(
          "Which **report year** should I use for the SAAODB query? You can also specify **FY, Q1, Q2, Q3, or Q4** for record searches."
        );
      }

      const isDashboard = /\b(DASHBOARD|SUMMARY|RATE|TOTAL|BREAKDOWN)\b/.test(query);
      const scope = /\bSUCS?\b|STATE UNIVERSIT/.test(query)
        ? "sucs"
        : /\bAGENC(?:Y|IES)\b/.test(query)
          ? "agency"
          : "summary";

      if (isDashboard) {
        const result = await getSaaodbDashboard(year, scope);
        return {
          steps: compassSteps(
            `${year} · ${scope} scope`,
            "SAAODB dashboard returned by DBM Compass"
          ),
          text: `DBM Compass returned the **${result.reportYear} SAAODB ${result.sheetScope} dashboard**. This is a year-and-scope summary, not a quarter-specific result. **Source:** DBM Compass · retrieved ${retrievedAt}.`,
          card: {
            kind: "budget",
            title: `DBM SAAODB — ${result.reportYear}`,
            subtitle: `${result.sheetScope} scope · year-and-scope dashboard`,
            metrics: [
              { label: "Total available", value: peso(result.cascade.totalAvailable) },
              { label: "Obligation rate", value: percentage(result.rates.obligationRate) },
              { label: "Disbursement rate", value: percentage(result.rates.disbRateOblig) },
              { label: "Unreleased", value: peso(result.cascade.unreleased) },
            ],
            series: [
              {
                label: "Appropriations",
                value: chartValue(result.cascade.appropriations),
                valueLabel: peso(result.cascade.appropriations),
                detail: "Total appropriations reported for the selected scope.",
              },
              {
                label: "Allotments",
                value: chartValue(result.cascade.allotments),
                valueLabel: peso(result.cascade.allotments),
                detail: "Released allotments reported by DBM Compass.",
              },
              {
                label: "Obligations",
                value: chartValue(result.cascade.obligations),
                valueLabel: peso(result.cascade.obligations),
                detail: "Obligations incurred for the selected year and scope.",
              },
              {
                label: "Disbursements",
                value: chartValue(result.cascade.disbursements),
                valueLabel: peso(result.cascade.disbursements),
                detail: "Actual disbursements returned by the dashboard.",
              },
            ],
            source: "DBM Compass · SAAODB",
            retrievedAt,
          },
        };
      }

      const period = query.match(/\b(Q1|Q2|Q3|Q4|FY)\b/)?.[1] as
        | "Q1"
        | "Q2"
        | "Q3"
        | "Q4"
        | "FY"
        | undefined;
      if (!period) {
        return compassClarification(
          "Which SAAODB period should I use: **FY, Q1, Q2, Q3, or Q4**?"
        );
      }
      const expenseClass = query.match(/\b(PS|MOOE|FINEX|CO)\b/)?.[1] as
        | "PS"
        | "MOOE"
        | "FINEX"
        | "CO"
        | undefined;
      const result = await getSaaodbRecords({
        reportYear: year,
        period,
        expenseClass,
        sheetScope: scope,
        limit,
      });
      return {
        steps: compassSteps(
          `${year} ${period}${expenseClass ? ` · ${expenseClass}` : ""}`,
          `${result.total.toLocaleString()} matching SAAODB records`
        ),
        text: `DBM Compass found **${result.total.toLocaleString()} SAAODB records** for **${year} ${period}**. Showing ${Math.min(result.items.length, limit)} from page ${result.page}. **Source:** DBM Compass · retrieved ${retrievedAt}.`,
        card: {
          kind: "budget",
          title: `SAAODB Records — ${year} ${period}`,
          subtitle: `${expenseClass || "All classes"} · ${scope} scope · page ${result.page}`,
          metrics: [
            { label: "Matching records", value: result.total.toLocaleString() },
            { label: "Displayed", value: String(result.items.length) },
            { label: "Period", value: period },
            { label: "Class", value: expenseClass || "All" },
          ],
          series: result.items.slice(0, limit).map((record) => ({
            label: record.entityName || "Summary record",
            value: chartValue(record.obligations),
            valueLabel: peso(record.obligations),
            detail: `${record.class || "All classes"} · disbursements ${peso(record.disbursements)}`,
          })),
          source: "DBM Compass · SAAODB records",
          retrievedAt,
        },
      };
    }

    if (/\bNCA\b|NOTICE OF CASH ALLOCATION/.test(query)) {
      if (!year) {
        return compassClarification(
          "Which **budget year** should I use for the NCA records?"
        );
      }
      const result = await getNcaRecords({ budgetYear: year, limit });
      return {
        steps: compassSteps(
          `${year} NCA records`,
          `${result.total.toLocaleString()} matching records`
        ),
        text: `DBM Compass found **${result.total.toLocaleString()} NCA records** for budget year **${year}**. Showing ${Math.min(result.items.length, limit)} from page ${result.page}. **Source:** DBM Compass · retrieved ${retrievedAt}.`,
        card: {
          kind: "budget",
          title: `NCA Records — ${year}`,
          subtitle: `Notice of Cash Allocation · page ${result.page}`,
          metrics: [
            { label: "Matching records", value: result.total.toLocaleString() },
            { label: "Displayed", value: String(result.items.length) },
            { label: "Budget year", value: String(year) },
            { label: "Dataset", value: "NCA" },
          ],
          series: result.items.slice(0, limit).map((record) => ({
            label: record.ncaNumber || "NCA record",
            value: chartValue(record.ncaTotal),
            valueLabel: peso(record.ncaTotal),
            detail: `${record.agencyName || record.deptName || "Agency unavailable"}${record.releasedDate ? ` · released ${record.releasedDate.slice(0, 10)}` : ""}`,
          })),
          source: "DBM Compass · NCA records",
          retrievedAt,
        },
      };
    }

    if (/\bSARO\b|SPECIAL ALLOTMENT RELEASE ORDER/.test(query)) {
      const result = await getSaroRecords({ limit });
      return {
        steps: compassSteps(
          "Latest SARO records",
          `${result.total.toLocaleString()} available records`
        ),
        text: `DBM Compass returned **${result.total.toLocaleString()} SARO records**. Showing ${Math.min(result.items.length, limit)} from page ${result.page}. **Source:** DBM Compass · retrieved ${retrievedAt}.`,
        card: {
          kind: "budget",
          title: "Latest SARO Records",
          subtitle: `Special Allotment Release Orders · page ${result.page}`,
          metrics: [
            { label: "Available records", value: result.total.toLocaleString() },
            { label: "Displayed", value: String(result.items.length) },
            { label: "Page", value: String(result.page) },
            { label: "Dataset", value: "SARO" },
          ],
          series: result.items.slice(0, limit).map((record) => ({
            label: record.saroNo || "SARO record",
            value: chartValue(record.amount),
            valueLabel: peso(record.amount),
            detail: `${record.agencyName || record.deptName || "Agency unavailable"}${record.releasedDate ? ` · released ${record.releasedDate}` : ""}`,
          })),
          source: "DBM Compass · SARO records",
          retrievedAt,
        },
      };
    }

    if (/\bLGSF\b|LOCAL GOVERNMENT SUPPORT FUND/.test(query)) {
      const programCode = compassProgram(message);
      const isDashboard = /\b(DASHBOARD|SUMMARY|KPI|TOTAL|RELEASED)\b/.test(query);
      if (isDashboard && !programCode) {
        return compassClarification(
          "Which LGSF program should I use: **FALGU, GEF, GGG, SBDP, or SAFPB**?"
        );
      }

      if (isDashboard && programCode) {
        const result = await getLgsfDashboard({
          programCode,
          reportYear: year ?? undefined,
          limit,
        });
        return {
          steps: compassSteps(
            `${programCode}${year ? ` · ${year}` : ""}`,
            "LGSF dashboard returned by DBM Compass"
          ),
          text: `DBM Compass returned the **${programCode} LGSF dashboard${year ? ` for ${year}` : ""}**. **Source:** DBM Compass · retrieved ${retrievedAt}.`,
          card: {
            kind: "budget",
            title: `LGSF ${programCode} Dashboard`,
            subtitle: `${year || "All available years"} · Local Government Support Fund`,
            metrics: [
              { label: "Total released", value: peso(result.kpis.totalReleased) },
              { label: "Projects", value: result.kpis.projectCount.toLocaleString() },
              { label: "LGUs", value: result.kpis.lguCount.toLocaleString() },
              { label: "Regions", value: result.kpis.regionCount.toLocaleString() },
            ],
            series: result.projects.rows.slice(0, limit).map((record) => ({
              label:
                record.cityMunicipality ||
                record.province ||
                record.region ||
                record.projectName ||
                "LGSF project",
              value: chartValue(record.amountTotal),
              valueLabel: peso(record.amountTotal),
              detail: record.projectName || `${programCode} funded project`,
            })),
            source: `DBM Compass · LGSF ${programCode}`,
            retrievedAt,
          },
        };
      }

      const result = await getLgsfRecords({
        fiscalYear: year ?? undefined,
        programCode,
        limit,
      });
      return {
        steps: compassSteps(
          `LGSF records${programCode ? ` · ${programCode}` : ""}`,
          `${result.total.toLocaleString()} matching records`
        ),
        text: `DBM Compass found **${result.total.toLocaleString()} LGSF records**. Showing ${Math.min(result.items.length, limit)} from page ${result.page}. **Source:** DBM Compass · retrieved ${retrievedAt}.`,
        card: {
          kind: "budget",
          title: "LGSF Records",
          subtitle: `${programCode || "All programs"}${year ? ` · ${year}` : ""} · page ${result.page}`,
          metrics: [
            { label: "Matching records", value: result.total.toLocaleString() },
            { label: "Displayed", value: String(result.items.length) },
            { label: "Program", value: programCode || "All" },
            { label: "Fiscal year", value: year ? String(year) : "All" },
          ],
          series: result.items.slice(0, limit).map((record) => ({
            label:
              record.cityMunicipality ||
              record.province ||
              record.region ||
              record.programCode ||
              "LGSF project",
            value: chartValue(record.amountTotal),
            valueLabel: peso(record.amountTotal),
            detail: record.projectName || "Project name unavailable",
          })),
          source: "DBM Compass · LGSF records",
          retrievedAt,
        },
      };
    }

    return compassClarification(
      "Which DBM Compass dataset should I check: **SAAODB, NCA, SARO, or LGSF**?"
    );
  } catch (error) {
    if (error instanceof CompassApiError) {
      throw new AiRouterError(error.message, error.status);
    }
    throw error;
  }
}

type PreparedFloodReport = {
  reportType: EreportDatasetItem & { code: string };
  region: EreportDatasetItem;
  province: EreportDatasetItem;
  municipality: EreportDatasetItem;
  barangay: EreportDatasetItem;
};

let preparedFloodReport: Promise<PreparedFloodReport> | null = null;

function normalizedDatasetText(value: string) {
  return value.normalize("NFKD").replace(/[^A-Z0-9]+/gi, " ").trim().toUpperCase();
}

function includesDatasetName(item: EreportDatasetItem, expected: string) {
  return normalizedDatasetText(item.name).includes(
    normalizedDatasetText(expected),
  );
}

async function resolveFloodReport(): Promise<PreparedFloodReport> {
  const [reportTypes, regions] = await Promise.all([
    getEreportReportTypes(),
    getEreportRegions(),
  ]);
  const configuredReportType =
    process.env.EREPORT_FLOOD_REPORT_TYPE?.trim().toLowerCase();
  const reportType = configuredReportType
    ? reportTypes.find(
        (item) => item.code?.toLowerCase() === configuredReportType,
      )
    : reportTypes.find(
        (item) =>
          item.code?.toLowerCase() === "fire" &&
          includesDatasetName(item, "OTHER EMERGENCIES"),
      );

  if (!reportType?.code) {
    throw new EreportApiError(
      "No flooding report type is configured for eReport.",
      503,
    );
  }

  const region = regions.find(
    (item) =>
      includesDatasetName(item, "NATIONAL CAPITAL REGION") ||
      normalizedDatasetText(item.name) === "NCR",
  );
  if (!region) {
    throw new EreportApiError(
      "eReport could not resolve the incident region.",
      502,
    );
  }

  const provinces = await getEreportProvinces(region.id);
  const municipalityGroups = await Promise.all(
    provinces.map(async (province) => ({
      province,
      municipalities: await getEreportMunicipalities(province.id),
    })),
  );
  const municipalityGroup = municipalityGroups.find(({ municipalities }) =>
    municipalities.some((item) => includesDatasetName(item, "MANDALUYONG")),
  );
  const municipality = municipalityGroup?.municipalities.find((item) =>
    includesDatasetName(item, "MANDALUYONG"),
  );
  if (!municipalityGroup || !municipality) {
    throw new EreportApiError(
      "eReport could not resolve Mandaluyong City.",
      502,
    );
  }

  const barangays = await getEreportBarangays(municipality.id);
  const barangay = barangays.find((item) =>
    includesDatasetName(item, "HIGHWAY HILLS"),
  );
  if (!barangay) {
    throw new EreportApiError(
      "eReport could not resolve Barangay Highway Hills.",
      502,
    );
  }

  return {
    reportType: { ...reportType, code: reportType.code },
    region,
    province: municipalityGroup.province,
    municipality,
    barangay,
  };
}

async function preparedFloodReportData() {
  if (!preparedFloodReport) {
    preparedFloodReport = resolveFloodReport().catch((error) => {
      preparedFloodReport = null;
      throw error;
    });
  }
  return preparedFloodReport;
}

function mobileForEreport(value: string | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (digits.startsWith("09") && digits.length === 11) {
    return `63${digits.slice(1)}`;
  }
  if (digits.startsWith("639") && digits.length === 12) return digits;
  return null;
}

function lastNameForEreport(user: User) {
  const firstNameParts = user.firstName.trim().split(/\s+/).length;
  const remaining = user.name.trim().split(/\s+/).slice(firstNameParts);
  if (/^(?:JR\.?|SR\.?|II|III|IV|V)$/i.test(remaining.at(-1) ?? "")) {
    remaining.pop();
  }
  const connector = remaining.at(-2)?.toLowerCase();
  return ["de", "del", "dela", "da", "van", "von"].includes(
    connector ?? "",
  )
    ? remaining.slice(-2).join(" ")
    : remaining.at(-1) ?? "";
}

function profileForEreport(user: User) {
  const mobile = mobileForEreport(user.mobile);
  const email = user.email?.trim();
  const lastName = lastNameForEreport(user);
  const gender = /female/i.test(user.sex ?? "")
    ? "Female"
    : /male/i.test(user.sex ?? "")
      ? "Male"
      : null;
  const missing = [
    !mobile && "mobile number",
    (!email || !email.includes("@")) && "email address",
    !gender && "sex",
    !lastName && "last name",
  ].filter(Boolean) as string[];

  return missing.length
    ? { missing, profile: null }
    : {
        missing: [],
        profile: {
          mobile: mobile!,
          email: email!,
          gender: gender!,
          lastName,
        },
      };
}

function reviewedEreport(history: AgentApiRequest["history"]) {
  return history.some(
    (item) =>
      item.role === "assistant" &&
      item.text.includes("eReport draft is ready for review"),
  );
}

function ereportTimestamp() {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
}

async function buildEreportPlan(
  message: string,
  route: "ereport" | "ereport_submit",
  history: AgentApiRequest["history"],
  user: User,
): Promise<Plan> {
  const identity = profileForEreport(user);
  if (!identity.profile) {
    return {
      steps: [],
      text: `Your eGovPH profile needs a verified **${identity.missing.join(
        ", ",
      )}** before eReport can prepare the complaint. Update those details in eGovPH, then sign in again.`,
    };
  }

  try {
    const prepared = await preparedFloodReportData();
    const shouldSubmit =
      route === "ereport_submit" && reviewedEreport(history);

    if (!shouldSubmit) {
      const hasPhoto = message.includes("Attachments:");
      return {
        steps: [
          step(
            "search",
            "Loading the official report categories",
            "eGovPH eReport API",
            `${prepared.reportType.name} · ${prepared.reportType.code}`,
            620,
          ),
          step(
            "records",
            "Validating the incident location",
            "eReport PSGC datasets",
            `${prepared.barangay.name} · ${prepared.municipality.name}`,
            760,
          ),
          step(
            "shield",
            "Preparing the reviewed submission",
            "eGovPH eReport",
            "No report sent yet · explicit confirmation required",
            560,
          ),
        ],
        text: `Your **eReport draft is ready for review**. The live eReport catalog validated the **${prepared.reportType.name}** category and the official location codes for **${prepared.barangay.name}, ${prepared.municipality.name}**. Nothing has been submitted yet. Review the incident, location, and evidence note below, then select **Submit** once.`,
        card: {
          kind: "ereportDraft",
          title: "eReport review",
          reportType: prepared.reportType.name,
          severity: "URGENT",
          location: "Pioneer St. near Reliance St., Mandaluyong",
          coordinates: "14.5778, 121.0537",
          summary:
            "Severe street flooding may make the roadway unsafe for pedestrians and light vehicles. Local verification and traffic coordination are recommended.",
          evidence: hasPhoto
            ? "Photo reviewed locally · no hosted evidence URL will be submitted"
            : "No evidence URL included · photo optional",
          routingLabel: "Verified eReport submission path",
          responders: [
            {
              agency: "eGovPH eReport",
              role: "Official citizen-report intake",
            },
            {
              agency: `${prepared.barangay.name}, ${prepared.municipality.name}`,
              role: "Location validated against eReport datasets",
            },
          ],
          action: "Submit to eGovPH eReport",
          intent: "Submit this flooding eReport",
        },
      };
    }

    const submission = await submitEreportComplaint({
      mobile: identity.profile.mobile,
      first_name: user.firstName,
      last_name: identity.profile.lastName,
      gender: identity.profile.gender,
      complainant_email: identity.profile.email,
      report_type: prepared.reportType.code,
      subject: "Severe street flooding on Pioneer Street",
      message:
        "Severe street flooding near Pioneer Street and Reliance Street may be unsafe for pedestrians and light vehicles. Please verify the incident and coordinate the appropriate response.",
      evidences: [],
      region_code: prepared.region.id,
      province_code: prepared.province.id,
      municipality_code: prepared.municipality.id,
      barangay_code: prepared.barangay.id,
      latitude: "14.5778",
      longitude: "121.0537",
    });

    return {
      steps: [
        step(
          "shield",
          "Submitting the reviewed complaint",
          "eGovPH eReport API",
          "Verified eGovPH contact details used",
          700,
        ),
        step(
          "records",
          "Recording the official case number",
          "eGovPH eReport",
          submission.caseNumber,
          780,
        ),
      ],
      text: `Your eReport was received by the **eGovPH eReport API**. Your official case number is **${submission.caseNumber}**. Keep it for status tracking. The API response confirms receipt; it does not yet confirm agency acceptance or a field-response time.`,
      card: {
        kind: "ereportConfirmation",
        title: "eReport received",
        reportNumber: submission.caseNumber,
        submittedAt: ereportTimestamp(),
        incident: "Severe street flooding · urgent public safety",
        location: "Pioneer St. near Reliance St., Mandaluyong",
        statusLabel: "Official submission status",
        responders: [
          {
            agency: "eGovPH eReport",
            role: submission.message,
            status: "Received",
          },
          {
            agency: "Case tracking",
            role: `Track using ${submission.caseNumber}`,
            status: "Ready",
          },
        ],
        eta: "Track updates using the issued case number",
        action: "Copy case number",
      },
    };
  } catch (error) {
    if (error instanceof EreportApiError) {
      throw new AiRouterError(error.message, error.status);
    }
    throw error;
  }
}

type EgovPayRoute =
  | "nbi_pay"
  | "nbi_confirm_pay"
  | "lto_violation_pay"
  | "lto_violation_confirm_pay";

type EgovPayDemoSpec = {
  prefix: string;
  agency: string;
  service: string;
  shortName: string;
  items: EgovPayLineItem[];
  checkPrompt: string;
};

function egovPaySpec(route: EgovPayRoute): EgovPayDemoSpec {
  if (route === "nbi_pay" || route === "nbi_confirm_pay") {
    return {
      prefix: "NBI",
      agency: "National Bureau of Investigation",
      service: "NBI Clearance — Online",
      shortName: "NBI clearance",
      items: [
        { name: "NBI clearance fee", amountMinor: 15_500 },
        { name: "e-payment fee", amountMinor: 2_500 },
      ],
      checkPrompt: "Check my NBI eGovPay transaction status",
    };
  }
  return {
    prefix: "LTOOGA",
    agency: "Land Transportation Office",
    service: "OGA violation settlement",
    shortName: "LTO OGA settlement",
    items: [{ name: "Assessed OGA fine", amountMinor: 100_000 }],
    checkPrompt: "Check my LTO eGovPay transaction status",
  };
}

function paymentAmount(amountMinor: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);
}

function egovPayTransactionFromHistory(
  history: AgentApiRequest["history"],
) {
  for (const item of [...history].reverse()) {
    if (item.role !== "assistant") continue;
    const match = item.text.match(
      /eGovPay transaction UUID is \*\*([0-9a-f-]{36})\*\*/i,
    );
    if (match) return match[1];
  }
  return null;
}

function settledPaymentStatus(status: string) {
  return /^(?:PAID|SUCCESS|SETTLED|COMPLETED)$/i.test(status);
}

async function buildEgovPayPlan(
  route: EgovPayRoute,
  history: AgentApiRequest["history"],
): Promise<Plan> {
  const spec = egovPaySpec(route);
  const checkingStatus =
    route === "nbi_confirm_pay" ||
    route === "lto_violation_confirm_pay";

  try {
    if (!checkingStatus) {
      const transaction = await createEgovPayTransaction({
        prefix: spec.prefix,
        items: spec.items,
        description: {
          agency: spec.agency,
          service: spec.service,
          environment: "hackathon-test",
        },
      });
      const total = paymentAmount(transaction.amountMinor);
      return {
        steps: [
          step(
            "payment",
            "Creating a hosted test checkout",
            "eGovPay API",
            `${total} · test mode`,
            720,
          ),
          step(
            "shield",
            "Binding the amount and reference",
            "HMAC-SHA256 digest",
            "Digest generated on the server",
            560,
          ),
        ],
        text: `Your **eGovPay test checkout is ready** for the ${spec.shortName}. Creating the hosted link did not move funds. The eGovPay transaction UUID is **${transaction.uuid}**. Review the exact ${total} total below, open the hosted test checkout, then return here and check the provider status.`,
        card: {
          kind: "payment",
          title: "eGovPay Hosted Checkout",
          agency: spec.agency,
          service: spec.service,
          reference: transaction.txnid,
          providerReference: transaction.providerReference,
          transactionUuid: transaction.uuid,
          lineItems: spec.items.map((item) => ({
            label: item.name,
            amount: paymentAmount(item.amountMinor),
          })),
          total,
          method: "Hosted eGovPay test checkout",
          environment: "TEST",
          checkoutUrl: transaction.url,
          action: "Open eGovPay test checkout",
        },
      };
    }

    const transactionUuid = egovPayTransactionFromHistory(history);
    if (!transactionUuid) {
      return {
        steps: [],
        text: `I do not have a reviewed ${spec.shortName} checkout in this conversation yet. Open the eGovPay checkout first; after returning from the hosted page, I can read its official status.`,
      };
    }

    const transaction = await getEgovPayTransaction(transactionUuid);
    if (!transaction.txnid.startsWith(spec.prefix)) {
      throw new EgovPayApiError(
        "The eGovPay transaction does not match this service.",
        400,
      );
    }
    const isSettled = settledPaymentStatus(transaction.paymentStatus);
    const amountNumber = Number(transaction.amount);
    const amount = Number.isFinite(amountNumber)
      ? new Intl.NumberFormat("en-PH", {
          style: "currency",
          currency: transaction.currency || "PHP",
          minimumFractionDigits: 2,
        }).format(amountNumber)
      : transaction.amount;

    return {
      steps: [
        step(
          "records",
          "Reading the authoritative transaction status",
          "eGovPay API",
          transaction.paymentStatus,
          720,
        ),
      ],
      text: `eGovPay currently reports **${transaction.paymentStatus}** for the ${spec.shortName} transaction. ${
        isSettled
          ? "The provider reports a completed payment state. Agency posting remains a separate downstream step."
          : "The payment is not confirmed as settled. A redirect or closed checkout page is not proof of payment."
      }`,
      card: {
        kind: "record",
        title: `eGovPay ${spec.shortName} status`,
        fields: [
          { label: "Provider status", value: transaction.paymentStatus },
          { label: "Amount", value: amount },
          { label: "Environment", value: transaction.environmentType },
          { label: "eGovPay reference", value: transaction.refno },
          { label: "Transaction UUID", value: transaction.uuid },
          {
            label: "Payment channel",
            value: transaction.paymentChannel || "Not selected",
          },
        ],
        action: isSettled ? "View transaction details" : "Refresh status",
        ...(isSettled ? {} : { intent: spec.checkPrompt }),
      },
    };
  } catch (error) {
    if (error instanceof EgovPayApiError) {
      throw new AiRouterError(error.message, error.status);
    }
    throw error;
  }
}

type EMessageRoute = "emessage_preview" | "emessage_send";

function explicitEMessageRoute(message: string): EMessageRoute | null {
  const normalized = message.trim().toLowerCase();
  if (
    normalized === EMESSAGE_SEND_ACTION.toLowerCase() ||
    normalized === LEGACY_EMESSAGE_SEND_ACTION.toLowerCase()
  ) {
    return "emessage_send";
  }
  if (
    /\bemessage\b/i.test(message) &&
    /\b(?:sms|message|notification|test|preview|prepare|send)\b/i.test(message)
  ) {
    return "emessage_preview";
  }
  return null;
}

function normalizeEMessageNumber(number: string | undefined) {
  if (!number) return null;
  const normalized = number.trim().replace(/[\s().-]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

function normalizeEMessageBody(message: string | undefined) {
  if (!message) return null;
  const normalized = message
    .trim()
    .replace(/^["“”']+|["“”']+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized && normalized.length <= 480 ? normalized : null;
}

function customEMessageDraft(message: string, user: User) {
  const numberMatch = message.match(/\+(?:[\d\s().-]{6,22})\d/);
  const explicitNumber = normalizeEMessageNumber(numberMatch?.[0]);
  const profileNumber = normalizeEMessageNumber(user.mobile);
  const number = explicitNumber ?? profileNumber;

  const quotedMessage = [...message.matchAll(/["“]([^"”]{1,480})["”]/g)]
    .map((match) => normalizeEMessageBody(match[1]))
    .find((value): value is string => Boolean(value));
  let body = quotedMessage ?? null;

  if (!body && numberMatch?.index !== undefined) {
    const afterNumber = message
      .slice(numberMatch.index + numberMatch[0].length)
      .replace(
        /^\s*(?:(?:saying|with(?:\s+the)?\s+message|message)\b\s*|[:;,—-]\s*)/i,
        "",
      );
    body = normalizeEMessageBody(afterNumber);

    if (!body) {
      const beforeNumber = message
        .slice(0, numberMatch.index)
        .replace(
          /^\s*(?:please\s+)?(?:send|text|message)\s+(?:an?\s+)?(?:emessage\s+)?/i,
          "",
        )
        .replace(/\s+(?:via\s+emessage\s+)?to\s*$/i, "");
      body = normalizeEMessageBody(beforeNumber);
    }
  }

  if (!numberMatch && !body) body = EMESSAGE_TEST_BODY;

  return {
    number,
    message: body,
    hasExplicitNumber: Boolean(numberMatch),
    invalidExplicitNumber: Boolean(numberMatch) && !explicitNumber,
  };
}

function pruneEMessageDrafts() {
  const now = Date.now();
  for (const [id, draft] of eMessageDrafts) {
    if (draft.used || now - draft.createdAt >= EMESSAGE_DRAFT_TTL_MS) {
      eMessageDrafts.delete(id);
    }
  }
}

function saveEMessageDraft(number: string, message: string) {
  pruneEMessageDrafts();
  const id = randomUUID();
  eMessageDrafts.set(id, {
    number,
    message,
    createdAt: Date.now(),
    used: false,
  });
  return id;
}

function reviewedEMessageDraft(history: AgentApiRequest["history"]) {
  pruneEMessageDrafts();
  for (const item of [...history].reverse()) {
    if (item.role !== "assistant") continue;
    const id = item.text.match(
      /eMessage draft ID is \*\*([0-9a-f-]{36})\*\*/i,
    )?.[1];
    if (!id) continue;
    const draft = eMessageDrafts.get(id);
    if (draft && !draft.used) return draft;
  }
  return null;
}

function redactedMobile(number: string) {
  const normalized = number.trim().replace(/[\s()-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) return "Unavailable";
  return `${normalized.slice(0, 3)} ••• ••• ${normalized.slice(-4)}`;
}

async function buildEMessagePlan(
  route: EMessageRoute,
  history: AgentApiRequest["history"],
  user: User,
  requestMessage: string,
): Promise<Plan> {
  if (route === "emessage_preview") {
    const draft = customEMessageDraft(requestMessage, user);
    if (draft.invalidExplicitNumber) {
      return {
        steps: [],
        text: "That recipient is not a valid E.164 mobile number. Use a full international number such as **+639171234567**.",
      };
    }
    if (!draft.number) {
      return {
        steps: [],
        text: "Include the recipient in E.164 format and the SMS body. Example: `Send an eMessage to +639171234567 saying \"Your appointment is confirmed.\"`",
      };
    }
    if (!draft.message) {
      return {
        steps: [],
        text: "Include the message in quotation marks so it can be reviewed exactly. Example: `Send an eMessage to +639171234567 saying \"Your appointment is confirmed.\"`",
      };
    }

    const recipient = redactedMobile(draft.number);
    const draftId = saveEMessageDraft(draft.number, draft.message);
    return {
      steps: [
        step(
          "identity",
          draft.hasExplicitNumber
            ? "Validating the provided SMS recipient"
            : "Reading the verified SMS recipient",
          draft.hasExplicitNumber ? "eMessage input" : "eGovPH profile",
          recipient,
          480,
        ),
        step(
          "file",
          "Preparing the SMS for review",
          "eMessage API",
          "Draft only · nothing sent",
          520,
        ),
      ],
      text: `Your **eMessage SMS is ready for review**. Nothing has been sent. Confirm the masked recipient and exact message below.\n\nMessage: “${draft.message}”\n\neMessage draft ID is **${draftId}**.`,
      card: {
        kind: "record",
        title: "eMessage SMS preview",
        fields: [
          { label: "Recipient", value: recipient },
          { label: "Channel", value: "SMS" },
          { label: "Message", value: draft.message },
          { label: "Status", value: "Not sent" },
        ],
        action: EMESSAGE_SEND_ACTION,
        intent: EMESSAGE_SEND_ACTION,
      },
    };
  }

  const draft = reviewedEMessageDraft(history);
  if (!draft) {
    return {
      steps: [],
      text: "I do not have an active reviewed eMessage draft in this conversation. Prepare the SMS again so you can verify its recipient and content before sending.",
      card: {
        kind: "record",
        title: "eMessage confirmation required",
        fields: [
          { label: "Status", value: "Draft required" },
        ],
        action: "Prepare an eMessage SMS",
      },
    };
  }

  const recipient = redactedMobile(draft.number);
  draft.used = true;
  try {
    await pushEMessageSms({ number: draft.number, message: draft.message });
    return {
      steps: [
        step(
          "shield",
          "Sending the approved SMS",
          "eMessage API",
          "Request accepted",
          720,
        ),
      ],
      text: "eMessage **accepted the SMS request**. This confirms creation by the API, not delivery to the handset.",
      card: {
        kind: "record",
        title: "eMessage request accepted",
        fields: [
          { label: "Recipient", value: recipient },
          { label: "Channel", value: "SMS" },
          { label: "Provider status", value: "Accepted" },
          { label: "Delivery status", value: "Not provided by the API" },
        ],
        action: "View notification details",
      },
    };
  } catch (error) {
    if (error instanceof EMessageApiError) {
      throw new AiRouterError(error.message, error.status);
    }
    throw error;
  }
}

export async function runHeadlessAgent(value: unknown) {
  const body = parseRequest(value);
  const routed = await routeGovernmentRequest({
    ...body,
    personalContext: PERSONAL_CONTEXT,
  });
  const forcedEMessageRoute = explicitEMessageRoute(body.message);
  const result = forcedEMessageRoute
    ? {
        ...routed.result,
        route: forcedEMessageRoute,
        agency: "eGovPH eMessage",
        service:
          forcedEMessageRoute === "emessage_send"
            ? "SMS dispatch"
            : "SMS preview",
        intent_summary:
          forcedEMessageRoute === "emessage_send"
            ? "Send the reviewed eMessage test SMS"
            : "Prepare an eMessage test SMS",
        routing_reason:
          "eMessage is the connected government service for SMS notifications.",
      }
    : routed.result;
  const servicePrompt =
    result.route === "psa_certificate" ||
    result.route === "business_one_stop"
      ? body.message
      : SERVICE_PROMPTS[result.route];
  const serviceUser: User = {
    ...body.user,
    pcn: "6302-6431-0891-2530",
  };
  const isETravel =
    result.route === "etravel_register" ||
    result.route === "etravel_submit";
  const compassPlan =
    result.route === "dbm_compass"
      ? await buildCompassPlan(body.message)
      : null;
  const ereportPlan =
    result.route === "ereport" || result.route === "ereport_submit"
      ? await buildEreportPlan(
          body.message,
          result.route,
          body.history,
          serviceUser,
        )
      : null;
  const egovPayPlan = [
    "nbi_pay",
    "nbi_confirm_pay",
    "lto_violation_pay",
    "lto_violation_confirm_pay",
  ].includes(result.route)
    ? await buildEgovPayPlan(result.route as EgovPayRoute, body.history)
    : null;
  const emessagePlan =
    result.route === "emessage_preview" || result.route === "emessage_send"
      ? await buildEMessagePlan(
          result.route,
          body.history,
          serviceUser,
          body.message,
        )
      : null;
  const servicePlan = ereportPlan
    ? ereportPlan
    : emessagePlan
      ? emessagePlan
    : egovPayPlan
      ? egovPayPlan
      : compassPlan
        ? compassPlan
        : isETravel
          ? buildETravelPlan(
              result.travel_details,
              serviceUser,
              result.route === "etravel_submit",
            )
          : servicePrompt
            ? agentPlan(
                result.route === "ereport" &&
                  body.message.includes("Attachments:")
                  ? `${servicePrompt}\n${body.message}`
                  : servicePrompt,
                serviceUser,
              )
            : { steps: [] };
  const routingSteps = [
    step(
      "spark",
      "Understanding your request",
      "eGov Agent",
      result.intent_summary,
      480
    ),
    step(
      "search",
      `Routing to ${result.service}`,
      result.agency,
      result.routing_reason,
      560
    ),
  ];
  const connectorSteps =
    "steps" in servicePlan
      ? servicePlan.steps.map((traceStep) => ({
          ...traceStep,
          base: Math.min(
            720,
            Math.max(420, Math.round(traceStep.base / 2))
          ),
        }))
      : [];
  const serviceCard = "card" in servicePlan ? servicePlan.card : undefined;
  const groundedResponse = groundResponseInServiceResult(
    ereportPlan?.text ??
      emessagePlan?.text ??
      egovPayPlan?.text ??
      compassPlan?.text ??
      result.response,
    serviceCard,
    serviceUser,
  );
  const groundedActions = egovPayPlan || emessagePlan
    ? serviceCard?.intent
      ? [serviceCard.intent]
      : []
    : result.route === "dbm_compass"
      ? []
      : groundActionsInServiceResult(result.suggested_actions, serviceCard);
  const printKind = serviceCard?.print;
  const generatedDocument = printKind
    ? {
        name: PRINT_FILE_PREVIEWS[printKind].name,
        href: documentHref(printKind, result.travel_details),
        preview: PRINT_FILE_PREVIEWS[printKind].preview,
      }
    : null;
  const attachments = [
    ...("attachments" in servicePlan && servicePlan.attachments
      ? servicePlan.attachments
      : []),
    ...(generatedDocument ? [generatedDocument] : []),
  ];

  return {
    plan: {
      text: groundedResponse,
      steps: [...routingSteps, ...connectorSteps],
      ...(serviceCard ? { card: serviceCard } : {}),
      ...(attachments.length ? { attachments } : {}),
    },
    suggestedActions: groundedActions,
  };
}

export type HeadlessAgentResult = Awaited<
  ReturnType<typeof runHeadlessAgent>
>;
