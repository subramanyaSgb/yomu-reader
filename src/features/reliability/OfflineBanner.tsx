// Persistent offline banner (FR-36 AC1).
import { useOnline } from './useOnline'

export default function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div className="bg-orange-600 py-1 text-center text-xs text-white">
      Offline — reading downloaded chapters only
    </div>
  )
}
