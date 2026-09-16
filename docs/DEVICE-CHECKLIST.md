# Device Checklist — verify on real Android (v1)

Everything below was built and verified headlessly (self-checks + live proxy E2E). These
items genuinely need a physical Android device / real browser to confirm. Run through them
after deploying to Vercel with `VITE_IMAGE_PROXY` set.

## Install & PWA
- [ ] Open the Vercel URL in Chrome → "Install app" → icon appears on home screen.
- [ ] Launch from home screen → runs standalone (no browser chrome).
- [ ] App shell loads offline after first visit (SW precache).

## Reader
- [ ] Manhwa: vertical scroll is smooth; scrolling past chapter end loads the next inline.
- [ ] Manga: page-flip turns via swipe, edge-tap, and on-screen arrows.
- [ ] Page-turn animation is smooth (~60fps). If janky, toggle to slide in reader settings.
- [ ] Volume-button page-turn (needs device; wire if desired — currently stubbed).
- [ ] Tap-to-zoom-at-point + pinch + pan + double-tap cycle all work.
- [ ] "Switch version" lists alternates and swaps.
- [ ] Brightness dim + page-gap color apply.

## Offline
- [ ] Download a chapter → enable airplane mode → read it fully.
- [ ] Reopen app offline → resume the exact chapter/page.
- [ ] Persistent-storage prompt granted (downloads survive storage pressure).

## Sync & notifications (only after FIREBASE-SETUP.md)
- [ ] Google login works; library/progress sync across two devices.
- [ ] "Notify me" series → new chapter → batched push arrives within ~45 min.

## Comfort
- [ ] Theme switch (dark/light/sepia) applies + persists.
- [ ] Keep-screen-awake holds during reading.
- [ ] Auto-scroll runs and pauses on touch.

## Local files
- [ ] Open a CBZ, a PDF, and a folder of images — all render in order.

Report anything that fails and it becomes the next fix.
