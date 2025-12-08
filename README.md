# GVE Snapshot Rendition Component

Custom web component for feature-based GVE snapshot rendition.

## Documentation

Conceptual documentation and sample data:

- [snapshot backend model](docs/snapshot.md)
- [rendition description](docs/rendition.md)
- [sample request to backend snapshot processor](docs/sample/request.json)
- [sample response from backend snapshot processor](docs/sample/response.json)

The test page used in this project is `index.html` and its code is `consumer.js`.

## Quick Start

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

This component requires GSAP and svg-pan-zoom:

```sh
pnpm i gsap @types/gsap svg-pan-zoom @types/svg-pan-zoom
```

TODO list:

- remove border feature and use hints.
- hilites also for v0.
- add muted previous text to version text UI and diffing between them.
- add setting to continue moving on to next versions until the group ID is the same.
- consider simplifying logic by drawing node features from tagged nodes rather than from steps.

Ensure to read the conceptual documentation about this component in these documentation files under the `docs` folder:

- `snapshot.md`: overview of the backend data used by the component.
- `rendition.md`: especially this one, contains all the details about the behavior of this component.
