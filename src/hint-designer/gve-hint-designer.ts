import {
  HintDesignerData,
  HintDesignerSettings,
  DEFAULT_HINT_DESIGNER_SETTINGS,
  StringPair,
} from "./hint-designer-models";
import { OperationHint } from "../settings/hint-models";
import { RelativePosition } from "../core/gve-snapshot-rendition";
import { Logger } from "../core/logger";
import hljs from "highlight.js";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import * as feather from "feather-icons";

/**
 * Template for new animation JS code.
 */
const NEW_ANIMATION_TEMPLATE = `return new Promise(resolve => {
  // targetEl is the animation's target element
  // gsap is the GSAP object
});`;

/**
 * GVE Hint Designer Web Component.
 * A minimalist editing environment to design hints and test their animations.
 */
export class GveHintDesigner extends HTMLElement {
  // Properties
  private _data: HintDesignerData = { hints: {}, animations: {} };
  private _settings: HintDesignerSettings = {
    ...DEFAULT_HINT_DESIGNER_SETTINGS,
  };
  private _hintId?: string;
  private _hintVariables: StringPair[] = [];

  // Core systems
  private _logger: Logger;
  private _shadow: ShadowRoot;

  // UI Elements
  private _svgDisplay?: SVGSVGElement;
  private _messagePanel?: HTMLDivElement;

  // Custom zoom/pan state
  private _zoomLevel: number = 1;
  private _panX: number = 0;
  private _panY: number = 0;
  private _isPanning: boolean = false;
  private _lastPanX: number = 0;
  private _lastPanY: number = 0;
  private _svgTextarea?: HTMLTextAreaElement;
  private _jsTextarea?: HTMLTextAreaElement;
  private _svgHighlightContainer?: HTMLDivElement;
  private _jsHighlightContainer?: HTMLDivElement;
  private _hintsDropdown?: HTMLSelectElement;
  private _svgWordWrapEnabled: boolean = false;
  private _jsWordWrapEnabled: boolean = false;
  private _animationsDropdown?: HTMLSelectElement;
  private _embeddedJsCheckbox?: HTMLInputElement;
  private _newAnimationCheckbox?: HTMLInputElement;
  private _positionSelect?: HTMLSelectElement;
  private _offsetXInput?: HTMLInputElement;
  private _offsetYInput?: HTMLInputElement;
  private _scaleXInput?: HTMLInputElement;
  private _scaleYInput?: HTMLInputElement;
  private _rotationInput?: HTMLInputElement;
  private _displacedRefSpanInput?: HTMLInputElement;
  private _variablesTable?: HTMLTableElement;
  private _playButton?: HTMLButtonElement;
  private _pauseButton?: HTMLButtonElement;
  private _restartButton?: HTMLButtonElement;
  private _progressBar?: HTMLInputElement;
  private _variablesValidationMsg?: HTMLDivElement;
  private _variablesPanelHeader?: HTMLDivElement;

  // Animation state
  private _currentTimeline?: any; // GSAP timeline
  private _isPlaying: boolean = false;
  private _progressUpdateInterval?: number;

  constructor() {
    super();

    // Create logger
    this._logger = new Logger("GVE-HintDesigner", this._settings.debug);

    // Register GSAP plugins
    const gsap = (window as any).gsap;
    if (gsap) {
      gsap.registerPlugin(DrawSVGPlugin);
      this._logger.debug(
        "Component",
        "DrawSVG plugin registered:",
        gsap.plugins.drawSVG !== undefined
      );
    }

    // Create shadow DOM
    this._shadow = this.attachShadow({ mode: "open" });

    this._logger.info("GveHintDesigner component created");
  }

  /**
   * Called when component is added to the DOM.
   */
  public connectedCallback(): void {
    this._logger.info("Component connected to DOM");
    this.render();
    this.initializeEventListeners();
  }

  /**
   * Called when component is removed from the DOM.
   */
  public disconnectedCallback(): void {
    this._logger.info("Component disconnected from DOM");
    this.cleanup();
  }

  // ==================== PUBLIC API ====================

  /**
   * Data property (bindable).
   */
  public get data(): HintDesignerData {
    return this._data;
  }

  public set data(value: HintDesignerData) {
    this._data = value || { hints: {}, animations: {} };
    this._logger.info("Data updated", value);
    this.refreshUI();
  }

  /**
   * Settings property (bindable).
   */
  public get settings(): HintDesignerSettings {
    return this._settings;
  }

  public set settings(value: HintDesignerSettings) {
    this._settings = { ...DEFAULT_HINT_DESIGNER_SETTINGS, ...value };
    this._logger.setEnabled(this._settings.debug || false);
    this._logger.info("Settings updated", this._settings);
    this.refreshUI();
  }

  /**
   * Hint ID property (bindable).
   */
  public get hintId(): string | undefined {
    return this._hintId;
  }

  public set hintId(value: string | undefined) {
    if (this._hintId !== value) {
      this._hintId = value;
      this.loadHint(value);
      this.fireEvent("hintIdChange", { hintId: value });
    }
  }

  /**
   * Hint variables property (bindable).
   */
  public get hintVariables(): StringPair[] {
    return this._hintVariables;
  }

  public set hintVariables(value: StringPair[]) {
    // Ensure value is an array
    if (!Array.isArray(value)) {
      this._logger.warn(
        "Component",
        "hintVariables setter received non-array value, converting to array",
        value
      );
      this._hintVariables = [];
    } else {
      this._hintVariables = value || [];
    }
    this.refreshVariablesTable();
    this.fireEvent("hintVariablesChange", {
      hintVariables: this._hintVariables,
    });
  }

  // ==================== RENDERING ====================

  /**
   * Render the component UI.
   */
  private render(): void {
    this._shadow.innerHTML = "";

    // Add styles
    const style = document.createElement("style");
    style.textContent = this.getStyles();
    this._shadow.appendChild(style);

    // Create container
    const container = document.createElement("div");
    container.className = "hint-designer-container";

    // Top panels wrapper (toolbar, svg-display, timeline, message)
    const topWrapper = document.createElement("div");
    topWrapper.className = "top-panels-wrapper";

    topWrapper.appendChild(this.createToolbar());
    topWrapper.appendChild(this.createSvgDisplay());
    topWrapper.appendChild(this.createTimelinePlayer());
    topWrapper.appendChild(this.createMessagePanel());

    container.appendChild(topWrapper);

    // Splitter 1: between top and properties
    const splitter1 = document.createElement("div");
    splitter1.className = "splitter";
    container.appendChild(splitter1);

    // Hint Properties Editor
    const propertiesPanel = this.createHintPropertiesEditor();
    container.appendChild(propertiesPanel);

    // Splitter 2: between properties and variables
    const splitter2 = document.createElement("div");
    splitter2.className = "splitter";
    container.appendChild(splitter2);

    // Hint Variables List
    const variablesPanel = this.createHintVariablesList();
    container.appendChild(variablesPanel);

    this._shadow.appendChild(container);

    // Setup resize handlers for splitters
    this.makeResizable(topWrapper, propertiesPanel, splitter1);
    this.makeResizable(propertiesPanel, variablesPanel, splitter2);

    this._logger.debug("Component", "UI rendered");
  }

  /**
   * Create the toolbar.
   */
  private createToolbar(): HTMLElement {
    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";

    // Refresh button
    const refreshBtn = this.createButton(
      "refresh-svg",
      "refresh-cw",
      "Refresh SVG display"
    );
    toolbar.appendChild(refreshBtn);

    // Add button (primary)
    const addBtn = this.createButton("add-hint", "plus", "Add new hint");
    addBtn.classList.add("btn-primary");
    toolbar.appendChild(addBtn);

    // Hints dropdown
    this._hintsDropdown = document.createElement("select");
    this._hintsDropdown.className = "hints-dropdown";
    this._hintsDropdown.innerHTML =
      '<option value="">-- Select Hint --</option>';
    toolbar.appendChild(this._hintsDropdown);

    // Save button (accent)
    const saveBtn = this.createButton("save-hint", "save", "Save hint");
    saveBtn.classList.add("btn-accent");
    toolbar.appendChild(saveBtn);

    // Delete button (danger)
    const deleteBtn = this.createButton(
      "delete-hint",
      "trash-2",
      "Delete hint"
    );
    deleteBtn.classList.add("btn-danger");
    toolbar.appendChild(deleteBtn);

    // Zoom controls (grouped)
    const zoomGroup = document.createElement("div");
    zoomGroup.className = "toolbar-group";

    const zoomInBtn = this.createButton("zoom-in", "zoom-in", "Zoom in");
    const zoomOutBtn = this.createButton("zoom-out", "zoom-out", "Zoom out");
    const zoomResetBtn = this.createButton(
      "zoom-reset",
      "maximize",
      "Reset zoom"
    );
    const sizeToFitBtn = this.createButton(
      "size-to-fit",
      "maximize-2",
      "Size to fit"
    );

    zoomGroup.appendChild(zoomInBtn);
    zoomGroup.appendChild(zoomOutBtn);
    zoomGroup.appendChild(zoomResetBtn);
    zoomGroup.appendChild(sizeToFitBtn);
    toolbar.appendChild(zoomGroup);

    // Data controls (grouped)
    const dataGroup = document.createElement("div");
    dataGroup.className = "toolbar-group";

    const saveDataBtn = this.createButton(
      "save-data",
      "download",
      "Save data to file"
    );
    const loadDataBtn = this.createButton(
      "load-data",
      "upload",
      "Load data from file"
    );
    const clearDataBtn = this.createButton(
      "clear-data",
      "x-circle",
      "Clear all data"
    );
    clearDataBtn.classList.add("btn-danger");

    const exportInkscapeBtn = this.createButton(
      "export-inkscape",
      "external-link",
      "Export hint to InkScape SVG"
    );

    dataGroup.appendChild(saveDataBtn);
    dataGroup.appendChild(loadDataBtn);
    dataGroup.appendChild(clearDataBtn);
    dataGroup.appendChild(exportInkscapeBtn);
    toolbar.appendChild(dataGroup);

    return toolbar;
  }

  /**
   * Create the SVG display panel.
   */
  private createSvgDisplay(): HTMLElement {
    const panel = document.createElement("div");
    panel.className = "svg-display-panel";

    this._svgDisplay = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    this._svgDisplay.setAttribute("class", "svg-display");
    this._svgDisplay.setAttribute(
      "width",
      this._settings.hintDesignWidth.toString()
    );
    this._svgDisplay.setAttribute(
      "height",
      this._settings.hintDesignHeight.toString()
    );
    this._svgDisplay.setAttribute(
      "viewBox",
      `0 0 ${this._settings.hintDesignWidth} ${this._settings.hintDesignHeight}`
    );

    // Add grid and rulers as background
    this.addGridAndRulers(this._svgDisplay);

    panel.appendChild(this._svgDisplay);

    return panel;
  }

  /**
   * Add grid and rulers to the SVG display as background.
   */
  private addGridAndRulers(svg: SVGSVGElement): void {
    const width = this._settings.hintDesignWidth;
    const height = this._settings.hintDesignHeight;
    const gridSize = 10; // Grid cell size in pixels

    // Create defs section for the grid pattern
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

    // Define grid pattern
    const pattern = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "pattern"
    );
    pattern.setAttribute("id", "grid");
    pattern.setAttribute("width", gridSize.toString());
    pattern.setAttribute("height", gridSize.toString());
    pattern.setAttribute("patternUnits", "userSpaceOnUse");

    // Add small grid lines
    const gridPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    gridPath.setAttribute("d", `M ${gridSize} 0 L 0 0 0 ${gridSize}`);
    gridPath.setAttribute("fill", "none");
    gridPath.setAttribute("stroke", "#999999");
    gridPath.setAttribute("stroke-width", "0.5");
    pattern.appendChild(gridPath);

    defs.appendChild(pattern);
    svg.appendChild(defs);

    // Create main group for grid and rulers (will be behind hint content)
    const backgroundGroup = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    );
    backgroundGroup.setAttribute("id", "grid-and-rulers");

    // Add grid background rectangle - now starting at (0,0)
    const gridRect = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    gridRect.setAttribute("x", "0");
    gridRect.setAttribute("y", "0");
    gridRect.setAttribute("width", width.toString());
    gridRect.setAttribute("height", height.toString());
    gridRect.setAttribute("fill", "url(#grid)");
    backgroundGroup.appendChild(gridRect);

    // Add ruler tick marks and labels (horizontal)
    const tickInterval = 50; // Major tick every 50 pixels
    const minorTickInterval = 10; // Minor tick every 10 pixels

    for (let x = 0; x <= width; x += minorTickInterval) {
      const isMajorTick = x % tickInterval === 0;
      const tickHeight = isMajorTick ? 8 : 4;

      const tick = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      tick.setAttribute("x1", x.toString());
      tick.setAttribute("y1", "0");
      tick.setAttribute("x2", x.toString());
      tick.setAttribute("y2", tickHeight.toString());
      tick.setAttribute("stroke", "#666");
      tick.setAttribute("stroke-width", "1");
      backgroundGroup.appendChild(tick);

      // Add label for major ticks - positioned inside the grid, below the top edge
      if (isMajorTick && x > 0) {
        const label = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text"
        );
        label.setAttribute("x", x.toString());
        label.setAttribute("y", "12");
        label.setAttribute("font-size", "9");
        label.setAttribute("font-family", "Arial, sans-serif");
        label.setAttribute("fill", "#333");
        label.setAttribute("text-anchor", "middle");
        label.textContent = x.toString();
        backgroundGroup.appendChild(label);
      }
    }

    // Add ruler tick marks and labels (vertical)
    for (let y = 0; y <= height; y += minorTickInterval) {
      const isMajorTick = y % tickInterval === 0;
      const tickWidth = isMajorTick ? 8 : 4;

      const tick = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      tick.setAttribute("x1", "0");
      tick.setAttribute("y1", y.toString());
      tick.setAttribute("x2", tickWidth.toString());
      tick.setAttribute("y2", y.toString());
      tick.setAttribute("stroke", "#666");
      tick.setAttribute("stroke-width", "1");
      backgroundGroup.appendChild(tick);

      // Add label for major ticks - positioned inside the grid, to the right of the left edge
      if (isMajorTick && y > 0) {
        const label = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text"
        );
        label.setAttribute("x", "10");
        label.setAttribute("y", (y + 3).toString());
        label.setAttribute("font-size", "9");
        label.setAttribute("font-family", "Arial, sans-serif");
        label.setAttribute("fill", "#333");
        label.setAttribute("text-anchor", "start");
        label.textContent = y.toString();
        backgroundGroup.appendChild(label);
      }
    }

    svg.appendChild(backgroundGroup);

    this._logger.debug("Component", "Grid and rulers added to SVG");
  }

  /**
   * Create the timeline player.
   */
  private createTimelinePlayer(): HTMLElement {
    const player = document.createElement("div");
    player.className = "timeline-player";

    // Buttons
    this._playButton = this.createButton("play", "play", "Play animation");
    this._pauseButton = this.createButton("pause", "pause", "Pause animation");
    this._restartButton = this.createButton(
      "restart",
      "skip-back",
      "Restart animation"
    );

    // Initially disable pause (nothing playing)
    this._pauseButton.disabled = true;

    player.appendChild(this._playButton);
    player.appendChild(this._pauseButton);
    player.appendChild(this._restartButton);

    // Progress bar
    this._progressBar = document.createElement("input");
    this._progressBar.type = "range";
    this._progressBar.min = "0";
    this._progressBar.max = "1000";
    this._progressBar.value = "0";
    this._progressBar.className = "progress-bar";
    player.appendChild(this._progressBar);

    return player;
  }

  /**
   * Create the message panel.
   */
  private createMessagePanel(): HTMLElement {
    this._messagePanel = document.createElement("div");
    this._messagePanel.className = "message-panel";
    return this._messagePanel;
  }

  /**
   * Create the hint properties editor.
   */
  private createHintPropertiesEditor(): HTMLElement {
    const panel = document.createElement("div");
    panel.className = "properties-panel resizable-panel";

    // Header
    const header = document.createElement("div");
    header.className = "panel-header";
    header.textContent = "Hint Properties";
    panel.appendChild(header);

    // Content with 3-column layout
    const content = document.createElement("div");
    content.className = "panel-content";

    // Column 1: Properties form wrapper
    const col1 = document.createElement("div");
    col1.className = "column-wrapper column-properties";

    const form = document.createElement("form");
    form.className = "properties-form";

    // Position
    form.appendChild(
      this.createFormRow("Position:", this.createPositionSelect())
    );

    // Offset X
    this._offsetXInput = this.createInput("text", "0");
    form.appendChild(this.createFormRow("Offset X:", this._offsetXInput));

    // Offset Y
    this._offsetYInput = this.createInput("text", "0");
    form.appendChild(this.createFormRow("Offset Y:", this._offsetYInput));

    // Scale X
    this._scaleXInput = this.createInput("number", "1", 0.1);
    form.appendChild(this.createFormRow("Scale X:", this._scaleXInput));

    // Scale Y
    this._scaleYInput = this.createInput("number", "1", 0.1);
    form.appendChild(this.createFormRow("Scale Y:", this._scaleYInput));

    // Rotation
    this._rotationInput = this.createInput("number", "0");
    form.appendChild(this.createFormRow("Rotation:", this._rotationInput));

    // Displaced Ref Span
    this._displacedRefSpanInput = this.createInput("text", "");
    form.appendChild(
      this.createFormRow("Displaced Ref Span:", this._displacedRefSpanInput)
    );

    col1.appendChild(form);
    content.appendChild(col1);

    // Column 2: SVG wrapper
    const col2 = document.createElement("div");
    col2.className = "column-wrapper column-svg";

    const svgHeader = document.createElement("div");
    svgHeader.className = "textarea-header";

    const svgLabel = document.createElement("label");
    svgLabel.textContent = "SVG:";
    svgLabel.className = "textarea-label";
    svgHeader.appendChild(svgLabel);

    const svgWrapBtn = this.createButton(
      "toggle-svg-wrap",
      "align-left",
      "Toggle word wrap"
    );
    svgWrapBtn.className = "toolbar-btn wrap-toggle-btn";
    svgHeader.appendChild(svgWrapBtn);

    col2.appendChild(svgHeader);

    // Create wrapper for textarea with highlighting
    const svgWrapper = document.createElement("div");
    svgWrapper.className = "code-editor-wrapper";
    svgWrapper.id = "svg-wrapper";

    this._svgHighlightContainer = document.createElement("div");
    this._svgHighlightContainer.className = "code-highlight";
    svgWrapper.appendChild(this._svgHighlightContainer);

    this._svgTextarea = document.createElement("textarea");
    this._svgTextarea.className = "code-textarea";
    this._svgTextarea.spellcheck = false;
    svgWrapper.appendChild(this._svgTextarea);

    col2.appendChild(svgWrapper);
    content.appendChild(col2);

    // Column 3: Animation wrapper
    const col3 = document.createElement("div");
    col3.className = "column-wrapper column-animation";

    const animHeader = document.createElement("div");
    animHeader.className = "textarea-header";

    const animLabel = document.createElement("label");
    animLabel.textContent = "Animation:";
    animLabel.className = "textarea-label";
    animHeader.appendChild(animLabel);

    const jsWrapBtn = this.createButton(
      "toggle-js-wrap",
      "align-left",
      "Toggle word wrap"
    );
    jsWrapBtn.className = "toolbar-btn wrap-toggle-btn";
    animHeader.appendChild(jsWrapBtn);

    col3.appendChild(animHeader);

    // Embedded JS checkbox, new animation checkbox, and animation dropdown
    const animControls = document.createElement("div");
    animControls.className = "anim-controls";

    this._embeddedJsCheckbox = document.createElement("input");
    this._embeddedJsCheckbox.type = "checkbox";
    this._embeddedJsCheckbox.id = "embedded-js";

    const embeddedLabel = document.createElement("label");
    embeddedLabel.htmlFor = "embedded-js";
    embeddedLabel.textContent = "embedded JS";

    animControls.appendChild(this._embeddedJsCheckbox);
    animControls.appendChild(embeddedLabel);

    // New animation checkbox
    this._newAnimationCheckbox = document.createElement("input");
    this._newAnimationCheckbox.type = "checkbox";
    this._newAnimationCheckbox.id = "new-animation";

    const newAnimLabel = document.createElement("label");
    newAnimLabel.htmlFor = "new-animation";
    newAnimLabel.textContent = "new animation";

    animControls.appendChild(this._newAnimationCheckbox);
    animControls.appendChild(newAnimLabel);

    // Animation dropdown
    this._animationsDropdown = document.createElement("select");
    this._animationsDropdown.className = "animations-dropdown";
    this._animationsDropdown.innerHTML =
      '<option value="">-- Select Animation --</option>';
    animControls.appendChild(this._animationsDropdown);

    // Load button
    const loadAnimBtn = this.createButton(
      "load-animation",
      "download-cloud",
      "Load animation code"
    );
    animControls.appendChild(loadAnimBtn);

    col3.appendChild(animControls);

    // JS textarea with syntax highlighting
    const jsWrapper = document.createElement("div");
    jsWrapper.className = "code-editor-wrapper";
    jsWrapper.id = "js-wrapper";

    this._jsHighlightContainer = document.createElement("div");
    this._jsHighlightContainer.className = "code-highlight";
    jsWrapper.appendChild(this._jsHighlightContainer);

    this._jsTextarea = document.createElement("textarea");
    this._jsTextarea.className = "code-textarea";
    this._jsTextarea.spellcheck = false;
    jsWrapper.appendChild(this._jsTextarea);

    col3.appendChild(jsWrapper);
    content.appendChild(col3);

    panel.appendChild(content);

    return panel;
  }

  /**
   * Create the hint variables list.
   */
  private createHintVariablesList(): HTMLElement {
    const panel = document.createElement("div");
    panel.className = "variables-panel resizable-panel";

    // Header with warning icon placeholder
    const header = document.createElement("div");
    header.className = "panel-header";

    const headerText = document.createElement("span");
    headerText.textContent = "Hint Variables";
    header.appendChild(headerText);

    // Store reference to header for adding warning icon
    this._variablesPanelHeader = header;
    panel.appendChild(header);

    // Toolbar
    const toolbar = document.createElement("div");
    toolbar.className = "panel-toolbar";

    const addVarBtn = this.createButton(
      "add-variable",
      "plus-circle",
      "Add new variable"
    );
    addVarBtn.classList.add("btn-primary");
    toolbar.appendChild(addVarBtn);

    const populateBtn = this.createButton(
      "populate-from-hints",
      "download-cloud",
      "Populate from all hints"
    );
    populateBtn.classList.add("btn-accent");
    toolbar.appendChild(populateBtn);

    const deleteAllBtn = this.createButton(
      "delete-all-vars",
      "trash-2",
      "Delete all variables"
    );
    deleteAllBtn.classList.add("btn-danger");
    toolbar.appendChild(deleteAllBtn);

    panel.appendChild(toolbar);

    // Validation message (initially hidden)
    this._variablesValidationMsg = document.createElement("div");
    this._variablesValidationMsg.className = "validation-message";
    this._variablesValidationMsg.style.display = "none";
    panel.appendChild(this._variablesValidationMsg);

    // Content
    const content = document.createElement("div");
    content.className = "panel-content";

    // Table
    this._variablesTable = document.createElement("table");
    this._variablesTable.className = "variables-table";
    content.appendChild(this._variablesTable);

    panel.appendChild(content);

    return panel;
  }

  // ==================== HELPER METHODS ====================

  /**
   * Create a button element with a Feather icon.
   */
  private createButton(
    id: string,
    iconName: string,
    tooltip: string
  ): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = "toolbar-btn";
    btn.id = id;
    btn.title = tooltip;

    // Use feather.icons to get the SVG directly (for Shadow DOM compatibility)
    const icon = (feather.icons as any)[iconName];
    if (icon) {
      btn.innerHTML = icon.toSvg({
        class: "feather-icon",
        width: 16,
        height: 16,
        "stroke-width": 2,
      });
    } else {
      this._logger.warn("Feather icon not found:", iconName);
      btn.textContent = iconName;
    }

    return btn;
  }

  /**
   * Create an input element.
   */
  private createInput(
    type: string,
    value: string,
    step?: number
  ): HTMLInputElement {
    const input = document.createElement("input");
    input.type = type;
    input.value = value;
    if (step !== undefined) {
      input.step = step.toString();
    }
    return input;
  }

  /**
   * Create a form row with label and control.
   */
  private createFormRow(label: string, control: HTMLElement): HTMLElement {
    const row = document.createElement("div");
    row.className = "form-row";

    const labelEl = document.createElement("label");
    labelEl.textContent = label;
    row.appendChild(labelEl);

    row.appendChild(control);

    return row;
  }

  /**
   * Create position select dropdown.
   */
  private createPositionSelect(): HTMLSelectElement {
    this._positionSelect = document.createElement("select");

    const positions: RelativePosition[] = [
      "o",
      "n",
      "ne",
      "e",
      "se",
      "s",
      "sw",
      "w",
      "nw",
      "inw",
      "ine",
      "isw",
      "ise",
    ];

    positions.forEach((pos) => {
      const option = document.createElement("option");
      option.value = pos;
      option.textContent = pos;
      this._positionSelect!.appendChild(option);
    });

    return this._positionSelect;
  }

  /**
   * Make a splitter resizable between two panels.
   * @param panelAbove The panel above the splitter
   * @param _panelBelow The panel below the splitter (unused but kept for API clarity)
   * @param splitter The splitter element between them
   */
  private makeResizable(
    panelAbove: HTMLElement,
    _panelBelow: HTMLElement,
    splitter: HTMLElement
  ): void {
    splitter.addEventListener("pointerdown", (e: PointerEvent) => {
      const startY = e.clientY;
      const startHeightAbove = panelAbove.offsetHeight;
      const container = this._shadow.querySelector(
        ".hint-designer-container"
      ) as HTMLElement;
      if (!container) return;

      const onMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientY - startY;
        const newHeightAbove = Math.max(300, startHeightAbove + delta);

        // Determine which splitter this is based on the panel above
        const isTopSplitter =
          panelAbove.classList.contains("top-panels-wrapper");

        if (isTopSplitter) {
          // Splitter 1: between top and properties
          // Set top height, let properties and variables share remaining space
          container.style.gridTemplateRows = `${newHeightAbove}px 6px minmax(300px, 1fr) 6px minmax(200px, 1fr)`;
        } else {
          // Splitter 2: between properties and variables
          // Get top panel height and keep it fixed
          const topPanel = this._shadow.querySelector(
            ".top-panels-wrapper"
          ) as HTMLElement;
          const topHeight = topPanel ? topPanel.offsetHeight : 300;
          // Set top and properties heights, let variables fill remaining
          container.style.gridTemplateRows = `${topHeight}px 6px ${newHeightAbove}px 6px minmax(200px, 1fr)`;
        }
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      e.preventDefault();
    });
  }

  /**
   * Initialize event listeners.
   */
  private initializeEventListeners(): void {
    // Toolbar buttons
    this.addClickListener("refresh-svg", () => this.refreshSvgDisplay());
    this.addClickListener("add-hint", () => this.addHint());
    this.addClickListener("save-hint", () => this.saveHint());
    this.addClickListener("delete-hint", () => this.deleteHint());

    // Zoom controls
    this.addClickListener("zoom-in", () => this.zoomIn());
    this.addClickListener("zoom-out", () => this.zoomOut());
    this.addClickListener("zoom-reset", () => this.resetZoom());
    this.addClickListener("size-to-fit", () => this.sizeToFit());

    // Data controls
    this.addClickListener("save-data", () => this.saveData());
    this.addClickListener("load-data", () => this.loadData());
    this.addClickListener("clear-data", () => this.clearData());
    this.addClickListener("export-inkscape", () => this.exportToInkscape());

    // Timeline player
    this.addClickListener("play", () => this.playAnimation());
    this.addClickListener("pause", () => this.pauseAnimation());
    this.addClickListener("restart", () => this.restartAnimation());

    // Progress bar - handle both input (dragging) and change (clicking)
    if (this._progressBar) {
      this._progressBar.addEventListener("input", () => this.seekAnimation());
      this._progressBar.addEventListener("change", () => this.seekAnimation());

      // Prevent the progress bar from updating while user is interacting with it
      this._progressBar.addEventListener("mousedown", () => {
        this.stopProgressUpdate();
      });
    }

    // Hints dropdown
    if (this._hintsDropdown) {
      this._hintsDropdown.addEventListener("change", () => {
        const hintId = this._hintsDropdown!.value;
        this.hintId = hintId || undefined;
      });
    }

    // Load animation button
    this.addClickListener("load-animation", () => this.loadAnimationCode());

    // Variables panel
    this.addClickListener("delete-all-vars", () => this.deleteAllVariables());
    this.addClickListener("add-variable", () => this.addVariable());
    this.addClickListener("populate-from-hints", () =>
      this.populateVariablesFromHints()
    );

    // Word wrap toggles
    this.addClickListener("toggle-svg-wrap", () => this.toggleSvgWordWrap());
    this.addClickListener("toggle-js-wrap", () => this.toggleJsWordWrap());

    // Form field highlighting (non-default values)
    [
      this._positionSelect,
      this._offsetXInput,
      this._offsetYInput,
      this._scaleXInput,
      this._scaleYInput,
      this._rotationInput,
      this._displacedRefSpanInput,
    ].forEach((el) => {
      if (el) {
        el.addEventListener("input", () => this.updateFormFieldHighlights());
        el.addEventListener("change", () => this.updateFormFieldHighlights());
      }
    });

    // Syntax highlighting on textareas
    if (this._svgTextarea) {
      this._svgTextarea.addEventListener("input", () => this.highlightSvg());
      this._svgTextarea.addEventListener("scroll", () => this.syncSvgScroll());
    }
    if (this._jsTextarea) {
      this._jsTextarea.addEventListener("input", () => this.highlightJs());
      this._jsTextarea.addEventListener("scroll", () => this.syncJsScroll());
    }

    // Pan with mouse drag on SVG display
    this.initializePanning();

    // Zoom with mouse wheel on SVG display
    this.initializeWheelZoom();

    this._logger.debug("Component", "Event listeners initialized");
  }

  /**
   * Initialize panning with mouse drag.
   */
  private initializePanning(): void {
    const panel = this._shadow.querySelector(".svg-display-panel");
    if (!panel) return;

    panel.addEventListener("mousedown", (e: Event) => {
      const mouseEvent = e as MouseEvent;
      this._isPanning = true;
      this._lastPanX = mouseEvent.clientX;
      this._lastPanY = mouseEvent.clientY;
      (panel as HTMLElement).style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", (e: MouseEvent) => {
      if (!this._isPanning) return;

      const deltaX = e.clientX - this._lastPanX;
      const deltaY = e.clientY - this._lastPanY;

      this._panX += deltaX;
      this._panY += deltaY;

      this._lastPanX = e.clientX;
      this._lastPanY = e.clientY;

      this.updateSvgTransform();
    });

    document.addEventListener("mouseup", () => {
      if (this._isPanning) {
        this._isPanning = false;
        const panelEl = panel as HTMLElement;
        panelEl.style.cursor = "grab";
      }
    });

    // Set initial cursor
    (panel as HTMLElement).style.cursor = "grab";
  }

  /**
   * Initialize zooming with mouse wheel.
   */
  private initializeWheelZoom(): void {
    const panel = this._shadow.querySelector(".svg-display-panel");
    if (!panel) return;

    panel.addEventListener("wheel", (e: Event) => {
      const wheelEvent = e as WheelEvent;
      wheelEvent.preventDefault();

      // Determine zoom direction based on wheel delta
      if (wheelEvent.deltaY < 0) {
        // Scroll up - zoom in
        this.zoomIn();
      } else if (wheelEvent.deltaY > 0) {
        // Scroll down - zoom out
        this.zoomOut();
      }
    });

    this._logger.debug("Component", "Wheel zoom initialized");
  }

  /**
   * Add click listener to a button by ID.
   */
  private addClickListener(id: string, handler: () => void): void {
    const btn = this._shadow.getElementById(id);
    if (btn) {
      btn.addEventListener("click", handler);
    }
  }

  /**
   * Cleanup resources.
   */
  private cleanup(): void {
    if (this._currentTimeline) {
      this._currentTimeline.kill();
      this._currentTimeline = undefined;
    }
    if (this._progressUpdateInterval) {
      clearInterval(this._progressUpdateInterval);
      this._progressUpdateInterval = undefined;
    }
  }

  // ==================== UI ACTIONS ====================

  /**
   * Refresh the entire UI.
   */
  private refreshUI(): void {
    this.refreshHintsDropdown();
    this.refreshAnimationsDropdown();
    if (this._hintId) {
      this.loadHint(this._hintId);
    }
  }

  /**
   * Refresh the hints dropdown.
   */
  private refreshHintsDropdown(): void {
    if (!this._hintsDropdown) return;

    const currentValue = this._hintsDropdown.value;
    this._hintsDropdown.innerHTML =
      '<option value="">-- Select Hint --</option>';

    const hintIds = Object.keys(this._data.hints);
    hintIds.forEach((hintId) => {
      const option = document.createElement("option");
      option.value = hintId;
      option.textContent = hintId;
      this._hintsDropdown!.appendChild(option);
    });

    // Disable dropdown when no hints are present
    this._hintsDropdown.disabled = hintIds.length === 0;

    // Restore selection
    if (currentValue && this._data.hints[currentValue]) {
      this._hintsDropdown.value = currentValue;
    }
  }

  /**
   * Refresh the animations dropdown.
   */
  private refreshAnimationsDropdown(): void {
    if (!this._animationsDropdown) return;

    const currentValue = this._animationsDropdown.value;
    this._animationsDropdown.innerHTML =
      '<option value="">-- Select Animation --</option>';

    Object.keys(this._data.animations).forEach((animId) => {
      const option = document.createElement("option");
      option.value = animId;
      option.textContent = animId;
      this._animationsDropdown!.appendChild(option);
    });

    // Restore selection
    if (currentValue && this._data.animations[currentValue]) {
      this._animationsDropdown.value = currentValue;
    }
  }

  /**
   * Load a hint for editing.
   */
  private loadHint(hintId: string | undefined): void {
    // Clear message pane when loading a new hint
    this.showMessage("", "");

    // Clear any existing animation timeline
    if (this._currentTimeline) {
      this._currentTimeline.kill();
      this._currentTimeline = undefined;
    }
    this.stopProgressUpdate();
    this._isPlaying = false;
    if (this._progressBar) {
      this._progressBar.value = "0";
    }
    if (this._playButton) this._playButton.disabled = false;
    if (this._pauseButton) this._pauseButton.disabled = true;

    if (!hintId || !this._data.hints[hintId]) {
      // Clear form
      this.clearHintForm();
      return;
    }

    const hint = this._data.hints[hintId];

    // Populate form
    if (this._positionSelect) this._positionSelect.value = hint.position;
    if (this._offsetXInput)
      this._offsetXInput.value = hint.offsetX?.toString() || "0";
    if (this._offsetYInput)
      this._offsetYInput.value = hint.offsetY?.toString() || "0";
    if (this._scaleXInput)
      this._scaleXInput.value = hint.scaleX?.toString() || "1";
    if (this._scaleYInput)
      this._scaleYInput.value = hint.scaleY?.toString() || "1";
    if (this._rotationInput)
      this._rotationInput.value = hint.rotation?.toString() || "0";
    if (this._displacedRefSpanInput)
      this._displacedRefSpanInput.value = hint.displacedRefSpan || "";
    if (this._svgTextarea) {
      this._svgTextarea.value = hint.svg || "";
      this.highlightSvg();
    }

    // Animation
    if (hint.animation) {
      if (hint.animation.startsWith("#")) {
        // Referenced animation
        const animId = hint.animation.substring(1);
        if (this._embeddedJsCheckbox) this._embeddedJsCheckbox.checked = false;
        if (this._animationsDropdown) this._animationsDropdown.value = animId;
        if (this._jsTextarea) {
          // If the ID is not found, use the template; otherwise use empty string
          const animCode = this._data.animations[animId];
          this._jsTextarea.value =
            animCode !== undefined ? animCode : NEW_ANIMATION_TEMPLATE;
          this.highlightJs();
        }
      } else {
        // Embedded animation
        if (this._embeddedJsCheckbox) this._embeddedJsCheckbox.checked = true;
        if (this._jsTextarea) {
          this._jsTextarea.value = hint.animation;
          this.highlightJs();
        }
      }
    } else {
      if (this._embeddedJsCheckbox) this._embeddedJsCheckbox.checked = false;
      if (this._jsTextarea) {
        this._jsTextarea.value = "";
        this.highlightJs();
      }
    }

    // Update dropdown
    if (this._hintsDropdown) {
      this._hintsDropdown.value = hintId;
    }

    // Auto-refresh SVG display when hint is loaded
    this.refreshSvgDisplay();
    this.updateFormFieldHighlights();

    this._logger.debug("Component", "Loaded hint for editing", hintId);
  }

  /**
   * Clear the hint form.
   */
  private clearHintForm(): void {
    if (this._positionSelect) this._positionSelect.value = "o";
    if (this._offsetXInput) this._offsetXInput.value = "0";
    if (this._offsetYInput) this._offsetYInput.value = "0";
    if (this._scaleXInput) this._scaleXInput.value = "1";
    if (this._scaleYInput) this._scaleYInput.value = "1";
    if (this._rotationInput) this._rotationInput.value = "0";
    if (this._displacedRefSpanInput) this._displacedRefSpanInput.value = "";
    if (this._svgTextarea) this._svgTextarea.value = "";
    if (this._jsTextarea) this._jsTextarea.value = "";
    if (this._embeddedJsCheckbox) this._embeddedJsCheckbox.checked = false;
    this.updateFormFieldHighlights();
  }

  /**
   * Validate SVG code for well-formedness and structure.
   * Returns an error message if validation fails, or null if valid.
   */
  private validateSvgCode(svgCode: string): string | null {
    // Check if SVG code is empty
    if (!svgCode || !svgCode.trim()) {
      return "SVG code cannot be empty";
    }

    const trimmedCode = svgCode.trim();

    // Check that it starts with <g and ends with </g>
    if (!trimmedCode.startsWith("<g")) {
      return "SVG must start with a <g> element (e.g., <g> or <g ...>)";
    }

    if (!trimmedCode.endsWith("</g>")) {
      return "SVG must end with </g> (closing tag for the root <g> element)";
    }

    // Use DOMParser to validate XML well-formedness
    const parser = new DOMParser();
    const wrappedSvg = `<svg xmlns="http://www.w3.org/2000/svg">${svgCode}</svg>`;
    const doc = parser.parseFromString(wrappedSvg, "image/svg+xml");

    // Check for parsing errors
    const errorNode = doc.querySelector("parsererror");
    if (errorNode) {
      const errorText = errorNode.textContent || "Unknown XML parsing error";
      return `XML is not well-formed: ${errorText}`;
    }

    // Verify there is exactly one root <g> element
    const svgElement = doc.documentElement;
    const rootChildren = Array.from(svgElement.children);

    if (rootChildren.length === 0) {
      return "SVG must contain a <g> element";
    }

    if (rootChildren.length > 1) {
      return `SVG must have exactly one root <g> element, but found ${rootChildren.length} root elements. Wrap all content in a single <g> element.`;
    }

    const rootElement = rootChildren[0];
    if (rootElement.tagName.toLowerCase() !== "g") {
      return `Root element must be <g>, but found <${rootElement.tagName}>`;
    }

    // All validations passed
    return null;
  }

  /**
   * Add a new hint.
   */
  private addHint(): void {
    const hintId = prompt("Enter hint ID:");
    if (!hintId) return;

    if (this._data.hints[hintId]) {
      this.showMessage("Hint ID already exists!", "error");
      return;
    }

    // Create new hint with defaults
    const newHint: OperationHint = {
      svg: "<g></g>",
      position: "o",
      offsetX: 0,
      offsetY: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      animation: "",
    };

    this._data.hints[hintId] = newHint;
    this.refreshHintsDropdown();
    this.hintId = hintId;

    this._logger.info("Added new hint", hintId);
  }

  /**
   * Save the current hint.
   */
  private saveHint(): void {
    if (!this._hintId) {
      this.showMessage("No hint selected!", "error");
      return;
    }

    // Validate SVG and JS
    const svgCode = this._svgTextarea?.value || "";
    const animationValue = this._jsTextarea?.value || "";

    // Validate SVG code for well-formedness and structure
    const svgValidationError = this.validateSvgCode(svgCode);
    if (svgValidationError) {
      this.showMessage(`SVG validation error: ${svgValidationError}`, "error");
      return; // Prevent saving on error
    }

    // Validate JS syntax if present
    try {
      if (animationValue && !animationValue.trim().startsWith("#")) {
        // Try to create a function to validate syntax
        new Function("gsap", "targetEl", "rootEl", animationValue);
      }
    } catch (err) {
      this.showMessage(`JS validation error: ${err}`, "error");
      return; // Prevent saving on error
    }

    // Build hint object
    const hint: OperationHint = {
      svg: svgCode,
      position: (this._positionSelect?.value as RelativePosition) || "o",
      offsetX: this.parseOffset(this._offsetXInput?.value || "0"),
      offsetY: this.parseOffset(this._offsetYInput?.value || "0"),
      scaleX: parseFloat(this._scaleXInput?.value || "1"),
      scaleY: parseFloat(this._scaleYInput?.value || "1"),
      rotation: parseFloat(this._rotationInput?.value || "0"),
      displacedRefSpan: this._displacedRefSpanInput?.value || undefined,
    };

    // Handle animation based on "embedded JS" option
    const isEmbedded = this._embeddedJsCheckbox?.checked || false;
    const isNewAnimation = this._newAnimationCheckbox?.checked || false;

    if (isEmbedded) {
      // ===== EMBEDDED JS MODE =====
      if (animationValue.startsWith("#")) {
        this.showMessage(
          "Error: Animation value cannot start with # when 'embedded JS' is checked. Remove the # or uncheck 'embedded JS'.",
          "error"
        );
        return;
      }
      // Save JS code directly to hint's animation property
      hint.animation = animationValue || undefined;
    } else {
      // ===== CATALOG ANIMATION MODE (not embedded) =====
      if (!animationValue.startsWith("#")) {
        // Animation value is JS code - we want to save it to the catalog
        if (isNewAnimation) {
          // Case (b): New animation - prompt for ID
          const newAnimId = prompt("Enter ID for the new animation:");
          if (!newAnimId) {
            this.showMessage(
              "Save cancelled - no animation ID provided",
              "info"
            );
            return;
          }
          if (!newAnimId.trim()) {
            this.showMessage("Error: Animation ID cannot be empty", "error");
            return;
          }
          // Check if it already exists
          if (this._data.animations[newAnimId]) {
            const confirmOverwrite = window.confirm(
              `Animation "${newAnimId}" already exists. Overwrite it?`
            );
            if (!confirmOverwrite) {
              this.showMessage("Save cancelled", "info");
              return;
            }
          }
          // Save to catalog
          this._data.animations[newAnimId] = animationValue;
          hint.animation = `#${newAnimId}`;
          this.refreshAnimationsDropdown();
        } else {
          // Case (a): Update existing animation from dropdown
          const selectedAnimId = this._animationsDropdown?.value;
          if (!selectedAnimId) {
            this.showMessage(
              "Error: No animation selected. Please select an animation from the dropdown, OR check 'embedded JS', OR check 'new animation'.",
              "error"
            );
            return;
          }
          // Prompt for confirmation before overwriting
          if (this._data.animations[selectedAnimId]) {
            const confirm = window.confirm(
              `This will update the animation "${selectedAnimId}" in the catalog, which might be used by other hints. Continue?`
            );
            if (!confirm) {
              this.showMessage("Save cancelled", "info");
              return;
            }
          }
          // Save to catalog
          this._data.animations[selectedAnimId] = animationValue;
          hint.animation = `#${selectedAnimId}`;
        }
      } else {
        // Animation value is a reference (starts with #)
        const animId = animationValue.substring(1).trim();
        if (!animId) {
          this.showMessage(
            "Error: Animation reference must have an identifier after #. Add an identifier (e.g., #myAnimation).",
            "error"
          );
          return;
        }
        // Save as reference
        hint.animation = animationValue.trim();
      }
    }

    // Save hint
    this._data.hints[this._hintId] = hint;

    this.showMessage("Hint saved successfully!", "success");
    this.refreshSvgDisplay();
    this.fireEvent("dataChange", { data: this._data });

    this._logger.info("Saved hint", this._hintId);
  }

  /**
   * Delete the current hint.
   */
  private deleteHint(): void {
    if (!this._hintId) {
      this.showMessage("No hint selected!", "error");
      return;
    }

    const confirm = window.confirm(`Delete hint "${this._hintId}"?`);
    if (!confirm) return;

    delete this._data.hints[this._hintId];
    this.hintId = undefined;
    this.refreshHintsDropdown();
    this.clearHintForm();
    this.showMessage("Hint deleted", "success");
    this.fireEvent("dataChange", { data: this._data });

    this._logger.info("Deleted hint", this._hintId);
  }

  /**
   * Parse offset value (number or string with suffix).
   */
  private parseOffset(value: string): number | string {
    if (!value) return 0;
    // If it contains 'th' or 'tw', return as string
    if (value.includes("th") || value.includes("tw")) {
      return value;
    }
    // Otherwise parse as number
    return parseFloat(value);
  }

  /**
   * Refresh the SVG display.
   */
  private refreshSvgDisplay(): void {
    if (!this._svgDisplay) return;

    // Clear existing hint content but preserve grid and rulers
    // Remove all child nodes except defs and the grid-and-rulers group
    const nodesToRemove: Node[] = [];
    for (let i = 0; i < this._svgDisplay.childNodes.length; i++) {
      const node = this._svgDisplay.childNodes[i];
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();
        const id = element.getAttribute("id");
        // Keep defs and grid-and-rulers, remove everything else
        if (tagName !== "defs" && id !== "grid-and-rulers") {
          nodesToRemove.push(node);
        }
      }
    }
    nodesToRemove.forEach((node) => this._svgDisplay!.removeChild(node));

    // If grid and rulers don't exist yet, add them
    if (!this._svgDisplay.querySelector("#grid-and-rulers")) {
      this.addGridAndRulers(this._svgDisplay);
    }

    if (!this._hintId) {
      return;
    }

    // Get SVG code from textarea if it exists, otherwise from saved data
    let svgCode = this._svgTextarea?.value || "";

    // Fallback to saved data if textarea is empty and we have saved data
    if (!svgCode && this._data.hints[this._hintId]) {
      svgCode = this._data.hints[this._hintId].svg;
    }

    // If still no SVG code, return early
    if (!svgCode) {
      return;
    }

    // Validate variables before resolving them
    this.validateSvgVariables(svgCode);

    // Resolve variables
    svgCode = this.resolveVariables(svgCode);

    try {
      // Parse SVG code - wrap in SVG to ensure proper parsing
      const wrappedSvg = `<svg xmlns="http://www.w3.org/2000/svg">${svgCode}</svg>`;
      const parser = new DOMParser();
      const doc = parser.parseFromString(wrappedSvg, "image/svg+xml");
      const errorNode = doc.querySelector("parsererror");

      if (errorNode) {
        throw new Error("Invalid SVG syntax");
      }

      const svgElement = doc.documentElement;
      const gElement = svgElement.querySelector("g");

      if (!gElement) {
        throw new Error("SVG must contain a <g> element");
      }

      // Clone the g element using adoptNode for proper namespace handling
      const importedNode = this._shadow.ownerDocument!.adoptNode(
        gElement.cloneNode(true)
      ) as SVGGElement;
      this._svgDisplay.appendChild(importedNode);

      // Debug: Log the imported node
      this._logger.debug("Component", "Imported SVG node", {
        tagName: importedNode.tagName,
        childCount: importedNode.children.length,
        namespaceURI: importedNode.namespaceURI,
        firstChild: importedNode.firstElementChild?.outerHTML,
      });

      // Force a reflow to ensure the SVG is fully rendered
      this._svgDisplay.getBoundingClientRect();

      // Apply initial transform
      this.updateSvgTransform();

      this.showMessage("", ""); // Clear message
      this._logger.debug("Component", "SVG display refreshed");
    } catch (err) {
      this.showMessage(`SVG Error: ${err}`, "error");
      this._logger.error("Failed to render SVG", err);
    }
  }

  /**
   * Resolve variables in SVG code.
   */
  private resolveVariables(svgCode: string): string {
    let resolved = svgCode;

    this._hintVariables.forEach((variable) => {
      const placeholder = `{{${variable.name}}}`;
      resolved = resolved.replace(new RegExp(placeholder, "g"), variable.value);
    });

    return resolved;
  }

  /**
   * Extract variable names from SVG code (variables in {{...}} placeholders).
   */
  private extractVariablesFromSvg(svgCode: string): string[] {
    const variablePattern = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variablePattern.exec(svgCode)) !== null) {
      const varName = match[1].trim();
      if (varName && !variables.includes(varName)) {
        variables.push(varName);
      }
    }

    return variables;
  }

  /**
   * Validate SVG variables and update validation message.
   * Shows a warning if any variables used in SVG are not defined in hint variables.
   */
  private validateSvgVariables(svgCode: string): void {
    if (!this._variablesValidationMsg || !this._variablesPanelHeader) {
      return;
    }

    // Extract variables from SVG
    const usedVariables = this.extractVariablesFromSvg(svgCode);

    if (usedVariables.length === 0) {
      // No variables used - hide validation message and warning icon
      this._variablesValidationMsg.style.display = "none";
      this.updateVariablesHeaderWarning(false);
      return;
    }

    // Get defined variable names
    const definedVariables = this._hintVariables.map((v) => v.name);

    // Find undefined variables
    const undefinedVariables = usedVariables.filter(
      (v) => !definedVariables.includes(v)
    );

    if (undefinedVariables.length === 0) {
      // All variables are defined - hide validation message and warning icon
      this._variablesValidationMsg.style.display = "none";
      this.updateVariablesHeaderWarning(false);
      return;
    }

    // Show validation message with list of undefined variables
    this._variablesValidationMsg.style.display = "block";
    this._variablesValidationMsg.innerHTML = `
      <strong>⚠️ Undefined Variables:</strong>
      <div style="margin-top: 0.5rem;">
        The following variables are used in the SVG code but not defined in Hint Variables:
        <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
          ${undefinedVariables
            .map((v) => `<li><code>{{${v}}}</code></li>`)
            .join("")}
        </ul>
        <em>Add these variables to the list below to ensure the hint displays correctly.</em>
      </div>
    `;

    // Show warning icon in header
    this.updateVariablesHeaderWarning(true);
  }

  /**
   * Update warning icon in variables panel header.
   */
  private updateVariablesHeaderWarning(showWarning: boolean): void {
    if (!this._variablesPanelHeader) return;

    // Remove existing warning icon if present
    const existingWarning =
      this._variablesPanelHeader.querySelector(".warning-icon");
    if (existingWarning) {
      existingWarning.remove();
    }

    if (showWarning) {
      // Add warning icon
      const warningIcon = document.createElement("span");
      warningIcon.className = "warning-icon";
      warningIcon.title = "Some variables used in SVG are not defined";
      const icon = (feather.icons as any)["alert-triangle"];
      if (icon) {
        warningIcon.innerHTML = icon.toSvg({
          class: "feather-icon",
          width: 16,
          height: 16,
          "stroke-width": 2,
          color: "#ff9800",
        });
      } else {
        warningIcon.textContent = "⚠️";
      }
      this._variablesPanelHeader.appendChild(warningIcon);
    }
  }

  /**
   * Play animation.
   */
  private playAnimation(): void {
    this._logger.debug("Animation", "playAnimation called", {
      hasTimeline: !!this._currentTimeline,
      isPlaying: this._isPlaying,
    });

    if (this._currentTimeline) {
      // If timeline exists, just play it
      this._logger.debug("Animation", "Playing existing timeline");
      this._currentTimeline.play();
      this._isPlaying = true;
      if (this._playButton) this._playButton.disabled = true;
      if (this._pauseButton) this._pauseButton.disabled = false;
      this.startProgressUpdate();
      return;
    }

    // Create the timeline if it doesn't exist
    this._logger.debug("Animation", "Creating new timeline");
    this.createTimeline();

    // If timeline was successfully created, play it
    if (this._currentTimeline) {
      this._logger.debug("Animation", "Timeline created, now playing");
      this._currentTimeline.play();
      this._isPlaying = true;
      if (this._playButton) this._playButton.disabled = true;
      if (this._pauseButton) this._pauseButton.disabled = false;
      this.startProgressUpdate();
    } else {
      this._logger.error("Animation", "Failed to create timeline");
    }
  }

  /**
   * Create the GSAP timeline for the current hint.
   */
  private createTimeline(): void {
    this._logger.debug("Animation", "createTimeline called", {
      hasSvgDisplay: !!this._svgDisplay,
      hintId: this._hintId,
    });

    if (!this._svgDisplay || !this._hintId || !this._data.hints[this._hintId]) {
      this.showMessage("No hint to animate!", "error");
      this._logger.error(
        "Animation",
        "Cannot create timeline - missing prerequisites"
      );
      return;
    }

    const hint = this._data.hints[this._hintId];
    let jsCode = "";

    // Get animation code
    if (hint.animation) {
      if (hint.animation.startsWith("#")) {
        const animId = hint.animation.substring(1);
        jsCode = this._data.animations[animId] || "";
        this._logger.debug("Animation", "Using referenced animation", {
          animId,
          hasCode: !!jsCode,
        });
      } else {
        jsCode = hint.animation;
        this._logger.debug("Animation", "Using embedded animation", {
          codeLength: jsCode.length,
        });
      }
    }

    if (!jsCode) {
      this.showMessage("No animation defined!", "error");
      this._logger.error("Animation", "No animation code available");
      return;
    }

    try {
      // Refresh display first
      this._logger.debug("Animation", "Refreshing SVG display");
      this.refreshSvgDisplay();

      // Get the hint element (not the grid-and-rulers group)
      const hintEl = this._svgDisplay.querySelector("g:not(#grid-and-rulers)");
      if (!hintEl) {
        throw new Error("No hint <g> element found in SVG");
      }
      this._logger.debug("Animation", "Found hint element", {
        tagName: hintEl.tagName,
        id: hintEl.getAttribute("id"),
      });

      // Set initial opacity to 0 (on style attribute)
      (hintEl as SVGGElement).style.opacity = "0";

      // Check if GSAP is available
      const gsap = (window as any).gsap;
      if (!gsap) {
        throw new Error("GSAP not available");
      }
      this._logger.debug("Animation", "GSAP available");

      // We need to intercept GSAP calls to capture the tweens/timeline
      // Create a wrapper that tracks all tweens created
      const capturedTweens: any[] = [];
      const originalTo = gsap.to;
      const originalFromTo = gsap.fromTo;
      const originalFrom = gsap.from;
      const originalTimeline = gsap.timeline;

      // Wrap GSAP methods to capture tweens
      gsap.to = function (...args: any[]) {
        const tween = originalTo.apply(gsap, args);
        capturedTweens.push(tween);
        return tween;
      };
      gsap.fromTo = function (...args: any[]) {
        const tween = originalFromTo.apply(gsap, args);
        capturedTweens.push(tween);
        return tween;
      };
      gsap.from = function (...args: any[]) {
        const tween = originalFrom.apply(gsap, args);
        capturedTweens.push(tween);
        return tween;
      };

      // Execute the animation function
      const animFn = new Function("gsap", "targetEl", "rootEl", jsCode);
      let result;
      try {
        result = animFn(gsap, hintEl, this._svgDisplay);
      } finally {
        // Restore original GSAP methods
        gsap.to = originalTo;
        gsap.fromTo = originalFromTo;
        gsap.from = originalFrom;
      }

      this._logger.debug("Animation", "Animation function executed", {
        resultType: typeof result,
        isPromise: result && typeof result.then === "function",
        isTimeline: result && typeof result.progress === "function",
        capturedTweensCount: capturedTweens.length,
      });

      // Check what was returned
      if (result && typeof result.progress === "function") {
        // Direct timeline/tween return
        this._currentTimeline = result;
        this._currentTimeline.pause();
        this._logger.debug(
          "Animation",
          "Using returned timeline/tween directly"
        );
      } else if (capturedTweens.length > 0) {
        // Animation called gsap methods - create timeline with captured tweens
        this._logger.debug(
          "Animation",
          "Creating timeline from captured tweens",
          {
            tweenCount: capturedTweens.length,
            tweenDurations: capturedTweens.map((t) => t.duration()),
          }
        );

        // The tweens have already started playing, so we need to:
        // 1. Kill them to stop auto-playing
        // 2. Recreate them in a controlled timeline
        this._currentTimeline = gsap.timeline({ paused: true });

        // For each captured tween, we need to recreate it in our timeline
        capturedTweens.forEach((tween, index) => {
          // Get the total duration including any stagger
          const totalDuration = tween.totalDuration();
          const duration = tween.duration();

          this._logger.debug("Animation", `Processing tween ${index}`, {
            duration: duration,
            totalDuration: totalDuration,
            targets: tween.targets(),
            vars: tween.vars,
          });

          // Get the animation method that was used (to, from, fromTo)
          const targets = tween.targets();
          const vars = { ...tween.vars };

          // Get the initial values if this was a fromTo or from tween
          const isFromTo = tween._from !== undefined;
          const isFrom = !isFromTo && tween.vars.hasOwnProperty("startAt");

          // Kill the original tween to stop it from playing
          tween.kill();

          // Recreate the tween in our timeline using the appropriate method
          if (isFromTo) {
            // This was a fromTo tween - need to preserve the from values
            const fromVars = tween._from || {};
            this._currentTimeline.fromTo(targets, fromVars, vars, 0);
          } else if (isFrom) {
            // This was a from tween
            this._currentTimeline.from(targets, vars, 0);
          } else {
            // Standard to tween
            this._currentTimeline.to(targets, vars, 0);
          }
        });

        this._logger.debug("Animation", "Timeline built from tweens", {
          timelineDuration: this._currentTimeline.duration(),
        });
      } else {
        // No tweens captured - animation has no effect
        this._logger.warn(
          "Animation",
          "No tweens captured - creating empty timeline"
        );
        this._currentTimeline = gsap.timeline({ paused: true });
      }

      this._logger.debug("Animation", "Timeline created", {
        duration: this._currentTimeline.duration(),
        progress: this._currentTimeline.progress(),
        paused: this._currentTimeline.paused(),
      });

      // Check if timeline has duration
      if (this._currentTimeline.duration() === 0) {
        this._logger.warn(
          "Animation",
          "Timeline has zero duration - animation may not work correctly"
        );
        this.showMessage(
          "Warning: Animation has zero duration. Check your animation code.",
          "info"
        );
      }

      // Set up timeline callbacks
      this._currentTimeline.eventCallback("onComplete", () => {
        this._logger.debug("Animation", "Animation completed callback", {
          finalProgress: this._currentTimeline.progress(),
          finalTime: this._currentTimeline.time(),
          duration: this._currentTimeline.duration(),
        });
        this._isPlaying = false;
        if (this._playButton) this._playButton.disabled = false;
        if (this._pauseButton) this._pauseButton.disabled = true;
        this.stopProgressUpdate();

        // Ensure progress bar is at 100%
        if (this._progressBar) {
          this._progressBar.value = "1000";
          this._logger.debug("Animation", "Progress bar set to 1000 (100%)");
        }
      });

      this.showMessage("", "");
      this._logger.info("Animation", "Timeline created successfully", {
        duration: this._currentTimeline.duration(),
      });
    } catch (err) {
      this.showMessage(`Animation Error: ${err}`, "error");
      this._logger.error("Animation", "Failed to create timeline", err);
      this._isPlaying = false;
      if (this._playButton) this._playButton.disabled = false;
      if (this._pauseButton) this._pauseButton.disabled = true;
    }
  }

  /**
   * Pause animation.
   */
  private pauseAnimation(): void {
    this._logger.debug("Animation", "pauseAnimation called", {
      hasTimeline: !!this._currentTimeline,
      isPlaying: this._isPlaying,
    });

    if (this._currentTimeline) {
      this._currentTimeline.pause();
      this._isPlaying = false;
      if (this._playButton) this._playButton.disabled = false;
      if (this._pauseButton) this._pauseButton.disabled = true;
      this.stopProgressUpdate();
      this._logger.debug("Animation", "Animation paused", {
        progress: this._currentTimeline.progress(),
      });
    }
  }

  /**
   * Restart animation.
   */
  private restartAnimation(): void {
    this._logger.debug("Animation", "restartAnimation called", {
      hasTimeline: !!this._currentTimeline,
      isPlaying: this._isPlaying,
    });

    if (this._currentTimeline) {
      this._logger.debug("Animation", "Restarting existing timeline");
      this._currentTimeline.restart();
      this._isPlaying = true;
      if (this._playButton) this._playButton.disabled = true;
      if (this._pauseButton) this._pauseButton.disabled = false;
      this.startProgressUpdate();
      this._logger.debug("Animation", "Timeline restarted");
    } else {
      this._logger.debug("Animation", "No timeline, calling playAnimation");
      this.playAnimation();
    }
  }

  /**
   * Seek animation (timeline scrubbing).
   */
  private seekAnimation(): void {
    this._logger.debug("Animation", "seekAnimation called", {
      hasProgressBar: !!this._progressBar,
      hasTimeline: !!this._currentTimeline,
      progressBarValue: this._progressBar?.value,
    });

    if (!this._progressBar) return;

    // Create timeline if it doesn't exist yet
    if (!this._currentTimeline) {
      this._logger.debug("Animation", "No timeline, creating one");
      this.createTimeline();
      if (!this._currentTimeline) {
        this._logger.error(
          "Animation",
          "Failed to create timeline for seeking"
        );
        return; // Failed to create
      }
    }

    const progress = parseFloat(this._progressBar.value) / 1000;
    this._logger.debug("Animation", "Seeking to progress", {
      progressBarValue: this._progressBar.value,
      calculatedProgress: progress,
      wasPlaying: this._isPlaying,
      timelineDuration: this._currentTimeline.duration(),
    });

    // Pause the timeline to prevent it from continuing to play
    const wasPlaying = this._isPlaying;
    this._currentTimeline.pause();

    // Seek to the desired position
    this._currentTimeline.progress(progress);

    this._logger.debug("Animation", "Seek completed", {
      newProgress: this._currentTimeline.progress(),
      timelinePaused: this._currentTimeline.paused(),
    });

    // Update playing state
    this._isPlaying = false;
    if (this._playButton) this._playButton.disabled = false;
    if (this._pauseButton) this._pauseButton.disabled = true;

    // Stop the progress update to prevent the bar from jumping back
    this.stopProgressUpdate();
  }

  /**
   * Start updating progress bar.
   */
  private startProgressUpdate(): void {
    this._logger.debug("Animation", "startProgressUpdate called");
    this.stopProgressUpdate();
    this._progressUpdateInterval = window.setInterval(() => {
      if (this._currentTimeline && this._progressBar) {
        const progress = this._currentTimeline.progress();
        this._progressBar.value = (progress * 1000).toString();
      }
    }, 50); // Update every 50ms
    this._logger.debug("Animation", "Progress update started", {
      intervalId: this._progressUpdateInterval,
    });
  }

  /**
   * Stop updating progress bar.
   */
  private stopProgressUpdate(): void {
    if (this._progressUpdateInterval) {
      this._logger.debug("Animation", "Stopping progress update", {
        intervalId: this._progressUpdateInterval,
      });
      clearInterval(this._progressUpdateInterval);
      this._progressUpdateInterval = undefined;
    }
  }

  /**
   * Zoom in.
   */
  private zoomIn(): void {
    this._zoomLevel = Math.min(this._zoomLevel * 1.2, 10);
    this.updateSvgTransform();
  }

  /**
   * Zoom out.
   */
  private zoomOut(): void {
    this._zoomLevel = Math.max(this._zoomLevel / 1.2, 0.1);
    this.updateSvgTransform();
  }

  /**
   * Reset zoom.
   */
  private resetZoom(): void {
    if (!this._svgDisplay) return;

    // Get panel size to center the SVG
    const panel = this._shadow.querySelector(
      ".svg-display-panel"
    ) as HTMLElement;
    if (panel) {
      const panelWidth = panel.clientWidth;
      const panelHeight = panel.clientHeight;
      const svgWidth = this._settings.hintDesignWidth;
      const svgHeight = this._settings.hintDesignHeight;

      // Center the SVG at zoom level 1
      this._zoomLevel = 1;
      this._panX = (panelWidth - svgWidth) / 2;
      this._panY = (panelHeight - svgHeight) / 2;
    } else {
      this._zoomLevel = 1;
      this._panX = 0;
      this._panY = 0;
    }
    this.updateSvgTransform();
  }

  /**
   * Update SVG transform based on zoom and pan.
   */
  private updateSvgTransform(): void {
    if (!this._svgDisplay) return;

    const transformString = `translate(${this._panX}px, ${this._panY}px) scale(${this._zoomLevel})`;

    const svgBoundingRect = this._svgDisplay.getBoundingClientRect();

    this._logger.debug("Component", "Applying SVG transform", {
      panX: this._panX,
      panY: this._panY,
      zoomLevel: this._zoomLevel,
      transformString,
      svgWidth: this._svgDisplay.getAttribute("width"),
      svgHeight: this._svgDisplay.getAttribute("height"),
      svgBBox: this._svgDisplay.getBBox(),
      svgBoundingClientRect: {
        x: svgBoundingRect.x,
        y: svgBoundingRect.y,
        width: svgBoundingRect.width,
        height: svgBoundingRect.height,
        top: svgBoundingRect.top,
        left: svgBoundingRect.left,
        right: svgBoundingRect.right,
        bottom: svgBoundingRect.bottom,
      },
    });

    // Apply transform: translate first, then scale from the SVG's own center
    this._svgDisplay.style.transform = transformString;
    this._svgDisplay.style.transformOrigin = "0 0";

    // Only apply transition during zoom, not during pan (to avoid sluggishness)
    if (!this._isPanning) {
      this._svgDisplay.style.transition = "transform 0.15s ease-out";
    } else {
      this._svgDisplay.style.transition = "none";
    }
  }

  /**
   * Size to fit the SVG content.
   */
  private sizeToFit(): void {
    if (!this._svgDisplay) return;

    // Get the SVG content (not the grid-and-rulers)
    const hintContent = this._svgDisplay.querySelector(
      "g:not(#grid-and-rulers)"
    );
    if (!hintContent) {
      // If no hint content, just reset zoom
      this.resetZoom();
      return;
    }

    try {
      // Get the bounding box of the hint content
      const bbox = (hintContent as SVGGraphicsElement).getBBox();

      // Get the SVG display panel size
      const panel = this._shadow.querySelector(
        ".svg-display-panel"
      ) as HTMLElement;
      if (!panel) return;

      const panelWidth = panel.clientWidth;
      const panelHeight = panel.clientHeight;

      // The SVG has a fixed viewBox based on design dimensions
      const designWidth = this._settings.hintDesignWidth;
      const designHeight = this._settings.hintDesignHeight;

      // Calculate zoom to fit with some padding (90% of available space)
      const padding = 0.9;
      const scaleX = (panelWidth * padding) / bbox.width;
      const scaleY = (panelHeight * padding) / bbox.height;
      const scale = Math.min(scaleX, scaleY, 10); // Cap at max zoom

      // Calculate center of the bbox
      const bboxCenterX = bbox.x + bbox.width / 2;
      const bboxCenterY = bbox.y + bbox.height / 2;

      // After scaling, the bbox center will be at (bboxCenterX * scale, bboxCenterY * scale)
      // in screen coordinates (since transform-origin is 0,0)
      // We want this to be at the center of the panel: (panelWidth/2, panelHeight/2)
      // So: panX + (bboxCenterX * scale) = panelWidth / 2
      //     panY + (bboxCenterY * scale) = panelHeight / 2
      const panX = panelWidth / 2 - bboxCenterX * scale;
      const panY = panelHeight / 2 - bboxCenterY * scale;

      this._zoomLevel = scale;
      this._panX = panX;
      this._panY = panY;
      this.updateSvgTransform();

      this._logger.debug("Component", "Size to fit", {
        scale,
        panX,
        panY,
        bbox,
        bboxCenterX,
        bboxCenterY,
        panelWidth,
        panelHeight,
      });
    } catch (err) {
      this._logger.error("Failed to size to fit", err);
      this.resetZoom();
    }
  }

  /**
   * Toggle word wrap for SVG textarea.
   */
  private toggleSvgWordWrap(): void {
    this._svgWordWrapEnabled = !this._svgWordWrapEnabled;
    const wrapper = this._shadow.getElementById("svg-wrapper");
    if (wrapper) {
      if (this._svgWordWrapEnabled) {
        wrapper.classList.add("word-wrap-enabled");
      } else {
        wrapper.classList.remove("word-wrap-enabled");
      }
    }
    this._logger.debug(
      "Component",
      "SVG word wrap toggled",
      this._svgWordWrapEnabled
    );
  }

  /**
   * Toggle word wrap for JS textarea.
   */
  private toggleJsWordWrap(): void {
    this._jsWordWrapEnabled = !this._jsWordWrapEnabled;
    const wrapper = this._shadow.getElementById("js-wrapper");
    if (wrapper) {
      if (this._jsWordWrapEnabled) {
        wrapper.classList.add("word-wrap-enabled");
      } else {
        wrapper.classList.remove("word-wrap-enabled");
      }
    }
    this._logger.debug(
      "Component",
      "JS word wrap toggled",
      this._jsWordWrapEnabled
    );
  }

  /**
   * Save data to file.
   */
  private saveData(): void {
    const json = JSON.stringify(this._data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hint-designer-data.json";
    link.click();
    URL.revokeObjectURL(url);

    this.showMessage("Data saved to file", "success");
    this._logger.info("Data saved to file");
  }

  /**
   * Load data from file.
   */
  private loadData(): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string;
          const data = JSON.parse(json) as HintDesignerData;

          this.data = data;
          this.showMessage("Data loaded from file", "success");
          this._logger.info("Data loaded from file");
        } catch (err) {
          this.showMessage(`Failed to load data: ${err}`, "error");
          this._logger.error("Failed to load data", err);
        }
      };
      reader.readAsText(file);
    };

    input.click();
  }

  /**
   * Clear all data.
   */
  private clearData(): void {
    const confirm = window.confirm(
      "Clear all data? This will delete all hints and animations."
    );
    if (!confirm) return;

    this.data = { hints: {}, animations: {} };
    this.hintId = undefined;
    this.clearHintForm();
    this.showMessage("All data cleared", "success");
    this._logger.info("Data cleared");
  }

  /**
   * Export the current hint as an InkScape-compatible SVG file.
   */
  private exportToInkscape(): void {
    if (!this._hintId) {
      this.showMessage("No hint selected!", "error");
      return;
    }

    const hint = this._data.hints[this._hintId];
    if (!hint?.svg) {
      this.showMessage("No SVG to export!", "error");
      return;
    }

    const w = this._settings.hintDesignWidth;
    const h = this._settings.hintDesignHeight;
    const hw = w / 2;
    const hh = h / 2;

    const resolvedSvg = this.resolveVariables(hint.svg);
    const unresolvedMatches = resolvedSvg.match(/\{\{[^}]+\}\}/g);

    const svgContent =
      `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n` +
      `<svg\n` +
      `   width="${w}"\n` +
      `   height="${h}"\n` +
      `   viewBox="0 0 ${w} ${h}"\n` +
      `   version="1.1"\n` +
      `   id="svg1"\n` +
      `   sodipodi:docname="${this._hintId}.svg"\n` +
      `   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"\n` +
      `   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"\n` +
      `   xmlns="http://www.w3.org/2000/svg"\n` +
      `   xmlns:svg="http://www.w3.org/2000/svg">\n` +
      `  <sodipodi:namedview\n` +
      `     id="namedview1"\n` +
      `     pagecolor="#ffffff"\n` +
      `     bordercolor="#000000"\n` +
      `     borderopacity="0.25"\n` +
      `     inkscape:showpageshadow="2"\n` +
      `     inkscape:pageopacity="0.0"\n` +
      `     inkscape:pagecheckerboard="false"\n` +
      `     inkscape:deskcolor="#d1d1d1"\n` +
      `     inkscape:document-units="px"\n` +
      `     inkscape:zoom="3"\n` +
      `     inkscape:cx="${hw}"\n` +
      `     inkscape:cy="${hh}"\n` +
      `     inkscape:window-maximized="0"\n` +
      `     inkscape:current-layer="g1"\n` +
      `     showgrid="false" />\n` +
      `  <defs id="defs1" />\n` +
      `  <g\n` +
      `     inkscape:label="Layer 1"\n` +
      `     inkscape:groupmode="layer"\n` +
      `     id="layer1" />\n` +
      `     ${resolvedSvg}\n` +
      `</svg>`;

    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${this._hintId}.svg`;
    link.click();
    URL.revokeObjectURL(url);

    if (unresolvedMatches) {
      const names = [...new Set(unresolvedMatches)].join(", ");
      this.showMessage(
        `Exported "${this._hintId}.svg" — warning: unresolved variables: ${names}`,
        "info"
      );
    } else {
      this.showMessage(`Exported "${this._hintId}.svg" for InkScape`, "success");
    }
    this._logger.info("Exported hint to InkScape", this._hintId);
  }

  /**
   * Load animation code from catalog.
   */
  private loadAnimationCode(): void {
    const animId = this._animationsDropdown?.value;
    if (!animId) {
      this.showMessage("No animation selected!", "error");
      return;
    }

    const code = this._data.animations[animId];
    if (!code) {
      this.showMessage("Animation not found!", "error");
      return;
    }

    if (this._jsTextarea) {
      this._jsTextarea.value = code;
      this.highlightJs();
    }

    this.showMessage(`Loaded animation: ${animId}`, "info");
  }

  /**
   * Add a new variable.
   */
  private addVariable(): void {
    const name = prompt("Enter variable name:");
    if (!name) return;

    // Check if variable already exists
    if (this._hintVariables.some((v) => v.name === name)) {
      this.showMessage("Variable already exists!", "error");
      return;
    }

    this._hintVariables.push({ name, value: "" });
    this.refreshVariablesTable();
    this.fireEvent("hintVariablesChange", {
      hintVariables: this._hintVariables,
    });
  }

  /**
   * Delete a variable.
   */
  private deleteVariable(index: number): void {
    this._hintVariables.splice(index, 1);
    this.refreshVariablesTable();
    this.fireEvent("hintVariablesChange", {
      hintVariables: this._hintVariables,
    });
  }

  /**
   * Edit a variable.
   */
  private editVariable(index: number): void {
    const variable = this._hintVariables[index];
    const newValue = prompt(
      `Enter value for "${variable.name}":`,
      variable.value
    );
    if (newValue !== null) {
      variable.value = newValue;
      this.refreshVariablesTable();
      this.fireEvent("hintVariablesChange", {
        hintVariables: this._hintVariables,
      });
    }
  }

  /**
   * Delete all variables.
   */
  private deleteAllVariables(): void {
    const confirm = window.confirm("Delete all variables?");
    if (!confirm) return;

    this._hintVariables = [];
    this.refreshVariablesTable();
    this.fireEvent("hintVariablesChange", {
      hintVariables: this._hintVariables,
    });
  }

  /**
   * Extract all variable names from all hints in data.
   * Returns a sorted array of unique variable names.
   */
  private extractAllVariablesFromHints(): string[] {
    const allVariables = new Set<string>();

    // Iterate through all hints in data
    Object.values(this._data.hints).forEach((hint) => {
      if (hint.svg) {
        // Extract variables from this hint's SVG
        const variables = this.extractVariablesFromSvg(hint.svg);
        variables.forEach((varName) => allVariables.add(varName));
      }
    });

    // Convert to array and sort alphabetically
    return Array.from(allVariables).sort();
  }

  /**
   * Populate hint variables from all hints.
   * Extracts all variables from all hints' SVG code and merges them into hintVariables.
   * Only adds variables that don't already exist.
   */
  private populateVariablesFromHints(): void {
    // Extract all variables from hints
    const extractedVariables = this.extractAllVariablesFromHints();

    if (extractedVariables.length === 0) {
      this.showMessage("No variables found in hints", "info");
      return;
    }

    // Get existing variable names for quick lookup
    const existingNames = new Set(this._hintVariables.map((v) => v.name));

    // Add new variables (those not already in hintVariables)
    let addedCount = 0;
    extractedVariables.forEach((varName) => {
      if (!existingNames.has(varName)) {
        this._hintVariables.push({ name: varName, value: "" });
        addedCount++;
      }
    });

    // Refresh UI and notify
    this.refreshVariablesTable();
    this.fireEvent("hintVariablesChange", {
      hintVariables: this._hintVariables,
    });

    // Show feedback message
    if (addedCount === 0) {
      this.showMessage(
        `All ${extractedVariables.length} variable(s) already defined`,
        "info"
      );
    } else {
      this.showMessage(
        `Added ${addedCount} new variable(s) from hints (${extractedVariables.length} total found)`,
        "success"
      );
    }
  }

  /**
   * Refresh the variables table.
   */
  private refreshVariablesTable(): void {
    if (!this._variablesTable) return;

    this._variablesTable.innerHTML = "";

    // Ensure _hintVariables is an array
    if (!Array.isArray(this._hintVariables)) {
      this._logger.warn(
        "Component",
        "hintVariables is not an array, resetting to empty array",
        this._hintVariables
      );
      this._hintVariables = [];
    }

    if (this._hintVariables.length === 0) {
      const row = this._variablesTable.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 3;
      cell.textContent = "No variables defined";
      cell.style.fontStyle = "italic";
      cell.style.color = "#999";

      // Re-validate SVG variables after clearing variables
      const svgCode = this._svgTextarea?.value || "";
      if (svgCode) {
        this.validateSvgVariables(svgCode);
      }
      return;
    }

    this._hintVariables.forEach((variable, index) => {
      const row = this._variablesTable!.insertRow();

      // Actions cell
      const actionsCell = row.insertCell();

      const editBtn = this.createButton(
        `edit-var-${index}`,
        "edit-2",
        "Edit variable"
      );
      editBtn.onclick = () => this.editVariable(index);

      const deleteBtn = this.createButton(
        `delete-var-${index}`,
        "trash-2",
        "Delete variable"
      );
      deleteBtn.classList.add("btn-danger");
      deleteBtn.onclick = () => this.deleteVariable(index);

      actionsCell.appendChild(editBtn);
      actionsCell.appendChild(deleteBtn);

      // Name cell
      const nameCell = row.insertCell();
      nameCell.textContent = variable.name;

      // Value cell
      const valueCell = row.insertCell();
      valueCell.textContent = variable.value;
    });

    // Re-validate SVG variables after updating the variables table
    const svgCode = this._svgTextarea?.value || "";
    if (svgCode) {
      this.validateSvgVariables(svgCode);
    }
  }

  /**
   * Update the highlighted state of all Hint Properties form rows.
   * Rows whose value differs from the default get the form-row--modified class.
   */
  private updateFormFieldHighlights(): void {
    this.setFormRowModified(
      this._positionSelect,
      this._positionSelect?.value !== "o"
    );
    this.setFormRowModified(
      this._offsetXInput,
      this.isOffsetModified(this._offsetXInput?.value)
    );
    this.setFormRowModified(
      this._offsetYInput,
      this.isOffsetModified(this._offsetYInput?.value)
    );
    this.setFormRowModified(
      this._scaleXInput,
      parseFloat(this._scaleXInput?.value ?? "1") !== 1
    );
    this.setFormRowModified(
      this._scaleYInput,
      parseFloat(this._scaleYInput?.value ?? "1") !== 1
    );
    this.setFormRowModified(
      this._rotationInput,
      parseFloat(this._rotationInput?.value ?? "0") !== 0
    );
    this.setFormRowModified(
      this._displacedRefSpanInput,
      (this._displacedRefSpanInput?.value ?? "").trim() !== ""
    );
  }

  private isOffsetModified(value: string | undefined): boolean {
    if (!value) return false;
    const parsed = this.parseOffset(value);
    return typeof parsed === "string" || parsed !== 0;
  }

  private setFormRowModified(
    input: HTMLElement | undefined,
    modified: boolean
  ): void {
    if (!input?.parentElement) return;
    input.parentElement.classList.toggle("form-row--modified", modified);
  }

  /**
   * Show a message in the message panel.
   */
  private showMessage(
    message: string,
    type: "info" | "success" | "error" | ""
  ): void {
    if (!this._messagePanel) return;

    this._messagePanel.textContent = message;
    this._messagePanel.className = "message-panel";

    if (type) {
      this._messagePanel.classList.add(`message-${type}`);
    }
  }

  /**
   * Apply syntax highlighting to SVG textarea.
   */
  private highlightSvg(): void {
    if (!this._svgTextarea || !this._svgHighlightContainer) {
      this._logger.debug(
        "Component",
        "Cannot highlight SVG - missing elements",
        {
          hasTextarea: !!this._svgTextarea,
          hasContainer: !!this._svgHighlightContainer,
        }
      );
      return;
    }

    const code = this._svgTextarea.value;
    this._logger.debug("Component", "Highlighting SVG", {
      codeLength: code.length,
    });

    try {
      // Highlight as XML
      const highlighted = hljs.highlight(code, { language: "xml" }).value;
      this._svgHighlightContainer.innerHTML = highlighted + "\n";
      this._logger.debug("Component", "SVG highlighted successfully");
    } catch (err) {
      this._logger.error("Failed to highlight SVG", err);
      // Fallback to plain text
      this._svgHighlightContainer.textContent = code;
    }

    // Sync scroll position
    this.syncSvgScroll();
  }

  /**
   * Apply syntax highlighting to JS textarea.
   */
  private highlightJs(): void {
    if (!this._jsTextarea || !this._jsHighlightContainer) {
      this._logger.debug(
        "Component",
        "Cannot highlight JS - missing elements",
        {
          hasTextarea: !!this._jsTextarea,
          hasContainer: !!this._jsHighlightContainer,
        }
      );
      return;
    }

    const code = this._jsTextarea.value;
    this._logger.debug("Component", "Highlighting JS", {
      codeLength: code.length,
    });

    try {
      // Highlight as JavaScript
      const highlighted = hljs.highlight(code, {
        language: "javascript",
      }).value;
      this._jsHighlightContainer.innerHTML = highlighted + "\n";
      this._logger.debug("Component", "JS highlighted successfully");
    } catch (err) {
      this._logger.error("Failed to highlight JavaScript", err);
      // Fallback to plain text
      this._jsHighlightContainer.textContent = code;
    }

    // Sync scroll position
    this.syncJsScroll();
  }

  /**
   * Sync scroll position for SVG textarea and highlight container.
   */
  private syncSvgScroll(): void {
    if (!this._svgTextarea || !this._svgHighlightContainer) return;
    this._svgHighlightContainer.scrollTop = this._svgTextarea.scrollTop;
    this._svgHighlightContainer.scrollLeft = this._svgTextarea.scrollLeft;
  }

  /**
   * Sync scroll position for JS textarea and highlight container.
   */
  private syncJsScroll(): void {
    if (!this._jsTextarea || !this._jsHighlightContainer) return;
    this._jsHighlightContainer.scrollTop = this._jsTextarea.scrollTop;
    this._jsHighlightContainer.scrollLeft = this._jsTextarea.scrollLeft;
  }

  /**
   * Fire a custom event.
   */
  private fireEvent(name: string, detail: any): void {
    this.dispatchEvent(new CustomEvent(name, { detail }));
  }

  // ==================== STYLES ====================

  /**
   * Get component styles.
   */
  private getStyles(): string {
    return `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        font-family: Arial, sans-serif;
        overflow: hidden;
      }

      .hint-designer-container {
        display: grid;
        grid-template-rows: minmax(300px, 1fr) 6px minmax(300px, 1fr) 6px minmax(200px, 1fr);
        width: 100%;
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        background: var(--hint-designer-bg, #fafafa);
      }

      /* Splitter */
      .splitter {
        cursor: row-resize;
        background: var(--hint-designer-splitter-bg, #ddd);
        border-top: 1px solid var(--hint-designer-border, #ccc);
        border-bottom: 1px solid var(--hint-designer-border, #ccc);
        min-height: 6px;
        height: 6px;
      }

      .splitter:hover {
        background: var(--hint-designer-splitter-hover-bg, #999);
      }

      /* Top panels wrapper - nested grid */
      .top-panels-wrapper {
        display: grid;
        grid-template-rows: auto minmax(300px, 1fr) auto auto;
        grid-template-areas:
          "toolbar"
          "svg-display"
          "timeline"
          "message";
        overflow: hidden;
        min-height: 0;
      }

      /* Toolbar */
      .toolbar {
        grid-area: toolbar;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        background: var(--hint-designer-toolbar-bg, #f5f5f5);
        border-bottom: 1px solid var(--hint-designer-border, #ddd);
        flex-wrap: wrap;
      }

      .toolbar-group {
        display: flex;
        gap: 0.25rem;
      }

      .toolbar-btn {
        padding: 0.4rem 0.8rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .toolbar-btn:hover:not(:disabled) {
        background: #e9e9e9;
        border-color: #999;
      }

      .toolbar-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Feather icons in buttons */
      .toolbar-btn svg,
      .panel-toolbar button svg,
      .variables-table button svg {
        width: 16px;
        height: 16px;
        stroke-width: 2;
      }

      /* Button variants */
      .toolbar-btn.btn-primary,
      .panel-toolbar button.btn-primary {
        background: var(--hint-designer-btn-primary-bg, #e3f2fd);
        border-color: var(--hint-designer-btn-primary-border, #2196f3);
        color: var(--hint-designer-btn-primary-color, #1976d2);
      }

      .toolbar-btn.btn-primary:hover:not(:disabled),
      .panel-toolbar button.btn-primary:hover:not(:disabled) {
        background: var(--hint-designer-btn-primary-hover-bg, #bbdefb);
        border-color: var(--hint-designer-btn-primary-hover-border, #1976d2);
      }

      .toolbar-btn.btn-accent,
      .panel-toolbar button.btn-accent {
        background: var(--hint-designer-btn-accent-bg, #e8f5e9);
        border-color: var(--hint-designer-btn-accent-border, #4caf50);
        color: var(--hint-designer-btn-accent-color, #388e3c);
      }

      .toolbar-btn.btn-accent:hover:not(:disabled),
      .panel-toolbar button.btn-accent:hover:not(:disabled) {
        background: var(--hint-designer-btn-accent-hover-bg, #c8e6c9);
        border-color: var(--hint-designer-btn-accent-hover-border, #388e3c);
      }

      .toolbar-btn.btn-danger,
      .panel-toolbar button.btn-danger,
      .variables-table button.btn-danger {
        background: var(--hint-designer-btn-danger-bg, #ffebee);
        border-color: var(--hint-designer-btn-danger-border, #f44336);
        color: var(--hint-designer-btn-danger-color, #c62828);
      }

      .toolbar-btn.btn-danger:hover:not(:disabled),
      .panel-toolbar button.btn-danger:hover:not(:disabled),
      .variables-table button.btn-danger:hover:not(:disabled) {
        background: var(--hint-designer-btn-danger-hover-bg, #ffcdd2);
        border-color: var(--hint-designer-btn-danger-hover-border, #c62828);
      }

      .hints-dropdown,
      .animations-dropdown {
        padding: 0.4rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: white;
        min-width: 150px;
      }

      /* SVG Display */
      .svg-display-panel {
        grid-area: svg-display;
        min-height: 0;
        background: var(--hint-designer-svg-bg, white);
        border-bottom: 1px solid var(--hint-designer-border, #ddd);
        overflow: auto;
        position: relative;
      }

      .svg-display {
        position: absolute;
        border: 1px solid #ddd;
      }

      /* Timeline Player */
      .timeline-player {
        grid-area: timeline;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        background: var(--hint-designer-player-bg, #f9f9f9);
        border-bottom: 1px solid var(--hint-designer-border, #ddd);
      }

      .progress-bar {
        flex: 1;
        height: 8px;
        cursor: pointer;
      }

      /* Message Panel */
      .message-panel {
        grid-area: message;
        min-height: 30px;
        padding: 0.5rem;
        background: var(--hint-designer-message-bg, #fff);
        border-bottom: 1px solid var(--hint-designer-border, #ddd);
        font-size: 13px;
      }

      .message-panel.message-error {
        background: #fee;
        color: #c00;
      }

      .message-panel.message-success {
        background: #efe;
        color: #060;
      }

      .message-panel.message-info {
        background: #eef;
        color: #006;
      }

      /* Resizable Panels */
      .resizable-panel {
        display: flex;
        flex-direction: column;
        background: var(--hint-designer-panel-bg, white);
        border-bottom: 1px solid var(--hint-designer-border, #ddd);
        overflow: hidden;
        position: relative;
        min-height: 200px;
      }

      .properties-panel {
        /* No grid-area needed - positioned by grid row order */
      }

      .variables-panel {
        /* No grid-area needed - positioned by grid row order */
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem;
        background: var(--hint-designer-panel-header-bg, #f5f5f5);
        border-bottom: 1px solid var(--hint-designer-border, #ddd);
        font-weight: bold;
        font-size: 14px;
        position: relative;
        flex-shrink: 0;
      }

      .resize-handle {
        position: absolute;
        bottom: -3px;
        left: 0;
        right: 0;
        height: 6px;
        cursor: ns-resize;
        background: transparent;
        z-index: 10;
      }

      .resize-handle:hover {
        background: var(--hint-designer-primary, #007bff);
        opacity: 0.3;
      }

      .panel-toolbar {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        border-bottom: 1px solid var(--hint-designer-border, #ddd);
        flex-shrink: 0;
      }

      .panel-toolbar button {
        padding: 0.3rem 0.6rem;
        border: 1px solid #ccc;
        border-radius: 3px;
        background: white;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }

      .panel-toolbar button:hover {
        opacity: 0.8;
      }

      /* Add variable button - green color */
      .panel-toolbar button#add-variable {
        background: #e8f5e9;
        border-color: #4caf50;
        color: #2e7d32;
      }

      .panel-toolbar button#add-variable:hover {
        background: #c8e6c9;
      }

      /* Delete all button - red color */
      .panel-toolbar button#delete-all-vars {
        background: #ffebee;
        border-color: #f44336;
        color: #c62828;
      }

      .panel-toolbar button#delete-all-vars:hover {
        background: #ffcdd2;
      }

      .panel-content {
        flex: 1;
        overflow: auto;
        padding: 0.5rem;
        min-height: 0;
      }

      /* Properties Form */
      .properties-form {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 0.5rem;
        margin-bottom: 1rem;
      }

      .form-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .form-row label {
        white-space: nowrap;
        font-size: 13px;
        font-weight: 500;
      }

      .form-row input,
      .form-row select {
        flex: 1;
        min-width: 60px;
        padding: 0.3rem;
        border: 1px solid #ccc;
        border-radius: 3px;
      }

      .form-row input[type="checkbox"] {
        flex: 0;
        min-width: auto;
      }

      .form-row--modified label {
        color: var(--hint-designer-primary, #1565c0);
        font-weight: 700;
      }

      .form-row--modified input,
      .form-row--modified select {
        border-color: var(--hint-designer-primary-border, #2196f3);
        background-color: #e3f2fd;
      }

      .textarea-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 1rem;
        margin-bottom: 0.3rem;
      }

      .textarea-label {
        font-weight: bold;
        font-size: 13px;
        margin: 0;
      }

      .wrap-toggle-btn {
        padding: 0.2rem 0.4rem !important;
        font-size: 12px;
      }

      /* Code Editor with Syntax Highlighting */
      .code-editor-wrapper {
        position: relative;
        width: 100%;
        min-height: 200px;
        background: #f5f5f5;
        border: 1px solid #ccc;
        border-radius: 3px;
        overflow: hidden;
      }

      .code-highlight {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        padding: 0.5rem;
        margin: 0;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.5;
        white-space: pre;
        word-wrap: normal;
        pointer-events: none;
        z-index: 1;
        box-sizing: border-box;
        color: #333;
        overflow: hidden;
      }

      .code-textarea {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 100%;
        padding: 0.5rem;
        margin: 0;
        border: none;
        border-radius: 3px;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.5;
        resize: none;
        background: transparent;
        color: transparent;
        caret-color: #333;
        z-index: 2;
        overflow: auto;
        white-space: pre;
        word-wrap: normal;
        box-sizing: border-box;
      }

      /* Word wrap enabled */
      .code-editor-wrapper.word-wrap-enabled .code-textarea,
      .code-editor-wrapper.word-wrap-enabled .code-highlight {
        white-space: pre-wrap;
        word-wrap: break-word;
      }

      .code-textarea::selection {
        background: rgba(0, 123, 255, 0.3);
      }

      /* Highlight.js syntax highlighting colors */
      .code-highlight .hljs-tag {
        color: #000080;
      }

      .code-highlight .hljs-name {
        color: #800000;
      }

      .code-highlight .hljs-attr {
        color: #ff0000;
      }

      .code-highlight .hljs-string {
        color: #0000ff;
      }

      .code-highlight .hljs-keyword {
        color: #0000ff;
        font-weight: bold;
      }

      .code-highlight .hljs-built_in {
        color: #0086b3;
      }

      .code-highlight .hljs-literal {
        color: #008080;
      }

      .code-highlight .hljs-number {
        color: #008080;
      }

      .code-highlight .hljs-comment {
        color: #008000;
        font-style: italic;
      }

      .code-highlight .hljs-function {
        color: #795e26;
      }

      .code-highlight .hljs-params {
        color: #001080;
      }

      .anim-controls {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        flex-wrap: wrap;
      }

      .anim-controls input[type="checkbox"] {
        margin: 0;
      }

      .anim-controls label {
        margin: 0;
        white-space: nowrap;
      }

      /* Variables Table */
      .variables-table {
        width: 100%;
        border-collapse: collapse;
      }

      .variables-table tr:nth-child(even) {
        background-color: #f9f9f9;
      }

      .variables-table tr:nth-child(odd) {
        background-color: #fff;
      }

      .variables-table td {
        padding: 0.4rem 0.5rem;
        font-size: 13px;
        vertical-align: middle;
      }

      .variables-table td:first-child {
        width: 100px;
        white-space: nowrap;
      }

      .variables-table td:nth-child(2),
      .variables-table td:nth-child(3) {
        padding-left: 0.5rem;
      }

      /* Button styles for table actions */
      .variables-table button {
        padding: 0.2rem 0.5rem;
        margin: 0 0.2rem;
        border: 1px solid #ccc;
        border-radius: 3px;
        background: white;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }

      .variables-table button:hover {
        opacity: 0.8;
      }

      /* Edit button - blue color */
      .variables-table button[id^="edit-"] {
        background: #e3f2fd;
        border-color: #2196f3;
        color: #1976d2;
      }

      .variables-table button[id^="edit-"]:hover {
        background: #bbdefb;
      }

      /* Delete button - red color */
      .variables-table button[id^="delete-"] {
        background: #ffebee;
        border-color: #f44336;
        color: #c62828;
      }

      .variables-table button[id^="delete-"]:hover {
        background: #ffcdd2;
      }

      /* Validation Message */
      .validation-message {
        padding: 0.75rem;
        margin: 0.5rem;
        background: #fff3cd;
        border: 1px solid #ffc107;
        border-radius: 4px;
        color: #856404;
        font-size: 13px;
        line-height: 1.5;
      }

      .validation-message strong {
        display: block;
        margin-bottom: 0.5rem;
        color: #ff9800;
      }

      .validation-message code {
        background: #fff;
        padding: 0.2rem 0.4rem;
        border-radius: 3px;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 12px;
        border: 1px solid #e0e0e0;
      }

      .validation-message ul {
        margin: 0.5rem 0;
      }

      .validation-message li {
        margin: 0.25rem 0;
      }

      .validation-message em {
        display: block;
        margin-top: 0.5rem;
        font-size: 12px;
        color: #666;
      }

      /* Warning Icon in Panel Header */
      .warning-icon {
        display: inline-flex;
        align-items: center;
        margin-left: 0.5rem;
        color: #ff9800;
      }

      .warning-icon .feather-icon {
        display: block;
      }

      /* Responsive layout - use nested grids for each column */
      @media (min-width: 900px) {
        .properties-panel .panel-content {
          display: grid;
          grid-template-columns: auto 1fr 1fr;
          gap: 1rem;
          align-items: stretch;
        }

        /* All column wrappers use nested grid */
        .column-wrapper {
          display: grid;
          gap: 0.5rem;
          min-height: 0;
        }

        /* Column 1: Properties - single row filling height */
        .column-properties {
          grid-template-rows: 1fr;
        }

        .properties-form {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .form-row label {
          min-width: auto;
        }

        .form-row input,
        .form-row select {
          width: 120px;
          flex: 0 0 auto;
        }

        /* Column 2: SVG - header (auto) + textarea (1fr) */
        .column-svg {
          grid-template-rows: auto minmax(200px, 1fr);
        }

        .column-svg .code-editor-wrapper {
          min-height: 0 !important;
        }

        /* Column 3: Animation - header (auto) + controls (auto) + textarea (1fr) */
        .column-animation {
          grid-template-rows: auto auto minmax(200px, 1fr);
        }

        .column-animation .anim-controls {
          margin: 0;
        }

        .column-animation .code-editor-wrapper {
          min-height: 0 !important;
        }
      }

      /* Even wider layout - three columns side by side */
      @media (min-width: 1400px) {
        .properties-panel .panel-content {
          grid-template-columns: minmax(200px, auto) 1fr 1fr;
        }

        .form-row input,
        .form-row select {
          width: 140px;
        }
      }
    `;
  }
}

// Register the custom element
customElements.define("gve-hint-designer", GveHintDesigner);
