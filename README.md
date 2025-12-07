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

## Requirements

This component requires GSAP and svg-pan-zoom:

```sh
pnpm i gsap @types/gsap svg-pan-zoom @types/svg-pan-zoom
```

TODO list:

- consider replacing char offsets feature with multiple char offset.
- consider simplifying logic by drawing node features from tagged nodes rather than from steps.
