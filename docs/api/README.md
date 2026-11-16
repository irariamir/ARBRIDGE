# API prototype

- `GET /health` — process health check.
- `POST /v1/captures` — `{ "url": "https://public.example/file.pdf", "title?": "..." }`; starts a bounded public-URL download, returns a job id and status. No authenticated user identity is currently implemented; keep the API on trusted local development networks only.
- `GET /v1/captures/:id` — volatile job status.

Limits default to 20 MiB and 20 seconds. This API is not production safe for public access.
