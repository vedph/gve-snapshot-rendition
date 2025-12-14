# Hint Designer

The hint designer is a custom web component which can complement the main GVE snapshot rendition component. Its purpose is to provide a minimalist editing environment to let users design hints and test their animations.

The idea is that users can directly grab hints and animations from the main web component's settings limited to the properties `hints` and `animations`, and pass them as the data of the hint designer. The designer can be used to:

- browse all the hints.
- select one to edit it.
- edit the hint properties at will. SVG (for the hint's appearance) and JS (for its animation based on GSAP, just like we do for the main component) are directly edited with syntax highlighting using the popular open source library `highlight.js`.
- display the hint in a SVG panel, with a timeline controller to play, pause and stop animation, similar to the `GSAPDevTools` timeline player.
- fire events when each hint is updated.
- save/load all the data from file.

## API

The component API is:

- properties:
  - `data`, of type `HintDesignerData`. At start, this will be an object with empty hints and animations arrays.
  - `settings` for the web component, including:
    - `hintDesignWidth` (number): the width of the hint's SVG design area in the editor.
    - `hintDesignHeight` (number): the height of the hint's SVG design area in the editor.
    - `debug` (boolean): debug mode for verbose logging, as for the main web component (see `logger.ts`).
  - `hintId` (string or undefined): the ID of the hint to select for editing. Undefined=none.
  - `hintVariables` (array of `StringPair`'s objects with string properties `name` and `value`): the variables pre-defined for use in resolving placeholders in edited hints.
- events:
  - `dataChange` fired whenever data change (because a hint is saved, or data are loaded or cleared).
  - `hintIdChange` fired whenever the selected ID changes (the user selects another one).
  - `hintVariablesChange` fired whenever the hint variables change (the user edited them).

### UI

The component UI includes these panels from top to bottom:

- toolbar.
- SVG display for the hint.
- timeline player.
- message panel, used like a legacy statusbar in an app, mostly used to show error messages.
- hint properties editor.
- hint variables list.

When the horizontal space is enough, we adopt a more compact layout putting SVG and JS code side by side in the hint properties editor.

All the panels (except toolbar, timeline player and SVG display) are resizable with handles. The description of each panel follows.

As for the main component, CSS are used variables where applicable to support theming.

#### Toolbar

This panel is not user-resizable.

- **toolbar**: a top toolbar with these controls (from left to right, wrapping on overflow):
  - a *refresh* button to redraw the SVG display. This is used whenever the user has made enough changes to the edited hint and wants to see it displayed. When the user saves, the refresh is automatically triggered.
  - an *add* button to add a new hint. You will be prompted for its ID, and then edit the new hint.
  - a *hints dropdown* to select the hint to edit, listing the hints IDs.
  - a *save* button to save the currently edited hint. This stores the hint in memory in the data, and fires the corresponding events.
  - a *delete* button to delete the selected hint (prompt for confirmation!).
  - buttons to control zoom and pan for the SVG panel so we can zoom and pan the hint's SVG (using library `svg-pan-zoom`, like in the main web component).
  - a *save data* button to save all the data to a JSON file.
  - a *load data* button to load all the data from a JSON file.
  - a *clear data* button to clear all the data so to start fresh (prompt for confirmation!).

>As for the main web component, buttons use tooltips and icons from [feather icons](https://feathericons.com).

#### SVG Display

This panel sizes to take all the available space.

A central area including an SVG element with zoom and pan support, and displaying the content of the hint's `svg` property. Note that as specified in documentation, in its usage the hint will be resized to fit the RBR. Here instead we are just displaying the SVG of the hint with no computation except for zooming and panning. For instance, if the design width is 300 and the design heigh is 100, and I have an SVG line from 0,0 to 300,100, this will be a diagonal line crossing the whole design area; as simple as that: the component just renders the SVG in its place, with proper zoom and pan.

This is the most important pane and takes all available space. All the other panes (except the toolbar) can be resized, and whenever they are resized this central area should take all the available space.

#### Timeline Player

The timeline player is a timeline controller to play, pause and stop the animation of the edited hint, quite similar to the [GSAPDevTools](https://gsap.com/docs/v3/Plugins/GSDevTools) timeline player. So it contains:

- buttons for play, pause, restart.
- a clickable/draggable progress bar used to move back and forward on the timeline, like we do in movie editing.

This is disabled when the JS animation for the current hint is empty. When the animation is run, the hint must start with `style`'s attribute opacity=0. The animation will take care of animating that `style` value up to the desired opacity value, as all animations for hints are entrance animations.

#### Message Panel

This panel is not user-resizable.

Usually empty, this contains a message when set. In most cases this is an error message set when actions produce errors (e.g. there is an issue with SVG/JS syntax or a JS error when running the animation).

#### Hint Properties

This panel is user-resizable.

This panel allows editing all the properties of the selected `OperationHint`:

- `position`: a dropdown with all the values from `RelativePosition`.
- other form controls for the numeric, string or boolean values of `offsetX`, `offsetY`, `scaleX`, `scaleY`, `rotation`, `solid`, `displacedRefSpan`.
- `svg`: in a SVG textarea using syntax highlight for XML (via `highlight.js`).
- `animation`: the hint's animation can be either the full JS for the animation (embedded JS) or just the ID of an animation (referenced JS) from the `animations` catalog. An "embedded JS" checkmark is used to enable embedded JS. In both cases, there are:
  - a textarea containing the corresponding code, using syntax highlight for JS (via `highlight.js`).
  - a dropdown with the list of all the IDs of `animations` data, so user can pick any of them to use as the JS code for animating the selected hint. This dropdown is not disabled when "embedded JS" is checked, because it can be used to copy the JS code of another animation. There is a button next to the dropdown used to load the code from the selected animation ID into the JS textarea.

The logic of animation depends on the "embedded JS" state as follows:

- when *loading* data of the selected hint (the user selects the hint for editing):
  - if the hint's `animation` property starts with `#`, which is followed by the animation's ID, load the JS from `animations` data finding that ID there. If the ID is not found, just use an empty JS.
  - else, the `animation`'s property value is the JS itself; so just load it.
- when *saving* data of the selected hint (the user saves the edited hint):
  - if "embedded JS" is checked, save it in the hint's `animation` property directly.
  - else, save it into the animation with ID equal to the selected ID in the animations dropdown, storing it in `animations` data. In this case prompt before saving, as the user is going to overwrite an animation from the catalog in `animations` which might be shared by other hints.

#### Hint Variables

This panel is user-resizable.

As specified in the documentation, some hints may include variable name placeholders in whiskers `{{...}}`. So, in this case the SVG display requires these variables to be resolved.

To this end, the hint variables pane provides an editable list of name=value pairs, each representing the definition of a variable. This list must be used to resolve variables before rendering SVG when whiskers are present in its code. The hint variables list is a table listing all the defined variables (and thus it is initially empty).

- at the top, a toolbar contains a button to delete all the variables (prompt for confirmation!).
- below it, a table lists objects of type `StringPair` having properties properties `name` and `value` (both strings); in the table:
  - column 1 contains buttons to delete the pair or edit the pair.
  - column 2 contains the name.
  - column 3 contains the value.
