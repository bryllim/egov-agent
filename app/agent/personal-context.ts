import { DEMO_DATES as D } from "./dates";

export type MemoryKind =
  | "location"
  | "appointment"
  | "employment"
  | "dependents"
  | "language"
  | "reminders";

export type VaultDocumentKey =
  | "birthCert"
  | "meralco"
  | "photo"
  | "brgyClearance";

export type PersonalContext = {
  profile: {
    homeLocation: string;
    languagePreference: string;
    employment: string;
  };
  preferences: string[];
  appointments: {
    agency: string;
    service: string;
    date: string;
    time: string;
    location: string;
  }[];
  memories: {
    kind: MemoryKind;
    text: string;
    source: string;
  }[];
  vault: {
    key: VaultDocumentKey;
    name: string;
    status: "PSA-verified" | "Encrypted";
    added: string;
    size: string;
    usableFor: string[];
  }[];
  connectedRecords: {
    source: string;
    availableData: string;
    allowedUse: string;
  }[];
};

export const PERSONAL_CONTEXT: PersonalContext = {
  profile: {
    homeLocation: "Mandaluyong City, Metro Manila",
    languagePreference: "English with a little Filipino",
    employment: "Employed; income tax is handled through substituted filing",
  },
  preferences: [
    "Prefer appointments and government offices near Mandaluyong City",
    "Send SMS and email reminders for every appointment and payment",
    "Reply in English with a little Filipino",
  ],
  appointments: [
    {
      agency: "DFA",
      service: "Passport renewal",
      date: D.dfaShortYear,
      time: "10:30 AM",
      location: "DFA CO SM Megamall",
    },
  ],
  memories: [
    {
      kind: "location",
      text: "Lives in Mandaluyong City — prefers appointments and offices nearby",
      source: "Learned from conversations · Jul 2026",
    },
    {
      kind: "appointment",
      text: `Has a DFA passport renewal appointment on ${D.dfaShortYear} · 10:30 AM`,
      source: "Booked via agent · Jul 2026",
    },
    {
      kind: "employment",
      text: "Employed — income tax filed through substituted filing",
      source: "Synced from BIR · 2025",
    },
    {
      kind: "dependents",
      text: "Has 2 registered PhilHealth dependents",
      source: "Synced from PhilHealth",
    },
    {
      kind: "language",
      text: "Prefers replies in English with a bit of Filipino",
      source: "Learned from conversations",
    },
    {
      kind: "reminders",
      text: "Wants SMS and email reminders for every appointment and payment",
      source: "Learned from conversations · Jun 2026",
    },
  ],
  vault: [
    {
      key: "birthCert",
      name: "PSA Birth Certificate.webp",
      status: "PSA-verified",
      added: "Added Aug 2023",
      size: "203 KB",
      usableFor: ["Postal ID"],
    },
    {
      key: "meralco",
      name: "Proof of Billing — Meralco.pdf",
      status: "Encrypted",
      added: "Added Jun 2026",
      size: "480 KB",
      usableFor: ["Postal ID"],
    },
    {
      key: "photo",
      name: "2x2 ID Photo.jpg",
      status: "Encrypted",
      added: "Added Jun 2026",
      size: "119 KB",
      usableFor: ["Postal ID"],
    },
    {
      key: "brgyClearance",
      name: "Barangay Clearance.pdf",
      status: "Encrypted",
      added: "Added Feb 2026",
      size: "320 KB",
      usableFor: [],
    },
  ],
  connectedRecords: [
    {
      source: "PhilSys",
      availableData: "Verified identity profile and registered address",
      allowedUse: "Pre-fill forms only after the citizen reviews the details",
    },
    {
      source: "PhilHealth",
      availableData: `Active membership, two registered dependents, and premiums posted through ${D.sssMonth1}`,
      allowedUse: "Answer membership questions and prepare requested records",
    },
    {
      source: "SSS",
      availableData: "Active membership and 87 posted contributions",
      allowedUse: "Check employment readiness and prepare requested statements",
    },
    {
      source: "Pag-IBIG Fund",
      availableData: "Active membership and employer enrollment status",
      allowedUse: "Check employment readiness after the user requests it",
    },
    {
      source: "BIR",
      availableData: "Employment and substituted-filing status",
      allowedUse: "Personalize tax guidance without exposing identifiers",
    },
  ],
};
