# Changelog

## Unreleased — 2026-11-16

This is an early development prototype. No stable production release has been published.

- Added two-step Telegram-mediated extension pairing with expiring, single-use confirmation codes and bearer sessions.
- Added subscription-aware public-link capture and server-side Telegram document delivery.
- Added illustrative monthly and annual plan examples, with payments disabled unless private manual review is configured.
- Added receipt submission, Telegram reviewer-group approve/reject callbacks, and a Basic-auth operator review page.
- Expanded API, downloader, pairing, receipt-state, bot, and extension tests and corrected the build/start scripts.
- Refreshed the unpacked Chrome development archive and updated setup, security, architecture, and testing documentation.
- Added notes for OpenAI's Codex for Open Source program. No application has been submitted; selection and benefits are not guaranteed.

### Known limitations

Pairings, sessions, subscriptions, receipts, and jobs are in-memory only. There is no connected database, payment processor, durable library, AI document workflow, production deployment, or verified live Chrome/Telegram end-to-end run. Example prices are not an offer. See [development status](docs/development/README.md) and [verification record](docs/TESTING.md).
