# Pairing, sample subscriptions and receipt review

## Extension activation

1. Load the unpacked Chrome extension and start the local API.
2. Select **Connect Telegram** in the side panel. The API issues a random request ID and a six-digit command code, valid for five minutes.
3. Open the official configured bot, press Start if this is a new conversation, then send `/connect 123456` using the extension's code.
4. The bot sends a second six-digit confirmation code to the private Telegram chat. Enter it in the extension. The API returns a random bearer session token only on successful confirmation. The token is stored in Chrome local extension storage and expires after 30 days.
5. A code is single-use; five incorrect confirmation attempts consume the request. Starting the API again clears pairings and sessions because persistence is not integrated yet.

Do not post or forward pairing codes. Do not pair with a bot unless you verified its identity.

## Subscription examples and manual receipts

The current example catalog is **$4.99 per month** and **$49.99 per year**. These are illustrative USD values, not a public offer or guaranteed price. `/subscribe` shows them and indicates whether the operator enabled manual payment review. By default, payments are disabled and the bot will not create a payment request.

For a local test configuration, an operator must securely set:

- `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME`.
- `TELEGRAM_REVIEW_CHAT_ID` for a private group where the bot is a member.
- `TELEGRAM_ADMIN_USER_IDS` as a comma-separated allowlist of **numeric Telegram user IDs** allowed to use group approval buttons.
- `INTERNAL_API_SECRET` as a randomly generated secret of at least 32 characters, shared only by API and bot.
- `PAYMENT_INSTRUCTIONS` only after a legitimate payment method has been configured.
- A non-default `ADMIN_USERNAME` and a unique `ADMIN_PASSWORD` of 24+ characters for the operator page.

A user chooses a plan, then sends a PDF or supported image receipt in a private bot chat. The bot copies it to the review group alongside request/plan metadata and Approve/Reject buttons. The group action is authorized by the reviewer's numeric ID. The `/admin` page uses the same review logic behind HTTP Basic auth. Approval extends an in-memory subscription and triggers a bot message; rejection keeps access disabled and sends a notice. Duplicate/repeated reviews are rejected.

**A receipt is not proof of payment.** Reviewers must independently verify funds in the payment provider/bank before approval. There is no payment processor, automated verification, dispute process, refund handling, tax treatment, or durable audit log. Do not collect actual customer payments in this prototype. For any deployed admin panel, terminate TLS and add rate limiting, durable storage, backups, legal terms and a security review first.

## Current billing gate

Capture requests require both a valid paired session and a currently active subscription. `/library` only lists recent delivered items held in volatile API memory; it is not permanent file storage. AI features and payment-provider integrations are not implemented.
