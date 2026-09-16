// Backup/restore: all reading state (shelves, progress, read marks, series meta,
// reader settings) lives in Dexie `settings` + `progress` — one JSON file covers it.
// Downloads/image bytes are intentionally excluded (re-downloadable, huge).

import { db } from '../../lib/db/schema'

interface BackupFile {
  app: 'yomu'
  version: 1
  exportedAt: string
  settings: Array<{ key: string; value: unknown }>
  progress: unknown[]
}

export async function exportBackup(): Promise<void> {
  const data: BackupFile = {
    app: 'yomu',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: await db.settings.toArray(),
    progress: await db.progress.toArray(),
  }
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `yomu-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

/** Restores a backup file. Merges over current state (newer file wins per key). */
export async function importBackup(file: File): Promise<{ settings: number; progress: number }> {
  const text = await file.text()
  const data = JSON.parse(text) as BackupFile
  if (data.app !== 'yomu' || !Array.isArray(data.settings)) {
    throw new Error('Not a Yomu backup file')
  }
  await db.settings.bulkPut(data.settings as never[])
  await db.progress.bulkPut((data.progress ?? []) as never[])
  return { settings: data.settings.length, progress: (data.progress ?? []).length }
}
