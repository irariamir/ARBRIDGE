import { describe, expect, it } from 'vitest';
import { formatTransferStatus } from './messages.js';

describe('transfer status formatting', () => {
  it('shows the delivered file name, type, and source host', () => {
    expect(formatTransferStatus({ title: 'notes.pdf', fileType: 'pdf', sourceHost: 'example.org' }))
      .toBe('• notes.pdf — pdf · example.org');
  });
  it('uses a generic type when the file type is missing', () => {
    expect(formatTransferStatus({ title: 'notes', sourceHost: 'example.org' }))
      .toBe('• notes — file · example.org');
  });
});
