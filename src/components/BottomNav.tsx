import { BookOpen, Bookmark, CheckCircle2 } from 'lucide-react'
import type { Tab } from '../App'

const TABS: { id: Tab; label: string; Icon: React.FC<{ size?: number }> }[] = [
  { id: 'reading',   label: 'Reading',      Icon: BookOpen },
  { id: 'want',      label: 'Want to Read', Icon: Bookmark },
  { id: 'completed', label: 'Completed',    Icon: CheckCircle2 },
]

export default function BottomNav({
  active,
  onTab,
}: {
  active: Tab
  onTab: (t: Tab) => void
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
            <Icon size={22} />
            <span style={{ fontSize: 10, fontWeight: 700 }}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
