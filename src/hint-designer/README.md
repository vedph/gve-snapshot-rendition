# GVE Hint Designer Component

A minimalist web component for designing and testing operation hints for the GVE Snapshot Rendition component.

## Overview

The Hint Designer is a companion tool to the main `gve-snapshot-rendition` component that allows users to:

- Design hints visually with SVG code
- Create and test GSAP-based animations
- Manage hint variables for placeholder resolution
- Save/load hint data to/from JSON files

## Usage

### Basic Setup

```html
<!DOCTYPE html>
<html>
  <head>
    <script type="module" src="./dist/index.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  </head>
  <body>
    <gve-hint-designer></gve-hint-designer>
  </body>
</html>
```

### JavaScript API

```js
const designer = document.querySelector("gve-hint-designer");

// Set settings
designer.settings = {
  hintDesignWidth: 300,
  hintDesignHeight: 100,
  debug: true,
};

// Set data (hints and animations)
designer.data = {
  hints: {
    "my-hint": {
      svg: '<g><line x1="0" y1="0" x2="300" y2="100" stroke="red" /></g>',
      position: "o",
      offsetX: 0,
      offsetY: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      solid: false,
      animation: "#fade-in",
    },
  },
  animations: {
    "fade-in": `
      return new Promise(resolve => {
        gsap.fromTo(targetEl,
          { opacity: 0 },
          { opacity: 1, duration: 0.5, onComplete: resolve }
        );
      });
    `,
  },
};

// Set hint variables
designer.hintVariables = [
  { name: "r_fore-color", value: "red" },
  { name: "note", value: "Test" },
];

// Select a hint to edit
designer.hintId = "my-hint";

// Listen for events
designer.addEventListener("dataChange", (e) => {
  console.log("Data changed:", e.detail.data);
});

designer.addEventListener("hintIdChange", (e) => {
  console.log("Selected hint:", e.detail.hintId);
});

designer.addEventListener("hintVariablesChange", (e) => {
  console.log("Variables:", e.detail.hintVariables);
});
```

## Component Properties

### `data` (HintDesignerData)

Object containing hints and animations:

```typescript
interface HintDesignerData {
  hints: Record<string, OperationHint>;
  animations: Record<string, string>;
}
```

### `settings` (HintDesignerSettings)

Component settings:

```typescript
interface HintDesignerSettings {
  hintDesignWidth: number; // Width of SVG design area
  hintDesignHeight: number; // Height of SVG design area
  debug: boolean; // Debug mode
}
```

### `hintId` (string | undefined)

ID of the currently selected hint for editing.

### `hintVariables` (StringPair[])

Array of variable definitions for resolving placeholders in hints:

```typescript
interface StringPair {
  name: string;
  value: string;
}
```

## Events

- **`dataChange`**: Fired when data changes (hint saved, data loaded/cleared).
- **`hintIdChange`**: Fired when selected hint changes.
- **`hintVariablesChange`**: Fired when hint variables change.

## Features

### Toolbar

- **Refresh**: Redraw the SVG display.
- **Add**: Create a new hint.
- **Hints dropdown**: Select a hint to edit.
- **Save**: Save the current hint.
- **Delete**: Delete the selected hint.
- **Zoom controls**: Zoom in/out/reset the SVG display.
- **Data controls**: Save/load/clear all data.

### SVG Display

Visual preview of the current hint with zoom and pan support.

### Timeline Player

Controls for playing, pausing, and restarting hint animations:

- Play button
- Pause button
- Restart button
- Progress bar (seekable)

### Message Panel

Displays status messages and errors.

### Hint Properties Editor

Edit all hint properties:

- Position (dropdown with all RelativePosition values)
- Offset X/Y (numeric or proportional: "0.5th", "0.5tw")
- Scale X/Y
- Rotation
- Solid (checkbox)
- Displaced Ref Span
- SVG code (textarea)
- Animation (embedded JS or referenced from catalog)

### Hint Variables

Manage name-value pairs for resolving `{{placeholder}}` variables in SVG code.

## Running the Designer

Use the npm script to start the designer:

```bash
pnpm run start:designer
```

This will build the component and open the hint designer in your browser.

## Data Format

The component saves/loads data in JSON format:

```json
{
  "hints": {
    "hint-id": {
      "svg": "<g>...</g>",
      "position": "o",
      "offsetX": 0,
      "offsetY": 0,
      "scaleX": 1,
      "scaleY": 1,
      "rotation": 0,
      "solid": false,
      "animation": "#animation-id"
    }
  },
  "animations": {
    "animation-id": "return new Promise(resolve => { ... });"
  }
}
```

## Tips

1. **Placeholder Resolution**: Use `{{variable_name}}` in SVG code, then define variables in the Variables panel
2. **Animation Code**: Must return a Promise that resolves when animation completes
3. **Embedded vs Referenced**: Use embedded JS for hint-specific animations, referenced for shared animations
4. **Error Handling**: Errors prevent saving but allow continued editing
5. **SVG Root**: SVG code must have `<g>` as root element
