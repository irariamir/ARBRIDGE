# Chrome extension (development)

Build the unpacked extension with `npm run build --workspace @arbridge/extension`, load the generated `apps/extension/.output/chrome-mv3` directory in Chrome's extension manager, and configure the API base URL in the extension source for your trusted development server.

On a normal webpage, right-click a link and choose **Send to ARBRIDGE**. This sends the public target URL to the server for a server-side download; it does not upload a local file. The browser cannot add this menu to protected pages such as `chrome://downloads`. Links requiring login or cookies may not be accessible to the server. The current UI is a prototype and its jobs are not persisted.
