<div align="center">

# ARBRIDGE

**A simple Chrome-to-Telegram file transfer tool.**

Send a public file link from Chrome and receive the downloaded file in your paired Telegram chat.

</div>

## What this version does

1. Connects the Chrome extension to your Telegram account using a short-lived pairing code.
2. Lets you paste a public HTTPS file URL or right-click a link and choose **Send to ARBRIDGE**.
3. Downloads the file on the API server, validates its type and size, and sends it to your private Telegram chat.
4. Shows recent transfer status in the extension and through the bot's `/status` and `/library` commands.

There are no subscriptions, payments, receipts, deposit channels, reviewer groups, or admin payment pages in this simplified version.

## Requirements

- Node.js 22.13+ and npm 10+
- Google Chrome
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

## Setup

1. Install dependencies:

   ```sh
   npm ci
   ```

2. Copy `.env.example` to `.env`.
3. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME`.
4. Generate a private random value of at least 32 characters for `INTERNAL_API_SECRET`. Keep it identical for the API and bot. Do not publish it.

## Run locally

Open three terminals from the repository root:

**Terminal 1 — API**

```sh
npm run dev:api
```

**Terminal 2 — Telegram bot**

```sh
npm run dev:bot
```

**Terminal 3 — Chrome extension build**

```sh
npm run build --workspace @arbridge/extension
```

Then open `chrome://extensions`, enable **Developer mode**, select **Load unpacked**, and choose `apps/extension/.output/chrome-mv3`.

If Chrome displays an extension ID, set `EXTENSION_ORIGIN=chrome-extension://YOUR_EXTENSION_ID` in `.env`, restart the API, and reload the extension.

## Test a transfer

1. Open the ARBRIDGE extension side panel.
2. Select **Connect Telegram**.
3. Open your bot and send the one-time `/connect 123456` command shown by the extension.
4. Enter the confirmation code returned by the bot into the extension.
5. Paste a public HTTPS link to a supported file, or right-click a document link and choose **Send to ARBRIDGE**.
6. Check your Telegram private chat and the extension's **Recent transfers** section.

The API supports PDF, ZIP, PNG, JPEG, GIF, WebP, and plain-text files. The default maximum download size is 20 MB.

## Security and limitations

- Only public HTTPS URLs on the standard port are accepted.
- Redirects and DNS results are checked to prevent requests to private/internal network addresses.
- Downloads have size and time limits, and file types are checked by content signature.
- Browser cookies are never forwarded. Login-protected links and local files are not supported.
- Pairings, sessions, and transfer history are stored in memory and disappear when the API restarts.
- Keep the API bound to localhost while testing. Do not expose this prototype to the public internet.
- Never commit `.env`, bot tokens, or the internal API secret.

## Verify

```sh
npm run typecheck
npm test
npm run build
```

This is a local testing prototype, not a hosted or production-ready service.
