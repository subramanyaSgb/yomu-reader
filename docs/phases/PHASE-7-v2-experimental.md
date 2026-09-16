# Phase 7 — v2 Experimental (behind flags)

**SDLC ref:** SDLC.md Phase 7 · **Status:** PLANNED · **Started:** 2026-09-16

## Goal
Scaffold the ambitious v2 extras WITHOUT destabilizing v1. Everything ships behind feature
flags (default OFF) with graceful fallback. Comick as a tentative second source, ML bubble
auto-detection (Google-Books-style detect-once→cache→snap), ML image upscaling.

## Scope (FR)
FR-4 (Comick second source, tentative), FR-10 (ML bubble auto-zoom), ML upscaling (experimental).

## Exit criteria
Flags exist and default off; with flags off v1 is byte-identical in behavior; feature logic has
pure self-checks (Comick match, bubble→zoom mapping, flag gating); build + all self-checks green.
Real ML models are documented as owner-supplied assets (can't bundle headlessly).

## Tasks
### Batch A — feature flags + Comick match
- **T1** `flags.ts`: env-driven flags (`VITE_FEAT_COMICK`, `VITE_FEAT_BUBBLE`, `VITE_FEAT_UPSCALE`), default off. **Self-check gating.**
- **T2** `sources/comickMatch.ts` (pure): title+author fuzzy match to a Comick candidate + manual-link override. Reuse duplicateDetection Jaccard. **Self-check.**

### Batch B — ML bubble zoom (architecture, model-agnostic)
- **T3** `bubbles/bubbleZoom.ts` (pure): given cached bubble regions + a tap point, pick the region and compute the zoom transform (reuse zoomMath); sequential next-bubble ordering. **Self-check.** Falls back to tap-zoom when no regions.
- **T4** DB v5: `bubbles` table (chapterId, pageIndex, regions[]). Detection runner stub that reads an ONNX model URL from flag/env (model is owner-supplied).

### Batch C — upscaling stub + wiring
- **T5** `upscale/upscale.ts`: CSS/canvas sharpen now (works), ML upscale behind flag (stub that no-ops without a model). 
- **T6** Verify: flags off ⇒ no behavior change; self-checks + build green. Document model handoff.

## Notes
- Real ONNX bubble/upscale models are large binary assets — owner supplies + hosts; code is
  model-agnostic (reads a URL). This mirrors how Google pre-computes: detect once, cache, replay.

## RESULTS
_(appended per hard rule)_
