# Phase 10 — WeebCentral fallback + manhwa-first correctness

## Plan

**Goal:** Owner report: searching manhwa returns light novels, none of them readable;
manhwa must default to long-strip; every series must list every chapter. Root-cause all
of it, fix, and verify across scenarios.

**Diagnosis (all verified live):**
1. Mangapill ranks light novels first for manhwa queries ("solo leveling" → 2 novels, no
   manhwa) AND has removed licensed manhwa from its catalog entirely — the actual Solo
   Leveling manhwa does not exist on Mangapill under any alt title. Mangapill is unfit.
2. Comick re-checked: licensed-series chapters are `external_type` (asurascans etc.);
   `get_images` returns `[]`. Confirms the phase-8 conclusion — Comick cannot serve pages.
3. WeebCentral (MangaSee lineage): search/data, full-chapter-list, chapter images
   endpoints and its CDNs all return 200 from the Worker (probed), catalog includes
   licensed manhwa with official scans, comics only (no novels), complete chapter lists.
4. `openReader` hardcoded `type='manga'` → every series opened paged; manhwa never got
   long-strip by default.
5. SeriesDetail passed a **chapter id as `seriesId`** for MD reads → reader fetched
   `/manga/{chapterId}/feed` → error screen.
6. SeriesDetail had no `source === 'kakalot'` branch → fallback-source search results
   opened an empty detail page.
7. `useChapterFeed` fetched a single 500-entry page; Martial Peak's EN feed alone is
   3918 entries → 87% of chapters silently missing on long series.

**Approach:** swap Worker scraper upstream to WeebCentral behind the unchanged
`site=kakalot` wire interface (+ new `kind` field); derive series type in ReaderShell
(WeebCentral `kind`, MD `originalLanguage`); fix the seriesId bug by threading a new
`startChapterId` through App → ReaderShell; paginate the MD feed; render kakalot-source
detail pages.

## Result

**Worker (deployed `b33c4446`):**
- `search` → `/search/data` fragment; per-card ULID/slug id, title from cover alt,
  `kind` from `data-tip`, cover constructed from ULID and pre-proxied.
- `chapters` → `full-chapter-list` fragment + series page (title, kind from meta
  description) in parallel; ascending order; id = full chapter URL.
- `pages` → `{chapter}/images?...reading_style=long_strip`, host-locked to weebcentral.com.
- `img` allowlist → planeptune.us / lowee.us / lastation.us / compsci88.com / weebcentral.com.

**App (commit `d1e0d9b`, Vercel bundle `index-DSdDMqjG.js`):**
- Reader defaults: manhwa/manhua/**oel** → scroll, manga → paged; `mem.mode` override wins.
- `startChapterId`: tapping a chapter (MD or WeebCentral list) opens the reader at that
  chapter; beats saved progress; CTA passes series id correctly now.
- `useChapterFeed` paginates (500/page, stops at `total`, 4000-entry safety ceiling).
- SeriesDetail renders kakalot-source series: title/cover from the chapters response,
  chapter list, CTA reads on WeebCentral.

**Verification matrix (live Worker, first AND last chapter pages fetched):**

| Query | Top result | kind | Chapters | Pages first/last |
|---|---|---|---|---|
| solo leveling | Solo Leveling | manhwa | 201 (0–200) | 49 (ch200) / img 200 OK |
| omniscient reader | Omniscient Reader | manhwa | 312 (0–311) | 64 / 22 |
| tower of god | Tower of God | manhwa | 652 (S1ch0–S3ch235) | 8 / 140 |
| the beginning after the end | TBATE | oel | 252 (1–252) | 50 / 97 |
| eleceed | Eleceed | manhwa | 418 (1–418) | 107 / 12 |
| one piece | One Piece | manga | 1193 (1–1193) | 57 / 17 |
| martial peak | Martial Peak | manhua | 3886 | 16 / 16 |

No novels in any result set. MD side: `originalLanguage` confirmed in responses
(eleceed=ko, martial peak=zh); feed pagination verified against Martial Peak (3918
entries, offset 3500 returns 418). Build + oxlint + all 16 self-checks pass.

**Known gaps carried forward:**
- Tower of God chapter numbers repeat across seasons ("S1 Chapter 1" / "S2 Chapter 1"
  both parse number=1); list order is correct, but the reader's per-number version
  override map could collide across seasons. Cosmetic for personal use.
- MD feed ceiling 4000 entries (~8 requests); a >4000-entry feed would truncate.
- WeebCentral has no publish dates in the chapter list fragment → publishAt stays ''.
