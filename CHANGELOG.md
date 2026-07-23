# Changelog

This file format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.11]

- 2026-07-23: added compressed time mode.

## [2.0.10]

- 2026-07-10:
  - **fixes to added text rendition** (changed only `text-renderer.ts`, in `calculateRBRs`): space and line-break nodes are now skipped before line-grouping, exactly as `HintRenderer.calculateRBRs` already does. Previously a space (which has no SVG element) fell back to its synthetic cached bounds top instead of the baseline, differing from its neighbors by ~fontSize, so every space falsely started a new line group — and `renderAdditionalText` then centered the added text over rbrs[0], i.e. just the first word ("es", "wer"). Added a safety fallback the hint renderer doesn't need: if every reference node is invisible (e.g. a span consisting of a lone space), all nodes with cached bounds form a single group, so the added text still gets an RBR instead of silently not rendering. The hint path was not touched; genuine multi-line splits still work because real line breaks change the baseline y of rendered characters, which is what the grouping now exclusively compares.
  - **implemented text decorations + rotation** for both base and added text: `applyTextStyle` (`svg-utils.ts`) now really applies decorations, via inline CSS longhands (`text-decoration-line`/`-thickness`/`-style`/`-color`) so thickness (`r_underline`=`2`), line style (`r_text-line-style`=`wavy` etc.) and color (`r_text-line-color`) are honored and follow the glyphs. Its broken rotate parameter (which spun glyphs around the SVG origin) was removed.
  - **base text**: `renderCharacter` passes underline/overline/strike/textLineStyle/textLineColor from the per-node init config or from component settings, so decorations work both as component defaults and via a first-operation annotate.
  - **added text**: `renderAdditionalText` passes the same fields from the operation's resolved config.
  - **r_rotate** is applied per character as rotate(deg, x, y) around each character's own baseline anchor — on base text via init configs and on added text via operation features. For added text the rotation is applied before EBR measurement (it's a size transform per the docs) and re-anchored after the final translation. Cached bounds account for rotation via a new `rotateRectAroundPoint` helper (`svg-utils.ts`), since `getBBox()` ignores the element's own transform (and `getTransformedBBox` would wrongly bake in the pan/zoom viewport transform).
  - new optional settings textLineStyle / textLineColor join the existing underline/overline/strike defaults, and the feature resolver seeds them from settings so features override them normally.

>One rendering caveat: since text is rendered one `text` element per character, decoration lines are per-glyph segments; with the default charSpacing: 2 there are 2px gaps between segments, and dashed/wavy patterns restart at each character. If you'd rather have one continuous line per text line, that's a different implementation (drawn line elements per line group).

- honor **LF in added text** `calculateAdditionalTextPositions` (`text-renderer.ts`) now starts a new line at LF, mirroring base-text layout (fontSize × lineHeight + lineSpacing, using the effective font size so r_font-size-scaled text wraps proportionally). The multi-line block is measured as one EBR and positioned as a whole against the RBR, so r_t-position semantics are unchanged.

- 🆕 `??` fallback chains in hint placeholders
`resolvePlaceholders` (`text-utils.ts`) accepts `{{name ?? other ?? ...}}` with unlimited fallbacks: names are tried left to right, first defined variable wins, and the placeholder is kept verbatim when nothing resolves. Two deliberate semantics: an empty-string value counts as found (it no longer falls through, which also fixes the old || match quirk for single placeholders), and spaces inside the whiskers are tolerated. This benefits the hint designer too, since it shares the same utility.

- **golden Layout robustness** (renderer): two fixes in `gve-snapshot-rendition.ts`:
  - double-initialization race (`initializeGoldenLayout`): `render()` schedules GL init via `requestAnimationFrame`, but `render()` can run twice before the first callback fires (e.g. a consumer sets settings/data before the element is connected, then connectedCallback renders again — a realistic Angular/vanilla sequence). Both callbacks then ran, creating two GL instances on the same container — duplicated panels and a leaked ResizeObserver. The callback now bails if the component is disconnected and destroys any existing instance first.
  - **layout config hardening** (getDefaultLayout): added dimensions.defaultMinItemWidth: "80px" / defaultMinItemHeight: "60px" so no panel can be collapsed to zero (previously a panel dragged to 0px was easy to "lose"), and set settings.reorderEnabled: false — tab dragging/docking is now off. The four panels are fixed functional areas; splitter resizing (the thing you asked to be freely usable) is unaffected, and this removes the whole class of "dragged Versions into the Details stack and now the layout is scrambled" states. This matches the original Split.js UX that GL replaced.

- **hint designer component** (gve-hint-designer.ts):
  - document-level listener leak: the pan handlers (mousemove/mouseup on document) were added on every connectedCallback and never removed. In Angular, each component destroy/recreate cycle leaked a pair of listeners holding the whole component. They're now stored and removed in disconnectedCallback (and before re-adding).
  - state set before connection was invisible: connectedCallback rebuilt the UI but never re-populated it, so a consumer that sets data/hintId/hintVariables before appending the element got empty dropdowns and tables. connectedCallback now calls refreshUI() + refreshVariablesTable() after rendering.
  - hintVariablesChange fired from the property setter — a two-way-binding echo that loops forever with consumers that clone the array on each event. Removed; the event now fires only from actual user edits (add/edit/delete/populate already fired it themselves). The hintId setter keeps its event since it's guarded by an equality check.
  - variable resolution was regex-injectable and diverged from the renderer: resolveVariables built a RegExp from the raw variable name (a name like a+b breaks or throws) and didn't know the new ?? fallback syntax. It now delegates to the shared resolvePlaceholders, so designer preview and renderer behave identically. extractVariablesFromSvg also splits ?? chains, so the undefined-variables warning understands them.
  - DrawSVG plugin registration happened only in the constructor; if GSAP loads after the element class, it was never registered. Now retried in connectedCallback. (Also fixed deleteHint logging undefined instead of the deleted id.)
  - ⚠️ flagged, not fixed: the play-button's tween-capture mechanism (wrapping gsap.to/from/fromTo and rebuilding a timeline from tween._from/vars.startAt internals) is fragile — it doesn't capture animations that build their own gsap.timeline() internally, and it relies on GSAP private fields. It works for the gallery's fragment style (plain gsap.to/fromTo calls, which I kept to), but a rewrite would be its own task.

- **stock animation gallery** (`hint-designer-consumer.js`):
  - wipe-up was broken: it animated drawSVG: '100%' → '0%', i.e. from fully drawn to nothing — the hint ended invisible. (No stock hint referenced it, which is why it went unnoticed.)
  - dotted/dashed lines were destroyed by the wipes: DrawSVGPlugin works by rewriting stroke-dasharray/dashoffset, so line-bottom-dotted/line-top-dotted rendered as solid lines during and after the "wipe". This was exactly your corner case.
  - wipe direction was a lie: DrawSVG reveals along the path's drawing direction, so "wipe-right" on a right-to-left-authored path (e.g. slash-double) actually wiped left.

The rework:

- `wipe-left`/`right`/`up`/`down` are now clip-rectangle reveals: a `<clipPath>` rect grows across the target's bbox (with 12px padding for thick strokes/linecaps). This works for any `<g>` content — dashed/dotted strokes keep their pattern, text and filled shapes participate, direction is the true screen direction regardless of path authoring, and the sentinel rect is naturally irrelevant. The clip lives inside the target `<g>` (removed with it; scrub/restart in the designer replays correctly), and dotless-exclamation (a filled rect that DrawSVG previously couldn't animate at all) now actually animates.
- new `draw-on` preserves the pen-tracing effect where it's the point: it traces solid-stroked elements with DrawSVG, and fades in what can't be traced (dashed strokes, text, filled shapes) instead of breaking them; invisible sentinel rects are skipped (they previously consumed a stagger slot). The curvy-path hints — scribble-wavy, bowl, checkmark, nota-bene, the snakes, circle-dotted, half-psi — were reassigned to it, so their look is preserved.
- `scale-in` now scales from the element's center (transformOrigin: '50% 50%'); GSAP's SVG default scaled from the bbox corner, which looked lopsided for anything not centered at the origin.

## [2.0.9]

- 2026-07-10:
  - added bowl hint.
  - fixed syntax highlighting in hint designer SVG code. In `gve-hint-designer.ts`, `syncSvgScroll`/`syncJsScroll` synced scroll by applying a CSS transform to the highlight `div` itself. Since that `div` is also the `overflow:hidden` clipping box, translating it moved the clip region along with the content — so scrolled-in text was clipped by the wrapper's own `overflow:hidden` and never painted (it was still there, hence text-selection made it visible via selection background). Fixed by setting `scrollTop`/`scrollLeft` directly instead, which shifts content within a fixed clip region (works fine on `overflow:hidden` elements programmatically).

## [2.0.8]

- 2026-07-03: more hints.

## [2.0.7]

- 2026-07-02: rendition fixes:
  - _offset units_ — tw/th now resolve against average character width/height instead of the whole reference-text bounding box:
    - `svg-utils.ts` — added shared `getAverageCharWidth()` helper (reference char "m").
    - `text-layout.ts` — refactored to use the shared helper (no behavior change).
    - `hint-renderer.ts` — `applyHintPositionTransform` now resolves offsetX/offsetY against avg char width/height (from the component's default settings) instead of rbr.width/rbr.height.
    - `text-renderer.ts` — same fix for r_t-offset-x/y, using the added text's effective (possibly overridden) font.
  - _dotted line clobbered by animation_ — wipe-left/right/up/down in all 5 sample settings files (data/test.settings.json, h56-53, h5-48, aiucd, h5-03) now capture which drawable elements have an authored stroke-dasharray before the DrawSVGPlugin draw-in tween runs, and restore it (clear the inline style GSAP set) in onComplete, so custom dot/dash patterns survive the entrance animation.
    - _double animation_: `HintRenderer.calculateRBRs()` split a reference span into multiple RBRs when consecutive characters' Y coordinates differ by more than 5px — intended to detect real line wraps. But it was comparing each character's cached `getBBox()` top (the tight ink box of the rendered glyph), not its laid-out baseline. Different glyphs in text like "strange" have very different ink boxes at 24px Georgia — e.g. "t" has a tall ascender, "g" has a descender below the baseline — easily differing by more than 5px even though every character sits on the exact same line. That falsely split "strange" into 2 "line groups," so `renderHint()`'s per-RBR loop rendered and animated line-bottom-dotted twice, sequentially (awaited one after another). Fix: both `calculateRBR`s methods (`hint-renderer.ts`, `text-renderer.ts`) now compare each character's laid-out baseline y attribute (read from the live DOM text element — deterministic, identical for every character `TextLayout` placed on the same line) instead of the glyph's rendered ink-box top. Real line breaks (which shift the baseline by a full line height, tens of px) are still detected correctly; glyph-shape noise within a single line no longer triggers a false split. This is generic — it doesn't special-case any particular hint, so it holds for arbitrary user-authored hints per your "robust" requirement.

## [2.0.6]

- 2026-06-26: issues fixed for renderer:
  - toolbar not updated on subsequent data changes.
  - `processData()` only called `toolbar.updateData()` during initial creation. On re-renders the toolbar showed the old step count. Fix: added an `else if (this._toolbar)` branch that calls `updateData()` when the toolbar already exists.
  - pan/zoom pointing at detached node after re-render. `renderContent()` clears `rootSvg`.`innerHTML`, which removes the viewport `<g>` that `svg-pan-zoom` injected, leaving its instance broken. Fix: destroy the pan/zoom instance before clearing the SVG so `initializePanZoom()` creates a fresh one on the clean SVG.
- 2026-06-22: added sample H56-53.
- 2026-05-28:
  - added sentinel rectangle to snake right and snake left hints (designer hints, AIUCD and H5-48 settings).
  - added filled box to hints.

## [2.0.4]

- 2026-05-27:
  - made lines thicker in default hints for demo H5-48, AIUCD and hints designer.
  - added hilite for non-default hint properties in hints designer.

## [2.0.3]

- 2026-05-21:
  - 🆕 added export to InkScape to hints designer.
  - added `snake-e`, `snake-w`, `dotless-exclamation` to hints.
  - added more robust data binding for renderer to avoid races.

## [2.0.2]

- 2026-05-15:
  - properly deal with empty `r_t-value`.
  - fixes to added text position.

## [2.0.1]

- 2026-05-14:
  - ⚠️ removed obsolete hint margins.
  - 🆕 added target hint selection by ordinal next to that by key.
  - planned new design for text placeholder hints (yet to be implemented).
  - fixed issues with horizontal centering of added text/hints.
  - adjusted hint offset for `note-interlinear-above`.

## [2.0.0]

- 2026-05-13:
  - added new streamlined documentation for rendition in `rendition-summary.md`.
  - ⚠️ removed obsolete solid feature logic.

When drawing hints or added text, there were two possible behaviors:

1. **default**: the default behavior is to just draw the element as its position and size dictates, initially hidden (opacity=0) if it has an animation, which immediately after reveals it, with _no_ preliminary adjustments.
2. **solid**: the "solid" behavior, which must be opted in, adds a preliminary adjustment before following the default one, to make room for the element to be rendered. When this element is "solid", we must ensure there is enough room for it to be rendered without overlapping any surrounding elements. This means shifting the surrounding elements on overlap; and in turn, this implies moving all the elements in the rendered text so that we approximately preserve the previous layout. The process of making room for the new element while preserving the general layout is here named **spreading**. An added element is solid when:
   - it's a hint (=an added `g` element) and has property `solid`=`1`, not overridden by feature `r_h-solid`=`0`.
   - it's an added `text` element having a feature `r_t-solid`=`1`.
   - in all other cases, it is NOT solid. This is consistent with the "ink and paper" analogy, where moving the existing signs on paper would be materially impossible.

The whole solid feature and logic are obsolete, because they are not consistent with the immutable nature of the manuscript snapshot. This is a change in an opt-in rendition logic, and does not affect the control's UI. These features will no longer exist: `r_t-solid`, `r_h-solid`; plus the `solid` property of `OperationHint`.

## [1.0.2]

- 2026-04-25: removed layout save/restore for renderer to avoid issues in complex containers and user confusion.

## [1.0.1]

- 2026-04-25: ⚠️ replaced Split.js with Golden Layout for better layout and panel resizing.

## [1.0.0]

- 2026-04-25: ⚠️ refactored for new API response model. The backend has been refactored for its core models and API layers: changes are described in `\Projects\Gve\Gve\REFACTOR.md`. Code has been updated to the new model, which primarily affected models in `models.ts` and `GveSnapshotRendition` with its dependencies. Some code has been simplified, because now `v0` is included in the results, and all nodes are returned separately from versions, while before each version only had a list of nodes which belonged to it, so to get other nodes (e.g. a deleted one or base text nodes) one had to go back to other versions.

## [0.0.9]

- 2026-04-16: updated packages.

## [0.0.8]

- 2026-04-02:
  - fixed base text rendition not honoring rendition features, like font size.
  - updated packages.

## [0.0.7]

- 2026-03-04:
  - updated packages.
  - added support for `tw` and `th` units in text features `r_char-offset` and `r_char-offsets`.

## [0.0.6]

- 2026-01-23: fixed missing export of OperationSummaryService.

## [0.0.5]

- 2926-01-22: more robust context handling.
- 2026-01-09:
  - added pinning for hovered added text.
  - added node ID in hovered details.
  - fixes for node features not displayed when hovering on node.
  - integrated [Split.js](https://github.com/nathancahill/split) library for robust panel resizing.
  - all panels (versions list, version text, details) are now smoothly resizable with drag handles.
  - added "Reset Layout" button to toolbar to restore default panel sizes.
  - SVG text rendition area maintains stable position and size during panel resizing.
  - layout state (panel sizes) saved and restored across sessions.

## [0.0.4]

- 2026-01-08:
  - improve consumer JS to bind data all at once.
  - make the details panel resizable.
  - move the details about hovered element above the list of global features in the details panel.
- 2026-01-06:
  - fixes to H5-48 sample.
  - more hints.
  - added `r_t-value` feature.
- 2026-01-05:
  - fixed SVG grid in hint designer.
  - added alternative sample data.
  - refactor `consumer.js` for different sample data.
- 2026-01-02: more robust variables in hint designer.

## [0.0.3]

- 2026-01-01:
  - added populate hint variables function.
  - added SVG code basic validation.
- 2025-12-29: added variables validation to hints designer.

## [0.0.1]

- initial release.
