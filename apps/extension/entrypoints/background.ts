const API_BASE = 'http://127.0.0.1:8787';

type CaptureRequest = { type: 'capture'; url: string; title?: string };

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({ id: 'arbridge-send-link', title: 'Send to ARBRIDGE', contexts: ['link'] });
    });
    void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== 'arbridge-send-link' || !info.linkUrl) return;
    void submitCapture({ type: 'capture', url: info.linkUrl, title: info.selectionText || tab?.title || undefined });
  });

  chrome.runtime.onMessage.addListener((message: CaptureRequest, _sender, sendResponse) => {
    if (message?.type !== 'capture') return;
    void submitCapture(message).then(sendResponse).catch((error: unknown) => sendResponse({ ok: false, error: error instanceof Error ? error.message : 'The request failed.' }));
    return true;
  });

  async function submitCapture(message: CaptureRequest): Promise<{ ok: boolean; id?: string; error?: string }> {
    let url: URL;
    try { url = new URL(message.url); } catch { return notify('Link not sent', 'This link is not a valid URL.'); }
    if (url.protocol !== 'https:' || url.username || url.password) return notify('Link not sent', 'Only public HTTPS links can be sent.');
    try {
      const response = await fetch(`${API_BASE}/v1/captures`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: url.toString(), title: message.title?.slice(0, 240) })
      });
      const data = await response.json() as { id?: string; error?: string };
      if (!response.ok || !data.id) return notify('Link not sent', data.error || 'The server could not accept this link.');
      await chrome.storage.local.set({ [`job:${data.id}`]: { id: data.id, title: message.title || url.pathname.split('/').pop() || url.hostname, status: 'queued', sourceHost: url.hostname, createdAt: new Date().toISOString() } });
      return notify('Download requested', 'The server is checking and downloading this public link. This does not send it to Telegram yet.', data.id);
    } catch {
      return notify('Could not reach ARBRIDGE', 'Start the local ARBRIDGE API and try again.');
    }
  }

  function notify(title: string, message: string, id?: string): { ok: boolean; id?: string; error?: string } {
    chrome.notifications.create({ type: 'basic', iconUrl: '/icon/128.png', title, message });
    return { ok: !title.startsWith('Could not') && !title.startsWith('Link not'), ...(id ? { id } : {}), ...(title.startsWith('Could not') || title.startsWith('Link not') ? { error: message } : {}) };
  }
});
