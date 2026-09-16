import { WifiOff } from 'lucide-react'
import { useOnline } from './useOnline'

export default function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div style={{
      height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      background: 'var(--y-warn)', flexShrink: 0,
    }}>
      <WifiOff size={13} style={{ color: '#1A1208' }} />
      <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#1A1208' }}>
        Offline — downloads only
      </span>
    </div>
  )
}
