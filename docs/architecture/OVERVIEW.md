# ARBRIDGE architecture

ARBRIDGE has three runtime parts:

1. **Chrome extension** — accepts a public HTTPS file URL from the side panel or link context menu and sends it to the local API with a paired session token.
2. **Fastify API** — manages short-lived pairing, validates user sessions, downloads public files with SSRF protections and size/time limits, checks file signatures, and sends the validated document to Telegram.
3. **grammY Telegram bot** — exchanges one-time pairing codes and provides private-chat transfer status commands.

## Transfer flow

```text
Chrome extension
      |
      | HTTPS URL + session token
      v
Local Fastify API ---- DNS/IP + redirect validation
      |                           |
      |                    bounded temporary download
      v
Telegram Bot API ---- sendDocument ----> Paired private chat
```

## State and security

Pairings, sessions, duplicate-capture markers, and job status are held in process memory. They are cleared on API restart. The internal API secret protects bot-to-API routes. Browser sessions are opaque bearer tokens stored hashed in API memory and expire after 30 days. The downloader only accepts public HTTPS targets on port 443, checks every redirect, enforces download limits, and validates supported file signatures.

This prototype has no payment/subscription system, receipt review, admin payment panel, database, persistent library, or AI services. It is intended for local testing only; do not expose the API publicly.
