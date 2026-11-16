import { randomUUID, timingSafeEqual } from 'node:crypto';
import { getPlan, type PlanId } from '../../../packages/shared/src/index.js';
import { PairingService } from './pairings.js';

export type CaptureJob = {
  id: string; telegramUserId: number; status: 'queued' | 'downloading' | 'validating' | 'uploading' | 'complete' | 'failed';
  title: string; sourceHost: string; createdAt: string; bytes: number; fileType?: string; error?: string; telegramMessageId?: number;
};
export type ReceiptStatus = 'awaiting_proof' | 'pending_review' | 'approved' | 'rejected';
export type Receipt = {
  id: string; telegramUserId: number; chatId: number; planId: PlanId; status: ReceiptStatus;
  createdAt: string; proofFileName?: string; reviewedAt?: string; reviewedBy?: number; reviewNote?: string;
};
export type Subscription = { telegramUserId: number; planId: PlanId; status: 'active'; startedAt: string; expiresAt: string; approvedReceiptId: string };

export const pairingService = new PairingService();
export const jobs = new Map<string, CaptureJob>();
export const subscriptions = new Map<number, Subscription>();
export const receipts = new Map<string, Receipt>();
export const duplicateCaptures = new Map<string, { jobId: string; createdAt: number }>();

export const internalSecret = process.env.INTERNAL_API_SECRET ?? '';
export function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}
export function subscriptionIsActive(telegramUserId: number): boolean {
  const subscription = subscriptions.get(telegramUserId);
  return Boolean(subscription && subscription.status === 'active' && Date.parse(subscription.expiresAt) > Date.now());
}
export function createReceipt(telegramUserId: number, chatId: number, planId: string): Receipt {
  if (!process.env.PAYMENT_INSTRUCTIONS?.trim() || !process.env.TELEGRAM_REVIEW_CHAT_ID || !process.env.TELEGRAM_BOT_TOKEN || (process.env.INTERNAL_API_SECRET ?? '').length < 32 || !(process.env.TELEGRAM_ADMIN_USER_IDS ?? '').split(',').some((id) => Number.isSafeInteger(Number(id.trim())) && Number(id.trim()) > 0)) throw new Error('PAYMENTS_NOT_CONFIGURED');
  const plan = getPlan(planId);
  if (!plan) throw new Error('PLAN_NOT_FOUND');
  const existing = [...receipts.values()].find((receipt) => receipt.telegramUserId === telegramUserId && (receipt.status === 'awaiting_proof' || receipt.status === 'pending_review'));
  if (existing) return existing;
  const receipt: Receipt = { id: randomUUID(), telegramUserId, chatId, planId: plan.id, status: 'awaiting_proof', createdAt: new Date().toISOString() };
  receipts.set(receipt.id, receipt);
  return receipt;
}
export function getOpenReceipt(telegramUserId: number) {
  return [...receipts.values()].find((receipt) => receipt.telegramUserId === telegramUserId && receipt.status === 'awaiting_proof');
}
export function registerReceiptProof(id: string, telegramUserId: number, fileName: string) {
  const receipt = receipts.get(id);
  if (!receipt || receipt.telegramUserId !== telegramUserId || receipt.status !== 'awaiting_proof') throw new Error('RECEIPT_NOT_AWAITING_PROOF');
  receipt.proofFileName = fileName.slice(0, 200);
  receipt.status = 'pending_review';
  return receipt;
}
export function reviewReceipt(id: string, action: 'approve' | 'reject', reviewerId?: number, note?: string) {
  const receipt = receipts.get(id);
  if (!receipt || receipt.status !== 'pending_review') throw new Error('RECEIPT_NOT_PENDING');
  const plan = getPlan(receipt.planId)!;
  const now = Date.now();
  receipt.status = action === 'approve' ? 'approved' : 'rejected';
  receipt.reviewedAt = new Date(now).toISOString();
  if (reviewerId !== undefined) receipt.reviewedBy = reviewerId;
  if (note) receipt.reviewNote = note.slice(0, 300);
  if (action === 'approve') {
    const current = subscriptions.get(receipt.telegramUserId);
    const anchor = current && Date.parse(current.expiresAt) > now ? Date.parse(current.expiresAt) : now;
    subscriptions.set(receipt.telegramUserId, {
      telegramUserId: receipt.telegramUserId, planId: plan.id, status: 'active',
      startedAt: new Date(now).toISOString(), expiresAt: new Date(anchor + plan.durationDays * 24 * 60 * 60_000).toISOString(),
      approvedReceiptId: receipt.id
    });
  }
  return receipt;
}
