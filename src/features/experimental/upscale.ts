// Image sharpening/upscaling (FR-13 v1 sharpen + v2 ML upscale). The v1 path is a CSS filter
// that helps low-res scans everywhere for free. ML upscale is behind a flag + owner-supplied
// model; without a model it no-ops (graceful — never blocks reading).

import { isEnabled } from './flags'

/** CSS filter string for light sharpening of low-res images (works now, no model). */
export function sharpenFilter(strength = 0.4): string {
  // contrast + slight saturation reads as "sharper" without a real convolution.
  const c = 1 + strength * 0.25
  return `contrast(${c}) saturate(${1 + strength * 0.1})`
}

/**
 * ML upscale hook (v2, experimental). Returns the original src unless the flag is on AND a
 * model URL is configured. Real implementation would run an ONNX super-res model on-device
 * and cache the result — mirrors the detect-once-cache-replay pattern used for bubbles.
 */
export async function maybeUpscale(
  src: string,
  override?: Record<string, boolean>,
): Promise<string> {
  if (!isEnabled('upscale', override)) return src
  const modelUrl = ((import.meta.env ?? {}) as Record<string, string | undefined>)
    .VITE_UPSCALE_MODEL_URL
  if (!modelUrl) return src // no model supplied -> no-op, never breaks
  // ponytail: run ONNX super-res here + cache; stubbed until owner supplies a model.
  return src
}
