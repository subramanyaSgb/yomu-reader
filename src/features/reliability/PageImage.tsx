// Page image with per-image retry (FR-36 AC3). A failed page shows a retry affordance
// instead of a broken image; retry re-requests with a cache-busting nonce.
import { useState } from 'react'

export default function PageImage({ src, alt = '' }: { src: string; alt?: string }) {
  const [nonce, setNonce] = useState(0)
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="flex h-40 items-center justify-center bg-neutral-900">
        <button
          onClick={() => {
            setFailed(false)
            setNonce((n) => n + 1)
          }}
          className="rounded-lg bg-neutral-700 px-3 py-1 text-sm text-white"
        >
          Retry page
        </button>
      </div>
    )
  }

  const bust = nonce > 0 ? `${src}${src.includes('?') ? '&' : '?'}r=${nonce}` : src
  return (
    <img
      src={bust}
      alt={alt}
      loading="lazy"
      className="w-full select-none"
      onError={() => setFailed(true)}
    />
  )
}
