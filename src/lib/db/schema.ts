// Dexie schema — the local source of truth (CLAUDE.md: local-first; Firestore syncs on top).
// TDD §4. Phase 1 only defines the tables it uses now; later phases add downloads/imageBytes/
// bookmarks/stats/bubbles in their own version bumps (YAGNI — don't scaffold empty tables).

import Dexie, { type EntityTable } from 'dexie'

export type SeriesType = 'manga' | 'manhwa' | 'manhua' | 'local'
export type ReadMode = 'scroll' | 'paged'

export interface Series {
  id: string // MangaDex manga id (or local:<uuid>)
  source: 'mangadex' | 'local'
  title: string
  type: SeriesType
  cover?: string
  addedAt: number
  updatedAt: number
}

/** One resolved chapter (a chapter *number* with its selected version + the full pool). */
export interface ChapterRow {
  id: string // selected version's chapter id
  seriesId: string
  number: string | null
  selectedVersionId: string
  // Full version pool for the in-reader switcher (FR-3).
  versions: Array<{
    id: string
    group: string
    likes: number
    pages: number
  }>
  publishedAt: string
}

/** In-Phase-1 this is written but not yet synced; Phase 2/4 add persistence-on-close + sync. */
export interface Progress {
  seriesId: string
  lastChapterId: string
  mode: ReadMode
  // paged: pageIndex; scroll: image anchor + intra-image offset.
  position:
    | { kind: 'paged'; pageIndex: number }
    | { kind: 'scroll'; imageIndex: number; offsetPct: number }
  updatedAt: number
}

export interface Setting<T = unknown> {
  key: string
  value: T
}

class YomuDB extends Dexie {
  series!: EntityTable<Series, 'id'>
  chapters!: EntityTable<ChapterRow, 'id'>
  progress!: EntityTable<Progress, 'seriesId'>
  settings!: EntityTable<Setting, 'key'>

  constructor() {
    super('yomu')
    this.version(1).stores({
      series: 'id, source, type, updatedAt',
      chapters: 'id, seriesId',
      progress: 'seriesId, updatedAt',
      settings: 'key',
    })
  }
}

export const db = new YomuDB()
export { YomuDB }
