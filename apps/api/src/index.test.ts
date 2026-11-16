import { describe, expect, it } from 'vitest';
import { DownloadError, validateDownloadUrl } from '@arbridge/download-engine';

describe('capture URL validation', () => {
  it('normalizes safe public URL input', () => expect(validateDownloadUrl('https://example.org/file.pdf#part').hash).toBe(''));
  it('does not allow redirect/file URLs to internal services', () => {
    for (const url of ['http://example.org/x', 'https://127.0.0.1/x', 'https://169.254.169.254/latest/meta-data']) {
      expect(() => validateDownloadUrl(url)).toThrow(DownloadError);
    }
  });
});
