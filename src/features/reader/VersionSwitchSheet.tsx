// In-reader "switch version" sheet (FR-3 AC3): lists all English versions of the current
// chapter number (group, likes, pages) and lets the user pick one; choice is remembered
// per series by the shell.

import type { ResolvedVersion } from './versionResolver'

interface Props {
  versions: ResolvedVersion[]
  selectedId: string
  onPick: (versionId: string) => void
  onClose: () => void
}

export default function VersionSwitchSheet({ versions, selectedId, onPick, onClose }: Props) {
  return (
    <div className="absolute inset-0 z-30 flex items-end bg-black/60" onClick={onClose}>
      <div
        className="w-full rounded-t-2xl bg-neutral-900 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 text-sm font-medium text-neutral-300">Switch version</div>
        {versions.map((v) => (
          <button
            key={v.id}
            onClick={() => onPick(v.id)}
            className={`mb-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left ${
              v.id === selectedId ? 'bg-violet-600 text-white' : 'bg-neutral-800 text-neutral-200'
            }`}
          >
            <span className="truncate">{v.group}</span>
            <span className="ml-2 shrink-0 text-xs opacity-70">
              ♥ {v.likes} · {v.pages}p
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
