# Security policy

ARBRIDGE is early-stage software and is not ready for production use. Please do not send private documents or credentials to an untrusted deployment.

Report suspected vulnerabilities privately to the maintainers through GitHub's private vulnerability reporting for this repository. Do not publish exploit details before a fix is available.

## Current safeguards and gaps

The download package only accepts HTTPS, rejects private and special-use IPv4/IPv6 destinations, checks DNS answers at every hop, pins the HTTPS connection to the selected public address, limits redirects, time and bytes, and verifies a small set of file signatures. These controls are not a complete sandbox. There is no malware scanning, persistent account isolation, durable queue, rate limiting, or production storage isolation yet. The API is deliberately not suitable for public deployment in its current state.

Never commit `.env` files, tokens, credentials, real user files, or unredacted logs. Rotate any credential accidentally disclosed immediately.
