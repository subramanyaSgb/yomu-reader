import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { loadStoredTheme } from './styles/theme'
import { ToastProvider } from './components/Toast'
import BottomNav from './components/BottomNav'
import OfflineBanner from './features/reliability/OfflineBanner'
import OnboardingScreen from './features/onboarding/OnboardingScreen'
import { hasSeenOnboarding } from './features/onboarding/Onboarding'
import HomeScreen from './features/discovery/HomeScreen'
import SearchScreen from './features/discovery/SearchScreen'
import SeriesDetail from './features/discovery/SeriesDetail'
import LibraryScreen from './features/library/LibraryScreen'
import StorageScreen from './features/storage/StorageScreen'
// Lazy: ProfileScreen is the only route that needs the ~540KB firebase chunk.
const ProfileScreen = lazy(() => import('./features/sync/ProfileScreen'))
import LocalFilesScreen from './features/localfiles/LocalFilesScreen'
import UnreadScreen from './features/discovery/UnreadScreen'
import ReaderShell from './features/reader/ReaderShell'
import type { SeriesType } from './lib/db/schema'

export type Tab = 'home' | 'search' | 'library' | 'storage' | 'profile'
export type SeriesSource = 'mangadex' | 'kakalot' | 'comick'

// Non-tab overlaid screens
type OverlayScreen =
  | { kind: 'detail'; id: string; source: SeriesSource }
  | { kind: 'reader'; id: string; source: SeriesSource; type: SeriesType; startChapterId?: string }
  | { kind: 'unread' }
  | { kind: 'local' }

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const prevTabRef = useRef<Tab>('home')
  const [overlay, setOverlay] = useState<OverlayScreen | null>(null)
  const [onboarding, setOnboarding] = useState<boolean | null>(null)

  useEffect(() => {
    loadStoredTheme()
    hasSeenOnboarding().then(seen => setOnboarding(!seen))
  }, [])

  // Back-nav guard: never navigate to the screen already showing
  function goBack() {
    if (!overlay) {
      // already at top — shouldn't happen
      return
    }
    setOverlay(null)
  }

  function openSeries(id: string, source: SeriesSource = 'mangadex') {
    setOverlay({ kind: 'detail', id, source })
  }

  function openReader(id: string, source: SeriesSource, type: SeriesType = 'manga', startChapterId?: string) {
    setOverlay({ kind: 'reader', id, source, type, startChapterId })
  }

  function switchTab(t: Tab) {
    if (t === tab && !overlay) return // guard: already showing
    prevTabRef.current = tab
    setOverlay(null)
    setTab(t)
  }

  if (onboarding === null) return null
  if (onboarding) return <OnboardingScreen onDone={() => setOnboarding(false)} />

  // Reader is fully immersive — no BottomNav, no banner
  if (overlay?.kind === 'reader') {
    return (
      <ToastProvider>
        <div style={{ height: '100dvh', background: 'var(--y-black)' }}>
          <ReaderShell
            seriesId={overlay.id}
            seriesSource={overlay.source}
            seriesType={overlay.type}
            startChapterId={overlay.startChapterId}
            onClose={goBack}
          />
        </div>
      </ToastProvider>
    )
  }

  return (
    <ToastProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--y-bg)' }}>
        <OfflineBanner />

        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {overlay?.kind === 'detail' && (
            <SeriesDetail
              id={overlay.id}
              source={overlay.source}
              onBack={goBack}
              onRead={(readId, readSource, startChapterId) =>
                openReader(readId ?? overlay.id, readSource ?? overlay.source, 'manga', startChapterId)}
            />
          )}
          {overlay?.kind === 'local' && (
            <LocalFilesScreen onBack={goBack} />
          )}
          {overlay?.kind === 'unread' && (
            <UnreadScreen onBack={goBack} onOpen={openSeries} />
          )}
          {!overlay && tab === 'home'    && <HomeScreen onOpen={openSeries} onUnread={() => setOverlay({ kind: 'unread' })} />}
          {!overlay && tab === 'search'  && <SearchScreen onOpen={openSeries} />}
          {!overlay && tab === 'library' && <LibraryScreen onOpen={openSeries} />}
          {!overlay && tab === 'storage' && <StorageScreen />}
          {!overlay && tab === 'profile' && (
            <Suspense fallback={<div style={{ padding: 18 }}><div style={{ height: 120, borderRadius: 16, background: 'var(--y-surf)' }} /></div>}>
              <ProfileScreen onLocalFiles={() => setOverlay({ kind: 'local' })} />
            </Suspense>
          )}
        </main>

        {/* BottomNav: hidden inside readers and full-overlay screens */}
        {!overlay && (
          <BottomNav active={tab} onTab={switchTab} />
        )}
      </div>
    </ToastProvider>
  )
}
