# Chrome extension and Telegram transfer setup

Build with `npm run build --workspace @arbridge/extension`, then load `apps/extension/.output/chrome-mv3` unpacked using Chrome's extension manager.

Copy `.env.example` to `.env` at the repository root. Configure the Telegram bot token, bot username, and shared internal API secret. After loading the extension, copy its Chrome extension ID into `EXTENSION_ORIGIN=chrome-extension://YOUR_EXTENSION_ID`, then restart the API.

Start the API and Telegram bot in separate terminals. In the side panel, click **Connect Telegram**, open your bot's private chat, press Start, and send `/connect <extension code>`. Enter the second one-time code returned by the bot. The resulting browser session expires after 30 days; restarting the API clears sessions and pairing state.

Paste a public HTTPS file URL into the extension, or right-click a document link and choose **Send to ARBRIDGE**. The server downloads the public file, checks its destination, size, and file signature, then sends it to your paired private Telegram chat.

Supported file types are PDF, ZIP, PNG, JPEG, GIF, WebP, and plain text. The default maximum file size is 20 MB. Browser cookies are not forwarded, so login-protected sources may fail. Files are not stored in a permanent ARBRIDGE library; transfer history is temporary and clears when the API restarts.

No subscription, payment, receipt, deposit channel, or reviewer group is required. Keep the API bound to localhost while testing. Never commit `.env` or expose bot credentials and the internal API secret.
