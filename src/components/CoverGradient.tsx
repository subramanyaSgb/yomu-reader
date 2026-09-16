// Cover gradient placeholder — 8-hue ramp from README tokens spec
const HUES = ['#17B57E','#0FA0A8','#4F9BE0','#8B6BE0','#D9557A','#E08A3C','#F2C14E','#7FBF5A']

export function coverHue(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return HUES[h % HUES.length]
}

export function CoverGradient({ id, className }: { id: string; className?: string }) {
  const hue = coverHue(id)
  return (
    <div
      className={className}
      style={{ background: `linear-gradient(150deg, ${hue} 0%, color-mix(in oklab, ${hue} 36%, var(--y-bg)) 58%, var(--y-bg) 100%)` }}
    />
  )
}
