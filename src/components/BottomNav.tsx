import { Home, Search, BookOpen, HardDrive, User } from 'lucide-react'
import type { Tab } from '../App'

const TABS: { id: Tab; label: string; Icon: React.FC<{ size?: number }> }[] = [
  { id: 'home',    label: 'Home',    Icon: Home },
  { id: 'search',  label: 'Search',  Icon: Search },
  { id: 'library', label: 'Library', Icon: BookOpen },
  { id: 'storage', label: 'Storage', Icon: HardDrive },
  { id: 'profile', label: 'Profile', Icon: User },
]

export default function BottomNav({
  active,
  onTab,
  unreadCount = 0,
}: {
  active: Tab
  onTab: (t: Tab) => void
  unreadCount?: number
}) {
  return (
    <nav
      style={{
        height: 78,
        background: 'var(--y-ov)',
        borderTop: '1px solid var(--y-line)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexShrink: 0,
      }}
    >
      {TABS.map(({ id, label, Icon }) => {
        const isActive = active === id
        const color = isActive ? 'var(--y-plt)' : 'var(--y-dim)'
        return (
          <button
            key={id}
            onClick={() => onTab(id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 3, paddingTop: 7, paddingBottom: 15,
              background: 'none', border: 'none', cursor: 'pointer',
              color, position: 'relative',
            }}
          >
            <div style={{ position: 'relative' }}>
              <Icon size={22} />
              {id === 'library' && unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -6,
                  background: 'var(--y-a)', color: 'var(--y-onp)',
                  fontSize: 9, fontWeight: 800,
                  borderRadius: 6, minWidth: 16, height: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px',
                }}>{unreadCount}</span>
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: 700 }}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
