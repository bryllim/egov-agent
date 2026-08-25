# Contributing

Thanks for helping improve eGov Agent.

## Before you start

- Use synthetic fixtures and sandbox credentials only.
- Never commit `.env.local`, API credentials, real citizen information, payment details, private reports, or production callback payloads.
- Do not describe a demo fixture as a live API result.
- Check the current service schema in the [eGov API Developer Portal](https://platforms.e.gov.ph/) before changing an integration.

For substantial features or architecture changes, open an issue first so the scope and trust boundaries can be discussed.

## Development workflow

1. Fork the repository and create a focused branch.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local` and use your own sandbox credentials.
4. Make the smallest change that solves the issue.
5. Run the required checks:

```bash
npm run lint
npm run typecheck
npm run build
npm audit --omit=dev
```

6. Open a pull request that explains the behavior change, affected integrations, verification performed, and any remaining limitations.

## Integration requirements

New or changed eGov clients should:

- live in a small `server-only` module;
- read credentials from environment variables;
- validate configuration and inputs;
- use an explicit request timeout;
- map provider errors without exposing secrets or personal data;
- avoid undocumented fields and status transitions;
- require confirmation before consequential writes; and
- include a safe `.env.example` entry and README update.

## Commit and pull-request scope

Keep commits reviewable. Do not include generated build output, temporary screenshots, local editor settings, or unrelated formatting changes.
