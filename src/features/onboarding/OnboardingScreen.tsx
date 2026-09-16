import { useState } from 'react'
import { markOnboardingSeen } from './Onboarding'
import { CoverGradient } from '../../components/CoverGradient'

const STEPS = [
  {
    title: 'Three ways to read',
    body: 'Manhwa and manhua open in seamless vertical scroll; manga opens paged, right-to-left, with a finger-following 3D page curl. Your own CBZ, PDF and image folders open too.',
    cta: 'Next',
  },
  {
    title: 'Tap to zoom a bubble',
    body: 'Tap anywhere to zoom at that exact point. Where bubble detection is available the zoom snaps to the speech bubble — and silently falls back to tap-zoom when it is not.',
    cta: 'Next',
  },
  {
    title: 'Reads offline',
    body: 'Download a chapter, a range, or a whole series. Downloads are permanent; browsing cache is temporary and evicted first when space runs low.',
    cta: null,
  },
]

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await markOnboardingSeen()
    onDone()
  }

  const s = STEPS[step]

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--y-bg)', overflow: 'hidden' }}>
      {/* Top gradient art ~60% */}
      <div style={{ position: 'relative', flex: '0 0 60%' }}>
        <CoverGradient id={`onboard-${step}`} className="absolute inset-0" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--y-bg) 12%, transparent 70%)' }} />
        <button
          onClick={finish}
          style={{
            position: 'absolute', top: 20, right: 18,
            background: 'var(--y-ov2)', color: 'var(--y-mid)', border: 'none',
            borderRadius: 20, height: 40, padding: '0 16px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >Skip</button>
      </div>

      {/* Bottom block */}
      <div style={{ flex: 1, padding: '0 24px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 20 }}>
        {/* 3-segment progress bar */}
        <div style={{ display: 'flex', gap: 6 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= step ? 'var(--y-a)' : 'var(--y-line)',
              transition: 'background 260ms',
            }} />
          ))}
        </div>

        <div>
          <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, color: 'var(--y-hi)', marginBottom: 12 }}>{s.title}</h1>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--y-mid)', lineHeight: 1.6 }}>{s.body}</p>
        </div>

        {s.cta ? (
          <button onClick={() => setStep(step + 1)} style={{
            height: 52, borderRadius: 13, background: 'var(--y-p)', color: 'var(--y-onp)',
            fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer',
          }}>{s.cta}</button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={finish} style={{
              height: 52, borderRadius: 13, background: 'var(--y-p)', color: 'var(--y-onp)',
              fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer',
            }}>Continue with Google</button>
            <button onClick={finish} style={{
              height: 44, background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--y-mid)', fontSize: 12.5, fontWeight: 500,
            }}>Skip — use this device only</button>
          </div>
        )}
      </div>
    </div>
  )
}
