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

So, **data flows** for the designer component are as follows:

- **input**: the component gets its full data from the `data` property via binding, or loads it from a file.
- **output**: whenever the user saves a hint, the component notifies a change in its data (`dataChange`).

As for the **single hint**:

- when **a hint is edited** (either it was in the list, or it was added as a new hint):
  - the data for that hint fill the editor controls (hint properties, SVG rendition and animation). Hint variables instead stay the same, as they are globally applied to all the hints being edited.
  - the component notifies that a new hint is being edited via the `hintIdChange` event.
- when **the edited hint is saved**:
  - a new hint object is created from the editor controls (hint properties).
  - this hint replaces a hint with the same ID in the full `data`, or is just added to them if new.
  - the `dataChange` event is notified.

A more complex flow refers to **animations**, because:

- the designer needs a hint to design an animation so you can test it on it. Thus, we do not directly design catalog animations (from the `animations` array in data), but rather we edit the animation of the selected hint.
- we can also design an embedded animation, which rather than referring to the `animations` array is directly defined in the `animation` property of the hint as JS code rather than `#` followed by the ID of the animation in the `animations` array.

So, the logic here is as follows:

- when the hint is **loaded** the "embedded JS" option (which by default is off) is synched with the hint's data:
  - if the hint's `animation` property starts with `#`, which is followed by the animation's ID, load the JS from `animations` data finding that ID there and ensure that "embedded JS" option is unchecked. If the ID is not found, just use for JS the new JS template shown below.
  - else, the `animation`'s property value is the JS itself; so just load it and ensure that the "embedded JS" option is checked.

- when the hint is **saved** the "embedded JS" option dictates the logic:
  - if the "embedded JS" option is _off_:
    - if the hint's animation control value does not start with `#` (which means we can assume it is JS code), we want to save the animation's code from the JS textarea into the data's `animations` array with (a) if "new animation" is off, an ID equal to the selected animation in the animations list dropdown, replacing the animation with the same ID if it exists, or adding a new one or (b) if "new animation" is on, prompt for its ID. Before saving in case (a), prompt for confirmation as we are going to update the catalog and this might be unintentional or the selected animation ID might not be the right one. If there is no selected animation ID, show an error in the messages pane asking to either select one or check the "embedded JS" option or check the "new animation" option.
    - else, just save the animation control value into the hint's animation property as a reference (`#` followed by hint). Just ensure that `#` is followed by some identifier, else show an error in the messages pane asking to add an identifier after the `#`.
  - if the "embedded JS" option is _on_:
    - if the hint's animation control value starts with `#`, give an error.
    - else, just save it as JS code in the hint's `animation` property.

When data is saved, always give feedback with a message in the messages pane.

So, if you want to **edit an animation** from the catalog:

1. edit a hint using that animation or create a new one and pick the animation from the dropdown if it is not a new one.
2. uncheck the "embedded JS" option.
3. if you are editing an existing animation, load the JS code into the JS textarea by picking the animation from the dropdown and clicking the "Load animation code" button. If you are creating a new animation, just enter the JS code in the JS textarea.
4. save the hint. This will also trigger saving the animation as specified above.

Template for a new JS:

```js
return new Promise(resolve => {
  // targetEl is the animation's target element
  // gsap is the GSAP object
});
```

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

The main elements in the component's layout are:

- `div.hint-designer-container` (grid layout root)
  - `div.top-panels-wrapper` (grid area=`top`, nested grid)
    - `div.toolbar` (grid area=`toolbar`)
    - `div.svg-display-panel` (grid area=`svg-display`)
    - `div.timeline-player` (grid area=`timeline`)
    - `div.message-panel` (grid area=`message`)
  - `div.properties-panel.resizable-panel` (grid area=`properties`)
    - `div.panel-header`
    - `div.panel-content`
      - column 1: `form.properties-form`
      - column 2:
        - `div.textarea-header`
        - `div#svg-wrapper.code-editor-wrapper`
      - column 3:
        - `div.textarea-header`
        - `div.anim-controls`
        - `div#js-wrapper.code-editor-wrapper`
  - `div.variables-panel.resizable-panel` (grid area=`variables`)

The main 3 rows under the root container `div` are resizable panels. Each is a CSS grid with its own layout.

#### Toolbar

This panel is not user-resizable.

- **toolbar**: a top toolbar with these controls (from left to right, wrapping on overflow):
  - a _refresh_ button to redraw the SVG display. This is used whenever the user has made enough changes to the edited hint and wants to see it displayed. When the user saves, the refresh is automatically triggered.
  - an _add_ button to add a new hint. You will be prompted for its ID, and then edit the new hint.
  - a _hints dropdown_ to select the hint to edit, listing the hints IDs.
  - a _save_ button to save the currently edited hint. This stores the hint in memory in the data, and fires the corresponding events.
  - a _delete_ button to delete the selected hint (prompt for confirmation!).
  - buttons to control zoom and pan for the SVG panel so we can zoom and pan the hint's SVG (using library `svg-pan-zoom`, like in the main web component).
  - a _save data_ button to save all the data to a JSON file.
  - a _load data_ button to load all the data from a JSON file.
  - a _clear data_ button to clear all the data so to start fresh (prompt for confirmation!).

> As for the main web component, buttons use tooltips and icons from [feather icons](https://feathericons.com).

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
- `animation`: the hint's animation can be either the full JS for the animation (embedded JS) or just the ID of an animation (referenced JS) from the `animations` catalog. An "embedded JS" checkmark is used to enable embedded JS. A "new animation" button is used when you want to add a new animation to the catalog. In both cases, there are:
  - a textarea containing the corresponding code, using syntax highlight for JS (via `highlight.js`).
  - a dropdown with the list of all the IDs of `animations` data, so user can pick any of them to use as the JS code for animating the selected hint. This dropdown is not disabled when "embedded JS" is checked, because it can be used to copy the JS code of another animation. There is a button next to the dropdown used to load the code from the selected animation ID into the JS textarea.

#### Hint Variables

This panel is user-resizable.

As specified in the documentation, some hints may include variable name placeholders in whiskers `{{...}}`. So, in this case the SVG display requires these variables to be resolved.

To this end, the hint variables pane provides an editable list of name=value pairs, each representing the definition of a variable. This list must be used to resolve variables before rendering SVG when whiskers are present in its code. The hint variables list is a table listing all the defined variables (and thus it is initially empty).

- at the top, a toolbar contains a button to delete all the variables (prompt for confirmation!).
- below it, a table lists objects of type `StringPair` having properties properties `name` and `value` (both strings); in the table:
  - column 1 contains buttons to delete the pair or edit the pair.
  - column 2 contains the name.
  - column 3 contains the value.
