# Phase 11 — Performance pass + curated personal catalog

## Plan

**Goal (owner):** (a) full performance audit + applicable optimizations across all layers;
(b) convert the app to a curated personal library — ONLY the owner's ~100 manhwa list.

**Audit conclusions (architecture: static PWA on Vercel + CF Worker proxy + IndexedDB):**
Not applicable: load balancer, SQL indexes/N+1/connection pooling (no server DB), CDN
(Vercel + CF already), minification (Vite), payload compression (platform brotli).
Already present: TanStack Query response caching, 350ms search debounce, skeletons,
`loading="lazy"` images, dynamic jszip/pdf.js imports, MD data-saver mode.

**Real problems found:**
1. Firebase chunk (539KB / 163KB gz) modulepreloaded at startup — `errorReporter` →
   `sync/firebase.ts` import chain put it in the initial graph; sync isn't even configured.
2. Service worker precached firebase (and matched pdf.worker patterns) — every
   install/update downloaded unused bytes.
3. Worker `/scrape` had zero caching — every open re-scraped WeebCentral (2 upstream
   fetches per chapter list).
4. SeriesDetail rendered ALL chapters as DOM nodes (Martial Peak = 3886 buttons).
5. `VerticalScrollRenderer.onScroll` ran full-DOM `querySelectorAll` + layout reads at
   scroll-event rate.
6. `zustand` dependency completely unused.

## Result — performance

| Change | Files | Effect |
|---|---|---|
| Firebase out of startup: `React.lazy(ProfileScreen)` + firebase-free `syncEnabled.ts` | `App.tsx`, `sync/syncEnabled.ts`, `sync/firebase.ts`, `reliability/errorReporter.ts` | 163KB gz dropped from critical path; ProfileScreen now a 12KB lazy chunk |
| SW precache trimmed via `globIgnores` + runtime `CacheFirst` for lazy chunks | `vite.config.ts` | precache 1518KB → 984KB per install/update |
| Edge+browser caching for `/scrape` (upstream HTML `cf.cacheTtl`; JSON `Cache-Control`: search/chapters 10min, pages 1h, non-empty only) | `worker/src/index.ts` | repeat opens skip upstream scrapes entirely |
| Chapter lists render in slices of 100 + "Show more" | `SeriesDetail.tsx` | no more 3886-node renders |
| rAF-throttled reader scroll handler | `VerticalScrollRenderer.tsx` | one DOM walk per frame max |
| Removed `zustand` | `package.json` | dead dependency gone |

**Lighthouse (mobile, perf preset, prod URL):** before 73 (FCP/LCP 4.1s, TBT 250ms,
SI 3.8s) → after runs 68/93/85, median **85** (LCP 3.2s, TBT 140ms). Headless lab
variance is high; the LCP/TBT medians are the meaningful signal. JSONs committed
(`lighthouse-before/after*.json`).

Build clean, oxlint clean (pre-existing warnings only), all 16 self-checks pass.

## Result — curated catalog

- `src/catalog.ts`: **98 entries** (owner listed 100; 2 were duplicate names of the same
  series: Reformation of the Deadbeat Noble = The Lazy Lord Masters the Sword,
  Death Is the Only Ending for the Villainess = Villains Are Destined to Die).
- All resolved against WeebCentral by script (`scripts/catalog-*.json` kept for re-runs).
  **18 wrong auto-matches hand-corrected** (Bastard, Sweet Home, The Breaker (was
  matching the New Waves sequel), DICE, Revenge of the Baskerville Bloodhound,
  Level Up with the Gods, The Academy's Undercover Professor, The Academy's Genius
  Swordsman, The Extra's Academy Survival Guide, The Swordmaster's Son, The Dark
  Mage's Return to Enlistment, Heavenly Demon Reborn!, etc.).
- **6 titles not on WeebCentral** — kept in the grid, greyed "Not on source yet":
  Memoir of the King of War, Fist Demon of Mount Hua, Return of the Shattered
  Constellation, Star-Embracing Swordmaster, The Demon Prince Goes to the Academy,
  Purple Hyacinth.
- Home = hero (first list entry) + full 3-column library grid. Search = instant
  client-side filter over the catalog, zero network. Both open series as `kakalot`
  source → complete chapters, long-strip reading.
- MD/Comick code paths remain (Library tab, old entries) but no UI surfaces external
  discovery anymore.

**To add series later:** append to `src/catalog.ts` (resolve the id via
`/scrape?site=kakalot&action=search&q=<title>`), or hand the list to the assistant.

**Known gaps:** "Chronicles of the Heavenly Demon" mapped to WC's "Heavenly Demon
Reborn!" (best-confidence official rename — flag if it reads wrong). Hero is statically
the first list entry.
