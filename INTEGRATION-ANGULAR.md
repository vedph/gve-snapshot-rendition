# Integration Guide: Angular 21

This guide shows how to integrate the `@myrmidon/gve-snapshot-rendition` web components into an Angular 21 application.

- [Integration Guide: Angular 21](#integration-guide-angular-21)
  - [Installation](#installation)
  - [Snapshot Rendition Component](#snapshot-rendition-component)
  - [Hints Designer Component](#hints-designer-component)
  - [Troubleshooting](#troubleshooting)
    - ["Custom element not recognized"](#custom-element-not-recognized)
    - ["Property 'data' does not exist on type 'ElementRef'"](#property-data-does-not-exist-on-type-elementref)
    - [Component not rendering](#component-not-rendering)
    - [Events not firing](#events-not-firing)
    - [TypeScript strict mode errors](#typescript-strict-mode-errors)
  - [Additional Resources](#additional-resources)

## Installation

```bash
npm install @myrmidon/gve-snapshot-rendition
# or
pnpm add @myrmidon/gve-snapshot-rendition
```

---

## Snapshot Rendition Component

- 🔥 **events**:
  - `versionTagChanging`: fired before version changes (detail: `{ from, to }`).
  - `versionTagChange`: fired after version changes (detail: `{ from, to }`).

Example:

```ts
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
  ElementRef,
  AfterViewInit,
  signal,
  effect,
} from "@angular/core";
import type {
  GveSnapshotRendition,
  CharChainResult,
  GveRenditionSettings,
} from "@myrmidon/gve-snapshot-rendition";
import { DEFAULT_SETTINGS } from "@myrmidon/gve-snapshot-rendition";

@Component({
  selector: "app-snapshot-viewer",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // required!
  template: `
    <div class="viewer-container">
      <div class="controls">
        <button (click)="loadData()">Load Data</button>
        <button (click)="resetView()">Reset View</button>
      </div>

      <gve-snapshot-rendition #rendition class="rendition">
      </gve-snapshot-rendition>
    </div>
  `,
  styles: [
    `
      .viewer-container {
        padding: 20px;
      }

      .rendition {
        display: block;
        width: 100%;
        height: 600px;
        border: 1px solid #ccc;
      }

      .controls {
        margin-bottom: 20px;
        display: flex;
        gap: 10px;
      }
    `,
  ],
})
export class SnapshotViewerComponent implements AfterViewInit {
  // reference to rendition
  @ViewChild("rendition", { static: false })
  public renditionRef!: ElementRef<GveSnapshotRendition>;

  // reactive state
  public readonly data = signal<CharChainResult | null>(null);
  public readonly settings = signal<Partial<GveRenditionSettings>>({
    ...DEFAULT_SETTINGS,
    fontSize: 16,
    lineHeight: 1.5,
  });

  constructor() {
    // auto-update component when data changes
    effect(() => {
      const rendition = this.renditionRef?.nativeElement;
      if (rendition && this.data()) {
        rendition.data = this.data()!;
      }
    });

    // auto-update settings when settings change
    effect(() => {
      const rendition = this.renditionRef?.nativeElement;
      if (rendition) {
        rendition.settings = this.settings();
      }
    });
  }

  public ngAfterViewInit() {
    const rendition = this.renditionRef.nativeElement;

    // listen to version change events
    rendition.addEventListener("versionTagChange", (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log("Version changed:", customEvent.detail);
    });

    // load initial data
    this.loadData();
  }

  loadData() {
    // TODO: fetch from service
    const mockData: CharChainResult = {
      text: "Sample text",
      steps: [],
      chainDump: "v0",
      chainTags: ["v0"],
      taggedNodes: {},
    };
    this.data.set(mockData);
  }

  resetView() {
    this.renditionRef.nativeElement.resetView?.();
  }
}
```

---

## Hints Designer Component

- 🔥 **events**:
  - `dataChange`: fired when hint data changes (detail: `{ data }`).
  - `hintIdChange`: fired when selected hint changes (detail: `{ hintId }`).
  - `hintVariablesChange`: fired when hint variables change (detail: `{ hintVariables }`).

Example:

```ts
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
  ElementRef,
  AfterViewInit,
  signal,
  effect,
} from "@angular/core";
import type {
  GveHintDesigner,
  HintDesignerData,
  HintDesignerSettings,
  OperationHint,
} from "@myrmidon/gve-snapshot-rendition";
import { DEFAULT_HINT_DESIGNER_SETTINGS } from "@myrmidon/gve-snapshot-rendition";

@Component({
  selector: "app-hint-designer",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="designer-container">
      <div class="controls">
        <button (click)="loadHints()">Load Hints</button>
        <button (click)="saveHints()">Save Hints</button>
        <button (click)="clearHints()">Clear Hints</button>
      </div>

      <gve-hint-designer #designer class="designer"> </gve-hint-designer>
    </div>
  `,
  styles: [
    `
      .designer-container {
        padding: 20px;
      }

      .designer {
        display: block;
        width: 100%;
        height: 800px;
        border: 1px solid #ccc;
      }

      .controls {
        margin-bottom: 20px;
        display: flex;
        gap: 10px;
      }
    `,
  ],
})
export class HintDesignerComponent implements AfterViewInit {
  @ViewChild("designer", { static: false })
  designerRef!: ElementRef<GveHintDesigner>;

  // reactive state
  public readonly data = signal<HintDesignerData>({
    hints: {},
    animations: {
      fadeIn: "return gsap.from(hintEl, { opacity: 0, duration: 0.5 });",
    },
  });

  public readonly settings = signal<HintDesignerSettings>({
    ...DEFAULT_HINT_DESIGNER_SETTINGS,
    hintDesignWidth: 400,
    hintDesignHeight: 150,
  });

  constructor() {
    // auto-update component when data changes
    effect(() => {
      const designer = this.designerRef?.nativeElement;
      if (designer) {
        designer.data = this.data();
      }
    });

    // auto-update settings when settings change
    effect(() => {
      const designer = this.designerRef?.nativeElement;
      if (designer) {
        designer.settings = this.settings();
      }
    });
  }

  public ngAfterViewInit() {
    const designer = this.designerRef.nativeElement;

    // listen to data changes (fired when hints are modified)
    designer.addEventListener("dataChange", (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log("Data changed:", customEvent.detail.data);
      // optionally sync back to signal
      // this.data.set(customEvent.detail.data);
    });

    this.loadHints();
  }

  loadHints() {
    // TODO: load from service
    const loadedData: HintDesignerData = {
      hints: {
        hint1: {
          svg: '<g><rect width="100" height="50" fill="blue"/></g>',
          position: "e",
          offsetX: 0,
          offsetY: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
        },
      },
      animations: this.data().animations,
    };
    this.data.set(loadedData);
  }

  saveHints() {
    // TODO: save to service
    const currentData = this.designerRef.nativeElement.data;
    console.log("Saving hints:", currentData.hints);
  }

  clearHints() {
    this.data.set({
      hints: {},
      animations: this.data().animations,
    });
  }
}
```

---

## Troubleshooting

### "Custom element not recognized"

Add `CUSTOM_ELEMENTS_SCHEMA` to your component:

```typescript
@Component({
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
```

### "Property 'data' does not exist on type 'ElementRef'"

Use proper typing on `ElementRef`:

```typescript
@ViewChild('rendition') renditionRef!: ElementRef<GveSnapshotRendition>;
```

### Component not rendering

Ensure the element has explicit dimensions in CSS:

```css
gve-snapshot-rendition {
  display: block;
  width: 100%;
  height: 600px; /* Must have height */
}
```

### Events not firing

Add listeners in `ngAfterViewInit`, not in constructor:

```typescript
ngAfterViewInit() {
  this.renditionRef.nativeElement.addEventListener('operation-selected', handler);
}
```

### TypeScript strict mode errors

Use `Partial<T>` for settings:

```typescript
const settings: Partial<GveRenditionSettings> = {
  fontSize: 16, // Only set properties you need
};
```

## Additional Resources

- [TYPESCRIPT-INTEGRATION.md](TYPESCRIPT-INTEGRATION.md) - Complete type reference
- [INTEGRATION-VANILLA.md](INTEGRATION-VANILLA.md) - Vanilla JS integration
- Package: <https://www.npmjs.com/package/@myrmidon/gve-snapshot-rendition>
