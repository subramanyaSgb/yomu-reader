// Reader controls panel (FR-11): RTL/LTR, fit, gap color, brightness dim. Single/double-page
// (landscape) is a Phase 6 device concern (flagged). Values persist via ReaderMemory.

import type { ReaderMemory, FitMode } from './useReaderMemory'

interface Props {
  mem: ReaderMemory
  update: (patch: Partial<ReaderMemory>) => void
  onClose: () => void
}

const FITS: FitMode[] = ['width', 'height', 'original']

export default function ReaderControls({ mem, update, onClose }: Props) {
  return (
    <div className="absolute inset-0 z-30 flex items-end bg-black/60" onClick={onClose}>
      <div className="w-full rounded-t-2xl bg-neutral-900 p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 text-sm font-medium text-neutral-300">Reader settings</div>

        <Row label="Direction">
          <Toggle
            active={mem.rtl}
            on="RTL"
            off="LTR"
            onChange={(v) => update({ rtl: v })}
          />
        </Row>

        <Row label="Fit">
          <div className="flex gap-2">
            {FITS.map((f) => (
              <button
                key={f}
                onClick={() => update({ fit: f })}
                className={`rounded px-3 py-1 text-sm ${
                  mem.fit === f ? 'bg-violet-600 text-white' : 'bg-neutral-800 text-neutral-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </Row>

        <Row label="Page gap">
          <div className="flex gap-2">
            {['#000000', '#ffffff'].map((c) => (
              <button
                key={c}
                onClick={() => update({ gapColor: c })}
                style={{ background: c }}
                className={`h-7 w-7 rounded border ${
                  mem.gapColor === c ? 'border-violet-500' : 'border-neutral-600'
                }`}
              />
            ))}
          </div>
        </Row>

        <Row label="Brightness">
          <input
            type="range"
            min={0}
            max={0.8}
            step={0.05}
            value={mem.brightness}
            onChange={(e) => update({ brightness: Number(e.target.value) })}
            className="w-40"
          />
        </Row>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <span className="text-sm text-neutral-400">{label}</span>
      {children}
    </div>
  )
}

function Toggle({
  active,
  on,
  off,
  onChange,
}: {
  active: boolean
  on: string
  off: string
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!active)}
      className="rounded bg-neutral-800 px-3 py-1 text-sm text-white"
    >
      {active ? on : off}
    </button>
  )
}
