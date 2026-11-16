import { timingSafeEqual } from 'node:crypto';
import { PairingService } from './pairings.js';

export type CaptureJob = {
  id: string; telegramUserId: number; status: 'queued' | 'downloading' | 'validating' | 'uploading' | 'complete' | 'failed';
  title: string; sourceHost: string; createdAt: string; bytes: number; fileType?: string; error?: string; telegramMessageId?: number;
};

export const pairingService = new PairingService();
export const jobs = new Map<string, CaptureJob>();
export const duplicateCaptures = new Map<string, { jobId: string; createdAt: number }>();

export const internalSecret = process.env.INTERNAL_API_SECRET ?? '';
export function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}
