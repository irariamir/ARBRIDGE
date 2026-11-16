# Development status

## Current prototype

This branch introduces the monorepo, a public URL capture path (Chrome context menu → API → bounded downloader → volatile status record), a simple side panel, a grammY command scaffold, and a statically served marketing/docs website. It is a development prototype, not a deployable end-to-end product.

## Known incomplete work

- No user registration, durable sessions, database integration, or data isolation. A draft initial SQL schema is included but is not wired into the API.
- Jobs are in process memory only; no Redis/BullMQ worker or object storage.
- The worker validates a small signature set and downloads bounded bytes; no document parsing, sandbox, malware scanner, deduplication, or authenticated URL support.
- No Telegram account pairing, file delivery, incoming document processing, AI adapter, embeddings, or semantic search.
- The website has no real screenshots, production domain, support submission endpoint, or deployment configuration.
- End-to-end browser + Telegram workflows cannot be verified without configured services and accounts.

## Local checks

Run `npm install`, `npm run typecheck`, and `npm test`. The API can be started with `npm run dev:api`. Never expose it to the public internet in its current form.
