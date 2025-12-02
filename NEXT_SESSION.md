# Next Session Guide - Session 4

## 📍 Current Status

**Progress: 65% Complete**

**Just Completed (Session 3):**
- ✅ TextRenderer.renderAdditionalText() fully implemented
- ✅ RBR calculation with displaced span support
- ✅ All 9 position types (n, ne, e, se, s, sw, w, nw, o)
- ✅ Border drawing (r_border) with all edges and line styles
- ✅ Spreading integration for additional text
- ✅ Character rendering with animations
- ✅ Build successful, zero errors

**What's Complete:**
- ✅ All core utilities and infrastructure
- ✅ All rendering systems (TextRenderer, HintRenderer, BoundsCache, SpreadingEngine)
- ✅ Animation system (AnimationEngine, AnimationFactory)
- ✅ Feature resolution system
- ✅ Web component skeleton

**What's Next:**
- ⏳ Operation processing loop
- ⏳ Basic UI (toolbar, version list)
- ⏳ Navigation and events

---

## 🎯 Priority 1: Operation Processing Loop (2 hours)

### Goal
Wire up all the rendering systems by implementing the operation processing loop. This will bring the component to life and enable full text transformation visualization.

### File to Modify
**`src/core/gve-snapshot-rendition.ts`**

### What Changed Last Session
- Nothing in this file except adding SpreadingEngine parameter to TextRenderer
- Ready for operation processing implementation

### Implementation Plan

#### Step 1: Create processOperations() Method

```typescript
/**
 * Process operations to render text transformations.
 * Processes operations in order, rendering hints and additional text.
 */
private async processOperations(): Promise<void> {
  if (!this._data || !this._data.steps) {
    this.logger.warn("No operations to process");
    return;
  }

  this.logger.time("processOperations");
  this.logger.info(`Processing ${this._data.steps.length} operations`);

  for (const step of this._data.steps) {
    await this.processOperation(step);
  }

  this.logger.timeEnd("processOperations");
}
```

#### Step 2: Implement processOperation() for Single Operation

```typescript
/**
 * Process a single operation step.
 */
private async processOperation(step: OperationStep): Promise<void> {
  this.logger.debug("Processing operation", { id: step.id, type: step.type });

  // Fire versionTagChanging event
  const versionTag = `v${step.index}`;
  this.dispatchEvent(
    new CustomEvent("versionTagChanging", {
      detail: { from: this._currentVersion, to: versionTag },
    })
  );

  // 1. Get reference nodes (nodes affected by this operation)
  const refNodes = this.getReferenceNodes(step.refNodeIds);
  if (refNodes.length === 0) {
    this.logger.warn(`No reference nodes found for operation ${step.id}`);
    return;
  }

  // 2. Resolve features to config
  const config = this.featureResolver.resolve(
    this._settings,
    step.features,
    undefined // textBounds - calculate if needed
  );

  // 3. Render hints if specified
  if (config.hints && config.hints.length > 0) {
    await this.renderHints(
      config.hints,
      refNodes,
      config.hintVars || new Map(),
      step.id
    );
  }

  // 4. Render additional text if this operation added nodes
  const addedNodes = this.getAddedNodes(step.id);
  if (addedNodes.length > 0) {
    await this.textRenderer.renderAdditionalText(
      addedNodes,
      this.textSvg,
      config,
      versionTag,
      refNodes,
      this._data.text as CharNode[] // all base nodes
    );
  }

  // Update current version
  this._currentVersion = versionTag;

  // Fire versionTagChange event
  this.dispatchEvent(
    new CustomEvent("versionTagChange", {
      detail: { from: `v${step.index - 1}`, to: versionTag },
    })
  );
}
```

#### Step 3: Helper Methods

```typescript
/**
 * Get reference nodes by IDs.
 */
private getReferenceNodes(nodeIds: number[]): CharNode[] {
  if (!this._data || !this._data.text) return [];

  const nodes = this._data.text as CharNode[];
  return nodeIds
    .map((id) => nodes.find((n) => n.id === id))
    .filter((n) => n !== undefined) as CharNode[];
}

/**
 * Get nodes added by a specific operation.
 * These are nodes with opid feature matching the operation ID.
 */
private getAddedNodes(operationId: string): CharNode[] {
  if (!this._data || !this._data.text) return [];

  const nodes = this._data.text as CharNode[];
  return nodes.filter((node) => {
    const opidFeature = node.features?.find((f) => f.name === "opid");
    return opidFeature && opidFeature.value === operationId;
  });
}

/**
 * Render hints for an operation.
 */
private async renderHints(
  hintIds: string[],
  refNodes: CharNode[],
  hintVars: Map<string, string>,
  operationId: string
): Promise<void> {
  for (let i = 0; i < hintIds.length; i++) {
    const hintId = hintIds[i];
    const hint = this._settings.hints[hintId];

    if (!hint) {
      this.logger.warn(`Hint not found: ${hintId}`);
      continue;
    }

    await this.hintRenderer.renderHint(
      hintId,
      hint,
      refNodes,
      this.textSvg,
      hintVars,
      operationId,
      i + 1, // ordinal (1-based)
      this._data.text as CharNode[]
    );
  }
}
```

#### Step 4: Call from renderContent()

Update the `renderContent()` method to call `processOperations()`:

```typescript
private async renderContent(): Promise<void> {
  if (!this._data || !this._data.text) return;

  this.logger.time("renderContent");

  // Clear existing content
  this.textSvg.innerHTML = "";

  // Render base text
  const nodes = this._data.text as CharNode[];
  await this.textRenderer.renderBaseText(nodes, this.textSvg);

  // Process operations
  if (this._data.steps && this._data.steps.length > 0) {
    await this.processOperations();
  }

  this.logger.timeEnd("renderContent");
}
```

### Testing Checklist

After implementation:

1. **Build Check**
   ```bash
   pnpm build
   ```
   Should compile without errors

2. **Manual Test** (needs sample data)
   - Load component with test data
   - Verify base text renders
   - Verify operations process in order
   - Check console for operation logs
   - Verify hints appear
   - Verify additional text renders
   - Check spreading animations

3. **Event Test**
   - Listen for versionTagChanging
   - Listen for versionTagChange
   - Verify events fire in correct order

### Success Criteria

- [ ] processOperations() implemented
- [ ] processOperation() handles single operation
- [ ] Helper methods created
- [ ] Hints render for operations with r_hints
- [ ] Additional text renders for operations with new nodes
- [ ] Events fire correctly
- [ ] Build succeeds with no errors
- [ ] Manual test shows transformations

---

## 🎯 Priority 2: Basic Toolbar (2 hours)

### Goal
Add simple navigation controls to step through versions.

### File to Create/Modify
**`src/ui/toolbar.ts`** (new file)

### Implementation Plan

#### Create Toolbar Component

```typescript
export class Toolbar {
  private container: HTMLElement;
  private prevBtn: HTMLButtonElement;
  private nextBtn: HTMLButtonElement;
  private versionLabel: HTMLSpanElement;
  private currentVersion: number = 0;
  private totalVersions: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="toolbar">
        <button id="prev-btn" class="toolbar-btn">← Previous</button>
        <span id="version-label" class="version-label">v0</span>
        <button id="next-btn" class="toolbar-btn">Next →</button>
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
    if (this.currentVersion > 0) {
      this.currentVersion--;
      this.updateButtons();
      this.dispatchVersionChange();
    }
  }

  private goNext(): void {
    if (this.currentVersion < this.totalVersions) {
      this.currentVersion++;
      this.updateButtons();
      this.dispatchVersionChange();
    }
  }

  private updateButtons(): void {
    this.prevBtn.disabled = this.currentVersion === 0;
    this.nextBtn.disabled = this.currentVersion === this.totalVersions;
    this.versionLabel.textContent = `v${this.currentVersion}`;
  }

  private dispatchVersionChange(): void {
    this.container.dispatchEvent(
      new CustomEvent("versionChange", {
        detail: { version: this.currentVersion },
        bubbles: true,
      })
    );
  }

  setTotalVersions(total: number): void {
    this.totalVersions = total;
    this.updateButtons();
  }

  setCurrentVersion(version: number): void {
    this.currentVersion = version;
    this.updateButtons();
  }
}
```

#### Add CSS Styling

```css
.toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.toolbar-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 14px;
}

.toolbar-btn:hover:not(:disabled) {
  background: #e9e9e9;
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.version-label {
  font-family: monospace;
  font-size: 16px;
  font-weight: bold;
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
}
```

#### Integrate with Main Component

In `gve-snapshot-rendition.ts`:

```typescript
import { Toolbar } from "../ui/toolbar";

// Add property
private toolbar?: Toolbar;

// In connectedCallback():
const toolbarContainer = this.shadowRoot!.querySelector("#toolbar-container");
if (toolbarContainer) {
  this.toolbar = new Toolbar(toolbarContainer as HTMLElement);
  this.toolbar.setTotalVersions(this._data?.steps?.length || 0);
}

// Listen for toolbar events
toolbarContainer.addEventListener("versionChange", (e: Event) => {
  const customEvent = e as CustomEvent;
  this.goToVersion(customEvent.detail.version);
});
```

---

## 🎯 Priority 3: Version Navigation (2 hours)

### Goal
Implement version-by-version navigation (not just next/prev).

### Implementation

1. **Add goToVersion() method** to main component
2. **Track which operations have been rendered**
3. **Support jumping to any version**
4. **Update toolbar on version change**

---

## 📚 Reference Files

### Read These Before Starting:
1. **SESSION_3_SUMMARY.md** - What was just done
2. **SESSION_PROGRESS.md** - Overall status
3. **docs/rendition.md** - Operation processing spec (section on "Drawing Logic")

### Key Patterns to Follow:
1. **Async/await** for all rendering operations
2. **Logger.time/timeEnd** for performance tracking
3. **Event dispatching** for state changes
4. **Error handling** with try/catch and warnings

---

## 🐛 Common Issues to Avoid

1. **Don't forget to await** - All rendering is async
2. **Check for null/undefined** - Data might not be loaded
3. **Cache bounds after rendering** - Spreading needs them
4. **Fire events in correct order** - Before and after animations
5. **Handle empty arrays** - Operations might have no hints or no added text

---

## 📝 Testing Data Structure

You'll need sample data in this format:

```typescript
{
  text: CharNode[], // Base text nodes
  steps: [
    {
      id: "op1",
      index: 1,
      type: "delete",
      refNodeIds: [1, 2, 3], // IDs of affected nodes
      features: [
        { name: "r_hints", value: "diagonal-stroke" },
        { name: "r_fore-color", value: "red" }
      ]
    },
    {
      id: "op2",
      index: 2,
      type: "add",
      refNodeIds: [4],
      features: [
        { name: "r_text-position", value: "n" },
        { name: "r_text-offset-y", value: "-10" },
        { name: "r_border", value: "tlbr 1 4 solid green" }
      ]
    }
  ]
}
```

---

## ⏱️ Time Estimates

| Task | Estimated Time |
|------|----------------|
| Operation processing loop | 2h |
| Basic toolbar | 2h |
| Version navigation | 2h |
| **Total to MVP** | **6h** |

---

## 🎉 Success = Working MVP!

After Priority 1 (operation processing), you'll have:
- ✅ Full text transformation rendering
- ✅ All hints displaying correctly
- ✅ All additional text rendering
- ✅ Spreading working
- ✅ Animations playing
- ✅ Events firing

**That's the MVP!** 🚀

Toolbar and navigation are enhancements that make it usable, but the core functionality will be complete.

---

## 📊 Progress Tracking

Update these files after session:
1. **SESSION_PROGRESS.md** - Add Session 4 entry
2. **SESSION_4_SUMMARY.md** - Create summary
3. **NEXT_SESSION.md** - Update for Session 5
4. **IMPLEMENTATION_STATUS.md** - Update percentages

---

**Ready to make the component come alive! Let's process those operations! 🚀**
