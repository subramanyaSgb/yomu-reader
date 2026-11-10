// In-app site view (Phase 19): a web: series whose chapters the generic extractor
// can't list is read as the site's own pages, served through the worker's /web route
// (site scripts, frames and forms blocked; images via the image proxy).
// The cleaned page reports where the reader is; we store that as ordinary Progress
// (lastChapterId = page URL, position = image anchor) so tapping the series later
// reopens the same page at the same spot.

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ExternalLink, Info } from 'lucide-react'
import { CATALOG, webUrlOf } from '../../catalog'
import { getProgress, saveProgress } from '../../lib/db/repo'
import { PROXY_ORIGIN, siteViewUrl, webEnabled } from '../../lib/kakalot/client'
import { appendHistory } from '../history/history'
import { saveSeriesMeta } from '../shelf/seriesMeta'
import { chapterNumberOf } from '../shelf/addSeries'

const FAIL_TEXT: Record<string, string> = {
  blocked: 'This site blocks Yomu’s cleaned view.',
  unreachable: 'The site did not answer.',
  'not-a-page': 'That link is not a web page.',
  locked: 'Reading other sites inside Yomu is not switched on yet (key missing).',
}

interface Spot { url: string; img: number; off: number }

export default function SiteView({ seriesId, onBack, onInfo }: { seriesId: string; onBack: () => void; onInfo: () => void }) {
  const seriesTitle = CATALOG.find(e => e.id === seriesId)?.title ?? 'Site'
  const seriesUrl = webUrlOf(seriesId)
  const [src, setSrc] = useState<string | null>(null)
  const [pageTitle, setPageTitle] = useState('')
  const [fail, setFail] = useState<string | null>(webEnabled() ? null : 'locked')
  const frame = useRef<HTMLIFrameElement>(null)
  const spot = useRef<Spot | null>(null)
  const pageUrl = useRef(seriesUrl)

  // Resume: last page + image anchor, else the series page.
  useEffect(() => {
    let alive = true
    getProgress(seriesId).then(p => {
      if (!alive) return
      const url = p && /^https?:\/\//.test(p.lastChapterId) ? p.lastChapterId : seriesUrl
      const anchor = p?.position.kind === 'scroll' ? { img: p.position.imageIndex, off: p.position.offsetPct } : undefined
      pageUrl.current = url
      setSrc(siteViewUrl(url, anchor))
    })
    return () => { alive = false }
  }, [seriesId, seriesUrl])

  const flush = useCallback(() => {
    const s = spot.current
    if (!s) return
    void saveProgress({
      seriesId, lastChapterId: s.url, mode: 'scroll',
      position: { kind: 'scroll', imageIndex: s.img, offsetPct: s.off },
      updatedAt: Date.now(),
    })
  }, [seriesId])

  useEffect(() => {
    let timer: number | undefined
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== PROXY_ORIGIN || e.source !== frame.current?.contentWindow) return
      const d = e.data as { yomu?: string; url?: string; title?: string; img?: number; off?: number; reason?: string } | null
      if (d?.yomu === 'fail') { setFail(d.reason ?? 'unreachable'); return }
      if (d?.yomu !== 'pos' || typeof d.url !== 'string') return
      spot.current = { url: d.url, img: Number(d.img) || 0, off: Number(d.off) || 0 }
      setPageTitle(d.title ?? '')
      if (d.url !== pageUrl.current) {
        // New page: save at once and note the chapter for the shelf card + history.
        pageUrl.current = d.url
        flush()
        const number = chapterNumberOf(d.url, d.title)
        if (number != null) {
          void saveSeriesMeta(seriesId, { lastNumber: number })
          void appendHistory({ seriesId, title: seriesTitle, chapterId: d.url, number })
        }
      } else {
        window.clearTimeout(timer)
        timer = window.setTimeout(flush, 1500)
      }
    }
    const onHide = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('message', onMessage)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('message', onMessage)
      document.removeEventListener('visibilitychange', onHide)
      window.clearTimeout(timer)
      flush()
    }
  }, [flush, seriesId, seriesTitle])

  const openDirect = () => window.open(spot.current?.url ?? pageUrl.current, '_blank', 'noopener')
  const iconBtn = { width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--y-mid)', flexShrink: 0 } as const

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--y-bg)' }}>
      <header style={{ height: 48, display: 'flex', alignItems: 'center', padding: '0 4px', borderBottom: '1px solid var(--y-line)', flexShrink: 0 }}>
        <button onClick={onBack} aria-label="Back" style={{ ...iconBtn, color: 'var(--y-hi)' }}><ArrowLeft size={20} /></button>
        <div style={{ flex: 1, minWidth: 0, padding: '0 4px' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--y-hi)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{seriesTitle}</div>
          {pageTitle && <div style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--y-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pageTitle}</div>}
        </div>
        <button onClick={onInfo} aria-label="Series page" style={iconBtn}><Info size={19} /></button>
        <button onClick={openDirect} aria-label="Open the original site" style={iconBtn}><ExternalLink size={18} /></button>
      </header>

      {fail ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 28, textAlign: 'center' }}>
          <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--y-hi)', margin: 0 }}>{FAIL_TEXT[fail] ?? FAIL_TEXT.unreachable}</p>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--y-dim)', margin: 0, lineHeight: 1.6 }}>You can still open the site as it is. Yomu will not be able to track your place there.</p>
          <button onClick={openDirect} style={{ height: 46, padding: '0 22px', borderRadius: 12, border: 'none', background: 'var(--y-p)', color: 'var(--y-onp)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Open site</button>
        </div>
      ) : (
        src && (
          <iframe
            ref={frame}
            src={src}
            title={seriesTitle}
            sandbox="allow-scripts allow-same-origin"
            referrerPolicy="no-referrer"
            style={{ flex: 1, width: '100%', border: 'none', background: '#fff' }}
          />
        )
      )}
    </div>
  )
}
