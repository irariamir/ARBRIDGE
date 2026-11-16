import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { PLAN_CATALOG, getPlan } from '../../../packages/shared/src/index.js';
import { DownloadError, downloadPublicFile, validateDownloadUrl } from '../../../packages/download-engine/src/index.js';
import { createReceipt, duplicateCaptures, getOpenReceipt, internalSecret, jobs, pairingService, receipts, registerReceiptProof, reviewReceipt, safeEqual, subscriptions, subscriptionIsActive, type CaptureJob, type Receipt } from './state.js';

const port = Number(process.env.API_PORT ?? 8787);
const host = process.env.API_HOST ?? '127.0.0.1';
const maxBytes = Number(process.env.MAX_DOWNLOAD_BYTES ?? 20 * 1024 * 1024);
const timeoutMs = Number(process.env.DOWNLOAD_TIMEOUT_MS ?? 20_000);
const allowedOrigins = new Set([process.env.EXTENSION_ORIGIN, process.env.APP_BASE_URL].filter((value): value is string => Boolean(value)));
const app = Fastify({ logger: { redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers.x-internal-secret'] }, bodyLimit: 16 * 1024 });
const captureSchema = z.object({ url: z.string().url().max(4096), title: z.string().trim().max(240).optional() }).strict();
const numericId = z.number().int().positive().safe();
const pairCodeSchema = z.string().regex(/^\d{6}$/);

await app.register(cors, {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed'), false);
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['content-type', 'authorization']
});

function internalAuthorized(request: FastifyRequest) {
  const supplied = request.headers['x-internal-secret'];
  return internalSecret.length >= 32 && typeof supplied === 'string' && safeEqual(supplied, internalSecret);
}
async function requireInternal(request: FastifyRequest, reply: FastifyReply) {
  if (!internalAuthorized(request)) return reply.code(401).send({ error: 'Unauthorized internal service request.' });
}
function bearer(request: FastifyRequest) {
  const match = /^Bearer ([A-Za-z0-9_-]{32,128})$/.exec(request.headers.authorization ?? '');
  return pairingService.authenticate(match?.[1]);
}
async function requireUser(request: FastifyRequest, reply: FastifyReply) {
  const user = bearer(request);
  if (!user) { await reply.code(401).send({ error: 'Connect your Telegram account to continue.' }); return undefined; }
  return user;
}
function isAdminAuthorized(request: FastifyRequest) {
  const username = process.env.ADMIN_USERNAME; const password = process.env.ADMIN_PASSWORD;
  if (!username || !password || password.length < 24 || username.toLowerCase() === 'admin') return false;
  const auth = request.headers.authorization;
  if (!auth?.startsWith('Basic ')) return false;
  let decoded: string;
  try { decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8'); } catch { return false; }
  const separator = decoded.indexOf(':');
  if (separator < 0) return false;
  return safeEqual(decoded.slice(0, separator), username) && safeEqual(decoded.slice(separator + 1), password);
}
async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const username = process.env.ADMIN_USERNAME; const password = process.env.ADMIN_PASSWORD;
  if (!username || !password || password.length < 24 || username.toLowerCase() === 'admin') {
    await reply.code(503).send({ error: 'Admin panel credentials are not configured.' }); return false;
  }
  if (!isAdminAuthorized(request)) {
    reply.header('WWW-Authenticate', 'Basic realm="ARBRIDGE Admin", charset="UTF-8"');
    await reply.code(401).send({ error: 'Admin authentication required.' }); return false;
  }
  return true;
}
function botUsername() {
  const value = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, '');
  return value && /^[A-Za-z0-9_]{5,32}$/.test(value) ? value : undefined;
}
function adminUserIds() {
  return new Set((process.env.TELEGRAM_ADMIN_USER_IDS ?? '').split(',').map((id) => Number(id.trim())).filter((id) => Number.isSafeInteger(id) && id > 0));
}
function errorCode(error: unknown) {
  if (error instanceof Error && 'code' in error) return String(error.code);
  if (error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)) return error.message;
  return 'INTERNAL_ERROR';
}
function fileNameFromResult(result: { fileName?: string; finalUrl: string; type: string }, title: string) {
  const raw = result.fileName || new URL(result.finalUrl).pathname.split('/').pop() || title || `document.${result.type}`;
  const cleaned = raw.replace(/[\\/\u0000-\u001f\u007f]/g, '_').replace(/^\.+/, '').trim().slice(0, 160);
  return cleaned || `document.${result.type}`;
}
const telegramDocumentMime: Record<string, string> = { pdf: 'application/pdf', zip: 'application/zip', png: 'image/png', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', text: 'text/plain; charset=utf-8' };
async function telegramApi<T>(method: string, body: FormData | Record<string, unknown>): Promise<T> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_NOT_CONFIGURED');
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body),
    headers: body instanceof FormData ? undefined : { 'content-type': 'application/json' },
    signal: AbortSignal.timeout(30_000)
  });
  const payload = await response.json() as { ok?: boolean; result?: T; description?: string };
  if (!response.ok || !payload.ok || payload.result === undefined) throw new Error(`TELEGRAM_${response.status}_${payload.description?.slice(0, 100) ?? 'API_ERROR'}`);
  return payload.result;
}
async function notifyReceiptDecision(receiptId: string, action: 'approve' | 'reject', note?: string) {
  const receipt = receipts.get(receiptId);
  if (!receipt || !process.env.TELEGRAM_BOT_TOKEN) return false;
  const text = action === 'approve'
    ? `Your ARBRIDGE ${getPlan(receipt.planId)?.name ?? ''} subscription is active. You can now send public document links from the extension.`
    : `Your ARBRIDGE payment proof was not approved.${note ? ` Note: ${note.slice(0, 240)}` : ''} You can submit a new proof with /subscribe.`;
  try { await telegramApi('sendMessage', { chat_id: receipt.chatId, text }); return true; }
  catch (error) { app.log.warn({ receiptId, errorCode: errorCode(error) }, 'subscription decision notification failed'); return false; }
}
function paymentReady() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_REVIEW_CHAT_ID && process.env.PAYMENT_INSTRUCTIONS?.trim() && internalSecret.length >= 32 && adminUserIds().size > 0);
}
function maskReceipt(receipt: Receipt) {
  const { chatId: _chatId, ...safe } = receipt;
  return safe;
}

app.get('/health', async () => ({ ok: true, service: 'arbridge-api', mode: 'prototype', telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN) }));
app.get('/v1/config', async () => ({ botUsername: botUsername() ?? null, paymentAvailable: paymentReady() }));
app.get('/v1/plans', async () => ({ plans: PLAN_CATALOG.map(({ id, name, price, interval, summary }) => ({ id, name, price, interval, summary })), paymentAvailable: paymentReady(), notice: 'Sample pricing only. Payment instructions must be configured by the operator.' }));

app.post('/v1/pairings', async (_request, reply) => {
  try {
    const challenge = pairingService.create();
    const username = botUsername();
    return reply.code(201).send({ ...challenge, botUsername: username ?? null, botUrl: username ? `https://t.me/${username}` : null, expiresInSeconds: 300 });
  } catch (error) { return reply.code(503).send({ error: errorCode(error) === 'PAIRING_CAPACITY' ? 'Too many pending pairing attempts. Try again later.' : 'Could not start account pairing.' }); }
});
app.get<{ Params: { id: string } }>('/v1/pairings/:id', async (request, reply) => {
  const status = pairingService.getStatus(request.params.id);
  return status ? status : reply.code(404).send({ error: 'This pairing request expired or was already used.' });
});
app.post<{ Params: { id: string } }>('/v1/pairings/:id/confirm', async (request, reply) => {
  const body = z.object({ code: pairCodeSchema }).safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: 'Enter the six-digit code sent by the Telegram bot.' });
  try { return pairingService.confirm(request.params.id, body.data.code); }
  catch (error) {
    const code = errorCode(error);
    return reply.code(code === 'PAIRING_CODE_INVALID' ? 400 : 410).send({ error: code === 'PAIRING_CODE_INVALID' ? 'That code is incorrect or expired. Check the Telegram message and try again.' : 'This pairing request expired. Start a new connection.' });
  }
});
app.get('/v1/me', async (request, reply) => {
  const user = await requireUser(request, reply); if (!user) return;
  const subscription = subscriptions.get(user.telegramUserId);
  return { telegramUserId: user.telegramUserId, connected: true, subscription: subscriptionIsActive(user.telegramUserId) ? subscription : null, subscriptionActive: subscriptionIsActive(user.telegramUserId) };
});
app.post('/v1/disconnect', async (request, reply) => {
  const user = await requireUser(request, reply); if (!user) return;
  pairingService.revoke(/^Bearer ([A-Za-z0-9_-]+)$/.exec(request.headers.authorization ?? '')?.[1]);
  return { ok: true, message: 'This browser session has been disconnected. Your Telegram account and subscription were not deleted.' };
});
app.get('/v1/subscription', async (request, reply) => {
  const user = await requireUser(request, reply); if (!user) return;
  const subscription = subscriptions.get(user.telegramUserId);
  return { active: subscriptionIsActive(user.telegramUserId), subscription: subscriptionIsActive(user.telegramUserId) ? subscription : null, paymentAvailable: paymentReady() };
});

app.post('/internal/pairings/consume', { preHandler: requireInternal }, async (request, reply) => {
  const parsed = z.object({ code: pairCodeSchema, telegramUserId: numericId, chatId: numericId }).strict().safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'Invalid pairing request.' });
  try { return pairingService.consumeCommandCode(parsed.data.code, { telegramUserId: parsed.data.telegramUserId, chatId: parsed.data.chatId }); }
  catch { return reply.code(400).send({ error: 'Pairing code is invalid, expired, or has already been used.' }); }
});
app.post('/internal/receipts', { preHandler: requireInternal }, async (request, reply) => {
  const parsed = z.object({ telegramUserId: numericId, chatId: numericId, planId: z.string() }).strict().safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'Invalid subscription request.' });
  try {
    const receipt = createReceipt(parsed.data.telegramUserId, parsed.data.chatId, parsed.data.planId);
    return { receipt: maskReceipt(receipt), plan: getPlan(receipt.planId), paymentInstructions: process.env.PAYMENT_INSTRUCTIONS };
  } catch (error) { return reply.code(errorCode(error) === 'PLAN_NOT_FOUND' ? 400 : 503).send({ error: errorCode(error) }); }
});
app.get<{ Params: { telegramUserId: string } }>('/internal/receipts/open/:telegramUserId', { preHandler: requireInternal }, async (request, reply) => {
  const userId = Number(request.params.telegramUserId);
  if (!Number.isSafeInteger(userId) || userId <= 0) return reply.code(400).send({ error: 'Invalid Telegram user id.' });
  const receipt = getOpenReceipt(userId);
  return receipt ? { receipt: maskReceipt(receipt), plan: getPlan(receipt.planId) } : reply.code(404).send({ error: 'No payment proof is currently expected.' });
});
app.post<{ Params: { id: string } }>('/internal/receipts/:id/proof', { preHandler: requireInternal }, async (request, reply) => {
  const parsed = z.object({ telegramUserId: numericId, fileName: z.string().trim().min(1).max(200) }).strict().safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'Invalid payment proof metadata.' });
  try { return { receipt: maskReceipt(registerReceiptProof(request.params.id, parsed.data.telegramUserId, parsed.data.fileName)) }; }
  catch { return reply.code(409).send({ error: 'The receipt is no longer awaiting proof.' }); }
});
app.get<{ Params: { telegramUserId: string } }>('/internal/subscriptions/:telegramUserId', { preHandler: requireInternal }, async (request, reply) => {
  const userId = Number(request.params.telegramUserId);
  if (!Number.isSafeInteger(userId) || userId <= 0) return reply.code(400).send({ error: 'Invalid Telegram user id.' });
  const subscription = subscriptions.get(userId);
  return { active: subscriptionIsActive(userId), subscription: subscriptionIsActive(userId) ? subscription : null };
});
app.get<{ Params: { telegramUserId: string } }>('/internal/library/:telegramUserId', { preHandler: requireInternal }, async (request, reply) => {
  const userId = Number(request.params.telegramUserId);
  if (!Number.isSafeInteger(userId) || userId <= 0) return reply.code(400).send({ error: 'Invalid Telegram user id.' });
  return { documents: [...jobs.values()].filter((job) => job.telegramUserId === userId && job.status === 'complete').sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20).map(({ id, title, sourceHost, fileType, bytes, createdAt }) => ({ id, title, sourceHost, fileType, bytes, createdAt })) };
});
app.post<{ Params: { id: string } }>('/internal/receipts/:id/review', { preHandler: requireInternal }, async (request, reply) => {
  const parsed = z.object({ action: z.enum(['approve', 'reject']), reviewerId: numericId }).strict().safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'Invalid review action.' });
  if (!adminUserIds().has(parsed.data.reviewerId)) return reply.code(403).send({ error: 'This Telegram account is not an authorized reviewer.' });
  try {
    const receipt = reviewReceipt(request.params.id, parsed.data.action, parsed.data.reviewerId);
    const notified = await notifyReceiptDecision(receipt.id, parsed.data.action);
    return { receipt: maskReceipt(receipt), notified };
  } catch { return reply.code(409).send({ error: 'This payment request has already been reviewed or no longer exists.' }); }
});

app.get('/admin', async (request, reply) => {
  if (!await requireAdmin(request, reply)) return;
  reply.header('cache-control', 'no-store').type('text/html; charset=utf-8').send(adminHtml);
});
app.get('/admin/api/overview', async (request, reply) => {
  if (!await requireAdmin(request, reply)) return;
  return {
    users: new Set([...jobs.values()].map((job) => job.telegramUserId).concat([...subscriptions.keys()])).size,
    activeSubscriptions: [...subscriptions.keys()].filter(subscriptionIsActive).length,
    jobs: { total: jobs.size, complete: [...jobs.values()].filter((job) => job.status === 'complete').length, failed: [...jobs.values()].filter((job) => job.status === 'failed').length },
    receipts: [...receipts.values()].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(maskReceipt),
    paymentAvailable: paymentReady()
  };
});
app.post<{ Params: { id: string } }>('/admin/api/receipts/:id/review', async (request, reply) => {
  if (!await requireAdmin(request, reply)) return;
  const parsed = z.object({ action: z.enum(['approve', 'reject']), note: z.string().trim().max(300).optional() }).strict().safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'Choose approve or reject and provide a short optional note.' });
  try {
    const receipt = reviewReceipt(request.params.id, parsed.data.action, undefined, parsed.data.note);
    const notified = await notifyReceiptDecision(receipt.id, parsed.data.action, parsed.data.note);
    return { receipt: maskReceipt(receipt), notified };
  } catch { return reply.code(409).send({ error: 'This payment request has already been reviewed or no longer exists.' }); }
});

app.get('/v1/captures', async (request, reply) => {
  const user = await requireUser(request, reply); if (!user) return;
  return { captures: [...jobs.values()].filter((job) => job.telegramUserId === user.telegramUserId).sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30).map(({ telegramUserId: _userId, ...job }) => job) };
});
app.post('/v1/captures', async (request, reply) => {
  const user = await requireUser(request, reply); if (!user) return;
  if (!subscriptionIsActive(user.telegramUserId)) return reply.code(402).send({ error: 'An active subscription is required. Open the Telegram bot and choose /subscribe.' });
  if (!process.env.TELEGRAM_BOT_TOKEN) return reply.code(503).send({ error: 'Telegram delivery is not configured on this server.' });
  const parsed = captureSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'Invalid capture request.' });
  let safeUrl: URL;
  try { safeUrl = validateDownloadUrl(parsed.data.url); }
  catch (error) { return reply.code(400).send({ error: error instanceof DownloadError ? error.message : 'Invalid URL.' }); }
  if (jobs.size >= 500) return reply.code(503).send({ error: 'The temporary job list is full. Try again later.' });
  const duplicateKey = createHash('sha256').update(`${user.telegramUserId}:${safeUrl.toString()}`).digest('hex');
  const previous = duplicateCaptures.get(duplicateKey);
  if (previous && Date.now() - previous.createdAt < 24 * 60 * 60_000) {
    const existing = jobs.get(previous.jobId);
    if (existing) return reply.code(200).send({ id: existing.id, status: existing.status, duplicate: true, statusUrl: `/v1/captures/${existing.id}` });
  }
  const id = randomUUID();
  const job: CaptureJob = { id, telegramUserId: user.telegramUserId, status: 'queued', title: parsed.data.title?.slice(0, 240) || safeUrl.pathname.split('/').pop() || 'Saved document', sourceHost: safeUrl.hostname, createdAt: new Date().toISOString(), bytes: 0 };
  jobs.set(id, job); duplicateCaptures.set(duplicateKey, { jobId: id, createdAt: Date.now() });
  void (async () => {
    let cleanup: (() => Promise<void>) | undefined;
    try {
      job.status = 'downloading';
      const result = await downloadPublicFile(safeUrl.toString(), { maxBytes, timeoutMs, onProgress: (bytes) => { job.bytes = bytes; } });
      cleanup = result.cleanup;
      job.status = 'validating'; job.bytes = result.bytes; job.fileType = result.type;
      const name = fileNameFromResult(result, job.title);
      job.title = name;
      job.status = 'uploading';
      const content = await readFile(result.path);
      const form = new FormData(); form.set('chat_id', String(user.chatId));
      form.set('caption', `Your document has arrived.\n\nFile: ${name}\nStatus: Downloaded and sent by ARBRIDGE\nSource: Chrome extension`);
      form.set('document', new Blob([Uint8Array.from(content)], { type: telegramDocumentMime[result.type] ?? 'application/octet-stream' }), name);
      const delivered = await telegramApi<{ message_id: number }>('sendDocument', form);
      job.telegramMessageId = delivered.message_id; job.status = 'complete';
    } catch (error) {
      job.status = 'failed';
      const code = errorCode(error);
      job.error = code.startsWith('TELEGRAM_') ? 'Telegram could not deliver this document. Check the bot connection, file limits, and subscription.' : error instanceof DownloadError ? error.message : 'The download or delivery could not be completed.';
      request.log.warn({ jobId: id, code }, 'capture or Telegram delivery failed');
    } finally { await cleanup?.().catch(() => undefined); }
  })();
  return reply.code(202).send({ id, status: job.status, statusUrl: `/v1/captures/${id}`, note: 'The server will download the public URL and deliver the file to your connected Telegram chat.' });
});
app.get<{ Params: { id: string } }>('/v1/captures/:id', async (request, reply) => {
  const user = await requireUser(request, reply); if (!user) return;
  const job = jobs.get(request.params.id);
  if (!job || job.telegramUserId !== user.telegramUserId) return reply.code(404).send({ error: 'Capture job not found.' });
  const { telegramUserId: _userId, ...safe } = job; return safe;
});

app.setErrorHandler((error, _request, reply) => {
  app.log.error({ err: error }, 'request error');
  reply.code(500).send({ error: 'An unexpected server error occurred.' });
});

const adminHtml = await readFile(new URL('../admin.html', import.meta.url), 'utf8');

try { await app.listen({ port, host }); }
catch (error) { app.log.error(error); process.exit(1); }
