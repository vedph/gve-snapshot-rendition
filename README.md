# GVE Snapshot Rendition Component

## Usage Guide

- [Angular integration](docs/dev/angular-integration.md)
- [vanilla integration](docs/dev/vanilla-integration.md)

## Documentation

Conceptual documentation and sample data:

- [snapshot backend model](docs/snapshot.md): overview of the backend data used by the component.
- [rendition description](docs/rendition.md): details about the architecture and logic of this component.
- [sample request to backend snapshot processor](docs/sample/request.json): the request used to generate our sample data via backend. This is used only when we want to change our sample data.
- [sample response from backend snapshot processor](docs/sample/response.json): the response received from backend corresponding to our request. This is used only when we want to change our sample data.
- data used in the demo are found in the `data` folder. Each sample has 3 files for base text, data received from backend service, and settings. For the default sample, data is copied from [response.json](docs/sample/response.json). These represent all the data received by the web component for rendering.
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

>If you want to pick a different sample, add it to the URL with a `sample` argument, e.g. <localhost:3000?sample=h5-48>.

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

## Deployment

🚀 You must be logged into NPM with your account (verify with `npm whoami`, login with `npm login` if required).

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
2. in the created folder, run `surge`, enter your credentials, confirm the local source directory, and specify a URL to use (e.g. <gve-rendition.surge.sh> or <gve-hint-designer.surge.sh/>).

Demo links:

- [rendition, mock text](http://gve-rendition.surge.sh)
- [rendition, H5-48](http://gve-rendition.surge.sh?sample=h5-48)
- [hint designer](http://gve-hint-designer.surge.sh)
