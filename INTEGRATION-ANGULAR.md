# Integration Guide: Angular 21

This guide shows how to integrate the `@myrmidon/gve-snapshot-rendition` web components into an Angular 21 application.

## Table of Contents

- [Integration Guide: Angular 21](#integration-guide-angular-21)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [TypeScript Types](#typescript-types)
    - [Key Types](#key-types)
  - [Example: Snapshot Rendition Component](#example-snapshot-rendition-component)
  - [Example: Hint Designer Component](#example-hint-designer-component)
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

## Configuration

Add `CUSTOM_ELEMENTS_SCHEMA` to your component to allow custom elements:

```typescript
import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";

@Component({
  selector: "app-root",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Required
  template: `<gve-snapshot-rendition></gve-snapshot-rendition>`,
})
export class AppComponent {}
```

## TypeScript Types

Import types for type-safe integration:

```typescript
// Import types (no runtime overhead)
import type {
  // Components
  GveSnapshotRendition,
  GveHintDesigner,

  // Data models
  CharChainResult,
  CharNode,
  ChainOperationContextStep,
  CharChainOperation,

  // Settings
  GveRenditionSettings,
  HintDesignerSettings,
  HintDesignerData,

  // Hints
  OperationHint,
  RelativePosition,
} from "@myrmidon/gve-snapshot-rendition";

// Import enums as values (exist at runtime)
import {
  OperationType,
  FeatureSetPolicy,
  DEFAULT_SETTINGS,
  DEFAULT_HINT_DESIGNER_SETTINGS,
} from "@myrmidon/gve-snapshot-rendition";
```

### Key Types

**CharChainResult** - Main data structure for the snapshot rendition:

```typescript
interface CharChainResult {
  text?: CharNode[] | string;
  steps: ChainOperationContextStep[];
  chainDump: string;
  chainTags: string[];
  taggedNodes: { [key: string]: CharNode[] };
}
```

**GveRenditionSettings** - Component settings (use `Partial<GveRenditionSettings>` for optional config):

```typescript
interface GveRenditionSettings {
  fontSize: number;
  lineHeight: number;
  charSpacing: number;
  spreadTime: number;
  hints: Record<string, OperationHint>;
  // ... many more properties
}
```

**HintDesignerData** - Data for hint designer:

```typescript
interface HintDesignerData {
  hints: Record<string, OperationHint>;
  animations: Record<string, string>;
}
```

See [TYPESCRIPT-INTEGRATION.md](TYPESCRIPT-INTEGRATION.md) for complete type reference.

## Example: Snapshot Rendition Component

Minimal example showing how to wire up the snapshot rendition component with data binding and events.

**app-snapshot-viewer.component.ts:**

```typescript
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
  ChainOperationContextStep,
} from "@myrmidon/gve-snapshot-rendition";
import { DEFAULT_SETTINGS } from "@myrmidon/gve-snapshot-rendition";

@Component({
  selector: "app-snapshot-viewer",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="viewer-container">
      <div class="controls">
        <button (click)="loadData()">Load Data</button>
        <button (click)="resetView()">Reset View</button>
      </div>

      <gve-snapshot-rendition #rendition class="rendition">
      </gve-snapshot-rendition>

      @if (selectedOperation()) {
      <div class="info">Selected: {{ selectedOperation()?.operation.id }}</div>
      }
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
  @ViewChild("rendition", { static: false })
  renditionRef!: ElementRef<GveSnapshotRendition>;

  // Reactive state with signals
  data = signal<CharChainResult | null>(null);
  settings = signal<Partial<GveRenditionSettings>>({
    ...DEFAULT_SETTINGS,
    fontSize: 16,
    lineHeight: 1.5,
  });
  selectedOperation = signal<ChainOperationContextStep | null>(null);

  constructor() {
    // Auto-update component when data changes
    effect(() => {
      const rendition = this.renditionRef?.nativeElement;
      if (rendition && this.data()) {
        rendition.data = this.data()!;
      }
    });

    // Auto-update settings
    effect(() => {
      const rendition = this.renditionRef?.nativeElement;
      if (rendition) {
        rendition.settings = this.settings();
      }
    });
  }

  ngAfterViewInit() {
    const rendition = this.renditionRef.nativeElement;

    // Listen to events
    rendition.addEventListener("operation-selected", (event: Event) => {
      const customEvent = event as CustomEvent;
      this.selectedOperation.set(customEvent.detail.operation);
    });

    rendition.addEventListener("version-changed", (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log("Version changed:", customEvent.detail.versionTag);
    });

    // Load initial data
    this.loadData();
  }

  loadData() {
    // TODO: Fetch from service
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

## Example: Hint Designer Component

Minimal example showing how to wire up the hint designer component.

**app-hint-designer.component.ts:**

```typescript
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

  // Reactive state
  data = signal<HintDesignerData>({
    hints: {},
    animations: {
      fadeIn: "return gsap.from(hintEl, { opacity: 0, duration: 0.5 });",
    },
  });

  settings = signal<HintDesignerSettings>({
    ...DEFAULT_HINT_DESIGNER_SETTINGS,
    hintDesignWidth: 400,
    hintDesignHeight: 150,
  });

  constructor() {
    // Auto-update component when data changes
    effect(() => {
      const designer = this.designerRef?.nativeElement;
      if (designer) {
        designer.data = this.data();
      }
    });

    // Auto-update settings
    effect(() => {
      const designer = this.designerRef?.nativeElement;
      if (designer) {
        designer.settings = this.settings();
      }
    });
  }

  ngAfterViewInit() {
    const designer = this.designerRef.nativeElement;

    // Listen to hint updates
    designer.addEventListener("hint-updated", (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log("Hint updated:", customEvent.detail);
    });
  }

  loadHints() {
    // TODO: Load from service
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
    // TODO: Save to service
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
