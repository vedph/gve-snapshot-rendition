# Quick Reference Card

## Installation

```bash
npm install @myrmidon/gve-snapshot-rendition
```

## Vanilla HTML+JS

```html
<!DOCTYPE html>
<html>
<body>
  <gve-snapshot-rendition id="rendition"></gve-snapshot-rendition>

  <script type="module">
    import { GveSnapshotRendition } from '@myrmidon/gve-snapshot-rendition';

    const rendition = document.getElementById('rendition');
    rendition.data = {
      sources: [
        { id: 'v1', label: 'Version 1', text: 'Hello world' }
      ],
      operations: []
    };
  </script>
</body>
</html>
```

## Angular 21

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-demo',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<gve-snapshot-rendition #rendition></gve-snapshot-rendition>`
})
export class DemoComponent {
  @ViewChild('rendition') renditionRef!: ElementRef;

  ngAfterViewInit() {
    this.renditionRef.nativeElement.data = {
      sources: [{ id: 'v1', label: 'Version 1', text: 'Hello world' }],
      operations: []
    };
  }
}
```

## Common Operations

### Set Data

```js
rendition.data = { sources: [...], operations: [...] };
```

### Configure Settings

```js
rendition.settings = {
  showToolbar: true,
  enableAnimation: true,
  fontSize: 16
};
```

### Listen to Events

```js
rendition.addEventListener('operation-selected', (event) => {
  console.log(event.detail.operation);
});
```

### Export SVG

```js
const svg = rendition.exportSVG();
```

### Reset View

```js
rendition.resetView();
```

## TypeScript

```ts
import type {
  GveRenditionSettings,
  OperationHint
} from '@myrmidon/gve-snapshot-rendition';

const settings: Partial<GveRenditionSettings> = {
  showToolbar: true
};
```

## Package Scripts

```sh
pnpm build              # Build for production
pnpm test               # Run tests
pnpm watch              # Watch mode
pnpm start              # Dev server
pnpm run publish:public # Publish to NPM
```

## Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Publishing guide
- [INTEGRATION-VANILLA.md](INTEGRATION-VANILLA.md) - Vanilla JS integration
- [INTEGRATION-ANGULAR.md](INTEGRATION-ANGULAR.md) - Angular 21 integration
- [PUBLISHING.md](PUBLISHING.md) - Complete overview
