# GVE Hint Designer - Quick Start Guide

## Important: Two Different HTML Files

**This toolkit has its own `hint-designer/index.html` file** which is completely separate from the root `index.html` (which loads the main GVE component).

- ✅ **Correct**: Open `hint-designer/index.html` in your browser
- ❌ **Wrong**: Opening root `index.html` will load the component, not the designer

---

## Step 1: Setup CodePen

1. Go to [CodePen.io](https://codepen.io)
2. Click "Create" → "Pen"
3. Click the **gear icon ⚙️** in the **JS** panel (JavaScript settings)
4. In the "Add External Scripts/Pens" section, add these URLs one at a time:

   **First**, type or paste:

   ```txt
   https://cdn.jsdelivr.net/npm/gsap/dist/gsap.min.js
   ```

   Press Enter or click outside to add it.

   **Then**, type or paste:

   ```txt
   https://cdn.jsdelivr.net/npm/gsap/GSDevTools.js
   ```

   Press Enter or click outside to add it.

5. Verify both scripts appear in the list
6. Click "Save & Close"

> **Important**: Make sure to use "Add External Scripts/Pens", NOT "Add Packages". The scripts must be added as external URLs.

## Step 2: Copy Templates

### HTML Panel

- Open `template-html.html`
- Copy ALL content (Ctrl+A, Ctrl+C)
- Paste into CodePen's HTML panel

### CSS Panel

- Open `template-css.css`
- Copy ALL content
- Paste into CodePen's CSS panel

### JS Panel

- Open `template-js.js`
- Copy ALL content
- Paste into CodePen's JS panel

## Step 3: Start Designing

You should now see:

- ✅ A canvas with a grid
- ✅ A dropdown with example hints
- ✅ Thumbnails showing all hints
- ✅ A properties panel
- ✅ Animation timeline controls at the bottom

### Try It Out

1. **Select a hint** from the dropdown (e.g., "box")
2. **Watch the animation** play automatically
3. **Use timeline controls** to replay, pause, slow down
4. **Click thumbnails** to quickly switch between hints
5. **Use Previous/Next** buttons to navigate

## Step 4: Customize Your First Hint

Let's modify the "box" hint:

1. In the JS panel, find the `DATA` object (around line 25)
2. Find the "box" hint definition
3. Try changing:

   ```js
   "box": {
     svg: '<g><rect x="0" y="0" width="100" height="30" fill="none" stroke="{{r_fore-color}}" stroke-width="1" /></g>',
     position: "o",      // ← Try: "n", "s", "e", "w"
     offsetX: 0,         // ← Try: 10, -10
     offsetY: 0,         // ← Try: 5, -5
     scaleX: 1.1,        // ← Try: 1.2, 0.9
     scaleY: 1.1,        // ← Try: 1.5, 0.8
     rotation: 0,        // ← Try: 45, -30
     animation: "#fade-in"  // ← Try: "#scale-in", "#bounce-in"
   }
   ```

4. Watch your changes take effect immediately!

## Step 5: Create Your Own Hint

Add a new hint to the `hints` object:

```js
"my-custom-hint": {
  svg: '<g><circle cx="50" cy="15" r="10" fill="red" opacity="0.5" /></g>',
  position: "o",
  offsetX: 0,
  offsetY: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  animation: "#scale-in"
}
```

It will automatically appear in the dropdown and thumbnails!

## Step 6: Create Custom Animation

Add a new animation to the `animations` object:

```js
"my-spin": `
  return new Promise(resolve => {
    gsap.fromTo(targetEl,
      { opacity: 0, rotation: 0, scale: 0 },
      {
        opacity: 1,
        rotation: 360,
        scale: 1,
        duration: 1,
        ease: 'power2.out',
        onComplete: resolve
      }
    );
  });
`
```

Then use it: `animation: "#my-spin"`

## Step 7: Export Your Work

When you're happy with your hints:

1. Click **"📋 Copy JSON"** button
2. This copies all hints and animations to clipboard
3. Paste into your application's settings

## Understanding the Canvas

- **Grid Lines**: Every 10px (configurable via `GRID_SIZE`)
- **Numbered Lines**: Every 50px for easy reference
- **Canvas Size**: Default 200×40px (represents a typical text RBR)
- **Your Hint**: Rendered centered on the canvas

The grid represents the Reference Bounding Rectangle (RBR) in the actual component - the bounds of the text your hint will be positioned relative to.

## Tips for Success

1. **Start with position "o"** (origin/center) to see your hint clearly
2. **Use the grid** to measure your SVG dimensions
3. **Test different scales** to see how hints adapt to text sizes
4. **Keep animations short** (0.3-1s) for better UX
5. **Use placeholders** like `{{r_fore-color}}` for dynamic colors
6. **Toggle handle display** to debug positioning issues

## Common Position Values

- `o` - Center (origin) - Default, easiest to work with
- `n` - North (top center) - Great for superscript notes
- `s` - South (bottom center) - Good for subscript or underlines
- `e` - East (right center) - Arrows pointing away
- `w` - West (left center) - Brackets or margin notes
- `ne`, `nw`, `se`, `sw` - Corners
- `inw`, `ine`, `isw`, `ise` - Inside corners

## Troubleshooting

### GSAP Not Loading

If you see "GSAP library not loaded" error:

1. **Check JS Settings**: Click the gear ⚙️ on the JS panel
2. **Verify Scripts Section**: Look for "Add External Scripts/Pens" (NOT "Add Packages")
3. **Check Script URLs**: You should see both URLs listed:
   - `https://cdn.jsdelivr.net/npm/gsap/dist/gsap.min.js`
   - `https://cdn.jsdelivr.net/npm/gsap/GSDevTools.js`
4. **Order Matters**: GSAP must be listed before GSDevTools
5. **Force Refresh**: Try hard-refresh (Ctrl+Shift+R or Cmd+Shift+R)
6. **Clear CodePen Cache**: Delete the pen and create a new one

**Still not working?** Try using the standalone [index.html](index.html) file locally instead.

### Local File Not Loading Scripts

If you're using the local `hint-designer/index.html` file and see "Timeline controls not available":

1. **Hard Refresh**: Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. **Clear Browser Cache**: Your browser may have cached the old (broken) CDN URLs
3. **Check Console**: Open DevTools (F12) and verify both scripts load successfully
4. **Check Network Tab**: In DevTools Network tab, verify the script URLs are correct (no `@3.12.5` version, and GSDevTools.js not in `/dist/` folder)

### Other Issues

- **"Hint not showing"**:
  - Check if SVG has valid coordinates
  - Try position "o" first
  - Look for syntax errors in SVG

- **"Animation not working"**:
  - Make sure animation returns a Promise
  - Check for `onComplete: resolve`
  - Look at browser console for errors

- **"GSDevTools not appearing"**:
  - Verify GSDevTools URL is correct
  - Check it's loaded AFTER gsap.min.js
  - Refresh the page

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check [example-hints.json](example-hints.json) for more examples
- Refer to [rendition.md](../docs/rendition.md) for how hints work in the component
- Explore [GSAP documentation](https://greensock.com/docs/) for advanced animations

## Need Help?

- GSAP Docs: <https://greensock.com/docs/>
- GSDevTools: <https://greensock.com/docs/v3/Plugins/GSDevTools/>
- SVG Reference: <https://developer.mozilla.org/en-US/docs/Web/SVG>
