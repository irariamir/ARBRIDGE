import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

type Job = { id: string; title: string; status: string; sourceHost: string; createdAt: string; bytes?: number; fileType?: string; error?: string };
const API_BASE = 'http://127.0.0.1:8787';

function SidePanel() {
  const [url, setUrl] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const stored = await chrome.storage.local.get(null);
    const local = Object.values(stored).filter((value): value is Job => Boolean(value && typeof value === 'object' && 'id' in value && 'status' in value));
    const latest = local.slice(-12).reverse();
    const synced = await Promise.all(latest.map(async (job) => {
      try {
        const response = await fetch(`${API_BASE}/v1/captures/${job.id}`);
        if (response.ok) return await response.json() as Job;
      } catch { /* API may be offline after the first request */ }
      return job;
    }));
    setJobs(synced);
  }
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 2500); return () => window.clearInterval(timer); }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    const result = await chrome.runtime.sendMessage({ type: 'capture', url, title: document.title }) as { ok: boolean; error?: string };
    setBusy(false);
    if (result?.ok) { setUrl(''); setMessage('Request accepted. A download is not the same as Telegram delivery.'); void refresh(); }
    else setMessage(result?.error || 'The request could not be completed.');
  }

  return <main>
    <header><a className="brand" href="#top">ARBRIDGE</a><span className="byline">BY ARIAMIR</span></header>
    <section className="intro" id="top"><p className="eyebrow">BROWSER → WORKSPACE</p><h1>Keep the<br /><em>useful things.</em></h1><p className="lede">Send a public document link to your ARBRIDGE workspace for a server-side download.</p></section>
    <form onSubmit={submit} className="capture-form"><label htmlFor="url">Public HTTPS file link</label><input id="url" type="url" inputMode="url" placeholder="https://example.com/document.pdf" value={url} onChange={(event) => setUrl(event.target.value)} required /><button disabled={busy}>{busy ? 'Sending request…' : 'Send link to ARBRIDGE'}</button><p className="hint">The source must be publicly accessible. Login-protected links may not work. This prototype does not deliver files to Telegram.</p>{message && <p role="status" className="feedback">{message}</p>}</form>
    <section className="library"><div className="section-head"><h2>Recent requests</h2><button className="text-button" onClick={() => void refresh()}>Refresh</button></div>{jobs.length === 0 ? <p className="empty">Your requests will appear here.<br />Use the “Send to ARBRIDGE” right-click menu on a link.</p> : <ul>{jobs.map((job) => <li key={job.id}><span className="status-mark" aria-hidden="true" /> <div className="job-copy"><strong>{job.title}</strong><small>{job.sourceHost} · {job.fileType || job.status}</small>{job.error && <small className="error">{job.error}</small>}</div><span className="status">{job.status}</span></li>)}</ul>}</section>
    <footer>Local development preview · No account connected</footer>
  </main>;
}

createRoot(document.getElementById('root')!).render(<SidePanel />);
