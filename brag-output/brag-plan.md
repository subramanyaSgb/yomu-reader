# Brag Plan: Yomu

## What is this app?
Yomu (読む, "to read") is a production-grade offline-first manhwa reader PWA — curated 98-series library, three shelves, exact-position resume, auto-scroll, downloads, sync — built for a user base of exactly one.

## The angle
Every reading app fights for millions of users. Yomu was engineered like it has millions — three deployment backends, offline downloads, cross-device sync, reading stats — and shipped for one person. The brag is the absurd ratio of polish to audience.

## Hook (first 2-4 seconds)
Dark screen, big Outfit type: "Most apps chase a million users." Beat. Second line lands hard: "This one has one." The claim IS the hook; narration carries it.

## Key moments (the middle)
- The Reading shelf: real cover cards (Solo Leveling, Omniscient Reader's Viewpoint, Tower of God, Eleceed, The Boxer, Nano Machine) sliding in one by one with real UI badges — "84%", "Ch. 112", "NEW".
- The reader in motion: a vertical comic strip auto-scrolling, the speed HUD visible, a resume chip: "Resuming Ch. 112 — exactly where you left off."
- Feature chips arriving one by one: Offline downloads · Cross-device sync · Reading stats.

## Outro / punchline
Wordmark "Yomu" with 読む beneath. Tagline: "Built for one. Polished like it's for millions."

## User flow worth showing
1. Entry: open the Reading shelf — cover grid with progress badges.
2. Key action: tap a series → reader opens, resumes at the exact scroll position, auto-scroll takes over.
3. Result: chapter marked read, progress badge ticks up, downloads/sync/stats confirm it's everywhere.

## Tone
- Preset: default
- Creative direction: "an overbuilt love letter to reading manhwa — shipped for exactly one user"
- Interpretation: warm and playful with real product pride; comfortable pacing, clean crossfades, the joke delivered with a straight face and genuine polish.

## Format: landscape — 1920x1080
## Duration: 20s

## Visual identity (from the project)
- Background: #0A0E0C (near-black with green cast); reader scenes on #050706
- Surface: #141A17, hairlines #242C28
- Accent: #17B57E (emerald primary), #F2C14E (amber), #3ED6A0 (light emerald)
- Text: #F2F7F4 (high) / #D8E3DD (body) / #93A29B (mid)
- Display font: Outfit (700–800)
- Body font: Outfit (400–500)
- Strongest visual element: the shelf cover grid — rounded-16 cards with gradient fallbacks, tiny bold badges (NEW amber, % emerald, "Ch. n" amber-tint)

## Share copy (draft)
I built myself a manga reader with offline downloads, cross-device sync, and reading stats. Total addressable market: me.

## Audio direction
- Role: warm upbeat bed under narration; narration is the lead voice
- Music: `happy-beats-business-moves-vol-9-by-ende-dot-app.mp3` (114.84 BPM, mid-energy)
- Music treatment: start at 0s, volume ~0.22 (ducked under voice), gentle fade-out over the last 1.5s
- Music cue guidance: preset read (`assets/music/cues/happy-beats-business-moves-vol-9...`). Strong cues at 4.23s, 10.54s, 16.34s-area beats; target the Scene 2 wordmark reveal near 4.23s and the outro wordmark near a strong beat around 16.34s. Beat grid (~0.53s spacing) may pace the cover-card arrivals in Scene 2 — but hold each card visible; snap cards to every other beat if needed for readability.
- Audio-reactive treatment: subtle; music RMS may make the emerald glow behind the wordmark breathe. No waveform/equalizer visuals.
- SFX posture: moderate (4-6 cues), motion-matched, polished
- Audio-coupled moments: card-slide sounds for cover arrivals; a soft click for the simulated series tap; drop sounds for feature chips; one bell accent on the outro wordmark
- Restraint rule: nothing louder than the narration; no SFX during mid-sentence narration peaks; music never above 0.25.

## Voice (enabled — Kokoro via Hyperframes)
Narration script, one line per scene, conversational and specific — it complements the on-screen text, never reads it verbatim:

1. "Most reading apps chase a million users. This one has one."
2. "Meet Yomu — ninety-eight hand-picked series, across three shelves."
3. "It remembers your exact scroll position — and can even scroll for you."
4. "Chapters download for offline, and progress syncs everywhere."
5. "Yomu. Built for one. Polished like it's for millions."

## Storyboard

### Scene 1 — Hook — 4s
Near-black #0A0E0C. Line 1 fades in centered, Outfit 700: "Most apps chase a million users." Holds ~1.6s. Line 2 slams in below in emerald #17B57E, heavier: "This one has one." Holds to scene end.
Sequential/interaction: yes — two lines arrive one after the other; the second is the punch.
Audio intent: quiet confidence; the bed establishes groove, narration leads.
Audio-coupled idea: soft impact on line 2's landing.
Music: bed starts at 0, low.
Transition mood: clean → Scene 2

### Scene 2 — The shelf — 4s
Wordmark "Yomu" + small 読む appears top-left near the 4.23s strong cue, with "Reading" shelf header. Six cover cards slide in one by one (beat-paced, every other beat): Solo Leveling, Omniscient Reader's Viewpoint, Tower of God, Eleceed, The Boxer, Nano Machine — gradient card fills with title text (no real cover images available), each with an authentic badge: "84%", "Ch. 112", "NEW", "62%", "Ch. 47", "100%". All cards hold on screen once arrived.
Sequential/interaction: yes — cards arrive one by one, left to right.
Audio intent: the product feels alive; arrivals have physicality.
Audio-coupled idea: card-slide SFX on first and last card; others ride the beat grid.
Music: bed continues.
Transition mood: clean slide → Scene 3

### Scene 3 — The reader — 4.5s
Simulated tap on the Solo Leveling card (cursor/tap ripple + click), then full-bleed reader on #050706: a stylized vertical comic strip (panel blocks) scrolling smoothly upward. A resume chip at top: "Resuming Ch. 112 — exactly where you left off." Bottom HUD shows the auto-scroll speed stepper (e.g. "1.4×") ticking up once.
Sequential/interaction: yes — tap → reader opens → auto-scroll runs → speed steps 1.2× → 1.4×.
Audio intent: smooth motion; one click for the tap, one tick for the speed step.
Audio-coupled idea: `ui/mouseclick1` on tap; subtle switch tick on speed change.
Music: bed continues.
Transition mood: soft crossfade → Scene 4

### Scene 4 — Everywhere — 4s
Reader dims to backdrop. Three feature chips arrive one by one, centered stack: "Offline downloads" (emerald icon), "Cross-device sync", "Reading stats". A small line beneath: "Installable PWA · works with zero bars."
Sequential/interaction: yes — three chips, one by one, ~0.9s apart, all hold.
Audio intent: each chip lands with a soft, satisfying drop.
Audio-coupled idea: `interface/drop_*` per chip.
Music: bed continues.
Transition mood: clean → Scene 5

### Scene 5 — Outro — 3.5s
Wordmark "Yomu" scales in large, 読む beneath in mid-tone, subtle emerald glow breathing with the music. Tagline fades up: "Built for one. Polished like it's for millions." Music fades out over the last 1.5s.
Sequential/interaction: none — one reveal, long hold.
Audio intent: warm payoff; one bell accent, then the bed fades.
Audio-coupled idea: `impact/impactBell_heavy_000` on wordmark landing (near a strong beat).
Music: fade out over final 1.5s.
Transition mood: end.

**Music mood for this video:** upbeat-warm, ducked under narration
**Audio summary:** A low warm groove under a friendly narrator, physical card/chip SFX matched to arrivals, one bell payoff on the outro, music bows out under the final line.
