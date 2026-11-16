# URL fetching security notes

The capture endpoint accepts only public HTTPS URLs. The downloader validates the URL and port, performs a DNS lookup for every redirect destination, rejects any DNS set containing a non-public address, and supplies the checked address to the TLS request's lookup callback. It does not follow redirects automatically. Content-Length and streamed byte counts are bounded and the request has a deadline.

This prototype still needs independent security review. IPv4/IPv6 edge cases and resolver/runtime behavior must be tested on production platforms. A hardened deployment should isolate download workers from application/database networks, enforce network egress controls outside the process, use an antivirus/content-disarm pipeline, rate-limit authenticated users, and store data in a private bucket. Do not allow downloads from authenticated or intranet sources.
