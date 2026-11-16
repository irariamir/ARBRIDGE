import { afterEach, describe, expect, it } from 'vitest';
import { createReceipt, receipts, registerReceiptProof, reviewReceipt, subscriptions, subscriptionIsActive } from './state.js';

const keys = ['PAYMENT_INSTRUCTIONS', 'TELEGRAM_REVIEW_CHAT_ID', 'TELEGRAM_BOT_TOKEN', 'INTERNAL_API_SECRET', 'TELEGRAM_ADMIN_USER_IDS'] as const;
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
afterEach(() => {
  for (const key of keys) {
    const value = original[key];
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

describe('manual subscription review', () => {
  it('keeps payment requests disabled until operator configuration exists', () => {
    for (const key of keys) delete process.env[key];
    expect(() => createReceipt(987654321, 987654321, 'monthly')).toThrow('PAYMENTS_NOT_CONFIGURED');
  });
  it('activates access only after a pending receipt is explicitly approved', () => {
    process.env.PAYMENT_INSTRUCTIONS = 'Demo instructions configured by test';
    process.env.TELEGRAM_REVIEW_CHAT_ID = '-1001234567890';
    process.env.TELEGRAM_BOT_TOKEN = 'test-token-not-used-for-network';
    process.env.INTERNAL_API_SECRET = 'x'.repeat(40);
    process.env.TELEGRAM_ADMIN_USER_IDS = '123456789';
    const userId = 987654321;
    const receipt = createReceipt(userId, userId, 'monthly');
    expect(subscriptionIsActive(userId)).toBe(false);
    registerReceiptProof(receipt.id, userId, 'receipt.pdf');
    expect(subscriptionIsActive(userId)).toBe(false);
    reviewReceipt(receipt.id, 'approve', 123456789);
    expect(subscriptionIsActive(userId)).toBe(true);
    expect(subscriptions.get(userId)?.approvedReceiptId).toBe(receipt.id);
    expect(receipts.get(receipt.id)?.status).toBe('approved');
  });
  it('does not activate access when a proof is rejected', () => {
    process.env.PAYMENT_INSTRUCTIONS = 'Demo instructions configured by test';
    process.env.TELEGRAM_REVIEW_CHAT_ID = '-1001234567890';
    process.env.TELEGRAM_BOT_TOKEN = 'test-token-not-used-for-network';
    process.env.INTERNAL_API_SECRET = 'x'.repeat(40);
    process.env.TELEGRAM_ADMIN_USER_IDS = '123456789';
    const userId = 987654322;
    const receipt = createReceipt(userId, userId, 'annual');
    registerReceiptProof(receipt.id, userId, 'receipt.png');
    reviewReceipt(receipt.id, 'reject', 123456789, 'Unable to verify.');
    expect(subscriptionIsActive(userId)).toBe(false);
    expect(receipts.get(receipt.id)?.status).toBe('rejected');
  });
});
