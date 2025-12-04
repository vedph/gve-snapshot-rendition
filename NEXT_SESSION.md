# Next Session Guide - Session 9

## 📍 Current Status

**Progress: 90% Complete - PAN/ZOOM INTEGRATION COMPLETE! 🎉**

**Just Completed (Session 8):**
- ✅ Integrated svg-pan-zoom library
- ✅ Mouse wheel zoom enabled
- ✅ Click and drag pan enabled
- ✅ Zoom slider (10-400%) added to toolbar
- ✅ Zoom +/- buttons added
- ✅ Reset zoom button added
- ✅ Real-time zoom percentage display
- ✅ Zoom/pan state preserved across navigation
- ✅ Build successful, zero errors, zero warnings

**What's Complete:**
- ✅ All core utilities and infrastructure
- ✅ All rendering systems (TextRenderer, HintRenderer, BoundsCache, SpreadingEngine)
- ✅ Animation system (AnimationEngine, AnimationFactory)
- ✅ Feature resolution with hintVars
- ✅ Operation processing with trace features
- ✅ Accumulation-based navigation (forward and backward)
- ✅ Spreading reversal with history tracking
- ✅ **Pan/zoom with toolbar controls**
- ✅ Interactive toolbar with navigation and zoom
- ✅ Version tag tracking

**What's Next:**
- ⏳ **Add First/Last navigation buttons (NEXT)**
- ⏳ Add keyboard shortcuts for navigation and zoom
- ⏳ Add remaining UI components (versions list, details panel)
- ⏳ Polish and optimization

---

## 🎯 Priority 1: Add First/Last Navigation + Keyboard (2 hours)

### Goal
Complete navigation controls with First/Last buttons and comprehensive keyboard shortcuts.

### Current Status
- Previous/Next buttons working
- No First/Last buttons
- No keyboard shortcuts
- Zoom controls working but no keyboard zoom

### Why This Matters
- Hit testing (finding elements at mouse position)
- RBR calculation (reference bounding rectangles)
- Hint positioning (absolute coordinates)
- Spreading calculations (overlap detection)
- Bounds caching (must account for zoom scale)

### Current Status
- svg-pan-zoom package already installed (from Session 6)
- No pan/zoom functionality implemented yet
- All rendering uses viewport coordinates (needs to handle transform)

### Implementation Plan

#### 1. Verify Package Installation

Check if svg-pan-zoom is installed:

```bash
pnpm list svg-pan-zoom
```

If not installed:

```bash
pnpm add svg-pan-zoom @types/svg-pan-zoom
```

#### 2. Initialize Pan/Zoom

**File**: `src/core/gve-snapshot-rendition.ts`

Add import and instance field:

```typescript
import svgPanZoom from 'svg-pan-zoom';

export class GveSnapsh otRendition extends HTMLElement {
  // ... existing fields ...
  private _panZoomInstance?: SvgPanZoom.Instance;

  // ... existing methods ...

  private initializePanZoom(): void {
    if (!this._rootSvg) return;

    this._panZoomInstance = svgPanZoom(this._rootSvg, {
      zoomEnabled: true,
      panEnabled: true,
      controlIconsEnabled: false, // We'll use toolbar buttons
      fit: false,
      center: false,
      minZoom: 0.1,
      maxZoom: 10,
      zoomScaleSensitivity: 0.3,
    });

    this._logger.info("Pan/Zoom initialized");
  }

  // Call from renderBaseText() after SVG is ready:
  private async renderBaseText(): Promise<void> {
    // ... existing code ...

    // Initialize pan/zoom after initial render
    this.initializePanZoom();
  }

  // Add cleanup
  disconnectedCallback(): void {
    if (this._panZoomInstance) {
      this._panZoomInstance.destroy();
      this._panZoomInstance = undefined;
    }
  }
}
```

#### 3. Add Toolbar Zoom Controls

**File**: `src/ui/toolbar.ts`

Add zoom buttons to toolbar:

```typescript
private createToolbarButtons(): void {
  // ... existing prev/next buttons ...

  // Zoom controls group
  const zoomGroup = document.createElement("div");
  zoomGroup.className = "gve-toolbar-group";

  // Zoom In button
  this._zoomInBtn = this.createButton("➕", "Zoom In");
  this._zoomInBtn.addEventListener("click", () => this.handleZoomIn());

  // Zoom Out button
  this._zoomOutBtn = this.createButton("➖", "Zoom Out");
  this._zoomOutBtn.addEventListener("click", () => this.handleZoomOut());

  // Reset Zoom button
  this._resetZoomBtn = this.createButton("⊡", "Reset Zoom");
  this._resetZoomBtn.addEventListener("click", () => this.handleResetZoom());

  // Zoom level display
  this._zoomLabel = document.createElement("span");
  this._zoomLabel.className = "gve-zoom-label";
  this._zoomLabel.textContent = "100%";

  zoomGroup.appendChild(this._zoomInBtn);
  zoomGroup.appendChild(this._zoomOutBtn);
  zoomGroup.appendChild(this._resetZoomBtn);
  zoomGroup.appendChild(this._zoomLabel);

  this._container.appendChild(zoomGroup);
}

private handleZoomIn(): void {
  this.dispatchEvent(new CustomEvent("zoom-in"));
}

private handleZoomOut(): void {
  this.dispatchEvent(new CustomEvent("zoom-out"));
}

private handleResetZoom(): void {
  this.dispatchEvent(new CustomEvent("reset-zoom"));
}

public updateZoomLevel(zoom: number): void {
  if (this._zoomLabel) {
    this._zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  }
}
```

#### 4. Wire Up Zoom Events

**File**: `src/core/gve-snapshot-rendition.ts`

Add event listeners:

```typescript
private setupToolbar(): void {
  if (!this._toolbar) return;

  // Existing navigation events
  this._toolbar.addEventListener("navigate-prev", () => this.goToPrevious());
  this._toolbar.addEventListener("navigate-next", () => this.goToNext());

  // NEW: Zoom events
  this._toolbar.addEventListener("zoom-in", () => this.handleZoomIn());
  this._toolbar.addEventListener("zoom-out", () => this.handleZoomOut());
  this._toolbar.addEventListener("reset-zoom", () => this.handleResetZoom());
}

private handleZoomIn(): void {
  if (!this._panZoomInstance) return;
  this._panZoomInstance.zoomIn();
  this.updateToolbarZoom();
}

private handleZoomOut(): void {
  if (!this._panZoomInstance) return;
  this._panZoomInstance.zoomOut();
  this.updateToolbarZoom();
}

private handleResetZoom(): void {
  if (!this._panZoomInstance) return;
  this._panZoomInstance.resetZoom();
  this._panZoomInstance.resetPan();
  this.updateToolbarZoom();
}

private updateToolbarZoom(): void {
  if (!this._panZoomInstance || !this._toolbar) return;
  const zoom = this._panZoomInstance.getZoom();
  this._toolbar.updateZoomLevel(zoom);
}
```

#### 5. Add CSS for Zoom Controls

**File**: `src/ui/toolbar.ts` (in styles)

```css
.gve-toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-left: 12px;
  border-left: 1px solid var(--gve-toolbar-border-color, #ddd);
}

.gve-zoom-label {
  font-size: 12px;
  color: var(--gve-toolbar-text-color, #333);
  min-width: 48px;
  text-align: center;
  font-family: monospace;
}
```

### Design Decisions

**Q: Should zoom reset when navigating between versions?**
**A: NO** - Preserve zoom/pan state. Users often want to zoom into a specific area and then navigate.

**Q: Should there be a "fit to content" button?**
**A: YES** - Useful for large texts. Add as optional feature:

```typescript
private handleFitToContent(): void {
  if (!this._panZoomInstance || !this._rootSvg) return;
  const bbox = this._rootSvg.getBBox();
  this._panZoomInstance.fit();
  this._panZoomInstance.center();
}
```

**Q: Should zoom/pan state be saved in settings?**
**A: NO** - State is session-specific, not document-specific.

### Testing

1. Open component in browser
2. Verify zoom buttons appear in toolbar
3. Click zoom in - verify canvas zooms in
4. Click zoom out - verify canvas zooms out
5. Use mouse wheel - verify zoom works (if enabled)
6. Click and drag - verify pan works
7. Click reset - verify zoom returns to 100% and pan resets
8. Verify zoom level display updates correctly
9. Navigate between versions - verify zoom/pan persists

### Success Criteria

- [ ] Pan/zoom initialized after initial render
- [ ] Toolbar shows zoom controls
- [ ] Zoom in/out buttons work
- [ ] Reset zoom button works
- [ ] Zoom level displays correctly (e.g., "150%")
- [ ] Mouse wheel zoom works (if enabled)
- [ ] Click-and-drag pan works
- [ ] Zoom/pan state persists across navigation
- [ ] Component cleans up pan/zoom on disconnect

---

## 🎯 Priority 2: Add First/Last Navigation (1 hour)

### Goal
Add First/Last buttons to toolbar and implement keyboard shortcuts for complete navigation control.

### Current Status
- Previous/Next buttons working
- No First/Last buttons
- No keyboard shortcuts
- Version navigation complete but missing convenience features

### Implementation Plan

#### 1. Add First/Last Buttons to Toolbar

**File**: `src/ui/toolbar.ts`

Add button fields:

```typescript
private _firstBtn!: HTMLButtonElement;
private _lastBtn!: HTMLButtonElement;
```

Update `createToolbarButtons()`:

```typescript
private createToolbarButtons(): void {
  const navGroup = document.createElement("div");
  navGroup.className = "gve-toolbar-group";

  // First button (NEW)
  this._firstBtn = this.createButton("|◀", "First Version");
  this._firstBtn.addEventListener("click", () => this.handleFirst());

  // Previous button (existing)
  this._prevBtn = this.createButton("◀", "Previous");
  this._prevBtn.addEventListener("click", () => this.handlePrevious());

  // Version label (existing)
  this._versionLabel = document.createElement("span");
  this._versionLabel.className = "gve-version-label";
  this._versionLabel.textContent = "v0";

  // Next button (existing)
  this._nextBtn = this.createButton("▶", "Next");
  this._nextBtn.addEventListener("click", () => this.handleNext());

  // Last button (NEW)
  this._lastBtn = this.createButton("▶|", "Last Version");
  this._lastBtn.addEventListener("click", () => this.handleLast());

  navGroup.appendChild(this._firstBtn);
  navGroup.appendChild(this._prevBtn);
  navGroup.appendChild(this._versionLabel);
  navGroup.appendChild(this._nextBtn);
  navGroup.appendChild(this._lastBtn);

  this._container.appendChild(navGroup);
}

private handleFirst(): void {
  this.dispatchEvent(new CustomEvent("navigate-first"));
}

private handleLast(): void {
  this.dispatchEvent(new CustomEvent("navigate-last"));
}
```

Update `setCurrentIndex()` to enable/disable first/last buttons:

```typescript
public setCurrentIndex(index: number): void {
  this._currentIndex = index;
  this._versionLabel.textContent = `v${index}`;

  // Disable first/prev at start
  this._firstBtn.disabled = index === 0;
  this._prevBtn.disabled = index === 0;

  // Disable next/last at end
  this._nextBtn.disabled = index >= this._maxIndex;
  this._lastBtn.disabled = index >= this._maxIndex;
}
```

#### 2. Implement Navigation Methods

**File**: `src/core/gve-snapshot-rendition.ts`

Add toolbar event listeners:

```typescript
private setupToolbar(): void {
  if (!this._toolbar) return;

  this._toolbar.addEventListener("navigate-prev", () => this.goToPrevious());
  this._toolbar.addEventListener("navigate-next", () => this.goToNext());

  // NEW: First/Last handlers
  this._toolbar.addEventListener("navigate-first", () => this.goToFirst());
  this._toolbar.addEventListener("navigate-last", () => this.goToLast());
}
```

Add navigation methods:

```typescript
/**
 * Navigate to the first version (v0 - base text).
 */
public async goToFirst(): Promise<void> {
  await this.goToVersionIndex(0);
}

/**
 * Navigate to the last version.
 */
public async goToLast(): Promise<void> {
  if (!this._data || !this._data.steps) return;
  const lastIndex = this._data.steps.length;
  await this.goToVersionIndex(lastIndex);
}
```

#### 3. Add Keyboard Shortcuts

**File**: `src/core/gve-snapshot-rendition.ts`

Add keyboard listener in `connectedCallback()`:

```typescript
connectedCallback(): void {
  this.innerHTML = "";
  this.setAttribute("tabindex", "0"); // Make focusable for keyboard events

  // Add keyboard listener
  this.addEventListener("keydown", (e) => this.handleKeyDown(e));

  // ... existing code ...
}

private handleKeyDown(event: KeyboardEvent): void {
  // Prevent default for navigation keys
  switch (event.key) {
    case "ArrowLeft":
      event.preventDefault();
      this.goToPrevious();
      break;

    case "ArrowRight":
      event.preventDefault();
      this.goToNext();
      break;

    case "Home":
      event.preventDefault();
      this.goToFirst();
      break;

    case "End":
      event.preventDefault();
      this.goToLast();
      break;

    // Number keys 0-9 for quick jump
    case "0":
    case "1":
    case "2":
    case "3":
    case "4":
    case "5":
    case "6":
    case "7":
    case "8":
    case "9":
      event.preventDefault();
      const targetIndex = parseInt(event.key);
      if (this._data && targetIndex <= this._data.steps.length) {
        this.goToVersionIndex(targetIndex);
      }
      break;

    // Space for play/pause (future feature)
    case " ":
      event.preventDefault();
      // TODO: Toggle slideshow
      break;
  }
}
```

### Testing

1. Open component in browser
2. Verify First/Last buttons appear in toolbar
3. Click First button - should go to v0
4. Click Last button - should go to last version
5. Test keyboard shortcuts:
   - Press Left Arrow - previous version
   - Press Right Arrow - next version
   - Press Home - first version
   - Press End - last version
   - Press "2" - jump to v2
6. Verify buttons disable correctly at boundaries
7. Verify focus works (component accepts keyboard input)

### Success Criteria

- [ ] First button appears in toolbar
- [ ] Last button appears in toolbar
- [ ] First button navigates to v0
- [ ] Last button navigates to last version
- [ ] Buttons disable at appropriate boundaries
- [ ] Arrow keys navigate prev/next
- [ ] Home key goes to first
- [ ] End key goes to last
- [ ] Number keys 0-9 jump to specific version
- [ ] Component is focusable for keyboard events
- [ ] Keyboard shortcuts don't interfere with page scroll
}

private dispatchZoomEvent(action: "in" | "out" | "reset"): void {
  this._container.dispatchEvent(
    new CustomEvent("zoom", {
      detail: { action },
      bubbles: true,
    })
  );
}
```

#### 3. Wire Up Zoom Events
**File**: `src/core/gve-snapshot-rendition.ts`

In `processData()` where toolbar is initialized:

```typescript
// Listen for zoom events
toolbarContainer.addEventListener("zoom", (e: Event) => {
  const customEvent = e as CustomEvent;
  this.handleZoom(customEvent.detail.action);
});
```

Add zoom handler:

```typescript
private handleZoom(action: "in" | "out" | "reset"): void {
  if (!this._panZoomInstance) return;

  switch (action) {
    case "in":
      this._panZoomInstance.zoomIn();
      break;
    case "out":
      this._panZoomInstance.zoomOut();
      break;
    case "reset":
      this._panZoomInstance.resetZoom();
      this._panZoomInstance.center();
      break;
  }
}
```

#### 4. Handle Navigation with Pan/Zoom
**Important**: When navigating between versions, you may want to reset zoom or keep current view. Design decision needed.

Option A - Reset on navigation:
```typescript
private async goToVersionIndex(targetIndex: number): Promise<void> {
  // ... existing code ...

  // Reset zoom after navigation
  if (this._panZoomInstance) {
    this._panZoomInstance.reset();
  }
}
```

Option B - Preserve zoom:
```typescript
// Do nothing - pan/zoom state persists
```

### Testing
1. Load component
2. Try zooming in/out with mouse wheel
3. Try panning by dragging
4. Click zoom toolbar buttons
5. Verify zoom limits (minZoom/maxZoom)
6. Navigate between versions
7. Verify zoom behavior is as expected

### Success Criteria
- [ ] svg-pan-zoom installed and imported
- [ ] Pan/zoom initializes correctly
- [ ] Mouse wheel zooms
- [ ] Drag pans
- [ ] Toolbar zoom buttons work
- [ ] Zoom limits enforced
- [ ] Clean up on component disconnect

### Known Issues to Watch
- Pan/zoom may interfere with element selection
- Coordinate transforms need accounting in hit testing
- Performance may degrade with many elements

---

## 🎯 Priority 3: Add First/Last/Jump Navigation (1 hour)

### Goal
Complete the toolbar with first/last buttons and ability to jump to specific version.

### Implementation Plan

#### 1. Update Toolbar
Already have buttons in HTML (see Priority 2), just need handlers:

```typescript
private attachEventListeners(): void {
  const firstBtn = this._container.querySelector("#first-btn");
  const lastBtn = this._container.querySelector("#last-btn");

  firstBtn?.addEventListener("click", () => this.navigateToFirst());
  lastBtn?.addEventListener("click", () => this.navigateToLast());
}

private navigateToFirst(): void {
  this.dispatchNavigateEvent(0);
}

private navigateToLast(): void {
  if (this._totalVersions > 0) {
    this.dispatchNavigateEvent(this._totalVersions - 1);
  }
}
```

#### 2. Add Keyboard Shortcuts
**File**: `src/core/gve-snapshot-rendition.ts`

```typescript
public connectedCallback(): void {
  this._logger.info("Component connected to DOM");
  this.render();
  this.initializeGsap();
  this.attachKeyboardListeners();
}

private attachKeyboardListeners(): void {
  this.addEventListener("keydown", (e: KeyboardEvent) => {
    if (!this._data || !this._data.steps) return;

    switch (e.key) {
      case "ArrowLeft":
        if (this._currentVersionIndex > 0) {
          this.goToVersionIndex(this._currentVersionIndex - 1);
        }
        break;
      case "ArrowRight":
        if (this._currentVersionIndex < this._data.steps.length) {
          this.goToVersionIndex(this._currentVersionIndex + 1);
        }
        break;
      case "Home":
        this.goToVersionIndex(0);
        break;
      case "End":
        this.goToVersionIndex(this._data.steps.length);
        break;
      case "0":
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
        const targetIndex = parseInt(e.key);
        if (targetIndex <= this._data.steps.length) {
          this.goToVersionIndex(targetIndex);
        }
        break;
    }
  });
}
```

### Success Criteria
- [ ] First button jumps to v0
- [ ] Last button jumps to last version
- [ ] Arrow keys navigate
- [ ] Home/End keys work
- [ ] Number keys jump to versions
- [ ] Buttons disable appropriately

---

## 📚 Reference Files

### Read These Before Starting

1. **SESSION_6_SUMMARY.md** - What was just done
2. **IMPLEMENTATION_STATUS.md** - Current status (85% complete!)
3. **docs/rendition.md** - Main reference guide
4. **docs/snapshot.md** - Trace features (lines 124-247)

### Key Patterns to Follow

1. **Track metadata** for reversible operations
2. **Async/await** for all animations
3. **GSAP promises** for animation coordination
4. **Logger.time/timeEnd** for performance tracking
5. **Clean up resources** in disconnectedCallback

---

## 🐛 Common Issues to Avoid

1. **Don't forget to pass versionIndex** - Spreading needs to know which version
2. **Clean up pan/zoom** - Call destroy() in disconnectedCallback
3. **Account for transforms** - Pan/zoom affects coordinate math
4. **Test keyboard shortcuts** - Make sure component has focus
5. **Handle edge cases** - Empty data, single version, etc.

---

## 📊 Progress Tracking

Update these files after session:

1. **SESSION_PROGRESS.md** - Add Session 7 entry
2. **SESSION_7_SUMMARY.md** - Create summary
3. **NEXT_SESSION.md** - Update for Session 8
4. **IMPLEMENTATION_STATUS.md** - Update percentages (expect ~90%)

---

## ⏱️ Time Estimates

| Task | Estimated Time |
|------|----------------|
| Backward spreading reversal | 1-2h |
| svg-pan-zoom integration | 2-3h |
| First/Last/Keyboard nav | 1h |
| **Total Session 7** | **4-6h** |

---

## 🎉 What You'll Have After This Session

After completing these priorities:
- ✅ Fully reversible navigation (including spreading)
- ✅ Pan and zoom capabilities
- ✅ Complete navigation controls
- ✅ Keyboard shortcuts
- ✅ **90% complete component!**

---

## 💡 Hints for Success

1. **Start with spreading reversal** - It's the TODO in code
2. **Test spreading before reversing** - Make sure forward works first
3. **svg-pan-zoom is critical** - Affects all coordinate math
4. **Design decision needed** - Should zoom reset on navigation?
5. **Test in browser frequently** - Verify each piece works
6. **Log everything** - Use logger.debug for debugging

---

## 🚀 Stretch Goals (If Time Permits)

If you finish early:

1. **Versions list UI** - Sidebar with all versions
2. **Details panel** - Operation metadata display
3. **Version text area** - Plain text view
4. **Download SVG** - Export current state

---

**Ready to complete the navigation system! Let's go! 🚀**

*Total project: 85% complete, ~4-6 hours to 90%, ~10-14 hours to polish*
