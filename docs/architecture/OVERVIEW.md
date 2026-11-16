# Architecture overview

```text
Chrome MV3 side panel/context menu
       │ one-time pairing + bearer session
       │ public URL + title (only for active subscribers)
       ▼
Fastify API · default bind 127.0.0.1
       ├── pairing/session service (volatile memory)
       ├── manual subscription + receipt state (volatile memory)
       ├── SSRF-aware bounded HTTPS download
       ├── temporary capture jobs
       ├── Telegram sendDocument to verified private chat
       └── Basic-auth operator page /admin
                  ▲                         │
                  │ shared internal secret  │ approve/reject
                  ▼                         ▼
             grammY bot ─────────── private Telegram review group
```

The two processes share volatile state through authenticated internal HTTP routes guarded by `INTERNAL_API_SECRET`. Pairing codes are one-time, short-lived and limited to five confirmation attempts. The browser receives a random bearer token only after the bot-mediated confirmation step. Telegram numeric user ID and private chat ID—not usernames—are associated with the session.

Sample plans are `$4.99/month` and `$49.99/year`; these are illustrative. The payment path is disabled unless the operator supplies instructions, bot token, private review group, a 32+ character internal secret and an allowlist of Telegram numeric reviewer IDs. Receipts are copied to the group with action buttons; manual approval/rejection updates subscription status and notifies the user. No payment processor or automatic bank verification is implemented.

## Not yet connected

PostgreSQL/Drizzle schema and migrations, Redis/BullMQ, object storage, durable sessions/jobs, safe document extraction, OCR/AI adapters, embeddings/search, deletion synchronization and deployment infrastructure are not wired into the running API. Restarting the API clears users' in-flight pairings, sessions, receipts, subscriptions and job history. Do not describe the architecture diagram as a production deployment.
