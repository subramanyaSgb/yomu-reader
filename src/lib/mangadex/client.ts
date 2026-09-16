// MangaDex API client with rate discipline.
// CLAUDE.md: polite client is a SURVIVAL requirement — MangaDex enforces ~5 req/s
// per IP with HTTP 429 and ran anti-abuse enforcement in 2026. Cache hard, throttle,
// back off. Browse UNAUTHENTICATED (authed requests can't be cached).

// MangaDex CORS-blocks all browser origins (including vercel.app) — route through the
// same Cloudflare Worker that proxies images. Worker adds Access-Control-Allow-Origin.
const PROXY_BASE = (import.meta.env?.VITE_IMAGE_PROXY as string | undefined) ?? 'http://localhost:8787'
// Worker exposes /api/<path> which it forwards to api.mangadex.org/<path>
const API_BASE = `${PROXY_BASE}/api`

// Stay comfortably under the ~5 req/s ceiling.
const MIN_INTERVAL_MS = 250 // -> max 4 req/s
const MAX_CONCURRENCY = 3
const MAX_RETRIES = 4

type Task<T> = () => Promise<T>

/**
 * Serialized, spaced request queue with a concurrency cap.
 * Guarantees no more than MAX_CONCURRENCY in flight and >= MIN_INTERVAL_MS
 * between request *starts*.
 */
class RateLimiter {
  private queue: Array<() => void> = []
  private active = 0
  private lastStart = 0
  private readonly minIntervalMs: number
  private readonly maxConcurrency: number

  constructor(minIntervalMs: number, maxConcurrency: number) {
    this.minIntervalMs = minIntervalMs
    this.maxConcurrency = maxConcurrency
  }

  async schedule<T>(task: Task<T>): Promise<T> {
    await this.acquire()
    try {
      return await task()
    } finally {
      this.release()
    }
  }

  private acquire(): Promise<void> {
    return new Promise((resolve) => {
      const tryRun = () => {
        if (this.active < this.maxConcurrency) {
          const wait = Math.max(0, this.lastStart + this.minIntervalMs - now())
          this.active++
          this.lastStart = now() + wait
          setTimeout(resolve, wait)
        } else {
          this.queue.push(tryRun)
        }
      }
      tryRun()
    })
  }

  private release() {
    this.active--
    const next = this.queue.shift()
    if (next) next()
  }
}

// Injectable clock so the self-check can run without real time.
let now = () => Date.now()
export function __setClock(fn: () => number) {
  now = fn
}

const limiter = new RateLimiter(MIN_INTERVAL_MS, MAX_CONCURRENCY)

/** Exponential backoff with jitter, capped. */
export function backoffDelay(attempt: number): number {
  const base = Math.min(1000 * 2 ** attempt, 30_000)
  const jitter = base * 0.25
  return base - jitter + Math.random() * jitter * 2
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export interface MDError {
  status: number
  message: string
}

/**
 * GET a MangaDex JSON endpoint through the rate limiter, retrying on 429 / 5xx
 * with exponential backoff (respecting Retry-After when present).
 */
export async function mdGet<T>(
  path: string,
  params?: Record<string, string | string[] | number | undefined>,
): Promise<T> {
  const url = new URL(API_BASE + path)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue
      if (Array.isArray(value)) {
        // If caller already put [] in the key, don't double it.
        const arrayKey = key.endsWith(']') ? key : `${key}[]`
        for (const v of value) url.searchParams.append(arrayKey, v)
      } else {
        url.searchParams.set(key, String(value))
      }
    }
  }

  return limiter.schedule(async () => {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      // IMPORTANT: send NO custom headers. Browsers forbid setting User-Agent, and any
      // non-simple header triggers a CORS preflight (OPTIONS) which MangaDex's anti-abuse
      // layer returns 403 for — that blocks every call and yields empty results. A bare
      // GET is a "simple request" (no preflight) and works from the browser.
      const res = await fetch(url.toString())

      if (res.ok) return (await res.json()) as T

      const retryable = res.status === 429 || res.status >= 500
      if (!retryable || attempt === MAX_RETRIES) {
        throw { status: res.status, message: res.statusText } as MDError
      }

      const retryAfter = Number(res.headers.get('Retry-After'))
      const delay =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : backoffDelay(attempt)
      await sleep(delay)
    }
    throw { status: 0, message: 'unreachable' } as MDError
  })
}

export { RateLimiter }
