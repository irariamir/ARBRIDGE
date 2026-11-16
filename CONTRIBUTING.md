# Contributing

Thanks for helping improve ARBRIDGE. This is an early prototype; contributions should prioritize user value, security, reliable operation, and evidence-based documentation. All product-facing copy should be professional English. Do not add shadows; follow `DESIGN.md`.

## Before opening a pull request

1. For a substantial change, open an issue and agree on scope first. Use the issue templates and include reproducible details without exposing credentials or private documents.
2. Install Node.js 22.13+ and run `npm ci`.
3. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
4. Describe what you changed and the exact checks you ran. Explicitly call out browser, Telegram, deployment, or external-service paths that were not tested.
5. Keep changes focused. Never add credentials, private files, user data, generated secrets, fabricated usage metrics, or unverifiable testimonials.
6. Add or update tests and documentation for behavior changes. Avoid claiming production readiness while state is volatile or security controls are incomplete.

## Maintainer workflows

Review every proposed change before merging, including AI-generated patches. Do not use automated review or security tools on repositories or systems without authorization. Record actual release, adoption, and usage evidence only when it can be independently verified.

Security issues should be reported privately; see `SECURITY.md`.
