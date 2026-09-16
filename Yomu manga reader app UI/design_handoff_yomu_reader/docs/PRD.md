# Product Requirements Document — Yomu

**Version:** 1.0
**Status:** Approved for development
**Date:** 2026-09-11
**Owner:** Project owner (single user)

---

## 1. Overview

Yomu is a personal-use, installable Progressive Web App for reading manga, manhwa, and manhua. It reads primarily from the MangaDex catalog (English only), supports the owner's own local files (CBZ/PDF/images), works offline, and syncs the owner's library and reading progress across their devices via Google login.

Yomu is a **private client for a single owner**. It is not published to app stores, not distributed publicly, and not monetized.

## 2. Problem statement

Existing free reader sites (e.g. comix.to) are ad-heavy, unstable (subject to shutdown), and offer no personal customization, no reliable offline access, and no cross-device sync tied to the user. The owner wants a clean, premium, ad-free reading experience with the specific features they value (realistic page-flip, Google-Books-style bubble zoom, precise resume, offline downloads) under their own control.

## 3. Goals

- **G1** — A premium, ad-free, fast reading experience on Android (installable PWA).
- **G2** — Reliable offline reading via explicit downloads and read-caching.
- **G3** — Precise cross-device continuity: resume the exact page where the owner left off, on any device.
- **G4** — The three reading modes done well: vertical scroll (manhwa/manhua), realistic paged flip (manga), and local files.
- **G5** — Discovery and organization: search, filters, a personal library, and new-chapter tracking with notifications.
- **G6** — Be a well-behaved MangaDex client so the app remains functional long-term.

## 4. Non-goals

- **NG1** — Public distribution, multi-user accounts, or monetization.
- **NG2** — Re-hosting/mirroring content on our own CDN (legal + cost; we proxy, we don't store others' content on a public server).
- **NG3** — Non-English reading as a primary experience (English-only; non-English chapters hidden).
- **NG4** — iOS as a primary target (Android-first; iOS PWA push is limited and out of scope).
- **NG5** — A social layer (comments, ratings we author, following other users).

## 5. Target user & platform

- **User:** the owner — a manga/manhwa reader who wants control and polish.
- **Primary platform:** Android, Chrome, installed as a PWA to the home screen.
- **Secondary:** desktop browser (localhost/dev + occasional use). iOS best-effort, not guaranteed.

## 6. Key product decisions (locked)

| # | Decision |
|---|---|
| PD1 | Content: MangaDex v1 (English-only). Comick v2, tentative. |
| PD2 | Fallback works at the **chapter-version** level (comix model): aggregate all versions, prefer one scanlation group, gap-fill by likes/coverage, manual in-reader switch. |
| PD3 | Non-English chapters are **hidden** (accepted numbering gaps). |
| PD4 | Storage is **two-tier**: temporary read-cache (evictable) + permanent downloads (protected). |
| PD5 | Resume is **two-level**: series (last chapter) + within-chapter exact position. |
| PD6 | Reader: seamless infinite scroll (manhwa); WebGL 3D page-curl with slide fallback (manga); full local-file support (CBZ/PDF/images). |
| PD7 | Bubble zoom: Google-Books architecture (detect-once → cache → replay), on-device. Tap-zoom v1, ML snap v2. |
| PD8 | Auth/sync via **Firebase** (Google login, Firestore). Local-first; last-write-wins conflict resolution. |
| PD9 | Notifications via a timed **Firebase Cloud Function** + FCM, per-series opt-in, batched digest. |
| PD10 | Image proxy via **Cloudflare Worker** (free egress; mandatory due to MangaDex CORS lock). |

## 7. Feature summary (full detail in FRD)

### 7.1 Reading
- Three reading modes (scroll / paged-flip / local-file), auto-selected by content type, user-overridable.
- Realistic 3D page curl (manga) with graceful slide fallback.
- Tap-to-zoom-at-point + pinch + pan; v2 adds Google-style sequential bubble zoom.
- Per-series reader memory (mode, direction, zoom restored automatically).
- Auto-scroll mode (manhwa), adjustable speed.
- Reader controls: RTL/LTR, single/double page (landscape), fit width/height/original, brightness, page-gap color.
- Data-saver mode (lower-res on mobile data, full-res on wifi).
- Image sharpening for low-res scans (CSS/canvas v1; ML upscale v2 experimental).

### 7.2 Offline
- Download single chapter / range / entire series / auto-keep-next-N-ahead.
- Two-tier storage with automatic read-cache eviction and protected downloads.
- Download-over-wifi-only guard.

### 7.3 Continuity & sync
- Exact-position resume (series + within-chapter).
- Google login (optional, skippable); syncs library, follows, progress, bookmarks, history, settings.
- Download *list* syncs; images stay per-device, auto-refetch over wifi.

### 7.4 Discovery & library
- Home rows: Continue Reading, Popular/Trending, Latest Updates, Recommended-by-genre.
- Search: instant search-as-you-type, advanced filters, search-within-library, recent/saved searches.
- Library: status shelves (Reading/Completed/On-hold/Dropped/Plan-to-read) + custom collections + auto-sort + unread-chapter badges.
- Duplicate/similar detection to avoid double-tracking.

### 7.5 Tracking & stats
- Stats: chapters read, daily streak, time spent, genre breakdown.
- Reading goals (e.g. 3 chapters/day) with streak protection.
- Unread-chapters feed across followed series.
- Export/backup of library + progress to a file.

### 7.6 Notifications
- New-chapter push for series flagged "notify me" (per-series opt-in), batched digest.
- Download-complete (local) notification.
- Reading-goal / streak reminders.

### 7.7 Comfort & accessibility
- Blue-light/warmth filter + scheduled night mode (in-app).
- Keep-screen-awake while reading (Wake Lock API; Android-supported).
- Landscape lock + full-screen immersive.
- Themes: Dark / Light / Sepia.

### 7.8 First-run & reliability
- 3-slide onboarding → land on Popular; login skippable.
- Full error/offline states everywhere (offline banner, retry, per-image recovery, "MangaDex unreachable").
- Firebase Crashlytics-style remote error logging for the owner.

## 8. Success criteria

- **SC1** — Owner can install Yomu to the Android home screen and read a chapter offline after downloading it.
- **SC2** — Closing and reopening a series returns to the exact page previously left, on the same and other devices.
- **SC3** — Manga page-curl runs at ~60fps on the owner's device, or cleanly falls back to slide.
- **SC4** — No ads, no third-party content injection.
- **SC5** — App stays functional under normal use without MangaDex rate-limiting/banning the client (validated by cache-hit metrics and absence of sustained 429s).
- **SC6** — A new chapter on a "notify me" series produces a push within one polling interval (≤60 min).

## 9. Constraints & risks

| Risk | Mitigation |
|---|---|
| MangaDex CORS lock on images | Mandatory Cloudflare Worker proxy (PD10). |
| MangaDex 2026 anti-abuse enforcement / IP ban | Hard caching, throttling, backoff, unauthenticated browsing, client identification. |
| 15-min image URL expiry | Cache image bytes, not URLs; refresh per session. |
| Comick instability (v2) | Comick is tentative; MangaDex alone delivers ~90% of the experience. |
| Bubble-detection accuracy on borderless manhwa | Tap-zoom always works; ML snap is additive with silent fallback. |
| PWA storage eviction | `navigator.storage.persist()` for downloads; two-tier model. |
| Legal exposure | Personal-use only, not distributed; "support official release" links where licensed. |

## 10. Out-of-scope future ideas (parking lot)

- Comick + additional sources with robust matching.
- On-device ML upscaling and bubble detection maturity.
- OCR / translation assist.
- Reading widgets / Android home-screen shortcuts beyond PWA defaults.
