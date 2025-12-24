# Integration Guide: Angular 21

This guide shows how to integrate the `@myrmidon/gve-snapshot-rendition` web components into an Angular 21 application using modern Angular best practices.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [TypeScript Types and Interfaces](#typescript-types-and-interfaces)
- [Basic Usage](#basic-usage)
- [Standalone Component Pattern](#standalone-component-pattern)
- [Using in NgModule-based Apps](#using-in-ngmodule-based-apps)
- [TypeScript Integration with Services](#typescript-integration-with-services)
- [Complete Examples](#complete-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Angular 21.x
- Node.js 18+ or 20+
- NPM or PNPM

## Installation

### Step 1: Install the Package

```bash
npm install @myrmidon/gve-snapshot-rendition
# or
pnpm add @myrmidon/gve-snapshot-rendition
```

### Step 2: Verify Installation

Check that the package is in your `package.json`:

```json
{
  "dependencies": {
    "@myrmidon/gve-snapshot-rendition": "^0.0.1"
  }
}
```

## Configuration

### Method 1: Using CUSTOM_ELEMENTS_SCHEMA (Recommended for Angular 21)

Angular 21 uses standalone components by default. Configure custom elements support at the component level.

**In your component file:**

```typescript
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-snapshot-demo',
  standalone: true,
  imports: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Add this
  template: `
    <gve-snapshot-rendition></gve-snapshot-rendition>
  `
})
export class SnapshotDemoComponent {}
```

### Method 2: Registering Custom Elements (Alternative)

For more control, you can explicitly register the custom elements in your application initialization.

**In `main.ts` or `app.config.ts`:**

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// Import the web components to register them
import '@myrmidon/gve-snapshot-rendition';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
```

Then in your component, you still need to allow custom elements:

```typescript
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<gve-snapshot-rendition></gve-snapshot-rendition>`
})
export class AppComponent {}
```

## TypeScript Types and Interfaces

The package exports comprehensive TypeScript types for type-safe integration. Always import types using `import type` to avoid runtime overhead.

### Core Component Types

```typescript
import type {
  GveSnapshotRendition,
  GveHintDesigner
} from '@myrmidon/gve-snapshot-rendition';

// Use for ElementRef typing
@ViewChild('rendition') renditionRef!: ElementRef<GveSnapshotRendition>;
@ViewChild('designer') designerRef!: ElementRef<GveHintDesigner>;
```

### Data Model Types

```typescript
import type {
  // Main data structure for the snapshot rendition
  CharChainResult,

  // Individual nodes (characters)
  CharNode,

  // Operation execution steps
  ChainOperationContextStep,

  // Operation metadata
  CharChainOperation,

  // Chain structure (for diagnostics)
  CharChain,
  CharChainNode,
  CharChainLink,
  ChainOperationTags
} from '@myrmidon/gve-snapshot-rendition';

// Example: CharChainResult is the main data structure
const data: CharChainResult = {
  text: 'Hello world',              // Base text (string or CharNode[])
  steps: [],                         // Array of ChainOperationContextStep
  chainDump: 'v0',                   // Text representation of chain
  chainTags: ['v0'],                 // All version tags
  taggedNodes: {                     // Nodes for each version
    v0: []                           // CharNode[]
  }
};
```

### Settings Types

```typescript
import type {
  GveRenditionSettings,
  CustomButtonSettings
} from '@myrmidon/gve-snapshot-rendition';

const settings: Partial<GveRenditionSettings> = {
  // Display
  fontSize: 16,
  fontFamily: 'Arial, sans-serif',
  foreColor: '#000000',
  backColor: '#FFFFFF',

  // Spacing
  charSpacing: 1,
  lineHeight: 1.5,
  lineSpacing: 0,

  // Margins
  marginTop: 20,
  marginLeft: 20,
  marginRight: 20,
  marginBottom: 20,

  // Viewport
  initialZoom: 1,
  minZoom: 0.1,
  maxZoom: 10,
  zoomStep: 0.1,

  // Animation
  spreadTime: 500,
  backwardFadeOutTime: 300,
  prologDuration: 500,

  // Hints
  hints: {},
  hintMargin: 5,
  hintDesignWidth: 300,
  hintDesignHeight: 100,

  // Hilites
  hilitePadding: 2,
  hiliteFadeTime: 200
};
```

### Operation Types

```typescript
import type {
  OperationType,
  OperationFeature,
  OperationSource,
  OperationDiplomatics,
  OperationMetadata
} from '@myrmidon/gve-snapshot-rendition';
import { OperationType } from '@myrmidon/gve-snapshot-rendition';

// OperationType is an enum
const operation: CharChainOperation = {
  type: OperationType.replace,  // or .delete, .addBefore, .addAfter, etc.
  id: 'op1',
  at: 5,
  run: 1,
  value: 'new text',
  inputTag: 'v0',
  outputTag: 'v1'
};

// Available operation types:
// - OperationType.replace
// - OperationType.delete
// - OperationType.addBefore
// - OperationType.addAfter
// - OperationType.moveBefore
// - OperationType.moveAfter
// - OperationType.swap
// - OperationType.annotate
```

### Feature Types

```typescript
import type {
  Feature,
  OperationFeature,
  FeatureSetPolicy
} from '@myrmidon/gve-snapshot-rendition';
import { FeatureSetPolicy } from '@myrmidon/gve-snapshot-rendition';

const feature: OperationFeature = {
  name: 'author',
  value: 'John Doe',
  setPolicy: FeatureSetPolicy.single,
  isNegated: false,
  isGlobal: true,
  isShortLived: false
};

// Available policies:
// - FeatureSetPolicy.multiple
// - FeatureSetPolicy.single
// - FeatureSetPolicy.singleFirst
```

### Hint Types

```typescript
import type {
  OperationHint,
  RelativePosition
} from '@myrmidon/gve-snapshot-rendition';

const hint: OperationHint = {
  svg: '<g><rect width="100" height="50" fill="red"/></g>',
  position: 'e',           // RelativePosition
  offsetX: 0,              // number or string like '0.5th'
  offsetY: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  solid: false,
  animation: '#fadeIn'     // Reference to animation catalog
};

// Available RelativePosition values:
// 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw' (outside)
// 'inw', 'ine', 'isw', 'ise' (inside corners)
// 'o' (origin/center)
```

### Hint Designer Types

```typescript
import type {
  GveHintDesigner,
  HintDesignerData,
  HintDesignerSettings,
  StringPair
} from '@myrmidon/gve-snapshot-rendition';

const designerData: HintDesignerData = {
  hints: {
    'hint1': {
      svg: '<g><circle r="20"/></g>',
      position: 'e',
      offsetX: 0,
      offsetY: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0
    }
  },
  animations: {
    'fadeIn': 'return gsap.from(hintEl, { opacity: 0, duration: 0.5 });'
  }
};

const designerSettings: HintDesignerSettings = {
  hintDesignWidth: 300,
  hintDesignHeight: 100,
  debug: false
};
```

### Event Detail Types

```typescript
// For operation-selected event
interface OperationSelectedDetail {
  operation: ChainOperationContextStep | null;
  versionTag: string;
}

// For version-changed event
interface VersionChangedDetail {
  versionTag: string;
  index: number;
}

// Usage with typed event listeners
rendition.addEventListener('operation-selected', (event: CustomEvent<OperationSelectedDetail>) => {
  const operation = event.detail.operation;
  const versionTag = event.detail.versionTag;
});
```

### Complete Type Import Example

```typescript
import type {
  // Components
  GveSnapshotRendition,
  GveHintDesigner,

  // Data Models
  CharChainResult,
  CharNode,
  ChainOperationContextStep,
  CharChainOperation,

  // Settings
  GveRenditionSettings,
  CustomButtonSettings,
  HintDesignerSettings,

  // Operations
  OperationType,
  OperationFeature,
  OperationMetadata,

  // Features
  Feature,
  FeatureSetPolicy,

  // Hints
  OperationHint,
  RelativePosition,
  HintDesignerData,

  // Utility
  StringPair
} from '@myrmidon/gve-snapshot-rendition';

// Import enums as values (not types)
import {
  OperationType,
  FeatureSetPolicy
} from '@myrmidon/gve-snapshot-rendition';
```

## Basic Usage

### Standalone Component with Template Reference

```typescript
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
  ElementRef,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type {
  GveSnapshotRendition,
  CharChainResult,
  GveRenditionSettings
} from '@myrmidon/gve-snapshot-rendition';

@Component({
  selector: 'app-snapshot-viewer',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="snapshot-container">
      <h2>Snapshot Rendition</h2>
      <gve-snapshot-rendition
        #rendition
        [style.width.px]="800"
        [style.height.px]="600">
      </gve-snapshot-rendition>
    </div>
  `,
  styles: [`
    .snapshot-container {
      padding: 20px;
    }

    gve-snapshot-rendition {
      display: block;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
  `]
})
export class SnapshotViewerComponent implements AfterViewInit {
  @ViewChild('rendition', { static: false })
  renditionRef!: ElementRef<GveSnapshotRendition>;

  ngAfterViewInit() {
    // Access the web component
    const rendition = this.renditionRef.nativeElement;

    // Set data - CharChainResult format
    const data: CharChainResult = {
      text: 'Hello world',
      steps: [],
      chainDump: '',
      chainTags: ['v0'],
      taggedNodes: {}
    };
    rendition.data = data;

    // Set settings with proper typing
    const settings: Partial<GveRenditionSettings> = {
      fontSize: 16,
      lineHeight: 1.5
    };
    rendition.settings = settings;

    // Listen to events with proper typing
    rendition.addEventListener('operation-selected', (event: CustomEvent) => {
      console.log('Operation selected:', event.detail);
    });
  }
}
```

### Using with Angular Signals (Angular 21 Feature)

```typescript
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
  ElementRef,
  AfterViewInit,
  signal,
  effect
} from '@angular/core';
import type {
  GveSnapshotRendition,
  CharChainResult,
  CharNode,
  ChainOperationContextStep,
  CharChainOperation,
  OperationType
} from '@myrmidon/gve-snapshot-rendition';

@Component({
  selector: 'app-snapshot-signals',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div>
      <button (click)="loadExample1()">Load Example 1</button>
      <button (click)="loadExample2()">Load Example 2</button>

      <gve-snapshot-rendition #rendition></gve-snapshot-rendition>
    </div>
  `
})
export class SnapshotSignalsComponent implements AfterViewInit {
  @ViewChild('rendition', { static: false })
  renditionRef!: ElementRef<GveSnapshotRendition>;

  // Use signals for reactive data with proper typing
  snapshotData = signal<CharChainResult | null>(null);

  constructor() {
    // Effect to update component when signal changes
    effect(() => {
      const data = this.snapshotData();
      if (data && this.renditionRef) {
        this.renditionRef.nativeElement.data = data;
      }
    });
  }

  ngAfterViewInit() {
    // Load initial data
    this.loadExample1();
  }

  loadExample1() {
    const data: CharChainResult = {
      text: 'Hello world',
      steps: [],
      chainDump: 'v0',
      chainTags: ['v0'],
      taggedNodes: {
        v0: this.stringToNodes('Hello world')
      }
    };
    this.snapshotData.set(data);
  }

  loadExample2() {
    const operation: CharChainOperation = {
      type: OperationType.addAfter,
      id: 'op1',
      at: 5,
      run: 1,
      value: ' wonderful',
      inputTag: 'v0',
      outputTag: 'v1'
    };

    const step: ChainOperationContextStep = {
      operation,
      inputTag: 'v0',
      outputTag: 'v1',
      result: 'Hello wonderful world',
      featureSet: { features: [], nodeFeatures: {} },
      refNodeIds: [5]
    };

    const data: CharChainResult = {
      text: 'Hello world',
      steps: [step],
      chainDump: 'v0 -> v1',
      chainTags: ['v0', 'v1'],
      taggedNodes: {
        v0: this.stringToNodes('Hello world'),
        v1: this.stringToNodes('Hello wonderful world')
      }
    };
    this.snapshotData.set(data);
  }

  private stringToNodes(text: string): CharNode[] {
    return Array.from(text).map((char, index) => ({
      id: index,
      index,
      label: `${index}`,
      data: char
    }));
  }
}
```

## Standalone Component Pattern

Angular 21 prefers standalone components. Here's a complete example:

**snapshot-viewer.component.ts:**

```typescript
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-snapshot-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './snapshot-viewer.component.html',
  styleUrls: ['./snapshot-viewer.component.scss']
})
export class SnapshotViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('rendition', { static: false })
  renditionRef!: ElementRef<any>;

  // Reactive state
  isLoading = signal(false);
  selectedOperation = signal<any>(null);

  private eventListeners: Array<{ element: any; event: string; handler: any }> = [];

  ngAfterViewInit() {
    this.initializeComponent();
  }

  ngOnDestroy() {
    // Clean up event listeners
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
  }

  private initializeComponent() {
    const rendition = this.renditionRef.nativeElement;

    // Configure settings
    rendition.settings = {
      showToolbar: true,
      enableAnimation: true,
      fontSize: 16
    };

    // Add event listener with cleanup tracking
    const operationHandler = (event: any) => {
      this.selectedOperation.set(event.detail.operation);
    };

    rendition.addEventListener('operation-selected', operationHandler);
    this.eventListeners.push({
      element: rendition,
      event: 'operation-selected',
      handler: operationHandler
    });

    // Load initial data
    this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);

    try {
      // Simulate API call
      const data = await this.fetchSnapshotData();
      this.renditionRef.nativeElement.data = data;
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async fetchSnapshotData(): Promise<any> {
    // Replace with actual API call
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          sources: [
            { id: 'v1', label: 'Version 1', text: 'Sample text' }
          ],
          operations: []
        });
      }, 500);
    });
  }

  resetView() {
    this.renditionRef.nativeElement.resetView?.();
  }

  exportSVG() {
    const svg = this.renditionRef.nativeElement.exportSVG?.();
    if (svg) {
      this.downloadFile(svg, 'snapshot.svg', 'image/svg+xml');
    }
  }

  private downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
```

**snapshot-viewer.component.html:**

```html
<div class="snapshot-viewer">
  <div class="controls">
    <button (click)="loadData()">Reload Data</button>
    <button (click)="resetView()">Reset View</button>
    <button (click)="exportSVG()">Export SVG</button>
  </div>

  @if (isLoading()) {
    <div class="loading">Loading...</div>
  }

  <gve-snapshot-rendition
    #rendition
    class="rendition-component">
  </gve-snapshot-rendition>

  @if (selectedOperation()) {
    <div class="operation-details">
      <h3>Selected Operation</h3>
      <pre>{{ selectedOperation() | json }}</pre>
    </div>
  }
</div>
```

**snapshot-viewer.component.scss:**

```scss
.snapshot-viewer {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
}

.controls {
  display: flex;
  gap: 10px;

  button {
    padding: 8px 16px;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      background: #1565c0;
    }
  }
}

.loading {
  padding: 20px;
  text-align: center;
  color: #666;
}

.rendition-component {
  width: 100%;
  height: 600px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.operation-details {
  padding: 15px;
  background: #f5f5f5;
  border-radius: 4px;

  h3 {
    margin-top: 0;
  }

  pre {
    background: white;
    padding: 10px;
    border-radius: 4px;
    overflow-x: auto;
  }
}
```

## Using in NgModule-based Apps

If you're still using NgModule (older Angular apps):

**app.module.ts:**

```typescript
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { SnapshotViewerComponent } from './snapshot-viewer/snapshot-viewer.component';

@NgModule({
  declarations: [
    AppComponent,
    SnapshotViewerComponent
  ],
  imports: [
    BrowserModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Add this
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

**main.ts:**

```typescript
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

// Import web components
import '@myrmidon/gve-snapshot-rendition';

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));
```

## TypeScript Integration with Services

Create a type-safe wrapper service for better Angular integration:

**snapshot-rendition.service.ts:**

```typescript
import { Injectable, signal } from '@angular/core';
import type {
  GveRenditionSettings,
  CharChainResult,
  CharNode,
  ChainOperationContextStep,
  CharChainOperation,
  OperationType
} from '@myrmidon/gve-snapshot-rendition';
import { DEFAULT_SETTINGS } from '@myrmidon/gve-snapshot-rendition';

@Injectable({
  providedIn: 'root'
})
export class SnapshotRenditionService {
  private currentData = signal<CharChainResult | null>(null);

  readonly data = this.currentData.asReadonly();

  setData(data: CharChainResult) {
    this.currentData.set(data);
  }

  async loadFromApi(id: string): Promise<CharChainResult> {
    // Implement your API call here
    const response = await fetch(`/api/snapshots/${id}`);
    const data: CharChainResult = await response.json();
    this.setData(data);
    return data;
  }

  exportToJson(): string {
    const data = this.currentData();
    return JSON.stringify(data, null, 2);
  }

  getDefaultSettings(): Partial<GveRenditionSettings> {
    return {
      ...DEFAULT_SETTINGS,
      fontSize: 16,
      lineHeight: 1.5
    };
  }

  /**
   * Helper to convert a string to CharNode array
   */
  stringToNodes(text: string): CharNode[] {
    return Array.from(text).map((char, index) => ({
      id: index,
      index,
      label: `${index}`,
      data: char
    }));
  }

  /**
   * Create a simple CharChainResult from text
   */
  createSimpleData(text: string, tag: string = 'v0'): CharChainResult {
    return {
      text,
      steps: [],
      chainDump: tag,
      chainTags: [tag],
      taggedNodes: {
        [tag]: this.stringToNodes(text)
      }
    };
  }
}
```

**Use the service in a component:**

```typescript
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
  ElementRef,
  AfterViewInit
} from '@angular/core';
import type { GveSnapshotRendition } from '@myrmidon/gve-snapshot-rendition';
import { SnapshotRenditionService } from './snapshot-rendition.service';

@Component({
  selector: 'app-snapshot-with-service',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <gve-snapshot-rendition #rendition></gve-snapshot-rendition>
  `
})
export class SnapshotWithServiceComponent implements AfterViewInit {
  @ViewChild('rendition') renditionRef!: ElementRef<GveSnapshotRendition>;

  constructor(private snapshotService: SnapshotRenditionService) {}

  async ngAfterViewInit() {
    // Load data from service
    const data = await this.snapshotService.loadFromApi('123');

    // Apply to component with proper typing
    const rendition = this.renditionRef.nativeElement;
    rendition.data = data;
    rendition.settings = this.snapshotService.getDefaultSettings();
  }
}
```

## Complete Examples

### Example 1: Simple Viewer

**app.component.ts:**

```typescript
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SnapshotViewerComponent } from './snapshot-viewer/snapshot-viewer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, SnapshotViewerComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="app-container">
      <h1>GVE Snapshot Rendition - Angular 21</h1>
      <app-snapshot-viewer></app-snapshot-viewer>
    </div>
  `,
  styles: [`
    .app-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }

    h1 {
      color: #333;
      margin-bottom: 30px;
    }
  `]
})
export class AppComponent {}
```

### Example 2: Hint Designer Integration

**hint-designer.component.ts:**

```typescript
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
  ElementRef,
  AfterViewInit,
  signal
} from '@angular/core';
import type {
  GveHintDesigner,
  HintDesignerData,
  HintDesignerSettings,
  OperationHint
} from '@myrmidon/gve-snapshot-rendition';
import { DEFAULT_HINT_DESIGNER_SETTINGS } from '@myrmidon/gve-snapshot-rendition';

@Component({
  selector: 'app-hint-designer',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="designer-container">
      <h2>Hint Designer</h2>

      <div class="controls">
        <button (click)="saveHints()">Save Hints</button>
        <button (click)="loadHints()">Load Hints</button>
        <button (click)="addNewHint()">Add New Hint</button>
      </div>

      <gve-hint-designer
        #designer
        [style.width.%]="100"
        [style.height.px]="800">
      </gve-hint-designer>

      @if (savedHints()) {
        <div class="saved-hints">
          <h3>Saved Hints</h3>
          <pre>{{ savedHints() | json }}</pre>
        </div>
      }
    </div>
  `,
  styles: [`
    .designer-container {
      padding: 20px;
    }

    .controls {
      margin-bottom: 20px;
      display: flex;
      gap: 10px;
    }

    .controls button {
      padding: 8px 16px;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .controls button:hover {
      background: #1565c0;
    }

    gve-hint-designer {
      display: block;
      border: 1px solid #ccc;
      border-radius: 4px;
    }

    .saved-hints {
      margin-top: 20px;
      padding: 15px;
      background: #f5f5f5;
      border-radius: 4px;

      pre {
        max-height: 300px;
        overflow-y: auto;
        background: white;
        padding: 10px;
        border-radius: 4px;
      }
    }
  `]
})
export class HintDesignerComponent implements AfterViewInit {
  @ViewChild('designer', { static: false })
  designerRef!: ElementRef<GveHintDesigner>;

  savedHints = signal<Record<string, OperationHint> | null>(null);

  ngAfterViewInit() {
    const designer = this.designerRef.nativeElement;

    // Initialize with empty data and settings
    const initialData: HintDesignerData = {
      hints: {},
      animations: {
        'fadeIn': 'return gsap.from(hintEl, { opacity: 0, duration: 0.5 });',
        'slideIn': 'return gsap.from(hintEl, { x: -50, opacity: 0, duration: 0.5 });'
      }
    };
    designer.data = initialData;

    const settings: HintDesignerSettings = {
      ...DEFAULT_HINT_DESIGNER_SETTINGS,
      hintDesignWidth: 400,
      hintDesignHeight: 150
    };
    designer.settings = settings;

    // Listen to hint updates with proper typing
    designer.addEventListener('hint-updated', (event: CustomEvent) => {
      console.log('Hint updated:', event.detail);
    });
  }

  saveHints() {
    const designer = this.designerRef.nativeElement;
    const data: HintDesignerData = designer.data;
    this.savedHints.set(data.hints);
    console.log('Hints saved:', data.hints);

    // Optionally save to backend
    // await this.http.post<void>('/api/hints', data.hints).toPromise();
  }

  loadHints() {
    const hints = this.savedHints();
    if (hints) {
      const designer = this.designerRef.nativeElement;
      const currentData: HintDesignerData = designer.data;

      const newData: HintDesignerData = {
        ...currentData,
        hints
      };
      designer.data = newData;
    }
  }

  addNewHint() {
    const designer = this.designerRef.nativeElement;
    const currentData: HintDesignerData = designer.data;

    const newHintId = `hint_${Date.now()}`;
    const newHint: OperationHint = {
      svg: '<g><rect width="100" height="50" fill="#4CAF50" rx="5"/></g>',
      position: 'e',
      offsetX: 0,
      offsetY: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      solid: false,
      animation: '#fadeIn'
    };

    const updatedData: HintDesignerData = {
      ...currentData,
      hints: {
        ...currentData.hints,
        [newHintId]: newHint
      }
    };
    designer.data = updatedData;
  }
}
```

### Example 3: HTTP Integration

**snapshot-http.component.ts:**

```typescript
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
  ElementRef,
  AfterViewInit,
  signal,
  inject
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import type {
  GveSnapshotRendition,
  CharChainResult,
  GveRenditionSettings
} from '@myrmidon/gve-snapshot-rendition';

@Component({
  selector: 'app-snapshot-http',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="http-container">
      @if (loading()) {
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading snapshot data...</p>
        </div>
      } @else if (error()) {
        <div class="error">
          <h3>Error Loading Data</h3>
          <p>{{ error() }}</p>
          <button (click)="retry()">Retry</button>
        </div>
      } @else {
        <gve-snapshot-rendition
          #rendition
          [style.width.%]="100"
          [style.height.px]="600">
        </gve-snapshot-rendition>
      }
    </div>
  `,
  styles: [`
    .http-container {
      padding: 20px;
    }

    .loading {
      text-align: center;
      padding: 40px;
    }

    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #1976d2;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error {
      padding: 20px;
      background: #ffebee;
      border: 1px solid #ef5350;
      border-radius: 4px;
      color: #c62828;
    }

    .error h3 {
      margin-top: 0;
    }

    .error button {
      margin-top: 10px;
      padding: 8px 16px;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    gve-snapshot-rendition {
      display: block;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }
  `]
})
export class SnapshotHttpComponent implements AfterViewInit {
  private http = inject(HttpClient);

  @ViewChild('rendition') renditionRef!: ElementRef<GveSnapshotRendition>;

  loading = signal(true);
  error = signal<string | null>(null);

  ngAfterViewInit() {
    this.loadData();
  }

  async loadData() {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Fetch data from API with proper typing
      const data = await firstValueFrom(
        this.http.get<CharChainResult>('/api/snapshots/latest')
      );

      // Apply to component
      const rendition = this.renditionRef.nativeElement;
      rendition.data = data;

      // Configure settings
      const settings: Partial<GveRenditionSettings> = {
        fontSize: 16,
        lineHeight: 1.5,
        spreadTime: 500
      };
      rendition.settings = settings;

      this.loading.set(false);
    } catch (err: any) {
      this.error.set(err.message || 'Failed to load snapshot data');
      this.loading.set(false);
      console.error('Error loading snapshot:', err);
    }
  }

  retry() {
    this.loadData();
  }
}
```

**Note:** Don't forget to provide `HttpClient` in your app configuration:

```typescript
// app.config.ts (Angular 21 standalone)
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient()
  ]
};
```

## Best Practices

### 1. Always Use CUSTOM_ELEMENTS_SCHEMA

```typescript
@Component({
  schemas: [CUSTOM_ELEMENTS_SCHEMA] // Required for custom elements
})
```

### 2. Clean Up Event Listeners

```typescript
ngOnDestroy() {
  // Remove event listeners to prevent memory leaks
  this.eventListeners.forEach(({ element, event, handler }) => {
    element.removeEventListener(event, handler);
  });
}
```

### 3. Use Angular Signals for Reactive State

```typescript
// Modern Angular 21 approach
selectedOperation = signal<any>(null);

// Update in event handler
rendition.addEventListener('operation-selected', (event: any) => {
  this.selectedOperation.set(event.detail.operation);
});
```

### 4. Type Safety with Interfaces

```typescript
import type {
  GveRenditionSettings,
  OperationHint
} from '@myrmidon/gve-snapshot-rendition';

const settings: Partial<GveRenditionSettings> = {
  showToolbar: true
};
```

### 5. Use AfterViewInit for Component Access

```typescript
// Always use AfterViewInit to ensure the element is available
ngAfterViewInit() {
  const rendition = this.renditionRef.nativeElement;
  // Now safe to access
}
```

### 6. Lazy Loading for Performance

```typescript
// In routes configuration
{
  path: 'snapshot',
  loadComponent: () =>
    import('./snapshot-viewer/snapshot-viewer.component')
      .then(m => m.SnapshotViewerComponent)
}
```

## Troubleshooting

### Issue: "Custom element not recognized"

**Solution:** Add `CUSTOM_ELEMENTS_SCHEMA` to your component:

```typescript
@Component({
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
```

### Issue: "Property 'data' does not exist on type 'ElementRef'"

**Solution:** Use type assertion:

```typescript
const rendition = this.renditionRef.nativeElement as any;
// or
const rendition: any = this.renditionRef.nativeElement;
```

### Issue: Component not rendering

**Solution:** Ensure the component has explicit dimensions:

```scss
gve-snapshot-rendition {
  display: block;
  width: 100%;
  height: 600px; // Must have explicit height
}
```

### Issue: Events not firing

**Solution:** Add event listeners in `AfterViewInit`, not in constructor:

```typescript
ngAfterViewInit() {
  // ✅ Correct
  this.renditionRef.nativeElement.addEventListener('...', handler);
}

constructor() {
  // ❌ Wrong - element doesn't exist yet
}
```

### Issue: AOT Compilation Errors

**Solution:** Use dynamic imports and avoid accessing properties at compile time:

```typescript
// ✅ Good
const rendition: any = this.renditionRef.nativeElement;
rendition.data = {...};

// ❌ Avoid
// Direct property access may cause AOT issues
```

### Issue: Server-Side Rendering (SSR) Errors

**Solution:** Check if running in browser:

```typescript
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';

export class MyComponent {
  private platformId = inject(PLATFORM_ID);

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Safe to access web component
      this.renditionRef.nativeElement.data = {...};
    }
  }
}
```

## Project Structure Recommendation

```
src/
├── app/
│   ├── components/
│   │   ├── snapshot-viewer/
│   │   │   ├── snapshot-viewer.component.ts
│   │   │   ├── snapshot-viewer.component.html
│   │   │   ├── snapshot-viewer.component.scss
│   │   │   └── snapshot-viewer.component.spec.ts
│   │   └── hint-designer/
│   │       └── ...
│   ├── services/
│   │   └── snapshot-rendition.service.ts
│   ├── models/
│   │   └── snapshot.model.ts
│   └── app.component.ts
├── main.ts
└── ...
```

## Additional Resources

- Angular Documentation: https://angular.dev/
- Custom Elements Everywhere: https://custom-elements-everywhere.com/
- Package Repository: [Your GitHub URL]

## Migration from Older Angular Versions

If migrating from Angular < 17:

1. Update to standalone components
2. Replace `*ngIf` with `@if`
3. Replace `*ngFor` with `@for`
4. Use signals instead of RxJS where appropriate
5. Update to Angular 21 HttpClient

```typescript
// Old (Angular < 17)
*ngIf="loading"

// New (Angular 21)
@if (loading()) { ... }
```

## Support

For issues specific to Angular integration:
- Check Angular console for errors
- Verify `CUSTOM_ELEMENTS_SCHEMA` is configured
- Ensure proper lifecycle hook usage
- Check browser console for web component errors
