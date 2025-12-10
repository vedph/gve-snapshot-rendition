# GVE Snapshot Rendition Component

Custom web component for feature-based GVE snapshot rendition.

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

## Quick Start

To start working with this code:

1. clone this repository.
2. download dependencies with `pnpm i`.
3. run with `pnpm start`.

Note: if you need to **update sample data**, follow these steps:

1. open the GVE backend solution and run the demo.
2. set text and operations as you want (to start with the current data, pick the "rendition features" preset).
3. click the "build request" button.
4. paste the request in [docs/sample/request.json](docs/sample/request.json) if you want to make it the default data.
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

## Task List

This is only a reminder.

- add settings and support for CodePen hint designer.
- consider simplifying logic by drawing node features from tagged nodes rather than from steps.
