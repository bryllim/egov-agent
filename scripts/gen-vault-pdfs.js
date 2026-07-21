/* Hand-rolled single-page PDFs (no deps) for the demo document vault. */
const fs = require("fs");
const path = require("path");

const _now = new Date();
const _last = new Date(_now.getFullYear(), _now.getMonth() - 1, 1);
const _lastEnd = new Date(_now.getFullYear(), _now.getMonth(), 0);
const _first = new Date(_now.getFullYear(), _now.getMonth(), 1);
const _due = new Date(_now.getFullYear(), _now.getMonth(), 12);
const MON = (d) => d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
const MONL = (d) => d.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();
const DMY = (d) => `${MON(d)} ${String(d.getDate()).padStart(2, "0")}, ${d.getFullYear()}`;
const BILL_MONTH = MONL(_last);
const BILL_PERIOD = `${MON(_last)} 01 - ${DMY(_lastEnd)}`;
const BILL_DATE = DMY(_first);
const DUE_DATE = DMY(_due);
const TODAY = DMY(_now);
const OUT = "/Users/bryllim/Developer/egov-agent/public/vault";
fs.mkdirSync(OUT, { recursive: true });

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

// content-stream helpers (origin bottom-left, page 612x792)
const T = (x, y, size, font, str) =>
  `BT /${font} ${size} Tf ${x} ${y} Td (${esc(str)}) Tj ET`;
const RECT = (x, y, w, h) => `${x} ${y} ${w} ${h} re S`;
const FRECT = (x, y, w, h) => `${x} ${y} ${w} ${h} re f`;
const LINE = (x1, y1, x2, y2) => `${x1} ${y1} m ${x2} ${y2} l S`;
const GRAY = (g) => `${g} g`;
const WIDTH = (w) => `${w} w`;

function centered(str, size, isBold) {
  // Helvetica avg width ~0.5 * size per char (rough centering for demo)
  const w = str.length * size * (isBold ? 0.55 : 0.5);
  return (612 - w) / 2;
}
const CT = (y, size, font, str) =>
  T(centered(str, size, font === "F2"), y, size, font, str);

function barcode(x, y, w, h) {
  const cmds = [GRAY(0)];
  let cx = x;
  let seed = 7;
  while (cx < x + w) {
    seed = (seed * 31 + 17) % 97;
    const bw = 1 + (seed % 3);
    if (seed % 2 === 0) cmds.push(FRECT(cx, y, bw, h));
    cx += bw + 2;
  }
  return cmds;
}

function buildPdf(commands) {
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => {
    pdf += `${String(o).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

function field(x, y, label, value, valueSize = 11) {
  return [
    GRAY(0.45),
    T(x, y, 7, "F1", label.toUpperCase()),
    GRAY(0),
    T(x, y - 14, valueSize, "F2", value),
  ];
}

/* ------------------------- PSA Birth Certificate ------------------------- */
const psa = [
  WIDTH(1.2),
  RECT(40, 40, 532, 712),
  WIDTH(0.5),
  RECT(46, 46, 520, 700),
  CT(710, 9, "F1", "Republika ng Pilipinas"),
  CT(694, 14, "F2", "PHILIPPINE STATISTICS AUTHORITY"),
  CT(680, 8, "F1", "OFFICE OF THE CIVIL REGISTRAR GENERAL"),
  WIDTH(0.75),
  LINE(70, 668, 542, 668),
  CT(640, 16, "F2", "CERTIFICATE OF LIVE BIRTH"),
  GRAY(0.45),
  CT(624, 8, "F1", "(SECURITY PAPER - CERTIFIED TRANSCRIPT FROM THE CIVIL REGISTER)"),
  GRAY(0),
  ...field(80, 580, "Full name of child", "LIM, BRYL KEZTER", 13),
  ...field(80, 530, "Sex", "MALE"),
  ...field(250, 530, "Date of birth", "MARCH 8, 1998"),
  ...field(80, 480, "Place of birth", "MANDALUYONG CITY, METRO MANILA, PHILIPPINES"),
  ...field(80, 430, "Name of mother (maiden)", "ON FILE - CIVIL REGISTER"),
  ...field(80, 380, "Name of father", "ON FILE - CIVIL REGISTER"),
  ...field(80, 330, "Registry number", "98-13457"),
  ...field(250, 330, "Local civil registrar", "MANDALUYONG CITY"),
  WIDTH(0.5),
  LINE(70, 290, 542, 290),
  GRAY(0.35),
  T(80, 268, 8, "F1", "This is a certified true copy of the record of birth issued through the"),
  T(80, 256, 8, "F1", "PSA Civil Registry System (CRS). Valid for all legal purposes."),
  GRAY(0),
  T(80, 220, 8, "F1", "Issued on: AUGUST 14, 2023"),
  T(80, 206, 8, "F1", "Requested via: eGov PH - Document Vault"),
  T(360, 220, 10, "F2", "VERIFICATION CODE"),
  T(360, 206, 10, "F1", "PSA-CRS-2023-8841257"),
  ...barcode(80, 120, 250, 40),
  GRAY(0.45),
  T(80, 106, 7, "F1", "PSA-CRS-2023-8841257"),
  GRAY(0),
  LINE(380, 140, 530, 140),
  T(398, 128, 8, "F1", "CIVIL REGISTRAR GENERAL"),
];

/* ------------------------------ Meralco bill ------------------------------ */
const meralco = [
  GRAY(0.9),
  FRECT(40, 700, 532, 52),
  GRAY(0),
  T(60, 718, 22, "F2", "MERALCO"),
  GRAY(0.4),
  T(60, 706, 8, "F1", "Manila Electric Company"),
  GRAY(0),
  T(400, 718, 12, "F2", "STATEMENT OF ACCOUNT"),
  GRAY(0.4),
  T(400, 706, 8, "F1", `Billing month: ${BILL_MONTH}`),
  GRAY(0),
  ...field(60, 660, "Account name", "BRYL KEZTER LIM", 12),
  ...field(60, 612, "Service address", "482 MAYSILO CIRCLE, BRGY. PLAINVIEW, MANDALUYONG CITY"),
  ...field(60, 564, "Account number", "1234-5678-9012"),
  ...field(300, 564, "Meter number", "34MX58812"),
  ...field(60, 516, "Billing period", BILL_PERIOD),
  ...field(300, 516, "Bill date", BILL_DATE),
  WIDTH(0.6),
  LINE(60, 480, 552, 480),
  T(60, 456, 10, "F2", "BILLING SUMMARY"),
  GRAY(0.3),
  T(60, 430, 10, "F1", "Generation & transmission"),
  T(430, 430, 10, "F1", "PHP 2,114.32"),
  T(60, 410, 10, "F1", "Distribution charges"),
  T(430, 410, 10, "F1", "PHP    884.10"),
  T(60, 390, 10, "F1", "Government taxes & universal charges"),
  T(430, 390, 10, "F1", "PHP    483.74"),
  GRAY(0),
  WIDTH(0.6),
  LINE(420, 378, 552, 378),
  T(60, 356, 12, "F2", "TOTAL AMOUNT DUE"),
  T(430, 356, 12, "F2", "PHP 3,482.16"),
  T(60, 334, 10, "F1", "Due date:"),
  T(130, 334, 10, "F2", DUE_DATE),
  ...field(60, 290, "Consumption", "214 kWh"),
  WIDTH(0.5),
  LINE(60, 240, 552, 240),
  GRAY(0.4),
  T(60, 220, 8, "F1", "This statement serves as a valid proof of billing address."),
  T(60, 208, 8, "F1", `Retrieved via eGov PH - Document Vault on ${TODAY}.`),
  GRAY(0),
  ...barcode(60, 120, 220, 36),
  GRAY(0.45),
  T(60, 106, 7, "F1", "SOA-2026-06-1234567890"),
];

/* --------------------------- Barangay clearance --------------------------- */
const brgy = [
  WIDTH(1.2),
  RECT(40, 40, 532, 712),
  CT(710, 9, "F1", "Republika ng Pilipinas"),
  CT(696, 10, "F1", "Lungsod ng Mandaluyong"),
  CT(678, 13, "F2", "BARANGAY PLAINVIEW"),
  CT(664, 8, "F1", "OFFICE OF THE PUNONG BARANGAY"),
  WIDTH(0.75),
  LINE(70, 650, 542, 650),
  CT(612, 16, "F2", "BARANGAY CLEARANCE"),
  T(80, 560, 10, "F1", "TO WHOM IT MAY CONCERN:"),
  T(80, 528, 10, "F1", "This is to certify that BRYL KEZTER LIM, of legal age, Filipino,"),
  T(80, 510, 10, "F1", "and a bona fide resident of 482 Maysilo Circle, Brgy. Plainview,"),
  T(80, 492, 10, "F1", "Mandaluyong City, is known to be of good moral character and has"),
  T(80, 474, 10, "F1", "no derogatory record on file in this Barangay."),
  T(80, 434, 10, "F1", "This clearance is issued upon request for whatever legal purpose"),
  T(80, 416, 10, "F1", "it may serve."),
  T(80, 376, 10, "F1", "Issued this 12th day of February 2026 at Barangay Plainview,"),
  T(80, 358, 10, "F1", "Mandaluyong City."),
  ...field(80, 300, "O.R. number", "26-020441"),
  ...field(250, 300, "CTC number", "CC26-1188207"),
  LINE(340, 200, 530, 200),
  T(376, 188, 9, "F2", "PUNONG BARANGAY"),
  GRAY(0.4),
  T(80, 120, 8, "F1", "Digitized copy - eGov PH Document Vault"),
  GRAY(0),
];

fs.writeFileSync(path.join(OUT, "psa-birth-certificate.pdf"), buildPdf(psa));
fs.writeFileSync(path.join(OUT, "meralco-bill.pdf"), buildPdf(meralco));
fs.writeFileSync(path.join(OUT, "barangay-clearance.pdf"), buildPdf(brgy));
console.log("done");
