# Next Session Guide - Session 6

## 📍 Current Status

**Progress: 80% Complete - INTERACTIVE UI WORKING! 🎉**

**Just Completed (Session 5):**
- ✅ Toolbar component fully implemented (src/ui/toolbar.ts)
- ✅ Previous/Next navigation buttons
- ✅ Version label display (v0, v1, etc.)
- ✅ Button state management (disable at boundaries)
- ✅ goToVersionIndex() method for navigation
- ✅ extractCharOffsets() helper
- ✅ Comprehensive toolbar CSS (~80 lines)
- ✅ Build successful, zero errors, zero warnings

**What's Complete:**
- ✅ All core utilities and infrastructure
- ✅ All rendering systems (TextRenderer, HintRenderer, BoundsCache, SpreadingEngine)
- ✅ Animation system (AnimationEngine, AnimationFactory)
- ✅ Feature resolution system
- ✅ Operation processing loop - ALL SYSTEMS WIRED TOGETHER
- ✅ **Interactive toolbar with navigation!**

**What's Next:**
- ⏳ Test with real data in browser
- ⏳ Versions list UI (sidebar with all versions)
- ⏳ Details panel UI (operation metadata)
- ⏳ Full UI layout integration

---

## 🎯 Priority 1: Test with Real Data (1-2 hours) - CRITICAL

### Goal
Verify that everything works end-to-end in the browser. This is the most important next step because it will reveal any integration issues and confirm the component is truly functional.

### What to Test

#### 1. **Basic Loading**
   - Open index.html in browser
   - Check browser console for errors
   - Verify component loads without crashes

#### 2. **Base Text Rendering**
   - Verify base text appears character by character
   - Check that animations play smoothly
   - Verify character positioning looks correct
   - Check for any missing characters

#### 3. **Toolbar UI**
   - Verify toolbar appears above SVG area
   - Check that Previous button is disabled at v0
   - Check that Next button is enabled
   - Verify version label shows "v0"

#### 4. **Navigation Forward**
   - Click Next button
   - Verify version label changes to "v1"
   - Verify Previous button becomes enabled
   - Check console for "Navigating to version index 1"
   - Check console for operation processing logs
   - Verify any hints render correctly
   - Verify any additional text renders correctly
   - Verify spreading animations play

#### 5. **Navigation Backward**
   - Click Previous button
   - Verify version label changes back to "v0"
   - Verify Previous button becomes disabled
   - Check that SVG clears and re-renders
   - Verify base text renders again

#### 6. **Navigation Through All Versions**
   - Click Next repeatedly until last version
   - Verify Next button disables at last version
   - Verify all operations process correctly
   - Check console for any errors or warnings
   - Verify no visual glitches

#### 7. **Console Verification**
   - Look for "GVE-Rendition component created"
   - Look for "Component connected to DOM"
   - Look for "GSAP initialized"
   - Look for "Processing X operations"
   - Look for "Navigating to version index X"
   - Check for any errors (red text)
   - Check for any warnings (yellow text)

### Issues to Watch For

- **Missing GSAP:** Component will log warning if GSAP not loaded
- **Data not loading:** Check that consumer.js sets data correctly
- **Hints not configured:** Check that settings.hints has required hint definitions
- **Spreading not working:** Check that solid flags are set correctly
- **Animations janky:** May need to adjust animation durations
- **Layout issues:** Check that flexbox layout works in different browsers
- **Button state bugs:** Verify buttons enable/disable at correct times

### Success Criteria

- [ ] Component loads without errors
- [ ] Base text renders with animations
- [ ] Toolbar appears correctly
- [ ] Clicking Next processes operations
- [ ] Clicking Previous navigates back
- [ ] Version label updates correctly
- [ ] Buttons disable at boundaries
- [ ] All operations process without errors
- [ ] Hints appear where expected
- [ ] Additional text appears where expected
- [ ] Spreading animations play smoothly
- [ ] No console errors
- [ ] No visual glitches

### Debug Tips

If something doesn't work:

1. **Open browser DevTools** (F12)
2. **Check Console tab** for errors/logs
3. **Check Elements tab** to inspect shadow DOM
4. **Check Network tab** to verify files loaded
5. **Add breakpoints** in browser DevTools Sources tab
6. **Check settings.debug = true** for verbose logging
7. **Verify data.json** structure matches expected format

---

## 🎯 Priority 2: Versions List UI (3-4 hours)

### Goal
Add a sidebar showing all versions in the document, allowing users to see at a glance what versions exist and jump directly to any version.

### File to Create
**`src/ui/versions-list.ts`** (new file, ~200 lines)

### Implementation Plan

```typescript
export interface VersionInfo {
  index: number;
  tag: string;
  color: string;
  isStaged: boolean;
  operationType?: string;
}

export class VersionsList {
  private container: HTMLElement;
  private versions: VersionInfo[] = [];
  private currentIndex: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="versions-list">
        <div class="versions-header">Versions</div>
        <div class="versions-items" id="versions-items"></div>
      </div>
    `;
    this.updateList();
  }

  private updateList(): void {
    const itemsContainer = this.container.querySelector("#versions-items");
    if (!itemsContainer) return;

    itemsContainer.innerHTML = this.versions
      .map((version, idx) => {
        const isActive = idx === this.currentIndex;
        const classes = [
          "version-item",
          isActive ? "active" : "",
          version.isStaged ? "staged" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return `
          <div
            class="${classes}"
            data-index="${idx}"
            style="border-left: 4px solid ${version.color}"
          >
            <span class="version-tag">${version.tag}</span>
            ${version.operationType ? `<span class="version-type">${version.operationType}</span>` : ""}
          </div>
        `;
      })
      .join("");

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    const items = this.container.querySelectorAll(".version-item");
    items.forEach((item) => {
      item.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        const index = parseInt(target.dataset.index || "0", 10);
        this.selectVersion(index);
      });
    });
  }

  private selectVersion(index: number): void {
    this.currentIndex = index;
    this.updateList();
    this.dispatchSelectionEvent(index);
  }

  private dispatchSelectionEvent(index: number): void {
    this.container.dispatchEvent(
      new CustomEvent("versionSelect", {
        detail: { index },
        bubbles: true,
      })
    );
  }

  setVersions(versions: VersionInfo[]): void {
    this.versions = versions;
    this.updateList();
  }

  setCurrentIndex(index: number): void {
    this.currentIndex = index;
    this.updateList();
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }
}
```

### CSS Styling

Add to `getStyles()` in gve-snapshot-rendition.ts:

```css
.versions-list {
  width: 200px;
  height: 100%;
  border-right: 1px solid var(--gve-border-color, #ddd);
  background: var(--gve-sidebar-bg, #fafafa);
  overflow-y: auto;
  flex-shrink: 0;
}

.versions-header {
  padding: 0.75rem 1rem;
  font-weight: bold;
  font-size: 14px;
  border-bottom: 1px solid var(--gve-border-color, #ddd);
  background: var(--gve-toolbar-bg, #f5f5f5);
}

.versions-items {
  display: flex;
  flex-direction: column;
}

.version-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid #eee;
  transition: background 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.version-item:hover {
  background: var(--gve-item-hover, #f0f0f0);
}

.version-item.active {
  background: var(--gve-item-active, #e3f2fd);
  font-weight: bold;
}

.version-item.staged {
  border-left-width: 6px !important;
}

.version-tag {
  font-family: monospace;
  font-size: 13px;
}

.version-type {
  font-size: 11px;
  color: #666;
  font-style: italic;
}
```

### Integration with Main Component

In `gve-snapshot-rendition.ts`:

1. **Update layout structure** to use horizontal flexbox
2. **Add versions list container** to the left
3. **Initialize VersionsList** with version data
4. **Listen for "versionSelect" events** and call goToVersionIndex()
5. **Update versions list** when toolbar changes version

```typescript
import { VersionsList, VersionInfo } from "../ui/versions-list";

// Add property
private versionsList?: VersionsList;

// Update render() layout
private render(): void {
  this.shadow.innerHTML = "";

  const style = document.createElement("style");
  style.textContent = this.getStyles();
  this.shadow.appendChild(style);

  this.container = document.createElement("div");
  this.container.className = "gve-container";

  // Create main layout: versions list + content area
  const mainLayout = document.createElement("div");
  mainLayout.className = "gve-main-layout";

  // Versions list container (left side)
  const versionsContainer = document.createElement("div");
  versionsContainer.id = "versions-container";
  mainLayout.appendChild(versionsContainer);

  // Content area (right side)
  const contentArea = document.createElement("div");
  contentArea.className = "gve-content-area";

  // Toolbar
  const toolbarContainer = document.createElement("div");
  toolbarContainer.id = "toolbar-container";
  contentArea.appendChild(toolbarContainer);

  // SVG
  this.rootSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  this.rootSvg.setAttribute("class", "gve-text-rendition");
  this.rootSvg.setAttribute("width", "100%");
  this.rootSvg.setAttribute("height", "600px");
  contentArea.appendChild(this.rootSvg);

  mainLayout.appendChild(contentArea);
  this.container.appendChild(mainLayout);
  this.shadow.appendChild(this.container);

  // Initialize UI components if data available
  if (this._data && this._data.steps) {
    // Initialize toolbar
    this.toolbar = new Toolbar(toolbarContainer);
    this.toolbar.setTotalVersions(this._data.steps.length);
    toolbarContainer.addEventListener("navigate", (e: Event) => {
      const customEvent = e as CustomEvent;
      this.goToVersionIndex(customEvent.detail.index);
    });

    // Initialize versions list
    const versions = this.buildVersionsInfo();
    this.versionsList = new VersionsList(versionsContainer);
    this.versionsList.setVersions(versions);
    versionsContainer.addEventListener("versionSelect", (e: Event) => {
      const customEvent = e as CustomEvent;
      this.goToVersionIndex(customEvent.detail.index);
    });
  }
}

// Build version info array
private buildVersionsInfo(): VersionInfo[] {
  if (!this._data || !this._data.steps) return [];

  const versions: VersionInfo[] = [
    {
      index: 0,
      tag: "v0",
      color: "#888",
      isStaged: false,
    },
  ];

  this._data.steps.forEach((step, idx) => {
    const operation = step.operation;
    versions.push({
      index: idx + 1,
      tag: operation.outputTag || `v${operation.run}`,
      color: this.versionPalette.get(operation.outputTag || `v${operation.run}`) || "#888",
      isStaged: operation.stage === true,
      operationType: this.getOperationTypeName(operation.type),
    });
  });

  return versions;
}

// Get operation type name
private getOperationTypeName(type: number): string {
  const types: Record<number, string> = {
    1: "delete",
    2: "insert",
    3: "replace",
    4: "swap",
    5: "move",
    6: "copy",
    7: "annotate",
  };
  return types[type] || `op${type}`;
}

// Update goToVersionIndex to sync both toolbar and versions list
private async goToVersionIndex(targetIndex: number): Promise<void> {
  if (!this._data || !this.textRenderer || !this.rootSvg) return;

  this.logger.info(`Navigating to version index ${targetIndex}`);

  // ... existing clear and render logic ...

  // Update UI components
  if (this.toolbar) {
    this.toolbar.setCurrentIndex(targetIndex);
  }
  if (this.versionsList) {
    this.versionsList.setCurrentIndex(targetIndex);
  }
}
```

### CSS Layout Update

```css
.gve-main-layout {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
}

.gve-content-area {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}
```

### Success Criteria

- [ ] Versions list appears on left side
- [ ] All versions listed (v0, v1, v2, ...)
- [ ] Each version shows color from palette
- [ ] Current version highlighted
- [ ] Staged versions have thicker left border
- [ ] Clicking version navigates to it
- [ ] List scrolls if many versions
- [ ] CSS styling looks clean
- [ ] Integration with toolbar works

---

## 🎯 Priority 3: Details Panel (2-3 hours)

### Goal
Display operation metadata and features in a panel below the SVG area.

### File to Create
**`src/ui/details-panel.ts`** (new file, ~150 lines)

### Implementation Plan

Show:
- Current operation ID
- Operation type
- Input/output tags
- Global features
- Position (at, from, to)
- Collapsible sections

---

## 📚 Reference Files

### Read These Before Starting

1. **SESSION_5_SUMMARY.md** - What was just done
2. **SESSION_PROGRESS.md** - Overall status (80% complete!)
3. **IMPLEMENTATION_STATUS.md** - Updated file structure
4. **docs/rendition.md** - UI components section

### Key Patterns to Follow

1. **Async/await** for all rendering operations
2. **Logger.time/timeEnd** for performance tracking
3. **Event dispatching** for state changes
4. **Clear separation** - UI in src/ui/, core logic in src/core/
5. **CustomEvents with bubbles: true** for communication
6. **Flexbox layouts** for responsive design

---

## 🐛 Common Issues to Avoid

1. **Test first!** - Don't add more UI until you've verified existing code works
2. **Check data structure** - Verify data.json matches expected format
3. **Verify GSAP loaded** - Component needs GSAP from CDN
4. **Handle edge cases** - Empty data, no operations, etc.
5. **Sync UI state** - Update all UI components when version changes
6. **Clear console** - Check for errors after each test

---

## 📝 Testing Checklist

### After Browser Testing

1. **Loading**
   - [ ] No console errors on load
   - [ ] Component appears in DOM
   - [ ] GSAP initialized

2. **Rendering**
   - [ ] Base text appears
   - [ ] Animations play smoothly
   - [ ] No missing characters

3. **Toolbar**
   - [ ] Toolbar visible
   - [ ] Buttons styled correctly
   - [ ] Version label shows v0

4. **Navigation**
   - [ ] Next button works
   - [ ] Previous button works
   - [ ] Version label updates
   - [ ] Buttons disable correctly

5. **Operations**
   - [ ] Operations process in order
   - [ ] Hints render correctly
   - [ ] Additional text renders
   - [ ] Spreading works

---

## ⏱️ Time Estimates

| Task | Estimated Time |
|------|----------------|
| Test with real data | 1-2h |
| Versions list UI | 3-4h |
| Details panel UI | 2-3h |
| **Total to Full UI** | **6-9h** |

---

## 🎉 What You'll Have After This Session

After completing these priorities:
- ✅ Verified component works in browser
- ✅ Users can see all versions in sidebar
- ✅ Users can click to jump to any version
- ✅ Operation details displayed
- ✅ **FULLY INTERACTIVE COMPONENT!** Ready for production

**That's a production-ready text transformation viewer!** 🚀

---

## 📊 Progress Tracking

Update these files after session:

1. **SESSION_PROGRESS.md** - Add Session 6 entry
2. **SESSION_6_SUMMARY.md** - Create summary
3. **NEXT_SESSION.md** - Update for Session 7
4. **IMPLEMENTATION_STATUS.md** - Update percentages (expect ~90%)

---

## 💡 Hints for Success

1. **Test in browser FIRST** - This is critical before adding more UI
2. **Use Chrome DevTools** - Console, Elements, Network tabs are your friends
3. **Start simple** - Get basic versions list working before fancy features
4. **Keep state in sync** - All UI components should reflect current version
5. **Log navigation events** - Use logger.debug for debugging
6. **Handle empty data** - Component should degrade gracefully

---

## 🚀 Stretch Goals (If Time Permits)

If you finish early and have extra time:

1. **Search in versions list** - Filter versions by tag or type
2. **Version tooltips** - Show more info on hover
3. **Keyboard shortcuts** - Numbers to jump to versions
4. **Collapse versions list** - Toggle button to hide/show
5. **Export current SVG** - Download button

---

**Ready to see the component in action! Let's test it! 🧪**

*Total project: 80% complete, ~6-9 hours to full UI, ~14-18 hours to polish*
