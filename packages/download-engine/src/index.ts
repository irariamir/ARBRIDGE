import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';
import { createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';

export class DownloadError extends Error {
  constructor(message: string, readonly code: string) { super(message); this.name = 'DownloadError'; }
}

function ipv4ToInt(address: string): number {
  return address.split('.').reduce((value, octet) => ((value << 8) | Number(octet)) >>> 0, 0);
}
function inV4(address: string, network: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4ToInt(address) & mask) === (ipv4ToInt(network) & mask);
}
function isPublicIPv4(address: string): boolean {
  const blocked: Array<[string, number]> = [
    ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
    ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
    ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
    ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]
  ];
  return !blocked.some(([network, bits]) => inV4(address, network, bits));
}
function isPublicIPv6(address: string): boolean {
  const value = address.toLowerCase().split('%')[0];
  if (value.startsWith('::ffff:')) {
    const mapped = value.slice(7);
    return isIP(mapped) === 4 && isPublicIPv4(mapped);
  }
  // Only globally routable unicast (2000::/3); exclude documentation and special-purpose blocks.
  const first = Number.parseInt(value.split(':')[0] || '0', 16);
  if ((first & 0xe000) !== 0x2000) return false;
  if (value.startsWith('2001:0:') || value.startsWith('2001:db8:') || value.startsWith('2001:10:') || value.startsWith('2001:20:') || value.startsWith('2002:') || value.startsWith('3ffe:')) return false;
  return true;
}
export function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  return version === 4 ? isPublicIPv4(address) : version === 6 ? isPublicIPv6(address) : false;
}

export function validateDownloadUrl(input: string): URL {
  let url: URL;
  try { url = new URL(input); } catch { throw new DownloadError('Enter a valid web URL.', 'INVALID_URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443') {
    throw new DownloadError('Only public HTTPS links on the standard port are supported.', 'UNSUPPORTED_URL');
  }
  if (url.hostname.endsWith('.') || url.hostname === 'localhost' || url.hostname.endsWith('.localhost') || url.hostname.endsWith('.local')) {
    throw new DownloadError('This address is not available for remote downloads.', 'PRIVATE_ADDRESS');
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(hostname) && !isPublicAddress(hostname)) throw new DownloadError('This address is not available for remote downloads.', 'PRIVATE_ADDRESS');
  url.hash = '';
  return url;
}

async function resolvePublic(hostname: string): Promise<Array<{ address: string; family: number }>> {
  if (isIP(hostname)) {
    if (!isPublicAddress(hostname)) throw new DownloadError('This address is not available for remote downloads.', 'PRIVATE_ADDRESS');
    return [{ address: hostname, family: isIP(hostname) }];
  }
  let answers: Array<{ address: string; family: number }>;
  try { answers = await lookup(hostname, { all: true, verbatim: true }) as unknown as Array<{ address: string; family: number }>; }
  catch { throw new DownloadError('The download host could not be resolved.', 'DNS_FAILURE'); }
  if (!answers.length || answers.some(({ address }) => !isPublicAddress(address))) {
    throw new DownloadError('The download host resolves to a restricted network address.', 'PRIVATE_ADDRESS');
  }
  return answers;
}

type DownloadOptions = {
  maxBytes?: number; timeoutMs?: number; maxRedirects?: number;
  onProgress?: (received: number, total?: number) => void;
};
const REDIRECTS = new Set([301, 302, 303, 307, 308]);

async function requestHop(url: URL, options: DownloadOptions, hops: number): Promise<{ path: string; bytes: number; contentType: string; finalUrl: string }> {
  const addresses = await resolvePublic(url.hostname.replace(/^\[|\]$/g, ''));
  return new Promise((resolve, reject) => {
    let settled = false;
    const finishError = (error: Error) => { if (!settled) { settled = true; reject(error); } };
    const req = httpsRequest(url, {
      method: 'GET', timeout: options.timeoutMs ?? 20_000,
      headers: { 'User-Agent': 'ARBRIDGE-fetch/0.1 (+https://ariamir.ct.ws)', Accept: 'application/pdf,application/zip,image/*,text/plain,application/octet-stream;q=0.8' },
      // Pin this connection to the exact address validated above. TLS SNI/Host remain the URL hostname.
      lookup: ((_hostname: string, options: unknown, callback?: (error: NodeJS.ErrnoException | null, address: string | Array<{ address: string; family: number }>, family?: number) => void) => {
        const done = typeof options === 'function' ? options as (error: NodeJS.ErrnoException | null, address: string | Array<{ address: string; family: number }>, family?: number) => void : callback;
        if (!done) throw new DownloadError('The pinned DNS lookup callback is unavailable.', 'DNS_FAILURE');
        const selected = addresses[0]!;
        // Node may request all DNS answers when auto-selecting an address family.
        const wantsAll = Boolean(options && typeof options === 'object' && 'all' in options && (options as { all?: boolean }).all);
        if (wantsAll) done(null, [selected]);
        else done(null, selected.address, selected.family);
      }) as import('node:tls').ConnectionOptions['lookup']
    }, (response) => {
      const status = response.statusCode ?? 0;
      if (REDIRECTS.has(status)) {
        const location = response.headers.location;
        response.resume();
        if (!location) return finishError(new DownloadError('The server returned an invalid redirect.', 'BAD_REDIRECT'));
        if (hops >= (options.maxRedirects ?? 4)) return finishError(new DownloadError('The download exceeded the redirect limit.', 'TOO_MANY_REDIRECTS'));
        let next: URL;
        try { next = validateDownloadUrl(new URL(location, url).toString()); }
        catch (error) { return finishError(error instanceof Error ? error : new Error('Invalid redirect.')); }
        settled = true;
        void requestHop(next, options, hops + 1).then(resolve, reject);
        return;
      }
      if (status < 200 || status >= 300) {
        response.resume();
        return finishError(new DownloadError(`The source returned HTTP ${status}.`, 'SOURCE_HTTP_ERROR'));
      }
      const maxBytes = options.maxBytes ?? 20 * 1024 * 1024;
      const declared = Number(response.headers['content-length']);
      if (Number.isFinite(declared) && declared > maxBytes) {
        response.destroy();
        return finishError(new DownloadError('The file exceeds the configured size limit.', 'FILE_TOO_LARGE'));
      }
      const contentType = (response.headers['content-type'] ?? 'application/octet-stream').split(';')[0]!.trim().toLowerCase();
      void (async () => {
        const directory = await mkdtemp(join(tmpdir(), 'arbridge-'));
        const path = join(directory, randomUUID());
        let bytes = 0;
        response.on('data', (chunk: Buffer) => {
          bytes += chunk.length;
          options.onProgress?.(bytes, Number.isFinite(declared) ? declared : undefined);
          if (bytes > maxBytes) response.destroy(new DownloadError('The file exceeds the configured size limit.', 'FILE_TOO_LARGE'));
        });
        try {
          await pipeline(response, createWriteStream(path, { flags: 'wx', mode: 0o600 }));
          if (settled) { await rm(directory, { recursive: true, force: true }); return; }
          settled = true;
          resolve({ path, bytes, contentType, finalUrl: url.toString() });
        } catch (error) {
          await rm(directory, { recursive: true, force: true });
          finishError(error instanceof Error ? error : new Error('Download failed.'));
        }
      })().catch(finishError);
    });
    req.on('timeout', () => req.destroy(new DownloadError('The download timed out.', 'TIMEOUT')));
    req.on('error', finishError);
    req.end();
  });
}

export type SupportedFile = 'pdf' | 'zip' | 'png' | 'jpeg' | 'gif' | 'webp' | 'text' | 'unknown';
export async function detectFileType(path: string): Promise<SupportedFile> {
  const { open } = await import('node:fs/promises');
  const file = await open(path, 'r');
  try {
    const header = Buffer.alloc(16);
    const { bytesRead } = await file.read(header, 0, header.length, 0);
    const b = header.subarray(0, bytesRead);
    if (b.subarray(0, 5).toString() === '%PDF-') return 'pdf';
    if (b.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) return 'zip';
    if (b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
    if (b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'jpeg';
    if (b.subarray(0, 6).toString() === 'GIF87a' || b.subarray(0, 6).toString() === 'GIF89a') return 'gif';
    if (b.length >= 12 && b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return 'webp';
    // Text is accepted only if the first bytes are valid UTF-8 without control bytes.
    const text = new TextDecoder('utf-8', { fatal: true });
    try {
      const decoded = text.decode(b);
      if (!/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(decoded)) return 'text';
    } catch { /* not plain text */ }
    return 'unknown';
  } finally { await file.close(); }
}

export async function downloadPublicFile(input: string, options: DownloadOptions = {}) {
  const url = validateDownloadUrl(input);
  const result = await requestHop(url, options, 0);
  const type = await detectFileType(result.path);
  if (type === 'unknown') {
    await rm(join(result.path, '..'), { recursive: true, force: true });
    throw new DownloadError('The downloaded content is not a supported document type.', 'UNSUPPORTED_FILE');
  }
  return { ...result, type, cleanup: () => rm(join(result.path, '..'), { recursive: true, force: true }) };
}
