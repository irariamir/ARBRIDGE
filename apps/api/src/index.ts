import Fastify from 'fastify';
import cors from '@fastify/cors';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { DownloadError, downloadPublicFile, validateDownloadUrl } from '../../../packages/download-engine/src/index.js';

const port = Number(process.env.API_PORT ?? 8787);
const host = process.env.API_HOST ?? '127.0.0.1';
const maxBytes = Number(process.env.MAX_DOWNLOAD_BYTES ?? 20 * 1024 * 1024);
const timeoutMs = Number(process.env.DOWNLOAD_TIMEOUT_MS ?? 20_000);
const allowedOrigins = new Set([process.env.EXTENSION_ORIGIN, process.env.APP_BASE_URL].filter((value): value is string => Boolean(value)));
const app = Fastify({ logger: { redact: ['req.headers.authorization', 'req.headers.cookie'] }, bodyLimit: 16 * 1024 });

await app.register(cors, {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed'), false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['content-type', 'authorization']
});

type CaptureJob = { id: string; status: 'queued' | 'downloading' | 'validating' | 'complete' | 'failed'; title: string; sourceHost: string; createdAt: string; bytes: number; fileType?: string; error?: string };
const jobs = new Map<string, CaptureJob>();
const captureSchema = z.object({ url: z.string().url().max(4096), title: z.string().trim().max(240).optional() }).strict();

app.get('/health', async () => ({ ok: true, service: 'arbridge-api', mode: 'prototype' }));
app.post('/v1/captures', async (request, reply) => {
  const parsed = captureSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'Invalid capture request.' });
  let safeUrl: URL;
  try { safeUrl = validateDownloadUrl(parsed.data.url); }
  catch (error) {
    const message = error instanceof DownloadError ? error.message : 'Invalid URL.';
    return reply.code(400).send({ error: message });
  }
  if (jobs.size >= 500) return reply.code(503).send({ error: 'The temporary job list is full. Try again later.' });
  const id = randomUUID();
  const job: CaptureJob = { id, status: 'queued', title: parsed.data.title?.slice(0, 240) || safeUrl.pathname.split('/').pop() || 'Saved document', sourceHost: safeUrl.hostname, createdAt: new Date().toISOString(), bytes: 0 };
  jobs.set(id, job);
  void (async () => {
    job.status = 'downloading';
    try {
      const result = await downloadPublicFile(safeUrl.toString(), { maxBytes, timeoutMs, onProgress: (bytes) => { job.bytes = bytes; } });
      job.status = 'validating';
      job.bytes = result.bytes;
      job.fileType = result.type;
      await result.cleanup();
      // “complete” means the bounded download and basic signature validation completed. No library save or Telegram delivery exists yet.
      job.status = 'complete';
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof DownloadError ? error.message : 'The download could not be completed.';
      request.log.warn({ jobId: id, code: error instanceof DownloadError ? error.code : 'DOWNLOAD_ERROR' }, 'capture failed');
    }
  })();
  return reply.code(202).send({ id, status: job.status, statusUrl: `/v1/captures/${id}`, note: 'Prototype download only; files are not added to a persistent library.' });
});
app.get<{ Params: { id: string } }>('/v1/captures/:id', async (request, reply) => {
  const job = jobs.get(request.params.id);
  if (!job) return reply.code(404).send({ error: 'Capture job not found. Jobs are temporary and cleared on restart.' });
  return { ...job };
});
app.setErrorHandler((error, _request, reply) => {
  app.log.error({ err: error }, 'request error');
  reply.code(500).send({ error: 'An unexpected server error occurred.' });
});

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
