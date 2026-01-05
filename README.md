# GVE Snapshot Rendition Component

This workspace contains a custom web component for the rendition of a complex Academic model representing the transformations of an autograph text. This peculiar document was written by the hand of the author, and contains a lot of often chaotic annotations on top of a base text. These annotations represent changes to the first draft of the text mostly by the hand of the author himself, thus providing a unique insight in the writer's creative process.

For the purpose of the visualization of the digital model designed to represent this text with all its variations together with its diplomatic data, we consider 3 entities to display:

- the base text, which is the starting point and the bearer of all the annotations.
- the added text. This is text added by operations like add or replace.
- all other signs: these are the visual counterparts of editing operations on the text, which hint at them in a graphical way. For instance, a line on top of a text meaning it should be deleted. There is no limit to the variety of these signs: they might be lines, shapes, callouts, boxes, etc.

Text (whether it is base or added text) is represented character by character; each character is named _node_, because in backend, where all the transformations happen, there is a graph-like structure which recombines the same characters to form different versions of the text, just like nodes are connected by edges in a graph.

The transformations are essentially represented by a set of editing operations (like delete, replace, add, move, swap) which are executed one after another starting with a base text. The base text is known as version 0 (tag=`v0`). All the operations are executed in their order and each outputs a new version of the text, progressively numbered (`v1`, `v2`...).

Operations also inject metadata, in form of features (essentially name=value pairs), either into versions as a whole (for global features), or into specific characters of the output text (node features). A specific set of features (rendition features, all starting with prefix `r_`) is used to represent the visual counterpart of each operation; for instance, a delete might be visually represented by a diagonal line on top of the portion of the text being deleted. In this case, multiple features of the operation (which injects them into nodes) are used to set the drawing connected to it, in this case a line, and specify additional parameters like its color. Such drawings are often recurring multiple times; so, they belong to a catalog of so-called "hints", because they hint at the operation with their appearance (e.g. a line stroke on a text hints at its deletion). These hints have entrance animations, handled by GSAP (like any other animations in this project). These too typically belong to a catalog of animations.

Both hints and animations are part of the settings for the component. The component is found under [src/core/gve-snapshot-rendition.ts](src/core/gve-snapshot-rendition.ts), and most of its logic is properly encapsulated in its own set of classes, following a systematic separation of concerns to ensure flexibility, extendibility, and easy maintenance.

## Usage Guide

- [Angular integration](docs/dev/angular-integration.md)
- [vanilla integration](docs/dev/vanilla-integration.md)

## Documentation

Conceptual documentation and sample data:

- [snapshot backend model](docs/snapshot.md): overview of the backend data used by the component.
- [rendition description](docs/rendition.md): details about the architecture and logic of this component.
- [sample request to backend snapshot processor](docs/sample/request.json): the request used to generate our sample data via backend. This is used only when we want to change our sample data.
- [sample response from backend snapshot processor](docs/sample/response.json): the response received from backend corresponding to our request. This is used only when we want to change our sample data.
- [data used in the demo](data.json): the data loaded in the web component to test it. This is copied from [response.json](docs/sample/response.json), and contains all the data received by the web component for rendering.
- [features adapter services](docs/adapter.md): complementary services independent from the GVE snapshot rendition component, possibly used to adapt data before passing it to the component.

The test page used in this project is `index.html` and its code is `consumer.js`. The data model is `CharChainResult` and it is found with all the imported models in `models.ts`. These are the models imported from another package and should not be touched.

### Feature Adapter

The **Feature Adapter** is a utility system for transforming features in snapshot data. It enables you to adapt high-level features into low-level rendition features that the component can use:

- [Feature Adapter Overview](docs/adapter.md): Architecture and usage guide.
- [Detailed Documentation](src/adapter/README.md): Complete API reference and examples.

### Hint Designer

The **Hint Designer** is a companion web component which can be used to help users edit and test their hints SVG and JS animation code. The main web component used for display has no relation with it. Rather, the hint designer component reuses some logic from the main component, while still being aside.

- [hint designer documentation](docs/hint-designer.md)
- [hint designer usage](src/hint-designer/README.md)

Use the npm script to start the designer:

```bash
pnpm run start:designer
```

This will build the component and open the hint designer in your browser.

## Quick Start

To start working with this code:

1. clone this repository.
2. download dependencies with `pnpm i`.
3. run with `pnpm start`.

💡 Note: if you need to **update sample data**, follow these steps:

1. open the [GVE backend solution](https://github.com/vedph/gve-core) and run the demo.
2. set text and operations as you want (to start with the current data, pick the "rendition features" preset).
3. click the "build request" button.
4. optionally, paste the request in [docs/sample/request.json](docs/sample/request.json) if you want to make it the default data.
5. run the GVE backend API and use Postman or similar to send the request body with this header:

    ```txt
    POST http://localhost:5239/api/text/operations/run
    Accept: application/json
    Content-Type: application/json

    ...paste your JSON request body here...
    ```

6. copy the response and paste it into [data.json](data.json) and also into [docs/sample/response.json](docs/sample/response.json) if you want to make it the default data.

## Requirements

This component requires the following packages:

- [GSAP](https://gsap.com) for animations (`pnpm i gsap @types/gsap`).
- [svg-pan-zoom](https://github.com/bumbu/svg-pan-zoom) for zooming and panning (`pnpm i svg-pan-zoom @types/svg-pan-zoom`).
- [fast-diff](https://github.com/jhchen/fast-diff) for text diffing (`pnpm i fast-diff @types/fast-diff`).
- [feather-icons](https://github.com/feathericons/feather) for icons. See also the [icons list](https://feathericons.com) (`pnpm i feather-icons`).
- [highlight.js](https://highlightjs.org/) for the hint designer (syntax highlight for SVG and JS code; `pnpm i highlight.js`).

## Task List

This is only a reminder.

- consider simplifying logic by drawing node features from tagged nodes rather than from steps.

## Deployment

You must be logged into NPM with your account (verify with `npm whoami`, login with `npm login` if required).

1. ensure that tests pass (`pnpm test`) and be sure to build (`pnpm build`).
2. publish via `pnpm run publish:public` or directly via `npm publish --access=public`.

Check that your package is available:

```bash
npm view @myrmidon/gve-snapshot-rendition
```

Or visit: <https://www.npmjs.com/package/@myrmidon/gve-snapshot-rendition>

The following files/directories are included in the package (defined in `package.json` `files` field):

- `dist/` - Compiled JavaScript and TypeScript declarations
- `README.md` - Package documentation
- `LICENSE` - License file

The package includes these automated scripts:

- **prepublishOnly**: Runs before `npm publish` - executes tests and build
- **prepack**: Runs before creating a tarball - executes build
- **publish:public**: Custom script to publish with public access

To unpublish a specific version:

```bash
npm unpublish @myrmidon/gve-snapshot-rendition@0.0.1
```

To unpublish the entire package (only allowed within 72 hours):

```bash
npm unpublish @myrmidon/gve-snapshot-rendition --force
```

>⚠️ Unpublishing can break projects that depend on your package. Only do this for critical security issues or accidental publications.

Package structure:

```txt
@myrmidon/gve-snapshot-rendition/
├── dist/
│   ├── index.js              # ES Module bundle
│   ├── index.d.ts            # TypeScript declarations
│   ├── index.cjs.min.js      # CommonJS bundle (minified)
│   └── ...
├── README.md
└── LICENSE
```

## Deploy Demo at Surge

To deploy demo in surge:

1. run the script for the demo you want to create (`deploy-demo.ps1` or `deploy-hint-demo.ps1`).
2. in the created folder, run `surge`, enter your credentials, confirm the local source directory, and specify a URL to use (e.g. <http://gve-hint-designer.surge.sh/>).
