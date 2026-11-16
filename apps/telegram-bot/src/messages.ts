export function formatTransferStatus(document: { title: string; sourceHost: string; fileType?: string }): string {
  return `• ${document.title} — ${document.fileType ?? 'file'} · ${document.sourceHost}`;
}
