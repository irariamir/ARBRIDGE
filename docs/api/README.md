# API prototype

The server binds to `127.0.0.1:8787` by default. The Chrome extension uses a local API URL in this development build. Pairing state, bearer sessions, subscriptions, payment receipts and capture jobs are **in memory only**; an API restart clears them.

## Public browser routes

- `GET /health` — process health and whether a bot token is configured (never returns the token).
- `GET /v1/config` — configured bot username and whether manual payments are enabled.
- `GET /v1/plans` — example subscription prices and payment-availability flag.
- `POST /v1/pairings` — begin a five-minute pairing; returns random request ID, a six-digit command code and configured bot URL.
- `GET /v1/pairings/:id` — pairing state for extension polling.
- `POST /v1/pairings/:id/confirm` — `{ "code": "123456" }`; after Telegram `/connect`, confirms the bot-sent OTP and returns a 30-day bearer token once.
- `GET /v1/me`, `GET /v1/subscription`, `GET /v1/captures` — require `Authorization: Bearer <session>`.
- `POST /v1/captures` — requires a connected user with an active manually approved subscription and a configured bot token. Body: `{ "url": "https://public.example/file.pdf", "title?": "..." }`. Starts a bounded server-side download and delivers the validated source file to the paired private Telegram chat.
- `GET /v1/captures/:id` — owner-only temporary job status.
- `POST /v1/disconnect` — revoke the current browser session.

## Bot-only internal routes

Pairing consumption, receipt creation/proof registration/review, subscription status, and recent delivery listing require the `x-internal-secret` header. Use the same random secret in the API and bot environment; keep the API private. Group receipt decisions additionally require the Telegram sender's numeric ID in `TELEGRAM_ADMIN_USER_IDS`.

## Operator routes

- `GET /admin` — operator page, HTTP Basic auth (`ADMIN_USERNAME`, unique password of at least 24 characters).
- `GET /admin/api/overview` and `POST /admin/api/receipts/:id/review` — same Basic auth. The operator page and the Telegram review group can approve/reject a pending receipt once.

Never expose Basic auth over plain HTTP beyond localhost. Payment instructions are sent to the bot user only after manual payment configuration is enabled. Prices are example USD amounts; no payment processor is connected.
