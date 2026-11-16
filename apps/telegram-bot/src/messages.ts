export const unavailableCommandReplies = {
  library: 'The shared library is not connected yet.',
  search: 'Document search is not available until document storage and indexing are implemented.',
  settings: 'Account settings are not available until secure accounts are implemented.',
  account: 'No account has been paired. Secure pairing is not enabled in this prototype.',
  status: 'There are no persisted processing jobs in this prototype.',
  delete: 'Document deletion is unavailable because no document library is connected.'
} as const;
