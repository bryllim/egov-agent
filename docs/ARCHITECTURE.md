# Architecture

This document describes the implementation currently present in the repository. It separates running code from production recommendations so contributors do not mistake a reference diagram or demo fixture for a deployed capability.

## Runtime boundary

The web client calls `POST /api/agent`. The route opens the encrypted eGovPH session cookie and replaces any client-supplied profile fields with the authenticated profile before invoking the headless agent.

`lib/agent/headless.ts` coordinates two kinds of result:

1. Connected service adapters for eGov AI, DBM Compass, eReport, eGovPay, and eMessage.
2. Deterministic hackathon fixtures in `app/agent/brain.ts` for agency journeys without a live integration.

The eGovPH SSO flow is implemented separately through the routes under `app/api/auth/egov/` and the server-only clients in `lib/egov-sso.ts` and `lib/egov-session.ts`.

## Request lifecycle

1. eGovPH SSO establishes a consented sandbox profile.
2. The server validates the message and a bounded conversation history.
3. eGov AI returns a structured route and response draft.
4. Deterministic TypeScript selects an allowlisted adapter or demo fixture.
5. Connected write flows require a review and explicit confirmation.
6. The server returns a typed plan/card response rendered by prebuilt React components.

The model cannot emit executable UI code or call arbitrary URLs.

## Connected adapters

| Adapter | Module | Authority boundary |
| --- | --- | --- |
| eGovPH SSO | `lib/egov-sso.ts` | Provider profile after server-side code exchange |
| eGov AI | `lib/ai/egov-ai.ts` | Language interpretation only |
| DBM Compass | `lib/compass/client.ts` | Provider budget datasets |
| eReport | `lib/ereport/client.ts` | Provider datasets and submitted case acknowledgement |
| eGovPay | `lib/egovpay/client.ts` | Hosted checkout and provider status lookup |
| eMessage | `lib/emessage/client.ts` | API acceptance of an SMS request, not handset delivery |

eVerify, Face Liveness, eGovChain, eGovDX, and direct agency systems are not connected.

## Current persistence

- The local eGovPH session is an AES-256-GCM sealed HttpOnly cookie with an eight-hour maximum age.
- Personal Memory is a static fixture.
- Browser conversation state is not backed by a database.
- UI audit events are redacted and stored in `localStorage`.
- Vault documents are static synthetic assets; new file selections are not durably uploaded.
- Telegram session state, eMessage drafts, and rate-limit counters are process memory.

These choices are suitable for a time-bounded sandbox demonstration, not production citizen data.

## Production requirements

A production implementation should add, at minimum:

- user-scoped relational storage with row-level authorization;
- a private object store with quarantine, type validation, malware scanning, envelope encryption, and retention controls;
- durable workflow state, idempotency records, an outbox, retries, and reconciliation;
- server-side append-only audit events with correlation IDs and data minimization;
- centralized secrets management and credential rotation;
- per-service authorization, consent receipts, and purpose limitation;
- observability with redaction and tested incident response; and
- an approved eGovDX or agency adapter before browser automation is considered.

For an agency portal without an API, browser execution should be a last resort: one ephemeral, allowlisted, isolated session per workflow; restricted egress; credentials brokered outside the model; human approval before consequential actions; redacted action traces; and immediate cleanup.
