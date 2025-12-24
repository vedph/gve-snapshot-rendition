# Integration Guide: Angular 21

This guide shows how to integrate the `@myrmidon/gve-snapshot-rendition` web components into an Angular 21 application using modern Angular best practices.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Basic Usage](#basic-usage)
- [Standalone Component Pattern](#standalone-component-pattern)
- [Using in NgModule-based Apps](#using-in-ngmodule-based-apps)
- [TypeScript Integration](#typescript-integration)
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
  renditionRef!: ElementRef<any>;

  ngAfterViewInit() {
    // Access the web component
    const rendition = this.renditionRef.nativeElement;

    // Set data
    rendition.data = {
      sources: [
        {
          id: 'v1',
          label: 'Version 1',
          text: 'Hello world'
        },
        {
          id: 'v2',
          label: 'Version 2',
          text: 'Hello wonderful world'
        }
      ],
      operations: []
    };

    // Set settings
    rendition.settings = {
      showToolbar: true,
      enableAnimation: true
    };

    // Listen to events
    rendition.addEventListener('operation-selected', (event: any) => {
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

interface SnapshotData {
  sources: Array<{ id: string; label: string; text: string }>;
  operations: Array<any>;
}

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
  renditionRef!: ElementRef<any>;

  // Use signals for reactive data
  snapshotData = signal<SnapshotData | null>(null);

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
    this.snapshotData.set({
      sources: [
        { id: 'v1', label: 'Version 1', text: 'Hello world' }
      ],
      operations: []
    });
  }

  loadExample2() {
    this.snapshotData.set({
      sources: [
        { id: 'v1', label: 'Version 1', text: 'Hello world' },
        { id: 'v2', label: 'Version 2', text: 'Hello wonderful world' }
      ],
      operations: [
        {
          type: 'insert',
          sourceId: 'v2',
          position: 6,
          text: 'wonderful '
        }
      ]
    });
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

## TypeScript Integration

Create a type-safe wrapper service for better Angular integration:

**snapshot-rendition.service.ts:**

```typescript
import { Injectable, signal } from '@angular/core';
import type {
  GveRenditionSettings,
  CharChainResult
} from '@myrmidon/gve-snapshot-rendition';

export interface SnapshotSource {
  id: string;
  label: string;
  text: string;
}

export interface SnapshotOperation {
  type: 'insert' | 'delete' | 'replace';
  sourceId: string;
  position: number;
  text?: string;
  length?: number;
  metadata?: {
    author?: string;
    timestamp?: string;
    comment?: string;
  };
}

export interface SnapshotData {
  sources: SnapshotSource[];
  operations: SnapshotOperation[];
}

@Injectable({
  providedIn: 'root'
})
export class SnapshotRenditionService {
  private currentData = signal<SnapshotData | null>(null);

  readonly data = this.currentData.asReadonly();

  setData(data: SnapshotData) {
    this.currentData.set(data);
  }

  async loadFromApi(id: string): Promise<SnapshotData> {
    // Implement your API call here
    const response = await fetch(`/api/snapshots/${id}`);
    const data = await response.json();
    this.setData(data);
    return data;
  }

  exportToJson(): string {
    const data = this.currentData();
    return JSON.stringify(data, null, 2);
  }

  getDefaultSettings(): Partial<GveRenditionSettings> {
    return {
      showToolbar: true,
      enableAnimation: true,
      fontSize: 16,
      lineHeight: 1.5
    };
  }
}
```

**Use the service in a component:**

```typescript
import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
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
  @ViewChild('rendition') renditionRef!: ElementRef;

  constructor(private snapshotService: SnapshotRenditionService) {}

  async ngAfterViewInit() {
    // Load data from service
    const data = await this.snapshotService.loadFromApi('123');

    // Apply to component
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
      }
    }
  `]
})
export class HintDesignerComponent implements AfterViewInit {
  @ViewChild('designer', { static: false })
  designerRef!: ElementRef<any>;

  savedHints = signal<any>(null);

  ngAfterViewInit() {
    // Initialize with empty data
    const designer = this.designerRef.nativeElement;
    designer.data = {
      hints: {},
      animations: {}
    };

    // Listen to hint updates
    designer.addEventListener('hint-updated', (event: any) => {
      console.log('Hint updated:', event.detail);
    });
  }

  saveHints() {
    const designer = this.designerRef.nativeElement;
    const hints = designer.data.hints;
    this.savedHints.set(hints);
    console.log('Hints saved:', hints);

    // Optionally save to backend
    // await this.http.post('/api/hints', hints).toPromise();
  }

  loadHints() {
    // Load from saved state or backend
    const hints = this.savedHints();
    if (hints) {
      this.designerRef.nativeElement.data = {
        hints,
        animations: {}
      };
    }
  }
}
```

### Example 3: HTTP Integration

**snapshot-http.component.ts:**

```typescript
import { Component, ViewChild, ElementRef, AfterViewInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-snapshot-http',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div>
      @if (loading()) {
        <div class="loading">Loading snapshot data...</div>
      } @else if (error()) {
        <div class="error">Error: {{ error() }}</div>
      } @else {
        <gve-snapshot-rendition #rendition></gve-snapshot-rendition>
      }
    </div>
  `
})
export class SnapshotHttpComponent implements AfterViewInit {
  @ViewChild('rendition') renditionRef!: ElementRef;

  loading = signal(true);
  error = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  async ngAfterViewInit() {
    try {
      // Fetch data from API
      const data = await this.http
        .get<any>('/api/snapshots/latest')
        .toPromise();

      // Apply to component
      this.renditionRef.nativeElement.data = data;
      this.loading.set(false);
    } catch (err: any) {
      this.error.set(err.message);
      this.loading.set(false);
    }
  }
}
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
