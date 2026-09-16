# Phase 4 — Auth, Sync, Notifications

**SDLC ref:** SDLC.md Phase 4 · **Status:** PLANNED · **Started:** 2026-09-16

## Goal
Cross-device continuity + new-chapter alerts. Firebase Google login (skippable), local-first Firestore sync (library/progress/bookmarks/settings, last-write-wins), download-list sync, and a timed Cloud Function chapter poller → batched FCM push.

## Scope (FR)
FR-19 (Google login skippable), FR-20 (cloud sync local-first LWW + download list), FR-29 (new-chapter push, per-series notify, batched), FR-30 (local notifs).

## Exit criteria
Code complete + build green behind env flags. App fully usable with NO Firebase config (graceful degrade). Sync merge (LWW) + sync-op queue self-check green. Firebase project setup documented as owner handoff. Cloud Function + FCM code present, deployable.

## Key constraint (honest)
Firebase needs the OWNER's project + config keys — cannot be created headlessly. So: build ALL code behind `VITE_FIREBASE_*` env; if unset, auth/sync are no-ops and the app runs local-only (never broken). Document exact setup steps.

## Tasks
### Batch A — Firebase scaffold + auth (graceful)
- **T1** `sync/firebase.ts`: init Firebase only if env present; export `isSyncEnabled`. `sync/auth.ts`: Google sign-in/out, `useAuth` hook. All no-op when disabled.
- **T2** UI: login button (skippable) in a Profile/Settings entry; app works logged-out.

### Batch B — Sync engine (local-first, LWW)
- **T3** `sync/merge.ts` (pure): last-write-wins merge by updatedAt for library/progress/settings/bookmarks. **Hard self-check.**
- **T4** `sync/engine.ts`: local write → Dexie + enqueue op; flusher pushes to Firestore when online + authed; listener pulls remote → merge → Dexie. Offline queue.
- **T5** Download-list sync: sync the LIST (chapter ids) not bytes; other device wifi-refetches (reuse Phase 2 downloads + wifiGuard).

### Batch C — Notifications
- **T6** `functions/` Firebase Cloud Function (scheduled 30–60m): read users' notify-flagged follows, diff MangaDex latest feeds, enqueue batched FCM. (Deployable; runs on owner's Firebase.)
- **T7** Client: FCM token registration, SW `push` handler → batched system notification; local notifs (download-complete, goal/streak stubs for Phase 5).
- **T8** Verify build + self-checks + write FIREBASE-SETUP handoff.

## RESULTS

### Phase 4 — COMPLETE ✅ (2026-09-16)
**Built:**
- `sync/firebase.ts`: init only if `VITE_FIREBASE_*` present; `isSyncEnabled` flag. App runs local-only when absent (graceful degrade — verified: build works with no config).
- `sync/auth.ts` (+ `useAuth`): Google sign-in/out, skippable, no-op when disabled.
- `sync/merge.ts` (pure LWW): mergeRecord/mergeCollections/tombstones/pickNewer. **Hard self-check green** (per-id LWW + delete-wins-by-timestamp).
- `sync/engine.ts`: local-first push/pull for library + progress + download-list (ids only, never bytes); online/authed guarded.
- `notifications/messaging.ts`: FCM token registration + localNotify; permission-gated, no-op when disabled.
- `functions/`: deployable Cloud Function `pollChapters` (every 45 min) — notify-flagged follows → diff MangaDex latest → **batched** FCM digest; polite (UA + 250ms throttle).
- `ProfileScreen` + 5th nav tab (login/sync-now/enable-notifications/sign-out; "sync off" notice when unconfigured).
- `docs/FIREBASE-SETUP.md` + `.env.example` Firebase vars.
**Verification:** merge self-check green; all project self-checks green; build clean **both with and without** Firebase env (graceful degradation confirmed).
**Handoff (owner, one-time):** follow `docs/FIREBASE-SETUP.md` — create project, enable Google auth + Firestore + FCM, paste `VITE_FIREBASE_*`, deploy `functions/`. Until then the app is local-only.
**Gaps carried:** scheduled function outbound fetch needs Blaze plan (documented); FCM SW push-display handler is via firebase-messaging convention — final wiring validated on-device in Phase 6.
**Caveat:** sync/push code is build- and logic-verified; live Firestore round-trip + real push delivery require the owner's Firebase project (can't be done headlessly).
