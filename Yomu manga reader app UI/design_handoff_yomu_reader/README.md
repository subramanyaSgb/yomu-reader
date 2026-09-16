# Handoff: Yomu — manga/manhwa reader PWA (mobile UI, 390×844)

## Overview

Yomu is a personal-use, offline-capable manga/manhwa/manhua reader PWA. Metadata and chapters come from MangaDex (English only); the app adds a premium reading experience on top: two reader engines (paged RTL with page curl for manga, continuous vertical scroll for manhwa/manhua), permanent downloads vs evictable read cache, a shelf-based library, reading stats, and local file import (CBZ/CBR, PDF, image folder).

This bundle documents **one complete interactive prototype** covering 10 screens and 8 overlays, plus the product docs it was built against.

## About the design files

`design/Yomu App v2.dc.html` is a **design reference created in HTML** — a working prototype showing intended look and behavior, not production code to copy. `design/support.js` is the prototype's own runtime (a small template/logic harness); **do not port it**.

Your task: **recreate these designs 1:1 in the target codebase's environment** using its established patterns and libraries. If no app environment exists yet, the docs in `docs/` specify the intended stack (React + TypeScript + Vite PWA, IndexedDB, Workbox). Everything visual in this README is authoritative — match it exactly.

To view the prototype: open `design/Yomu App v2.dc.html` in a browser (it needs `support.js` next to it, which is included). Click through it; every control listed below is live.

## Fidelity

**High-fidelity.** Final colors, typography, spacing, radii, motion and copy. Recreate pixel-perfectly at a 390×844 mobile viewport. The prototype is *not* responsive beyond mobile — treat 390px as the design width and let content reflow naturally on larger phones.

---

## Design tokens

Three themes. Every screen reads from the active theme; nothing is hard-coded per screen. Ship these as CSS custom properties (the prototype exposes them as `--y-*` on the app root) or a typed theme object.

| Token | Dark (default) | Light | Sepia |
| --- | --- | --- | --- |
| `bg` page ground | `#0A0E0C` | `#F6F7F5` | `#F1E3C9` |
| `surf` card/surface | `#141A17` | `#FFFFFF` | `#E9DABB` |
| `surf2` sunken/expanded row | `#111713` | `#EDF0EC` | `#E1D0AF` |
| `line` strong divider/border | `#242C28` | `#DBE0D9` | `#D0BC98` |
| `line2` row divider | `#1A211D` | `#E7EBE5` | `#DACBA9` |
| `hi` primary text | `#F2F7F4` | `#0E1512` | `#2C2114` |
| `text` body text | `#D8E3DD` | `#26302B` | `#3E3020` |
| `mid` secondary text | `#93A29B` | `#5C6B64` | `#6B5A42` |
| `dim` tertiary/meta text | `#71807A` | `#7C8A83` | `#8A7659` |
| `p` primary (jade) | `#17B57E` | `#0E8F62` | `#8A5A2B` |
| `plt` primary light (active nav, links) | `#3ED6A0` | `#0B7A54` | `#6E4620` |
| `a` accent (gold — badges, progress, "new") | `#F2C14E` | `#A8741A` | `#A8551F` |
| `ok` info/offline-ready | `#6FC3FF` | `#1E7FB8` | `#4A6E52` |
| `warn` offline/error | `#E4804A` | `#C2621F` | `#9C4A16` |
| `black` reader ground | `#050706` | `#1B211E` | `#2A2114` |
| `onp` ink on primary/accent fills | `#05100B` | `#FFFFFF` | `#FBF3E4` |
| `pa` primary tint 16% | `rgba(23,181,126,0.16)` | `rgba(14,143,98,0.12)` | `rgba(138,90,43,0.14)` |
| `aa` accent tint 16% | `rgba(242,193,78,0.16)` | `rgba(168,116,26,0.14)` | `rgba(168,85,31,0.14)` |
| `ov` bar/scrim strong | `rgba(10,14,12,0.92)` | `rgba(246,247,245,0.94)` | `rgba(241,227,201,0.94)` |
| `ov2` scrim on art | `rgba(10,14,12,0.5)` | `rgba(20,26,23,0.42)` | `rgba(44,33,20,0.42)` |

**Cover-art hue ramp** (placeholder covers; replace with real MangaDex cover images):
`['#17B57E','#0FA0A8','#4F9BE0','#8B6BE0','#D9557A','#E08A3C','#F2C14E','#7FBF5A']`
Cover gradient formula: `linear-gradient(150deg, HUE 0%, color-mix(in oklab, HUE 36%, var(--bg)) 58%, var(--bg) 100%)`.

**Typography** — Outfit (Google Fonts), weights 400/500/600/700/800.

| Role | Size / weight / tracking |
| --- | --- |
| Screen title ("Search", "Library") | 25–26px / 800 / −0.03em |
| Hero title | 28px / 800 / −0.03em / line-height 1.05 |
| Onboarding title | 27px / 800 / −0.03em / lh 1.1 |
| Series title (detail) | 20px / 800 / −0.03em / lh 1.1 |
| Section header (row title, "Chapters") | 14–16px / 700–800 |
| Sheet / dialog title | 15px / 800 |
| Body / list primary | 12.5–13.5px / 600–700 |
| List secondary (meta) | 11–11.5px / 500 |
| Tertiary / footnote | 10–10.5px / 500–600 / lh 1.55 |
| Uppercase label | 10–11px / 800 / letter-spacing 0.06–0.12em |
| Badge (unread, NEW, EN) | 9–9.5px / 800 |
| Nav label | 10px / 700 |
| Stat number | 24–26px / 800 / −0.03em |

**Spacing & shape** — screen gutter 18px; grid gap 14px column / 18px row; card radius 14–16px; button/field radius 11–14px; sheet radius 20px top corners; chip radius 8–10px; badge radius 4–6px; pill radius 9–13px. Cover aspect: 110×152 (rail), 198–218 tall (2-col grid), 112×158 (detail), 54×74 (download row), 48×66 (feed/local row).

**Shadows** — phone frame `0 40px 90px rgba(0,0,0,0.65)`; cover art `0 16px 34px rgba(0,0,0,0.5)`; context menu `0 24px 60px rgba(0,0,0,0.6)`; toast `0 16px 40px rgba(0,0,0,0.5)`; bubble `0 10px 30px rgba(0,0,0,0.4)`.

**Touch targets** — every interactive element is ≥44px tall (icon buttons are exactly 44×44; list rows use `min-height` so wrapped text grows the row).

---

## Screens

### 1. Onboarding (first run only)

Full-screen, above everything, 3 steps. Top ~60% is a cover-gradient image area with a `linear-gradient(to top, bg 12%, transparent 70%)` scrim and a "Skip" pill (40px, `ov2` bg) top-right. Bottom block: a 3-segment progress bar (3px, `gap: 6px`, active `a`, inactive `line`), title 27/800, body 13/500 `mid` lh 1.6, then a 52px full-width primary CTA.

Copy, in order:
1. **"Three ways to read"** — "Manhwa and manhua open in seamless vertical scroll; manga opens paged, right-to-left, with a finger-following 3D page curl. Your own CBZ, PDF and image folders open too." → *Next*
2. **"Tap to zoom a bubble"** — "Tap anywhere to zoom at that exact point. Where bubble detection is available the zoom snaps to the speech bubble — and silently falls back to tap-zoom when it is not." → *Next*
3. **"Reads offline"** — "Download a chapter, a range, or a whole series. Downloads are permanent; browsing cache is temporary and evicted first when space runs low." → *Continue with Google* + secondary text button *"Skip — use this device only"*

Completing or skipping sets `onboarded` permanently; sign-in sets `signedIn` and toasts "Signed in · library syncing".

### 2. Home

Header (58px): "YOMU" 20/800 + 5px `a` dot; right side a 44px bell with unread count badge (min-width 16, `a` fill, `onp` text) → Unread feed, a 44px search icon → Search, and a 34px circular avatar (`linear-gradient(140deg, p, a)`, initial letter) → Profile.

**Hero** (268px): cover gradient + `linear-gradient(to top, bg 3%, ov 40%, transparent 76%)`. Bottom-left stack: "POPULAR NOW" chip (`a` on `aa`) + type/lang chip ("MANHWA · EN" on `ov2`); title 28/800; meta 12/500 `mid` ("Action · Fantasy · 208 EN chapters"); then a 46px primary button ("Read now" / "Continue ch. N") with a 13px play triangle, and a 46px "Details" outline button.

**Four horizontal rails**, each: title 16/700 + "See all" 11/700 `dim`, a 10.5px `dim` sub-note, then 110px-wide cards in a horizontally scrolling row (hidden scrollbar), 12px gap.
- *Continue Reading* — "Exact page resume · synced"
- *Popular / Trending* — "MangaDex follows + rating"
- *Latest Updates* — "New English chapters, newest first"
- *Because you read Action* — "From your most-read genres"

Card: 110×152 cover, radius 14; unread count badge top-right (`a`); a download-arrow glyph top-left in a 18px `rgba(0,0,0,0.55)` square when the series has downloads; chapter badge bottom-left (9/700 white on `rgba(0,0,0,0.6)`); a 3px progress bar pinned to the cover bottom (`a` on `rgba(255,255,255,0.2)`) when in progress. Below: title 12/600 `text`, meta 10/500 `dim`.

Footer line, 10.5/500 `dim`: "Metadata and chapters from MangaDex · English only. Personal-use client."

### 3. Search

Title row: "Search" 25/800 + a 2-option segmented control (Global | Library) — 3px padding, 10px radius, active segment filled `p` with `onp` text.

Search field: 50px, radius 14, `surf` on 1px `line`, 18px magnifier `dim`, text input 14/600 `hi`, placeholder "Titles, authors, genres" (or "Search my library"). With text present: a "SAVE" text action (10/800 `plt`) and a 28px clear ✕.

Filter chips (horizontal scroll, 8px gap, 34px tall, radius 10): All · Ongoing · Completed · Action · Romance · Fantasy · 2026. Active = `p` fill + `onp` text; inactive = `surf` on `line` with `mid` text.

Results: "N results" 12/600 `dim`, then a 2-column grid (14px/16px gaps) of 216px covers, radius 16, with a type chip bottom-left (`p` fill, `onp`, uppercase 9/800) and an "IN LIBRARY" chip top-right when applicable; title 13/700, meta 11/500 `dim` ("208 EN ch · Ongoing").

Below results when the query is empty: **Saved searches** (wrapping `plt`-on-`pa` pills) and **Recent searches** (48px rows: clock icon, label 13/600, 40px remove ✕) with a "Clear" action in `a`.

**Offline state** replaces results: a 16px-radius `surf` card on `line` — warn-colored alert icon + "MangaDex unreachable" 14/800, body 12/500 `mid` ("You are offline, so global search is unavailable. Your library and downloaded chapters still work."), then a 42px primary "Retry" and an outlined "Search my library".

### 4. Series detail

Backdrop: the cover gradient at `filter: blur(28px); transform: scale(1.2)` in the top 340px, under a `linear-gradient(to top, bg 5%, ov 55%, ov2 100%)` scrim.

Header: 44px back button; right side a 44px bell (filled `a` when this series notifies) and a 44px download button (opens the download sheet). Both on `ov2`, radius 12.

Info block: 112×158 cover; beside it title 20/800, "Author · Type" 11.5/500 `mid`, a status chip (`ok` fill, `onp`, uppercase 10/800), "N EN ch" 11/700, an "N new" chip (`a`) when unread, then a star row — 14px `a` star, rating 13/700, "· 12.4k · Kirin Scans" 10.5/500 `dim`.

Genre chips: `plt` text on `pa`, 1px `line`, radius 8, 11/700, horizontally scrolling.

Action row (44px): **Follow / Following** (1.2fr — `surf` → `pa` with `plt` text when following), **shelf button** showing the current shelf name, and a 44px **version-switch** icon button.

Synopsis: 12.5/500 `mid` lh 1.58, clamped to 148 chars with a gold "Read more" / "Read less" toggle.

Licensed titles only: a dashed-`line` strip — book icon (`ok`), "Licensed in English" 11/600 `mid`, and a "Support official release" action in `plt` 11/800.

**Chapter list** — this is a *fixed header + independently scrolling list*: everything above stays put; only the chapter list scrolls, inside a region bounded above by a 1px `line` rule and below by the sticky CTA. Header row: "Chapters — N EN" 14.5/800 and an order toggle ("Newest first" / "Oldest first") in 11/700 `dim`.

Chapter row (min-height 60px, 1px `line2` top border): "Chapter N" 13.5/700 (drops to `mid` once read, row background `pa` when it's the resume point); inline chips **NEW** (`a` on `aa`), **RESUME** (`p` fill), **OFFLINE** (outlined `warn`, when offline and not downloaded); sub-line 11/500 `dim` = "Title · Group · 2d ago"; trailing 44px download button — down-arrow `dim` when not downloaded, check `ok` when downloaded.

Gap note at the list end, 10.5/500 `dim`: "6 chapters have no English release and are not listed — numbering gaps are shown as they are."

Sticky CTA: 52px primary, radius 14, on a `linear-gradient(to top, bg 45%, transparent)` pad — "Continue · Ch. 128" or "Start reading · Ch. 1".

### 5. Paged reader (manga, RTL)

Fully immersive, no bottom nav. Ground is `black` (or `#E9E9E9` when page-gap colour is set to white). The page is a mock 2×3 panel grid inside a 560px-tall stage with `perspective: 1400px`; turning applies `rotateY(±24deg)` with `transform-origin` on the leading edge and `transition: transform 260ms cubic-bezier(.4,0,.2,1)`. With data-saver on, it degrades to a 30px `translateX` slide and the badge changes from "3D CURL · WEBGL" to "SLIDE FALLBACK". A `#000` overlay at the brightness-dim opacity sits above the page.

Tapping the page toggles the HUD (opacity 0/1, 220ms). Two 46px circular side arrows (`rgba(255,255,255,0.1)`, blurred) turn pages — left = next in RTL.

Top HUD: 44px back, the curl-mode badge 9.5/800 uppercase, and 44px version + settings buttons, over `linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)`.

Bottom HUD over `linear-gradient(to top, rgba(0,0,0,0.92) 30%, transparent)`: chapter title 13.5/800 white, "Series · Group" 10.5/500, page counter "12 / 48" (current in `a` 13/800, total at 35% white); a 4px progress bar (`a`, `direction: rtl` so it fills right-to-left); then five 54×46 tool buttons with 19px icons and 8.5/700 labels — **Chapters · Version · RTL/LTR · Bookmark · Settings**.

### 6. Vertical reader (manhwa/manhua)

Edge-to-edge panels with **no gaps**, continuous scroll. An inline chapter divider appears mid-scroll (54px, `bg`, `plt` uppercase label "Chapter 63 — …", a `line` rule, and "loaded seamlessly" 10/600 `dim`) proving seamless next-chapter loading. Speech bubbles are tappable: a 208×96 `rgba(250,250,250,0.94)` rounded-24 bubble with three grey text bars and a 40px `p` magnifier badge at its corner — tapping opens the zoom overlay.

Floating top bar (74px) fades out once scroll passes 60px (`opacity` 260ms, pointer-events off): 44px back, chapter title 13/800, "Series · 38% · Group" 10/500, a 44px auto-scroll toggle (filled `a` when on), a 44px settings button.

Auto-scroll, when on, shows a 44px control strip below the bar: "AUTO-SCROLL" `plt` uppercase, − / speed ("2×") / + at 34px each. Speed range 1–6.

Right edge: a 3px scroll track (`rgba(255,255,255,0.08)`) with a 56px `a` thumb.

Bottom floating bar (58px, radius 18, `ov` on `line`, blurred): **Prev · Chapters · Next** — the middle item bolder with an `a` list icon.

End-of-chapter block: "Keep scrolling — the next chapter loads inline." + a 46px outlined "Back to series".

### 7. Library

Title "Library" 25/800 + a 44px sort button showing the current mode ("Recently read" / "A–Z" / "Last updated").

Shelf tabs (horizontal scroll, 16px gap, 1px `line` bottom rule): **All · Reading · Completed · On Hold · Dropped · Plan to Read**, each with a count; active tab = `hi` text + 2px `a` underline.

A dismissible duplicate warning on `aa`: "'Ashborne' also appears as 'Ash Born' from another group — tracking both would split your progress." with a "Merge" action.

Hint line 10.5/800 uppercase `dim`: "Long-press a cover for options".

2-column grid, 198px covers radius 16: shelf chip top-left (`rgba(0,0,0,0.55)`), unread badge top-right (`a`), and a bottom gradient block with "Ch 128 of 208" 9.5/700 and a 3px `p` progress bar. Title below, 12.5/700. Long-press (420ms) or right-click selects the cover (2px `a` outline) and opens the context menu.

**Context menu** — centered card (left/right 24px, top 230px), radius 18, `surf` on `line`: uppercase series name header, then 48px rows with 17px icons — *Mark as complete · Download all English ch. · Move to shelf… · Notify me of new ch. / Stop notifying · Remove from library* (last one in `a`).

### 8. Storage (Downloads)

Title "Storage" 25/800 + a "PERSISTED" chip (`ok` on `pa`).

Storage card: "Used on this device" 12/600 `mid` vs "3.2 GB of 8 GB" 12/800; a 7px two-segment bar — `p` for downloads, `dim` for read cache; a legend with 8px swatches: "Downloads · permanent" and "Read cache · evictable".

**Downloads** section header + "Keep 5 ahead" note. Rows: 54×74 cover, title 13.5/700, "46 chapters · 1.4 GB · Kirin Scans" 11.5/500 `dim`, "Permanent · protected" 10.5/700 `ok`, and a caret that rotates 180° when expanded (200ms). Expanded rows sit on `surf2`: 50px chapter rows with an `ok` check, label 12.5/600, size 11/600 `dim` — then a "Delete download" row in `a`.

**Read cache** section with a "Clear" action in `a`; 56px rows with a 30×40 thumb, label, size. Footnote: "Read cache is evicted oldest-first when space runs low. Downloads are never removed without asking."

### 9. Unread feed (New chapters)

Back button + "New chapters" 19/800 + "N across followed series" 11/600, and a 40px "Mark all read" outline button. Rows (12px pad, 1px `line2` top): 48×66 cover, series 13/700, "Ch. 208 — Lantern Oath" 11.5/500 `mid`, "Kirin Scans · 3h ago" 10.5/600 `dim`, and a 22px `a` count pill.

### 10. Local files

Back button + "Local files" 19/800 + "N imported · stays on this device, never uploaded".

Three import tiles in a 3-column grid — dashed `line` border, radius 14, `surf` fill, 21px `plt` icon, label 11.5/800, sub 9.5/600 `dim`: **CBZ / CBR** "Comic archive" · **PDF** "Scanned book" · **Folder** "Loose images".

Import progress card while parsing: file name 12.5/800 + stage 11/700 `plt`, a 6px `p` bar, and a note — "Reading entries and natural-sorting page names — nothing leaves the device." (archives/folders) or "Rendering pages at device resolution — nothing leaves the device." (PDF). Stages: *Reading file → Sorting pages / Rendering pages → Saving*.

"ON THIS DEVICE" header + total size. Rows: 48×66 thumb, name 13/700 + a kind chip (`ok` fill, `onp`, e.g. CBZ / PDF / FOLDER), "214 pages · 184 MB · Paged RTL" 11/500 `mid`, "Resume page 46" / "Not started" 10.5/600 `dim`, and a 44px delete button in `a`.

Footnote: "Local series read in the same readers, with their own progress and reading-mode memory. They are excluded from sync and from MangaDex update checks."

### 11. Profile / stats / settings

Header: 58px avatar, name ("rin.kurose" or "Local account") 18/800, sub ("Google · synced just now" / "Not signed in — everything stays on this device") 11/600 `dim`, and a 40px Sign in / Sign out button (primary when signed out).

**Stats** — 2×2 cards, `surf` on `line`, radius 16: value 24/800 (Chapters read `hi`, Day streak `a`, Hours spent `hi`, Series following `plt`), label 11/600 `mid`.

**Daily goal** — header + a tappable "N ch/day" in `plt`; card shows "2 of 3 read today" 12.5/700 and "64-day streak" 11/700 `a` over a 7px `p` bar.

**Genre breakdown** — card with up to 5 rows: 78px genre label 11/700, an 8px bar in a ramp hue, count 10.5/700 `dim`.

**Theme** — three 14px-radius swatch cards (Dark / Light / Sepia): a 52px preview painted in that theme's `bg` with three ink bars (`hi`, `mid`, `p`), label 11/700 centered; selected card gets a 2px `p` border and `hi` label.

**Settings** — expandable 56px rows: 34px `surf` icon tile, label 13.5/700, sub 10.5/500 `dim`, caret rotating 90° when open. Expanded content is indented 47px with 44px rows carrying either a 44×26 toggle (knob 20px, `translateX(18px)`, track `p` when on / `line` when off, 200ms) or a `plt` value you tap to cycle, plus an optional footnote.

| Row | Sub-line | Contents |
| --- | --- | --- |
| Reader defaults | "RTL manga · Fit width · vertical manhwa" | toggles: RTL for manga, double page in landscape, volume keys turn pages; value: Fit mode (Fit width / Fit height / Original). Note: "Reader settings are remembered per series (mode, direction, zoom)." |
| Downloads & storage | "3.8 GB used · keep 5 ahead" | toggles: wifi-only, data saver; value: keep next N chapters. Note: "Downloads are permanent and storage-persisted. Read cache is evicted oldest-first." |
| Notifications | "1 series · batched digest" | toggles: new-chapter push, goal & streak reminders. Note: "Polled every 30–60 min and delivered as one digest, not one push per chapter." |
| Comfort | "Night warmth on · wake lock on" | toggles: blue-light warmth at night, keep screen awake, immersive full screen |
| Backup & local files | "Export library · open CBZ / PDF / folder" | values: Export library + progress (JSON), Local files (count) → Local files screen |
| About Yomu | "v1.0 · personal-use client" | Note: "Personal-use PWA. Metadata and chapters from MangaDex; images proxied for CORS. Not distributed. Where a series is licensed in English, Yomu links to the official release." |

---

## Overlays

| Overlay | Trigger | Spec |
| --- | --- | --- |
| **Bottom nav** | all top-level screens (never in readers, onboarding, unread, local) | 78px tall (7px top / 15px bottom pad), `ov` fill, 1px `line` top, blurred. Five equal items: Home · Search · Library · Storage · Profile — 22px icon + 10/700 label, active `plt`, inactive `dim`. Library carries the unread badge. |
| **Chapter list sheet** | reader "Chapters", detail | Bottom sheet, max-height 560px, radius 20 top, `surf` on `line`. Header: series 15/800 + 40px ✕. 54px rows: "Chapter N" 13/700, right-side "Offline" or chapter title 10.5/600 `dim`; the current chapter is `pa` with `plt` text. |
| **Option sheet** (versions / shelf / download / reader settings) | version button, shelf button, download button, reader settings | Same sheet shell, max-height 620px. Header: title 15/800 + sub 11/500 `dim`. Rows: min-height 54px, radius 12, label 13.5/700, optional sub 11/500, right-side `plt` value or a 17px `p` check; selected row background `pa`. |
| **Version switcher** | detail / reader | Title "Switch version", sub "All English versions of ch. N · preferred group with gap-fill". Rows = group name + "MangaDex · 1.2k likes · full run". |
| **Download sheet** | detail download button | "This chapter" · "Next 10 unread" · "Chapter range…" · "Entire series" · "Auto-keep next 5 ahead" (marked On, `pa`). |
| **Reader settings sheet** | reader settings button | Direction (RTL/LTR) · Fit · Page gap colour (Black/White) · Brightness dim (0–50% in 12.5% steps) · Double page · Edge tap / volume keys · Auto-scroll speed. |
| **Zoom overlay** | tap a speech bubble | `rgba(0,0,0,0.84)` full-screen; centered 330px `#FAFAFA` card, radius 28, three grey bars, footer "TAP-ZOOM AT POINT · BUBBLE SNAP WHEN AVAILABLE" / "Tap to close". |
| **Not-downloaded dialog** | tapping an uncached chapter while offline | 320px `surf` card, radius 18: "Not downloaded" 15/800, body 12.5/500 `mid`, then a primary "Go back online" (which reconnects *and* opens the chapter) + outlined "Cancel". |
| **Offline banner** | offline, outside readers | 30px `warn` strip pinned to the top: crossed-wifi icon + "OFFLINE — DOWNLOADS ONLY" 10.5/800 uppercase in `#1A1208`. |
| **Toast** | most mutations | Pinned 94px from the bottom, left/right 20px; `hi` background with `bg` text, radius 12, 13px pad, 12.5/700. Auto-dismiss 2000ms. |

---

## Interactions & behavior

**Navigation** — bottom nav switches top-level screens and records the previous screen. Back resolves to the recorded previous screen, but **must never navigate to the screen already showing** (fall back to Profile from Local files, Home elsewhere) — this was a real bug in the prototype; keep the guard.

**Reading** — tapping a cover opens detail; tapping a chapter opens the reader whose mode matches the content type (Manga → paged, Manhwa/Manhua → vertical). Opening a chapter records progress as `max(existing, n)`, increments today's goal count, and auto-adds the series to the Reading shelf if it isn't in the library. Exiting a series reader returns to that series' detail screen.

**Local files** — local reading is a *separate identity*: the reader shows the file name and "Local file" instead of a series/group, the file's real page count, Pages/Fit tools instead of Chapters/Version, a single-file bottom bar ("CBZ · 214 pages · 184 MB" + "Close file"), no chapter divider and no prev/next chapter. Exiting saves the current page as that file's resume point and returns to Local files. Chapter/version/next-chapter actions must be unreachable, not merely hidden — the prototype toasts "Single imported file — no next chapter" if reached.

**Offline simulation** — the prototype has a header chip toggling offline; in production this is `navigator.onLine` + connection events. Offline: banner appears, global search is replaced by the unreachable card, non-downloaded chapters show an OFFLINE chip and open the not-downloaded dialog.

**Motion** — page turn 260ms `cubic-bezier(.4,0,.2,1)`; HUD fade 220ms; top-bar fade 260ms; carets/toggles/progress 200–260ms ease. Auto-scroll advances `speed × 2` px every 32ms. Long-press threshold 420ms. Import stages advance ~320ms per tick.

**Persistence** — theme, progress, shelves, downloads, follows, per-series notify, bookmarks, sign-in, RTL, fit, keep-ahead, goal, chosen versions and the onboarded flag all persist locally (prototype uses one `localStorage` key; production should use IndexedDB per the TDD). Restoring saved state must count as already-onboarded.

## State

Screen/route (`home | search | detail | reader | library | downloads | unread | local | profile`) + previous screen; theme; onboarding step & completion; auth; offline; search query/filter/scope/recents/saved; selected series, synopsis expansion, chapter order; per-series progress, shelf, follow, notify, downloaded count, chosen version, bookmarks; reader identity (series id **or** local file id), chapter, mode, page, flip direction, HUD visibility, scroll offset/max, auto-scroll + speed; reader prefs (RTL, fit, gap colour, brightness, double page, volume keys); library tab/sort/dup-dismissed; storage (keep-ahead, wifi-only, data saver, cache cleared); goal/streak/today; local file list + import job; and which sheet/menu/dialog/toast is open.

Data fetching (see `docs/TDD.md`): MangaDex search/manga/chapter/at-home endpoints, English-only filtering, images via a CORS proxy, background chapter-update polling every 30–60 min delivered as one digest.

## Assets

No binary assets. Cover art and manga pages are CSS gradient placeholders — swap in real MangaDex cover/page images. Icons are inline 24×24 SVG paths matching **Lucide**; use the Lucide package in the real app. Font: **Outfit** from Google Fonts.

## Files

- `design/Yomu App v2.dc.html` — the full interactive prototype (all screens and overlays)
- `design/support.js` — prototype runtime only; do not port
- `docs/PROJECT-CONTEXT.md` — product constraints and principles (the source project's CLAUDE.md)
- `docs/PRD.md` · `docs/FRD.md` · `docs/TDD.md` — requirements and intended technical design
- `PROMPT.md` — a ready-to-paste prompt for Claude Code
