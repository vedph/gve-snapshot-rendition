# GVE Snapshot Rendition Component

## 📖 Documentation

Conceptual documentation and sample data:

- [snapshot backend model](docs/snapshot.md): overview of the backend data used by the component.
- [rendition description](docs/rendition.md): documentation about the architecture and logic of the snapshot renderer custom web control.
- data used in the demo are found in the `data` folder. Each sample has 4 files:
  - (no suffix): base text and operations DSL. This is the snapshot data.
  - `*.base.txt`: base text.
  - `*.request.json`: request to API. You can generate this from the backend demo app.
  - `*.data.json`: response from API. These are the data bound to the renderer control.
  - `*.settings.json`: settings for the renderer control.
- [hint designer](docs/hint-designer.md): documentation about hints designer custom web control.
- [features adapter services](docs/adapter.md): documentation about complementary services independent from the GVE snapshot rendition component, optionally used to adapt data before passing it to the component.

Developer's usage guide:

- [Angular integration](docs/dev/angular-integration.md)
- [vanilla integration](docs/dev/vanilla-integration.md)

### 🟢 Feature Adapter

The **Feature Adapter** is a utility system for transforming features in snapshot data. It enables you to adapt high-level features into low-level rendition features that the component can use:

- [Feature Adapter Overview](docs/adapter.md): architecture and usage guide.
- [Detailed Documentation](src/adapter/README.md): complete API reference and examples.

### 🟢 Hint Designer

The **Hint Designer** is a companion web component which can be used to help users edit and test their hints SVG and JS animation code. The main web component used for display has no relation with it. Rather, the hint designer component reuses some logic from the main component, while still being aside.

- [hint designer documentation](docs/hint-designer.md)
- [hint designer usage](src/hint-designer/README.md)

Use the npm script to start the designer:

```bash
pnpm run start:designer
```

This will build the component and open the hint designer in your browser.

>If you want to pick a different sample, add it to the URL with a `sample` argument, e.g. <localhost:3000?sample=h5-48>.

## 🚀 Quick Start

To start working with this code:

1. clone this repository.
2. download dependencies with `pnpm i`.
3. run with `pnpm start`.

💡 Note: if you need to **create sample data**, follow these steps:

1. create a .txt file with base text and operations DSL.
2. open the [GVE backend solution](https://github.com/vedph/gve-core) and run the demo.
3. set text and operations copying them from the .txt file.
4. click the "build request" button.
5. run the GVE backend API and use Postman or similar to send the request body with this header:

    ```txt
    POST http://localhost:5239/api/text/operations/run
    Accept: application/json
    Content-Type: application/json

    ...paste your JSON request body here...
    ```

6. copy the response and paste it into a new set of data files.
7. run with the name of the data file: <localhost:3000?NAME>.

## 📦 Deployment

You must be logged into NPM with your account (verify with `npm whoami`, login with `npm login` if required).

1. ensure that tests pass (`pnpm test`) and be sure to build (`pnpm build`).
2. publish via `pnpm run publish:public` or directly via `pnpm publish --access=public`.

Check that your package is available:

```bash
pnpm view @myrmidon/gve-snapshot-rendition
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
pnpm unpublish @myrmidon/gve-snapshot-rendition@0.0.1
```

To unpublish the entire package (only allowed within 72 hours):

```bash
pnpm unpublish @myrmidon/gve-snapshot-rendition --force
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

To **deploy a static HTML demo page in surge**:

1. run the script for the demo you want to create (`deploy-demo.ps1` or `deploy-hint-demo.ps1`).
2. in the created folder, run `surge`, enter your credentials, confirm the local source directory, and specify a URL to use (e.g. <gve-rendition.surge.sh> or <gve-hint-designer.surge.sh/>).

Demo links:

- [rendition, mock text](http://gve-rendition.surge.sh)
- [rendition, H5-48](http://gve-rendition.surge.sh?sample=h5-48)
- [hint designer](http://gve-hint-designer.surge.sh)
