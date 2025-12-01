# GVE Snapshot Rendition - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Consumer Code                             │
│  (consumer.js: loads data, configures settings, binds to WC)   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              <gve-snapshot-rendition> Web Component             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Shadow DOM (Isolated Styles)               │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │  Main SVG Canvas (text-rendition-area)         │   │   │
│  │  │  - Base text (v0)                               │   │   │
│  │  │  - Hints (visual operation counterparts)        │   │   │
│  │  │  - Additional text (from operations)            │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Component Internal Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                   GveSnapshotRendition (Main Class)                  │
│                                                                      │
│  Properties:                                                         │
│  • settings: GveRenditionSettings                                   │
│  • data: CharChainResult                                            │
│  • versionTag: string                                               │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                    Core Systems                             │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │   │
│  │  │   Logger     │  │  Animation   │  │   Bounds     │    │   │
│  │  │              │  │   Engine     │  │   Cache      │    │   │
│  │  │  • debug()   │  │  • animate() │  │  • get()     │    │   │
│  │  │  • info()    │  │  • spread()  │  │  • set()     │    │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                  Rendering Pipeline                         │   │
│  │                                                             │   │
│  │  1. processData()                                          │   │
│  │     ├─> stringToNodes() if text is string                 │   │
│  │     └─> generateVersionPalette()                          │   │
│  │                                                             │   │
│  │  2. renderContent()                                        │   │
│  │     ├─> Extract init features (r_char-offsets)            │   │
│  │     └─> TextRenderer.renderBaseText()                     │   │
│  │         ├─> TextLayout.calculateBaseTextPositions()       │   │
│  │         ├─> Create SVG text elements                      │   │
│  │         ├─> Apply styling                                 │   │
│  │         ├─> Cache bounds                                  │   │
│  │         └─> Animate if charAnimationId set                │   │
│  │                                                             │   │
│  │  3. processOperations() [NOT YET IMPLEMENTED]             │   │
│  │     For each step:                                         │   │
│  │     ├─> Get operation & features                          │   │
│  │     ├─> FeatureResolver.resolve()                         │   │
│  │     ├─> Calculate RBR from refNodeIds                     │   │
│  │     ├─> If r_hints:                                        │   │
│  │     │   └─> HintRenderer.renderHint() [NEEDS IMPL]       │   │
│  │     │       ├─> Resolve placeholders                     │   │
│  │     │       ├─> Calculate position                       │   │
│  │     │       ├─> Apply transformations                    │   │
│  │     │       ├─> Spreading if solid                       │   │
│  │     │       └─> Animate entrance                         │   │
│  │     └─> If adds text:                                     │   │
│  │         └─> TextRenderer.renderAdditionalText() [STUB]   │   │
│  │             ├─> Calculate position with r_text-position  │   │
│  │             ├─> Spreading (always solid)                 │   │
│  │             ├─> Render characters                        │   │
│  │             └─> Draw borders if r_border                 │   │
│  └────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌─────────────────┐
│  Backend API    │
│  (Snapshot)     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│   CharChainResult               │
│   • text: string | CharNode[]   │
│   • steps: Step[]               │
│   • chainTags: string[]         │
│   • taggedNodes: Map            │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   processData()                 │
│   • Convert string to nodes     │
│   • Generate color palette      │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│   renderContent() - Base Text (v0)                      │
│                                                          │
│   CharNode[] ──────> TextLayout                         │
│        │               │                                 │
│        │               ▼                                 │
│        │         CharPosition[]                          │
│        │               │                                 │
│        └──────────┬────┘                                │
│                   ▼                                      │
│            TextRenderer                                  │
│                   │                                      │
│   ┌───────────────┼───────────────┐                    │
│   ▼               ▼               ▼                     │
│ Create SVG    Apply Style    Cache Bounds              │
│   │               │               │                     │
│   └───────────────┴───────────────┘                    │
│                   │                                      │
│                   ▼                                      │
│           Animate (optional)                            │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│   processOperations() [NOT YET IMPLEMENTED]             │
│                                                          │
│   For each Step:                                        │
│                                                          │
│   Step ──────> FeatureResolver                          │
│    │              │                                      │
│    │              ▼                                      │
│    │        RenditionConfig                             │
│    │              │                                      │
│    │  ┌───────────┴───────────┐                        │
│    │  ▼                       ▼                         │
│    │ Hints?                Text?                        │
│    │  │                       │                         │
│    │  ▼                       ▼                         │
│    │ HintRenderer     TextRenderer                      │
│    │  │                   (additional)                  │
│    │  │                       │                         │
│    │  │   ┌───────────────────┘                        │
│    │  │   │                                             │
│    │  ▼   ▼                                             │
│    │ Calculate RBR                                      │
│    │     │                                              │
│    │     ▼                                              │
│    │ Spreading? ──Yes──> SpreadingEngine               │
│    │     │                      │                       │
│    │     No                     ▼                       │
│    │     │                AnimationEngine               │
│    │     │                      │                       │
│    │     └──────────────────────┘                      │
│    │                 │                                  │
│    │                 ▼                                  │
│    │          Render to SVG                            │
│    │                 │                                  │
│    │                 ▼                                  │
│    │          Cache Bounds                             │
│    │                 │                                  │
│    └─────────────────┘                                 │
│                      │                                  │
│                      ▼                                  │
│              Fire versionTagChange                      │
└─────────────────────────────────────────────────────────┘
```

## Rendering Subsystems

```
┌──────────────────────────────────────────────────────────────┐
│                    TextRenderer                              │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  renderBaseText()                                  │    │
│  │  ┌──────────────────────────────────────────┐     │    │
│  │  │  TextLayout.calculateBaseTextPositions() │     │    │
│  │  │  • Handle LF (line breaks)               │     │    │
│  │  │  • Handle spaces (reference char width)  │     │    │
│  │  │  • Apply r_char-offsets                  │     │    │
│  │  └──────────────────────────────────────────┘     │    │
│  │  ┌──────────────────────────────────────────┐     │    │
│  │  │  For each character:                     │     │    │
│  │  │  • Create SVG text element               │     │    │
│  │  │  • Apply default styling                 │     │    │
│  │  │  • Set id="n_{nodeId}"                   │     │    │
│  │  │  • Set class="node v0"                   │     │    │
│  │  │  • Cache bounds                          │     │    │
│  │  │  • Animate if charAnimationId            │     │    │
│  │  └──────────────────────────────────────────┘     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  renderAdditionalText() [STUB - NEEDS IMPL]       │    │
│  │  • Get r_text-position, r_text-offset-x/y         │    │
│  │  • Calculate RBR or use r_text-displaced-span     │    │
│  │  • Run spreading (text always solid)              │    │
│  │  • Render characters                              │    │
│  │  • Draw r_border if specified                     │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│              HintRenderer [NEEDS IMPLEMENTATION]             │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  renderHint()                                      │    │
│  │  1. resolvePlaceholders(svg, r_hint-vars)         │    │
│  │  2. parseSVGContent() → get root <g>              │    │
│  │  3. calculateRBRs(referenceNodes)                 │    │
│  │     • Group by line if split                      │    │
│  │     • Handle displacedRefSpan if set              │    │
│  │  4. findHandlePosition(hintEl)                    │    │
│  │     • Look for id="handle"                        │    │
│  │     • Or use center                               │    │
│  │  5. calculatePosition(position, offsets, RBR)     │    │
│  │     • Parse offsets (px, "th", "tw")              │    │
│  │     • Apply position (n,ne,e,se,s,sw,w,nw,o)      │    │
│  │  6. applyTransform(scaleX, scaleY, rotation)      │    │
│  │  7. if (hint.solid)                               │    │
│  │       SpreadingEngine.calculateSpreading()        │    │
│  │       AnimationEngine.animateSpreading()          │    │
│  │  8. Append to rootSvg                             │    │
│  │  9. Cache bounds                                  │    │
│  │  10. Animate entrance if hint.animation           │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                   SpreadingEngine                            │
│                                                              │
│  calculateSpreading(newBounds, excludeIds)                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │  For all cached elements (except excluded):        │    │
│  │                                                     │    │
│  │  Horizontal:                                       │    │
│  │  • Find left overlaps → shift LEFT by max overlap  │    │
│  │  • Find right overlaps → shift RIGHT by max overlap│    │
│  │                                                     │    │
│  │  Vertical:                                         │    │
│  │  • Find top overlaps → shift UP by max overlap     │    │
│  │  • Find bottom overlaps → shift DOWN by max overlap│    │
│  │                                                     │    │
│  │  Return { horizontalShifts, verticalShifts }       │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                   AnimationEngine                            │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  animate(element, animationFn, rootSvg)            │    │
│  │  • Execute GSAP animation on element               │    │
│  │  • Return promise when complete                    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  animateSpreading(shifts, duration, rootSvg)       │    │
│  │  • Create GSAP timeline                            │    │
│  │  • Add all element transforms to timeline          │    │
│  │  • Run in parallel (all start at t=0)              │    │
│  │  • Return promise when complete                    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  fadeIn(elements, duration)                        │    │
│  │  fadeOut(elements, duration)                       │    │
│  │  • For hilites system                              │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

## Feature Resolution Pipeline

```
Operation Features (OperationFeature[])
         │
         ▼
┌────────────────────────────────┐
│    FeatureResolver.resolve()   │
│                                │
│  Process each r_* feature:     │
│  • r_font-size → fontSize      │
│  • r_font-family → fontFamily  │
│  • r_fore-color → foreColor    │
│  • r_text-position → position  │
│  • r_text-offset-x/y → offsets │
│  • r_hints → hint IDs          │
│  • r_border → border config    │
│  • r_hint-vars → variables     │
│  • etc.                        │
└────────┬───────────────────────┘
         │
         ▼
   RenditionConfig
   {
     fontSize: number,
     fontFamily: string,
     foreColor: string,
     hints?: string[],
     hintVars?: Map<string, string>,
     border?: BorderConfig,
     textPosition?: string,
     textOffsetX: number,
     textOffsetY: number,
     ...
   }
         │
         ▼
   Used by TextRenderer & HintRenderer
```

## Class Relationships

```
GveSnapshotRendition
    │
    ├── owns Logger
    ├── owns AnimationEngine ──────> uses AnimationFactory
    ├── owns BoundsCache
    ├── owns SpreadingEngine ──────> uses BoundsCache
    ├── owns TextRenderer
    │       │
    │       ├── uses TextLayout
    │       ├── uses FeatureResolver
    │       ├── uses AnimationEngine
    │       └── uses BoundsCache
    │
    └── owns HintRenderer [TO BE CREATED]
            │
            ├── uses FeatureResolver
            ├── uses AnimationEngine
            ├── uses BoundsCache
            └── uses SpreadingEngine
```

## File Dependencies

```
index.ts
 └─> core/gve-snapshot-rendition.ts
      ├─> models.ts
      ├─> settings/settings.ts
      ├─> settings/hint-models.ts
      ├─> core/logger.ts
      ├─> animation/animation-engine.ts
      │    └─> animation/animation-factory.ts
      ├─> rendering/bounds-cache.ts
      ├─> rendering/spreading-engine.ts
      ├─> rendering/text-renderer.ts
      │    ├─> rendering/text-layout.ts
      │    ├─> rendering/feature-resolver.ts
      │    ├─> rendering/svg-utils.ts
      │    └─> utils/node-utils.ts
      └─> utils/color-palette.ts
```

## Build Pipeline

```
src/index.ts
     │
     ▼
Rollup + @rollup/plugin-typescript
     │
     ├─> TypeScript Compilation
     │   • tsconfig.json
     │   • type checking
     │   • .ts → .js
     │
     ├─> Module Resolution
     │   • @rollup/plugin-node-resolve
     │   • @rollup/plugin-commonjs
     │
     └─> Minification (production)
         • @rollup/plugin-terser

     │
     ▼
dist/
 ├─> index.js (ESM)
 └─> index.cjs.min.js (CJS, minified)
```

---

*This architecture supports incremental development and easy testing of individual subsystems.*
