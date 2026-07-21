/* Pre-filled printable government documents.
 *
 * Two modes:
 *  - "overlay": a scan of the REAL agency form is the page background and the
 *    user's data is absolutely positioned on top of the actual field lines.
 *  - "generated": system-issued documents (passes, receipts, statements) that
 *    have no blank official form — rendered as clean eGov-generated documents.
 */

import { DEMO_DATES as D } from "./dates";
import {
  eTravelReference,
  hasCompleteETravelDetails,
  type ETravelDetails,
} from "./ai-contract";

export type PrintKind =
  | "dfa-form"
  | "dfa-pass"
  | "nbi-form"
  | "nbi-receipt"
  | "lto-receipt"
  | "ereport-receipt"
  | "sss-statement"
  | "ph-mdr"
  | "lto-form"
  | "postal-pass"
  | "etravel-qr"
  | "psa-request";

export type PrintUser = { name: string; firstName: string; pcn: string };
export type PrintContext = { eTravel?: ETravelDetails };

export const PRINT_FILE_PREVIEWS: Record<
  PrintKind,
  { name: string; preview?: string; stampIndex: number }
> = {
  "dfa-form": {
    name: "DFA Passport Application.pdf",
    preview: "/forms/dfa-passport.png",
    stampIndex: 0,
  },
  "dfa-pass": { name: "DFA Appointment Pass.pdf", stampIndex: 1 },
  "nbi-form": { name: "NBI Clearance Application.pdf", stampIndex: 2 },
  "nbi-receipt": { name: "NBI Official Receipt.pdf", stampIndex: 3 },
  "lto-receipt": { name: "LTO eReceipt.pdf", stampIndex: 0 },
  "ereport-receipt": { name: "eReport Acknowledgement.pdf", stampIndex: 2 },
  "sss-statement": { name: "SSS Contribution Statement.pdf", stampIndex: 0 },
  "ph-mdr": {
    name: "PhilHealth PMRF.pdf",
    preview: "/forms/philhealth-pmrf.png",
    stampIndex: 1,
  },
  "lto-form": {
    name: "LTO Form 21.pdf",
    preview: "/forms/lto-apl.png",
    stampIndex: 2,
  },
  "postal-pass": { name: "Postal ID Appointment Pass.pdf", stampIndex: 3 },
  "etravel-qr": { name: "eTravel QR Declaration.pdf", stampIndex: 1 },
  "psa-request": { name: "PSA Certificate Request.pdf", stampIndex: 2 },
};

/* ------------------------------ overlay forms ------------------------------ */

type OverlayField = {
  x: number; // % of sheet width
  y: number; // % of sheet height
  text: string;
  size?: number; // font-size in % of sheet width (default 1.05)
  spacing?: number; // letter-spacing in % of sheet width, for boxed grids
  check?: boolean; // render as a checkmark
};

type OverlaySpec = {
  image: string;
  title: string;
  fields: OverlayField[];
};

function overlaySpec(kind: PrintKind, user: PrintUser): OverlaySpec | null {
  const nameParts = user.name.toUpperCase().trim().split(/\s+/).filter(Boolean);
  const suffix = /^(?:JR\.?|SR\.?|II|III|IV|V|VI)$/.test(nameParts.at(-1) ?? "")
    ? nameParts.pop() ?? ""
    : "";
  const first = nameParts.shift() || "JOSE";
  const middle = nameParts.length > 1 ? nameParts.shift() ?? "" : "";
  const last = nameParts.join(" ") || "DELA PEÑA";
  const lastWithSuffix = [last, suffix].filter(Boolean).join(" ");

  if (kind === "dfa-form") {
    return {
      image: "/forms/dfa-passport.png",
      title: "DFA Passport Application — Pre-filled",
      fields: [
        { x: 13, y: 16.4, text: last },
        { x: 51.8, y: 16.4, text: `${first} ${middle}` },
        { x: 13, y: 20.9, text: suffix || "N/A" },
        { x: 51.8, y: 20.9, text: "MANDALUYONG CITY, PHILIPPINES" },
        { x: 14.5, y: 25.0, text: "MARCH" },
        { x: 31.5, y: 25.0, text: "8" },
        { x: 39.5, y: 25.0, text: "1998" },
        { x: 67.9, y: 25.65, text: "✓", check: true },
        { x: 25.0, y: 33.9, text: "✓", check: true },
        { x: 22.5, y: 35.5, text: "MANDALUYONG CITY, METRO MANILA" },
        { x: 74.5, y: 35.5, text: "N/A" },
        { x: 23.0, y: 37.0, text: "SOFTWARE ENGINEER" },
        { x: 76.5, y: 37.0, text: "0917•••4482" },
        { x: 20.5, y: 38.5, text: "N/A" },
        { x: 74.5, y: 38.5, text: "N/A" },
        { x: 19.5, y: 40.0, text: "JOS••••@YOPMAIL.COM" },
        { x: 26.0, y: 41.5, text: "N/A" },
        { x: 18.5, y: 43.0, text: "N/A" },
        { x: 32.0, y: 44.5, text: "N/A" },
        { x: 12.0, y: 50.1, text: "✓", check: true },
        { x: 41.4, y: 52.5, text: "✓", check: true },
        { x: 79.2, y: 52.5, text: "✓", check: true },
        { x: 68.5, y: 53.9, text: "P4519028B" },
        { x: 58.0, y: 55.4, text: "MAR 15, 2017" },
        { x: 78.5, y: 55.4, text: "DFA NCR EAST" },
      ],
    };
  }

  if (kind === "ph-mdr") {
    return {
      image: "/forms/philhealth-pmrf.png",
      title: "PhilHealth PMRF — Pre-filled",
      fields: [
        { x: 64.6, y: 9.6, text: "080255184123", size: 1.3, spacing: 1.87 },
        { x: 59.9, y: 14.3, text: "✓", check: true },
        { x: 14.5, y: 25.2, text: lastWithSuffix },
        { x: 38.0, y: 25.2, text: first },
        { x: 73.0, y: 25.2, text: middle },
        { x: 4.9, y: 35.3, text: "03", size: 1.3, spacing: 2.12 },
        { x: 12.5, y: 35.3, text: "08", size: 1.3, spacing: 2.12 },
        { x: 20.3, y: 35.3, text: "1998", size: 1.3, spacing: 1.9 },
        { x: 30.8, y: 36.2, text: "MANDALUYONG CITY, PHILIPPINES", size: 1.15 },
        { x: 3.9, y: 39.4, text: "✓", check: true },
        { x: 11.4, y: 39.2, text: "✓", check: true },
        { x: 29.7, y: 39.4, text: "✓", check: true },
        { x: 4.5, y: 48.3, text: "MANDALUYONG CITY, METRO MANILA", size: 1.15 },
        { x: 70.0, y: 52.0, text: "0917 ••• 4482", size: 1.2 },
        { x: 70.0, y: 58.5, text: "JOS••••@YOPMAIL.COM", size: 1.15 },
        { x: 4.1, y: 79.4, text: "✓", check: true },
      ],
    };
  }

  if (kind === "lto-form") {
    return {
      image: "/forms/lto-apl.png",
      title: "LTO Form 21 (APL) — Pre-filled",
      fields: [
        { x: 4.0, y: 16.9, text: `${last}, ${first} ${middle} ${suffix}`.trim(), size: 1.25, spacing: 1.0 },
        { x: 4.0, y: 19.3, text: "MANDALUYONG CITY, METRO MANILA", size: 1.2 },
        { x: 57.0, y: 19.3, text: "0917 ••• 4482", size: 1.2 },
        { x: 4.0, y: 21.6, text: "FILIPINO", size: 1.2 },
        { x: 15.0, y: 21.6, text: "M", size: 1.2 },
        { x: 23.0, y: 21.6, text: "1998/03/08", size: 1.2 },
        { x: 40.0, y: 21.6, text: "175", size: 1.2 },
        { x: 49.5, y: 21.6, text: "70", size: 1.2 },
        { x: 64.4, y: 21.1, text: "N03", size: 1.25, spacing: 1.28 },
        { x: 74.3, y: 21.1, text: "12", size: 1.25, spacing: 1.28 },
        { x: 80.5, y: 21.1, text: "345678", size: 1.25, spacing: 1.28 },
        { x: 57.0, y: 23.5, text: "MANDALUYONG", size: 1.2 },
        { x: 3.9, y: 23.6, text: "✓", check: true },
        { x: 3.7, y: 29.8, text: "✓", check: true },
        { x: 3.8, y: 40.0, text: "✓", check: true },
        { x: 4.5, y: 62.3, text: "✓", check: true },
        { x: 8.5, y: 62.3, text: "✓", check: true },
      ],
    };
  }

  return null;
}

function overlayHTML(spec: OverlaySpec) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fields = spec.fields
    .map((f) => {
      const size = f.check ? 1.8 : (f.size ?? 1.35);
      const spacing = f.spacing ? `letter-spacing:${f.spacing}vw;` : "";
      return `<span class="v" style="left:${f.x}%;top:${f.y}%;font-size:${size}vw;${spacing}color:#000;">${f.text}</span>`;
    })
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${spec.title}</title><style>
  @page { margin: 0; }
  * { box-sizing: border-box; margin: 0; }
  body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sheet { position: relative; width: 100vw; }
  .sheet img { display: block; width: 100%; height: auto; }
  .v { position: absolute; transform: translateY(-50%); font-family: "Courier New", ui-monospace, monospace; font-weight: 700; white-space: nowrap; }
  </style></head><body>
  <div class="sheet">
    <img src="${origin}${spec.image}" alt="${spec.title}" />
    ${fields}
  </div>
  </body></html>`;
}

/* ---------------------------- generated documents --------------------------- */

type GeneratedSpec = {
  seal: { initials: string; color: string; fullName: string };
  formNo: string;
  title: string;
  ref: string;
  sections: { heading: string; fields: { label: string; value: string }[] }[];
  checks: string[];
  note: string;
  qrLabel?: string;
};

const SEALS = {
  dfa: { initials: "DFA", color: "#0b3d91", fullName: "Department of Foreign Affairs" },
  nbi: { initials: "NBI", color: "#1b2a6b", fullName: "National Bureau of Investigation" },
  sss: { initials: "SSS", color: "#003da5", fullName: "Social Security System" },
  phlpost: { initials: "PHL", color: "#8a6d1a", fullName: "Philippine Postal Corporation" },
  lto: { initials: "LTO", color: "#005b3c", fullName: "Land Transportation Office" },
  ereport: { initials: "eR", color: "#0a4f9e", fullName: "eGov eReport" },
  etravel: { initials: "eT", color: "#006b54", fullName: "Philippine eTravel" },
  psa: { initials: "PSA", color: "#123f78", fullName: "Philippine Statistics Authority" },
};

function generatedSpec(
  kind: PrintKind,
  user: PrintUser,
  context?: PrintContext
): GeneratedSpec | null {
  const personal = [
    { label: "Full name", value: user.name },
    { label: "PhilSys card number", value: user.pcn },
    { label: "Email", value: "jos••••@yopmail.com" },
    { label: "Mobile", value: "+63 917 ••• 4482" },
    { label: "Address", value: "Mandaluyong City, Metro Manila" },
  ];

  switch (kind) {
    case "dfa-pass":
      return {
        seal: SEALS.dfa,
        formNo: "DFA-PASS-01",
        title: "Appointment Pass",
        ref: D.dfaRef,
        sections: [
          {
            heading: "Appointment details",
            fields: [
              { label: "Applicant", value: user.name },
              { label: "PhilSys card number", value: user.pcn },
              { label: "Service", value: "ePassport Renewal" },
              { label: "Site", value: "DFA CO SM Megamall, Mandaluyong" },
              { label: "Date", value: D.dfaLong },
              { label: "Time", value: "10:30 AM" },
            ],
          },
        ],
        checks: [
          "Bring your current ePassport",
          "Arrive 15 minutes before your slot",
          "Confirmation also sent via email and SMS",
        ],
        note: "Show this pass (printed or on your phone) at the entrance. Verified against DFA records via eGov Agent.",
      };
    case "nbi-form":
      return {
        seal: SEALS.nbi,
        formNo: "NBI-CL-ONLINE (2026)",
        title: "Clearance Application — Online",
        ref: D.nbiAppRef,
        sections: [
          { heading: "Personal information", fields: personal },
          {
            heading: "Application details",
            fields: [
              { label: "Purpose", value: "Local employment" },
              { label: "Biometrics", value: "On file — captured 2024" },
              { label: "Delivery", value: "Digital copy + courier" },
              { label: "Total fee", value: "₱180.00" },
            ],
          },
        ],
        checks: [
          "Identity verified via PhilSys eVerify",
          "No branch visit required",
          "Digital copy issued within ~10 minutes of payment",
        ],
        note: "Application pre-filled from your PhilSys record via eGov Agent. Pay through eGov Pay to complete.",
      };
    case "nbi-receipt":
      return {
        seal: SEALS.nbi,
        formNo: `eOR Series ${D.year}`,
        title: "Electronic Official Receipt",
        ref: `OR № ${D.orRef}`,
        sections: [
          {
            heading: "Payment details",
            fields: [
              { label: "Paid by", value: user.name },
              { label: "Service", value: "NBI Clearance (Online)" },
              { label: "Amount", value: "₱180.00" },
              { label: "Method", value: "eGov Pay wallet" },
              { label: "eGovPay reference", value: D.nbiPaymentRef },
              { label: "Date", value: D.todayMDY },
              { label: "Status", value: "Paid — clearance processing" },
            ],
          },
        ],
        checks: [
          "Digital clearance will be emailed within ~10 minutes",
          "Courier copy follows in 2–3 working days",
        ],
        note: "Electronic receipt generated after eGovPay payment confirmation. Verify using the transaction reference above.",
      };
    case "lto-receipt":
      return {
        seal: SEALS.lto,
        formNo: `eOR Series ${D.year}`,
        title: "Electronic Official Receipt",
        ref: `OR № ${D.ltoOrRef}`,
        sections: [
          {
            heading: "Payment details",
            fields: [
              { label: "Paid by", value: user.name },
              { label: "Service", value: "LTO OGA violation settlement" },
              { label: "Case", value: "TRX-LETAS-260210-4507860" },
              { label: "Amount", value: "₱1,000.00" },
              { label: "Method", value: "eGov Pay wallet" },
              { label: "eGovPay reference", value: D.ltoPaymentRef },
              { label: "Date", value: D.todayMDY },
              { label: "Status", value: "Paid — alarm lift requested" },
            ],
          },
        ],
        checks: [
          "Payment confirmation posted to the OGA interface",
          "Alarm lift request submitted to LTO",
        ],
        note: "Electronic receipt generated after eGovPay payment confirmation. Verify using the transaction reference above.",
      };
    case "ereport-receipt":
      return {
        seal: SEALS.ereport,
        formNo: `eReport Series ${D.year}`,
        title: "eReport Submission Acknowledgement",
        ref: D.eReportRef,
        sections: [
          {
            heading: "Incident report",
            fields: [
              { label: "Reported by", value: user.name },
              { label: "Incident", value: "Severe street flooding" },
              { label: "Priority", value: "URGENT — public safety" },
              { label: "Location", value: "Pioneer St. near Reliance St., Mandaluyong" },
              { label: "Coordinates", value: "14.5778, 121.0537" },
              { label: "Submitted", value: `${D.todayMDY} · ${D.todayTime}` },
              { label: "Status", value: "Dispatched — tracking active" },
            ],
          },
          {
            heading: "Multi-agency dispatch",
            fields: [
              { label: "Primary responder", value: "Mandaluyong CDRRMO" },
              { label: "Local desk", value: "Barangay Highway Hills" },
              { label: "Traffic coordination", value: "MMDA Metrobase" },
              { label: "Flood-control copy", value: "DPWH NCR" },
              { label: "Field assessment", value: "Estimated 15–20 minutes" },
            ],
          },
        ],
        checks: [
          "Reporter identity verified through PhilSys",
          "Incident evidence and coordinates attached",
          "SMS and in-app status notifications enabled",
        ],
        note: "Dispatch acknowledgement generated after report submission. Response estimates are provided by the receiving desks.",
      };
    case "sss-statement":
      return {
        seal: SEALS.sss,
        formNo: "SSS-STMT (2026)",
        title: "Contribution Statement",
        ref: "SSS-STMT-2026-07",
        sections: [
          {
            heading: "Member information",
            fields: [
              { label: "Member name", value: user.name },
              { label: "SSS number", value: "34-2258901-5" },
              { label: "PhilSys card number", value: user.pcn },
              { label: "Status", value: "Active — Employed" },
            ],
          },
          {
            heading: "Recent postings",
            fields: [
              { label: D.sssMonth1, value: "₱1,830.00 — Posted" },
              { label: D.sssMonth2, value: "₱1,830.00 — Posted" },
              { label: D.sssMonth3, value: "₱1,830.00 — Posted" },
            ],
          },
          {
            heading: "Summary",
            fields: [
              { label: "Total contributions", value: "₱142,470.00" },
              { label: "Months posted", value: "87" },
              { label: "Posted through", value: D.sssMonth1 },
            ],
          },
        ],
        checks: ["All employer contributions posted and up to date"],
        note: "Statement generated from live SSS records via eGov Agent on your request.",
      };
    case "postal-pass":
      return {
        seal: SEALS.phlpost,
        formNo: "PHLPOST-PID-01",
        title: "Postal ID Capture — Appointment Pass",
        ref: D.postalRef,
        sections: [
          {
            heading: "Appointment details",
            fields: [
              { label: "Applicant", value: user.name },
              { label: "PhilSys card number", value: user.pcn },
              { label: "Service", value: "Postal ID — biometrics capture" },
              { label: "Site", value: "Mandaluyong Central Post Office" },
              { label: "Date", value: D.postalLong },
              { label: "Time", value: "9:00 AM" },
            ],
          },
          {
            heading: "Attached from your document vault",
            fields: [
              { label: "Identity", value: "PSA Birth Certificate.pdf" },
              { label: "Proof of address", value: `Meralco bill (${D.sssMonth1})` },
              { label: "Photo", value: "2×2 ID Photo.jpg" },
            ],
          },
        ],
        checks: [
          "Application pre-filled — nothing to fill out on site",
          "Fee ₱504.00 payable via eGov Pay",
          "Reminders: SMS + email, per your saved preference",
        ],
        note: `Scheduled around your existing DFA appointment (${D.dfaShort}). Assembled automatically from your eGov memory and document vault.`,
      };
    case "etravel-qr": {
      const details = context?.eTravel;
      if (!details || !hasCompleteETravelDetails(details)) return null;

      const travelerType =
        details.direction === "arrival"
          ? "Arriving passenger"
          : "Departing passenger";
      const schedule = new Date(
        `${details.travelDate}T12:00:00`
      ).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const reference = eTravelReference(details);

      return {
        seal: SEALS.etravel,
        formNo: "PH-eTRAVEL",
        title: "Electronic Travel Declaration",
        ref: reference,
        sections: [
          {
            heading: "Traveler",
            fields: [
              { label: "Full name", value: user.name },
              { label: "Identity", value: "Verified through eGovPH" },
              { label: "Nationality", value: "Filipino" },
              { label: "Traveler type", value: travelerType },
            ],
          },
          {
            heading: "Journey",
            fields: [
              {
                label: "Route",
                value: `${details.origin} → ${details.destination}`,
              },
              { label: "Flight", value: details.flightNumber },
              {
                label: "Travel schedule",
                value: `${schedule} · ${details.travelTime}`,
              },
              { label: "Status", value: "Registered · QR issued" },
            ],
          },
        ],
        checks: [
          "Declaration submitted with the user's consent",
          "Keep this QR available before flight boarding",
          "A new registration is required for each trip",
        ],
        note: "eTravel registration is free. This record contains only the data shared for this travel declaration.",
        qrLabel: reference,
      };
    }
    case "psa-request":
      return {
        seal: SEALS.psa,
        formNo: "PSA-CRD-ONLINE",
        title: "Civil Registry Document Request",
        ref: `PSA-REQ-${D.year}-2714`,
        sections: [
          {
            heading: "Request",
            fields: [
              { label: "Requesting party", value: user.name },
              { label: "Document", value: "Certificate of Live Birth" },
              { label: "Copies", value: "1" },
              { label: "Purpose", value: "Personal record" },
            ],
          },
          {
            heading: "Fulfilment",
            fields: [
              { label: "Identity", value: "Verified through eGovPH" },
              { label: "Delivery city", value: "Mandaluyong City" },
              { label: "Agency quote", value: "Returned before payment" },
              { label: "Status", value: "Request received" },
            ],
          },
        ],
        checks: [
          "Identity and registered address reviewed by the user",
          "Agency processing and delivery quote shown before payment",
          "Status notifications enabled by SMS and email",
        ],
        note: "This is the request acknowledgement, not the civil-registry certificate. PSA remains the issuing authority.",
      };
    default:
      return null;
  }
}

function generatedHTML(spec: GeneratedSpec) {
  const escapeHTML = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[character] || character
    );
  const generated = new Date().toLocaleString("en-PH", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const fieldBox = (f: { label: string; value: string }) =>
    `<div class="f"><div class="l">${escapeHTML(f.label)}</div><div class="v">${escapeHTML(f.value)}</div></div>`;
  const section = (s: GeneratedSpec["sections"][number]) =>
    `<h3 class="sec">${escapeHTML(s.heading)}</h3><div class="grid">${s.fields
      .map(fieldBox)
      .join("")}</div>`;
  const check = (c: string) =>
    `<div class="check"><span class="box x"></span>${escapeHTML(c)}</div>`;
  const qr = spec.qrLabel
    ? `<div class="qrrow">
        <div class="qr" aria-label="Travel QR code">
          <span class="finder tl"></span><span class="finder tr"></span><span class="finder bl"></span>
        </div>
        <div><div class="qrtitle">eTravel QR</div><div class="qrref">${escapeHTML(spec.qrLabel)}</div><div class="qrhint">Present before flight boarding</div></div>
      </div>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHTML(spec.title)} — ${escapeHTML(spec.ref)}</title><style>
  * { box-sizing: border-box; margin: 0; }
  body { font-family: -apple-system, "Segoe UI", Arial, sans-serif; color: #111; padding: 44px 52px; }
  .head { display: flex; align-items: center; gap: 16px; border-bottom: 3px double #333; padding-bottom: 14px; }
  .seal { width: 58px; height: 58px; border-radius: 50%; background: ${spec.seal.color}; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; letter-spacing: .5px; border: 2px solid #fff; box-shadow: 0 0 0 2px ${spec.seal.color}; flex-shrink: 0; }
  .rep { font-size: 10.5px; letter-spacing: 1.6px; text-transform: uppercase; color: #444; }
  .agency { font-size: 17px; font-weight: 700; margin-top: 2px; }
  .formno { margin-left: auto; text-align: right; font-size: 10.5px; color: #555; font-family: ui-monospace, monospace; }
  .titlebar { margin-top: 18px; background: #f0f4fa; border: 1px solid #c9d6e8; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; }
  .title { font-size: 14.5px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; }
  .ref { font-family: ui-monospace, monospace; font-size: 12px; }
  .chip { display: inline-block; margin-top: 13px; font-size: 9.5px; letter-spacing: 1.3px; padding: 4px 11px; border: 1px solid #0a4f9e; color: #0a4f9e; border-radius: 999px; text-transform: uppercase; }
  h3.sec { margin: 22px 0 8px; font-size: 10.5px; letter-spacing: 1.5px; text-transform: uppercase; color: #0a4f9e; border-bottom: 1px solid #dbe4f0; padding-bottom: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; }
  .f { border: 1px solid #cfd8e3; border-radius: 6px; padding: 7px 10px; }
  .f .l { font-size: 8.5px; letter-spacing: 1.1px; text-transform: uppercase; color: #667; }
  .f .v { font-size: 13px; font-weight: 600; margin-top: 3px; }
  .checks { margin-top: 18px; }
  .check { display: flex; gap: 9px; font-size: 12px; margin-top: 7px; align-items: center; }
  .box { width: 12px; height: 12px; border: 1.5px solid #333; display: inline-block; position: relative; flex-shrink: 0; }
  .box.x:after { content: "✓"; position: absolute; top: -4px; left: 1px; font-size: 13px; }
  .sig { display: grid; grid-template-columns: 1fr 1fr; gap: 44px; margin-top: 48px; }
  .sigline { border-top: 1px solid #333; padding-top: 5px; font-size: 9.5px; text-transform: uppercase; letter-spacing: 1.1px; color: #444; text-align: center; }
  .barcode { margin-top: 30px; height: 42px; background: repeating-linear-gradient(90deg, #111 0 2px, transparent 2px 5px, #111 5px 6px, transparent 6px 10px); }
  .foot { margin-top: 9px; display: flex; justify-content: space-between; font-size: 9.5px; color: #666; font-family: ui-monospace, monospace; }
  .note { margin-top: 18px; font-size: 11px; color: #555; border-left: 3px solid #0a4f9e; padding: 7px 11px; background: #f7faff; }
  .qrrow { display: flex; align-items: center; gap: 18px; margin-top: 22px; padding: 16px; background: #f4faf8; }
  .qr { position: relative; width: 112px; height: 112px; flex: 0 0 auto; background:
    linear-gradient(90deg, #101820 12%, transparent 12% 24%, #101820 24% 34%, transparent 34% 48%, #101820 48% 57%, transparent 57% 69%, #101820 69% 83%, transparent 83%),
    linear-gradient(#101820 11%, transparent 11% 22%, #101820 22% 37%, transparent 37% 51%, #101820 51% 63%, transparent 63% 77%, #101820 77% 88%, transparent 88%);
    background-color: #fff; box-shadow: inset 0 0 0 8px #fff; }
  .finder { position: absolute; width: 30px; height: 30px; background: #101820; box-shadow: inset 0 0 0 6px #fff, inset 0 0 0 10px #101820; }
  .finder.tl { left: 8px; top: 8px; } .finder.tr { right: 8px; top: 8px; } .finder.bl { left: 8px; bottom: 8px; }
  .qrtitle { font-size: 15px; font-weight: 750; color: #006b54; }
  .qrref { margin-top: 7px; font: 11px ui-monospace, monospace; color: #334155; }
  .qrhint { margin-top: 7px; font-size: 10.5px; color: #64748b; }
  @media print { body { padding: 20px 28px; } }
  </style></head><body>
  <div class="head">
    <div class="seal">${escapeHTML(spec.seal.initials)}</div>
    <div>
      <div class="rep">Republic of the Philippines</div>
      <div class="agency">${escapeHTML(spec.seal.fullName)}</div>
    </div>
    <div class="formno">${escapeHTML(spec.formNo)}<br/>eGov PH · e.gov.ph</div>
  </div>
  <div class="titlebar"><span class="title">${escapeHTML(spec.title)}</span><span class="ref">${escapeHTML(spec.ref)}</span></div>
  <span class="chip">Pre-filled via eGov Agent · PhilSys verified</span>
  ${spec.sections.map(section).join("")}
  ${qr}
  <div class="checks">${spec.checks.map(check).join("")}</div>
  <div class="note">${escapeHTML(spec.note)}</div>
  <div class="sig"><div class="sigline">Signature of applicant</div><div class="sigline">Authorized officer</div></div>
  <div class="barcode"></div>
  <div class="foot"><span>${escapeHTML(spec.ref)}</span><span>Generated ${escapeHTML(generated)}</span></div>
  </body></html>`;
}

/* --------------------------------- public API ------------------------------- */

export function buildFormHTML(
  kind: PrintKind,
  user: PrintUser,
  context?: PrintContext
): string {
  const overlay = overlaySpec(kind, user);
  if (overlay) return overlayHTML(overlay);
  const generated = generatedSpec(kind, user, context);
  if (generated) return generatedHTML(generated);
  return "";
}

export function previewForm(kind: PrintKind, user: PrintUser) {
  const html = buildFormHTML(kind, user);
  if (!html) return;
  const w = window.open("", "_blank", "width=860,height=1100");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
}
