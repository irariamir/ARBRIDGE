# Chrome extension and Telegram activation (development)

Build with `npm run build --workspace @arbridge/extension`, then load `apps/extension/.output/chrome-mv3` unpacked using Chrome's extension manager. The extension currently points to `http://127.0.0.1:8787`; configure the API's `EXTENSION_ORIGIN` to the exact unpacked extension ID if CORS blocks it.

Start the API and configured grammY bot in separate terminals. In the side panel, click **Connect Telegram**, open the operator-configured bot, press Start, and send `/connect <extension code>`. Enter the second one-time code that the bot replies with. This establishes a temporary bearer session. `/subscribe` shows example prices; the operator must configure manual payment review before a receipt can be submitted. An authorized reviewer must approve the proof before the API accepts a capture.

Right-click a public HTTPS document link and choose **Send to ARBRIDGE**. The server downloads the source URL and sends the validated original file through the Bot API to the paired private chat. The browser does not upload a local download. Login-protected sources may fail. Chrome's context menu is unavailable on protected pages such as `chrome://downloads`.

Pairing, sessions, receipt status, subscription status and job history are volatile; restarting the API resets them. The sample ZIP is a local development build, not a signed Chrome Web Store package. Never use the prototype with sensitive material or expose the API publicly.
