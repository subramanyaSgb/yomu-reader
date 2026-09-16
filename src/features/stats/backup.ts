// Export / import (FR-28): serialize library + progress + settings + stats to a JSON blob
// the owner can download, and parse it back. A safety net beyond cloud sync. Pure.

export interface BackupPayload {
  version: 1
  exportedAt: number
  library: unknown[]
  progress: unknown[]
  settings: unknown[]
  stats: unknown[]
}

export function serializeBackup(
  data: Omit<BackupPayload, 'version' | 'exportedAt'>,
  now: number,
): string {
  const payload: BackupPayload = { version: 1, exportedAt: now, ...data }
  return JSON.stringify(payload)
}

export function parseBackup(json: string): BackupPayload {
  const p = JSON.parse(json)
  if (p?.version !== 1) throw new Error('unsupported backup version')
  for (const k of ['library', 'progress', 'settings', 'stats'] as const) {
    if (!Array.isArray(p[k])) throw new Error(`backup missing ${k}`)
  }
  return p as BackupPayload
}
