# GVE Snapshot Rendition Component

- [GVE Snapshot Rendition Component](#gve-snapshot-rendition-component)
  - [Rendered Entities](#rendered-entities)
  - [Animations](#animations)
  - [Text](#text)
    - [Base Text](#base-text)
    - [Additional Text](#additional-text)
    - [Text Rendition Features](#text-rendition-features)
    - [Init Features](#init-features)
  - [Hints](#hints)
    - [Hint SVG Content Property](#hint-svg-content-property)
      - [Hint SVG Placeholders](#hint-svg-placeholders)
    - [Hint Transformation Properties](#hint-transformation-properties)
    - [Hint Positioning Properties](#hint-positioning-properties)
    - [Hint Animation Property](#hint-animation-property)
    - [Hint SVG Rendition](#hint-svg-rendition)
      - [Displaced Hints](#displaced-hints)
    - [Designing Hints](#designing-hints)
  - [Drawing Logic](#drawing-logic)
  - [Component Design](#component-design)
    - [API](#api)
    - [Component Settings](#component-settings)
    - [Component UI](#component-ui)
      - [Component UI: Toolbar Area](#component-ui-toolbar-area)
      - [Component UI: Text Rendition Area](#component-ui-text-rendition-area)
      - [Component UI: Versions List Area](#component-ui-versions-list-area)
        - [Text Hilites](#text-hilites)
      - [Component UI: Version Text Area](#component-ui-version-text-area)
      - [Component UI: Details Area](#component-ui-details-area)
  - [Example](#example)

The purpose of this component is to render an interactive representation of the multiple versions of a text as defined by editing operations and their features.

As explained, text variants are built by accumulating the changes made to it by each editing operation from an ordered set of them. Except for the first operation, which works on the base text, each operation gets as input the output of a previous operation, and outputs a new version of the text, progressively numbered (`v1`, `v2`... etc.).

Each operation has a set of features, which are name=value pairs where both name and value are strings. Among them, some are used by this component to define its rendering parameters for the visual counterpart of each operation (the so-called "hints").

The component is completely based on **SVG** on a **text rendition area**, which is complemented by other areas used for toolbars and other purposes.

The idea for this web component is to represent the changes to the text in a symbolic, yet fully diplomatic way. So we do not want to just output the text generated each time we execute an operation; we want to represent how it appears on the original sheet. Everything gets accumulated on the same display surface, operation after operation; just like everything accumulates on the same sheet, editing after editing.

The display starts with the base text. Now, say a delete operation removes a word. Say this is represented in the original sheet by a line drawn on top of that word. This line hints at the deletion operation. So, while the delete operation effectively generates a text which no longer contains that word, graphically we still have that word, with a line on it.

Thus, the component will display right this: a line on top of the word. The generated text is displayed in the text version area, but in the main text rendition area, we just add that: a line.

Now, say the next operation replaces a word X with another one Y, and that in the sheet, this happens to be graphically represented by word Y written in smaller size, right above word X. Again, the operation generates a new text with the replaced word, but the main text rendition area just shows word Y above word X. And so forth. These "hints" about operations get accumulated, thus reproducing the original sheet and its signs; while the new text appears in another area of the same component.

## Rendered Entities

The component renders these entities:

- **text**:
  - **base text**: the `v0` text, the input text to start with to transform it via editing operations. In most cases, it is visually identified by the text written on regular rows, with the same ink, by the same hand.
  - **additional text**: the text successively added by insert/replace operations. This is drawn character by character, just like the base text, but its size, position, and rendering features are calculated according to the operation's features and the default rendering settings.
- **hints** which represent the visual counterparts of each editing operation. Each operation has 0-N hints, defined in the order they are meant to be displayed. Each hint can be any shape, e.g. a stroke on a word corresponding to a delete operation for that word, or also some static text like an annotation. Hints too are defined via SVG.

## Animations

A crucial feature of the component is that it must show text changes dynamically, in action, smoothly transforming each version into the next one. This requires a systematic usage of animations to show the continuity of the text making process from stage to stage.

All animations are based on the **GSAP library**. We use GSAP for animations because it's robust and powerful, and has many powerful plugins available. Note that while plugins first were limited to paid subscriptions, they are now _freely available_ for everyone. All what is required to use a plugin is registering it once in code, e.g.:

```ts
// register a plugin for use
gsap.registerPlugin(DrawSVGPlugin);
console.log("DrawSVG plugin registered:", gsap.plugins.drawSVG !== undefined);
```

💡 For GSAP you can see:

- [GSAP Documentation](https://greensock.com/docs/)
- [DrawSVG Plugin](https://greensock.com/docs/v3/Plugins/DrawSVGPlugin): plugin for animating SVG.

As all the elements which enter the text rendition never leave it, all settings-based animations represent _entrance_ animations, and they are provided via JS code fragments in **settings**.

> Besides settings-based animations, other animations exist, managed by code only, like transitions in [spreading](#drawing-logic) or [text hilites](#text-hilites), which are rectangle SVG elements temporarily displayed behind text elements to "hilite" them.

There are 2 places for animation code fragments in settings:

- `animations`: the main "catalog" of animations is a dictionary where key=animation ID (an arbitrary string) and value=JS code fragment representing the animation.
- `hints`: each hint can have its own animation JS code fragment in its `animation` property. When this property value starts with `#`, it does not directly contain the code fragment, but it is rather a reference to an animation expected to be present in `animations`. So, for instance `#wipe-right` is the reference to an animation expected to be found in `animations` under key `wipe-right`.

All animations **target** a single designated element; for text characters, this is an SVG `text` element; for hints, this is a root `g` element in the hint SVG code fragment. As this is a custom web component, it uses Shadow DOM, which makes such code fragments for animation unable to use `getElementById` to get a reference to the target element. We thus need to _explicitly provide a reference to this element_ to the GSAP code. So, the rendering component:

1. creates the _target element_, with its computed size and position and (when it is going to animate its entrance) sets its initial opacity to 0.
2. creates a _JS function_ wrapping the JS animation code fragment got from settings; the function receives these parameters:
   1. `gsap`: the global instance of the GSAP library, defined once outside this JS code;
   2. `targetEl`: the created target SVG element;
   3. `rootEl`: the root `svg` element of the whole text rendition area, should it ever be required by the GSAP animation code.

## Text

### Base Text

The base text is rendered in a rather predictable and simple way, according to the component's **rendition settings** (font family, size, color, etc.), which are set in this order of increasing specificity:

1. the _default settings_ of the component, set when the component is initialized.
2. the settings overridden by consumer code via _data binding_. So, the component uses all its default settings, unless overridden by the consumer code via binding.
3. the settings overridden by data via [init-features](#init-features), i.e. those features which are added by an initial annotate operation.

> The source for the base text is in `CharChainResult`.`text` as either an array of `CharNode`'s, or a string. When it is a string, the array of nodes is automatically generated by just creating one node per character, in their order, and assigning to each node a progressive ordinal number as its ID. So the first character of a text will get ID=1, the second ID=2, and so forth.

Base text **drawing logic**:

- the text is drawn by rendering **one character after another**, along the same baseline, until a LF character is found. Each character corresponds to a text node in the operation's output, and is thus a single `text` SVG element.
- each `text` SVG elements gets these computed **attributes**:
  - `id`=`n_` + the character node ID (which is a unique integer), e.g. `n_1` for the character node with ID=1.
  - `class`: the following space-delimited classes:
    - `node`, meaning this `text` element represents a character node (other `text` elements might be added from hints).
    - `v0`, meaning that this `text` element was added with the base text, rather than later by another operation.
- when a **LF character** is found (U+000A), a new line starts below the previous one, left-aligned with it. The baseline of specific lines can anyway be offset by [text rendition features](#text-rendition-features). The only other non-printable character used in text of any sort (both base text and additional text) is **space** (U+0020): as SVG has no intrinsic rendition for a `text` element including only one space, this must be rendered by offsetting the position of the next character by a specific amount. The amount must be calculated according to the width of a _reference character_, as rendered with the current text settings (font family, size, style, etc.). So, to this end, the component must:
  - use `m` as the reference character. Make this a constant, so I can change the reference character.
  - make the space width a fraction of the computed width of the reference character, once all the current text rendition settings have been applied to it. This is defined by component setting `spaceWidthFraction` which defaults to 0.33 as usually the space is 1/3 of the `m` width.
- text **never wraps**, whatever the container size. Anyway, the container supports zooming and panning for the whole text rendition area.

🎥 The base text **animation** is enabled when setting `charAnimationId` (whose value references an entry expected to be found in the `animations` catalog of animation code fragments in settings); otherwise, no animation is applied and the text appears at once. For each character rendered as an SVG `text` element:

1. the text element is created and added to the text rendition area with initial opacity=0.
2. the GSAP animation is wrapped in a function, which is invoked to run the animation.
3. after the animation completes, we continue with the next character.

### Additional Text

In addition, new text often comes from insert or replace operations. This text has the same model of the base text: each segment of text added is a sequence of character nodes, each with its unique ID and its set of features. Anyway, differently from the base text, their style, size and position are completely defined by specific rendition logic combined with its [text rendition features](#text-rendition-features).

Thus, the display procedure for text is:

1. first draw all the base text.
2. then, whenever an operation adding some text (i.e. insert or replace operations) must be rendered, draw its nodes on top of the existing text rendition area. Text accumulates, like when you write on a physical sheet of paper; once you have written the base text, you write other text wherever you find some room for it: maybe above the line, or below it, or next to it at its left or right, or at a corner with some callout pointing to the intended location, etc. In the end, the text drawn will be a faithful representation of what is seen on that sheet. Note that this also implies that deleted text does not disappear. It just stays there, maybe decorated by some hints like a strikethrough. Once the text is displayed, it stays there forever, even if the whole text might accommodate to fit newly added text, e.g. by making more room between two lines when a new text must be displayed above one of them and below the another one.

Like for base text, each SVG `text` element representing one character of the additional text gets these computed attributes:

- `id`=`n_` + the character node ID (which is a unique integer), e.g. `n_1` for the character node with ID=1.
- `class`: the following space-delimited classes:
  - `node`, meaning this `text` element represents a character node (other `text` elements might be added from hints).
  - `vN`, where `N`=number of the version output by the operation which added the `text` element. For instance, if the operation being processed tags its output version as `v3`, then the `text` elements for all the characters added by this operation will get a `v3` class.

> So in the end the `vN` class attribute in any SVG `text` element specifies which operation first introduced it in the text rendition area (the version output number is univocally linked to a specific operation). It is `v0` for the base text, and any positive number for text elements added by operations. This is also used to identify all the portions of text introduced by a specific version.

### Text Rendition Features

Text rendition features are used to override the default rendering settings for text, whether it is the base text (when used as [init-features](#init-features)), or the text progressively added by an insert/replace operation.

All rendering features have their name starting with `r_`. These are the only features taken into account by the renderer component for rendition purposes. Their list follows.

> Note: some of these features are meaningful only when used as init-features, i.e. in the very first operation (an annotation operation). In this case they are marked by ⭐ in the list which follows. If found later in an operation, such features will be simply ignored.

- `r_char-offsets` ⭐: the character offsets for rendering some specific text nodes (and thus indirectly also all the character nodes following it, up to line end). In most cases, this is used to change line layout by adding indent, or increasing or decreasing space between lines. Usually, text is rendered in a regular, predictable way, just like text is normally rendered in frame: one character after another on the same baseline, until a newline character is found. When this happens, a new line starts below the previous one, left-aligned with it. This is the default layout which assigns the position to each baseline, according to general settings defined in the component's settings (default font size, default spacing between lines, etc.). This default position can be changed for specific characters by the value of this feature, whose format repeats the pattern `ID:y=...,x=...` (where we can specify only `x`, only `y`, or both, in any order; values represent `px` units). In this pattern:
  - `ID`=character ID. Each character has its unique numeric ID directly got from snapshot data. So here we target the character to be offset. As per the general text layout rules, once we offset this target characters, all the other characters will follow on the same baseline, unless any of them has another offset.
  - `y`=Y offset to add to the computed character baseline, thus shifting its default position down (when the offset is positive) or up (when the offset is negative).
  - `x`=X offset to add to the computed character baseline, thus shifting its default position to the right (when the offset is positive) or to the left (when the offset is negative).
- `r_char-offset`: this works as `r_char-offsets`, but it is provided in the features of a single character node, instead of being an initial setup for multiple characters. For instance, `3:y=10,x=20` means that before rendering the character with ID=3, the baseline will be shifted down by 10 and the X position of the next character will be offset by 20, thus effectively leaving a wider gap between the previous character and the next ones. All the following characters up will follow on this newly defined baseline, unless any of them happens to have another offset.
- `r_font-size`: the font size.
- `r_font-family`: the font family.
- `r_fore-color`: the foreground color.
- `r_back-color`: the background color.
- `r_italic`: the italic value (boolean).
- `r_bold`: the bold value (boolean).
- `r_text-line-style`: the style of overline, underline, or strikethrough: `solid`, `dotted`, `dashed`, `wavy` (as in SVG and CSS; corresponds to SVG `text-decoration-line`).
- `r_text-line-color`: the default color of the overline, underline or strikethrough.
- `r_underline`: the underline value (0-N being the thickness in `px`).
- `r_overline`: the overline value (as for underline).
- `r_strike`: the strikethrough value (as for underline).
- `r_rotate`: the rotation amount to be applied to each single character.
- `r_text-position`: the position of added text relative to the RBR. This works exactly like hint's `position` property: see [hint positioning properties](#hint-positioning-properties).
- `r_text-offset-x`: the X offset for the added text, relative to the computed `r_text-position`. This works exactly like hint's `offsetX` property: see [hint positioning properties](#hint-positioning-properties).
- `r_text-offset-y`: the Y offset for the added text, relative to the computed `r_text-position`. This works exactly like hint's `offsetY` property: see [hint positioning properties](#hint-positioning-properties).
- `r_hints`: this feature is used to link the operation to any number of hints. The value is a space-delimited list of hint IDs, in the order they should be rendered for that operation.
- `r_border`: the border to draw around the text. This is different from other rendition features which directly map to SVG text decorations. This is rather a a shortcut to draw one or more edges as an imaginary rectangle wrapping the text. In reality, the component just draws lines along the edges of this imaginary rectangle, one line per edge (top, left, right, bottom), as requested. Its value pattern is `EDGES THICKNESS PADDING TYPE COLOR`, where:
  - `EDGES` is any combination of characters `tlbr` where `t`=top, `l`=left, `b`=bottom, `r`=right.
  - `SIZE` is a number (representing `px`).
  - `TYPE` is an SVG line type among `solid`, `dotted`, `dashed`, `wavy`.
  - `COLOR` is a color.
    So for `r_border`, for instance `tl 1 4 solid silver` means that the text will have two edges, one at top and one at left, each with 1px thickness and silver color, both offset by 4px (padding) from the bounding rectangle of the text.
    Note that `r_border` SVG line elements are just drawn after the text has been drawn character by character (with their animations when set), with no animation. They just appear at once and variously "box" the text drawn.
- `r_text-displaced-span`: a span of base text with format `IDxN` where `ID`=node ID and `N`=count of chars to include, to be used as the RBR instead of the default RBR. This works exactly like a [displaced hint](#displaced-hints), but is applied to added text.
- `r_hint_vars`: this has no effect on text; it is just a rendition feature used only to define a set of variables to be used by [hints placeholders](#hint-svg-placeholders). Each variable has name=value, and is separated with space. For instance, `color=red bold=1` to pass variables `color`=`red` and `bold`=`1` to the hints being rendered for the operation being processed.

> All these features can be combined, so characters are displayed only after evaluating all of them, and their size and text layout changes accordingly to fit all the characters with their size, which may depend on one or more of these features. Also, in backend all rendition features have their lifespan limited to the version generated by their operation. This avoids accumulating them in the output context, ensuring that they are valid only for the immediate output of the operation containing them.

### Init Features

Init-features, when set, are provided by an **initial annotation operation**. Annotation operations are those operations which just modify the set of features, in most cases by adding new ones, without changing the text. So, the purpose of an initial annotation operation is to provide a sort of initial rendering setup.

Init features are just _rendition features_ which happen to be used in the very first operation applied to the base text, which must be an annotation operation. So, when the result from a snapshot starts with an annotate operation and this operation contains rendition features, it is implied that these are going to override the component's settings themselves, thus defining new defaults.

So, all init features:

- apply to the rendition of the text (base or added).
- define the default for all text renditions, which can always be overridden by specific (non-init) features.

In other terms, this is a way of changing the corresponding settings of the renderer component. This way, we can inject settings from data, thus overriding those set by consumer software.

## Hints

Each hint represents the visual counterpart of an operation; it "hints" at it by means of its visuals, whence its name.

As for its implementation, the hint essentially is an SVG fragment representing something to be rendered on the component text rendition area and corresponding to a specific operation. This rendering always happens before adding the text possibly introduced by that operation, when there is any.

As for hints **definition**:

- hints are **defined** in a dictionary in the component's settings. The dictionary has a string key equal to the hint's ID, and a string value equal to its SVG code.
- hints are **linked** to operations via a special `r_hints` [text rendition feature](#text-rendition-features), which contains the IDs of all the hints to use for that operation. For instance, `r_hints` = `alpha beta` means that we want to apply 2 hints with ID `alpha` and `beta`, in this order.

This is the hint's model:

```ts
/**
 * Hint position relative to the reference bounding rectangle.
 */
export type HintPosition =
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "nw"
  | "o";

/**
 * An editing operation's hint.
 */
export interface OperationHint {
  svg: string; // SVG code for hint's visuals, always having a root g element
  position: HintPosition; // relative position for the hint
  offsetX: number | string; // absolute (10) or proportional ("0.5th" = half text height, "0.5tw" = half text width)
  offsetY: number | string; // absolute (10) or proportional ("0.5th" = half text height, "0.5tw" = half text width)
  scaleX: number; // horizontal scale: 1 = match bounds width, 1.1 = 110% of bounds width
  scaleY: number; // vertical scale: 1 = match bounds height, 1.1 = 110% of bounds height
  rotation: number; // optional hint's rotation (0=none)
  animation?: string; // JS code for animating the hint's entrance via GSAP
  displacedRefSpan?: string; // a span of base text with format IDxN where ID=node ID and N=count of chars to include, to be used as the RBR instead of the default RBR
}
```

The following sections describe some of these properties and their usage.

### Hint SVG Content Property

The hint's `svg` property (`OperationHint.svg`) is a string representing the SVG content of a hint. The SVG content has these characteristics:

- by convention, its **root element** is always a `g` element. This allows to manipulate the whole hint as a single entity (e.g. for transforming or animating it). So, there is no `svg` root; this is just a code fragment. When inserting it in the page, the component wraps the root `g` into a newly created `svg` element. When adding the hint, the component also adds a **unique identifier** to it, by setting the root `g` element's `id` attribute to a value like `hint-X` where `X` is built of:
  - the _operation's ID_. Each hint is linked to the operation which is going to generate the next step.
  - an _ordinal number_ suffix preceded by `-`: 1=first hint for that operation, 2=second hint for that operation, etc. This ensures that every hint `g` element placed in the component step being drawn is unique within that scope, because each operation has a unique GUID, and each operation's hint has its ordinal suffix.
- inside this root `g` element we can have **any SVG code** with groups, shapes, lines, text, etc. Apart from sizing and positioning it, and possibly overriding some of its properties dynamically (e.g. color, text decorations, etc.), the component will just render it as it is.
- it may contain a **handle** element with `id`=`handle`. This represents the "handle" for the SVG code, i.e. the point in it which is used as _the reference for positioning it_. If there is no such handle element, then the component just uses the _center of the bounding rectangle_ for the whole SVG (i.e. its root `g` element, which is always present). Often, in the hint SVG code the handle element has opacity=0 so it is not visible; but this is up to the SVG code you get from the hint. Anyway, the setting `showHintHandles` can force such hidden handles to be displayed setting their opacity to 1 for diagnostic purposes.
- it may contain a **placeholder** element with id=`placeholder`. This is usually an SVG shape, like a rectangle including a `text` SVG element which represents the text to draw, or directly a `text` element. Whatever the placeholder element is, in the end it either is a `text` element, or it contains a `text` element. This text element has this behavior:
  - its _text value_ is resolved at runtime: in the hint SVG, it is just the _name of the variable_ containing the text. This is equal to the name of a _feature_ which is supposed to be provided by the same operation the hints belongs to. If a feature with this name is not found, the text value will just be the feature name, so that users will be able to understand that there are issues in their data.
  - as for its _size_:
    - when the hint's placeholder element has a `class` attribute equal to `fit`, the text's size is calculated so that its content fits the container element with the `placeholder` ID. For instance, the SVG code of the hint might represent a callout for insertion, where the balloon is a rectangle with id=`placeholder`, and the line ends into the handle point. This way, the text being added will appear inside the balloon. So, here the text must fit into the container.
    - else, the text value and the settings for drawing it determine the resulting size of `text`. This implies that all the SVG elements containing this `text` element, including the root `g` element, must scale to fit it inside them. So, this is the inverse case with reference to the default one: here the container must fit the text.

> In the documentation, we refer to hints whose SVG include a placeholder element as _placeholder hints_. There can be only either 0 or 1 placeholder hints per operation.

#### Hint SVG Placeholders

The SVG code in the hint's `svg` property can include placeholders, which are wrapped in `{{...}}` (whiskers) and are represented by the name of the feature we want to get the value from. For instance, `<rect width="100" height="50" fill="{{r_color}}" />` has a placeholder `{{r_color}}` meaning that we will have to replace it with the value of a feature named `r_color` (or with nothing, when that feature is not found).

When getting the hint's `svg`, the component must take care of resolving all these placeholders before proceeding further.

### Hint Transformation Properties

These properties are used to transform the hint _before_ filling placeholder elements, and before positioning the hint. These transformation affect the hint's size, so it is essential that they are applied before calculating its position. For placeholder elements, further size adjustments can be made according to the rendering mode chosen for that placeholder (`fit` or not); so, these will happen after these transformations, but before positioning the hint. This way:

- in `fit` mode, the transformations described by these properties will affect dynamically rendered text, as text fits into its placeholder container.
- in the default (non-`fit`) mode, the transformations described by these properties will not affect dynamically rendered text, which has its own preset size depending on its text rendition settings.

The hint transformation properties are:

- `scale`: the scale for drawing the hint. The initial size of the hint is equal to the size of its reference bounding rectangle, but the `scale` property can scale it up or down. The default is 1=no scaling, else it will be 1.1=110%, 0.9=90%, etc. Scaling is made with reference to the origin of the reference bounding rectangle.
- `rotation`: the rotation for drawing the hint, done with reference to the origin of the reference bounding rectangle. Default=0 (no rotation).

### Hint Positioning Properties

These properties define the position of the hint. As hint positioning is relative, _defining the position involves first defining the size_ of the hint's bounding rectangle.

The **hint's size** is defined by this logic:

1. the hint SVG `g` element is created;
2. its transformations, if defined, are applied;
3. if it's a placeholder hint, the first `text` element descendant of the placeholder element gets its text dynamically calculated (from the specified operation's feature), and the size is adjusted accordingly, as described above about placeholder elements;
4. the bounding rectangle for the resulting `g` element is calculated;
5. the hint's handle coordinates are calculated according to its handle element, when present; if not present, the center of the bounding rectangle calculated in the previous step is used instead.

Then, **positioning hints** is driven by these properties:

- `position`: an enumerated string telling where to place the hint's handle with reference to the bounding rectangle of the affected text (the "RBR"). The position has enumerated string values, like those of cardinal points of a compass position: `n`, `ne`, `e`, `se`, `s`, `sw`, `w`, `nw`, plus `o` for origin (=the center of the bounding rectangle of the affected text). Each enumerated value refers to an imaginary larger bounding rectangle encompassing the reference bounding rectangle. Imagine to draw a rectangle which includes the reference rectangle. You then ideally place a point on this outer rectangle, like in this ASCII picture:

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

- `offsetX`: the X offset. This offsets the calculated start position of the hint (as per its `position` property) by an X amount. Default=0. Offsets use either a simple number, e.g. `10`, or a suffixed number, using these suffixes for metrics derived from the reference text bounds:
  - `th` = reference text bounds height.
  - `tw` = reference text bounds width.
    This way we can offset proportionally to the reference text. So, `10`=offset by 10, but `0.5th` = offset by half of the reference text height.
- `offsetY`: the Y offset, like `offsetX`. This offsets the calculated start position of the hint (as per its `position` property) by an Y amount. Default=0.

### Hint Animation Property

The hint's `animation` property contains:

- the JS code using the GSAP library for animating the hint's SVG, so that it gets an "enter" animation.
- the identifier of a preset animation JS code using the GSAP library for animating the hint's SVG, prefixed by `#`. So, if the string starts with `#`, it is assumed that it just contains the ID of a preset animation which must be retrieved to get the corresponding JS code. Such preset animations can be defined in the component's settings. Of course, whatever the way used to get it, in the end what we have is JS animation code.

> We use GSAP for animations because it's robust and powerful, and has many powerful plugins available. Note that while plugins first were limited to paid subscriptions, they are now _freely available_ for everyone. All what is required to use a plugin is registering it once in code, e.g.:

```ts
// register a plugin for use
gsap.registerPlugin(DrawSVGPlugin);
console.log("DrawSVG plugin registered:", gsap.plugins.drawSVG !== undefined);
```

The GSAP animation targets the hint's root `g` element, i.e. the whole hint. Note that the rendering component is a custom web component, so that it uses Shadow DOM and we thus need to _explicitly provide a reference to this element_ to the GSAP code (otherwise, GSAP would not be able to use `getElementById`). So, the rendering component:

- creates the hint's `g` element.
- creates a JS function wrapping the JS animation code got from the hint, and receiving these parameters:
  - `gsap`: the global instance of the GSAP library, defined once outside this JS code;
  - `hintEl`: the created hint's root `g` element;
  - `rootEl`: the root `svg` element of the whole text rendition area, should it ever be required by the GSAP animation code.

💡 As a reference, see:

- [GSAP Documentation](https://greensock.com/docs/)
- [DrawSVG Plugin](https://greensock.com/docs/v3/Plugins/DrawSVGPlugin): plugin for animating SVG.

### Hint SVG Rendition

The SVG content of each hint is positioned and sized according to the **reference bounding rectangle**.

The reference bounding rectangle ("RBR" for short) is defined as _the rectangle including all the bounding rectangles of all the subsequent nodes displayed for the text "selected" by an operation_. These nodes are the input nodes defined by trace features as explained above. So if a segment to be deleted is "def", its bounding rectangle is the rectangle including all the rectangles for "d", "e", "f".

⚠️ Note that if the segment happens to be _split_ between lines, because it includes a LF, then there will be _multiple reference bounding rectangles_, one for each portion of the segment text. In this case, the general logic for drawing hints is the same, but the component will _repeat_ the same hint, except the hint having a placeholder element, for each portion. So, more formally:

- for each reference bounding rectangle:
  - for each hint:
    - unless the hint is a placeholder hint and has already been drawn once, draw it and animate it.

The logic of this repetition is that in most cases hints represent decorations on top of their reference text, e.g. a strikethrough on top of the text being deleted; so, if this text happens to be split between two lines, we still need to apply strikethrough to all the reference text, and not only to a portion of it. The exception for the placeholder element is due to the fact that the placeholder element is an element including dynamically defined text (e.g. the text being added by a replace/insert operation), and this text should not be repeated.

The rules for sizing and positioning a hint's SVG are designed so that users who create hints can easily predict their outcome and animation:

1. the **hint size** is equal to that of its reference bounding rectangle, for hints which do not include a placeholder element. Once calculated in this way, the size can then be changed via its `scale` property, when this is set to something different from 1. If a hint margin is defined in settings (`hintMargin`), a margin is systematically added to the resulting hint size. For instance, if hints margin is set to 2, a hint has `scale`=1.1, and its reference bounding rectangle is 200x50, this means that the hint will be first scaled to 220x55, and then it will get a 2px margin on each side, whence a final size of 224x59.
2. the **hint position** is relative to its reference bounding rectangle, as specified in its metadata. As for the visuals representing by the SVG code in the hint, its reference point for positioning relative to its reference bounding rectangle is given by its "handle" (see below about the `svg` property of a hint object).

#### Displaced Hints

Hints, like added text, may be **displaced**. For instance, it happens that a replacement text is written not above or below or to the side of the replaced word, but far from it, e.g. below the last line of the text, just because there was space in that position; and then some other hint (e.g. a box around text, an asterisk, etc.) virtually connects the hint to its text.

In these cases, the hint uses a different RBR, which is explicitly defined in its `displacedRefSpan` property. This has value `IDxN`, where `ID`=node ID (the node must be a base text node) and `N`=count of chars to include starting from it, to be used as the RBR instead of the default (computed) one. For the rest, the rendering is exactly the same.

> The limitation about the displacement reference nodes to base text nodes only derives from the fact that base text nodes are the only nodes where identifiers are granted to be continuous. Node IDs are numbers progressively incremented, which implies that when first creating text nodes, they all belong to the base text and thus get created all at the same time. This ensures their IDs correspond to the ordinal position of each character in the base text. Later, operations might well scramble the order of nodes, so that we can no longer count on the fact that the node after a node with e.g. ID=3 has ID=4. So, this limitation simplifies the computation of RBR for displaced nodes, and should not be an issue because displaced hints in real sheets always refer to base text.

### Designing Hints

Hints can be freely replaced by others designed by users. The whole component is designed to allow for maximum flexibility and customization, and hints play a special role here because they can be customized not only for each operation type, but also for each single operation (based on its ID).

To this end, the hints logic is designed to be very predictable and do most of the math. Users should just be able to design their hints and animations, and copy-paste their code into settings. The logic by which hints are drawn is designed to be as simple as possible so that users can predict the outcome when designing their custom hints.

The main points for drawing, sizing and animating hints are:

- as for sizing, the initial size of the hint `g` root element is fit to the size of its reference bounding rectangle. So, the user should be able to say that given the reference text that he sees, if using the default `scale`=`1` this means that the calculated size will be exactly that of the reference text bounds. The `g` root element will thus have the same width and height of the reference text rectangle. If instead the user sets `scale`=`1.1`, this is 110% of the bounds. Anyway, for more flexibility, we can make scaling more flexible replacing `scale` with `scaleX`=scale X only and `scaleY`=scale Y so we can transform with a non-uniform scale.
- scaling should not affect the handle, which means that, we need first to scale, and then to position according to the handle. Each relative position like nw, n, ne, etc. must be honored with reference to the handle. So if we have a rectangle in the hint, and its handle is the mid vertical point of its right edge, we assume that this rectangle will appear right before its text, on its left, vertically centered with reference to it; even if we want it scaled to be a bit larger than that text, e.g. both `scaleX` and `scaleY` = `1.1`.
- then, after scaling and positioning, the user might want to slightly modify the position using the offset, or rotate the result. It would be like nudging a rectangle after having drawn it where it belonged.

So, the drawing process for hint's SVG should be:

1. compute the size of the hint with reference to the text bounds, according to `scaleX` and `scaleY` and hint margin.
2. reposition the resulting drawing (the `g` root element of it) according to its handle, whatever its computed size. If there is no element with ID=handle, just use the center of the root `g` element as the handle.
3. adjust the positioned hint `g` root element by `offsetX`, `offsetY`, and `rotate`.

This would fit a scenario like this:

1. the user draws a rectangle to represent the selection of a text to move.
2. scale is set to `1.1`, because he wants to enclose the text in it, so this makes it 110% of the enclosed size. Position is `o` so that scaling will not pan it and we will have a rectangle fully including another rectangle sharing the same center.

Here, the user expects to see a rectangle slightly bigger than the one of the reference text, fully enclosing it. This is clear from the parameters and from the drawing process depicted above.

To make designing hints easier, users can leverage any JS **playground**, like CodePen, to design and test each hint, and then use them when ready. Or inversely, copy hints from other users code into a playground, modify it, and paste them back.

For instance, in CodePen one might have these predefined resources to setup a hints editing environment:

- HTML: a container for a fixed size SVG element, and some navigation controls which allow to pick any of the hints being designed, or just move to the previous or next one.
- CSS: proper styles for the HTML.
- JS: the hints list, and code to deal with GSAP animation. This can use `GSDevTools` to let users play the animation, pause and resume it, rewind it, etc. Hints should be contained in the same structure used by settings, i.e. a map keyed by either the hint type or the operation's ID (typically users would just provide mock ID strings, and later replace them).

As a reference, see the documentation about the [GSAP Easing Visualizer](https://greensock.com/ease-visualizer/).

Users would just open a new CodePen, copy-paste the template code for HTML, CSS, JS, paste their hints in the map, and edit them at will. When complete, the map would be copied back into the code using the component.

## Drawing Logic

The general drawing logic for the entities rendered by this component is outlined below. An additional feature must be first introduced: the "solid" feature. When drawing hints or added text characters, there are two possible behaviors:

1. **default**: the default behavior is to just draw the element as its position and size dictates, initially hidden (opacity=0) if it has an animation, which immediately after reveals it, with no preliminary adjustments.
2. **solid**: the "solid" behavior adds a preliminary adjustment before following the default one, to make room for the element to be rendered. When this element is "solid" (i.e. when it's a hint and has `solid`=`true`, or when it's an added `text` element, which is always solid), we must ensure there is enough room for it to be rendered without overlapping any surrounding elements. This means shifting the surrounding elements on overlap; and in turn, this implies moving all the elements in the rendered text so that we approximately preserve the previous layout. The process of making room for the new element while preserving the general layout is here named **spreading**.

The **spreading logic** is as follows; here "E" means the bounding rectangle of the element to be drawn, E.L its top-left corner X, E.R its top-right corner X, E.T its top-left corner Y, and E.B its bottom-left corner Y:

TODO: update spreading logic description from code, this had flaws!

- if E does not overlap with any other element's bounding rectangle, no spreading is required. ⚠️ Note: as calculating the bounding rectangles for all the elements in the text rendition area would be costly, it is suggested to store them in an internal private map in the renderer component; whenever a new element is added, the map is updated with its bounding rectangle. Elements once added are never removed, so this cache is effective.
- else, spreading is computed for the X and Y axes separately, before applying it:
  - on the X (=horizontal) axis:
    - let `rShift` = the maximum extent of horizontal overlap between E and any other element to its right.
    - let `lShift` = the maximum extent of horizontal overlap between E and any other element to its left.
    - all the elements whose L is < E.L and whose R is < E.R must be shifted leftwards by `xShift`.
    - all the elements whose L is > E.L and whose R is > E.R must be shifted rightwards by `xShift`.
  - on the Y (=vertical) axis, we proceed in the same way, using T and B (top and bottom) for up and down shift rather than L and R for left and right shift.

The logic can be visually illustrated as follows (for the horizontal axis, and the same applies for the vertical one, by just changing horizontal with vertical; see the image below, where each rectangle is labelled with a Latin or Greek letter):

![spreading](img/spreading.png)

- consider E, the bounding rectangle of the element to be drawn;
- draw an infinite vertical line overlapping with its left edge (let's call it "left ruler"), and another one overlapping with its right edge (let's call it "right ruler"); these are the big vertical lines labelled "L" and "R" in the image.
- all the elements, whatever their vertical position, which are either to the left of the left ruler, or are cut by it (which happens to the b-element in the image), must be shifted leftwards by the max amount of left-overlap (which is the maximum value from the modulus of the difference of the R X-coordinates of E with any of the overlapping elements; in the image, this is the portion of the b-rectangle filled with horizontal dashes).
- all the elements, whatever their vertical position, which are either to the right of the right ruler, or are cut by it, must be shifted rightwards by the max amount of right-overlap (which is the maximum value from the modulus of the difference of the L X-coordinates of E with any of the overlapping elements; in the image, this is the portion of the γ-rectangle filled with horizontal dashes).
- the elements which are fully inside the two rulers (like the e-rectangle in the image) remain untouched where they are.

🎥 The spreading dramatically changes the whole text layout, so the component here must shift all the affected elements using a transition effect **animation**, where elements smoothly move to their new position, both on the X and Y axis, rather than "jumping" abruptly to it. The timing for this transition, which like all animations should be based on GSAP, is defined by setting `spreadTime`.

So, the **rendition logic** is:

1. base text is drawn by adding 1 `text` SVG element per character, possibly animating each character with the "enter" animation defined in settings when there is one (in general, "enter" animation means that the element starts hidden, i.e. with opacity 0, and then opacity gets animated in various ways).
2. whenever moving to another version (whose output tag points to its operation):
   1. the RBR's (1 or more, when reference text is split into 2 or more lines) are computed.
   2. if there is a `r_hints` feature, for each RBR, each hint is fetched from settings (`hints` map, keyed by hint ID) and if found:
      1. apply _spreading_ to SVG elements when it has a `solid` feature with its animation and wait for it to complete.
      2. draw the hint, with its "enter" animation when this is specified in its `animation` property.
   3. if the operation has added text (remember that each newly added node has an `opid` feature with the ID of the operation which added it, and a trace feature `$seg-out`):
      1. apply _spreading_ to SVG elements (added text always behaves as a "solid" element) with its animation and wait for it to complete.
      2. draw the text, character by character with the setting's animation for each character, exactly like for the base text.
   4. finally, if any of the SVG elements has fallen off the visible area of the text rendition, which may well happen for spreading, calculate a new pan and zoom to fit all the elements, and then use an animation to transition between the current pan and zoom to the newly computed one. Using a transition here is essential to avoid an abrupt change in size and position; we need to interpolate towards them, so that we preserve the smooth transformation represented by the new version and all its animations.

## Component Design

### API

The component API is defined by its input properties (to be bound by consumer code) and output events:

- **input**:
  - `settings` (of type `GveRenditionSettings`). The [settings](#component-settings) for the component.
  - `data` (of type `CharChainResult | undefined`): the data representing the result of executing operations in the snapshot model.
  - `versionTag: string | undefined` property with the tag of the version to be displayed. When not specified, the component just starts with the first version (the base text, tag `v0`).
- **output**:
  - `nodeHover` event fired when user hovers on a specific character node. This will provide the hovered node structure and all the data the handler might find useful to have for handling further interactions (e.g. show more data from metadata of that node), including coordinates, bounding rectangle, etc.
  - `nodeClick` event fired when user clicks on a specific character node, as above.
  - `versionTagChanging`: event fired when the version tag is about to change, before starting its change.
  - `versionTagChange`: event fired when the version tag has changed, after all the animations related to it have completed.

**Navigation** across text versions is managed via the [toolbar](#component-ui-toolbar-area) (or the corresponding shortcut keys). The main functions are:

- move to previous/next version.
- move to previous/next staged version, through all the versions which are included between the current one and the next staged version (if any).
- move to first/last version.
- slideshow, which automatically moves from first to last version, and possibly loops endlessly when the last version has been reached.

When navigating:

- before starting the navigation, fire `versionTagChanging` with the current version tag and the next one. If there are any [hilites](#text-hilites), remove them (fading them out).
- once navigation has completed with all its animations, fire `versionTagChange` with the current version tag and the previous one.

### Component Settings

Component settings are modeled in a `GveRenditionSettings` class; a `DEFAULT_SETTINGS` constant then provides defaults for the component. Settings are passed via binding to the web component's `settings` property.

```ts
/**
 * Settings for a custom button added to the toolbar.
 * A custom button provides an easy way to add more logic
 * to the web component.
 */
export interface CustomButtonSettings {
  id: string; // the ID of the custom button; a string which must be unique among all the custom buttons
  icon: string; // the icon to use for the button
  label: string; // the text label for the button
  tooltip: string; // a tooltip for the button, appears on hovering
  callback: (id: string, svg: SVGElement) => void; // callback invoked when button is pressed; the svg parameter is the root svg element of text rendition area
}

export interface GveRenditionSettings {
  // display settings
  fontSize: number; // default=16
  fontFamily: string; // default=monospace
  foreColor: string; // default=#000000
  backColor: string; // default=transparent
  italic: boolean; // default=false
  bold: boolean; // default=false
  underline: number | undefined; // default=undefined, else the px thickness of underline
  overline: number | undefined; // default=undefined, else the px thickness of overline
  strike: boolean; // default=false

  // spacing settings
  spaceWidthFraction: number; // the fraction of reference char width used to calculate the space width
  charSpacing: number; // the spacing between each character rendered as a SVG text (default=2)
  lineHeight: number; // the line height (default=1.5)
  lineSpacing: number; // the spacing between lines (default=4)
  marginTop: number; // top margin of the text rendition area (default=20)
  marginLeft: number; // left margin of the text rendition area (default=20)
  marginRight: number; // right margin of the text rendition area (default=20)
  marginBottom: number; // bottom margin of the text rendition area (default=20)

  // viewport settings
  initialZoom: number; // initial zoom factor (default=1)
  minZoom: number; // minimum zoom factor (default=0.5)
  maxZoom: number; // maximum zoom factor (default=3)
  zoomStep: number; // zoom factor step (default=0.1)

  // behavior settings
  slideshowInterval: number; // the ms interval between each frame in slideshow mode (default=1000)
  slideshowLoop: boolean; // true to loop the slideshow (when it ends, it restarts from start)
  slideshowDelay: number; // the ms interval between each restart of the slideshow (when looping; default=3000)
  debug?: boolean; // true to add detailed logging (used for diagnostic purposes)

  // custom buttons
  customButtons?: CustomButtonSettings[];
  disabledButtonIds?: string[]; // array of custom button IDs which should be disabled

  // animation
  animations: Record<string, string>; // catalog of animation JS code fragments, keyed under their ID
  charAnimationId?: string; // the ID of the JS code for animating each single character from base/additional text
  spreadTime: number; // the number of ms for the spreading animation (default=1500)

  // hints
  hints: Record<string, OperationHint>; // dictionary of hints, key=hint ID and value=hint
  hintMargin: number; // the margin around each rendered hint (px, default=0)
  hintDesignWidth: number; // the design-time width of hints
  hintDesignHeight: number; // the design-time height of hints
  showHintHandles: boolean; // true to show the handle element from SVG hint (default=false, can be true for diagnostic purposes)

  // hilites
  hilitePadding: number; // padding to increase hilite size (default=0)
  hiliteFadeTime: number; // the number of ms for the fade in/out animation of hilites (default=1000)
}
```

> Display settings have corresponding [text rendition features](#text-rendition-features) which may override them locally for single portions of text.

### Component UI

As a general rule, wherever possible provide support for consistent theming the web component by using standard _CSS variables_ (all prefixed with `--gve-`) instead of literal values.

The component UI contains these areas:

- the **toolbar** area. This contains navigation and other commands.
- the **text rendition** area. This is the main area, which takes most of the available space.
- the **versions list** area. This lists the versions generated for the snapshot text and can be collapsed.
- the **version text** area. This contains the plain text for the currently selected version, and can be collapsed.
- the **details** area. This contains details about the current selection, and can be collapsed.

These areas are part of a **responsive** CSS grid layout, which adapts to the available size. In it, each region covers an area. In a normal layout, grid areas are placed in this way:

- row 1: toolbar at top, full width.
- row 2:
  - versions list at left, like a sidebar (collapsible).
  - text rendering at right, taking all the remaining space.
- row 3:
  - version text at left (collapsible).
  - details area at right (collapsible).

When areas are collapsed or expanded, the others adjust accordingly.

When the available width is too small, the areas are repositioned so that each occupies a full row, as follows:

- row 1: toolbar.
- row 2: text rendering.
- row 3: versions list.
- row 4: version text.
- row 5: details.

#### Component UI: Toolbar Area

The toolbar area contains a toolbar with these buttons and labels:

- the **current step** tag (e.g. `v0`) and position (e.g. `1/N`). If the step is a _staged version_ (=the text has a `version` feature), also display the `version`'s value and emphasize this with a different background or similar accent hints.
- navigation buttons (disabled when not applicable):
  - **move to next version**.
  - **move to previous version**.
  - **move to next staged version**. This goes through all the versions up to the next staged version (if there is any after the current version; else it's disabled). It is equivalent to a slideshow from the current version to the next staged version.
  - **move to previous staged version**. As above.
  - **move back to first version**.
  - **move forward to last version**.
  - **start/stop slideshow**: when slideshow is on, the component moves forward automatically one version after another after a specified time interval. When done, you either stop or cycle according to the settings. Intervals, cycle and other relevant parameters must be read from component `settings`.
  - **toggle slideshow reverse**: when on, the slideshow runs reversed, from last to first version. Disabled when slideshow is running.
- display buttons:
  - **zoom in**.
  - **zoom out**.
  - **center and fit**.
  - **download** the current rendition (the root `svg` element of the text rendition area) as an SVG image.
- custom buttons:
  - an optional set of **custom buttons** whose icons, labels, tooltips and callback actions can be defined in `settings`.

> Buttons and other controls in the toolbar should reflow (you can use CSS flex and flex-wrap) when there is not enough horizontal space.

#### Component UI: Text Rendition Area

The text rendition area is a drawing surface based on SVG. It has a root `svg` element and its content is totally defined by data and programmatic actions on it, as described in the first part of this document.

At any time, users can freely **zoom** and **pan** the whole text rendition area with these actions:

- zoom in/out;
- pan in any direction;
- size the whole text rendition area to fit.

This implies that all the rendering operations involving computations about SVG size and position must be properly adjusted for the current zoom and pan.

#### Component UI: Versions List Area

This area can be collapsed.

The versions list is a collapsible area which contains the list of all the versions in the snapshot, in their order of generation (as defined by the component's `data`). The list contains 1 item per version, with its tag and (when specified) staged version tag (from the `version` feature). For instance, it might look like (assuming that `v2` corresponds to staged version `alpha` and `v4` to staged version `beta`):

1. `v0`
2. `v1`
3. `v2`: `alpha`
4. `v3`
5. `v4`: `beta`

Each item is **colored** according to an automatically generated colors palette, which must be created once whenever the component data changes. This palette must be created as follows:

- colors must be pastel, light colors which do not stand out nor risk to interfere with other colored SVG elements. Yet, they must be clearly visible.
- colors must be picked with an algorithm which maximizes their visual differencies, so that it's not possible to confuse them. Think about what we do when generating a palette for drawing a chart, where each series gets a pastel color which must be clearly distinguished from all the others.
- linking color with version tag must be idempotent: given a version number (`v0`, `v1`, etc.), the same color should be generated for it.

This allows reusing the palette generator for other purposes connected to colorizing version tags. Consider that at most a snapshot will include some tens of versions, so we are not going to have hundreds of different colors.

##### Text Hilites

A single item at a time in this list can be selected by clicking on it. When selected, the component should add hilites to all the text elements included in that version. These elements are determined as follows:

- the element must be an SVG `text` element with `class` including `node`.
- the element `id` attribute numeric value must be included in the list of node IDs present in the selected version. Snapshot result in component data provide the list of nodes in each version, with their IDs. For instance, if a version `v4` includes nodes with IDs 1,3,10, then we will match all SVG `text` elements in the rendition text area having `id`=`n_1` or `n_3` or `n_10`.

To make them visible without hiding their content, hilites are rendered as colored **SVG rectangles** at the very back (lowest z-level) of any other elements in the text rendition area. Their characteristcs are:

- the hilite rectangle **fill color** is the same color computed for that version, as specified above.
- the hilite rectangle **size** is equal to the bounding box of the SVG `text` element corresponding to each hilited node.
- the `hilitePadding` setting in component's settings increases the hilite rectangle **size** by its amount (expressed in `px`). This makes it a little bigger, which can be useful when content might hide the background hilite rectangle. In this case, recalculate the hilite rectangle position so that it is both vertically and horizontally centered with reference to the bounding box of the SVG `text` element corresponding to each hilited node.
- the hilite rectangle **position** is equal to that of the bounding box of the SVG `text` element corresponding to each hilited node, adjusted when `hilitePadding` is used.

Hilites rectangles are generated all at once, and they should **fade** in with an animation, all at the same time; and fade out when removed, in the same way. The duration of this animation is given by setting `hiliteFadeTime`. As always with animations, we use GSAP.

A **clear selection** button is used to deselect a selected tag and remove hilites. Hilites are removed automatically whenever you move to another version (first they will fade out, then we will proceed with move -- so we must check whether hilites are present before moving).

#### Component UI: Version Text Area

This area can be collapsed.

The version text area contains the multiline **plain text** corresponding to the currently displayed text version. Lines are ended by LF characters. The generated text of each version is got from the `result` property in result data.

A small **toolbar** here contains buttons for the following actions:

- **copy all text**.
- **toggle word-wrap**.
- **increase font size**.
- **decrease font size**.

#### Component UI: Details Area

This area can be collapsed.

The area contains metadata interactively displayed when navigating across versions, and when hovering elements in the rendered text area.

This includes (all features are in alphabetical order of their name):

- the details about the operation which generated that version:
  - `inputTag` and `outputTag`;
  - `id`;
  - `type`;
  - `rank`
  - `groupId`
  - `sources`: list of sources, each with its `id`, `type`, `rank`, `note`.
  - `dsl`.
- the list of global features for the current version, i.e. those features linked to the text as a whole.
- the list of node-dependent features for the element(s) being hovered, grouped by element, when hovering any SVG `text` element with class containing `node` (i.e. a `text` element corresponding to a text node in data).
- this list has at its side the enlarged rendition for the hovered element (a copy of its `text` element).

> ⚠️ Note that unless the `debug` setting is true, all the rendition features (=all the features whose name starts with `r_`) are not listed here, as they are just rendition instructions which are rendered visually.

## Example

The request and response to and from backend for this example are available at these links:

- [request](sample/request.json)
- [response](sample/response.json): this is especially useful to have a look at the real output. This corresponds to the `CharChainResult` model:
  - `steps` contains all the transformation steps, each corresponding to a version (except for `v0`). Each step has some metadata of the operation which generated it, input and output version tags, plain text result, set of features (global and per-node), operation's reference node IDs.
  - `chainDump` is just a dump of all the plain text versions of the text.
  - `chainTags` is the list of all the version tags (including `v0`).
  - `taggedNodes` is the list of the nodes present in each version, keyed by version tag. Only nodes present in each version are listed. So, deleted nodes are no longer present in versions after their deletion. Features are listed under `featureSet`: `features` for global features, and `nodeFeatures` for node-specific features, each keyed by version tag + `_` + node ID.

Consider a sheet to be represented by the snapshot model like the one in this image:

![sample text](./img/sample.png)

👉 The **base text** (version `v0`) here is (line ends are represented by LF characters):

```txt
In this test I show all operation
types.
It is not complex nor long.
This too, is another line
```

The image is black and white, but for the sake of the example, assume that:

- the base text was written with black ink by hand A (hands are encoded in the operation's source property).
- a first series of changes were written by another hand B with red ink.
- a second series of changes were written by another hand C with green ink.
- the number at the top-left corner was written by another hand D with blue ink.

The character nodes are shown in this image with their numeric IDs (blue) and indexes (gray):

![sample text characters](./img/sample-chars.png)

> To make them more visible, in this diagnostic view spaces are represented by an underscore, and LF by an arrow.

👉 The **operations** are (each is preceded by the tag of the version it generates, and has a list of features to inject in affected nodes; for brevity we omit hands, which would fit in operation's source metadata):

- `v1`: **annotate** to add features (these are thus [init-features](#init-features)):
  - `r_char-offsets`=`35:x=100 70:x=100` to define indents for lines 2 (starting with character ID 35) and 4 (starting with character ID 70).

- `v2`: **delete** `In` and its space. Features:
  - `r_hints`=`diagonal-stroke`. The ID of a hint representing a diagonal stroke (essentially it will be a diagonal line).
  - `r_fore-color`=`red` (hand A writes with red ink; the hint is assumed to have a placeholder for the color, drawing its value from this property; this way we can reuse the same hint SVG code with a different color).
- `v3`: **replace** `t` with `T` (whose ID will be equal to 95, the next available ID in the snapshot) in `this`, to make it uppercase, as this has become the first word of the sentence. Features:
  - `r_text_position`=`n` (north = top of `t`).
  - `r_fore-color`=`red`.
  - `r_font-size`=`14` (the default being `16`, this is smaller).
- `v4`: **delete** `I` and its following space. Features:
  - `r_fore-color`=`red`.
  - `r_hints`=`diagonal-stroke`.
- `v5`: **add** `s` (ID=96) after `show` (whence `shows`). Features:
  - `r_fore-color`=`red`.
  - `r_font-size`=`14`.
- `v6`: **annotate** to add features (this operation belongs to group `swap-complex-long` -- belonging to a group has no practical effect, but it is a metadatum which logically groups operations together):
  - `note`=`1` (the `1` above `long` indicating a change in word order).
  - `r_fore-color`=`red`.
  - `r_hints`=`note` (a hint assumed to display text whose content is defined by a placeholder named `note`).
- `v7`: **annotate** to add features (this operation belongs to group `swap-complex-long`):
  - `note`=`2` (the `2` above `nor`).
  - `r_fore-color`=`red`.
  - `r_hints`=`note`.
- `v8`: **annotate** to add features (this operation belongs to group `swap-complex-long`):
  - `note`=`3` (the `3` above `complex`).
  - `r_fore-color`=`red`.
  - `r_hints`=`note`.
- `v9`: **swap** `complex` with `long` (this is represented by the small numbers "3 2 1" above these words and the word between them, which have been added as annotation hints before). Features:
  - `r_fore-color`=`red`.
  - `version`=`alpha` marks this version (`v9`) as staged version `alpha`.

- `v10`: **delete** `.` after `types` (this operation belongs to group `add-stuff`). Features:
  - `r_hints`=`diagonal-stroke`.
  - `r_fore-color`=`green`.
- `v11`: **add** space + `AND SOME STUFF.` (IDs=97-113) after `types` (this operation belongs to group `add-stuff`). Note that we could just have inserted this text before the dot after `types` if our purpose was only to get the corresponding output text; but our purpose here is to represent the sheet in its nearly-diplomatic form. In the sheet we have a deletion on this dot, and then a new text with its own dot is added. Here we do the same, with a deletion first, and then an addition. Features:
  - `r_fore-color`=`green`.
- `v12`: **replace** `STUFF.` with `HINTS.` (IDs=114-119). Features:
  - `r_fore-color`=`green`.
  - `r_position`=`n`.
  - `r_text-displaced-span`=`21x7`. This is a displacement for the text being added by this replace operation (`HINTS`): instead of positioning the text with reference to its reference text (`STUFF`), we position it above an area approximately corresponding to `all ope` of `all operations` in the first line.
  - `r_text-offset-y`=`20`: this shifts the `HINTS` boxed text upper.
  - `r_hints`=`box` (border around `STUFF`).
  - `r_border`=`tlbr 1 solid green` (1-pixel border around `HINTS`).
- `v13`: **delete** `too,` + space (this operation belongs to group `mov-too`, because on a more abstract --non-diplomatic-- ground this would be considered a movement). Note that there is no hint for this operation; it is implicit in the next addition.
- `v14`: **add** `TOO.` (IDs=120-123) after `line` (this operation belongs to group `mov-too`) . Features:
  - `version`=`beta` marks `v14` as staged version `beta`.

- `v15`: **annotate** the initial `I` with features (we target the initial `I` as it's the nearest character):
  - `note`=`12`.
  - `r_color`=`blue`.
  - `r_hint-vars`=`rotation=-45`. This passes a variable `rotation`=`-45` to the hint so that it can resolve placeholders with this name. This allows applying a rotation to this hint programmatically.
  - `r_hints`=`note-underline`. This is assumed to have a `note` placeholder to be filled with the text (here "12"), and a `r_color` placeholder for its color.

👉 The **resulting texts** for staged versions are:

- `alpha`:

```txt
This test shows all operation
types.
It is not long nor complex.
This is another line TOO.
```

- `beta`:

```txt
This test shows all operation
types AND SOME HINTS.
It is not long nor complex.
This is another line TOO.
```

👉 The **hints** assumed by these operations are summarized here, each with its placeholder variables:

- `box`: a box drawn around some content. This hint uses `scaleX` and `scaleY` to make this box bigger than the RBR it should enclose.
  - `r_fore-color`: the box outline color.
- `diagonal-stroke`: a diagonal stroke.
  - `r_fore-color`: the line color.
- `note`: a text note. This is a hint, not text which is part of the version (this is only base text or additional text).
  - `note`: the note's text.
  - `r_fore-color`: the text color.
- `note-underline`: equal to `note`, but with added underline text decoration to the note's text.

The same operations in their parsable format are listed here:

```txt
35: [r_char-offsets^="35:x=100 70:x=100"]

1x3- [r_hints^=diagonal-stroke r_fore-color^=red]
4=T [r_text_position^=n r_fore-color^=red r_font-size^=14]
14x2- [r_hints^=diagonal-stroke r_fore-color^=red]
19+]s [r_fore-color^=red r_font-size^=14]
64x4: @swap-complex-long [note^=1 r_hints^=note r_fore-color^=red]
60x3: @swap-complex-long [note^=2 r_hints^=note r_fore-color^=red]
52x7: @swap-complex-long [note^=3 r_hints^=note r_fore-color^=red]
52x7<>64x4 [r_fore-color^=red]
75x5- @mov-too
94+]" TOO."@mov-too [r_fore-color^=red *version^=alpha]

40- @add-stuff [r_hints^=diagonal-stroke r_fore-color^=green]
39+]" AND SOME STUFF." @add-stuff [r_fore-color^=green]
112x6=HINTS. [r_fore-color^=green r_position^=n r_text-displaced-span^=21x7 r_text-offset-y=20 r_hints=box r_border^="tlbr 1 solid green" *version^=beta]

1: [note=12 r_color^=blue r_hint-vars^="rotation=-45" r_hints="note-underline"]
```
