# Integration Guide: Vanilla HTML + JavaScript

This guide shows how to integrate the `@myrmidon/gve-snapshot-rendition` web components into a vanilla HTML and JavaScript project.

## Table of Contents

- [Installation](#installation)
- [Basic Setup](#basic-setup)
- [Using GveSnapshotRendition Component](#using-gvesnapshotrendition-component)
- [Using GveHintDesigner Component](#using-gvehintdesigner-component)
- [Complete Example](#complete-example)
- [Advanced Usage](#advanced-usage)
- [Troubleshooting](#troubleshooting)

## Installation

### Option 1: NPM/PNPM (with bundler)

If you're using a bundler like Webpack, Vite, or Rollup:

```bash
npm install @myrmidon/gve-snapshot-rendition
# or
pnpm add @myrmidon/gve-snapshot-rendition
```

### Option 2: CDN (no build step)

Use a CDN like unpkg or jsdelivr for quick prototyping:

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

    /* Size the component */
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

  <!-- The web component -->
  <gve-snapshot-rendition id="rendition"></gve-snapshot-rendition>

  <script type="module" src="app.js"></script>
</body>
</html>
```

### Step 2: Create JavaScript Module

Create an `app.js` file:

```javascript
// Import the web components
import {
  GveSnapshotRendition,
  GveHintDesigner,
  DEFAULT_SETTINGS
} from '@myrmidon/gve-snapshot-rendition';

// The components are automatically registered as custom elements
// when imported, so you can use them in HTML immediately

// Get reference to the component
const rendition = document.getElementById('rendition');

// Create sample data
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

// Set data
rendition.data = sampleData;

// Optional: Configure settings
rendition.settings = {
  ...DEFAULT_SETTINGS,
  showToolbar: true,
  enableAnimation: true
};
```

## Using GveSnapshotRendition Component

### Basic Usage

```html
<gve-snapshot-rendition id="rendition"></gve-snapshot-rendition>

<script type="module">
import { GveSnapshotRendition } from '@myrmidon/gve-snapshot-rendition';

const rendition = document.getElementById('rendition');

// Set data using the data property
rendition.data = {
  sources: [/* ... */],
  operations: [/* ... */]
};

// Listen to events
rendition.addEventListener('operation-selected', (event) => {
  console.log('Operation selected:', event.detail);
});
</script>
```

### Available Properties

```javascript
// Data
rendition.data = { sources: [], operations: [] };

// Settings
rendition.settings = {
  showToolbar: true,
  enableAnimation: true,
  fontSize: 16,
  // ... see full settings below
};

// Get current state
const currentData = rendition.data;
const currentSettings = rendition.settings;
```

### Available Methods

```javascript
// Reset zoom/pan
rendition.resetView();

// Export as SVG
const svgString = rendition.exportSVG();

// Trigger animation
rendition.animate();
```

### Settings Options

```javascript
const settings = {
  // Display
  showToolbar: true,
  showVersionsList: true,
  showDetails: true,

  // Rendering
  fontSize: 16,
  lineHeight: 1.5,
  charSpacing: 1,

  // Animation
  enableAnimation: true,
  animationDuration: 1000,

  // Colors (will be generated if not provided)
  colorPalette: null,

  // Custom buttons
  customButtons: [
    {
      id: 'export',
      label: 'Export',
      icon: 'download',
      action: (component) => {
        const svg = component.exportSVG();
        // ... handle export
      }
    }
  ]
};

rendition.settings = settings;
```

### Events

```javascript
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

// Set initial data
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

// Configure settings
designer.settings = {
  width: 800,
  height: 600
};

// Listen to changes
designer.addEventListener('hint-updated', (event) => {
  console.log('Hint updated:', event.detail);
});

// Get the designed hints
const hints = designer.data.hints;
</script>
```

## Complete Example

Here's a complete working example:

**index.html:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GVE Complete Example</title>
  <style>
    * { box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 20px;
      background: #f5f5f5;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    h1 {
      color: #333;
      margin-bottom: 10px;
    }

    .description {
      color: #666;
      margin-bottom: 30px;
    }

    .controls {
      margin-bottom: 20px;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 4px;
    }

    .controls button {
      margin-right: 10px;
      padding: 8px 16px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .controls button:hover {
      background: #0056b3;
    }

    gve-snapshot-rendition {
      display: block;
      width: 100%;
      height: 600px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .output {
      margin-top: 20px;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      max-height: 200px;
      overflow-y: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>GVE Snapshot Rendition Demo</h1>
    <p class="description">
      Interactive demonstration of text transformation visualization
    </p>

    <div class="controls">
      <button id="loadExample1">Load Example 1</button>
      <button id="loadExample2">Load Example 2</button>
      <button id="resetView">Reset View</button>
      <button id="animate">Animate</button>
      <button id="export">Export SVG</button>
    </div>

    <gve-snapshot-rendition id="rendition"></gve-snapshot-rendition>

    <div class="output" id="output">
      <strong>Console:</strong><br>
      Ready to load data...
    </div>
  </div>

  <script type="module" src="app.js"></script>
</body>
</html>
```

**app.js:**
```javascript
import {
  GveSnapshotRendition,
  DEFAULT_SETTINGS
} from '@myrmidon/gve-snapshot-rendition';

// Get DOM elements
const rendition = document.getElementById('rendition');
const output = document.getElementById('output');

// Helper function to log
function log(message) {
  const time = new Date().toLocaleTimeString();
  output.innerHTML += `<br>[${time}] ${message}`;
  output.scrollTop = output.scrollHeight;
}

// Example data 1: Simple text transformation
const example1 = {
  sources: [
    {
      id: 'original',
      label: 'Original Text',
      text: 'The quick brown fox jumps over the lazy dog'
    },
    {
      id: 'edited',
      label: 'Edited Text',
      text: 'The quick red fox leaps over the sleepy dog'
    }
  ],
  operations: [
    {
      type: 'replace',
      sourceId: 'edited',
      position: 10,
      length: 5,
      text: 'red',
      metadata: {
        author: 'Editor 1',
        timestamp: '2024-01-15T10:30:00Z',
        comment: 'Changed color'
      }
    },
    {
      type: 'replace',
      sourceId: 'edited',
      position: 18,
      length: 5,
      text: 'leaps',
      metadata: {
        author: 'Editor 2',
        timestamp: '2024-01-15T10:35:00Z',
        comment: 'More dynamic verb'
      }
    },
    {
      type: 'replace',
      sourceId: 'edited',
      position: 38,
      length: 4,
      text: 'sleepy',
      metadata: {
        author: 'Editor 1',
        timestamp: '2024-01-15T10:40:00Z',
        comment: 'Better adjective'
      }
    }
  ]
};

// Example data 2: More complex
const example2 = {
  sources: [
    {
      id: 'v1',
      label: 'Draft 1',
      text: 'Hello world'
    },
    {
      id: 'v2',
      label: 'Draft 2',
      text: 'Hello wonderful world!'
    }
  ],
  operations: [
    {
      type: 'insert',
      sourceId: 'v2',
      position: 6,
      text: 'wonderful ',
      metadata: {
        author: 'Author A',
        timestamp: '2024-01-15T09:00:00Z'
      }
    },
    {
      type: 'insert',
      sourceId: 'v2',
      position: 21,
      text: '!',
      metadata: {
        author: 'Author B',
        timestamp: '2024-01-15T09:05:00Z'
      }
    }
  ]
};

// Configure settings
rendition.settings = {
  ...DEFAULT_SETTINGS,
  showToolbar: true,
  enableAnimation: true,
  animationDuration: 1500
};

// Event listeners
rendition.addEventListener('operation-selected', (event) => {
  log(`Operation selected: ${event.detail.operation?.type || 'none'}`);
});

rendition.addEventListener('version-changed', (event) => {
  log(`Version changed: ${event.detail.versionId}`);
});

// Button handlers
document.getElementById('loadExample1').addEventListener('click', () => {
  rendition.data = example1;
  log('Loaded Example 1');
});

document.getElementById('loadExample2').addEventListener('click', () => {
  rendition.data = example2;
  log('Loaded Example 2');
});

document.getElementById('resetView').addEventListener('click', () => {
  rendition.resetView();
  log('View reset');
});

document.getElementById('animate').addEventListener('click', () => {
  rendition.animate();
  log('Animation triggered');
});

document.getElementById('export').addEventListener('click', () => {
  const svg = rendition.exportSVG();
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'snapshot-rendition.svg';
  a.click();
  URL.revokeObjectURL(url);
  log('SVG exported');
});

// Load initial example
rendition.data = example1;
log('Initial data loaded');
```

## Advanced Usage

### Using with a Module Bundler (Vite Example)

1. **Install dependencies:**
```bash
npm create vite@latest my-gve-app -- --template vanilla
cd my-gve-app
npm install
npm install @myrmidon/gve-snapshot-rendition
```

2. **Update main.js:**
```javascript
import { GveSnapshotRendition } from '@myrmidon/gve-snapshot-rendition';
import './style.css';

document.querySelector('#app').innerHTML = `
  <div>
    <h1>GVE Snapshot Rendition</h1>
    <gve-snapshot-rendition id="rendition"></gve-snapshot-rendition>
  </div>
`;

const rendition = document.querySelector('#rendition');
rendition.data = {
  // your data
};
```

3. **Run:**
```bash
npm run dev
```

### Dynamic Data Loading

```javascript
// Load data from API
async function loadSnapshotData() {
  try {
    const response = await fetch('/api/snapshot/123');
    const data = await response.json();
    rendition.data = data;
    log('Data loaded from API');
  } catch (error) {
    log(`Error: ${error.message}`);
  }
}

// Load on button click or page load
loadSnapshotData();
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

### Performance Issues

For large datasets:
- Disable animations: `settings.enableAnimation = false`
- Reduce font size: `settings.fontSize = 12`
- Limit visible operations

## Resources

- NPM Package: https://www.npmjs.com/package/@myrmidon/gve-snapshot-rendition
- TypeScript Declarations: Included in the package
- Examples: See the `examples/` directory in the repository

## Support

For issues and questions:
- GitHub Issues: [Repository URL]
- Documentation: [Documentation URL]
