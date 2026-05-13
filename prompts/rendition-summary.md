# Rendition

## Purpose

Render an interactive representation of the transformations of a text, as defined by edit operations. Changes and visuals by each operation accumulate on the visualization.

## Elements

Rendition is based on SVG. The container supports zooming and panning for the whole text rendition area.

Rendered entities are:

- **base text** (text from version `v0`). The start input text, rendered all at once at start, character by character from left to right, and line by line from top to bottom. Base text appears all at once unless `charAnimationId` setting is set to an animation ID to use for rendering it one character at a time.
- **added text** is rendered character by character and line by line, but its position and size are calculated according to its reference base text, text rendition properties, and operation features.
- **hints**: defined by operation features. A hint is a SVG element with any content and optional placeholders.

Rendered SVG elements are:

- **base elements**: existing since start and representing base text.
- **added elements**: added text and hints, both added by operations.
- **text hilites** (temporary): a visualization artifact triggered by user action to hilite some visuals; they depend on existing SVG elements for their size and position, and they do not interact in any other way with them.

All character (`CharNode`'s) have a unique numeric ID, progressively assigned by backend. Rendered elements get these attributes:

- `id`=`n_` + character node ID, e.g. `n_1`.
- `class`: space-delimited classes:
  - `node`, meaning this `text` element represents a character node (other SVG `text` elements might be added from hints).
  - `vN`, where `N`=number of the version output by the operation which added the `text` element. For instance, if the operation being processed tags its output as `v3`, then the `text` elements for all the characters added by this operation will get a `v3` class.

Rendition settings affect text in order of increasing specificity:

1. default settings of the component.
2. settings overridden by consumer code via data binding.
3. settings overridden by operation features.

The only relevant **control characters** are:

- **LF**: line end.
- **space**: rendered by offsetting the position of the next character by a specific amount. The amount is calculated according to the width of a reference character, rendered with the current text settings (font family, size, style, etc.). To this end, the component:
  - uses `m` as the default reference character.
  - makes the space width a fraction of the computed width of the reference character, once all the current text rendition settings have been applied to it. This is defined by component setting `spaceWidthFraction` which defaults to 0.33 (usually the space is 1/3 of the `m` width).

Text never wraps.

### Added Elements

All added elements (added text/hints) are rendered with reference to base text elements.

(1) **transforms**: added elements can be transformed (scale and rotation) before being added. Important: this is only a preparation of the elements before computing their relative position. The drawing logic follows this sequence to be predictable and easy for hints designers; it is like drawing in a diagramming app: you pick a shape, freely resize and rotate it, and move it in the desired position.So transforms are totally opaque to the component's renderer. The renderer just receives an element to position and add, whether this element had some transformations applied to it or not. Source of transforms:

- for _added text_: `r_rotate` feature (no scale here because size is set by `r_font-size`).
- for _hints_: hint's properties `scaleX`, `scaleY`, `rotation`, which can be overridden by the `r_h-scale-x`, `r_h-scale-y`, `r_h-rotation` features.

(2) **positioning**: all added elements are positioned with reference to the bounding rectangle of the reference text (=**RBR**; the bounding rectangle of the element positioned with reference to the RBR is named "EBR").

RBR is _the rectangle including all the bounding rectangles of all the subsequent nodes displayed for the text "selected" by an operation_. So, if a segment to be deleted is "def", its bounding rectangle is the rectangle including all the rectangles for "d", "e", "f".

If the reference segments happen to be _split_ in multiple lines then there will be _multiple RBR's_, one for each split portion of the text. In this case:

- the _additional text_ just refers to the first RBR.
- the _hint_ is repeated for each RBR, except the hint having a placeholder element.

>The logic of this repetition for hints (and not for additional text or for placeholder hints) is that in most cases hints represent decorations on top of their reference text, e.g. a strikethrough on top of the text being deleted; so, if this text happens to be split between two lines, we still need to apply strikethrough to all the reference text. The exception for the placeholder element is due to the fact that the placeholder element is an element including dynamically defined content (e.g. text) which should not be repeated.

As for the initial position:

- for _added text_: set by `r_t-position` feature.
- for _hints_: set by hint's property `position`, which can be overridden by the `r_h-position` feature. Also note that hints SVG can contain a _handle_ element; in this case, their bounding rectangle is not their whole SVG, but only the bounding rectangle of the handle element.

Position values refer to a position of the EBR "outside" or "inside" the RBR:

- **outside**:
  - `n`: EBR-bottom edge aligned with RBR-top edge; horizontally centered.
  - `s`: EBR-top edge aligned with RBR-bottom edge; horizontally centered.
  - `w`: EBR-right edge aligned with RBR-left edge; vertically centered.
  - `e`: EBR-left edge aligned with RBR-right edge; vertically centered.
  - `nw`: EBR-bottom-right corner aligned with RBR-top-left corner.
  - `ne`: EBR-bottom-left corner aligned with RBR-top-right corner.
  - `sw`: EBR-top-right corner aligned with RBR-bottom-left corner.
  - `se`: EBR-top-left corner aligned with RBR-bottom-right corner.

This ASCII-picture diagram shows a smaller EBR positioned with reference to a bigger RBR:

```txt
+---+       +---+       +---+
|nw |       | n |       |ne |
+---+-------+---+-------+---+
    |                   |
+---+                   +---+
| w |                   | e |
+---+                   +---+
    |                   |
+---+-------+---+-------+---+
|sw |       | s |       |se |
+---+       +---+       +---+
```

- **inside**:
  - `inw`=northwest corner: EBR-top-left corner aligned with RBR top-left-corner.
  - `ine`=northeast corner: EBR-top-right corner aligned with RBR top-right-corner.
  - `isw`=southwest corner: EBR-bottom-left corner aligned with RBR bottom-left-corner.
  - `ise`=southeast corner: EBR-bottom-right corner aligned with RBR bottom-right-corner.
  - `o` for origin: the EBR origin (=center) aligned with the RBR origin (=center). This is the _default_ when position is not explicitly specified.

The corresponding ASCII-picture diagram is:

```txt
+---+-----------+---+
|inw|           |ine|
+---+   +---+   +---+
|       | o |       |
+---+   +---+   +---+
|isw|           |ise|
+---+-----------+---+
```

(3) **offsetting**: once the initial position has been computed, it can be offset on X and Y by a specified amount:

- for _added text_, the offset is set by `r_t-offset-x` and `r_t-offset-y` features.
- for _hints_, the offset is set by hint's properties `offsetX` and `offsetY`, which can be overridden by `r_h-offset-x` and `r_h-offset-y` features.

Offsets use either a simple number, e.g. `10`, or a suffixed number, using these suffixes for metrics derived from the reference text bounds:

- `th` = reference text bounds height.
- `tw` = reference text bounds width.

So, `10`=offset by 10, but `0.5th` = offset by half of the reference text height.

(4) **prolog**: immediately before rendering added elements, a special animation ("prolog") can be triggered to adjust the existing elements panning. This happens when the element which is going to be added, once its size and position have been fully computed, would fall outside the currently visible portion of the text rendition area. In this case, before adding the element, an animation gracefully pans the existing elements so that there is just enough room to display the element which is going to be added. The duration of this transition animation is defined in the `prologDuration` setting.

## Animations

As all the elements which enter the text rendition never leave it, all settings-based animations represent _entrance_ animations, and they are provided via JS code fragments in settings, using GSAP.

>Besides settings-based animations, other animations exist, managed by code only, like transitions in spreading or text hilites.

Animation code fragments are found in these settings:

- `animations`: the main catalog of animations, a dictionary where key=animation ID (string), value=JS code fragment for the animation.
- `hints`: hints may have their own JS code fragment for animation in their `animation` property; when this starts with `#` it's rather a reference (via ID) to an animation to be found in `animations`.

All animations **target** a single designated element:

- for text characters, this is an SVG `text` element;
- for hints, this is the root `g` element in the hint SVG code fragment.

>As a custom web component, we use Shadow DOM, which makes code fragments for animation unable to use `getElementById` to get a reference to the target element. We thus need to _explicitly provide a reference to this element_ to the GSAP code.

The rendering component:

1. creates the target element with its computed size and position. If it has an entrance animation, its initial opacity is set to 0.
2. creates a JS wrapper function for the JS code fragment got from settings, receiving these parameters:
   1. `gsap`: the global instance of the GSAP library, defined once outside this JS code;
   2. `targetEl`: the created target SVG element;
   3. `rootEl`: the root `svg` element of the whole text rendition area.
