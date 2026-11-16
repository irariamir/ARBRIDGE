# Architecture overview

```text
Chrome MV3 side panel/context menu
                │ HTTPS public URL + metadata
                ▼
          Fastify capture API
                │ bounded download job
                ▼
  HTTPS downloader (public destinations only)
                │ temp file / signature check
                ▼
        volatile prototype status
```

Planned but not present: authenticated sessions, PostgreSQL/Drizzle persistence, Redis/BullMQ queue, isolated workers, private object storage, document extraction and AI adapter, Telegram pairing and verified chat delivery. Do not describe the planned components as working services.
