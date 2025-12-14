# GVE Hint Designer

A CodePen template toolkit for designing and animating hints for the GVE Snapshot Rendition web component.

## Overview

This toolkit helps you design custom hints (visual representations of editing operations) and their GSAP animations in a visual playground environment. You can test and refine your hints before integrating them into your application.

## What's Included

- **template-html.html** - HTML structure for the designer
- **template-css.css** - Styling for the designer interface
- **template-js.js** - JavaScript logic with GSAP integration
- **example-hints.json** - Sample hints and animations to get started

## Quick Start

### Option 1: Using CodePen (Recommended)

1. Go to [CodePen](https://codepen.io) and create a new pen
2. Copy the content from `template-html.html` into the HTML pane
3. Copy the content from `template-css.css` into the CSS pane
4. Copy the content from `template-js.js` into the JS pane
5. In the JS settings, add these external libraries:
   - GSAP: `https://cdn.jsdelivr.net/npm/gsap/dist/gsap.min.js`
   - GSDevTools: `https://cdn.jsdelivr.net/npm/gsap/GSDevTools.js`
6. Start designing!

### Option 2: Local Development

1. Create a new HTML file
2. Combine all three templates into a single HTML file
3. Add GSAP and GSDevTools script tags
4. Open in your browser

## How to Use

### 1. Configure Settings

At the top of the JS code, you'll find a `CONFIG` object:

```js
const CONFIG = {
  HINT_WIDTH: 200,    // Width of the design area (mock RBR width)
  HINT_HEIGHT: 40,    // Height of the design area (mock RBR height)
  GRID_SIZE: 10,      // Grid cell size for reference
};
```

Adjust these to match your typical text bounds. The grid represents your Reference Bounding Rectangle (RBR).

### 2. Add Your Hints

In the `DATA` object, define your hints and animations:

```js
const DATA = {
  hints: {
    "my-hint": {
      svg: '<g><rect width="100" height="30" fill="none" stroke="red" stroke-width="2" /></g>',
      position: "o",
      offsetX: 0,
      offsetY: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      animation: "#fade-in"
    }
  },
  animations: {
    "fade-in": `
      return new Promise(resolve => {
        gsap.fromTo(targetEl,
          { opacity: 0 },
          { opacity: 1, duration: 1, onComplete: resolve }
        );
      });
    `
  }
};
```

### 3. Design Your Hints

- Use the **dropdown** to select which hint to view
- Use **Previous/Next** buttons for quick navigation
- Click on **thumbnails** for visual selection
- Use the **GSAP timeline controls** to test animations

### 4. Understanding the Canvas

- **Grid**: Represents your RBR (the text bounds your hint will be positioned against)
- **Grid lines**: Spaced according to `GRID_SIZE` for pixel reference
- **Rulers**: Show measurements along X and Y axes
- **Your hint**: Rendered on top of the grid

### 5. Edit and Iterate

1. Modify the SVG code in the `hints` object
2. Adjust position, scale, rotation, offsets
3. Refine animations in the `animations` object
4. Test with the GSAP controls

### 6. Export Your Work

- Click **"Copy JSON to Clipboard"** to copy your hints and animations
- Paste into your application's settings
- Or click **"Import from Clipboard"** to load previously saved work

## Hint Properties Reference

### svg

The SVG code for your hint. Must have a root `<g>` element.

**Placeholders**: Use `{{variable}}` syntax, e.g., `{{r_fore-color}}` will be replaced with feature values.

**Special IDs**:

- `id="handle"` - Defines the positioning reference point (instead of using the hint's center)
- `id="placeholder"` - Contains dynamic text (replaced at runtime)

### position

Relative position to the RBR. Values: `o` (center), `n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`, `inw`, `ine`, `isw`, `ise`

### offsetX / offsetY

Fine-tune position after initial placement. Can be:

- Number (pixels): `10`
- Relative to text height: `"0.5th"` (half text height)
- Relative to text width: `"0.5tw"` (half text width)

### scaleX / scaleY

Scale the hint relative to RBR size:

- `1` = same size as RBR
- `1.1` = 110% of RBR
- `0.5` = 50% of RBR

### rotation

Rotation in degrees. `0` = no rotation, `45` = 45° clockwise, `-45` = 45° counter-clockwise

### animation

GSAP animation code or reference to animation in catalog:

- Direct code: JavaScript code string
- Reference: `"#fade-in"` (looks up animation with id "fade-in")

## Animation Guidelines

Animations receive three parameters:

- `gsap` - The GSAP library instance
- `targetEl` - The hint's root `<g>` element
- `rootEl` - The root SVG element (rarely needed)

Animations must return a Promise:

```js
"my-animation": `
  return new Promise(resolve => {
    gsap.fromTo(targetEl,
      { opacity: 0, scale: 0 },
      { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out', onComplete: resolve }
    );
  });
`
```

## Tips

1. **Start Simple**: Begin with basic shapes and no animation, then add complexity
2. **Use the Grid**: The grid spacing helps you count pixels accurately
3. **Test Scales**: Try different scaleX/scaleY values to see how hints adapt to text sizes
4. **Animation Timing**: Keep animations short (0.3-1s) for better UX
5. **Handle Elements**: Use handles for precise positioning of complex shapes
6. **Reuse Animations**: Define animations once in the catalog, reference with `#id`

## Example Workflow

1. Create a rectangle box hint for highlighting:

   ```js
   svg: '<g><rect width="100" height="30" fill="none" stroke="blue" stroke-width="2" /></g>'
   ```

2. Position it to center on text:

   ```js
   position: "o"
   ```

3. Make it slightly larger than text:

   ```js
   scaleX: 1.1,
   scaleY: 1.1
   ```

4. Add a fade-in animation:

   ```js
   animation: "#fade-in"
   ```

5. Test in the designer, adjust as needed

6. Copy JSON and paste into your app settings

## Troubleshooting

**Hint not visible**: Check if SVG elements have proper coordinates and are within the viewBox

**Animation not playing**: Ensure animation code returns a Promise and includes `onComplete: resolve`

**Position seems off**: Remember the grid represents the RBR - your hint positions relative to this rectangle

**Handle not working**: Make sure the element has exactly `id="handle"`

## Need Help?

Refer to the [main rendition documentation](../docs/rendition.md) for detailed information about:

- How hints work in the component
- Position values and their meanings
- The relationship between hints and text bounds
- Advanced features like displaced hints
