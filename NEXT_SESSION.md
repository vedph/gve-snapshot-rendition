# Next Session Guide - Session 5

## 📍 Current Status

**Progress: 75% Complete - MVP ACHIEVED! 🎉**

**Just Completed (Session 4):**
- ✅ Operation processing loop fully implemented
- ✅ processOperations() and processOperation() methods
- ✅ Helper methods (getReferenceNodes, getAddedNodes, renderHints)
- ✅ HintRenderer integrated
- ✅ TextRenderer.renderAdditionalText() integrated
- ✅ Event system (versionTagChanging, versionTagChange)
- ✅ State management (currentVersion)
- ✅ Build successful, zero errors

**What's Complete (MVP):**
- ✅ All core utilities and infrastructure
- ✅ All rendering systems (TextRenderer, HintRenderer, BoundsCache, SpreadingEngine)
- ✅ Animation system (AnimationEngine, AnimationFactory)
- ✅ Feature resolution system
- ✅ **Operation processing loop - ALL SYSTEMS WIRED TOGETHER!**

**What's Next:**
- ⏳ Test with real data
- ⏳ Basic UI (toolbar with prev/next buttons)
- ⏳ Version navigation controls
- ⏳ Full UI (versions list, details panel)

---

## 🎯 Priority 1: Test with Real Data (1-2 hours)

### Goal
Verify that the MVP works end-to-end with actual sample data. This will reveal any integration issues before building UI.

### What to Test

1. **Load and Render**
   - Open index.html in browser
   - Verify base text renders with animations
   - Check console for processing logs

2. **Operations Processing**
   - Verify all operations process in order
   - Check that hints render correctly
   - Check that additional text renders correctly
   - Verify spreading animations work

3. **Console Verification**
   - Look for "Processing X operations"
   - Look for "Processing operation {id}"
   - Check for any errors or warnings

4. **Visual Inspection**
   - Base text should appear character by character
   - Hints should appear for operations with r_hints
   - Additional text should appear for insert/replace operations
   - Spreading should shift elements smoothly

### Issues to Watch For

- Missing reference nodes (check getReferenceNodes logic)
- opid feature not matching (check getAddedNodes logic)
- Hints not appearing (check settings.hints map)
- Spreading not working (check solid flags)
- Events not firing (check dispatchEvent calls)

### Success Criteria

- [ ] Base text renders correctly
- [ ] All operations process without errors
- [ ] Hints appear for operations with r_hints
- [ ] Additional text appears for insert/replace ops
- [ ] Spreading animations play smoothly
- [ ] Events fire (check with addEventListener)
- [ ] No errors in console

---

## 🎯 Priority 2: Basic Toolbar (2-3 hours)

### Goal
Add simple navigation controls so users can step through versions manually.

### File to Create
**`src/ui/toolbar.ts`** (new file, ~150 lines)

### Implementation Plan

```typescript
export class Toolbar {
  private container: HTMLElement;
  private prevBtn: HTMLButtonElement;
  private nextBtn: HTMLButtonElement;
  private versionLabel: HTMLSpanElement;
  private currentIndex: number = 0;
  private totalVersions: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="toolbar">
        <button id="prev-btn" class="toolbar-btn" title="Previous Version">
          ← Previous
        </button>
        <span id="version-label" class="version-label">v0</span>
        <button id="next-btn" class="toolbar-btn" title="Next Version">
          Next →
        </button>
      </div>
    `;

    this.prevBtn = this.container.querySelector("#prev-btn")!;
    this.nextBtn = this.container.querySelector("#next-btn")!;
    this.versionLabel = this.container.querySelector("#version-label")!;

    this.attachEventListeners();
    this.updateButtons();
  }

  private attachEventListeners(): void {
    this.prevBtn.addEventListener("click", () => this.goPrevious());
    this.nextBtn.addEventListener("click", () => this.goNext());
  }

  private goPrevious(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateButtons();
      this.dispatchNavigationEvent();
    }
  }

  private goNext(): void {
    if (this.currentIndex < this.totalVersions) {
      this.currentIndex++;
      this.updateButtons();
      this.dispatchNavigationEvent();
    }
  }

  private updateButtons(): void {
    this.prevBtn.disabled = this.currentIndex === 0;
    this.nextBtn.disabled = this.currentIndex === this.totalVersions;
    this.versionLabel.textContent = `v${this.currentIndex}`;
  }

  private dispatchNavigationEvent(): void {
    this.container.dispatchEvent(
      new CustomEvent("navigate", {
        detail: { index: this.currentIndex },
        bubbles: true,
      })
    );
  }

  setTotalVersions(total: number): void {
    this.totalVersions = total;
    this.updateButtons();
  }

  setCurrentIndex(index: number): void {
    this.currentIndex = index;
    this.updateButtons();
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }
}
```

### CSS Styling

Add to `getStyles()` in gve-snapshot-rendition.ts:

```css
.toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background: var(--gve-toolbar-bg, #f5f5f5);
  border-bottom: 1px solid var(--gve-border-color, #ddd);
}

.toolbar-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  font-family: inherit;
}

.toolbar-btn:hover:not(:disabled) {
  background: #e9e9e9;
  border-color: #999;
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f5f5f5;
}

.version-label {
  font-family: monospace;
  font-size: 16px;
  font-weight: bold;
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  min-width: 60px;
  text-align: center;
}
```

### Integration with Main Component

In `gve-snapshot-rendition.ts`:

```typescript
import { Toolbar } from "../ui/toolbar";

// Add property
private toolbar?: Toolbar;

// Update render() to include toolbar container
private render(): void {
  this.shadow.innerHTML = "";

  const style = document.createElement("style");
  style.textContent = this.getStyles();
  this.shadow.appendChild(style);

  this.container = document.createElement("div");
  this.container.className = "gve-container";

  // Add toolbar container
  const toolbarContainer = document.createElement("div");
  toolbarContainer.id = "toolbar-container";
  this.container.appendChild(toolbarContainer);

  // Create SVG root
  this.rootSvg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  this.rootSvg.setAttribute("class", "gve-text-rendition");
  this.rootSvg.setAttribute("width", "100%");
  this.rootSvg.setAttribute("height", "600px");

  this.container.appendChild(this.rootSvg);
  this.shadow.appendChild(this.container);

  // Initialize toolbar after data is loaded
  if (this._data && this._data.steps) {
    this.toolbar = new Toolbar(toolbarContainer);
    this.toolbar.setTotalVersions(this._data.steps.length);

    // Listen for navigation events
    toolbarContainer.addEventListener("navigate", (e: Event) => {
      const customEvent = e as CustomEvent;
      this.goToVersionIndex(customEvent.detail.index);
    });
  }
}
```

### Success Criteria

- [ ] Toolbar renders above SVG area
- [ ] Previous/Next buttons work
- [ ] Version label updates on navigation
- [ ] Buttons disable at boundaries (v0 and last version)
- [ ] Clicking triggers navigation event
- [ ] CSS styling looks clean

---

## 🎯 Priority 3: Version Navigation (2-3 hours)

### Goal
Implement the ability to jump to any version, not just render all at once.

### Challenge
Currently, `renderContent()` processes ALL operations. We need to:
1. Track which version is displayed
2. Re-render from v0 up to target version
3. OR: Implement incremental forward/backward navigation

### Option A: Full Re-render (Simpler)

```typescript
/**
 * Navigate to a specific version index (0 = base text, 1+ = after operations).
 */
private async goToVersionIndex(targetIndex: number): Promise<void> {
  if (!this._data || !this.textRenderer || !this.rootSvg) return;

  this.logger.info(`Navigating to version index ${targetIndex}`);

  // Clear and reset
  this.rootSvg.innerHTML = "";
  this.boundsCache.clear();
  this.currentVersion = "v0";

  // Render base text
  const charOffsets = this.extractCharOffsets();
  await this.textRenderer.renderBaseText(
    this.baseNodes,
    this.rootSvg,
    charOffsets
  );

  // Process operations up to target index
  if (targetIndex > 0 && this._data.steps) {
    for (let i = 0; i < targetIndex && i < this._data.steps.length; i++) {
      await this.processOperation(this._data.steps[i]);
    }
  }

  // Update toolbar
  if (this.toolbar) {
    this.toolbar.setCurrentIndex(targetIndex);
  }
}

private extractCharOffsets(): Map<number, { x?: number; y?: number }> | undefined {
  if (this._data && this._data.steps.length > 0) {
    const firstOp = this._data.steps[0].operation;
    if (firstOp.type === 7) {
      return this.featureResolver.extractCharOffsets(firstOp.features);
    }
  }
  return undefined;
}
```

### Option B: Incremental (More Complex, Better Performance)

Track rendered operations and only add/remove deltas. More complex but better for large documents.

**Recommendation:** Start with Option A (full re-render). It's simpler and performance is likely fine for typical use cases.

### Success Criteria

- [ ] Clicking Next renders one more operation
- [ ] Clicking Previous goes back one operation
- [ ] Can jump to any version
- [ ] State stays consistent
- [ ] Animations play smoothly

---

## 📚 Reference Files

### Read These Before Starting

1. **SESSION_4_SUMMARY.md** - What was just done
2. **SESSION_PROGRESS.md** - Overall status (75% complete, MVP done!)
3. **IMPLEMENTATION_STATUS.md** - Updated file structure
4. **docs/rendition.md** - UI components section

### Key Patterns to Follow

1. **Async/await** for all rendering operations
2. **Logger.time/timeEnd** for performance tracking
3. **Event dispatching** for state changes
4. **Clear separation** - UI in src/ui/, core logic in src/core/

---

## 🐛 Common Issues to Avoid

1. **Don't forget toolbar container** - Add to DOM before creating Toolbar
2. **Check data is loaded** - Toolbar needs this._data.steps.length
3. **Update toolbar on navigation** - Call setCurrentIndex()
4. **Clear state on navigation** - innerHTML = "", boundsCache.clear()
5. **Handle edge cases** - v0 (no operations), last version

---

## 📝 Testing Checklist

### After Toolbar Implementation

1. **Visual Check**
   - [ ] Toolbar appears above SVG
   - [ ] Buttons are styled consistently
   - [ ] Version label is readable

2. **Functionality Check**
   - [ ] Next button increments version
   - [ ] Previous button decrements version
   - [ ] Buttons disable at boundaries
   - [ ] Version label updates

3. **Integration Check**
   - [ ] Navigation triggers re-render
   - [ ] Operations process correctly
   - [ ] State stays consistent
   - [ ] No console errors

---

## ⏱️ Time Estimates

| Task | Estimated Time |
|------|----------------|
| Test with real data | 1-2h |
| Basic toolbar | 2-3h |
| Version navigation | 2-3h |
| **Total to Usable UI** | **5-8h** |

---

## 🎉 What You'll Have After This Session

After completing these priorities:
- ✅ Verified MVP works with real data
- ✅ User can step through versions with buttons
- ✅ Clear visual feedback of current version
- ✅ Smooth animations between versions
- ✅ **USABLE COMPONENT!** Ready for demo

**That's a fully interactive text transformation viewer!** 🚀

The remaining work (versions list, details panel, etc.) is all "nice to have" UI enhancements.

---

## 📊 Progress Tracking

Update these files after session:

1. **SESSION_PROGRESS.md** - Add Session 5 entry
2. **SESSION_5_SUMMARY.md** - Create summary
3. **NEXT_SESSION.md** - Update for Session 6
4. **IMPLEMENTATION_STATUS.md** - Update percentages (expect ~85%)

---

## 💡 Hints for Success

1. **Start with testing** - Verify MVP works before adding UI
2. **Keep toolbar simple** - Just prev/next/label for now
3. **Use full re-render** - Simpler than incremental updates
4. **Test at boundaries** - v0 and last version are edge cases
5. **Log everything** - Use logger.debug for navigation events

---

## 🚀 Stretch Goals (If Time Permits)

If you finish early and have extra time:

1. **First/Last buttons** - Jump to start/end
2. **Version tooltip** - Show operation type on hover
3. **Keyboard shortcuts** - Arrow keys for navigation
4. **Animation speed control** - Slider to adjust animation time

---

**Ready to make the component interactive! Let's add that UI! 🎨**

*Total project: 75% complete, MVP achieved, ~10-14 hours to full UI*
