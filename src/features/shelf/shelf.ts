// Shelf state: every catalog series lives on exactly one of three shelves.
// Default is 'want' (Want to Read); opening the reader promotes want → reading;
// 'completed' is set manually from the series page. Persisted in Dexie settings.

import { useCallback, useEffect, useState } from 'react'
import { getSetting, setSetting } from '../../lib/db/repo'

export type Shelf = 'reading' | 'want' | 'completed'

const KEY = 'shelves:v1'
type ShelfMap = Record<string, Shelf>

export async function getShelves(): Promise<ShelfMap> {
  return (await getSetting<ShelfMap>(KEY)) ?? {}
}

export async function setShelf(id: string, shelf: Shelf): Promise<void> {
  const m = await getShelves()
  m[id] = shelf
  await setSetting(KEY, m)
}

export function shelfOf(m: ShelfMap, id: string): Shelf {
  return m[id] ?? 'want'
}

/** Opening the reader moves a Want-to-Read series onto the Reading shelf. */
export async function markReadingIfWanted(id: string): Promise<void> {
  const m = await getShelves()
  if ((m[id] ?? 'want') === 'want') {
    m[id] = 'reading'
    await setSetting(KEY, m)
  }
}

export function useShelves() {
  const [shelves, setShelves] = useState<ShelfMap>({})
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    getShelves().then(m => { setShelves(m); setLoaded(true) })
  }, [])
  const set = useCallback((id: string, shelf: Shelf) => {
    setShelves(prev => ({ ...prev, [id]: shelf }))
    void setShelf(id, shelf)
  }, [])
  return { shelves, loaded, set }
}
