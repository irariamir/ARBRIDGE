# ARBRIDGE

**Your digital workspace, connected everywhere.**

ARBRIDGE is an ARIAMIR product concept for moving public web documents into a Telegram-connected personal library. The current repository is an early, security-conscious engineering foundation—not a claim that every planned integration is production-ready.

## What is here

- `apps/extension`: WXT + React Chrome Manifest V3 side panel, Telegram pairing UI, and a right-click menu for public file links.
- `apps/api`: Fastify capture, short-lived two-code pairing, bearer sessions, sample-plan access gate, Telegram document delivery, and protected receipt-review admin endpoints.
- `packages/download-engine`: HTTPS-only download worker primitive with redirect-by-redirect DNS/IP checks, size/time limits, and basic file signature validation.
- `apps/telegram-bot`: grammY commands for pairing, sample plans, incoming payment receipts, reviewer-group approve/reject buttons, status, and recent deliveries.
- `apps/api/admin.html`: Basic-auth protected operator page for temporary payment-review queue and service overview.
- `apps/website`: English-first responsive product and documentation pages with per-page SEO metadata.
- `docs/`: design, security, development, billing, and operating notes.

The pairing, subscriptions, receipt queue, sessions, and jobs are held in process memory and are cleared by an API restart. The included draft SQL schema is not connected. Example USD prices are illustrative, not a live offer; payment collection remains disabled until the operator configures private payment instructions, a review group, numeric reviewer IDs, bot token, and a strong internal secret. There is no payment processor, persistent document store, AI extraction/search, or production deployment. The extension sends the original public URL to the server; it does not upload local downloads or bypass authenticated sites.

## Requirements

Node.js 22.13+ and npm 10+. Copy `.env.example` to `.env` for server development. Keep real credentials out of source control and chat.

```sh
npm install
npm run typecheck
npm test
npm run dev:api
```

The API defaults to `http://127.0.0.1:8787`. Website preview: `npm run dev:web` (port 5173). For Telegram integration, start the API and bot in separate terminals with the same local `.env` values: `npm run dev:api` and `npm run dev:bot`.

### Connect and activate

1. Build and load the unpacked extension (steps below), then choose **Connect Telegram**.
2. Start the configured bot in Telegram. Send the short-lived `/connect 123456` code displayed by the extension.
3. The bot replies with a second one-time confirmation code. Enter that code in the extension within five minutes.
4. Use `/subscribe` in the bot to view **example-only** prices ($4.99 monthly / $49.99 annual). Payments are disabled until an operator securely configures payment instructions, the bot token, a private review group, an internal secret, and authorized numeric reviewer IDs.
5. If manual payment review is enabled, send a receipt photo or PDF to the bot. The private group gets the proof and **Approve / Reject** buttons. Approval activates the sample subscription; rejection leaves access disabled.
6. The extension only starts transfers for a paired account with an active subscription. It downloads a public HTTPS link server-side and sends the original file to that paired Telegram chat.

The operator page is `/admin` on the local API. It requires a non-default username and a unique password of at least 24 characters. Use it only behind HTTPS if deployed; do not expose the development API to the public internet.

### Extension

```sh
npm run build --workspace @arbridge/extension
```

Load the generated unpacked build from `apps/extension/.output/chrome-mv3` via `chrome://extensions` → Developer mode → Load unpacked. A deployed API URL and matching extension origin must be configured before capture requests work. Chrome's context menus are unavailable on protected pages such as `chrome://downloads`.

## Security posture and limitations

URL fetching is restricted to HTTPS and public DNS results, validates every redirect destination, pins each request to an inspected address, and applies timeout, redirect-count, byte, and file-signature checks. Pairing codes are single-use and expire after five minutes; extension sessions expire after 30 days. However, pairings, access sessions, receipts, subscriptions, and jobs are stored only in process memory. Manual receipt approval is not payment verification by a payment processor. These controls are a development baseline—not production security. Do not expose the API or admin panel publicly until durable storage, rate limits, isolated workers, TLS, malware scanning, payment controls, and a full security review are in place.

See [Security](SECURITY.md), [development notes](docs/development/README.md), and [release status](CHANGELOG.md).

## Product and brand

Product: **ARBRIDGE** · Company: **ARIAMIR** · Website: [ariamir.ct.ws](https://ariamir.ct.ws). The ARIAMIR reference brand package informs the green/charcoal palette and restrained, utility-first visual direction. Product UI and documentation are in English.

## Open-source maintainer program note

OpenAI's [Codex for Open Source program](https://developers.openai.com/community/codex-for-oss) offers selected maintainers six months of ChatGPT Pro with Codex and may offer other benefits; applying does not guarantee selection. ARBRIDGE is currently a small, early prototype with no stars or verified usage metrics, so its fit is uncertain. See [the checked program criteria and honest application notes](docs/OPENAI_CODEX_FOR_OSS.md). No application has been submitted and no endorsement or eligibility is implied.

## License

MIT. See [LICENSE](LICENSE).

## Development build artifact

A ready-to-load unpacked Chrome MV3 build is provided as `artifacts/arbridge-extension-unpacked.zip`. Extract it and load the extracted `chrome-mv3` directory from Chrome's extension manager. It targets the local development API address and is not a Chrome Web Store package or production-ready release.
