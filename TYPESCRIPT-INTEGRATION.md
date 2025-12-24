# TypeScript Integration Guide

This guide provides comprehensive information about using the exported TypeScript types from `@myrmidon/gve-snapshot-rendition` for type-safe integration.

## Overview

The package exports all necessary TypeScript types and interfaces, allowing you to build type-safe applications that integrate with the web components. This eliminates the need for `any` types and provides full IDE autocomplete and compile-time type checking.

## Importing Types

Always use `import type` for type-only imports to avoid runtime overhead:

```ts
// Import types only
import type {
  GveSnapshotRendition,
  CharChainResult,
  GveRenditionSettings
} from '@myrmidon/gve-snapshot-rendition';

// Import enums as values (they exist at runtime)
import {
  OperationType,
  FeatureSetPolicy
} from '@myrmidon/gve-snapshot-rendition';
```

## Exported Types Reference

### Components

```ts
// Web component class types
GveSnapshotRendition
GveHintDesigner
```

### Data Models

```ts
// Main data structure
CharChainResult {
  text?: CharNode[] | string;
  steps: ChainOperationContextStep[];
  chainDump: string;
  chainTags: string[];
  taggedNodes: { [key: string]: CharNode[] };
}

// Character node
CharNode {
  id: number;
  index: number;
  label: string;
  data: string;
  sourceTag?: string;
  features?: Feature[];
}

// Operation execution step
ChainOperationContextStep {
  operation: CharChainOperation;
  inputTag: string;
  outputTag: string;
  result?: string;
  featureSet: {
    features: OperationFeature[];
    nodeFeatures: Record<string, OperationFeature[]>;
  };
  refNodeIds: number[];
}

// Operation metadata
CharChainOperation extends OperationMetadata {
  at: number;
  atAsIndex?: boolean;
  to?: number;
  toAsIndex?: boolean;
  inputTag?: string;
  outputTag?: string;
  run: number;
  toRun?: number;
  value?: string;
  noTraceFeatures?: boolean;
  dsl?: string;
}
```

### Settings

```ts
// Main component settings
GveRenditionSettings {
  // Display
  fontSize: number;
  fontFamily: string;
  foreColor: string;
  backColor: string;
  italic: boolean;
  bold: boolean;
  underline?: number;
  overline?: number;
  strike?: number;

  // Spacing
  spaceWidthFraction: number;
  charSpacing: number;
  lineHeight: number;
  lineSpacing: number;
  marginTop: number;
  marginLeft: number;
  marginRight: number;
  marginBottom: number;

  // Viewport
  initialZoom: number;
  minZoom: number;
  maxZoom: number;
  zoomStep: number;

  // Animation
  spreadTime: number;
  backwardFadeOutTime: number;
  prologDuration: number;

  // Hints
  hints: Record<string, OperationHint>;
  hintMargin: number;
  hintDesignWidth: number;
  hintDesignHeight: number;
  showHintHandles: boolean;

  // ... and more
}

// Custom button settings
CustomButtonSettings {
  id: string;
  icon: string;
  label: string;
  tooltip: string;
  callback: (id: string, svg: SVGElement) => void;
}

// Hint designer settings
HintDesignerSettings {
  hintDesignWidth: number;
  hintDesignHeight: number;
  debug: boolean;
}
```

### Operations and Features

```ts
// Operation type enum
enum OperationType {
  replace = 0,
  delete,
  addBefore,
  addAfter,
  moveBefore,
  moveAfter,
  swap,
  annotate
}

// Feature set policy enum
enum FeatureSetPolicy {
  multiple = 0,
  single,
  singleFirst
}

// Generic feature
Feature {
  name: string;
  value: string;
  setPolicy: FeatureSetPolicy;
}

// Operation feature
OperationFeature extends Feature {
  isNegated?: boolean;
  isGlobal?: boolean;
  isShortLived?: boolean;
}

// Operation metadata base
OperationMetadata {
  type: OperationType;
  id: string;
  rank?: number;
  groupId?: string;
  features?: OperationFeature[];
  sources?: OperationSource[];
  diplomatics?: OperationDiplomatics;
}
```

### Hints

```ts
// Operation hint
OperationHint {
  svg: string;
  position: RelativePosition;
  offsetX: number | string;
  offsetY: number | string;
  scaleX: number;
  scaleY: number;
  rotation: number;
  solid?: boolean;
  animation?: string;
  displacedRefSpan?: string;
}

// Relative position type
type RelativePosition =
  | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'  // outside
  | 'inw' | 'ine' | 'isw' | 'ise'                      // inside
  | 'o';                                                // origin

// Hint designer data
HintDesignerData {
  hints: Record<string, OperationHint>;
  animations: Record<string, string>;
}
```

## Usage Examples

### Basic Typed Component

```ts
import type {
  GveSnapshotRendition,
  CharChainResult
} from '@myrmidon/gve-snapshot-rendition';

// Vanilla JS
const rendition = document.querySelector<GveSnapshotRendition>('gve-snapshot-rendition')!;

const data: CharChainResult = {
  text: 'Hello world',
  steps: [],
  chainDump: 'v0',
  chainTags: ['v0'],
  taggedNodes: {}
};

rendition.data = data;
```

### Angular Component with Full Typing

```ts
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
  ElementRef
} from '@angular/core';
import type {
  GveSnapshotRendition,
  CharChainResult,
  GveRenditionSettings,
  CharNode,
  ChainOperationContextStep,
  CharChainOperation
} from '@myrmidon/gve-snapshot-rendition';
import { OperationType } from '@myrmidon/gve-snapshot-rendition';

@Component({
  selector: 'app-typed-viewer',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<gve-snapshot-rendition #rendition></gve-snapshot-rendition>`
})
export class TypedViewerComponent {
  @ViewChild('rendition') renditionRef!: ElementRef<GveSnapshotRendition>;

  ngAfterViewInit() {
    const rendition = this.renditionRef.nativeElement;

    // All typed!
    const nodes: CharNode[] = this.stringToNodes('Hello');
    const operation: CharChainOperation = this.createOperation();
    const step: ChainOperationContextStep = this.createStep(operation);
    const data: CharChainResult = this.createData([step], nodes);
    const settings: Partial<GveRenditionSettings> = this.createSettings();

    rendition.data = data;
    rendition.settings = settings;
  }

  private stringToNodes(text: string): CharNode[] {
    return Array.from(text).map((char, index) => ({
      id: index,
      index,
      label: `${index}`,
      data: char
    }));
  }

  private createOperation(): CharChainOperation {
    return {
      type: OperationType.addAfter,
      id: 'op1',
      at: 5,
      run: 1,
      value: ' world',
      inputTag: 'v0',
      outputTag: 'v1'
    };
  }

  private createStep(operation: CharChainOperation): ChainOperationContextStep {
    return {
      operation,
      inputTag: operation.inputTag!,
      outputTag: operation.outputTag!,
      featureSet: { features: [], nodeFeatures: {} },
      refNodeIds: [operation.at]
    };
  }

  private createData(
    steps: ChainOperationContextStep[],
    nodes: CharNode[]
  ): CharChainResult {
    return {
      text: nodes,
      steps,
      chainDump: steps.map(s => s.outputTag).join(' -> '),
      chainTags: ['v0', ...steps.map(s => s.outputTag)],
      taggedNodes: {
        v0: nodes
      }
    };
  }

  private createSettings(): Partial<GveRenditionSettings> {
    return {
      fontSize: 16,
      lineHeight: 1.5,
      charSpacing: 1
    };
  }
}
```

### Type-Safe Service

```ts
import { Injectable } from '@angular/core';
import type {
  CharChainResult,
  CharNode,
  ChainOperationContextStep,
  CharChainOperation,
  GveRenditionSettings
} from '@myrmidon/gve-snapshot-rendition';
import { OperationType, DEFAULT_SETTINGS } from '@myrmidon/gve-snapshot-rendition';

@Injectable({ providedIn: 'root' })
export class TypedSnapshotService {
  createNode(id: number, char: string): CharNode {
    return {
      id,
      index: id,
      label: `${id}`,
      data: char
    };
  }

  createOperation(config: {
    type: OperationType;
    id: string;
    at: number;
    value?: string;
  }): CharChainOperation {
    return {
      type: config.type,
      id: config.id,
      at: config.at,
      run: 1,
      value: config.value,
      inputTag: 'v0',
      outputTag: 'v1'
    };
  }

  getDefaultSettings(): GveRenditionSettings {
    return { ...DEFAULT_SETTINGS };
  }

  async loadFromApi(url: string): Promise<CharChainResult> {
    const response = await fetch(url);
    const data: CharChainResult = await response.json();
    return data;
  }
}
```

### Event Typing

```ts
import type { ChainOperationContextStep } from '@myrmidon/gve-snapshot-rendition';

// Define event detail interfaces
interface OperationSelectedDetail {
  operation: ChainOperationContextStep | null;
  versionTag: string;
}

interface VersionChangedDetail {
  versionTag: string;
  index: number;
}

// Use with typed event listeners
rendition.addEventListener(
  'operation-selected',
  (event: CustomEvent<OperationSelectedDetail>) => {
    const { operation, versionTag } = event.detail;
    if (operation) {
      console.log(`Operation ${operation.operation.id} selected in ${versionTag}`);
    }
  }
);

rendition.addEventListener(
  'version-changed',
  (event: CustomEvent<VersionChangedDetail>) => {
    const { versionTag, index } = event.detail;
    console.log(`Version changed to ${versionTag} (index: ${index})`);
  }
);
```

### Hint Designer Typing

```ts
import type {
  GveHintDesigner,
  HintDesignerData,
  HintDesignerSettings,
  OperationHint,
  RelativePosition
} from '@myrmidon/gve-snapshot-rendition';

const designer = document.querySelector<GveHintDesigner>('gve-hint-designer')!;

const hint: OperationHint = {
  svg: '<g><rect width="100" height="50" fill="blue"/></g>',
  position: 'e' as RelativePosition,
  offsetX: 0,
  offsetY: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  solid: false,
  animation: '#fadeIn'
};

const data: HintDesignerData = {
  hints: {
    'myHint': hint
  },
  animations: {
    'fadeIn': 'return gsap.from(hintEl, { opacity: 0 });'
  }
};

const settings: HintDesignerSettings = {
  hintDesignWidth: 300,
  hintDesignHeight: 100,
  debug: false
};

designer.data = data;
designer.settings = settings;
```

## Type Guards and Validators

Create type guards for runtime validation:

```ts
import type { CharChainResult, CharNode } from '@myrmidon/gve-snapshot-rendition';

function isCharNode(obj: any): obj is CharNode {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'number' &&
    typeof obj.index === 'number' &&
    typeof obj.label === 'string' &&
    typeof obj.data === 'string'
  );
}

function isCharChainResult(obj: any): obj is CharChainResult {
  return (
    typeof obj === 'object' &&
    Array.isArray(obj.steps) &&
    typeof obj.chainDump === 'string' &&
    Array.isArray(obj.chainTags) &&
    typeof obj.taggedNodes === 'object'
  );
}

// Usage
async function loadData(url: string): Promise<CharChainResult> {
  const response = await fetch(url);
  const data = await response.json();

  if (!isCharChainResult(data)) {
    throw new Error('Invalid CharChainResult data');
  }

  return data;
}
```

## Benefits of Type-Safe Integration

1. **Compile-time Safety**: Catch errors before runtime
2. **IDE Autocomplete**: Full IntelliSense support
3. **Refactoring Support**: Rename and find references work correctly
4. **Documentation**: Types serve as inline documentation
5. **Maintainability**: Easier to maintain and update code
6. **Reduced Bugs**: Fewer runtime type errors

## Common Patterns

### Optional Properties

Use `Partial<T>` for settings:

```ts
import type { GveRenditionSettings } from '@myrmidon/gve-snapshot-rendition';

const settings: Partial<GveRenditionSettings> = {
  fontSize: 18,
  // All other properties optional
};
```

### Extending Types

Create custom types based on exported ones:

```ts
import type { CharNode, OperationFeature } from '@myrmidon/gve-snapshot-rendition';

interface ExtendedCharNode extends CharNode {
  customProperty: string;
}

interface CustomOperationFeature extends OperationFeature {
  customMetadata: Record<string, any>;
}
```

### Union Types with Enums

```ts
import { OperationType } from '@myrmidon/gve-snapshot-rendition';

type TextOperationType =
  | OperationType.replace
  | OperationType.delete
  | OperationType.addBefore
  | OperationType.addAfter;

function isTextOperation(type: OperationType): type is TextOperationType {
  return type <= OperationType.addAfter;
}
```

## Best Practices

1. **Always use `import type`** for type-only imports
2. **Import enums as values** since they exist at runtime
3. **Use `Partial<T>`** for optional configuration objects
4. **Define event detail interfaces** for custom events
5. **Create type guards** for runtime validation
6. **Use strict TypeScript settings** in `tsconfig.json`
7. **Avoid `any`** - use proper types instead
8. **Document complex types** with JSDoc comments

## TypeScript Configuration

Recommended `tsconfig.json` settings:

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## Troubleshooting

### Type Errors with Custom Elements

If you get type errors with `ElementRef<GveSnapshotRendition>`, ensure you have:

1. Imported the type: `import type { GveSnapshotRendition } from '...'`
2. Added `CUSTOM_ELEMENTS_SCHEMA` to your component
3. Used `ElementRef` generic: `ElementRef<GveSnapshotRendition>`

### Cannot Find Type

If TypeScript can't find a type:

1. Check your import: `import type { ... } from '@myrmidon/gve-snapshot-rendition'`
2. Verify the package is installed: `npm list @myrmidon/gve-snapshot-rendition`
3. Check `node_modules/@myrmidon/gve-snapshot-rendition/dist/index.d.ts` exists

### Enum Import Issues

Enums must be imported as values, not types:

```ts
// ✅ Correct
import { OperationType } from '@myrmidon/gve-snapshot-rendition';

// ❌ Wrong
import type { OperationType } from '@myrmidon/gve-snapshot-rendition';
```

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Angular TypeScript Guide](https://angular.dev/guide/typescript-configuration)
- Package Source: See `src/index.ts` for all exported types
