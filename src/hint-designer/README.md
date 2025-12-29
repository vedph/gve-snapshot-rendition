# GVE Hint Designer Component

_A minimalist standard W3C custom web component for designing and testing operation hints for the GVE Snapshot Rendition component._

- [GVE Hint Designer Component](#gve-hint-designer-component)
  - [Usage](#usage)
    - [Editing Hints](#editing-hints)
    - [Using Placeholders in SVG](#using-placeholders-in-svg)
    - [Drawing SVG](#drawing-svg)
    - [Testing Animations](#testing-animations)
    - [Saving Locally](#saving-locally)
  - [Integrating Designer in an HTML Page](#integrating-designer-in-an-html-page)

The Hint Designer is a companion tool to the main `gve-snapshot-rendition` component that allows users to:

- design hints visually with SVG code;
- create and test GSAP-based animations;
- manage hint variables for placeholder resolution;
- save/load hint data to/from JSON files.

You can use it [directly into your static HTML page](#integrating-designer-in-an-html-page), or embed it into more complex code.

## Usage

The hint designer UI has these main panels (from top to bottom):

- **toolbar**: the main toolbar with all the most important controls for editing hints.
- **SVG visualization**: the visualization of the SVG hint you are editing. You can zoom using the buttons in the toolbar, or the mouse wheel. You can pan by dragging with the mouse.
- **animation timeline player**: use the play button to play the enter animation for the SVG being edited. You can use the slider next to it to look at the animation as it unwinds towards its end, going forward or backward and pausing at any point along it.
- **hint properties**: the metadata of the hint, plus its SVG and JS code. This is where you effectively edit the hint.
- **hint variables**: the variables you define for previewing hints. Many hints in their SVG code use placeholder variables between `{{` and `}}`, like in `<line x1="0" y1="0" x2="300" y2="100" stroke="{{r_fore-color}}" stroke-width="2" />`; in this case, you can define the `r_fore-color` variable value in this panel. Typically you define here all the variables for all of your hints. This data is volatile, and is used only to allow displaying the hints in the SVG visualization. For instance, we will require to set `r_fore-color` to `red` to see the hint drawn.

In general:

1. **start simple**: create a basic hint first, then add animations and placeholders.
2. **use the catalog**: create reusable animations for common effects (fade, slide, etc.).
3. **test early**: use the timeline player frequently while developing animations.
4. **save often**: use the Save data button to backup your work regularly.

### Editing Hints

In the hint properties, you edit all the properties of the hint being edited:

- **position**: the relative position of the hint (default is `o`=origin).
- **offset X** and **offset Y**: the optional offsets (positive or negative) to shift the hint's position accordingly. Default is 0.
- **scale X** and **scale Y**: the optional scale ratio for resizing the hint. Default is 1 (=no scaling).
- **rotation**: the optional rotation in degrees (positive or negative) for the hint. Default is 0 (=no rotation).
- **solid**: enable solid behavior for the hint.
- **displaced ref span**: a default reference span for displacing hints. This is rarely used, unless you want to always position a hint e.g. with reference with the initial character(s) of your base text.
- **SVG**: the SVG code for your hint. This can be any SVG, provided that it is always included in a single, root `g` element. For instance:

```xml
<g>
  <line x1="0" y1="0" x2="300" y2="100" stroke="{{r_fore-color}}" stroke-width="2" />
</g>
```

>This hint's SVG code wraps in a `g` element (required) a single line in a designer whose canvas size is 300x100. Thus it represents a diagonal line from the top left to the bottom right of the canvas rectangle.

- **animation**: the animation panel contains the JS code fragment for the enter animation for the hint. Unless you are creating an ad-hoc animation for the hint being edited ("embedded JS"), this is usually drawn from a set of available animations.

The JS code follows this template, where you can assume two variables are defined: `targetEl` is the target element of the animation, i.e. the root `g` element of the hint; `gsap` is the [GSAP](https://gsap.com) object used for animating it:

```js
return new Promise(resolve => {
  // targetEl is the animation's target element
  // gsap is the GSAP object
});
```

For instance, this is a simple fade-in animation:

```js
return new Promise(resolve => {
  gsap.fromTo(targetEl,
    { opacity: 0 },
    { opacity: 1, duration: 2, onComplete: resolve }
  );
});
```

>This code wraps the animation in a `Promise` object which is returned to the consumer code. This is required by the rendition engine architecture. Inside the promise, it uses `gsap` to animate the target element's opacity from 0 (=invisible) to 1 (=fully visible) in 2 seconds. Remember to call resolve on complete by adding `onComplete: resolve`.

👉 This UI is designed so that it reflects the fact that animations depend on hints, i.e. are selected by them. Besides, you can't design and test an animation without having a hint to apply it to. So, this is the logic when you **save an animation**:

- if `embedded JS` is checked, the JS code is saved as the embedded JS for that hint only.
- otherwise:
  - if the hint's animation control value does not start with `#` the animation's code is saved into the data's `animations` array with an ID equal to the selected animation in the animations list dropdown (when the "new animation" is off). If `new animation` is on, you will be prompted for a new ID for that animation's code.
  - else, just save the animation control value into the hint's animation property as a reference (`#` followed by hint). Just ensure that `#` is followed by some identifier, else show an error in the messages pane asking to add an identifier after the `#`.

So, in practice:

- 💡 to **create a new catalog animation**:

1. select or create a hint.
2. **uncheck** "embedded JS".
3. **check** "new animation".
4. write your GSAP animation code in the JS textarea.
5. click **Save**.
6. when prompted, enter an ID for the new animation (e.g., `fade-in`).

- 💡 to **update a catalog animation**:

1. select or create a hint.
2. **uncheck** "embedded JS".
3. **uncheck** "new animation".
4. select an animation from the dropdown.
5. click the **Load animation code** button (⬇) to load its code.
6. modify the animation code in the JS textarea.
7. click **Save** and confirm.

⚠️ Warning: updating a catalog animation affects all hints using it!

- 💡 to **use a catalog animation** in a hint:

1. select or create a hint.
2. **uncheck** "embedded JS".
3. in the JS textarea, type `#` followed by the animation ID (e.g. `#fade-in`).
4. click **Save**.

- 💡 to **copy animation code** between animations:

1. select an animation from the dropdown.
2. click the **load animation code** button (⬇).
3. the code appears in the JS textarea.
4. modify it as needed.
5. either:
   - **check "new animation"** and save with a new ID, OR
   - **select a different animation** from the dropdown and save to update it.

💡 **Tip**: the dropdown works even when "embedded JS" is checked, so you can copy animation code to use as embedded JS.

### Using Placeholders in SVG

Placeholders allow you to reuse hints with different values, derived from operation features with the same name, or set via the `r_hint-vars` rendition feature.

1. In your SVG code, use `{{variable_name}}` syntax:

   ```xml
   <g>
     <rect fill="{{r_fore-color}}" x="0" y="0" width="100" height="50"/>
     <text x="50" y="25">{{note}}</text>
   </g>
   ```

2. in the **Hint Variables** panel:
   - click **Add** (➕).
   - enter the variable name (e.g., `r_fore-color`).
   - click **Edit** (✏️) to set its value (e.g., `red`).

3. click **Refresh** to see the resolved SVG.

### Drawing SVG

The hint designer is not an SVG editor; it is rather a tool to integrate your SVG drawings into the GVE snapshot rendition engine by providing a development environment. While you can easily draw trivial hints like a diagonal line by directly coding them, in case of more elaborated drawings you should rather use an SVG editor.

Here are some suggestions to use the popular freeware [InkScape](https://inkscape.org) SVG editor for drawing and then import SVG code into a hint:

1. open `File/Document Properties` and set display units to `px` and a custom size equal to that of your hint (e.g. 300 x 100).
2. draw your hint.
3. optionally, convert everything into a group by selecting all (Ctrl+A) and grouping (Ctrl+G). Or you can just wrap the SVG code later into a single `g` element.
4. open `File/Save As` and save as plain SVG.

💡 If you want your drawing to exactly **fit** the canvas:

1. select all (Ctrl+A).
2. `Object/Align and Distribute` (Ctrl+Shift+A): in the Align section set relative to `Page` and click `Center on vertical axis` and `Center on horizontal axis`.
3. with everything still selected, in the top toolbar set `W` and `H` fields to the size of your canvas (disable the lock icon to stretch and fix exactly if this is what you want).

>The canvas size for all your hints is defined by the HTML page hosting the hint designer. In the above example, it is 300x100.

### Testing Animations

1. load or create a hint with an animation.
2. use the **Timeline Player** controls:
   - ▶ **Play**: Start the animation.
   - ⏸ **Pause**: Pause at current position.
   - ⏮ **Restart**: Reset and play from beginning.
   - **Progress bar**: Click or drag to scrub through the animation.
3. adjust your animation code as needed.
4. click **Refresh** (↻) or **Save** to see changes.

### Saving Locally

At any time, whether you are integrating the designer into a more complex UI and workflow or just using it directly, you can save or load your data using local files.

To save:

1. click the **Save data** button (📥) in the toolbar.
2. a JSON file (`hint-designer-data.json`) will download. This file contains all hints and animations.

To load:

1. click the **Load data** button (📤) in the toolbar.
2. select your JSON file. All hints and animations will be loaded.

The component saves/loads data in JSON format, e.g.:

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

---

## Integrating Designer in an HTML Page

- 📁 **HTML**:

```html
<!DOCTYPE html>
<html>
  <head>
    <script type="module" src="./dist/index.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  </head>
  <body>
    <gve-hint-designer id="designer"></gve-hint-designer>
  </body>
</html>
```

- 📁 **JS**:

```js
const designer = document.getElementById('designer');

// set settings
// interface HintDesignerSettings {
//   hintDesignWidth: number; // Width of SVG design area
//   hintDesignHeight: number; // Height of SVG design area
//   debug: boolean; // Debug mode
// }
designer.settings = {
  hintDesignWidth: 300,
  hintDesignHeight: 100,
  debug: true,
};

// set data (hints and animations)
// interface HintDesignerData {
//   hints: Record<string, OperationHint>;
//   animations: Record<string, string>;
// }
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

// set hint variables if required
designer.hintVariables = [
  { name: "r_fore-color", value: "red" },
  { name: "note", value: "Test" },
];

// you can select a hint to edit with:
// designer.hintId = "my-hint";

// listen for events
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
