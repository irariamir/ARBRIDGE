# Development status

## Working prototype flows

- Chrome MV3 context menu and side panel send a public HTTPS URL to the local API.
- The API checks the URL and uses the bounded HTTPS downloader. After content-signature validation, it sends the original file to the verified Telegram private chat when bot configuration and an active subscription are present.
- Pairing is a two-step code exchange: extension challenge → private bot `/connect` → bot confirmation OTP → extension session token. Command and confirmation codes expire after five minutes and are single-use; failed confirmation attempts are capped.
- `/subscribe` shows example USD prices. Payment is disabled by default. With operator configuration, a user may send a receipt to a private review group. Authorized numeric Telegram reviewer IDs can approve/reject via inline buttons; a Basic-auth operator panel provides the same manual review.
- Bot commands include `/start`, `/help`, `/connect`, `/subscribe`, `/status`, `/library`, `/account`, `/settings`, `/search`, `/delete`, and `/cancel`.

## Important limits

All pairings, sessions, receipts, subscriptions and capture jobs live in process memory and are lost on API restart. The draft PostgreSQL schema, Redis compose service and object-storage settings are not connected. There is no persistent personal library, cross-device data sync, AI extraction/search, OCR, embeddings, or payment processor. The `/library` command lists recent successfully delivered files from volatile capture records; it is not durable document storage.

Payment prices are examples ($4.99/month and $49.99/year), not a published offer. Receipts are manually reviewed; an operator must independently verify the transfer before approving. Never enable real payment instructions until the private review group, reviewer allowlist, bot token, admin credentials and internal API secret are securely configured. Admin Basic auth must only be used behind HTTPS outside local development.

## Local checks

Use Node.js 22.13+. Copy `.env.example` to `.env` and configure test credentials only in a secure local environment. Start `npm run dev:api` and `npm run dev:bot` in separate terminals. Never commit `.env`, use the token that was posted in chat, or expose this unauthenticated/in-memory development service to the internet.

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm audit --audit-level=low`. Telegram and external file delivery require live services and were not end-to-end tested in the sandbox.
