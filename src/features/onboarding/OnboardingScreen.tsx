// 3-slide onboarding (FR-35): reading modes, bubble zoom, offline. Skippable; shown once.
import { useState } from 'react'
import { markOnboardingSeen } from './Onboarding'

const SLIDES = [
  { icon: '📖', title: 'Three reading modes', body: 'Vertical scroll for manhwa, page-flip for manga, plus your own files.' },
  { icon: '🔍', title: 'Tap to zoom', body: 'Tap any panel to zoom in at that point; pinch and pan freely.' },
  { icon: '📥', title: 'Read offline', body: 'Download chapters to read anywhere — they stay until you delete them.' },
]

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0)
  const finish = () => {
    void markOnboardingSeen()
    onDone()
  }

  const slide = SLIDES[i]
  const last = i === SLIDES.length - 1

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-black p-8 text-center">
      <div className="text-6xl">{slide.icon}</div>
      <h2 className="text-xl font-bold text-white">{slide.title}</h2>
      <p className="max-w-xs text-neutral-400">{slide.body}</p>

      <div className="mt-4 flex gap-1">
        {SLIDES.map((_, idx) => (
          <span
            key={idx}
            className={`h-1.5 w-6 rounded ${idx === i ? 'bg-violet-500' : 'bg-neutral-700'}`}
          />
        ))}
      </div>

      <div className="mt-4 flex gap-3">
        <button onClick={finish} className="px-4 py-2 text-sm text-neutral-500">
          Skip
        </button>
        <button
          onClick={() => (last ? finish() : setI(i + 1))}
          className="rounded-lg bg-violet-600 px-6 py-2 text-white"
        >
          {last ? 'Start reading' : 'Next'}
        </button>
      </div>
    </div>
  )
}
