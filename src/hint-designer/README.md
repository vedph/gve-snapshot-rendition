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

## How-To Guides

### Creating Your First Hint

1. Click the **Add** button (➕) in the toolbar
2. Enter a unique ID for your hint (e.g., `diagonal-stroke`)
3. Edit the hint properties in the properties panel
4. Write your SVG code in the SVG textarea (must start with `<g>`)
5. Click **Save** to save your hint
6. The SVG will appear in the preview area

**Example SVG for a diagonal line:**
```xml
<g>
  <line x1="0" y1="0" x2="100" y2="50" stroke="red" stroke-width="2"/>
</g>
```

### Working with Animations

There are **three ways** to add animations to hints:

#### Option 1: Embedded Animation (Hint-Specific)

Use this when the animation is unique to this hint.

1. Select or create a hint
2. **Check** the "embedded JS" checkbox
3. Write your GSAP animation code in the JS textarea
4. Click **Save**

**Example embedded animation:**
```javascript
return new Promise(resolve => {
  gsap.fromTo(targetEl,
    { opacity: 0, scale: 0.5 },
    { opacity: 1, scale: 1, duration: 0.5, onComplete: resolve }
  );
});
```

#### Option 2: Create a New Catalog Animation

Use this to create a reusable animation that can be shared across multiple hints.

1. Select or create a hint
2. **Uncheck** "embedded JS"
3. **Check** "new animation"
4. Write your GSAP animation code in the JS textarea
5. Click **Save**
6. When prompted, enter an ID for the new animation (e.g., `fade-in`)
7. The animation is saved to the catalog and can now be used by other hints

#### Option 3: Update an Existing Catalog Animation

Use this to modify an animation that's already in the catalog.

1. Select or create a hint
2. **Uncheck** "embedded JS"
3. **Uncheck** "new animation"
4. Select an animation from the dropdown
5. Click the **Load animation code** button (⬇) to load its code
6. Modify the animation code in the JS textarea
7. Click **Save**
8. Confirm when prompted that you want to update the catalog animation

⚠️ **Warning**: Updating a catalog animation affects all hints using it!

### Using a Catalog Animation in a Hint

1. Select or create a hint
2. **Uncheck** "embedded JS"
3. In the JS textarea, type `#` followed by the animation ID
   - Example: `#fade-in`
4. Click **Save**

The hint will now use the animation from the catalog.

### Testing Animations

1. Load or create a hint with an animation
2. Use the **Timeline Player** controls:
   - ▶ **Play**: Start the animation
   - ⏸ **Pause**: Pause at current position
   - ⏮ **Restart**: Reset and play from beginning
   - **Progress bar**: Click or drag to scrub through the animation
3. Adjust your animation code as needed
4. Click **Refresh** (↻) or **Save** to see changes

### Using Placeholders in SVG

Placeholders allow you to reuse hints with different values.

1. In your SVG code, use `{{variable_name}}` syntax:
   ```xml
   <g>
     <rect fill="{{r_fore-color}}" x="0" y="0" width="100" height="50"/>
     <text x="50" y="25">{{note}}</text>
   </g>
   ```

2. In the **Hint Variables** panel:
   - Click **Add** (➕)
   - Enter the variable name (e.g., `r_fore-color`)
   - Click **Edit** (✏️) to set its value (e.g., `red`)

3. Click **Refresh** to see the resolved SVG

### Copying Animation Code Between Animations

1. Select an animation from the dropdown
2. Click the **Load animation code** button (⬇)
3. The code appears in the JS textarea
4. Modify it as needed
5. Either:
   - **Check "new animation"** and save with a new ID, OR
   - **Select a different animation** from the dropdown and save to update it

💡 **Tip**: The dropdown works even when "embedded JS" is checked, so you can copy animation code to use as embedded JS.

### Loading and Saving Your Work

#### Save to File
1. Click the **Save data** button (📥) in the toolbar
2. A JSON file (`hint-designer-data.json`) will download
3. This file contains all hints and animations

#### Load from File
1. Click the **Load data** button (📤) in the toolbar
2. Select your JSON file
3. All hints and animations will be loaded

#### Clear Everything
1. Click the **Clear data** button (🗑️) in the toolbar
2. Confirm the action
3. All hints and animations will be deleted (use with caution!)

### Common Workflows

#### Creating a Hint Library
1. Create multiple hints for different operation types
2. Create reusable animations in the catalog
3. Link hints to catalog animations using `#animation-id`
4. Save to JSON file for backup
5. Share the JSON file with your team

#### Designing Multiple Variations
1. Create a base hint
2. Use placeholders for colors, text, etc.
3. Define different variable sets for different scenarios
4. Test each variation with the variables panel

#### Animation Development Cycle
1. Create a simple hint for testing
2. Write animation code with "embedded JS" checked
3. Test with the timeline player
4. When satisfied, **uncheck "embedded JS"** and **check "new animation"**
5. Save to add it to the catalog
6. Now it can be reused by other hints

### Troubleshooting

#### "SVG must start with &lt;g&gt; element"
Your SVG code must have a root `<g>` element. Wrap your content:
```xml
<g>
  <!-- your SVG elements here -->
</g>
```

#### "Animation value cannot start with # when 'embedded JS' is checked"
You have a reference (`#animation-id`) but "embedded JS" is checked. Either:
- **Uncheck "embedded JS"** to use the catalog animation, OR
- **Replace the reference** with actual JS code

#### "No animation selected"
You have JS code (not a reference) but no animation is selected from the dropdown. Either:
- **Select an animation** from the dropdown to update it, OR
- **Check "embedded JS"** to save as embedded animation, OR
- **Check "new animation"** to create a new catalog animation

#### Animation is not playing
- Check that the animation code returns a Promise
- Check that `resolve` is called when animation completes
- Look for JavaScript errors in the message panel
- Verify GSAP is loaded (should be available globally)

#### Variables not resolving
- Check that variable names in `{{...}}` match exactly (case-sensitive)
- Ensure variables are defined in the Variables panel
- Click **Refresh** after changing variables

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

## Quick Tips

1. **Start Simple**: Create a basic hint first, then add animations and placeholders
2. **Use the Catalog**: Create reusable animations for common effects (fade, slide, etc.)
3. **Test Early**: Use the timeline player frequently while developing animations
4. **Save Often**: Use the Save data button to backup your work regularly
5. **Animation Template**: When loading a hint with a missing animation reference, a template is automatically provided
6. **Message Panel**: Always check the message panel for helpful error messages and guidance

For detailed instructions, see the [How-To Guides](#how-to-guides) section above.
