# GVE Hint Designer Component

_A minimalist standard W3C custom web component for designing and testing operation hints for the GVE Snapshot Rendition component._

- [GVE Hint Designer Component](#gve-hint-designer-component)
  - [Usage](#usage)
    - [Editing Hints](#editing-hints)
    - [Using Placeholders in SVG](#using-placeholders-in-svg)
    - [Drawing SVG](#drawing-svg)
      - [Drawing](#drawing)
      - [Creating a Template](#creating-a-template)
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

1. **keep it simple**: create a basic hint first, using placeholders wherever this could be useful to make it more reusable (e.g. for changing its color), and pick an animation for each. As for its appearance, the hint is a symbolic visual approximation, mostly designed for reuse, and typically displayed at small size; so keep it simple and readable. Also remember that hints will be stretched to fit the RBR, so draw and configure them accordingly.
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

>This hint's SVG code wraps in a `g` element (required) a single line in a designer whose canvas size is 300x100 (this is set via the web component's settings in the host page). Thus it represents a diagonal line from the top left to the bottom right of the canvas rectangle.

Hint content can also have these special elements:

- a **handle** element with `id`=`handle`. This represents the "handle" for the SVG code, i.e. the point in it which is used as _the reference for positioning it_. If there is no such handle element, then the component just uses the _bounding rectangle_ for the whole SVG (i.e. its root `g` element, which is always present). Often, in the hint SVG code the handle element has opacity=0 so it is not visible; but this is up to the SVG code you get from the hint. Anyway, the setting `showHintHandles` can force such hidden handles to be displayed setting their opacity to 1 for diagnostic purposes.
- a **placeholder** element with `id`=`placeholder`. This is usually an SVG shape, like a rectangle including a `text` SVG element which represents the text to draw, or directly a `text` element. Whatever the placeholder element is, in the end it either is a `text` element, or it contains a `text` element. This text element has this behavior:
  - its _text value_ is resolved at runtime: in the hint SVG, it is just the _name of the variable_ containing the text. This is equal to the name of a _feature_ which is supposed to be provided by the same operation the hints belongs to (usually, this is the `note` feature).
  - as for its _size_:
    - when the hint's placeholder element has a `class` attribute equal to `fit`, the text's size is calculated so that its content fits the container element with the `placeholder` ID. For instance, the SVG code of the hint might represent a callout for insertion, where the balloon is a rectangle with id=`placeholder`, and the line ends into the handle point. This way, the text being added will appear inside the balloon. So, here the text must fit into the container.
    - else, the text value and the settings for drawing it determine the resulting size of `text`. This implies that all the SVG elements containing this `text` element, including the root `g` element, must scale to fit it inside them. So, this is the inverse case with reference to the default one: here the container must fit the text.

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

For GSAP, see:

- [GSAP Documentation](https://greensock.com/docs/).
- [DrawSVG Plugin](https://greensock.com/docs/v3/Plugins/DrawSVGPlugin): plugin for animating SVG.

👉 The animations UI is designed so that it reflects the fact that animations depend on hints, i.e. are selected by them. Besides, you can't design and test an animation without having a hint to apply it to. So, this is the logic when you **save an animation**:

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

Here are some suggestions to use the popular freeware [InkScape](https://inkscape.org) SVG editor for drawing and then import SVG code into a hint.

#### Drawing

1. open `File/Document Properties` (Ctrl+Shift+D) and set:

    - both display units to `px`.
    - page scale = `1.0`.
    - custom size equal to that of your hint (e.g. 300 x 100).

2. draw your hint.
3. optionally, convert everything into a group by selecting all (Ctrl+A) and grouping (Ctrl+G). Or you can just wrap the SVG code later into a single `g` element. Grouping in Inkscape ensures consistent transforms and makes alignment easier, but it's not needed when you have a single shape.
4. open `File/Save As` and save as plain SVG, then extract the root `g` element from it.

>👉 It is suggested you set optimized transform in InkScape: `Edit/Preferences/Behavior/Transform`: in `Store transformation` select `Optimized`. This reduces the number of transform attributes applied by the editor to your drawing.

💡 If you want your drawing to exactly **fit the canvas**:

1. select all (Ctrl+A).
2. `Object/Align and Distribute` (Ctrl+Shift+A): in the `Align` section set relative to `Page` and click `Center on vertical axis` and `Center on horizontal axis`.
3. with everything still selected, in the top toolbar set `W` and `H` fields to the size of your canvas (disable the lock icon to stretch and fix exactly if this is what you want).
4. after scaling, center again using `Align and Distribute` like before, because scaling can shift the position.

⚠️ Note that if you use InkScape shapes, this often results in InkScape applying a transform to the existing SVG. Instead, here we want pure geometries, with the right coordinates, no transforms, so we get no surprises when the rendering engine will use that hint. To avoid such transforms, ensure that you use `Optimized` for `Store transformation` as explained above, and then while drawing:

1. as soon as you add a shape _transform it into a path_ via `Path/Object to Path` (Shift+Ctrl+C). Then, you can apply the above procedure to fit it to the canvas.
2. once you have fit the path, select it, open `Edit/XML Editor` (Ctrl+Shift+X), select the path node, open the command palette (`View/Command Palette` or `?`) and select `Reapply Transform`.

>The canvas size for all your hints is defined by the HTML page hosting the hint designer. In the above example, it is 300x100.

#### Creating a Template

You may want to create an SVG template rather than having to setup the document each time. Here is the procedure for creating it using InkScape:

1. create a new default document.
2. open `File/Document Properties` (Ctrl+Shift+D) and set:

    - both display units (display and custom size) to `px`.
    - page scale = `1.0`.
    - custom size equal to that of your hint (e.g. 300 x 100).

3. open `File/Save Template` and save it with the name you prefer.

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

To use the designer, you can start as simple as using a static HTML page with its JS which imports the designer and configures it, like in the following templates.

- 📁 **HTML**:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GVE Hints Designer</title>
    <!-- replace the path to target the JS code of the designer web component -->
    <script type="module" src="./dist/index.js"></script>
    <!-- required for animations -->
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  </head>
  <body>
    <gve-hint-designer id="designer"></gve-hint-designer>
  </body>
</html>
```

- 📁 **JS**:

```js
// wait for DOM to be ready
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing GVE hints designer...");

  // get the component
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
        "diagonal-stroke-down": {
          svg: `<g>
    <line x1="0" y1="0" x2="300" y2="100" stroke="{{r_fore-color}}" stroke-width="2" />
  </g>`,
          position: "o",
          offsetX: 0,
          offsetY: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          solid: false,
          animation: "#wipe-right",
        },
        "diagonal-stroke-up": {
          svg: `<g>
    <line x1="0" y1="100" x2="300" y2="0" stroke="{{r_fore-color}}" stroke-width="2" />
  </g>`,
          position: "o",
          offsetX: 0,
          offsetY: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          solid: false,
          animation: "#wipe-right",
        },
        "cross-stroke": {
          svg: `<g>
    <line x1="0" y1="0" x2="300" y2="100" stroke="{{r_fore-color}}" stroke-width="2" />
    <line x1="0" y1="100" x2="300" y2="0" stroke="{{r_fore-color}}" stroke-width="2" />
  </g>`,
          position: "o",
          offsetX: 0,
          offsetY: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          solid: false,
          animation: "#wipe-right",
        },
        box: {
          svg: `<g>
    <rect x="0" y="0" width="300" height="100" fill="none" stroke="{{r_fore-color}}" stroke-width="2" />
  </g>`,
          position: "o",
          offsetX: 0,
          offsetY: 0,
          scaleX: 1.1,
          scaleY: 1.1,
          rotation: 0,
          solid: false,
          animation: "#scale-in",
        },
        note: {
          svg: `<g>
    <text id="placeholder" x="150" y="50" text-anchor="middle" dominant-baseline="middle" fill="{{r_fore-color}}" font-size="24">{{note}}</text>
  </g>`,
          position: "n",
          offsetX: 0,
          offsetY: -10,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          solid: false,
          animation: "#fade-in",
        },
      },
      animations: {
        "fade-in": `// Fade in using GSAP
  return new Promise(resolve => {
    gsap.fromTo(targetEl,
      { opacity: 0 },
      { opacity: 1, duration: 2, onComplete: resolve }
    );
  });
  `,
        "scale-in": `// Scale in using GSAP
  return new Promise(resolve => {
    gsap.fromTo(targetEl,
      { opacity: 0, scale: 0.5 },
      { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)', onComplete: resolve }
    );
  });
  `,
        "wipe-left": `// Wipe from right to left using GSAP DrawSVGPlugin
  return new Promise(resolve => {
    // Set initial state
    targetEl.style.opacity = '1';

    // Find all drawable elements (line, path, polyline, polygon, circle, rect, ellipse)
    const drawables = targetEl.querySelectorAll('line, path, polyline, polygon, circle, rect, ellipse');

    gsap.fromTo(drawables,
      { drawSVG: '100% 100%' },
      {
        drawSVG: '0% 100%',
        duration: 0.8,
        ease: 'power2.out',
        stagger: 0.1,
        onComplete: resolve
      }
    );
  });
  `,
        "wipe-right": `// Wipe from left to right using GSAP DrawSVGPlugin
  return new Promise(resolve => {
    // Set initial state
    targetEl.style.opacity = '1';

    // Find all drawable elements (line, path, polyline, polygon, circle, rect, ellipse)
    const drawables = targetEl.querySelectorAll('line, path, polyline, polygon, circle, rect, ellipse');

    gsap.fromTo(drawables,
      { drawSVG: '0%' },
      {
        drawSVG: '100%',
        duration: 0.8,
        ease: 'power2.out',
        stagger: 0.1,
        onComplete: resolve
      }
    );
  });
  `,
        "wipe-up": `// Wipe from bottom to top using GSAP DrawSVGPlugin
  return new Promise(resolve => {
    // Set initial state
    targetEl.style.opacity = '1';

    // Find all drawable elements (line, path, polyline, polygon, circle, rect, ellipse)
    const drawables = targetEl.querySelectorAll('line, path, polyline, polygon, circle, rect, ellipse');

    gsap.fromTo(drawables,
      { drawSVG: '100%' },
      {
        drawSVG: '0%',
        duration: 0.8,
        ease: 'power2.out',
        stagger: 0.1,
        onComplete: resolve
      }
    );
  });
  `,
        "wipe-down": `// Wipe from top to bottom using GSAP DrawSVGPlugin
  return new Promise(resolve => {
    // Set initial state
    targetEl.style.opacity = '1';

    // Find all drawable elements (line, path, polyline, polygon, circle, rect, ellipse)
    const drawables = targetEl.querySelectorAll('line, path, polyline, polygon, circle, rect, ellipse');

    gsap.fromTo(drawables,
      { drawSVG: '0%' },
      {
        drawSVG: '100%',
        duration: 0.8,
        ease: 'power2.out',
        stagger: 0.1,
        onComplete: resolve
      }
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
});
```
