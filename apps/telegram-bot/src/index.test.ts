import { describe, expect, it } from 'vitest';
import { unavailableCommandReplies } from './messages.js';

describe('bot command contract', () => {
  it('has an honest response for each unavailable command', () => {
    expect(Object.keys(unavailableCommandReplies)).toEqual(['library', 'search', 'settings', 'account', 'status', 'delete']);
    expect(unavailableCommandReplies.account).toMatch(/not enabled/i);
    expect(unavailableCommandReplies.library).toMatch(/not connected/i);
    expect(unavailableCommandReplies.delete).toMatch(/unavailable/i);
  });
});
