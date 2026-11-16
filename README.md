# ARBRIDGE

**Your digital workspace, connected everywhere.**

ARBRIDGE is an ARIAMIR product concept for moving public web documents into a Telegram-connected personal library. The current repository is an early, security-conscious engineering foundation—not a claim that every planned integration is production-ready.

## What is here

- `apps/extension`: WXT + React Chrome Manifest V3 side panel and a context-menu entry for public file URLs.
- `apps/api`: Fastify capture API with URL validation and in-memory job status.
- `packages/download-engine`: HTTPS-only download primitive with redirect-by-redirect DNS/IP checks, size/time limits, and basic file signature validation.
- `apps/telegram-bot`: grammY command scaffold; bot startup is disabled until configured.
- `apps/website`: English-first responsive product and documentation website with individual SEO pages.
- `docs/`: design, security, product and development notes.

The API's job records are in memory and are lost on restart. Persistent user accounts, database-backed jobs (a draft SQL schema is provided but not connected), object storage, document extraction/AI, Telegram pairing and delivery, and deployment are not implemented yet. The extension clearly identifies its public-URL workflow; it does not pretend to upload local downloads or bypass authenticated sites.

## Requirements

Node.js 22.13+ and npm 10+. Copy `.env.example` to `.env` for server development. Keep real credentials out of source control and chat.

```sh
npm install
npm run typecheck
npm test
npm run dev:api
```

The API defaults to `http://localhost:8787`. Website preview: `npm run dev:web` (port 5173). Bot: configure a bot token privately, then `npm run dev:bot`.

### Extension

```sh
npm run build --workspace @arbridge/extension
```

Load the generated unpacked build from `apps/extension/.output/chrome-mv3` via `chrome://extensions` → Developer mode → Load unpacked. A deployed API URL and matching extension origin must be configured before capture requests work. Chrome's context menus are unavailable on protected pages such as `chrome://downloads`.

## Security posture and limitations

URL fetching is restricted to HTTPS and public DNS results, validates each redirect target, pins each request to an inspected address, and applies timeout, redirect-count, and byte limits. This is a useful baseline—not a substitute for a hardened isolated worker, malware scanning, authenticated sessions, durable queues, or a production security review. Do not expose the API publicly until those pieces are complete.

See [Security](SECURITY.md), [development notes](docs/development/README.md), and [release status](CHANGELOG.md).

## Product and brand

Product: **ARBRIDGE** · Company: **ARIAMIR** · Website: [ariamir.ct.ws](https://ariamir.ct.ws). The ARIAMIR reference brand package informs the green/charcoal palette and restrained, utility-first visual direction. Product UI and documentation are in English.

## License

MIT. See [LICENSE](LICENSE).

## Development build artifact

A ready-to-load unpacked Chrome MV3 build is provided as `artifacts/arbridge-extension-unpacked.zip`. Extract it and load the extracted `chrome-mv3` directory from Chrome's extension manager. It targets the local development API address and is not a Chrome Web Store package or production-ready release.
