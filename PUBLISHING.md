# Publishing and Integration Overview

This document provides an overview of the deployment and integration guides for the `@myrmidon/gve-snapshot-rendition` package. This is an ES Module with TypeScript declarations.

## Overview

The `@myrmidon/gve-snapshot-rendition` package provides two custom web components:

1. **gve-snapshot-rendition** - Main component for rendering interactive text transformations.
2. **gve-hint-designer** - Component for designing and testing operation hints.

## Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - How to publish to NPM
- **[INTEGRATION-VANILLA.md](INTEGRATION-VANILLA.md)** - Integration without frameworks
- **[INTEGRATION-ANGULAR.md](INTEGRATION-ANGULAR.md)** - Integration with Angular 21
- **[TYPESCRIPT-INTEGRATION.md](TYPESCRIPT-INTEGRATION.md)** - TypeScript types reference
- **[QUICK-REFERENCE.md](QUICK-REFERENCE.md)** - Quick reference card

## Quick Start

(1) install in your project:

```sh
npm install @myrmidon/gve-snapshot-rendition
# or
pnpm add @myrmidon/gve-snapshot-rendition
```

(2) import and use according to your project type:

- **Vanilla HTML+JS:**

```js
import { GveSnapshotRendition } from '@myrmidon/gve-snapshot-rendition';

const rendition = document.querySelector('gve-snapshot-rendition');
rendition.data = { sources: [...], operations: [...] };
```

See [INTEGRATION-VANILLA.md](INTEGRATION-VANILLA.md) for more.

- **Angular:**

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<gve-snapshot-rendition></gve-snapshot-rendition>`
})
export class MyComponent {}
```

See [INTEGRATION-ANGULAR.md](INTEGRATION-ANGULAR.md) for more.

## Package Structure

```txt
@myrmidon/gve-snapshot-rendition/
├── dist/
│   ├── index.js              # ES Module bundle
│   ├── index.d.ts            # TypeScript declarations
│   ├── index.cjs.min.js      # CommonJS bundle (minified)
│   └── ...
├── README.md
└── LICENSE
```

## Exported Components

### GveSnapshotRendition

Main component for rendering text transformations.

```typescript
import { GveSnapshotRendition } from '@myrmidon/gve-snapshot-rendition';
```

- **properties**:
  - `data`: Snapshot data (sources + operations)
  - `settings`: Component settings
- **methods**:
  - `resetView()`: Reset zoom/pan
  - `exportSVG()`: Export as SVG string
  - `animate()`: Trigger animation
- **events**:
  - `operation-selected`: When an operation is selected
  - `version-changed`: When version changes
  - `animation-complete`: When animation finishes

### GveHintDesigner

Component for designing operation hints.

```typescript
import { GveHintDesigner } from '@myrmidon/gve-snapshot-rendition';
```

- **properties**:
  - `data`: Hint designer data (hints + animations)
  - `settings`: Designer settings
- **events**:
  - `hint-updated`: When a hint is modified.

## Exported Types

```typescript
import type {
  // Settings
  GveRenditionSettings,
  CustomButtonSettings,
  HintDesignerSettings,

  // Models
  Feature,
  OperationFeature,
  CharChainResult,
  OperationHint,

  // Data
  HintDesignerData,
  StringPair,

  // Enums
  FeatureSetPolicy,
  OperationType,

  // Other
  RelativePosition
} from '@myrmidon/gve-snapshot-rendition';
```

## Exported Constants

```typescript
import {
  DEFAULT_SETTINGS,
  DEFAULT_HINT_DESIGNER_SETTINGS
} from '@myrmidon/gve-snapshot-rendition';
```

## Dependencies

The package bundles all its dependencies, so consumers don't need to install them separately:

- `fast-diff` - Text diffing
- `feather-icons` - Icon library
- `gsap` - Animation library
- `highlight.js` - Syntax highlighting
- `svg-pan-zoom` - SVG pan/zoom functionality

## Browser Compatibility

The components work in all modern browsers that support:

- ES2020
- Custom Elements v1
- Shadow DOM v1
- ES Modules

**Supported Browsers:**

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+

## Development Workflow

### For Package Maintainers

```sh
# Install dependencies
pnpm install

# Development with watch mode
pnpm watch

# Run tests
pnpm test

# Run with live server
pnpm start

# Build for production
pnpm build

# Publish to NPM
pnpm run publish:public
```

### For Package Consumers

```sh
# Install package
npm install @myrmidon/gve-snapshot-rendition

# Import and use in your code
import { GveSnapshotRendition } from '@myrmidon/gve-snapshot-rendition';
```

## Testing the Package Locally

Before publishing, test the package locally:

### Method 1: npm link

```sh
# In the package directory
npm link

# In your test project
npm link @myrmidon/gve-snapshot-rendition
```

### Method 2: Local file

```sh
# In your test project
npm install /path/to/gve-snapshot-rendition
```

### Method 3: Packed tarball

```sh
# In the package directory
npm pack

# In your test project
npm install /path/to/myrmidon-gve-snapshot-rendition-0.0.1.tgz
```

## Troubleshooting

### Common Publishing Issues

**Authentication failed:**

```sh
npm logout
npm login
```

**Version already exists:**

```sh
npm version patch  # Increment version
pnpm run publish:public
```

**Build failures:**

```sh
# Clear dist and rebuild
rm -rf dist
pnpm build
```

### Common Integration Issues

**Custom element not recognized (Angular):**

- Add `CUSTOM_ELEMENTS_SCHEMA` to component

**Component not rendering:**

- Ensure explicit width/height in CSS
- Check browser console for errors

**TypeScript errors:**

- Use type assertions: `as any`
- Import types: `import type { ... }`

## Support and Resources

- **Package Issues**: [GitHub Issues URL]
- **Documentation**: See individual integration guides
- **NPM Package**: <https://www.npmjs.com/package/@myrmidon/gve-snapshot-rendition>
- **Examples**: Check the integration guides for complete examples
