# Development status

ARBRIDGE is a local Chrome-to-Telegram file-transfer prototype.

## Implemented

- Chrome Manifest V3 side panel and right-click link action.
- Short-lived, two-step Telegram pairing.
- Public HTTPS URL validation and redirect-by-redirect DNS/IP checks.
- Download byte/time limits and file-signature validation.
- Telegram `sendDocument` delivery to the paired private chat.
- Temporary transfer status in the extension and `/status` / `/library` bot commands.

## Not included

There are no subscriptions, payments, receipts, deposit channels, reviewer groups, admin payment pages, database, durable file library, AI processing, OCR, or semantic search.

## Limitations

Pairings, browser sessions, and transfer records are stored in memory and reset when the API restarts. The downloader does not forward browser cookies or bypass access controls. Login-protected URLs and local files are unsupported. Keep the API bound to localhost and do not use this prototype for confidential files.

## Verification

The CI workflow runs dependency installation, npm audit, lint, typecheck, tests, and workspace builds. Live Telegram delivery still requires a user-configured bot token and a real private-chat test.
