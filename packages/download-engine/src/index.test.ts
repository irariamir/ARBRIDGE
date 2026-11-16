import { describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isPublicAddress, validateDownloadUrl, DownloadError, detectFileType, contentDispositionFilename } from './index.js';

describe('public URL guard', () => {
  it('allows standard HTTPS URLs', () => {
    expect(validateDownloadUrl('https://example.com/paper.pdf').hostname).toBe('example.com');
  });
  it.each(['http://example.com/a', 'https://localhost/x', 'https://127.0.0.1/x', 'https://169.254.169.254/latest', 'https://user:pass@example.com/x', 'https://example.com:8443/x'])('rejects unsafe URL %s', (value) => {
    expect(() => validateDownloadUrl(value)).toThrow(DownloadError);
  });
  it('blocks private, transition and special-use IPs and allows public addresses', () => {
    for (const address of ['127.0.0.1', '10.4.1.9', '172.20.0.1', '192.168.1.1', '169.254.169.254', '::1', '::ffff:127.0.0.1', 'fc00::1', 'fe80::1', '2001:db8::1', '2001:0::1', '2002:7f00:1::1', '3ffe::1']) expect(isPublicAddress(address)).toBe(false);
    expect(isPublicAddress('8.8.8.8')).toBe(true);
    expect(isPublicAddress('2606:4700:4700::1111')).toBe(true);
  });
  it('extracts a safe server-provided filename including RFC 5987 encoding', () => {
    expect(contentDispositionFilename("attachment; filename*=UTF-8''Research%20Notes.pdf")).toBe('Research Notes.pdf');
    expect(contentDispositionFilename('attachment; filename="report.pdf"')).toBe('report.pdf');
    expect(contentDispositionFilename(undefined)).toBeUndefined();
  });
  it('recognizes actual file signatures rather than the extension name', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'arbridge-test-'));
    try {
      const pdf = join(directory, 'actually-not-a-pdf.txt');
      const invalid = join(directory, 'named.pdf');
      await writeFile(pdf, '%PDF-1.7\n');
      await writeFile(invalid, 'this is plain text');
      expect(await detectFileType(pdf)).toBe('pdf');
      expect(await detectFileType(invalid)).toBe('text');
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
