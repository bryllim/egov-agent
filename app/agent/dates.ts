/* Demo dates computed relative to "today" so the story always matches the
   day it's presented. Shared by the scripted brain, the printable forms,
   and the pages. */

const now = new Date();

function addDays(n: number) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + n);
}

function long(d: Date) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function monthDayYear(d: Date) {
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function short(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function shortYear(d: Date) {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function weekday(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

function monthYear(d: Date) {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function time(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

function yymmdd(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

function mmdd(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

function monthsAgo(n: number) {
  return new Date(now.getFullYear(), now.getMonth() - n, 1);
}

/* Key story dates */
const dfa = addDays(14); // DFA passport appointment
const postal = addDays(16); // Postal ID capture, 2 days after DFA

export const DEMO_DATES = {
  /* today */
  todayLong: long(now),
  todayMDY: monthDayYear(now),
  todayTime: time(now),
  year: String(now.getFullYear()),

  /* DFA passport appointment (today + 14) */
  dfaLong: long(dfa), // "Tuesday, July 21, 2026"
  dfaShort: short(dfa), // "Jul 21"
  dfaShortYear: shortYear(dfa), // "Jul 21, 2026"
  dfaMDY: monthDayYear(dfa), // "July 21, 2026"
  dfaWeekday: weekday(dfa),
  dfaOrdinal: ordinal(dfa.getDate()), // "21st"
  dfaRef: `DFA-MND-${yymmdd(dfa)}-1030-8842`,

  /* Postal ID capture (today + 16) */
  postalLong: long(postal),
  postalShort: short(postal),
  postalShortYear: shortYear(postal),
  postalWeekday: weekday(postal),
  postalRef: `PHL-MND-${yymmdd(postal)}-0900-3317`,

  /* Map scenario — earliest slots per DFA site */
  slotGalleria: short(addDays(22)),
  slotAliMall: short(addDays(24)),
  slotSMManila: short(addDays(28)),
  slotAseana: short(addDays(17)),

  /* SSS — last three fully-posted months */
  sssMonth1: monthYear(monthsAgo(1)), // most recent
  sssMonth2: monthYear(monthsAgo(2)),
  sssMonth3: monthYear(monthsAgo(3)),

  /* NBI payment (today) */
  orRef: `${now.getFullYear()}-${mmdd(now)}-8812`,
  nbiAppRef: `NBI-${now.getFullYear()}-${mmdd(now)}-5521`,
  nbiPaymentRef: `EGP-NBI-${yymmdd(now)}-5521`,
  ltoOrRef: `${now.getFullYear()}-${mmdd(now)}-6194`,
  ltoPaymentRef: `EGP-LTO-${yymmdd(now)}-6194`,
  eReportRef: `ERPT-MND-${yymmdd(now)}-0427`,
  mdrRef: `MDR-${now.getFullYear()}-${mmdd(now)}-3318`,
};
