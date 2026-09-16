// Per-series read-chapter tracking (comix-style checkmarks). A chapter counts as read
// the moment it's opened in the reader; rows can also be toggled manually. Stored as a
// plain id list in Dexie settings.

import { useCallback, useEffect, useState } from 'react'
import { getSetting, setSetting } from '../../lib/db/repo'

const key = (seriesId: string) => `read:${seriesId}`

export async function getReadList(seriesId: string): Promise<string[]> {
  return (await getSetting<string[]>(key(seriesId))) ?? []
}

export async function markChapterRead(seriesId: string, chapterId: string): Promise<void> {
  const list = await getReadList(seriesId)
  if (!list.includes(chapterId)) {
    list.push(chapterId)
    await setSetting(key(seriesId), list)
  }
}

export function useReadSet(seriesId: string | null | undefined) {
  const [readSet, setReadSet] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (!seriesId) return
    let alive = true
    getReadList(seriesId).then(l => { if (alive) setReadSet(new Set(l)) })
    return () => { alive = false }
  }, [seriesId])

  const toggle = useCallback(async (chapterId: string) => {
    if (!seriesId) return
    const list = await getReadList(seriesId)
    const next = list.includes(chapterId) ? list.filter(x => x !== chapterId) : [...list, chapterId]
    await setSetting(key(seriesId), next)
    setReadSet(new Set(next))
  }, [seriesId])

  return { readSet, toggle }
}
