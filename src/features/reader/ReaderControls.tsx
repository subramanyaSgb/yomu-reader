import type { ReaderMemory, FitMode } from './useReaderMemory'

interface Props {
  mem: ReaderMemory
  update: (patch: Partial<ReaderMemory>) => void
  onClose: () => void
}

const FITS: FitMode[] = ['width', 'height', 'original']

export default function ReaderControls({ mem, update, onClose }: Props) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div style={{ width: '100%', maxHeight: '80%', overflowY: 'auto', borderRadius: '20px 20px 0 0', background: 'var(--y-surf)', border: '1px solid var(--y-line)', padding: '20px 18px 32px' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--y-hi)', marginBottom: 20 }}>Reader settings</div>

        <Row label="Mode">
          <div style={{ display: 'flex', gap: 6 }}>
            {([['scroll', 'Vertical'], ['paged', 'Paged']] as const).map(([m, label]) => (
              <button key={m} onClick={() => update({ mode: m })} style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid var(--y-line)', background: mem.mode === m ? 'var(--y-p)' : 'var(--y-surf2)', color: mem.mode === m ? 'var(--y-onp)' : 'var(--y-mid)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{label}</button>
            ))}
          </div>
        </Row>

        <Row label="Quality">
          <div style={{ display: 'flex', gap: 6 }}>
            {([['source', 'Source'], ['low', 'Data saver']] as const).map(([q, label]) => (
              <button key={q} onClick={() => update({ quality: q })} style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid var(--y-line)', background: (mem.quality ?? 'source') === q ? 'var(--y-p)' : 'var(--y-surf2)', color: (mem.quality ?? 'source') === q ? 'var(--y-onp)' : 'var(--y-mid)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{label}</button>
            ))}
          </div>
        </Row>

        <Row label="Auto-scroll speed">
          <input type="range" min={1} max={8} step={1} value={mem.autoSpeed ?? 2} onChange={e => update({ autoSpeed: Number(e.target.value) })}
            style={{ width: 140, accentColor: 'var(--y-p)' }} />
        </Row>

        <Row label="Direction">
          <div style={{ display: 'flex', gap: 6 }}>
            {(['RTL', 'LTR'] as const).map(d => {
              const active = d === 'RTL' ? mem.rtl : !mem.rtl
              return (
                <button key={d} onClick={() => update({ rtl: d === 'RTL' })} style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid var(--y-line)', background: active ? 'var(--y-p)' : 'var(--y-surf2)', color: active ? 'var(--y-onp)' : 'var(--y-mid)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{d}</button>
              )
            })}
          </div>
        </Row>

        <Row label="Fit">
          <div style={{ display: 'flex', gap: 6 }}>
            {FITS.map(f => (
              <button key={f} onClick={() => update({ fit: f })} style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid var(--y-line)', background: mem.fit === f ? 'var(--y-p)' : 'var(--y-surf2)', color: mem.fit === f ? 'var(--y-onp)' : 'var(--y-mid)', fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize' }}>{f}</button>
            ))}
          </div>
        </Row>

        <Row label="Page gap">
          <div style={{ display: 'flex', gap: 8 }}>
            {(['#050706', '#E9E9E9'] as const).map(c => (
              <button key={c} onClick={() => update({ gapColor: c })} style={{ width: 32, height: 32, borderRadius: 8, background: c, border: `2px solid ${mem.gapColor === c ? 'var(--y-p)' : 'var(--y-line)'}`, cursor: 'pointer' }} />
            ))}
          </div>
        </Row>

        <Row label="Brightness">
          <input type="range" min={0} max={0.8} step={0.05} value={mem.brightness} onChange={e => update({ brightness: Number(e.target.value) })}
            style={{ width: 140, accentColor: 'var(--y-p)' }} />
        </Row>

        <Row label="Tint">
          <div style={{ display: 'flex', gap: 6 }}>
            {([['none', 'None'], ['warm', 'Warm'], ['sepia', 'Sepia']] as const).map(([t, label]) => (
              <button key={t} onClick={() => update({ tint: t })} style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid var(--y-line)', background: (mem.tint ?? 'none') === t ? 'var(--y-p)' : 'var(--y-surf2)', color: (mem.tint ?? 'none') === t ? 'var(--y-onp)' : 'var(--y-mid)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{label}</button>
            ))}
          </div>
        </Row>

        <Row label="Strip width">
          <div style={{ display: 'flex', gap: 6 }}>
            {[100, 70, 50].map(w => (
              <button key={w} onClick={() => update({ stripWidth: w })} style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid var(--y-line)', background: (mem.stripWidth ?? 100) === w ? 'var(--y-p)' : 'var(--y-surf2)', color: (mem.stripWidth ?? 100) === w ? 'var(--y-onp)' : 'var(--y-mid)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{w}%</button>
            ))}
          </div>
        </Row>

        <Row label="Pages (paged mode)">
          <div style={{ display: 'flex', gap: 6 }}>
            {([[false, 'Single'], [true, 'Double']] as const).map(([v, label]) => (
              <button key={label} onClick={() => update({ spread: v })} style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid var(--y-line)', background: (mem.spread ?? false) === v ? 'var(--y-p)' : 'var(--y-surf2)', color: (mem.spread ?? false) === v ? 'var(--y-onp)' : 'var(--y-mid)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{label}</button>
            ))}
          </div>
        </Row>

        <Row label="Mark read">
          <div style={{ display: 'flex', gap: 6 }}>
            {([['open', 'On open'], ['end', 'On finish']] as const).map(([v, label]) => (
              <button key={v} onClick={() => update({ markOn: v })} style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid var(--y-line)', background: (mem.markOn ?? 'open') === v ? 'var(--y-p)' : 'var(--y-surf2)', color: (mem.markOn ?? 'open') === v ? 'var(--y-onp)' : 'var(--y-mid)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{label}</button>
            ))}
          </div>
        </Row>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--y-hi)' }}>{label}</span>
      {children}
    </div>
  )
}
