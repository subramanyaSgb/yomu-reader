// Wifi-only download guard (FR-17). Uses the Network Information API where available.
// ponytail: NetInfo is patchy across browsers — default to ALLOW when unknown, but expose
// the effective type so the UI can warn. User override always wins.

interface NetworkInformationLike {
  type?: string // 'wifi' | 'cellular' | ...
  effectiveType?: string // '4g' etc.
  saveData?: boolean
}

function conn(): NetworkInformationLike | undefined {
  if (typeof navigator === 'undefined') return undefined
  return (navigator as unknown as { connection?: NetworkInformationLike }).connection
}

export function isOnWifi(): boolean | undefined {
  const c = conn()
  if (!c?.type) return undefined // unknown
  return c.type === 'wifi' || c.type === 'ethernet'
}

export function saveDataRequested(): boolean {
  return !!conn()?.saveData
}

/**
 * May we download now? allowMobile overrides the wifi requirement.
 * Unknown network => allow (don't block a user whose browser hides NetInfo).
 */
export function mayDownload(allowMobile: boolean): boolean {
  if (allowMobile) return true
  const wifi = isOnWifi()
  return wifi !== false // allow on wifi OR unknown; block only when known-cellular
}
