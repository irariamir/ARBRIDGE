import { describe, expect, it } from 'vitest';
import { PairingService } from './pairings.js';

describe('Telegram confirmation pairing', () => {
  it('requires the bot round-trip and one-time confirmation before issuing a session', () => {
    const service = new PairingService();
    const challenge = service.create();
    expect(challenge.commandCode).toMatch(/^\d{6}$/);
    expect(service.getStatus(challenge.id)?.status).toBe('waiting_for_bot');
    const confirmation = service.consumeCommandCode(challenge.commandCode, { telegramUserId: 4201, chatId: 4201 });
    expect(service.getStatus(challenge.id)?.status).toBe('waiting_for_extension');
    const wrongCode = confirmation.confirmationCode === '000000' ? '000001' : '000000';
    expect(() => service.confirm(challenge.id, wrongCode)).toThrow('PAIRING_CODE_INVALID');
    const result = service.confirm(challenge.id, confirmation.confirmationCode);
    expect(service.authenticate(result.accessToken)?.telegramUserId).toBe(4201);
    expect(service.getStatus(challenge.id)).toBeUndefined();
    expect(() => service.confirm(challenge.id, confirmation.confirmationCode)).toThrow('PAIRING_NOT_READY');
  });

  it('expires unused pairing codes after five minutes', () => {
    let now = 10_000;
    const service = new PairingService(() => now);
    const challenge = service.create();
    now += 5 * 60_000;
    expect(service.getStatus(challenge.id)).toBeUndefined();
    expect(() => service.consumeCommandCode(challenge.commandCode, { telegramUserId: 1, chatId: 1 })).toThrow('PAIRING_CODE_INVALID');
  });

  it('limits wrong confirmation attempts and issues opaque sessions', () => {
    const service = new PairingService();
    const challenge = service.create();
    const confirmation = service.consumeCommandCode(challenge.commandCode, { telegramUserId: 1, chatId: 1 });
    const wrongCode = confirmation.confirmationCode === '999999' ? '999998' : '999999';
    for (let attempt = 0; attempt < 5; attempt += 1) expect(() => service.confirm(challenge.id, wrongCode)).toThrow('PAIRING_CODE_INVALID');
    expect(service.getStatus(challenge.id)).toBeUndefined();
  });
});
