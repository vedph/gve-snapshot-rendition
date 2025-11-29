# Rendition

The purpose of this component is to render an interactive representation of the multiple versions of a text as defined by editing operations and their features.

As explained, text variants are built by accumulating the changes made to it by each editing operation from an ordered set of them. Except for the first operation, which works on the base text, each operation gets as input the output of a previous operation, and outputs a new version of the text, progressively numbered (`v1`, `v2`... etc.).

Each operation has a set of features, which are name=value pairs where both name and value are strings. Among them, some are used by this component to define its rendering parameters for the visual counterpart of each operation (the so-called "hints").

The component is completely based on **SVG** on a **text drawing surface**, which is complemented by other areas used for toolbars and other purposes.

## Component UI

TODO

## Rendered Entities

The component renders these entities:

- **base text**: the `v0` text, the input text to start with to transform it via editing operations. In most cases, it is visually identified by the text written on regular rows, with the same ink, by the same hand.
- **additional text**: the text successively added by insert/replace operations. This is drawn character by character, just like the base text, but its size, position, and rendering features are calculated according to the operation's features and the default rendering settings.
- **hints** which represent the visual counterparts of each editing operation. Each operation has 0-N hints, defined in the order they are meant to be displayed. Each hint can be any shape, e.g. a stroke on a word corresponding to a delete operation for that word, or also some static text like an annotation. Hints too are defined via SVG.

## Base Text

The base text is rendered in a rather predictable and simple way:

- the **rendition settings** (font family, size, color, etc.) used are those defined by the component settings, which are set in this order of increasing specificity:
  1. the default settings of the component, set when the component is initialized.
  2. the settings overridden by consumer code via data binding. So, the component uses all its default settings, unless overridden by the consumer code via binding.
  3. the settings overridden by data via [init-features](#init-features), i.e. those features which are added by an initial annotate operation.
- the text is drawn by rendering **one character after the other**, along the same baseline, until a LF character is found. Each character corresponds to a text node in the operation's output, and is thus a single `text` SVG element.
- when a LF character is found, a new line starts below the previous one, left-aligned with it. The baseline of specific lines can anyway be offset by init features.

Text **never wraps**, whatever the container size. Anyway, the container supports zooming and panning for the whole rendition area.

## Added Text

TODO

## Rendition Features

Rendition features are used to override the default rendering settings for text, either it is the base text (when used as [init-features](#init-features)), or text added by an insert/replace operation.

All rendering features have their name starting with `r_`. These are the only features taken into account by the renderer component for rendition purposes. Their list follows.

>Some of these features are meaningful only when used as init-features, i.e. in the very first operation (an annotation operation). In this case they are marked by ⭐ in the list which follows. If found later in an operation, such features will be simply ignored.

- `r_line-offsets` ⭐: the line offsets for rendering the base text. Base text is rendered in a regular, predictable way, just like text is usually rendered in frame: one character after another on the same baseline, until a newline character is found. When this happens, a new line starts below the previous one, left-aligned with it. This is the default layout which assigns the position to each baseline, according to general settings defined in the component's settings (default font size, default spacing between lines, etc.). This default position can be changed by the value of this feature, whose format repeats the pattern `N:y=...,x=...` (where we can specify only `x`, only `y`, or both, in any order; values represent `px` units). In this pattern:
  - `N`=line number. This is the ordinal number of the base text line: 1=first, 2=second, etc. In multiline base text, the character LF is used to represent the end of each line. So, we can change the offset of each line in the text.
  - `y`=Y offset to add to the baseline of the next line, thus shifting its default position down (when the offset is positive) or up (when the offset is negative).
  - `x`=X offset to add to the baseline of the next line, thus shifting its default position to the right (when the offset is positive) or to the left (when the offset is negative).
- `r_char_offsets`: the character offsets for rendering some text nodes. This works as `i_line-offsets`, but only for the targeted character _and_ all the characters which follow it, _up to line end_. The `N` number here represents the character node ID (every character node, including LF or spaces, has a numeric ID, unique within the whole text). For instance, `3:y=10,x=20` means that before rendering the character with ID=3 (which happens to be the third character in the base text), the baseline will be shifted down by 10 and the X position of the next character will be offset by 20, thus effectively leaving a wider gap between the previous character and the next ones. All the following characters up to the first LF will follow on this newly defined baseline, unless of course any of them happens to have another offset.
- `r_font-size`: the font size.
- `r_font-family`: the font family.
- `r_fore-color`: the foreground color.
- `r_back-color`: the background color.
- `r_italic`: the italic value (boolean).
- `r_bold`: the bold value (boolean).
- `r_text-line-style`: the style of overline, underline, or strkethrough: `solid`, `dotted`, `dashed`, `wavy` (as in SVG and CSS; corresponds to SVG `text-decoration-line`).
- `r_text-line-color`: the default color of the overline, underline or strikethrough.
- `r_underline`: the underline value (0-N being the thickness in `px`).
- `r_overline`: the overline value (as for underline).
- `r_strike`: the strikethrough value (as for underline).
- `r_rotate`: the rotation amount to be applied to each single character.
- `r_canvas_rotate` ⭐: the rotation to be applied to the whole text rendition surface. This is used when the whole text is rotated with reference to its sheet.
- `r_hints`: this feature is used to link the operation to any number of hints. The value is a space-delimited list of hint IDs, in the order they should be rendered for that operation.

>All these features can be combined, so characters are displayed only after evaluating all of them, and their size and text layout changes accordingly to fit all the characters with their size, which may depend on one or more of these features.

## Init Features

Init-features, when set, are provided by an **initial annotation operation**. Annotation operations are those operations which just modify the set of features, in most cases by adding new ones, without changing the text. So, the purpose of an initial annotation operation is to provide a sort of initial rendering setup.

Init features are just _rendition features_ which happen to be used in the very first operation applied to the base text, which must be an annotation operation. So, when the result from a snapshot starts with an annotate operation and this operation contains rendition features, it is implied that these are going to override the component's settings themselves, thus defining new defaults.

So, all init features:

- apply to the rendition of the text (base or added).
- define the default for all text renditions, which can always be overridden by specific (non-init) features.

In other terms, this is a way of changing the corresponding settings of the renderer component. This way, we can inject settings from data, thus overriding those set by consumer software.

## Hints

Each hint is an SVG fragment representing something to be rendered on the component text surface and corresponding to a specific operation. Hints are linked to operations via a special `r_hints` [rendition feature](#rendition-features), and they are designed to be rendered before adding the text possibly introduced by that operation.

### SVG Content

The SVG content of a hint has these characteristics:

- by convention, its **root element** is always a `g` element. This allows to manipulate the whole hint as a single entity (e.g. for transforming or animating it). So, there is no `svg` root; this is just a code fragment. When inserting it in the page, the component wraps the root `g` into a newly created `svg` element. When adding the hint, the component also adds a **unique identifier** to it, by setting the root `g` element's `id` attribute to a value like `hint-X` where `X` is built of:
  - the _operation's ID_. Each hint is linked to the operation which is going to generate the next step.
  - an _ordinal number_ suffix preceded by `-`: 1=first hint for that operation, 2=second hint for that operation, etc. This ensures that every hint `g` element placed in the component step being drawn is unique within that scope, because each operation has a unique GUID, and each operation's hint has its ordinal suffix.
- inside this root `g` element we can have **any SVG code** with groups, shapes, lines, text, etc. Apart from sizing and positioning it, and possibly overriding some of its properties dynamically (e.g. color, text decorations, etc.), the component will just render it as it is.
- it may contain a **handle** element (often drawn with opacity=0 so it is not visible, but this is up to the SVG code you get from the hint) with `id`=`handle`. This represents the "handle" for the SVG code, i.e. the point in it which is used as the reference for positioning it. If there is no such handle element, then the component just uses the center of the bounding rectangle for the whole SVG (i.e. its root `g` element, which is always present).
- it may contain a **placeholder** element with id=`placeholder`. This is usually an SVG shape, like a rectangle including a `text` SVG element which represents the text to draw, or directly a `text` element. Whatever the placeholder element is, in the end it either is a `text` element, or it contains a `text` element. This text element has this behavior:
  - its text value is resolved at runtime:
    - when equal to the special value `$TEXT`, it represents the _text being added by the operation_ itself (=the text value of an insert or replace operation). In this case, the text element will be completely replaced by the rendition of the text nodes added by the operation, just like the component renders the text nodes of the base text, one node after another, using all the current settings for text (as determined by the component's settings, possibly overridden by rendition features of this specific operation).
    - otherwise, it is the _name of a variable_ containing the text. This is equal to the name of a feature which is supposed to be provided by the same operation the hints belongs to. If a feature with this name is not found, the text value will just be the feature name, so that users will be able to understand that there are issues in their data.
  - as for its size, it is determined as follows:
    - if the placeholder element is not `text`, and it has its attribute `class`=`fit`, the size is calculated so that its content fits the container element with the `placeholder` ID. For instance, the SVG code of the hint might represent a callout for insertion, where the balloon is a rectangle with id=`placeholder`, and the line ends into the handle point. This way, the text being added will appear inside the balloon.
    - else, the text value and the settings for drawing it determine the resulting size.

>In the documentation, we refer to hints whose SVG include a placeholder element as _placeholder hints_. There can be only either 0 or 1 placeholder hints per operation.

### SVG Rendition

The SVG content of each hint is positioned and sized according to the **reference bounding rectangle**.

The reference bounding rectangle ("RBR" for short) is defined as _the rectangle including all the bounding rectangles of all the subsequent nodes displayed for the text "selected" by an operation_. These nodes are the input nodes defined by trace features as explained above. So if a segment to be deleted is "def", its bounding rectangle is the rectangle including all the rectangles for "d", "e", "f".

⚠️ Note that if the segment happens to be _split_ between lines, because it includes a LF, then there will be _multiple reference bounding rectangles_, one for each portion of the segment text. In this case, the general logic for drawing hints is the same, but the component will _repeat_ the same hint, except the hint having a placeholder element, for each portion. The logic of this repetition is that in most cases hints represent decorations on top of their reference text, e.g. a strikethrough on top of the text being deleted; so, if this text happens to be split between two lines, we still need to apply strikethrough to all the reference text, and not only to a portion of it. The exception for the placeholder element is due to the fact that the placeholder element is an element including dynamically defined text (e.g. the text being added by a replace/insert operation), and this text should not be repeated.

The **rules for drawing** a hint's SVG are designed so that users who create hints can easily predict their outcome and animation:

1. the **hint size** is equal to that of its reference bounding rectangle, for hints which do not include a placeholder element. Once calculated in this way, the size can then be changed via its `scale` property, when this is set to something different from 1. This corresponds to what we defined as "select" in the description of trace features for each operation type.
2. the **hint position** is relative to its reference bounding rectangle, as specified in its metadata (see below). As for the visuals representing by the SVG code in the hint, its reference point for positioning relative to its reference bounding rectangle is given by its "handle" (see below about the `svg` property of a hint object).

The **hint's model** has the following properties:

- `svg`: a string with the SVG code representing the hint visuals. As for the SVG content:
- `position`: an enumerated string telling where to place the hint's handle with reference to the bounding rectangle of the affected text. This is defined by the The position has enumerated string values like those of cardinal points of a compass position: `n`, `ne`, `e`, `se`, `s`, `sw`, `w`, `nw`, plus `o` for origin (=the center of the bounding rectangle of the affected text). Each enumerated value refers to an imaginary larger bounding rectangle encompassing the reference bounding rectangle. Imagine to draw a rectangle which includes the reference rectangle. You then ideally place a point on this outer rectangle, like in this ASCII picture:

```txt

   nw        n         ne
   +---------+---------+
   |                   |
   |         o         |
 w +         +         + e
   |                   |
   |                   |
   +---------+---------+
   sw        s         se
```

- `offsetX`: number with X offset. This offsets the calculated start position of the hint (as per its `position` property) by an X amount. Default=0.
- `offsetY`: number with Y offset. This offsets the calculated start position of the hint (as per its `position` property) by an Y amount. Default=0.
- `scale`: the scale for drawing the hint. The initial size of the hint is equal to the size of its reference bounding rectangle, but the `scale` property can scale it up or down. The default is 1=no scaling, else it will be 1.1=110%, 0.9=90%, etc. Scaling is made with reference to the origin of the reference bounding rectangle.
- `rotation`: the rotation for drawing the hint, done with reference to the origin of the reference bounding rectangle. Default=0 (no rotation).
- `animation`: GSAP code for animating the hint's SVG so that it gets an "enter" animation. The GSAP animation targets the hint's element which is passed to the function wrapping its code (with name `hintEl`), together with other arguments referred to the metrics of the RBR. This is required to let GSAP find the animation target element (=the root `g` element in the hint's SVG), because the custom web component uses Shadow DOM and thus GSAP would not be able to use `getElementById`.

So, the general procedure for drawing prolog is:

- get the hints for the operation type. If there is none, there will be no prolog.
- get the reference bounding rectangles from the tracing features in current step, as described above. In most cases there will be just 1, unless the text is split in 2 or more lines.
- for each reference bounding rectangle (sorted from top to bottom and from left to right):
  - for each hint (in the order they are specified in settings):
    - draw the hint with opacity=0 if there is a GSAP animation for that hint. This avoids a "flash" before GSAP enter animation kicks in.
    - if there is a GSAP animation, get its JS code, then run it synchronously, i.e. wait until GSAP animation has completed before continuing.

#### Designing Hints

Hints can be freely replaced by others designed by users. The whole component is designed to allow for maximum flexibility and customization, and hints play a special role here because they can be customized not only for each operation type, but also for each single operation (based on its ID). Also, as reminded above, users might also provide an adapter layer for dynamically build settings, by mapping selected operation features to specific hints.

To this end, the hints logic in prolog is designed to be very predictable and do most of the math. Users should just be able to design their hints and animations, and copy-paste their code into settings.

Ideally, users would just use any JS playground, like CodePen, to design and test each hint, and then use them when ready. Or inversely, copy hints from other users code into a playground, modify it, and paste them back.

For instance, in CodePen one might have these predefined resources to setup a hints editing environment:

- HTML: a container for a fixed size SVG element, and some navigation controls which allow to pick any of the hints being designed, or just move to the previous or next one.
- CSS: proper styles for the HTML.
- JS: the hints list, and code to deal with GSAP animation. This can use `GSDevTools` to let users play the animation, pause and resume it, rewind it, etc. Hints should be contained in the same structure used by settings, i.e. a map keyed by either the hint type or the operation's ID (typically users would just provide mock ID strings, and later replace them).

Users would just open a new CodePen, copy-paste the template code for HTML, CSS, JS, paste their hints in the map, and edit them at will. When complete, the map would be copied back into the code using the component.
