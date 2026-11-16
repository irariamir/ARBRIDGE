export type CaptureStatus = 'queued' | 'downloading' | 'validating' | 'uploading' | 'complete' | 'failed';
export type CaptureRequest = { url: string; title?: string };
export type CaptureJob = { id: string; status: CaptureStatus; title: string; sourceHost: string; createdAt: string; bytes: number; fileType?: string; error?: string };

export const PLAN_CATALOG = [
  { id: 'monthly', name: 'Monthly', price: '$4.99', interval: 'month', durationDays: 30, summary: 'Illustrative monthly subscription price.' },
  { id: 'annual', name: 'Annual', price: '$49.99', interval: 'year', durationDays: 365, summary: 'Illustrative annual subscription price.' }
] as const;
export type PlanId = (typeof PLAN_CATALOG)[number]['id'];
export function getPlan(planId: string) { return PLAN_CATALOG.find((plan) => plan.id === planId); }
