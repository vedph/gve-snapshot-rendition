# Integration Guide: Vanilla HTML + JavaScript

This guide shows how to integrate the `@myrmidon/gve-snapshot-rendition` web components into a vanilla HTML and JavaScript project.

- [Integration Guide: Vanilla HTML + JavaScript](#integration-guide-vanilla-html--javascript)
  - [Installation](#installation)
    - [Option 1: NPM/PNPM (with bundler)](#option-1-npmpnpm-with-bundler)
    - [Option 2: CDN (no build step)](#option-2-cdn-no-build-step)
    - [Option 3: Local File](#option-3-local-file)
  - [Basic Setup](#basic-setup)
    - [Step 1: Create HTML Structure](#step-1-create-html-structure)
    - [Step 2: Create JavaScript Module](#step-2-create-javascript-module)
  - [Using GveHintDesigner Component](#using-gvehintdesigner-component)
    - [TypeScript Support](#typescript-support)
  - [Troubleshooting](#troubleshooting)
    - [Component Not Rendering](#component-not-rendering)
    - [Module Import Errors](#module-import-errors)
    - [Data Not Displaying](#data-not-displaying)
    - [Styling Issues](#styling-issues)

## Installation

### Option 1: NPM/PNPM (with bundler)

If you're using a bundler like Webpack, Vite, or Rollup:

```bash
npm install @myrmidon/gve-snapshot-rendition
# or
pnpm add @myrmidon/gve-snapshot-rendition
```

### Option 2: CDN (no build step)

Use a CDN like `unpkg` or `jsdelivr` for quick prototyping:

```html
<script type="module">
  import { GveSnapshotRendition, GveHintDesigner } from 'https://unpkg.com/@myrmidon/gve-snapshot-rendition/dist/index.js';
</script>
```

### Option 3: Local File

Download the package and reference the local file:

```html
<script type="module" src="./node_modules/@myrmidon/gve-snapshot-rendition/dist/index.js"></script>
```

## Basic Setup

### Step 1: Create HTML Structure

Create an `index.html` file:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GVE Snapshot Rendition Demo</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    /* size the component */
    gve-snapshot-rendition {
      display: block;
      width: 100%;
      height: 600px;
      border: 1px solid #ccc;
      margin: 20px 0;
    }

    gve-hint-designer {
      display: block;
      width: 100%;
      height: 800px;
      border: 1px solid #ccc;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h1>GVE Snapshot Rendition Example</h1>

  <!-- web component -->
  <gve-snapshot-rendition id="rendition"></gve-snapshot-rendition>

  <!-- page code -->
  <script type="module" src="app.js"></script>
</body>
</html>
```

### Step 2: Create JavaScript Module

Create an `app.js` file:

```js
// import the web components
import {
  GveSnapshotRendition,
  GveHintDesigner,
  DEFAULT_SETTINGS
} from '@myrmidon/gve-snapshot-rendition';

// The components are automatically registered as custom elements
// when imported, so you can use them in HTML immediately.

// get reference to the component
const rendition = document.getElementById('rendition');

// create sample data
const sampleData = {
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
  operations: [
    {
      type: 'insert',
      sourceId: 'v2',
      position: 6,
      text: 'wonderful ',
      metadata: {
        author: 'User',
        timestamp: new Date().toISOString()
      }
    }
  ]
};

// optional: configure settings
rendition.settings = {
  ...DEFAULT_SETTINGS,
  showToolbar: true,
  enableAnimation: true
};

// set data
rendition.data = sampleData;

// listen to events
// Operation selected
rendition.addEventListener('operation-selected', (event) => {
  console.log('Selected operation:', event.detail.operation);
});

// Version changed
rendition.addEventListener('version-changed', (event) => {
  console.log('Changed to version:', event.detail.versionId);
});

// Animation complete
rendition.addEventListener('animation-complete', (event) => {
  console.log('Animation finished');
});
```

## Using GveHintDesigner Component

The hint designer is a specialized component for creating and testing operation hints.

```html
<gve-hint-designer id="designer"></gve-hint-designer>

<script type="module">
import { GveHintDesigner } from '@myrmidon/gve-snapshot-rendition';

const designer = document.getElementById('designer');

// set initial data
designer.data = {
  hints: {
    'hint1': {
      svgMarkup: '<circle cx="50" cy="50" r="20" fill="red"/>',
      animationJS: 'return Promise.resolve();',
      position: 'e',
      variables: {}
    }
  },
  animations: {}
};

// configure settings
designer.settings = {
  width: 800,
  height: 600
};

// listen to changes
designer.addEventListener('hint-updated', (event) => {
  console.log('Hint updated:', event.detail);
});

// get the designed hints
const hints = designer.data.hints;
</script>
```

### TypeScript Support

The package includes TypeScript declarations. Create a `.ts` file:

```typescript
import {
  GveSnapshotRendition,
  GveRenditionSettings,
  CharChainResult
} from '@myrmidon/gve-snapshot-rendition';

const rendition = document.getElementById('rendition') as GveSnapshotRendition;

const settings: Partial<GveRenditionSettings> = {
  showToolbar: true,
  enableAnimation: true
};

rendition.settings = settings;
```

## Troubleshooting

### Component Not Rendering

1. **Check imports:** Ensure the module is imported correctly
2. **Check HTML:** The custom element tag must be lowercase with a hyphen
3. **Check console:** Look for JavaScript errors
4. **Check size:** The component needs explicit width/height in CSS

### Module Import Errors

If using CDN and getting CORS errors:

```html
<script type="module" crossorigin src="..."></script>
```

### Data Not Displaying

1. **Check data structure:** Ensure data matches the expected format
2. **Check console:** Look for validation errors
3. **Use browser DevTools:** Inspect the component's properties

### Styling Issues

The components use Shadow DOM. To style internal elements, use CSS custom properties if available, or check the component's documentation for styling options.
