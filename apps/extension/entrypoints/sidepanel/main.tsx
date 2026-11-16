import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

type Job = { id: string; title: string; status: string; sourceHost: string; createdAt: string; bytes?: number; fileType?: string; error?: string };
type Account = { telegramUserId: number; connected: boolean };
const API_BASE = 'http://127.0.0.1:8787';

async function getToken() { return (await chrome.storage.local.get('sessionToken') as { sessionToken?: string }).sessionToken; }
async function api(path: string, token?: string, init: RequestInit = {}) {
  return fetch(`${API_BASE}${path}`, { ...init, headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers } });
}
function SidePanel() {
  const [url, setUrl] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [botUrl, setBotUrl] = useState('');
  const [pairId, setPairId] = useState('');
  const [connectCode, setConnectCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const cfg = await api('/v1/config');
      const config = await cfg.json() as { botUrl?: string | null };
      setBotUrl(config.botUrl || '');
      const token = await getToken();
      if (!token) { setAccount(null); setJobs([]); return; }
      const [meResponse, jobsResponse] = await Promise.all([api('/v1/me', token), api('/v1/captures', token)]);
      if (meResponse.status === 401) { await chrome.storage.local.remove('sessionToken'); setAccount(null); setJobs([]); return; }
      if (meResponse.ok) setAccount(await meResponse.json() as Account);
      if (jobsResponse.ok) setJobs((await jobsResponse.json() as { captures: Job[] }).captures);
    } catch { setMessage('The local ARBRIDGE API is offline. Start it to connect or transfer files.'); }
  }
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 3500); return () => window.clearInterval(timer); }, []);

  async function beginPairing() {
    setBusy(true); setMessage('');
    try {
      const response = await api('/v1/pairings', undefined, { method: 'POST' });
      const data = await response.json() as { id?: string; commandCode?: string; botUrl?: string | null; error?: string };
      if (!response.ok || !data.id || !data.commandCode) throw new Error(data.error || 'Could not create a pairing request.');
      setPairId(data.id); setConnectCode(data.commandCode); setBotUrl(data.botUrl || '');
      setMessage('Step 1: open the bot and send the command below. It will reply with a confirmation code for this extension.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Pairing could not start.'); }
    finally { setBusy(false); }
  }
  async function confirmPairing(event: React.FormEvent) {
    event.preventDefault(); if (!pairId) return;
    setBusy(true); setMessage('');
    try {
      const response = await api(`/v1/pairings/${encodeURIComponent(pairId)}/confirm`, undefined, { method: 'POST', body: JSON.stringify({ code: confirmCode.trim() }) });
      const data = await response.json() as { accessToken?: string; error?: string };
      if (!response.ok || !data.accessToken) throw new Error(data.error || 'The confirmation code could not be verified.');
      await chrome.storage.local.set({ sessionToken: data.accessToken });
      setPairId(''); setConnectCode(''); setConfirmCode(''); setMessage('Telegram connected. You can now send public file links to this chat.');
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The code could not be verified.'); }
    finally { setBusy(false); }
  }
  async function disconnect() {
    const token = await getToken();
    if (token) await api('/v1/disconnect', token, { method: 'POST' }).catch(() => undefined);
    await chrome.storage.local.remove('sessionToken'); setAccount(null); setMessage('This browser session is disconnected.');
  }
  async function setCurrentPage() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url || !/^https:\/\//i.test(tab.url)) return setMessage('Only a public HTTPS page URL can be selected.');
    setUrl(tab.url); setMessage('Page URL added. The server will try to download the file at this URL.');
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    const result = await chrome.runtime.sendMessage({ type: 'capture', url, title: document.title }) as { ok: boolean; error?: string };
    setBusy(false);
    if (result?.ok) { setUrl(''); setMessage('Transfer queued. Check Recent transfers or your Telegram chat.'); void refresh(); }
    else setMessage(result?.error || 'The request could not be completed.');
  }

  return <main>
    <header><a className="brand" href="#top">ARBRIDGE</a><span className="byline">BY ARIAMIR</span></header>
    <section className="intro" id="top"><p className="eyebrow">BROWSER → TELEGRAM</p><h1>Keep the<br /><em>useful things.</em></h1><p className="lede">Send a public document link from Chrome to your paired Telegram chat.</p></section>
    <section className="connect-block"><div className="section-head"><h2>Telegram account</h2><button className="text-button" onClick={() => void refresh()}>Refresh</button></div>{account ? <><p className="connected"><span aria-hidden="true">●</span> Connected · Telegram ID {account.telegramUserId}</p><button className="outline-button" onClick={() => void disconnect()}>Disconnect this browser</button></> : <><p className="hint">Pair securely through the bot using a short-lived, one-time code.</p>{!pairId ? <button onClick={() => void beginPairing()} disabled={busy}>Connect Telegram</button> : <><p className="step-label">1 · Open Telegram and send this command</p>{botUrl && <a className="inline-link" target="_blank" rel="noreferrer" href={botUrl}>Open the official ARBRIDGE bot ↗</a>}<code className="pair-code">/connect {connectCode}</code><form onSubmit={confirmPairing}><label htmlFor="confirm">2 · Enter the code the bot sent you</label><input id="confirm" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={confirmCode} onChange={(event) => setConfirmCode(event.target.value)} placeholder="Six-digit code" required /><button disabled={busy || confirmCode.length !== 6}>{busy ? 'Verifying…' : 'Confirm connection'}</button></form></>}</>}{message && <p role="status" className="feedback">{message}</p>}</section>
    <form onSubmit={submit} className="capture-form"><div className="section-head"><h2>Send a file link</h2><button className="text-button" type="button" onClick={() => void setCurrentPage()}>Use current page URL</button></div><label htmlFor="url">Public HTTPS file link</label><input id="url" type="url" inputMode="url" placeholder="https://example.com/document.pdf" value={url} onChange={(event) => setUrl(event.target.value)} required /><button disabled={busy || !account}>{busy ? 'Sending request…' : !account ? 'Connect Telegram first' : 'Send to paired Telegram'}</button><p className="hint">The server downloads the public link and sends the validated file to your Telegram chat. Login-protected sources are not supported.</p></form>
    <section className="library"><div className="section-head"><h2>Recent transfers</h2><button className="text-button" onClick={() => void refresh()}>Refresh</button></div>{jobs.length === 0 ? <p className="empty">Delivered files will appear here.<br />You can also right-click a document link and choose “Send to ARBRIDGE”.</p> : <ul>{jobs.map((job) => <li key={job.id}><span className="status-mark" aria-hidden="true" /> <div className="job-copy"><strong>{job.title}</strong><small>{job.sourceHost} · {job.fileType || job.status}</small>{job.error && <small className="error">{job.error}</small>}</div><span className="status">{job.status}</span></li>)}</ul>}</section>
    <footer>Simple transfer mode · Temporary transfer history</footer>
  </main>;
}

createRoot(document.getElementById('root')!).render(<SidePanel />);
