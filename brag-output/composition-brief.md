# Hyperframes Composition Brief: Yomu

## Objective
Create a short launch-style brag video for Yomu, a personal manhwa reader PWA.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: ~20 seconds (flex scene lengths to the generated voiceover)

## Source Material
- Project root: `c:\Users\DSI-LPT-081\Documents\Reader`
- Primary files read: `index.html`, `src/styles/tokens.css`, `src/App.tsx`, `src/features/shelf/ShelfScreen.tsx`, `src/catalog.ts`, `CLAUDE.md`
- Product name: Yomu (読む — "to read")
- Tagline / strongest claim: "Built for one. Polished like it's for millions."
- Key UI or visual moment to recreate: the Reading shelf cover grid — rounded-16 gradient cards with badges ("NEW" amber, "84%" emerald, "Ch. 112" amber-tint) — and the vertical-scroll reader with resume chip + auto-scroll speed HUD.
- Copy that must appear verbatim:
  - "Most apps chase a million users."
  - "This one has one."
  - "Resuming Ch. 112 — exactly where you left off."
  - "Built for one. Polished like it's for millions."
- Real series titles to use on cards: Solo Leveling, Omniscient Reader's Viewpoint, Tower of God, Eleceed, The Boxer, Nano Machine.

## Creative Direction
- Tone preset: default
- Creative direction: "an overbuilt love letter to reading manhwa — shipped for exactly one user"
- Interpretation: warm, playful, genuinely polished; comfortable pacing, clean crossfades/slides; the joke (user count: 1) delivered straight.
- Angle: Yomu was engineered like it has millions of users — offline downloads, cross-device sync, reading stats, three shelves — and shipped for one person. The brag is the ratio of polish to audience.
- Hook: "Most apps chase a million users." → "This one has one." (emerald punch line)
- Outro / punchline: Yomu wordmark + 読む, tagline "Built for one. Polished like it's for millions."
- Avoid: generic SaaS language, abstract filler visuals, unrelated visual redesign.

## Visual Identity
- Background: #0A0E0C (reader scene on #050706)
- Surfaces: #141A17 / #111713, hairlines #242C28
- Text: #F2F7F4 (high) / #D8E3DD (body) / #93A29B (mid) / #71807A (dim)
- Accent: #17B57E emerald (primary), #3ED6A0 light emerald, #F2C14E amber
- Accent tints: rgba(23,181,126,0.16) emerald, rgba(242,193,78,0.16) amber
- Display font: Outfit 700–800 (Google Fonts; app uses it for everything)
- Body font: Outfit 400–500
- Visual references: rounded-16 cover cards with `linear-gradient(150deg, hue → bg)` fills, tiny 9–10px 800-weight badges with 7px radius, bottom-sheet motion (260ms cubic-bezier(.4,0,.2,1))

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary (base timings; flex to voiceover):
1. Hook — 4s — two lines, second in emerald: "Most apps chase a million users." / "This one has one."
2. The shelf — 4s — Yomu wordmark + "Reading" header; 6 cover cards slide in one by one with real badges.
3. The reader — 4.5s — simulated tap on Solo Leveling → vertical strip auto-scrolls; resume chip; speed HUD ticks 1.2× → 1.4×.
4. Everywhere — 4s — three feature chips one by one: Offline downloads / Cross-device sync / Reading stats; sub-line "Installable PWA · works with zero bars."
5. Outro — 3.5s — wordmark + 読む with breathing emerald glow; tagline; music fades.

## Audio
- Audio role: warm upbeat bed under narration; narration leads.
- Audio arc: bed establishes groove under the hook, physical card SFX through the shelf, minimal clicks in the reader, soft drops for chips, bell payoff + fade at the outro.
- Music: `happy-beats-business-moves-vol-9-by-ende-dot-app.mp3`
- Music treatment: start 0s, volume ~0.13–0.15 while narration plays (ducked), gentle fade-out over final 1.5s.
- Music cue guidance: bundled preset `assets/music/cues/happy-beats-business-moves-vol-9-by-ende-dot-app.music-cues.json` (114.84 BPM). Strong cues: 4.23s, 10.54s, 12.65s, 23.17s. Target Scene 2 wordmark near 4.23s; beat-grid card arrivals on every other beat (~1.05s apart) for readability; outro wordmark near a strong beat.
- Audio-reactive treatment: subtle; RMS/bass may breathe the outro wordmark glow. No waveform/equalizer visuals. If extraction is unavailable, skip and document.
- Voiceover: ENABLED (Kokoro, voice `af_heart`), per-scene lines from brag-plan.md §Voice. Each line generated as its own WAV; scene durations flex to fit. Voice on its own track at volume 1.0.
- Audio-coupled moments:
  - Scene 1 line 2 landing — soft impact
  - Scene 2 card arrivals — card-slide sounds (first + last; others ride the beat)
  - Scene 3 tap — mouse click; speed step — subtle switch tick
  - Scene 4 chips — drop sounds per chip
  - Scene 5 wordmark — one bell accent
- SFX selection guidance: match motion; prefer low high-frequency-risk files per `sfx-analysis.md` (at `C:\Users\DSI-LPT-081\.claude\skills\brag\assets\sfx\sfx-analysis.md`); nothing louder than narration.
- Exact SFX choice: chosen at composition time against the implemented animation.
- Audio files: copy chosen music/SFX/voiceover into `brag-output/composition/assets/`.

## Hyperframes Instructions
Per step-3-compose.md: hyperframes-core/animation/creative/keyframes/cli conventions govern implementation. Show real UI (shelf cards, reader, HUD); keep text readable (short label ≥0.8s settled, sentences ~0.3s/word); 15–25s total; check must pass before render.
