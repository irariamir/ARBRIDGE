# ARBRIDGE 0.1.0 — Development Preview

**Release status:** preview only; not production-ready.

## Included

- Chrome Manifest V3/WXT development build with a “Send to ARBRIDGE” link context menu and a compact side panel.
- Local Fastify API with URL input checks and temporary capture status.
- Bounded HTTPS downloader with DNS/redirect validation, public-address filtering, timeout/byte caps, and basic signature detection.
- grammY bot command scaffold that reports unavailable functionality clearly.
- English-first static website with product, feature, setup, privacy, terms, security, FAQ, contact, and documentation pages.
- Design/brand rules, local Docker infrastructure, draft SQL schema, CI workflow and tests.

## Limitations

No persistent accounts/jobs, data isolation, connected database/queue/object storage, account pairing, Telegram document transfer, document extraction/AI, production deployment, Chrome Web Store listing, or formal security/legal review. The included extension ZIP is a local-development artifact only. Do not use it with sensitive files or expose the API publicly.

## Verification

Latest local verification: typecheck passed; 12 unit tests passed; extension, website, and API builds completed; `npm audit --audit-level=low` reported zero vulnerabilities. Chrome UI end-to-end, Telegram delivery and production deployment were not tested.
