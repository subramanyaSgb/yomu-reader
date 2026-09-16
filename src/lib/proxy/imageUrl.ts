// Image proxy URL builder.
// CLAUDE.md / TDD §3.2: MangaDex @Home image URLs are CORS-locked to MD domains +
// localhost. The PWA CANNOT fetch them directly — every image MUST route through the
// Cloudflare Worker. This helper is the ONLY place a page image URL is produced;
// components must never construct a direct MangaDex image URL.

// Set to the deployed Worker (VITE_IMAGE_PROXY). Falls back to local wrangler dev.
const PROXY_BASE =
  (import.meta.env?.VITE_IMAGE_PROXY as string | undefined) ??
  'http://127.0.0.1:8787'

export type ImageQuality = 'source' | 'low'

/**
 * Build a page URL from a MangaDex @Home base URL + chapter hash + filename,
 * routed through the Worker proxy.
 *
 * @param baseUrl  from GET /at-home/server/{id} (valid ~15 min — cache BYTES not URLs)
 * @param hash     chapter.hash
 * @param filename a chapter.data[] (source) or chapter.dataSaver[] (low) entry
 * @param quality  'source' uses /data, 'low' uses /data-saver
 */
export function buildPageProxyUrl(
  baseUrl: string,
  hash: string,
  filename: string,
  quality: ImageQuality = 'source',
): string {
  const segment = quality === 'low' ? 'data-saver' : 'data'
  const direct = `${baseUrl}/${segment}/${hash}/${filename}`
  const proxied = new URL('/img', PROXY_BASE)
  proxied.searchParams.set('u', direct)
  proxied.searchParams.set('q', quality === 'low' ? 'low' : 'source')
  return proxied.toString()
}

/**
 * Cover URL routed through the Worker. uploads.mangadex.org serves an anti-hotlink
 * placeholder ("you can read this at MangaDex") when the Referer is a foreign site,
 * so covers must NOT be hotlinked from the app origin — the Worker spoofs the Referer.
 */
export function buildCoverProxyUrl(mangaId: string, fileName: string): string {
  const direct = `https://uploads.mangadex.org/covers/${mangaId}/${fileName}.256.jpg`
  const proxied = new URL('/img', PROXY_BASE)
  proxied.searchParams.set('u', direct)
  return proxied.toString()
}

/** Guard used by the self-check: true only for a MangaDex @Home network host. */
export function isMangaDexAtHomeHost(host: string): boolean {
  return /(^|\.)mangadex\.network$/.test(host) || host === 'uploads.mangadex.org'
}
