# Testing

The GitHub Actions CI workflow verifies the repository with:

- `npm ci`
- `npm audit --audit-level=low`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

The unit tests cover pairing, transfer state, URL validation, public-address filtering, file-signature recognition, and bot status formatting.

A passing CI run does not prove that a live Telegram bot can send a document. End-to-end delivery requires a valid bot token, the bot running, a private chat started by the user, the local API running, and a public downloadable test file URL.

There is no payment, receipt, subscription, or reviewer workflow in this version. Pairings, sessions, and transfer records are in-memory only and reset when the API restarts.
