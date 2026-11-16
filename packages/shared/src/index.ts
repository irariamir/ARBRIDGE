export type CaptureStatus = 'queued' | 'downloading' | 'validating' | 'complete' | 'failed';
export type CaptureRequest = { url: string; title?: string };
export type CaptureJob = { id: string; status: CaptureStatus; title: string; sourceHost: string; createdAt: string; bytes: number; fileType?: string; error?: string };
