# CLAUDE.md

## Purpose of the Solution

This workspace contains a custom web component for the rendition of a complex model representing the transformations of an autograph text.

For the visualization of the digital model designed to represent this text with all its variations together with its diplomatic data, we consider 3 entities to display:

- the **base text**, which is the starting point and the bearer of all the annotations.
- the **added text**. This is text added by operations like add or replace.
- all **other signs**: these are the visual counterparts of editing operations on the text, which hint at them in a graphical way. For instance, a line on top of a text meaning it should be deleted. There is no limit to the variety of these signs: they might be lines, shapes, callouts, boxes, etc.

Text (whether it is base or added text) is represented character by character; each character is named **node**, because in backend, where all the transformations happen, there is a graph-like structure which recombines the same characters to form different versions of the text.

Transformations are essentially represented by a set of **operations** (delete, replace, add, move, swap) executed one after another starting with a base text. The base text is known as version 0 (tag=`v0`). All the operations are executed in their order and each outputs a new version of the text, progressively numbered (`v1`, `v2`...). The data model consisting of base text + operations is named **snapshot**.

Operations also inject metadata in their output, in form of **features** (name=value pairs), either into the output as a whole (_global features_), or into specific characters of it (_node features_).

A specific set of features (_rendition features_, all starting with prefix `r_`) is used to represent the visual counterpart of each operation; for instance, a delete can be visually represented by a diagonal line on the deleted text.

As the visuals used for operations are often recurring, they belong to a **catalog** of so-called "hints" (because they "hint" at the operation with their appearance: a stroke on a text hints at its deletion). These hints have entrance animations, handled by the GSAP library, typically from a catalog of animations, too.

Both hints and animations are part of the **settings** for the component.

## Projects Overview

- all controls are vanilla custom web components, in a single library designed to be consumed in any environment, totally encapsulated in its shadow DOM.
- Rullup is used for building and ViTest for testing.
- core shared models are in `models.ts`.

- **top-level components**:
  - `gve-snapshot-rendition.ts`: snapshot renderer based on SVG. Most of its logic is properly encapsulated in its own set of classes, following a systematic separation of concerns to ensure flexibility, extendibility, and easy maintenance.
  - `gve-hint-designer.ts`: an editor to design hints for the renderer.
- **references**:
  - the backend API code which generates responses displayed by this renderer is found in folder `\Projects\Gve\Gve`.
  - sample responses are available in this workspace in the `data` folder (`*.data.json`). These are used to feed the demo page.
  - full conceptual documentation is availabe in the `docs` folder.
- **testing environment**:
  - renderer demo page: `index.html` with its code in `consumer.js`.
  - hint designer demo page: `hint-designer.html` with its code in `hint-designer-consumer.js`.
- **essential scripts**:
  - build: `pnpm build`
  - run: `pnpm start`. To pick a non-default sample, add it to the URL with a `sample` argument, e.g. <localhost:3000?sample=h5-48>.
  - run hint designer: `pnpm run start:designer`
  - test: `pnpm test`

## Dependencies

This component requires the following packages:

- [GSAP](https://gsap.com) for animations (`pnpm i gsap @types/gsap`).
- [svg-pan-zoom](https://github.com/bumbu/svg-pan-zoom) for zooming and panning (`pnpm i svg-pan-zoom @types/svg-pan-zoom`).
- [fast-diff](https://github.com/jhchen/fast-diff) for text diffing (`pnpm i fast-diff @types/fast-diff`).
- [feather-icons](https://github.com/feathericons/feather) for icons. See also the [icons list](https://feathericons.com) (`pnpm i feather-icons`).
- [highlight.js](https://highlightjs.org/) for the hint designer (syntax highlight for SVG and JS code; `pnpm i highlight.js`).
