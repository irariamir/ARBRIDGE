import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

type PairingState = 'waiting_for_bot' | 'waiting_for_extension';
type Pairing = {
  id: string; commandCode: string; confirmCode?: string; state: PairingState;
  expiresAt: number; attempts: number; telegramUserId?: number; chatId?: number;
};
type Session = { telegramUserId: number; chatId: number; expiresAt: number };
export type TelegramIdentity = { telegramUserId: number; chatId: number };

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
function constantTimeTextEqual(left: string, right: string): boolean {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export class PairingService {
  private readonly pairings = new Map<string, Pairing>();
  private readonly sessions = new Map<string, Session>();
  constructor(private readonly now = () => Date.now()) {}

  create() {
    this.prune();
    if (this.pairings.size >= 500) throw new Error('PAIRING_CAPACITY');
    let commandCode: string;
    do { commandCode = randomInt(0, 1_000_000).toString().padStart(6, '0'); }
    while ([...this.pairings.values()].some((pairing) => pairing.commandCode === commandCode && pairing.expiresAt > this.now()));
    const id = randomBytes(24).toString('base64url');
    const pairing: Pairing = { id, commandCode, state: 'waiting_for_bot', expiresAt: this.now() + 5 * 60_000, attempts: 0 };
    this.pairings.set(id, pairing);
    return { id, commandCode, expiresAt: new Date(pairing.expiresAt).toISOString() };
  }

  consumeCommandCode(code: string, identity: TelegramIdentity) {
    this.prune();
    const pairing = [...this.pairings.values()].find((item) => item.state === 'waiting_for_bot' && constantTimeTextEqual(item.commandCode, code));
    if (!pairing) throw new Error('PAIRING_CODE_INVALID');
    if (pairing.attempts >= 5) { this.pairings.delete(pairing.id); throw new Error('PAIRING_ATTEMPTS_EXCEEDED'); }
    pairing.telegramUserId = identity.telegramUserId;
    pairing.chatId = identity.chatId;
    pairing.confirmCode = randomInt(0, 1_000_000).toString().padStart(6, '0');
    pairing.state = 'waiting_for_extension';
    return { pairingId: pairing.id, confirmationCode: pairing.confirmCode, expiresAt: new Date(pairing.expiresAt).toISOString() };
  }

  confirm(id: string, code: string) {
    this.prune();
    const pairing = this.pairings.get(id);
    if (!pairing || pairing.state !== 'waiting_for_extension' || !pairing.confirmCode) throw new Error('PAIRING_NOT_READY');
    if (!constantTimeTextEqual(pairing.confirmCode, code)) {
      pairing.attempts += 1;
      if (pairing.attempts >= 5) this.pairings.delete(id);
      throw new Error('PAIRING_CODE_INVALID');
    }
    const token = randomBytes(32).toString('base64url');
    const identity = { telegramUserId: pairing.telegramUserId!, chatId: pairing.chatId! };
    this.sessions.set(hash(token), { ...identity, expiresAt: this.now() + 30 * 24 * 60 * 60_000 });
    this.pairings.delete(id);
    return { accessToken: token, telegramUserId: identity.telegramUserId, expiresInSeconds: 30 * 24 * 60 * 60 };
  }

  getStatus(id: string) {
    this.prune();
    const pairing = this.pairings.get(id);
    if (!pairing) return undefined;
    return { status: pairing.state, expiresAt: new Date(pairing.expiresAt).toISOString() };
  }

  authenticate(token: string | undefined) {
    if (!token || token.length > 200) return undefined;
    const key = hash(token); const session = this.sessions.get(key);
    if (!session || session.expiresAt <= this.now()) { this.sessions.delete(key); return undefined; }
    return { telegramUserId: session.telegramUserId, chatId: session.chatId, expiresAt: session.expiresAt };
  }

  revoke(token: string | undefined) {
    if (!token || token.length > 200) return false;
    return this.sessions.delete(hash(token));
  }

  private prune() {
    const now = this.now();
    for (const [id, pairing] of this.pairings) if (pairing.expiresAt <= now) this.pairings.delete(id);
    for (const [tokenHash, session] of this.sessions) if (session.expiresAt <= now) this.sessions.delete(tokenHash);
  }
}
