# Rendition

The purpose of rendition is to provide an interactive representation of the transformations of a text, as defined by edit operations. Changes and visuals by each operation accumulate on the visualization, operation after operation. Users can navigate forward (adding more changes to the original text) or backward (undoing operations back towards the initial base text).

## SVG Elements

Rendition is based on SVG. The container supports zooming and panning for the whole text rendition area.

Rendered entities are:

- **base text** (text from version `v0`). The start input text, rendered all at once at start, character by character from left to right, and line by line from top to bottom (text never wraps). Base text appears all at once unless `charAnimationId` setting is set to an animation ID to use for rendering it one character at a time.
- **added text** is rendered character by character and line by line, but its position and size are calculated according to its reference base text, text rendition properties, and operation features.
- **hints**: defined by operation features. A hint is an SVG `g` element with any content and optional placeholders.

Rendered SVG elements are:

- **base elements**: existing since start and rendering base text, they are all SVG `text` elements, 1 per character.
- **added elements**: added text (1 SVG `text` element per character) and hints (1 SVG `g` element per hint), both added by operations.
- **text hilites** (temporary): a visualization artifact triggered by user action to hilite some visuals; they depend on existing SVG elements for their size and position, and they do not interact in any other way with them.

All character (`CharNode`'s) have a unique numeric ID, progressively assigned by backend. Rendered elements get these attributes:

- `id`=`n_` + character node ID, e.g. `n_1`.
- `class`: space-delimited classes:
  - `node`, meaning this `text` element represents a character node (other SVG `text` elements might be added from hints).
  - `vN`, where `N`=number of the version output by the operation which added the `text` element. For instance, if the operation being processed tags its output as `v3`, then the `text` elements for all the characters added by this operation will get a `v3` class.

The only relevant **control characters** are:

- **LF**: line end.
- **space**: rendered by offsetting the position of the next character by a specific amount. The amount is calculated according to the width of a reference character, rendered with the current text settings (font family, size, style, etc.). To this end, the component:
  - uses `m` as the default reference character.
  - makes the space width a fraction of the computed width of the reference character, once all the current text rendition settings have been applied to it. This is defined by component setting `spaceWidthFraction` which defaults to 0.33 (usually the space is 1/3 of the `m` width).

Rendition settings affect text in order of increasing specificity:

1. default settings of the component.
2. settings overridden by consumer code via data binding.
3. settings overridden by operation features.

## Rendition Features

Rendition features are used to override rendering settings. All these features can be combined and affect position and size in various ways, so elements are displayed only after evaluating all of them.

All rendering features have their name starting with `r_`:

- `r_char-offsets` (applicable only to the first operation): character offsets for rendering some specific text nodes (and thus indirectly also all the character nodes following it, up to line end). Used to change line layout by adding indent, or increasing or decreasing space between lines. Format: for each offset, `ID:y=...,x=...` (where we can specify only `x`, only `y`, or both, in any order; values represent `px` units), where:
  - `ID`=target character ID. As per the general text layout rules, once we offset this target characters, all the other characters will follow on the same baseline, unless any of them has another offset.
  - `y`=Y offset to add to the computed character baseline (negative=up, positive=down).
  - `x`=X offset to add to the computed character baseline (negative=left, positive=right).
  - both `x` and `y` can be followed by a unit specifier. The default unit is just pixels; otherwise, the value is followed by suffixes `tw`=text character average width (according to the current font and size) or `th`=text character average height.
- `r_char-offset`: this works as `r_char-offsets`, but it is provided in the features of a single character node. The reason for a multiple-offsets feature (rather than multiple single-offset features) is that when a character gets an offset, this affects not only it, but also all the following characters. So, order of application matters, and this could not be ensured when using multiple features.
- `r_font-family`: font family.
- `r_font-size`: font size.
- `r_fore-color`: foreground color.
- `r_back-color`: background color.
- `r_italic`: italic value (boolean).
- `r_bold`: bold value (boolean).
- `r_underline`: underline value (0-N=thickness in `px`).
- `r_overline`: overline value (as for underline).
- `r_strike`: strikethrough value (as for underline).
- `r_text-line-style`: the style of overline, underline, or strikethrough: `solid`, `dotted`, `dashed`, `wavy` (as in SVG and CSS; corresponds to SVG `text-decoration-line`).
- `r_text-line-color`: default color of the overline, underline or strikethrough.
- `r_rotate`: rotation amount to be applied to each single character.
- `r_hints`: link the operation to any number of hints. The value is a space-delimited list of hint IDs, in rendition order.
- `r_hint-vars`: this has no effect on text; it's used to define a set of variables to be consumed by hints placeholders. Each variable has name=value, and is separated with space. For instance, `color=red bold=1` to pass variables `color`=`red` and `bold`=`1` to the hints being rendered for the operation being processed.

>In backend data, all rendition features have their lifespan limited to the version generated by their operation. This avoids accumulating them in the output context, ensuring that they are valid only for the immediate output of the operation containing them.

## Reference Text

All added elements (added text and hints) are variously sized and positioned relative to the reference base text, which is defined by each operation's coordinates (`at` and `run`). For instance, when deleting "DE" from text "ABCDEF", the reference text is "DE".

Two main factors are used for computing size and position:

- **RBR** (_Reference text Bounding Rectangle_): the rectangle including all the bounding rectangles of all the subsequent nodes displayed for the text "selected" by an operation. So, if a segment to be deleted is "DE", its bounding rectangle is the rectangle including all the rectangles for "D" and "E". If reference segments happen to be _split_ in multiple lines then there will be _multiple RBR's_, one for each split portion of the text. In this case:
  - the _additional text_ just refers to the first RBR.
  - the _hint_ is repeated for each RBR, except the hint having a placeholder element.

>The logic of this repetition for hints (and not for additional text or for placeholder hints) is that in most cases hints represent decorations on top of their reference text, e.g. a strikethrough on top of the text being deleted; so, if this text happens to be split between two lines, we still need to apply strikethrough to all the reference text. The exception for the placeholder element is due to the fact that the placeholder element is an element including dynamically defined content (e.g. text) which should not be repeated.

- **EBR** (_Element Bounding Rectangle_): the bounding rectangle of the element being added. This can be:
  - for _added text_: the bounding rectangle containing all the SVG text elements representing the added text. Text is added character by character, so when adding "AB", 2 SVG `text` elements will be added, and the rectangle containing both of them will be the EBR.
  - for _hints_: the bounding rectangle containing the root SVG `g` element with all its descendants.

In the end the renderer must compute EBR and then place it relative to the RBR; so it is a matter of placing two rectangles. Relative position values defined for the added element refer to a position of the EBR "outside" or "inside" the RBR:

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

## Added Text

Added text is defined by operation's `value` for those operations which add new text (=add or replace operations):

- its size depends on the text and its style, as defined by current settings and possibly overrides from operation features.
- its position depends on the RBR.

### Added Text Features

These rendition features are applicable only to added text:

- `r_t-position`: position of added text relative to the RBR.
- `r_t-offset-x`: X offset for the added text, relative to the computed `r_t-position`.
- `r_t-offset-y`: Y offset for the added text, relative to the computed `r_t-position`.
- `r_t-displaced-span`: a span of base text with format `IDxN` where `ID`=node ID and `N`=count of chars to include, to be used as the RBR instead of the default RBR. This works exactly like a displaced hint, but is applied to added text.
- `r_t-value`: a display-only override for the text value of the operation (which is an operation introducing new text, and thus having this text in its `value` property -- i.e. an add or replace operation). This overrides the operation's `value` property which contains the added text so that something different can be displayed. Note that this value can be an empty string.

## Hints

A hint is an SVG code fragment linked to a specific operation. Hint rendering always happens before adding the added text possibly introduced by that operation, when there is any.

- hints are defined in a dictionary in the component's **settings**.
- hints SVG has design size and coordinates relative to a fixed-size rectangular area (defined by settings `hintDesignWidth` and `hintDesignHeight`). Then, they are variously scaled according to their computed size and position.
- hints are **linked** to operations via a special `r_hints` rendition feature, which contains the IDs of all the hints to use for that operation. For instance, `r_hints` = `alpha beta` means we want to apply 2 hints with ID `alpha` and `beta`, in this order.

Hints **properties** are:
  
- `svg`: SVG code for hint's visuals, always having a root `g` element.
- `position`: relative position for the hint.
- `offsetX`: absolute (10) or proportional (`0.5th`=half text character average height, `0.5tw`=half text character average width).
- `offsetY`: absolute (10) or proportional (`0.5th`=half text character average height, `0.5tw`=half text character average width).
- `scaleX`: horizontal scale: `1` = match bounds width, `1.1` = 110% of bounds width.
- `scaleY`: vertical scale: `1` = match bounds height, `1.1` = 110% of bounds height.
- `rotation`: optional hint's rotation (`0`=none).
- `animation`: JS code for animating the hint's entrance via GSAP, or `#` + the ID of a preset animation (defined in settings).
- `displacedRefSpan`: a span of base text with format `IDxN` where `ID`=base text node ID and `N`=count of chars to include, to be used as the RBR instead of the default RBR (as defined by the operation). In most cases it is set programmatically by the `r_h-displaced-span` feature.

The hint's **svg property** is a string representing the SVG content of a hint. The SVG content has these characteristics:

- its **root element** is always a `g` element. This allows to manipulate the whole hint as a single entity (e.g. for transforming or animating it). When adding the hint, the component adds a unique identifier to it, by setting the root `g` element's `id` attribute to a value like `hint-X` where `X` is built from:
  - the _operation's ID_.
  - an _ordinal number_ suffix preceded by `-`: 1=first hint for that operation, 2=second hint for that operation, etc.
- inside the root `g` element there is **any SVG code**. Apart from sizing and positioning it, and possibly overriding some of its properties (color, text decorations, etc.), the component will render it as it is.
- it may contain a **handle** element with `id`=`handle`. This represents the "handle" used as the reference for _positioning_ it (not for sizing it! Handles affect positioning only). Often, in the hint SVG code the handle element has opacity=0 so it's not visible; but this is up to the SVG code. The `showHintHandles` setting can force hidden handles to be displayed (setting their opacity to 1) for diagnostic purposes.
- it may contain **placeholders** wrapped in `{{...}}` (whiskers) with the name of the feature to get the value from. For instance, `<rect width="100" height="50" fill="{{r_color}}" />` has a placeholder `{{r_color}}` to replace with the value of a feature named `r_color` (or with just the placeholder's name, when that feature is not found).
- it may contain a **text placeholder element** with `id`=`placeholder` and an optional `class="fit"` (when text must be rendered to fit its container element). Hints whose SVG include a placeholder element are named _placeholder hints_. There can be only either 0 or 1 placeholder hints per operation. The placeholder is an SVG element including as child or descendant element a `text` SVG element which represents the text to draw. This text element has this behavior:
  - its _text value_ is either a literal, or resolved at runtime when within whiskers (like any placeholder). In the latter case, the text element's value is the name of the feature to get the text value from. For instance, `<text id="placeholder">{{note}}</text>` means that the text will be the value of a `note` feature in the same operation. If a feature with this name is not found, the text displayed is the feature name.
  - its _size_ by default is equal to the RBR size, variously modified by hint's properties and features overriding them, except for the special case of text placeholder hints (see below).

### Hints Features

These rendition features are applicable only to hints:

- `r_h-position`: override hint's `position` property.
- `r_h-offset-x`: override hint's `offsetX` property.
- `r_h-offset-y`: override hint's `offsetY` property.
- `r_h-scale-x`: override hint's `scaleX` property.
- `r_h-scale-y`: override hint's `scaleY` property.
- `r_h-rotation`: override hint's `rotation` property.
- `r_h-displaced-span`: override hint's `desplacedRefSpan` property (for displaced hints).

By default, hint features apply to ALL hints in the operation (those listed by `r_hints` feature), unless the property value starts with `@` followed by a space-delimited list of targets, ended by `:`; in this case, it applies ONLY to those hints matching the list. Targets can be:

- **hint key strings**: applies to all hints with that key. E.g., `@alpha beta:e` applies to all hints with key `alpha` or `beta`.
- **1-based ordinal numbers**: applies to the hint at that position in `r_hints`. E.g., `@1:e` applies only to the first hint, even if multiple hints share the same key.
- **mixed**: `@1 beta:e` applies to the first hint (by position) and all hints with key `beta`.

When multiple targets match the same hint, ordinal-based overrides take precedence over key-based overrides, which take precedence over the wildcard (no `@` prefix).

## Rendition Logic

The rendition logic for added elements is:

(1) **sizing**: the initial size of an added element is defined as:

- for _added text_: the EBR (containing all the SVG `text` elements of the added text, 1 per character), drawn according to the current settings for text (possibly overridden by rendition features).
- for _hints_: the EBR (containing the root SVG `g` element of the hint with all its descendants) is sized as the RBR so that the hint exactly fits it. For instance, a diagonal line hint representing the deletion of 3 characters "ABC" can be drawn on top of them to cover them all, because its default position is `o` (EBR center=RBR center) and its default size as the same as the RBR.

**Text placeholder hints** have 2 distinct behaviors for sizing:

- _default mode_: the `text` SVG element in the hint is rendered according to the current text settings, possibly overridden by rendition features; its content is either literal text, or defined by a placeholder variable (within whiskers). Then:
  - the container element of `text` is scaled so that text fits into it. For instance, if a `rect` element whose design size is 300x100 contains the placeholder `text`, and once rendered this `text` has size 600x200, then the `rect` will be scaled up by 2.
  - all the other elements in the hint SVG are scaled and moved proportionally by the same factor of the container element. So, if the hint SVG contains also a line representing the diagonal of the container rectangle, this must be scaled and repositioned with the same proportions so that the whole SVG hint preserves its appearance and is just scaled up or down to fit its text. So, here the text size dictates the size of all the other elements in the hint.
- _fit mode_: in fit mode, the text must be rendered with all its styles, and then fit into its parent container element, whose size is computed in the usual way. For instance, if the hint's SVG has a placeholder rectangle including text with a placeholder variable, then the text must be fit into this rectangle:

```xml
<g>
  <!-- rect is the parent of placeholder text element -->
  <rect x="0" y="0" width="300" height="100" fill="none" stroke="{{r_fore-color}}" stroke-width="2" >
    <!--
      {{note}} placeholder will be replaced by text from note feature,
      then the resulting text (drawn with current text settings, possibly
      overridden by rendition features) will be sized to fit into rect.
     -->
    <text id="placeholder" class="fit">{{note}}</text>
  </rect>
</g>
```

(2) **transforms**: added elements can be transformed (scale and rotation) before being added. This is only a preparation of the elements before computing their position. The drawing logic follows this sequence to be predictable and easy for hints designers. It is like drawing in a diagramming app: you pick a shape, freely resize and rotate it, and when done you move it in the desired position. So, transforms are totally opaque to the component's renderer. The renderer just receives an element to position and add, whether this element had some transformations applied to it, or not. Source of transforms are:

- for _added text_: `r_rotate` feature (no scale here because size is set by `r_font-size`).
- for _hints_: hint's properties `scaleX`, `scaleY`, `rotation`, which can be overridden by the `r_h-scale-x`, `r_h-scale-y`, `r_h-rotation` features.

(3) **positioning**: the EBR of added elements is positioned with reference to the RBR. As for the initial position:

- for _added text_: set by `r_t-position` feature.
- for _hints_: set by hint's property `position`, which can be overridden by the `r_h-position` feature. Note that hints SVG can contain a _handle_ element, which overrides the EBR for positioning only (not for sizing).

(4) **offsetting**: once the initial position has been computed, it can be offset on X and Y by a specified amount:

- for _added text_, the offset is set by `r_t-offset-x` and `r_t-offset-y` features.
- for _hints_, the offset is set by hint's properties `offsetX` and `offsetY`, which can be overridden by `r_h-offset-x` and `r_h-offset-y` features.

Offsets use either a simple number, e.g. `10`, or a suffixed number, using these suffixes for metrics derived from the reference text bounds:

- `th` = reference text bounds height.
- `tw` = reference text bounds width.

So, `10`=offset by 10, but `0.5th` = offset by half of the reference text height.

(5) **prolog**: immediately before rendering added elements, a special animation ("prolog") can be triggered to adjust the existing elements panning. This happens when the element which is going to be added, once its size and position have been fully computed, would fall outside the currently visible portion of the text rendition area. In this case, before adding the element, an animation gracefully pans the existing elements so that there is just enough room to display the element which is going to be added. The duration of this transition animation is defined in the `prologDuration` setting.

(6) **animation**: if the added element has one, its enter animation is played.

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
