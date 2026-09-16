// Source-death insurance: all reading state is keyed by a series' SOURCE id, which
// changes when a series has to move sources (it happened three times in one week).
// We remember which id each catalog TITLE last used; when the catalog ships a new id
// for a known title, the state (shelf, meta, reader prefs, progress) is renamed over.
// Read-marks reference old chapter ids and can't be renamed — instead we flag the
// series so SeriesDetail regenerates them from the last-read chapter number.

import { CATALOG } from '../../catalog'
import { db } from '../../lib/db/schema'
import { getSetting, setSetting } from '../../lib/db/repo'
import type { Shelf } from './shelf'

const MAP_KEY = 'idmap:v1'

export function migratedFlagKey(seriesId: string) {
  return `migratedFrom:${seriesId}`
}

async function moveSettingKey(oldKey: string, newKey: string) {
  const val = await getSetting(oldKey)
  if (val === undefined) return
  const existing = await getSetting(newKey)
  if (existing === undefined) await setSetting(newKey, val)
  await db.settings.delete(oldKey)
}

export async function migrateSeries(oldId: string, newId: string) {
  // shelf assignment
  const shelves = (await getSetting<Record<string, Shelf>>('shelves:v1')) ?? {}
  if (shelves[oldId] && !shelves[newId]) {
    shelves[newId] = shelves[oldId]
    delete shelves[oldId]
    await setSetting('shelves:v1', shelves)
  }
  // namespaced per-series settings
  for (const ns of ['seriesMeta:', 'readerMemory:']) {
    await moveSettingKey(ns + oldId, ns + newId)
  }
  await db.settings.delete('read:' + oldId) // old chapter ids are meaningless now
  // progress row (lastChapterId is stale — reader falls back to the chapter number)
  const prog = await db.progress.get(oldId)
  if (prog && !(await db.progress.get(newId))) {
    await db.progress.put({ ...prog, seriesId: newId })
    await db.progress.delete(oldId)
  }
  await setSetting(migratedFlagKey(newId), { from: oldId, at: Date.now() })
}

/** Run once at startup. Cheap no-op when nothing changed. */
export async function migrateChangedIds(): Promise<void> {
  const map = (await getSetting<Record<string, string>>(MAP_KEY)) ?? {}
  let dirty = false
  for (const entry of CATALOG) {
    if (!entry.id) continue
    const prev = map[entry.title]
    if (prev !== entry.id) {
      if (prev) await migrateSeries(prev, entry.id)
      map[entry.title] = entry.id
      dirty = true
    }
  }
  if (dirty) await setSetting(MAP_KEY, map)
}
