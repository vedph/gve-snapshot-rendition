# GVE Snapshot Rendition - Development Guide

## Quick Start for Continuing Development

This guide provides everything you need to pick up development incrementally, task by task.

---

## Development Environment Setup

```bash
# Install dependencies
pnpm install

# Start development server (http://localhost:3000)
pnpm start

# Build for production
pnpm build

# Run tests (when implemented)
pnpm test
```

---

## Project Structure & Responsibilities

### Core (`src/core/`)
- **gve-snapshot-rendition.ts** - Main web component class
  - Manages Shadow DOM
  - Handles property bindings (settings, data, versionTag)
  - Orchestrates rendering systems
  - Current state: Renders base text only

- **logger.ts** - Diagnostic logging
  - Controlled by `settings.debug`
  - Methods: `info()`, `warn()`, `error()`, `debug()`, `time()`, `timeEnd()`

### Settings (`src/settings/`)
- **settings.ts** - GveRenditionSettings interface + DEFAULT_SETTINGS
  - Display, spacing, viewport, animation, hints configuration
  - All settings documented with comments

- **hint-models.ts** - OperationHint interface
  - svg, position, offsets, scaling, rotation, animation properties

### Rendering (`src/rendering/`)
- **bounds-cache.ts** - BoundsCache class
  - Caches SVG element bounding rectangles
  - Methods: `set()`, `get()`, `updateFromElement()`, `getUnionBounds()`

- **spreading-engine.ts** - SpreadingEngine class
  - Implements corrected "stone in pond" algorithm
  - `calculateSpreading()` returns horizontal/vertical shifts
  - Used before adding solid hints or additional text

- **svg-utils.ts** - SVG utility functions
  - Element creation: `createSVGElement()`, `createTextElement()`, `createGroup()`, etc.
  - Styling: `applyTextStyle()`, `applyTransform()`
  - Measurement: `getSafeBBox()`, `getTextWidth()`, `getRectCenter()`

- **text-layout.ts** - TextLayout class
  - `calculateBaseTextPositions()` - Returns CharPosition[] for base text
  - Handles line breaks (LF), spaces, character offsets (r_char-offsets)
  - `calculateAdditionalTextPosition()` - For added text with r_text-position

- **feature-resolver.ts** - FeatureResolver class
  - `resolve()` - Converts Feature[] to RenditionConfig
  - Handles all r_* rendition features
  - `extractCharOffsets()` - Gets r_char-offsets from init features

- **text-renderer.ts** - TextRenderer class
  - ✅ `renderBaseText()` - Renders v0 text with animations
  - ⚠️ `renderAdditionalText()` - STUB, needs implementation
  - Uses TextLayout, FeatureResolver, AnimationEngine, BoundsCache

### Animation (`src/animation/`)
- **animation-factory.ts** - AnimationFactory class
  - `createAnimation()` - Wraps code string as AnimationFunction
  - `resolveAnimation()` - Handles #id references vs direct code

- **animation-engine.ts** - AnimationEngine class
  - `animate()` - Execute animation on element
  - `animateSpreading()` - Animate multiple elements with GSAP timeline
  - `fadeIn()`, `fadeOut()` - For hilites
  - `animatePanZoom()` - For viewport transitions

### Utils (`src/utils/`)
- **color-palette.ts** - Version color generation
  - `getVersionColor()` - Deterministic pastel color for version tag
  - Uses golden ratio for optimal distribution

- **feature-utils.ts** - Feature manipulation
  - `getFeatureValue()`, `hasFeature()`, `getRenditionFeatures()`
  - Parsers: `parseCharOffsets()`, `parseBorder()`, `parseDisplacedSpan()`, `parseHintVars()`

- **node-utils.ts** - CharNode helpers
  - `stringToNodes()` - Convert string to CharNode[]
  - `isLineBreak()`, `isSpace()`, `isPrintable()`
  - `getNodeSpan()` - Get range of nodes for displaced spans

- **text-utils.ts** - Text processing
  - `parseOffset()` - Handle "10", "0.5th", "0.5tw" formats
  - `resolvePlaceholders()` - Replace {{name}} in SVG
  - `escapeHtml()`, `truncate()`, `generateId()`

---

## Key Concepts

### 1. Rendition Features (r_*)
Features with names starting with `r_` control how text and hints are rendered:
- `r_font-size`, `r_font-family`, `r_fore-color`, `r_back-color`
- `r_italic`, `r_bold`, `r_underline`, `r_overline`, `r_strike`
- `r_text-position` - Position type: n, ne, e, se, s, sw, w, nw, o
- `r_text-offset-x`, `r_text-offset-y` - Offsets (px or "0.5th"/"0.5tw")
- `r_hints` - Space-delimited hint IDs
- `r_border` - Format: "EDGES THICKNESS PADDING TYPE COLOR"
- `r_text-displaced-span` - Format: "IDxN" (node ID x count)
- `r_hint-vars` - Variables for hint placeholders
- `r_char-offsets` - Init feature for base text layout adjustments

### 2. Trace Features ($*)
Features with names starting with `$` are added by backend to track operation effects:
- `$seg-in` - Input segment nodes
- `$seg-out` - Output segment nodes
- `$seg2-in`, `$seg2-out` - Second segment (swap operations)
- `$anchor` - Anchor node for add/move operations
- `$left-anchor`, `$right-anchor` - Anchors for delete operations
- `opid` - Operation ID that added the node
- `del` - Node was deleted (persists unlike trace features)

### 3. Reference Bounding Rectangle (RBR)
The rectangle enclosing all text nodes referenced by an operation:
- For delete: nodes being deleted
- For replace: nodes being replaced
- For add/move: anchor node
- For swap: both segments
- Can be **split across lines** → creates multiple RBRs
- Can be **displaced** via `displacedRefSpan` (IDxN format)

### 4. Spreading Algorithm
"Stone in pond" effect to make room for solid elements:
```
1. Calculate overlaps with new element
2. Elements overlapping from LEFT → shift LEFT by max overlap
3. Elements overlapping from RIGHT → shift RIGHT by max overlap
4. Same for TOP/BOTTOM vertically
5. Animate all shifts simultaneously with GSAP timeline
```

### 5. Hint Positioning
Hints positioned relative to RBR:
- **position**: n=north, s=south, e=east, w=west, ne/nw/se/sw=corners, o=origin/center
- **scaleX/scaleY**: Scale hint to % of RBR (1=match, 1.1=110%)
- **offsetX/offsetY**: Additional offset in px or "th"/"tw" units
- **rotation**: Rotate in degrees
- **handle**: SVG element with id="handle" defines positioning reference point

### 6. Animation Functions
Animations are JS code strings that receive `(gsap, targetEl, rootEl)`:
```javascript
// Example from settings.animations
"fade-in": `
  gsap.fromTo(targetEl,
    { opacity: 0 },
    { opacity: 1, duration: 0.3 }
  );
`
```
Can be referenced with `#id` prefix or provided as direct code.

---

## Data Flow

### Initialization
```
1. User sets component.settings and component.data
2. processData() converts string text to CharNode[] if needed
3. generateVersionPalette() creates colors for all versions
4. GSAP initialization triggers renderContent()
```

### Base Text Rendering
```
1. Extract r_char-offsets from first operation (if annotate)
2. TextLayout.calculateBaseTextPositions(nodes, charOffsets)
3. For each node:
   - Create SVG text element with id="n_{nodeId}", class="node v0"
   - Apply default styling
   - Set opacity=0 if animation present
   - Append to rootSvg
   - Cache bounds
   - Animate if charAnimationId set
```

### Operation Processing (NOT YET IMPLEMENTED)
```
For each step in data.steps:
  1. Get operation and its features
  2. Resolve rendition config from features
  3. Get reference nodes (refNodeIds from step)
  4. Calculate RBR(s) from reference nodes
  5. If r_hints feature:
     For each hint ID:
       - Fetch hint from settings.hints
       - Resolve placeholders with r_hint-vars
       - Calculate position relative to RBR
       - Apply scaling, rotation, offsets
       - If hint.solid: run spreading, animate
       - Render hint with animation
  6. If operation adds text (opid feature on nodes):
     - Get new nodes from step.result
     - Calculate positions with r_text-position/offsets
     - If r_text-displaced-span: use different RBR
     - Run spreading (text is always solid)
     - Render text character by character with animation
     - If r_border: draw border lines
  7. Fire versionTagChange event
```

---

## Implementation Priorities

### NEXT TASK: Hint Renderer
Create `src/rendering/hint-renderer.ts`:

**Key Responsibilities:**
1. Parse hint SVG string to get root `<g>` element
2. Resolve {{placeholders}} using variables from r_hint-vars
3. Calculate RBR from reference nodes (handle split segments)
4. Handle displaced RBRs (displacedRefSpan)
5. Find handle element or use center as reference point
6. Calculate position using HintPosition + offsets (parseOffset for th/tw)
7. Apply scaleX/scaleY transformations
8. Apply rotation
9. Check for overlap if hint.solid
10. Call spreading engine and animate if needed
11. Render hint with entrance animation

**Critical Functions:**
```typescript
class HintRenderer {
  async renderHint(
    hintId: string,
    hint: OperationHint,
    referenceNodes: CharNode[],
    rootSvg: SVGElement,
    variables: Map<string, string>
  ): Promise<void>

  private calculateRBRs(nodes: CharNode[]): BoundingRect[]
  private findHandlePosition(hintEl: SVGGElement): {x: number, y: number}
  private resolvePlaceholders(svg: string, vars: Map<string, string>): string
}
```

**Test with:** diagonal-stroke hint from consumer.js

### AFTER THAT: Complete Additional Text Rendering
Expand `TextRenderer.renderAdditionalText()`:
1. Get rendition config from operation features
2. Calculate RBR or use displaced span
3. Calculate position with r_text-position + offsets
4. Run spreading
5. Render each character
6. Draw borders if r_border

### THEN: Operation Processing Loop
In `gve-snapshot-rendition.ts`:
1. Add `processOperations()` method
2. Loop through data.steps
3. Extract features, call hint renderer, call text renderer
4. Fire events

---

## Testing Strategy

### Current Test (Base Text Only)
```javascript
// consumer.js already loads data and sets:
component.settings = { ...hints, animations, debug: true };
component.data = { text: "...", steps: [...] };
// Check console for logs, see base text with fade-in animation
```

### Next Tests
1. **Hint Test**: Render first operation (delete "In ") with diagonal-stroke hint
2. **Additional Text Test**: Render replace "t" with "T" above it
3. **Navigation Test**: Move between v0, v1, v2
4. **Spreading Test**: Render box hint (solid: true) and verify elements shift

---

## Common Patterns

### Creating SVG Elements
```typescript
import { createTextElement, applyTextStyle } from './rendering/svg-utils';

const text = createTextElement('Hello', { id: 'greeting', x: 10, y: 20 });
applyTextStyle(text, {
  fontFamily: settings.fontFamily,
  fontSize: settings.fontSize,
  foreColor: settings.foreColor
});
rootSvg.appendChild(text);
```

### Running Animations
```typescript
const animation = animationEngine.getFactory().resolveAnimation(
  hint.animation,
  settings.animations,
  'hint-label'
);
if (animation) {
  await animationEngine.animate(hintElement, animation, rootSvg);
}
```

### Spreading Before Adding Element
```typescript
// Calculate bounds for new element
const newBounds = { x: 100, y: 50, width: 200, height: 30, right: 300, bottom: 80 };

// Calculate spreading
const spreading = spreadingEngine.calculateSpreading(newBounds, ['new-element-id']);

if (spreading.hasShifts) {
  // Combine horizontal and vertical shifts
  const combinedShifts = new Map<string, {x: number, y: number}>();
  for (const [id, xShift] of spreading.horizontalShifts) {
    const yShift = spreading.verticalShifts.get(id) || 0;
    combinedShifts.set(id, { x: xShift, y: yShift });
  }

  // Animate spreading
  await animationEngine.animateSpreading(combinedShifts, settings.spreadTime, rootSvg);
}

// Now add the element
```

### Feature Resolution
```typescript
const config = featureResolver.resolve(
  settings,
  operation.features,
  { width: rbrWidth, height: rbrHeight } // For offset calculation
);

// Use config for rendering
if (config.hints) {
  for (const hintId of config.hints) {
    // render hint
  }
}
```

---

## Debugging Tips

1. **Enable Debug Mode**: Set `debug: true` in consumer.js settings
2. **Check Browser Console**: All logging goes to console with [GVE-Rendition] prefix
3. **Inspect Shadow DOM**: Use Chrome DevTools → Elements → expand #shadow-root
4. **Check Bounds Cache**: `boundsCache.size()` shows cached element count
5. **GSAP Issues**: Check if gsap is loaded: `window.gsap`
6. **SVG Rendering**: Use `showHintHandles: true` to see handle elements

---

## File Naming Conventions

- **Classes**: PascalCase (e.g., TextRenderer, BoundsCache)
- **Files**: kebab-case matching class name (e.g., text-renderer.ts, bounds-cache.ts)
- **Interfaces**: PascalCase with descriptive names (e.g., RenditionConfig, CharPosition)
- **Utils**: Functions exported from kebab-case files (e.g., feature-utils.ts)

---

## Git Workflow (When Ready)

```bash
# Commit completed feature
git add src/rendering/hint-renderer.ts
git commit -m "Implement hint renderer with RBR calculation and positioning"

# Update status doc
git add IMPLEMENTATION_STATUS.md
git commit -m "Update implementation status: hint renderer complete"
```

---

## Key Design Decisions Made

### 1. Spreading Algorithm Correction
Original docs had flawed logic. Corrected to:
- Left-overlapping elements shift LEFT
- Right-overlapping elements shift RIGHT
- Creates proper ripple effect

### 2. getBBox() TypeScript Workaround
TypeScript doesn't recognize `getBBox()` on `SVGElement` type.
Solution: Use `(element as any).getBBox()`

### 3. No External Hint Library
Hints are fully custom SVG with placeholders.
Maximum flexibility, no dependencies.

### 4. Animation-First Design
All entrance animations use GSAP promises.
Ensures proper sequencing and smooth UX.

### 5. Settings Override Hierarchy
```
DEFAULT_SETTINGS < bound settings < init features (r_char-offsets) < operation features (r_*)
```

---

## External Dependencies

- **GSAP 3.12.5**: Loaded from CDN in index.html
  - Free to use (now includes previously paid plugins)
  - Used for all animations
  - Accessed via `window.gsap`

- **svg-pan-zoom**: NOT YET INTEGRATED
  - Will handle pan and zoom
  - To be added later

---

## Questions to Ask When Stuck

1. Is GSAP loaded? Check browser console for errors
2. Are bounds being cached? Check `boundsCache.size()`
3. Are features being resolved correctly? Add logging to FeatureResolver
4. Is Shadow DOM the issue? Use browser DevTools
5. Is the SVG structure correct? Inspect with DevTools
6. Are animations completing? Add logging to animation callbacks

---

## Next Session Checklist

- [ ] Read IMPLEMENTATION_STATUS.md for current state
- [ ] Read this DEVELOPMENT_GUIDE.md for context
- [ ] Check docs/rendition.md for design specs
- [ ] Review src/rendering/text-renderer.ts for rendering patterns
- [ ] Start with highest priority task from IMPLEMENTATION_STATUS.md

---

*This guide is living documentation. Update as you learn new patterns or make design decisions.*
