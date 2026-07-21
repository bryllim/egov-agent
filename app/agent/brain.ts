/* Scripted demo brain — types, seeded data, and the intent → plan mapping.
   Shared by the chat page (app/agent/page.tsx) and the shell (shell.tsx). */

import { type PrintKind } from "./forms";
import { DEMO_DATES as D } from "./dates";

/* ---------------------------------- types --------------------------------- */

/* Buttons on a card can continue the conversation (intent) and/or print a
   pre-filled government form (print). */
export type CardBase = {
  intent?: string;
  print?: PrintKind;
  printLabel?: string;
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

export type Attachment = { name: string; href: string };

export type Msg = {
  id: number;
  role: "user" | "agent";
  text: string;
  card?: Card;
  trace?: TraceStep[];
  elapsed?: string;
  attachments?: Attachment[];
};

export type User = { name: string; firstName: string; pcn: string; photoSrc?: string };

export type Conversation = { id: string; title: string; messages: Msg[] };

export type AgentActivity = {
  steps: TraceStep[];
  currentIndex: number;
  startedAt: number;
  phase: "thinking" | "working" | "typing";
};

export const THINKING_DELAY_MS = 5000;

export const DEMO_PROFILE = {
  name: "Bryl Kezter Lim",
  firstName: "Bryl",
  photoSrc: "/brylphoto.jpg",
};

export function subscribeToSessionStorage(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

export function getSessionUserSnapshot() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("egov-user");
}

export function getServerSessionUserSnapshot() {
  return null;
}

export function readDemoUser(raw: string | null): User | null {
  if (!raw) return null;

  try {
    return { ...(JSON.parse(raw) as User), ...DEMO_PROFILE };
  } catch {
    return null;
  }
}

/* ----------------------------- scripted brain ----------------------------- */

export const SUGGESTIONS = [
  "Find the nearest DFA office",
  "Renew my passport",
  "Get an NBI clearance",
  "Check my SSS contributions",
  "PhilHealth member record",
  "Check my LTO violations",
];

export const RECENT_CONVERSATIONS = [
  "Can you help me renew my passport?",
  "Check if I have any LTO violations",
  "Please show my PhilHealth member record.",
];

export const SEED_ELAPSED = ["11.2s", "9.8s", "12.6s", "10.4s", "13.1s"];

/* Pre-generate a realistic transcript for each seeded conversation */
export function seedConversation(
  title: string,
  user: User,
  index: number
): Conversation {
  const plan = agentPlan(title, user);
  const base = 900000 + index * 10;
  return {
    id: `seed-${index}`,
    title,
    messages: [
      { id: base + 1, role: "user", text: title },
      {
        id: base + 2,
        role: "agent",
        text: plan.text,
        card: plan.card,
        trace: plan.steps.length ? plan.steps : undefined,
        attachments: plan.attachments,
        elapsed: plan.steps.length
          ? SEED_ELAPSED[index % SEED_ELAPSED.length]
          : undefined,
      },
    ],
  };
}

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
    name: "PSA Birth Certificate.pdf",
    href: "/vault/psa-birth-certificate.pdf",
  },
  meralco: {
    name: "Proof of Billing — Meralco.pdf",
    href: "/vault/meralco-bill.pdf",
  },
  photo: { name: "2x2 ID Photo.jpg", href: "/vault/2x2-id-photo.jpg" },
  brgyClearance: {
    name: "Barangay Clearance.pdf",
    href: "/vault/barangay-clearance.pdf",
  },
};

export function agentPlan(input: string, user: User): Plan {
  const q = input.toLowerCase();

  /* ---- follow-up actions triggered by card buttons (checked first) ---- */

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
        action: "Print appointment pass",
        print: "dfa-pass",
      },
    };
  }

  if (q.includes("pay") && (q.includes("nbi") || q.includes("clearance"))) {
    return {
      steps: [
        step(
          "payment",
          "Charging your eGov Pay wallet",
          "eGov Pay",
          `₱180.00 paid · OR № ${D.orRef}`,
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
      text: `Payment received — **₱180.00** charged to your eGov Pay wallet. Your NBI Clearance is being generated now; the **digital copy lands in your email in about 10 minutes**, and the courier copy follows in **2–3 days**. Here's your official receipt.`,
      card: {
        kind: "record",
        title: "NBI Clearance — Official Receipt",
        fields: [
          { label: "OR number", value: D.orRef },
          { label: "Amount paid", value: "₱180.00" },
          { label: "Paid via", value: "eGov Pay wallet" },
          { label: "Status", value: "Processing · ~10 mins" },
        ],
        action: "Print official receipt",
        print: "nbi-receipt",
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
          "Sent to bry••••@gmail.com",
          1100
        ),
      ],
      text: `Done! Your **certified Member Data Record** is signed and on its way to **bry••••@gmail.com**. It carries a **QR code** that any employer or hospital can scan to verify it's authentic — no more falling in line at a PhilHealth office.`,
      card: {
        kind: "record",
        title: "PhilHealth Certified MDR — Issued",
        fields: [
          { label: "Document no.", value: D.mdrRef },
          { label: "Sent to", value: "bry••••@gmail.com" },
          { label: "Signature", value: "PhilHealth e-seal + QR" },
          { label: "Status", value: "Delivered" },
        ],
        action: "Print MDR copy",
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
          "Link sent to bry••••@gmail.com",
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
        action: "Print renewal application",
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
        action: "Print appointment pass",
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
        printLabel: "Print pre-filled application",
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
        action: "Pay with eGov Pay",
        intent: "Pay the NBI clearance fee with eGov Pay",
        print: "nbi-form",
        printLabel: "Print pre-filled application",
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
        printLabel: "Print contribution statement",
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
          "Checking premium payment history",
          "PhilHealth",
          `Premiums current through ${D.sssMonth1}`,
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
      text: `Your PhilHealth membership is **active** and your **premiums are up to date**. Here's your Member Data Record — I can send a **certified digital copy** to your registered email if you need one for employment or hospital admission.`,
      card: {
        kind: "record",
        title: "PhilHealth Member Data Record",
        fields: [
          { label: "PIN", value: "08-025518412-3" },
          { label: "Member type", value: "Direct Contributor — Employed" },
          { label: "Status", value: "Premiums up to date" },
          { label: "Dependents", value: "2 registered" },
        ],
        action: "Email certified MDR",
        intent: "Email my certified MDR",
        print: "ph-mdr",
        printLabel: "Print MDR copy",
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
    (q.includes("pay") || q.includes("payment") || q.includes("proceed")) &&
    (q.includes("lto") || q.includes("oga") || q.includes("violation"))
  ) {
    return {
      steps: [
        step(
          "payment",
          "Opening the settlement channel",
          "eGov Pay",
          "LTO OGA case linked · payment window prepared",
          1100
        ),
        step(
          "records",
          "Notifying OGA interface",
          "LTO Violations",
          "Case TRX-LETAS-260210-4507860 queued for settlement",
          1300
        ),
        step(
          "shield",
          "Preparing alarm lift request",
          "LTO",
          "Transactions unlock after OGA payment confirmation",
          1150
        ),
      ],
      text: `I prepared the payment handoff for case **TRX-LETAS-260210-4507860**. Once the OGA payment is confirmed, the **alarm lift request** is sent back to LTO so your **blocked transactions can reopen**.`,
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
        printLabel: "Print renewal application",
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
