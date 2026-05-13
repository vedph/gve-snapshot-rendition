# CLAUDE.md

## Purpose of the Solution

This workspace contains a custom web component for the rendition of a model representing the transformations of a text.

We consider 3 entities to display:

- the **base text**, which is the starting point.
- the **added text**, which is text added by add or replace operations.
- all **other signs**: these are the visual counterparts of editing operations on the manuscript, which hint at them in a graphical way. For instance, a line on on a text means it should be deleted. As visuals used for operations are often recurring, they belong to a **catalog** of so-called "hints". These hints have entrance animations, handled by the GSAP library, typically from a catalog of animations. Both hints and animations are part of the settings for the component.

Text (base or added text) is represented character by character; each character is named **node**, because in backend, where all the transformations happen, there is a graph-like structure which recombines the same characters to form different versions of the text.

Transformations are represented by a set of **operations** (delete, replace, add, move, swap) executed one after another starting with the base text. The base text is version 0 (tag=`v0`). All the operations are executed in their order and each outputs a new version of the text, progressively numbered (`v1`, `v2`...). The data model consisting of base text + operations is named **snapshot**.

Operations also inject metadata in their output, in form of **features** (name=value pairs), either into the output as a whole (_global features_), or into specific characters of it (_node features_). A specific set of features (_rendition features_, all starting with prefix `r_`) is used for visuals of each operation.

## Projects Overview

- all controls are vanilla custom web components, in a single library designed to be consumed in any environment, encapsulated in its shadow DOM.
- Rollup is used for building and ViTest for testing.
- core shared models are in `models.ts`.

- **top-level components**:
  - `gve-snapshot-rendition.ts`: snapshot renderer based on SVG. Most of its logic is encapsulated in its own set of classes, following a systematic separation of concerns.
  - `gve-hint-designer.ts`: an editor to design hints for the renderer.
- **references**:
  - the backend API code which generates responses displayed by this renderer is under `\Projects\Gve\Gve`.
  - sample responses for the demo page are available in this workspace in the `data` folder (`*.data.json`).
  - conceptual documentation is in the `docs` folder.
- **testing environment**:
  - renderer demo page: `index.html` with its code in `consumer.js`.
  - hint designer demo page: `hint-designer.html` with its code in `hint-designer-consumer.js`.
- **essential scripts**:
  - build: `pnpm build`
  - run: `pnpm start`. To pick a non-default sample, add it to the URL with a `sample` argument, e.g. <localhost:3000?sample=h5-48>.
  - run hint designer: `pnpm run start:designer`
  - test: `pnpm test`

## Dependencies

- [GSAP](https://gsap.com) for animations (`pnpm i gsap @types/gsap`).
- [svg-pan-zoom](https://github.com/bumbu/svg-pan-zoom) for zooming and panning (`pnpm i svg-pan-zoom @types/svg-pan-zoom`).
- [fast-diff](https://github.com/jhchen/fast-diff) for text diffing (`pnpm i fast-diff @types/fast-diff`).
- [feather-icons](https://github.com/feathericons/feather) for icons. See also the [icons list](https://feathericons.com) (`pnpm i feather-icons`).
- [highlight.js](https://highlightjs.org/) for the hint designer (syntax highlight for SVG and JS code; `pnpm i highlight.js`).
