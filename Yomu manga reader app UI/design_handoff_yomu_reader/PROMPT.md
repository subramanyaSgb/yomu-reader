# Prompt for Claude Code

Paste this as your first message in Claude Code, with this folder available in the repo (or its contents copied in).

---

I'm building **Yomu**, a mobile-first manga/manhwa reader PWA. This folder is a design handoff package:

- `README.md` — the authoritative spec: design tokens, every screen, every overlay, interactions, state, persistence
- `design/Yomu App v2.dc.html` — a working interactive prototype of the whole app (open it in a browser and click through it)
- `design/support.js` — the prototype's own runtime harness; **do not port it**
- `docs/PRD.md`, `docs/FRD.md`, `docs/TDD.md`, `docs/PROJECT-CONTEXT.md` — product requirements and intended technical design

**Read `README.md` in full, then open the prototype and read its source**, before writing any code.

## What I want

Implement this design **1:1 — pixel-perfect**. The design is high-fidelity and final: colors, type sizes, weights, letter-spacing, spacing, radii, shadows, motion durations and easings, and all copy are decided. Do not redesign, do not "improve", do not substitute a component library's default look. If something in the prototype looks unusual, it is intentional — match it.

Non-negotiables:

1. **Tokens first.** Implement the three themes (Dark / Light / Sepia) from the token table as CSS custom properties on the app root, and build every component against those variables. No hard-coded hex values in components. Theme switching must repaint the entire app, readers included.
2. **Mobile design width 390px**, 844px reference height. Every touch target ≥44px; list rows use `min-height` so wrapped text grows the row rather than clipping.
3. **Type is Outfit** (400/500/600/700/800). Icons are **Lucide** — the prototype's inline SVG paths are Lucide paths; use the real Lucide package.
4. **Two reader engines**, both fully immersive (no bottom nav): paged RTL with the 3D page-curl transform (and the slide fallback when data-saver is on), and continuous vertical scroll with edge-to-edge panels, no gaps, seamless inline next-chapter loading.
5. **Local files are a separate reading identity.** A local CBZ/PDF/folder must never show a series name, scanlation group, chapter list, version switcher, next/prev chapter, or chapter divider — see the Local files sections of the README. Exiting saves the page as that file's resume point and returns to Local files.
6. **Back navigation must never navigate to the screen already showing** (fall back to Profile from Local files, Home elsewhere). This was a real bug in the prototype; keep the guard.
7. **Offline is a first-class state**: the top banner, the "MangaDex unreachable" search card with Retry, the OFFLINE chapter chips, and the not-downloaded dialog whose primary action reconnects *and* opens the chapter.
8. **Two-tier storage**: downloads are permanent and storage-persisted; read cache is evictable oldest-first and separately clearable. The storage bar shows both segments with the legend.

## Stack

Follow `docs/TDD.md` for the technical design (React + TypeScript + Vite PWA, IndexedDB for chapters/progress, Workbox service worker, MangaDex API English-only with images via a CORS proxy). If the repo already has an established stack and patterns, use those instead and tell me what you're mapping onto what.

## How to work

- Start by proposing a component and route breakdown mapped to the README's screen list, and a token/theme file. Wait for my OK before building the rest.
- Build screen by screen. After each screen, tell me which prototype section it corresponds to and what you deliberately deviated from (ideally nothing).
- Use gradient placeholders for cover art and pages exactly as the prototype does until real MangaDex image loading is wired up — the gradient formula is in the README.
- Persist the state listed in the README's State section; restoring saved state must count as already-onboarded (do not re-show onboarding to returning users).
- Do not add screens, features, sections or copy that aren't in the README. Ask me first.
