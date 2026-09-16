# Phase 14 — Cover badges, Upcoming page, Comizy second source, empty-cache fix

## Owner asks
1. Read-% on shelf covers + useful companions.
2. Confirm new chapters appear automatically; a Netflix-style "upcoming" page predicting
   next-chapter dates for the Reading shelf.
3. Make the 8 "Not on source yet" titles readable.
4. Bug: ORV suddenly showed no chapters.

## Root cause (ask 4)
`kkChapters` returned `{chapters: []}` on any failed fetch; TanStack cached that as a
VALID result for 10 min → one upstream hiccup looked like "series has no chapters".
Fix: client throws on failed/empty chapters+pages (query retries); worker returns 503
for empty lists so nothing caches them. (commit 4aefb1b)

## Second source: Comizy (ask 3)
mangabuddy.com is now Comizy (comizy.io), a Next.js app with an open JSON API.
- `api.comizy.io/titles/{id}` → details (shape: `data.title.{name,cover}`)
- `api.comizy.io/titles/{id}/chapters` → FULL chapter list with timestamps
- images: the JSON API **truncates to 3 images without auth** — full list is embedded in
  the chapter page's `__NEXT_DATA__` (`initialChapter.images`), so pages are scraped
  from `comizy.io/{mangaSlug}/{chapterSlug}`.
- Image CDN `*.cmzcdn.org` requires `Referer: https://comizy.io/`; the img proxy now
  picks the referer by host (clients can't know the mapping).
- Routing: catalog ids `buddy:{titleId}:{mangaSlug}`; chapter ids
  `buddy:{mangaSlug}:{chapterSlug}`. The existing `/scrape` actions branch on the
  `buddy:` prefix — zero frontend logic changes; buddy entries carry an explicit
  `cover` field (Comizy covers aren't derivable from the id).

All 8 titles activated and E2E-verified (chapters → pages → image 200):
Memoir of the King of War 281ch, Fist Demon of Mount Hua 186, Return of the Shattered
Constellation 121, Star-Embracing Swordmaster 141, The Demon Prince Goes to the Academy
82, Purple Hyacinth 167, The Investor Who Sees the Future 119, Super Gene 505.
(Checked Mangapill first — has none of them.)

## Upcoming page (ask 2)
WeebCentral's chapter-list fragment carries per-chapter publish timestamps
(`checkNewChapter('<ISO>')`) — the scraper now captures them into `publishAt` (Comizy
timestamps come from its API). New `UpcomingScreen` (calendar icon in the shelf
header): for each Reading-shelf series, predicts the next chapter as
`latest + median(last ~6 release gaps)`; shows "Expected in N days · Friday", "any time
now", or "no regular schedule" when the cadence broke; plus latest chapter + recency.
Chapters themselves appear automatically — lists are re-scraped with a 10-min cache.

## Cover badges (ask 1)
`seriesMeta:{id}` setting (total chapters, last-read number) written by SeriesDetail +
ReaderShell. Shelf cards show read-% (bottom-left, green at 100%) and "Ch. N"
(bottom-right); Reading shelf sorts by most-recently-read (progress.updatedAt). All
local — zero network on shelf render.

Build clean; 16/16 self-checks; deployed (app `index-BvqQSvCV.js`, worker `7df0ac2f`).

**Gaps:** Comizy `kind` is not exposed → buddy entries default to manhwa/long-strip
(correct for all 8). Prediction is a heuristic — irregular schedules show as
"no regular schedule".
