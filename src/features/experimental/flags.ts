// v2 feature flags (Phase 7). Default OFF — with all off, v1 behavior is unchanged.
// Env-driven so the owner opts in per feature without a code change.

function envFlag(name: string): boolean {
  const e = (import.meta.env ?? {}) as Record<string, string | undefined>
  return e[name] === 'true' || e[name] === '1'
}

export const flags = {
  comick: envFlag('VITE_FEAT_COMICK'),
  bubble: envFlag('VITE_FEAT_BUBBLE'),
  upscale: envFlag('VITE_FEAT_UPSCALE'),
}

/** Pure gate for tests + call sites. */
export function isEnabled(flag: keyof typeof flags, override?: Record<string, boolean>): boolean {
  if (override && flag in override) return override[flag]
  return flags[flag]
}
