# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2]

- 2026-04-25: removed layout save/restore for renderer to avoid issues in complex containers and user confusion.

## [1.0.1]

- 2026-04-25: ⚠️ replaced Split.js with Golden Layout for better layout and panel resizing.

## [1.0.0]

- 2026-04-25: ⚠️ refactored for new API response model. The backend has been refactored for its core models and API layers: changes are described in `\Projects\Gve\Gve\REFACTOR.md`. Code has been updated to the new model, which primarily affected models in `models.ts` and `GveSnapshotRendition` with its dependencies. Some code has been simplified, because now `v0` is included in the results, and all nodes are returned separately from versions, while before each version only had a list of nodes which belonged to it, so to get other nodes (e.g. a deleted one or base text nodes) one had to go back to other versions.

## [0.0.9]

- 2026-04-16: updated packages.

## [0.0.8]

- 2026-04-02:
  - fixed base text rendition not honoring rendition features, like font size.
  - updated packages.

## [0.0.7]

- 2026-03-04:
  - updated packages.
  - added support for `tw` and `th` units in text features `r_char-offset` and `r_char-offsets`.

## [0.0.6]

- 2026-01-23: fixed missing export of OperationSummaryService.

## [0.0.5]

- 2926-01-22: more robust context handling.
- 2026-01-09:
  - added pinning for hovered added text.
  - added node ID in hovered details.
  - fixes for node features not displayed when hovering on node.
  - integrated [Split.js](https://github.com/nathancahill/split) library for robust panel resizing.
  - all panels (versions list, version text, details) are now smoothly resizable with drag handles.
  - added "Reset Layout" button to toolbar to restore default panel sizes.
  - SVG text rendition area maintains stable position and size during panel resizing.
  - layout state (panel sizes) saved and restored across sessions.

## [0.0.4]

- 2026-01-08:
  - improve consumer JS to bind data all at once.
  - make the details panel resizable.
  - move the details about hovered element above the list of global features in the details panel.
- 2026-01-06:
  - fixes to H5-48 sample.
  - more hints.
  - added `r_t-value` feature.
- 2026-01-05:
  - fixed SVG grid in hint designer.
  - added alternative sample data.
  - refactor `consumer.js` for different sample data.
- 2026-01-02: more robust variables in hint designer.

## [0.0.3]

- 2026-01-01:
  - added populate hint variables function.
  - added SVG code basic validation.
- 2025-12-29: added variables validation to hints designer.

## [0.0.1]

- initial release.
