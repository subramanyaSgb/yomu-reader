// Per-series reader memory (FR-11 AC6): remembers mode, direction, fit, gap color, turn mode
// per series so the setup is restored automatically. Backed by the settings table.

import { useEffect, useState } from 'react'
import { getSetting, setSetting, readerMemoryKey } from '../../lib/db/repo'
import type { ReadMode } from '../../lib/db/schema'
import type { TurnMode } from './curl/capability'

export type FitMode = 'width' | 'height' | 'original'

export interface ReaderMemory {
  mode?: ReadMode
  rtl: boolean
  fit: FitMode
  gapColor: string
  turn?: TurnMode
  brightness: number // 0..1 dim overlay (0 = none)
}

export const DEFAULT_MEMORY: ReaderMemory = {
  rtl: true,
  fit: 'width',
  gapColor: '#000000',
  brightness: 0,
}

export function useReaderMemory(seriesId: string) {
  const [mem, setMem] = useState<ReaderMemory>(DEFAULT_MEMORY)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    getSetting<ReaderMemory>(readerMemoryKey(seriesId)).then((v) => {
      if (!alive) return
      setMem({ ...DEFAULT_MEMORY, ...(v ?? {}) })
      setLoaded(true)
    })
    return () => {
      alive = false
    }
  }, [seriesId])

  function update(patch: Partial<ReaderMemory>) {
    setMem((prev) => {
      const next = { ...prev, ...patch }
      void setSetting(readerMemoryKey(seriesId), next)
      return next
    })
  }

  return { mem, update, loaded }
}
