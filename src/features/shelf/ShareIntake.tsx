// Share target (Phase 19): Android's Share → Yomu opens the app with the shared link
// in the query string. A link inside a series Yomu can't track itself (site/external
// mode) becomes that series' resume point; anything else opens the add sheet with it.

import { useEffect } from 'react'
import { CATALOG } from '../../catalog'
import { useToast } from '../../components/Toast'
import { saveSitePlace } from '../site/sitePlace'
import { linkIn, matchSharedLink } from './addSeries'

export default function ShareIntake({ onAdd }: { onAdd: (link: string) => void }) {
  const toast = useToast()
  useEffect(() => {
    const q = new URLSearchParams(location.search)
    const shared = ['share_url', 'share_text', 'share_title'].map(k => q.get(k) ?? '').join(' ')
    if (!shared.trim()) return
    history.replaceState(history.state, '', location.pathname) // consume it (reload-safe)
    const link = linkIn(shared)
    if (!link) return
    const entry = matchSharedLink(link, CATALOG)
    if (entry?.mode) {
      void saveSitePlace(entry.id, link).then(() => toast.show(`Saved your place in ${entry.title}`))
    } else if (entry) {
      toast.show(`${entry.title} is already in your list`)
    } else {
      onAdd(link)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
