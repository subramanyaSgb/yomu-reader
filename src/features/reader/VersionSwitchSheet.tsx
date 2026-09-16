import type { ResolvedVersion } from './versionResolver'

interface Props {
  versions: ResolvedVersion[]
  selectedId: string
  onPick: (versionId: string) => void
  onClose: () => void
}

export default function VersionSwitchSheet({ versions, selectedId, onPick, onClose }: Props) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div style={{ width: '100%', borderRadius: '20px 20px 0 0', background: 'var(--y-surf)', border: '1px solid var(--y-line)', padding: '20px 18px 32px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--y-hi)' }}>Switch version</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--y-mid)', marginTop: 2 }}>All English versions · preferred group with gap-fill</div>
          </div>
          <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--y-line)', border: 'none', cursor: 'pointer', color: 'var(--y-hi)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        {versions.map(v => {
          const selected = v.id === selectedId
          return (
            <button key={v.id} onClick={() => onPick(v.id)} style={{
              width: '100%', minHeight: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 14px', borderRadius: 12, marginBottom: 6,
              background: selected ? 'var(--y-pa)' : 'var(--y-surf2)',
              border: `1px solid ${selected ? 'var(--y-p)' : 'var(--y-line)'}`,
              cursor: 'pointer', textAlign: 'left',
            }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: selected ? 'var(--y-plt)' : 'var(--y-hi)' }}>{v.group}</div>
                <div style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--y-dim)' }}>MangaDex · {v.likes} likes · {v.pages}p</div>
              </div>
              {selected && <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--y-p)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--y-onp)', fontSize: 11, fontWeight: 800 }}>✓</div>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
