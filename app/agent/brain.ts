/* Scripted demo brain — types, seeded data, and the intent → plan mapping.
   Shared by the chat page (app/agent/page.tsx) and the shell (shell.tsx). */

import { type PrintKind } from "./forms";
import { DEMO_DATES as D } from "./dates";
import {
  eTravelReference,
  hasCompleteETravelDetails,
  type ETravelDetails,
} from "./ai-contract";

/* ---------------------------------- types --------------------------------- */

/* Buttons on a card can continue the conversation (intent) and/or open a
   pre-filled government document preview (print). */
export type CardBase = {
  intent?: string;
  print?: PrintKind;
  printLabel?: string;
};

export type PaymentLineItem = { label: string; amount: string };
export type EReportResponder = {
  agency: string;
  role: string;
  status?: string;
};

export type Card = CardBase &
  (
    | {
        kind: "appointment";
        title: string;
        subtitle: string;
        date: string;
        time: string;
        location: string;
        reference: string;
      }
    | {
        kind: "checklist";
        title: string;
        items: string[];
        fee: string;
        action: string;
      }
    | {
        kind: "contributions";
        title: string;
        rows: { month: string; amount: string; status: string }[];
        total: string;
        meta: string;
      }
    | {
        kind: "record";
        title: string;
        fields: { label: string; value: string }[];
        action: string;
        qr?: { label: string; value: string };
      }
    | {
        kind: "budget";
        title: string;
        subtitle: string;
        metrics: { label: string; value: string }[];
        series: {
          label: string;
          value: number;
          valueLabel: string;
          detail?: string;
        }[];
        source: string;
        retrievedAt: string;
      }
    | {
        kind: "employmentPack";
        title: string;
        subtitle: string;
        ready: number;
        total: number;
        services: {
          agency: string;
          initials: string;
          service: string;
          detail: string;
          status: "Verified" | "Active" | "Ready" | "Needs action";
        }[];
        vaultDocuments: { name: string; status: string }[];
        action: string;
      }
    | {
        kind: "payment";
        title: string;
        agency: string;
        service: string;
        reference: string;
        lineItems: PaymentLineItem[];
        total: string;
        method: string;
        checkoutUrl?: string;
        transactionUuid?: string;
        providerReference?: string;
        environment?: string;
        action: string;
      }
    | {
        kind: "receipt";
        title: string;
        agency: string;
        service: string;
        receiptNumber: string;
        transactionNumber: string;
        paidAt: string;
        lineItems: PaymentLineItem[];
        total: string;
        method: string;
        action: string;
        print: PrintKind;
      }
    | {
        kind: "ereportDraft";
        title: string;
        reportType: string;
        severity: string;
        location: string;
        coordinates: string;
        summary: string;
        evidence: string;
        responders: EReportResponder[];
        routingLabel?: string;
        action: string;
      }
    | {
        kind: "ereportConfirmation";
        title: string;
        reportNumber: string;
        submittedAt: string;
        incident: string;
        location: string;
        responders: EReportResponder[];
        statusLabel?: string;
        eta: string;
        action: string;
      }
    | {
        kind: "ltoViolation";
        caseNumber: string;
        violation: string;
        status: string;
        location: string;
        date: string;
        time: string;
        fine: string;
        source: string;
        note: string;
        action: string;
      }
    | {
        kind: "map";
        title: string;
        center: [number, number]; // [lng, lat]
        zoom: number;
        you: { lng: number; lat: number; label: string };
        sites: {
          id: string;
          name: string;
          lng: number;
          lat: number;
          distance: string;
          slot: string;
          recommended?: boolean;
        }[];
        action: string;
      }
  );

export type StepIcon =
  | "identity"
  | "records"
  | "search"
  | "calendar"
  | "file"
  | "payment"
  | "spark"
  | "shield";

export type TraceStep = {
  icon: StepIcon;
  label: string;
  agency: string;
  result: string;
  base: number;
};

export type Attachment = { name: string; href: string; preview?: string };
export type UserUpload = {
  id: string;
  name: string;
  kind: "file" | "image";
  preview?: string;
};

export type Msg = {
  id: number;
  role: "user" | "agent";
  text: string;
  quickActions?: string[];
  card?: Card;
  trace?: TraceStep[];
  elapsed?: string;
  attachments?: Attachment[];
  uploads?: UserUpload[];
};

export type User = {
  name: string;
  firstName: string;
  pcn: string;
  photoSrc?: string;
  birthDate?: string;
  sex?: string;
  nationality?: string;
  mobile?: string;
  email?: string;
  address?: string;
};

export type Conversation = { id: string; title: string; messages: Msg[] };

export type AgentActivity = {
  steps: TraceStep[];
  currentIndex: number;
  startedAt: number;
  phase: "thinking" | "working" | "typing";
};

export const THINKING_DELAY_MS = 5000;

/* ----------------------------- scripted brain ----------------------------- */

export const SUGGESTIONS = [
  "Show the 2026 DBM SAAODB summary",
  "Show the latest 5 SARO records",
  "Register my eTravel departure",
  "Start a business in Mandaluyong",
  "Request my PSA birth certificate",
  "File a flooding eReport",
  "Prepare an eMessage test SMS",
  "Renew my passport",
  "Check my SSS contributions",
];

export function step(
  icon: StepIcon,
  label: string,
  agency: string,
  result: string,
  base: number
): TraceStep {
  return { icon, label, agency, result, base };
}

export type Plan = {
  steps: TraceStep[];
  text: string;
  card?: Card;
  attachments?: Attachment[];
};

/* Real, openable files in the demo document vault (public/vault/) */
export const VAULT_FILES = {
  birthCert: {
    name: "PSA Birth Certificate.webp",
    href: "/vault/birthcert.webp",
    preview: "/vault/birthcert.webp",
  },
  meralco: {
    name: "Proof of Billing — Meralco.pdf",
    href: "/vault/meralco-bill.pdf",
    preview: "/vault/previews/meralco-bill.png",
  },
  photo: {
    name: "2x2 ID Photo.jpg",
    href: "/vault/profile_2x2.jpg",
    preview: "/vault/profile_2x2.jpg",
  },
  brgyClearance: {
    name: "Barangay Clearance.pdf",
    href: "/vault/barangay-clearance.pdf",
    preview: "/vault/previews/barangay-clearance.png",
  },
};

function formatETravelDate(value: string) {
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function buildETravelPlan(
  details: ETravelDetails,
  user: User,
  submitted: boolean
): Plan {
  if (!hasCompleteETravelDetails(details)) {
    return { steps: [], text: "" };
  }

  const direction =
    details.direction === "arrival" ? "Arrival" : "Departure";
  const travelerType =
    details.direction === "arrival"
      ? "Arriving passenger"
      : "Departing passenger";
  const route = `${details.origin} → ${details.destination}`;
  const schedule = `${formatETravelDate(details.travelDate)} · ${details.travelTime}`;
  const flight = `${details.flightNumber} · ${details.travelTime}`;
  const reference = eTravelReference(details);

  if (submitted) {
    return {
      steps: [
        step(
          "shield",
          "Recording your consent",
          "eGovPH Consent",
          "Travel-only data scope approved",
          900
        ),
        step(
          "records",
          "Submitting your declaration",
          "eTravel via eGovDX",
          `${travelerType} · ${route}`,
          1350
        ),
        step(
          "file",
          "Issuing your travel QR",
          "eTravel",
          `${reference} · ready for boarding`,
          1050
        ),
        step(
          "spark",
          "Saving your copy and reminders",
          "eGovPH",
          "QR saved · SMS and email reminder scheduled",
          900
        ),
      ],
      text: `Your **eTravel declaration is registered**, ${user.firstName}.`,
      card: {
        kind: "record",
        title: "eTravel QR — Registered",
        fields: [
          { label: "Reference", value: reference },
          { label: "Direction", value: travelerType },
          { label: "Route", value: route },
          { label: "Flight", value: flight },
          { label: "Travel date", value: schedule },
          { label: "Status", value: "Registered · QR issued" },
        ],
        action: "Open eTravel QR declaration",
        print: "etravel-qr",
        qr: { label: "eTravel QR", value: reference },
      },
    };
  }

  return {
    steps: [
      step(
        "identity",
        "Reusing your verified eGovPH profile",
        "eGov SSO · eVerify",
        "Name, nationality, contact, and identity matched",
        950
      ),
      step(
        "calendar",
        "Checking your travel schedule",
        "eTravel",
        `${schedule} · ${details.flightNumber}`,
        1050
      ),
      step(
        "records",
        "Preparing your travel declaration",
        "eTravel via eGovDX",
        `${travelerType} · ${route}`,
        1350
      ),
      step(
        "shield",
        "Holding submission for your review",
        "eGovPH Consent",
        "No data shared yet · explicit consent required",
        900
      ),
    ],
    text: `Your **eTravel ${direction.toLowerCase()} declaration** is ready for review.`,
    card: {
      kind: "record",
      title: `eTravel ${direction} — Ready to Review`,
      fields: [
        { label: "Traveler", value: `${user.name} · Filipino` },
        { label: "Direction", value: travelerType },
        { label: "Route", value: route },
        { label: "Flight", value: flight },
        { label: "Travel date", value: schedule },
        { label: "Submission", value: "Waiting for your consent" },
      ],
      action: "Review eTravel declaration",
      intent: "Submit my eTravel declaration",
    },
  };
}

export function agentPlan(input: string, user: User): Plan {
  const q = input.toLowerCase();
  const hasIncidentPhoto = q.includes("attachments:");

  /* ---- follow-up actions triggered by card buttons (checked first) ---- */

  if (
    q.includes("psa") &&
    (q.includes("confirm") || q.includes("submit prepared"))
  ) {
    return {
      steps: [
        step(
          "shield",
          "Recording your request consent",
          "eGovPH Consent",
          "Identity and delivery address approved for PSA",
          900
        ),
        step(
          "records",
          "Sending the certificate request",
          "PSA via eGovDX",
          "Civil-registry request received",
          1350
        ),
        step(
          "payment",
          "Requesting the official agency quote",
          "PSA · eGovPay",
          "Processing and delivery quote pending your review",
          1050
        ),
        step(
          "spark",
          "Starting status notifications",
          "eMessage",
          "SMS and email tracking enabled",
          900
        ),
      ],
      text: `Your **PSA birth certificate request is received**. PSA will return the official processing and delivery quote before any payment is opened. Your identity and Mandaluyong delivery city were shared only after your confirmation, and tracking is now enabled.`,
      card: {
        kind: "record",
        title: "PSA Certificate Request — Received",
        fields: [
          { label: "Reference", value: `PSA-REQ-${D.year}-2714` },
          { label: "Document", value: "Certificate of Live Birth · 1 copy" },
          { label: "Delivery", value: "Mandaluyong City" },
          { label: "Next step", value: "Review PSA quote before payment" },
        ],
        action: "Open request acknowledgement",
        print: "psa-request",
      },
    };
  }

  /* ---- eGovDX showcase: one chat, several connected services ---- */

  if (
    q.includes("psa") ||
    q.includes("birth certificate") ||
    q.includes("cenomar") ||
    q.includes("marriage certificate") ||
    q.includes("death certificate")
  ) {
    const documentType = q.includes("cenomar")
      ? "Certificate of No Marriage (CENOMAR)"
      : q.includes("marriage")
        ? "Marriage Certificate"
        : q.includes("death")
          ? "Death Certificate"
          : "Birth Certificate";

    return {
      steps: [
        step(
          "identity",
          "Matching the requesting party",
          "eGov SSO · eVerify",
          "Verified identity ready for user review",
          950
        ),
        step(
          "records",
          "Preparing the civil-registry request",
          "PSA via eGovDX",
          `${documentType} · one copy`,
          1250
        ),
        step(
          "file",
          "Reusing your registered delivery city",
          "Personal Context",
          "Mandaluyong City · full address remains private",
          900
        ),
        step(
          "shield",
          "Holding the request for consent",
          "eGovPH Consent",
          "Nothing submitted or paid yet",
          850
        ),
      ],
      text: `I prepared a request for **one ${documentType}**. Your verified identity and Mandaluyong delivery city are pre-filled, but the request has not been submitted. After you confirm, PSA returns the official processing and delivery quote before any eGovPay payment.`,
      card: {
        kind: "checklist",
        title: `PSA ${documentType} — Ready to Request`,
        items: [
          "Requesting party — matched through eGovPH",
          "Identity details — ready for your review",
          "Delivery city — Mandaluyong City",
          "Agency quote — shown before payment",
        ],
        fee: "No charge yet · PSA quote comes next",
        action: "Review and confirm request",
        intent: "Confirm my PSA request",
      },
    };
  }

  if (
    q.includes("business") ||
    q.includes("sole proprietorship") ||
    q.includes("business name")
  ) {
    return {
      steps: [
        step(
          "identity",
          "Reusing your verified owner profile",
          "eGov SSO · eVerify",
          "Owner identity and Mandaluyong address ready",
          950
        ),
        step(
          "search",
          "Building the national registration path",
          "DTI BNRS · BIR",
          "Business name first · taxpayer registration follows",
          1250
        ),
        step(
          "records",
          "Adding the local permit path",
          "Mandaluyong eLGU",
          "Barangay clearance and business permit linked",
          1250
        ),
        step(
          "payment",
          "Preparing one payment view",
          "eGovPay",
          "Each official agency quote appears before payment",
          950
        ),
      ],
      text: `I built one **business setup path for Mandaluyong**. We start with the **DTI business name**, continue to **BIR taxpayer registration**, then finish the **barangay and eLGU permits**. I keep one checklist and reuse approved details, while each agency remains the official source for requirements, fees, and status.`,
      card: {
        kind: "checklist",
        title: "Start a Sole Proprietorship — Mandaluyong",
        items: [
          "DTI BNRS — choose and check a business name",
          "BIR — prepare taxpayer and invoice registration",
          "Barangay — request the business clearance",
          "Mandaluyong eLGU — complete the business permit",
          "eGovPay — review each official fee before payment",
        ],
        fee: "No payment yet · agency quotes appear per step",
        action: "Choose a business name",
      },
    };
  }

  if (q.includes("submit") && q.includes("ereport")) {
    return {
      steps: [
        step(
          "shield",
          "Submitting your verified eReport",
          "eGovPH eReport",
          `${D.eReportRef} · identity and consent signed`,
          1050
        ),
        step(
          "records",
          "Dispatching to local responders",
          "Mandaluyong CDRRMO",
          "Incident desk acknowledged · field team notified",
          1250
        ),
        step(
          "spark",
          "Opening the multi-agency response channel",
          "eGov Notify",
          "4 desks linked · SMS and in-app tracking active",
          1150
        ),
        step(
          "file",
          "Issuing your submission acknowledgement",
          "eGovPH eReport",
          "Signed acknowledgement ready",
          950
        ),
      ],
      text: `Your eReport is live, ${user.firstName}. **${D.eReportRef}** was dispatched simultaneously to **Mandaluyong CDRRMO, Barangay Highway Hills, MMDA Metrobase, and DPWH NCR**. The primary incident desk has acknowledged it, a field assessment is estimated in **15–20 minutes**, and I’ll keep one response thread synchronized for you.`,
      card: {
        kind: "ereportConfirmation",
        title: "eReport dispatched",
        reportNumber: D.eReportRef,
        submittedAt: `${D.todayMDY} · ${D.todayTime}`,
        incident: "Severe street flooding · urgent public safety",
        location: "Pioneer St. near Reliance St., Mandaluyong",
        responders: [
          { agency: "Mandaluyong CDRRMO", role: "Primary response", status: "Acknowledged" },
          { agency: "Barangay Highway Hills", role: "Local verification", status: "Team notified" },
          { agency: "MMDA Metrobase", role: "Traffic coordination", status: "Advisory queued" },
          { agency: "DPWH NCR", role: "Flood-control assessment", status: "Report delivered" },
        ],
        eta: "15–20 min field assessment",
        action: "Open eReport acknowledgement",
        print: "ereport-receipt",
      },
    };
  }

  if (
    q.includes("ereport") ||
    (q.includes("report") &&
      (q.includes("flood") ||
        q.includes("pioneer") ||
        q.includes("hazard") ||
        q.includes("blocked road")))
  ) {
    return {
      steps: [
        step(
          "spark",
          hasIncidentPhoto ? "Analyzing the incident photo" : "Understanding the incident",
          "eReport AI Triage",
          hasIncidentPhoto
            ? "Street flooding detected · roadway likely impassable"
            : "Severe street flooding · public-safety risk",
          1150
        ),
        step(
          "search",
          "Resolving the exact location and jurisdiction",
          "eGov Geo",
          "Pioneer × Reliance · Barangay Highway Hills",
          1350
        ),
        step(
          "records",
          "Matching the responsible government desks",
          "DILG Service Directory",
          "CDRRMO · Barangay · MMDA · DPWH NCR",
          1400
        ),
        step(
          "shield",
          "Preparing one consented multi-agency report",
          "eGovPH eReport",
          "Draft ready · duplicate dispatch prevented",
          1050
        ),
      ],
      text: `I classified this as an **urgent public-safety flooding incident**, resolved it to **Pioneer Street near Reliance Street, Barangay Highway Hills**, and prepared one eReport for all four responsible response desks. Review the AI triage below, then submit once—I'll handle the routing and keep their updates in one thread.`,
      card: {
        kind: "ereportDraft",
        title: "eReport AI triage",
        reportType: "Severe street flooding",
        severity: "URGENT",
        location: "Pioneer St. near Reliance St., Mandaluyong",
        coordinates: "14.5778, 121.0537",
        summary:
          "Roadway flooding may be unsafe for pedestrians and light vehicles. Immediate local verification and traffic coordination recommended.",
        evidence: hasIncidentPhoto
          ? "1 incident photo analyzed and attached"
          : "Location and description attached · photo optional",
        responders: [
          { agency: "Mandaluyong CDRRMO", role: "Primary response" },
          { agency: "Barangay Highway Hills", role: "Local verification" },
          { agency: "MMDA Metrobase", role: "Traffic coordination" },
          { agency: "DPWH NCR", role: "Flood-control assessment" },
        ],
        action: "Submit eReport to 4 response desks",
        intent: "Submit this flooding eReport to the four response desks",
      },
    };
  }

  if (q.includes("confirm") && (q.includes("slot") || q.includes("appointment"))) {
    return {
      steps: [
        step(
          "calendar",
          "Reserving your slot",
          "DFA CO SM Megamall",
          `Slot locked · ${D.dfaShort}, 10:30 AM`,
          1150
        ),
        step(
          "file",
          "Issuing your appointment reference",
          "DFA",
          `Reference ${D.dfaRef}`,
          1300
        ),
        step(
          "spark",
          "Sending confirmation & reminders",
          "eGov Notify",
          "Email + SMS sent · calendar invite added",
          1150
        ),
      ],
      text: `All set, ${user.firstName}! Your passport renewal appointment is confirmed — **${D.dfaLong} at 10:30 AM**, **DFA CO SM Megamall, Mandaluyong**. I emailed your confirmation, sent an SMS reminder, and added it to your calendar. Bring your **current passport** and arrive **15 minutes early**.`,
      card: {
        kind: "record",
        title: "DFA Appointment — Confirmed",
        fields: [
          { label: "Reference", value: D.dfaRef },
          { label: "Date & time", value: `${D.dfaShortYear} · 10:30 AM` },
          { label: "Location", value: "DFA CO SM Megamall, Mandaluyong" },
          { label: "Reminders", value: "Email · SMS · Calendar" },
        ],
        action: "Preview appointment pass",
        print: "dfa-pass",
      },
    };
  }

  if (
    q.includes("confirm") &&
    q.includes("egovpay") &&
    (q.includes("nbi") || q.includes("clearance"))
  ) {
    return {
      steps: [
        step(
          "payment",
          "Confirming payment with eGovPay",
          "eGov Pay",
          `₱180.00 paid · ${D.nbiPaymentRef}`,
          1200
        ),
        step(
          "records",
          "Posting payment with NBI",
          "NBI",
          "Payment confirmed · application queued",
          1300
        ),
        step(
          "file",
          "Generating your digital clearance",
          "NBI Clearance",
          "Ready in ~10 minutes · sent to your email",
          1200
        ),
      ],
      text: `Payment confirmed — **₱180.00** was processed through eGovPay. Your **electronic official receipt has been issued below**, and your NBI Clearance is now being generated. The digital copy lands in your email in about **10 minutes**.`,
      card: {
        kind: "receipt",
        title: "NBI Clearance eReceipt",
        agency: "National Bureau of Investigation",
        service: "NBI Clearance — Online",
        receiptNumber: D.orRef,
        transactionNumber: D.nbiPaymentRef,
        paidAt: `${D.todayMDY} · 10:42 AM`,
        lineItems: [
          { label: "NBI clearance fee", amount: "₱155.00" },
          { label: "e-payment fee", amount: "₱25.00" },
        ],
        total: "₱180.00",
        method: "eGov Pay wallet ·•• 4482",
        action: "Preview official receipt",
        print: "nbi-receipt",
      },
    };
  }

  if (
    (q.includes("pay") || q.includes("checkout")) &&
    (q.includes("nbi") || q.includes("clearance"))
  ) {
    return {
      steps: [
        step(
          "payment",
          "Creating a secure eGovPay checkout",
          "eGov Pay",
          `Payment order ready · ${D.nbiPaymentRef}`,
          1050
        ),
        step(
          "records",
          "Linking the payment to your application",
          "NBI",
          `${D.nbiAppRef} · awaiting authorization`,
          1150
        ),
      ],
      text: `Your **eGovPay checkout is ready** for the NBI Clearance application. Review the fee breakdown and authorize the payment below.`,
      card: {
        kind: "payment",
        title: "eGovPay Secure Checkout",
        agency: "National Bureau of Investigation",
        service: "NBI Clearance — Online",
        reference: D.nbiPaymentRef,
        lineItems: [
          { label: "NBI clearance fee", amount: "₱155.00" },
          { label: "e-payment fee", amount: "₱25.00" },
        ],
        total: "₱180.00",
        method: "eGov Pay wallet ·•• 4482",
        action: "Authorize ₱180.00",
        intent: "Confirm eGovPay payment for my NBI clearance",
      },
    };
  }

  if (
    q.includes("mdr") &&
    (q.includes("email") || q.includes("certified") || q.includes("send"))
  ) {
    return {
      steps: [
        step(
          "file",
          "Generating your certified MDR",
          "PhilHealth",
          "Document generated from live records",
          1250
        ),
        step(
          "shield",
          "Applying e-signature & QR verification",
          "PhilHealth",
          "Digitally signed · verifiable online",
          1200
        ),
        step(
          "spark",
          "Sending to your registered email",
          "eGov Notify",
          "Sent to jos••••@yopmail.com",
          1100
        ),
      ],
      text: `Done! Your **certified Member Data Record** is signed and on its way to **jos••••@yopmail.com**. It carries a **QR code** that any employer or hospital can scan to verify it's authentic — no more falling in line at a PhilHealth office.`,
      card: {
        kind: "record",
        title: "PhilHealth Certified MDR — Issued",
        fields: [
          { label: "Document no.", value: D.mdrRef },
          { label: "Sent to", value: "jos••••@yopmail.com" },
          { label: "Signature", value: "PhilHealth e-seal + QR" },
          { label: "Status", value: "Delivered" },
        ],
        action: "Preview MDR copy",
        print: "ph-mdr",
      },
    };
  }

  if (q.includes("cde") || (q.includes("start") && q.includes("exam"))) {
    return {
      steps: [
        step(
          "records",
          "Enrolling you in the CDE portal",
          "LTO LTMS",
          "Enrollment confirmed · account linked",
          1200
        ),
        step(
          "file",
          "Preparing your reviewer & exam link",
          "LTO",
          "25-item exam · pass with 13 correct",
          1250
        ),
        step(
          "spark",
          "Sending your exam access link",
          "eGov Notify",
          "Link sent to jos••••@yopmail.com",
          1100
        ),
      ],
      text: `You're enrolled! I sent your **Comprehensive Driver's Education exam link** to your email — **25 items, pass with 13 correct**, with a free reviewer included. Once you pass, message me and I'll book your biometrics at the nearest renewal center.`,
      card: {
        kind: "record",
        title: "LTO CDE Exam — Enrolled",
        fields: [
          { label: "Exam", value: "CDE Online · 25 items" },
          { label: "Passing score", value: "13 of 25" },
          { label: "Access link", value: "Sent via email" },
          { label: "Status", value: "Ready to take" },
        ],
        action: "Preview renewal application",
        print: "lto-form",
      },
    };
  }

  if ((q.includes("book") || q.includes("capture")) && q.includes("postal")) {
    return {
      steps: [
        step(
          "calendar",
          "Reserving your capture slot",
          "PHLPost Mandaluyong",
          `${D.postalShort}, 9:00 AM · Mandaluyong Central Post Office`,
          1200
        ),
        step(
          "file",
          "Attaching your documents from the vault",
          "Document Vault",
          "Birth certificate · Meralco bill · 2×2 photo",
          1250
        ),
        step(
          "spark",
          "Setting reminders the way you like them",
          "eGov Notify",
          "SMS + email · day before and morning of",
          1100
        ),
      ],
      text: `Booked! Postal ID capture on **${D.postalWeekday}, ${D.postalShort} at 9:00 AM** — **Mandaluyong Central Post Office**, 10 minutes from your registered address. Your **three vault documents** are already attached to the application, and I set **SMS + email reminders** the way you like them. And no, it won't clash with your DFA appointment on the **${D.dfaOrdinal}**.`,
      attachments: [
        VAULT_FILES.birthCert,
        VAULT_FILES.meralco,
        VAULT_FILES.photo,
      ],
      card: {
        kind: "record",
        title: "Postal ID Capture — Booked",
        fields: [
          { label: "Reference", value: D.postalRef },
          { label: "Date & time", value: `${D.postalShortYear} · 9:00 AM` },
          { label: "Location", value: "Mandaluyong Central Post Office" },
          { label: "Documents", value: "3 attached from your vault" },
        ],
        action: "Preview appointment pass",
        print: "postal-pass",
      },
    };
  }

  /* ---- memory & personal-context showcase: Postal ID application ---- */

  if (q.includes("postal")) {
    return {
      steps: [
        step(
          "spark",
          "Recalling your context & preferences",
          "Memory",
          `Mandaluyong resident · SMS + email reminders · ${D.dfaShort} busy (DFA)`,
          1000
        ),
        step(
          "file",
          "Checking requirements against your vault",
          "Document Vault",
          "All 3 requirements already on file",
          1350
        ),
        step(
          "records",
          "Pre-filling the PHLPost application",
          "PHLPost",
          "Form completed from your PhilSys record",
          1300
        ),
        step(
          "calendar",
          "Finding a slot that fits your schedule",
          "PHLPost Mandaluyong",
          `${D.postalShort}, 9:00 AM — clear of your DFA visit`,
          1250
        ),
      ],
      text: `Good news, ${user.firstName} — you don't need to gather a single document. Your vault already has **all three requirements**: your **PSA birth certificate**, your **Meralco bill** as proof of address, and a **2×2 photo** — they're attached below if you want to double-check them. I pre-filled the application from your PhilSys record, and since I remember your **DFA appointment on ${D.dfaShort}**, I picked a capture slot on **${D.postalShort} in Mandaluyong** instead. Shall I book it?`,
      attachments: [
        VAULT_FILES.birthCert,
        VAULT_FILES.meralco,
        VAULT_FILES.photo,
      ],
      card: {
        kind: "checklist",
        title: "PHLPost Postal ID — Ready to File",
        items: [
          "Application form — pre-filled from PhilSys",
          "PSA Birth Certificate — from your vault",
          "Proof of address — Meralco bill, from your vault",
          "2×2 photo — from your vault",
        ],
        fee: "₱504.00 · delivery included",
        action: `Book capture · ${D.postalShort}, 9:00 AM`,
        intent: "Book the Postal ID capture slot",
      },
    };
  }

  /* ---- location-aware: nearest DFA passport sites on a live map ---- */

  if (
    (q.includes("near") ||
      q.includes("where") ||
      q.includes("office") ||
      q.includes("branch") ||
      q.includes("site") ||
      q.includes("map")) &&
    (q.includes("dfa") || q.includes("passport"))
  ) {
    return {
      steps: [
        step(
          "identity",
          "Verifying your identity",
          "PhilSys eVerify",
          "Identity confirmed · address on record",
          900
        ),
        step(
          "search",
          "Locating your registered address",
          "PSA",
          "Barangay Plainview, Mandaluyong City",
          1250
        ),
        step(
          "records",
          "Querying slot availability across NCR sites",
          "DFA",
          "5 sites online · earliest slot at SM Megamall",
          1500
        ),
        step(
          "spark",
          "Ranking sites by distance and earliest slot",
          "eGov Agent",
          "DFA CO SM Megamall recommended · 2.3 km away",
          1100
        ),
      ],
      text: `I found **5 DFA passport sites** near your registered address in Mandaluyong — they're on the map below. The nearest one, **DFA CO SM Megamall** (**2.3 km** away), also happens to have the **earliest renewal slot: ${D.dfaWeekday}, ${D.dfaShort} at 10:30 AM**. Want me to book it?`,
      card: {
        kind: "map",
        title: "DFA Passport Sites — Near You",
        center: [121.012, 14.568],
        zoom: 10.8,
        you: {
          lng: 121.0359,
          lat: 14.5794,
          label: "Your registered address · Mandaluyong",
        },
        sites: [
          {
            id: "megamall",
            name: "DFA CO SM Megamall, Mandaluyong",
            lng: 121.0566,
            lat: 14.5847,
            distance: "2.3 km",
            slot: `${D.dfaShort} · 10:30 AM`,
            recommended: true,
          },
          {
            id: "galleria",
            name: "DFA CO Robinsons Galleria",
            lng: 121.0571,
            lat: 14.5906,
            distance: "2.7 km",
            slot: D.slotGalleria,
          },
          {
            id: "ali-mall",
            name: "DFA CO Ali Mall, Cubao",
            lng: 121.0524,
            lat: 14.6197,
            distance: "4.7 km",
            slot: D.slotAliMall,
          },
          {
            id: "sm-manila",
            name: "DFA CO SM Manila",
            lng: 120.9803,
            lat: 14.5904,
            distance: "6.2 km",
            slot: D.slotSMManila,
          },
          {
            id: "aseana",
            name: "DFA OCA Aseana, Parañaque",
            lng: 120.9861,
            lat: 14.5087,
            distance: "9.6 km",
            slot: D.slotAseana,
          },
        ],
        action: `Book Megamall · ${D.dfaShort}, 10:30 AM`,
        intent: `Confirm the ${D.dfaShort} slot`,
      },
    };
  }

  /* ------------------------- base service intents ------------------------- */

  if (q.includes("passport") || q.includes("dfa")) {
    return {
      steps: [
        step(
          "identity",
          "Verifying your identity",
          "PhilSys eVerify",
          "Identity confirmed · face + PCN match",
          900
        ),
        step(
          "records",
          "Retrieving your passport record",
          "DFA",
          "ePassport found · expires Mar 14, 2027",
          1400
        ),
        step(
          "shield",
          "Checking renewal eligibility",
          "DFA",
          "Eligible — within the renewal window",
          1100
        ),
        step(
          "calendar",
          "Scanning appointment slots near Mandaluyong",
          "DFA CO SM Megamall",
          `Earliest slot found · ${D.dfaShort}, 10:30 AM`,
          1650
        ),
      ],
      text: `I checked with the DFA appointment system — your ePassport expires on **March 14, 2027**, so you're **eligible for renewal now**. I found the **earliest available slot** near your registered address in Mandaluyong. Shall I book it for you?`,
      card: {
        kind: "appointment",
        title: "DFA Passport Renewal",
        subtitle: "DFA CO SM Megamall, Mandaluyong",
        date: D.dfaLong,
        time: "10:30 AM",
        location: "3F Mega B, SM Megamall, Mandaluyong City",
        reference: D.dfaRef,
        intent: `Confirm the ${D.dfaShort} slot`,
        print: "dfa-form",
        printLabel: "Preview pre-filled application",
      },
    };
  }

  if (
    q.includes("employment starter") ||
    q.includes("first job") ||
    q.includes("new job") ||
    q.includes("new hire") ||
    q.includes("pre-employment") ||
    q.includes("job requirements")
  ) {
    return {
      steps: [
        step(
          "identity",
          "Verifying your employment identity",
          "PhilSys eVerify",
          "Identity and registered address matched",
          900
        ),
        step(
          "file",
          "Checking reusable employment documents",
          "Personal Vault · PSA",
          "Birth certificate and Barangay Clearance available",
          1100
        ),
        step(
          "records",
          "Checking social security membership",
          "SSS",
          "Active member · employer registration ready",
          1300
        ),
        step(
          "records",
          "Checking health insurance membership",
          "PhilHealth",
          "Active member · employer enrollment ready",
          1450
        ),
        step(
          "records",
          "Checking housing fund membership",
          "Pag-IBIG Fund",
          "Active member · employer enrollment ready",
          1200
        ),
        step(
          "search",
          "Checking clearance readiness",
          "NBI eClearance",
          "Renewal prepared · user review required",
          1350
        ),
      ],
      text: `Your **Employment Starter Pack** is ready, ${user.firstName}. Five of six government checks are complete. Your PhilHealth, SSS, and Pag-IBIG memberships are active, while your PSA birth certificate and Barangay Clearance remain private in your Vault until you approve sharing. The only pending action is reviewing your NBI clearance renewal.`,
      card: {
        kind: "employmentPack",
        title: "Employment Starter Pack",
        subtitle: "One readiness check across six government services",
        ready: 5,
        total: 6,
        services: [
          {
            agency: "PhilSys",
            initials: "PS",
            service: "Identity and address",
            detail: "Verified profile matched",
            status: "Verified",
          },
          {
            agency: "PSA",
            initials: "PSA",
            service: "Birth certificate",
            detail: "Available securely in Vault",
            status: "Ready",
          },
          {
            agency: "SSS",
            initials: "SSS",
            service: "Membership",
            detail: "Active · employer registration ready",
            status: "Active",
          },
          {
            agency: "PhilHealth",
            initials: "PH",
            service: "Membership",
            detail: "Active · employer enrollment ready",
            status: "Active",
          },
          {
            agency: "Pag-IBIG",
            initials: "HDMF",
            service: "Fund membership",
            detail: "Active · employer enrollment ready",
            status: "Active",
          },
          {
            agency: "NBI",
            initials: "NBI",
            service: "Employment clearance",
            detail: "Renewal prepared for review",
            status: "Needs action",
          },
        ],
        vaultDocuments: [
          {
            name: "PSA Birth Certificate",
            status: "Available after consent",
          },
          {
            name: "Barangay Clearance",
            status: "Available after consent",
          },
        ],
        action: "Review NBI clearance request",
        intent: "Review my NBI clearance request",
      },
    };
  }

  if (
    q.includes("philhealth") &&
    (q.includes("premium") ||
      q.includes("contribution") ||
      q.includes("payment history") ||
      q.includes("payments"))
  ) {
    return {
      steps: [
        step(
          "identity",
          "Verifying your identity",
          "PhilSys eVerify",
          "Identity confirmed · member matched",
          900
        ),
        step(
          "records",
          "Connecting to your membership record",
          "PhilHealth",
          "PIN 08-025518412-3 · Active",
          1250
        ),
        step(
          "search",
          "Reading premium payment history",
          "PhilHealth",
          `Latest three premiums posted through ${D.sssMonth1}`,
          1450
        ),
        step(
          "spark",
          "Preparing your premium summary",
          "eGov Agent",
          "No missed posting found in the displayed period",
          1000
        ),
      ],
      text: `Here is your latest **PhilHealth premium contribution history**, ${user.firstName}. The three displayed monthly premiums are posted through **${D.sssMonth1}**, with no missed posting in this period.`,
      card: {
        kind: "contributions",
        title: "PhilHealth · 08-025518412-3",
        rows: [
          { month: D.sssMonth1, amount: "₱1,250.00", status: "Posted" },
          { month: D.sssMonth2, amount: "₱1,250.00", status: "Posted" },
          { month: D.sssMonth3, amount: "₱1,250.00", status: "Posted" },
        ],
        total: "₱3,750.00",
        meta: "3 recent premiums · fully posted",
      },
    };
  }

  if (q.includes("nbi") || q.includes("clearance")) {
    return {
      steps: [
        step(
          "identity",
          "Verifying your identity",
          "PhilSys eVerify",
          "Identity confirmed · biometrics on file",
          900
        ),
        step(
          "search",
          "Running national name & record check",
          "NBI",
          "No record hits found",
          1550
        ),
        step(
          "file",
          "Assembling your online application",
          "NBI Clearance",
          "Purpose set · Local employment",
          1150
        ),
        step(
          "payment",
          "Computing fees & delivery options",
          "eGov Pay",
          "₱180.00 total · digital copy ready in ~10 min",
          1250
        ),
      ],
      text: `You can get your NBI Clearance **fully online** — no need to visit a branch since your **biometrics from PhilSys are already on file**. Here's everything you need. Once paid, your digital copy arrives in **about 10 minutes**.`,
      card: {
        kind: "checklist",
        title: "NBI Clearance — Online",
        items: [
          "PhilSys ID verified via eVerify",
          "Biometrics on file (captured 2024)",
          "Purpose: Local employment",
          "Digital copy + courier delivery available",
        ],
        fee: "₱155.00 + ₱25.00 e-payment fee",
        action: "Continue with eGovPay",
        intent: "Open eGovPay checkout for my NBI clearance",
        print: "nbi-form",
        printLabel: "Preview pre-filled application",
      },
    };
  }

  if (q.includes("sss") || q.includes("contribution") || q.includes("pension")) {
    return {
      steps: [
        step(
          "identity",
          "Verifying your identity",
          "PhilSys eVerify",
          "Identity confirmed · member matched",
          900
        ),
        step(
          "records",
          "Connecting to your member records",
          "SSS",
          "Member 34-2258901-5 · Active",
          1350
        ),
        step(
          "search",
          "Reading employer contribution postings",
          "SSS",
          "87 posted contributions found",
          1500
        ),
        step(
          "spark",
          "Calculating your contribution summary",
          "eGov Agent",
          `Fully posted through ${D.sssMonth1}`,
          1050
        ),
      ],
      text: `Here's your latest SSS contribution summary, ${user.firstName}. Your employer has posted all contributions up to **${D.sssMonth1}** — you're **fully up to date** with **87 total posted contributions**.`,
      card: {
        kind: "contributions",
        title: "SSS · 34-2258901-5",
        rows: [
          { month: D.sssMonth1, amount: "₱1,830.00", status: "Posted" },
          { month: D.sssMonth2, amount: "₱1,830.00", status: "Posted" },
          { month: D.sssMonth3, amount: "₱1,830.00", status: "Posted" },
        ],
        total: "₱142,470.00",
        meta: "87 contributions · fully posted",
        print: "sss-statement",
        printLabel: "Preview contribution statement",
      },
    };
  }

  if (q.includes("philhealth")) {
    return {
      steps: [
        step(
          "identity",
          "Verifying your identity",
          "PhilSys eVerify",
          "Identity confirmed · member matched",
          900
        ),
        step(
          "records",
          "Opening your Member Data Record",
          "PhilHealth",
          "PIN 08-025518412-3 · Active",
          1350
        ),
        step(
          "search",
          "Checking membership status",
          "PhilHealth",
          "Membership is active",
          1450
        ),
        step(
          "file",
          "Reviewing registered dependents",
          "PhilHealth",
          "2 dependents on record",
          1000
        ),
      ],
      text: `Your PhilHealth membership is **active**. Here is your Member Data Record with your member type and registered dependents. You can request a **certified digital copy** for employment or hospital admission.`,
      card: {
        kind: "record",
        title: "PhilHealth Member Data Record",
        fields: [
          { label: "PIN", value: "08-025518412-3" },
          { label: "Member type", value: "Direct Contributor — Employed" },
          { label: "Status", value: "Active membership" },
          { label: "Dependents", value: "2 registered" },
        ],
        action: "Email certified MDR",
        intent: "Email my certified MDR",
        print: "ph-mdr",
        printLabel: "Preview MDR copy",
      },
    };
  }

  if (
    !(q.includes("pay") || q.includes("payment") || q.includes("proceed")) &&
    (q.includes("lto") || q.includes("license") || q.includes("driver")) &&
    (q.includes("violation") ||
      q.includes("alarm") ||
      q.includes("apprehension") ||
      q.includes("ticket") ||
      q.includes("oga") ||
      q.includes("unsettled"))
  ) {
    return {
      steps: [
        step(
          "identity",
          "Verifying your identity",
          "PhilSys eVerify",
          "Identity confirmed · license holder matched",
          900
        ),
        step(
          "records",
          "Opening your LTO profile",
          "LTO LTMS",
          "License N03-12-345678 · profile found",
          1250
        ),
        step(
          "search",
          "Checking OGA interface alarms",
          "LTO Violations",
          "Alarm detected · transactions blocked",
          1500
        ),
        step(
          "file",
          "Retrieving case details",
          "LTO",
          "TRX-LETAS-260210-4507860 · 5.STS-8 Obstruction",
          1150
        ),
      ],
      text: `I checked your LTO profile, ${user.firstName}. You have **one pending OGA alarm**, so LTO transactions like licensing, vehicle updates, and documents are **blocked until the case is settled**. The case details show a **5.STS-8 Obstruction** violation recorded on **January 20, 2026 at 8:39 AM**.`,
      card: {
        kind: "ltoViolation",
        caseNumber: "TRX-LETAS-260210-4507860",
        violation: "5.STS-8 Obstruction",
        status: "PENDING",
        location: "NA",
        date: "01/20/2026",
        time: "08:39 am",
        fine: "For assessment",
        source: "OGA",
        note:
          "You have been placed under alarm by OGA Interface. All transactions to LTO are blocked until the alarm is lifted. Please go to OGA Interface to settle your alarm.",
        action: "Proceed to Payment",
        intent: "Proceed to payment for my LTO OGA violation",
      },
    };
  }

  if (
    q.includes("confirm") &&
    q.includes("egovpay") &&
    (q.includes("lto") || q.includes("oga") || q.includes("violation"))
  ) {
    return {
      steps: [
        step(
          "payment",
          "Confirming payment with eGovPay",
          "eGov Pay",
          `₱1,000.00 paid · ${D.ltoPaymentRef}`,
          1150
        ),
        step(
          "records",
          "Posting the settlement to OGA",
          "LTO Violations",
          "Payment confirmed · case settled",
          1250
        ),
        step(
          "shield",
          "Submitting the alarm lift request",
          "LTO",
          "Request sent · transactions pending reopen",
          1150
        ),
      ],
      text: `The **₱1,000.00 eGovPay payment is confirmed**. Your electronic official receipt has been issued, the settlement was posted to the OGA interface, and the **alarm lift request is now with LTO**.`,
      card: {
        kind: "receipt",
        title: "LTO Settlement eReceipt",
        agency: "Land Transportation Office",
        service: "OGA violation settlement",
        receiptNumber: D.ltoOrRef,
        transactionNumber: D.ltoPaymentRef,
        paidAt: `${D.todayMDY} · 10:42 AM`,
        lineItems: [{ label: "Assessed OGA fine", amount: "₱1,000.00" }],
        total: "₱1,000.00",
        method: "eGov Pay wallet ·•• 4482",
        action: "Preview electronic receipt",
        print: "lto-receipt",
      },
    };
  }

  if (
    (q.includes("pay") || q.includes("payment") || q.includes("proceed")) &&
    (q.includes("lto") || q.includes("oga") || q.includes("violation"))
  ) {
    return {
      steps: [
        step(
          "payment",
          "Creating a secure eGovPay checkout",
          "eGov Pay",
          `Payment order ready · ${D.ltoPaymentRef}`,
          1100
        ),
        step(
          "records",
          "Linking the payment to OGA",
          "LTO Violations",
          "Case TRX-LETAS-260210-4507860 · awaiting authorization",
          1250
        ),
      ],
      text: `Your **eGovPay checkout is ready** for case **TRX-LETAS-260210-4507860**. The assessed fine is **₱1,000.00**. Review and authorize it below.`,
      card: {
        kind: "payment",
        title: "eGovPay Secure Checkout",
        agency: "Land Transportation Office",
        service: "OGA violation settlement",
        reference: D.ltoPaymentRef,
        lineItems: [{ label: "Assessed OGA fine", amount: "₱1,000.00" }],
        total: "₱1,000.00",
        method: "eGov Pay wallet ·•• 4482",
        action: "Authorize ₱1,000.00",
        intent: "Confirm eGovPay payment for my LTO OGA violation",
      },
    };
  }

  if (q.includes("license") || q.includes("lto") || q.includes("driver")) {
    return {
      steps: [
        step(
          "identity",
          "Verifying your identity",
          "PhilSys eVerify",
          "Identity confirmed · license holder matched",
          900
        ),
        step(
          "records",
          "Retrieving your driver's license file",
          "LTO LTMS",
          "License N03-12-345678 · expires Oct 2, 2026",
          1350
        ),
        step(
          "search",
          "Checking for unsettled violations",
          "LTO",
          "No unsettled violations found",
          1500
        ),
        step(
          "file",
          "Preparing online renewal requirements",
          "LTO LTMS",
          "CDE exam + biometrics visit needed",
          1050
        ),
      ],
      text: `Your driver's license (**N03-12-345678**) expires on **October 2, 2026**. Since you have **no unsettled violations**, you qualify for **online renewal**. You'll just need to complete the Comprehensive Driver's Education exam online — it takes **about 20 minutes** — then pick a renewal center for biometrics.`,
      card: {
        kind: "checklist",
        title: "LTO License Renewal",
        items: [
          "License N03-12-345678 — expires Oct 2, 2026",
          "No unsettled violations",
          "CDE online exam required (~20 mins)",
          "Medical certificate — book via agent",
        ],
        fee: "₱585.00 renewal fee",
        action: "Start CDE exam",
        intent: "Start the CDE exam",
        print: "lto-form",
        printLabel: "Preview renewal application",
      },
    };
  }

  if (q.includes("tax") || q.includes("bir") || q.includes("tin")) {
    return {
      steps: [
        step(
          "identity",
          "Verifying your identity",
          "PhilSys eVerify",
          "Identity confirmed · taxpayer matched",
          900
        ),
        step(
          "records",
          "Retrieving your taxpayer registration",
          "BIR",
          "TIN active · RDO 41A, Mandaluyong",
          1350
        ),
        step(
          "search",
          "Checking your 2025 filing status",
          "BIR eFPS",
          "Filed via substituted filing",
          1450
        ),
        step(
          "file",
          "Listing available tax documents",
          "BIR",
          "ITR copy · Tax Clearance Certificate",
          1000
        ),
      ],
      text: `Your BIR records show your **TIN is active** and registered under **RDO 41A (Mandaluyong)**. Your **${Number(D.year) - 1} annual income tax return** was filed by your employer under **substituted filing** — **no action needed** from you this year. Would you like a Tax Clearance Certificate or a copy of your ITR?`,
    };
  }

  if (/\b(hi|hello|hey|kumusta|mabuhay|salamat|thanks|thank you)\b/.test(q)) {
    return {
      steps: [],
      text: `Walang anuman, ${user.firstName}! I'm here anytime. I can help you with passports, NBI clearance, SSS, PhilHealth, Pag-IBIG, LTO transactions, business permits, and **200+ other government services** — just ask.`,
    };
  }

  return {
    steps: [
      step(
        "spark",
        "Understanding your request",
        "eGov Agent",
        "Intent mapped to government services",
        950
      ),
      step(
        "search",
        "Searching 34 connected agencies",
        "Service Directory",
        "Matched related services and records",
        1450
      ),
      step(
        "shield",
        "Checking what I can do on your behalf",
        "eGov Agent",
        "Actions available with your consent",
        1100
      ),
    ],
    text: `I can help you with that. As your eGov Agent, I have secure access to your records across **34 connected agencies** — DFA, NBI, SSS, PhilHealth, Pag-IBIG, LTO, BIR, and more. Try asking me to **renew a document**, **check a record**, **book an appointment**, or **pay a government fee**.`,
  };
}
