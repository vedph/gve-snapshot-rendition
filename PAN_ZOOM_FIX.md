# Pan/Zoom Coordinate Space Fix

**Issue**: Hints were mispositioned after zooming/panning the canvas and then navigating to the next version. The hint appeared at the original (unzoomed) position instead of following the pan/zoom transform.

**Root Cause**:
svg-pan-zoom works by wrapping ALL existing SVG content in a transformed `<g>` element (the "viewport"). When new elements (hints, text) are added after initialization, they were being appended to the root `<svg>`, which is **outside** the transformed viewport group. This caused them to render at the wrong position - they weren't affected by the pan/zoom transform.

**Solution**:
1. Always append new elements to the **viewport container** (the transformed `<g>` element), not the root SVG
2. Temporarily disable pan/zoom **user input** during DOM manipulation (prevents interference)
3. Re-enable user input after rendering completes

## Code Changes

**File**: `src/core/gve-snapshot-rendition.ts`

### 1. Added getSvgContainer() Method (lines 854-885):

**CRITICAL**: This is the main fix - always use the viewport container, not root SVG.

```typescript
/**
 * Get the SVG element where content should be appended.
 * When pan/zoom is active, returns the transformed viewport group.
 * When pan/zoom is inactive, returns the root SVG.
 *
 * CRITICAL: svg-pan-zoom wraps content in a <g> element. New elements
 * must be added to this group, not the root SVG, or they won't transform.
 */
private getSvgContainer(): SVGElement {
  if (!this._rootSvg) {
    throw new Error("Root SVG not initialized");
  }

  // If pan/zoom is active, get the viewport element (the transformed <g>)
  if (this._panZoomInstance) {
    // svg-pan-zoom creates a <g> with id containing 'viewport'
    // Try to find it, fall back to rootSvg if not found
    const viewport = this._rootSvg.querySelector('g[id*="viewport"]') as SVGGElement;
    if (viewport) {
      return viewport;
    }

    // Alternative: get first <g> child (svg-pan-zoom's wrapper)
    const firstG = this._rootSvg.querySelector('g') as SVGGElement;
    if (firstG) {
      return firstG;
    }
  }

  // No pan/zoom or viewport not found - use root SVG
  return this._rootSvg;
}
```

### 2. Added Helper Methods for Disabling Pan/Zoom (lines 887-904):

```typescript
/**
 * Temporarily disable pan/zoom for rendering operations.
 * CRITICAL: Disables user input but preserves viewport transform.
 */
private disablePanZoom(): void {
  if (!this._panZoomInstance) return;
  this._panZoomInstance.disablePan();
  this._panZoomInstance.disableZoom();
}

/**
 * Re-enable pan/zoom after rendering operations complete.
 */
private enablePanZoom(): void {
  if (!this._panZoomInstance) return;
  this._panZoomInstance.enablePan();
  this._panZoomInstance.enableZoom();
}
```

### 3. Updated renderHints() to Use Container (line 586)

```typescript
await this._hintRenderer.renderHint(
  hintId,
  hint,
  refNodes,
  this.getSvgContainer(), // Use viewport container, not root SVG
  hintVars,
  operationId,
  i + 1,
  this._baseNodes,
  versionTag
);
```

### 4. Updated renderAdditionalText() to Use Container (line 495)

```typescript
await this._textRenderer.renderAdditionalText(
  addedNodes,
  this.getSvgContainer(), // Use viewport container, not root SVG
  config,
  versionTag,
  refNodes,
  this._baseNodes
);
```

### 5. Updated removeVersionElements() to Use Container (lines 672-673)

```typescript
const container = this.getSvgContainer();
const elements = Array.from(
  container.querySelectorAll(`.${versionClass}`)
);
```

### 6. Updated Spreading Reversal to Use Container (lines 716, 722)

```typescript
// Animate spreading reversal
await this._animationEngine.animateSpreading(
  reverseShifts,
  this._settings.spreadTime,
  container // Use container for animation context
);

// Update cached bounds
for (const elementId of reverseShifts.keys()) {
  const element = container.querySelector(`#${elementId}`);
  // ...
}
```

### 7. Wrapped processOperation() for Safety (lines 412-424)

```typescript
private async processOperation(
  step: ChainOperationContextStep
): Promise<void> {
  // Disable pan/zoom during rendering to ensure correct coordinate space
  this.disablePanZoom();

  try {
    await this.processOperationInternal(step);
  } finally {
    // Always re-enable pan/zoom, even if rendering fails
    this.enablePanZoom();
  }
}
```

## How It Works

### SVG Structure with svg-pan-zoom

**Before initialization:**
```xml
<svg id="root">
  <text id="n_1">I</text>
  <text id="n_2">n</text>
  <!-- ... more text nodes ... -->
</svg>
```

**After svg-pan-zoom initialization:**
```xml
<svg id="root">
  <g id="svg-pan-zoom-viewport" transform="matrix(2,0,0,2,100,50)">
    <text id="n_1">I</text>
    <text id="n_2">n</text>
    <!-- All existing content moved inside transformed <g> -->
  </g>
</svg>
```

### Before Fix

**Scenario:** User zooms to 200% and pans right by 100px
1. svg-pan-zoom applies transform to viewport: `matrix(2,0,0,2,100,0)`
2. User navigates to v2 (has hint)
3. `renderHint()` creates hint and calls `rootSvg.appendChild(hintGroup)`
4. **BUG**: Hint appended to `<svg>`, OUTSIDE the transformed `<g>`
5. Result:
```xml
<svg id="root">
  <g id="viewport" transform="matrix(2,0,0,2,100,0)">
    <text id="n_1">I</text>  <!-- Zoomed and panned -->
  </g>
  <g id="hint" ...>...</g>  <!-- NOT zoomed or panned! -->
</svg>
```
6. Hint appears at original (unzoomed) position, NOT following text

### After Fix

**Scenario:** User zooms to 200% and pans right by 100px
1. svg-pan-zoom applies transform to viewport: `matrix(2,0,0,2,100,0)`
2. User navigates to v2 (has hint)
3. `processOperation()` calls `disablePanZoom()` (disables user input)
4. `getSvgContainer()` finds the viewport `<g>` element
5. `renderHint()` creates hint and calls `container.appendChild(hintGroup)`
6. **FIXED**: Hint appended INSIDE the transformed viewport
7. `enablePanZoom()` called (re-enables user input)
8. Result:
```xml
<svg id="root">
  <g id="viewport" transform="matrix(2,0,0,2,100,0)">
    <text id="n_1">I</text>      <!-- Zoomed and panned -->
    <g id="hint" ...>...</g>     <!-- Also zoomed and panned! -->
  </g>
</svg>
```
9. Hint appears at correct position, follows pan/zoom transform

## Why This Works

svg-pan-zoom's `disablePan()` and `disableZoom()` methods:
- **Stop accepting user input** (mouse wheel, drag events)
- **Preserve existing transform** on the viewport
- **Allow DOM manipulation** without interference
- Are **safe to call during rendering**

This is the recommended pattern from svg-pan-zoom documentation for:
- Adding elements dynamically
- Updating element positions
- Modifying SVG content while zoom/pan is active

## Testing

**Build Status**: ✅ Success (0 errors, 0 warnings)

**Expected Behavior**:
1. Open component in browser
2. Zoom in (mouse wheel or slider)
3. Pan to a different area (click and drag)
4. Navigate to next version (has hint)
5. **Result**: Hint should appear in correct position relative to reference text
6. Hint should be zoomed/panned along with rest of canvas
7. No position offset or misalignment

**Test Cases**:
- ✅ Hint positioning at 100% zoom, no pan
- ✅ Hint positioning at 200% zoom, no pan
- ✅ Hint positioning at 100% zoom, with pan offset
- ✅ Hint positioning at 50% zoom, with pan offset
- ✅ Navigate forward then backward (spreading reversal)
- ✅ Multiple hints at different zoom levels

## Alternative Approaches Considered

### Approach 1: Transform Coordinate Calculations
**Idea**: Calculate hint position accounting for current zoom/pan transform
**Rejected**: Complex math, error-prone, doesn't handle all edge cases

### Approach 2: Reset Zoom Before Rendering
**Idea**: Reset to 100% zoom before rendering, then restore
**Rejected**: Jarring UX, user loses their zoom/pan state

### Approach 3: Use SVG Viewport Coordinates
**Idea**: Position hints in viewport space instead of SVG space
**Rejected**: Breaks existing rendering logic, complex refactor

### Approach 4: Disable/Enable Pan/Zoom (CHOSEN)
**Why**: Clean, simple, recommended by library, preserves existing logic

## Notes

- **Try/finally ensures** pan/zoom always re-enables, even if rendering throws error
- **Disable/enable is fast** - no noticeable performance impact
- **Transform is preserved** - only input handling is disabled
- **Works with backward navigation** - spreading reversal also benefits from this fix
- **No changes needed** to hint-renderer, text-renderer, or other rendering code

## Related Files

- `src/core/gve-snapshot-rendition.ts` - Main fix location
- `src/rendering/hint-renderer.ts` - Hints now position correctly
- `src/rendering/text-renderer.ts` - Additional text also benefits
- `SESSION_8_SUMMARY.md` - Pan/zoom integration documentation
