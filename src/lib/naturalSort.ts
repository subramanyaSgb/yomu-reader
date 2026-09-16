// Natural (human) sort so "page2" < "page10". Used for local image folders + CBZ entries.
// The classic pitfall is lexical sort putting 10 before 2; this splits digit runs and
// compares numerically.

export function naturalCompare(a: string, b: string): number {
  const ax = chunk(a)
  const bx = chunk(b)
  const n = Math.min(ax.length, bx.length)
  for (let i = 0; i < n; i++) {
    const av = ax[i]
    const bv = bx[i]
    if (typeof av === 'number' && typeof bv === 'number') {
      if (av !== bv) return av - bv
    } else {
      const as = String(av)
      const bs = String(bv)
      if (as !== bs) return as < bs ? -1 : 1
    }
  }
  return ax.length - bx.length
}

/** Split into alternating string / number chunks: "p10a2" -> ["p",10,"a",2]. */
function chunk(s: string): Array<string | number> {
  const out: Array<string | number> = []
  const re = /(\d+)|(\D+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(s))) {
    out.push(m[1] !== undefined ? Number(m[1]) : m[2])
  }
  return out
}

export function naturalSort(items: string[]): string[] {
  return [...items].sort(naturalCompare)
}
