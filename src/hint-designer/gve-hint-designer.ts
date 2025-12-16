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

/**
 * GVE Hint Designer Web Component.
 * A minimalist editing environment to design hints and test their animations.
 */
export class GveHintDesigner extends HTMLElement {
  // Properties
  private _data: HintDesignerData = { hints: {}, animations: {} };
  private _settings: HintDesignerSettings = { ...DEFAULT_HINT_DESIGNER_SETTINGS };
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
  private _animationsDropdown?: HTMLSelectElement;
  private _embeddedJsCheckbox?: HTMLInputElement;
  private _positionSelect?: HTMLSelectElement;
  private _offsetXInput?: HTMLInputElement;
  private _offsetYInput?: HTMLInputElement;
  private _scaleXInput?: HTMLInputElement;
  private _scaleYInput?: HTMLInputElement;
  private _rotationInput?: HTMLInputElement;
  private _solidCheckbox?: HTMLInputElement;
  private _displacedRefSpanInput?: HTMLInputElement;
  private _variablesTable?: HTMLTableElement;
  private _playButton?: HTMLButtonElement;
  private _pauseButton?: HTMLButtonElement;
  private _restartButton?: HTMLButtonElement;
  private _progressBar?: HTMLInputElement;

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
      this._logger.debug("Component", "DrawSVG plugin registered:", gsap.plugins.drawSVG !== undefined);
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
    this._hintVariables = value || [];
    this.refreshVariablesTable();
    this.fireEvent("hintVariablesChange", { hintVariables: this._hintVariables });
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

    // Toolbar
    container.appendChild(this.createToolbar());

    // SVG Display (takes all available space)
    container.appendChild(this.createSvgDisplay());

    // Timeline Player
    container.appendChild(this.createTimelinePlayer());

    // Message Panel
    container.appendChild(this.createMessagePanel());

    // Hint Properties Editor
    container.appendChild(this.createHintPropertiesEditor());

    // Hint Variables List
    container.appendChild(this.createHintVariablesList());

    this._shadow.appendChild(container);

    this._logger.debug("Component", "UI rendered");
  }

  /**
   * Create the toolbar.
   */
  private createToolbar(): HTMLElement {
    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";

    // Refresh button
    const refreshBtn = this.createButton("refresh-svg", "↻", "Refresh SVG display");
    toolbar.appendChild(refreshBtn);

    // Add button
    const addBtn = this.createButton("add-hint", "+", "Add new hint");
    toolbar.appendChild(addBtn);

    // Hints dropdown
    this._hintsDropdown = document.createElement("select");
    this._hintsDropdown.className = "hints-dropdown";
    this._hintsDropdown.innerHTML = '<option value="">-- Select Hint --</option>';
    toolbar.appendChild(this._hintsDropdown);

    // Save button
    const saveBtn = this.createButton("save-hint", "💾", "Save hint");
    toolbar.appendChild(saveBtn);

    // Delete button
    const deleteBtn = this.createButton("delete-hint", "🗑️", "Delete hint");
    toolbar.appendChild(deleteBtn);

    // Zoom controls (grouped)
    const zoomGroup = document.createElement("div");
    zoomGroup.className = "toolbar-group";

    const zoomInBtn = this.createButton("zoom-in", "+", "Zoom in");
    const zoomOutBtn = this.createButton("zoom-out", "−", "Zoom out");
    const zoomResetBtn = this.createButton("zoom-reset", "⊡", "Reset zoom");

    zoomGroup.appendChild(zoomInBtn);
    zoomGroup.appendChild(zoomOutBtn);
    zoomGroup.appendChild(zoomResetBtn);
    toolbar.appendChild(zoomGroup);

    // Data controls (grouped)
    const dataGroup = document.createElement("div");
    dataGroup.className = "toolbar-group";

    const saveDataBtn = this.createButton("save-data", "📥", "Save data to file");
    const loadDataBtn = this.createButton("load-data", "📤", "Load data from file");
    const clearDataBtn = this.createButton("clear-data", "🗑️", "Clear all data");

    dataGroup.appendChild(saveDataBtn);
    dataGroup.appendChild(loadDataBtn);
    dataGroup.appendChild(clearDataBtn);
    toolbar.appendChild(dataGroup);

    return toolbar;
  }

  /**
   * Create the SVG display panel.
   */
  private createSvgDisplay(): HTMLElement {
    const panel = document.createElement("div");
    panel.className = "svg-display-panel";

    this._svgDisplay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this._svgDisplay.setAttribute("class", "svg-display");
    this._svgDisplay.setAttribute("width", this._settings.hintDesignWidth.toString());
    this._svgDisplay.setAttribute("height", this._settings.hintDesignHeight.toString());
    this._svgDisplay.setAttribute(
      "viewBox",
      `0 0 ${this._settings.hintDesignWidth} ${this._settings.hintDesignHeight}`
    );

    panel.appendChild(this._svgDisplay);

    return panel;
  }

  /**
   * Create the timeline player.
   */
  private createTimelinePlayer(): HTMLElement {
    const player = document.createElement("div");
    player.className = "timeline-player";

    // Buttons
    this._playButton = this.createButton("play", "▶", "Play animation");
    this._pauseButton = this.createButton("pause", "⏸", "Pause animation");
    this._restartButton = this.createButton("restart", "⏮", "Restart animation");

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

    // Header with resize handle
    const header = document.createElement("div");
    header.className = "panel-header";
    header.textContent = "Hint Properties";
    panel.appendChild(header);

    const resizeHandle = document.createElement("div");
    resizeHandle.className = "resize-handle";
    header.appendChild(resizeHandle);

    // Content
    const content = document.createElement("div");
    content.className = "panel-content";

    // Create form for hint properties
    const form = document.createElement("form");
    form.className = "properties-form";

    // Position
    form.appendChild(this.createFormRow("Position:", this.createPositionSelect()));

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

    // Solid
    this._solidCheckbox = document.createElement("input");
    this._solidCheckbox.type = "checkbox";
    form.appendChild(this.createFormRow("Solid:", this._solidCheckbox));

    // Displaced Ref Span
    this._displacedRefSpanInput = this.createInput("text", "");
    form.appendChild(this.createFormRow("Displaced Ref Span:", this._displacedRefSpanInput));

    content.appendChild(form);

    // SVG textarea with syntax highlighting
    const svgLabel = document.createElement("label");
    svgLabel.textContent = "SVG:";
    svgLabel.className = "textarea-label";
    content.appendChild(svgLabel);

    // Create wrapper for textarea with highlighting
    const svgWrapper = document.createElement("div");
    svgWrapper.className = "code-editor-wrapper";

    this._svgHighlightContainer = document.createElement("div");
    this._svgHighlightContainer.className = "code-highlight";
    svgWrapper.appendChild(this._svgHighlightContainer);

    this._svgTextarea = document.createElement("textarea");
    this._svgTextarea.className = "code-textarea";
    this._svgTextarea.spellcheck = false;
    svgWrapper.appendChild(this._svgTextarea);

    content.appendChild(svgWrapper);

    // Animation section
    const animLabel = document.createElement("label");
    animLabel.textContent = "Animation:";
    animLabel.className = "textarea-label";
    content.appendChild(animLabel);

    // Embedded JS checkbox and animation dropdown
    const animControls = document.createElement("div");
    animControls.className = "anim-controls";

    this._embeddedJsCheckbox = document.createElement("input");
    this._embeddedJsCheckbox.type = "checkbox";
    this._embeddedJsCheckbox.id = "embedded-js";

    const embeddedLabel = document.createElement("label");
    embeddedLabel.htmlFor = "embedded-js";
    embeddedLabel.textContent = "Embedded JS";

    animControls.appendChild(this._embeddedJsCheckbox);
    animControls.appendChild(embeddedLabel);

    // Animation dropdown
    this._animationsDropdown = document.createElement("select");
    this._animationsDropdown.className = "animations-dropdown";
    this._animationsDropdown.innerHTML = '<option value="">-- Select Animation --</option>';
    animControls.appendChild(this._animationsDropdown);

    // Load button
    const loadAnimBtn = this.createButton("load-animation", "⬇", "Load animation code");
    animControls.appendChild(loadAnimBtn);

    content.appendChild(animControls);

    // JS textarea with syntax highlighting
    const jsWrapper = document.createElement("div");
    jsWrapper.className = "code-editor-wrapper";

    this._jsHighlightContainer = document.createElement("div");
    this._jsHighlightContainer.className = "code-highlight";
    jsWrapper.appendChild(this._jsHighlightContainer);

    this._jsTextarea = document.createElement("textarea");
    this._jsTextarea.className = "code-textarea";
    this._jsTextarea.spellcheck = false;
    jsWrapper.appendChild(this._jsTextarea);

    content.appendChild(jsWrapper);

    panel.appendChild(content);

    // Make resizable
    this.makeResizable(panel, resizeHandle, 200);

    return panel;
  }

  /**
   * Create the hint variables list.
   */
  private createHintVariablesList(): HTMLElement {
    const panel = document.createElement("div");
    panel.className = "variables-panel resizable-panel";

    // Header with resize handle
    const header = document.createElement("div");
    header.className = "panel-header";
    header.textContent = "Hint Variables";
    panel.appendChild(header);

    const resizeHandle = document.createElement("div");
    resizeHandle.className = "resize-handle";
    header.appendChild(resizeHandle);

    // Toolbar
    const toolbar = document.createElement("div");
    toolbar.className = "panel-toolbar";

    const addVarBtn = this.createButton("add-variable", "+", "Add new variable");
    toolbar.appendChild(addVarBtn);

    const deleteAllBtn = this.createButton("delete-all-vars", "🗑️", "Delete all variables");
    toolbar.appendChild(deleteAllBtn);

    panel.appendChild(toolbar);

    // Content
    const content = document.createElement("div");
    content.className = "panel-content";

    // Table
    this._variablesTable = document.createElement("table");
    this._variablesTable.className = "variables-table";
    content.appendChild(this._variablesTable);

    panel.appendChild(content);

    // Make resizable
    this.makeResizable(panel, resizeHandle, 150);

    return panel;
  }

  // ==================== HELPER METHODS ====================

  /**
   * Create a button element.
   */
  private createButton(id: string, text: string, tooltip: string): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = "toolbar-btn";
    btn.id = id;
    btn.textContent = text;
    btn.title = tooltip;
    return btn;
  }

  /**
   * Create an input element.
   */
  private createInput(type: string, value: string, step?: number): HTMLInputElement {
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
   * Make a panel resizable.
   */
  private makeResizable(
    panel: HTMLElement,
    handle: HTMLElement,
    minHeight: number
  ): void {
    let startY = 0;
    let startHeight = 0;

    const onMouseDown = (e: MouseEvent) => {
      startY = e.clientY;
      startHeight = panel.offsetHeight;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientY - startY;
      const newHeight = Math.max(minHeight, startHeight + delta);
      panel.style.height = `${newHeight}px`;
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    handle.addEventListener("mousedown", onMouseDown);
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

    // Data controls
    this.addClickListener("save-data", () => this.saveData());
    this.addClickListener("load-data", () => this.loadData());
    this.addClickListener("clear-data", () => this.clearData());

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

    this._logger.debug("Component", "Event listeners initialized");
  }

  /**
   * Initialize panning with mouse drag.
   */
  private initializePanning(): void {
    const panel = this._shadow.querySelector('.svg-display-panel');
    if (!panel) return;

    panel.addEventListener('mousedown', (e: Event) => {
      const mouseEvent = e as MouseEvent;
      this._isPanning = true;
      this._lastPanX = mouseEvent.clientX;
      this._lastPanY = mouseEvent.clientY;
      (panel as HTMLElement).style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this._isPanning) return;

      const deltaX = e.clientX - this._lastPanX;
      const deltaY = e.clientY - this._lastPanY;

      this._panX += deltaX;
      this._panY += deltaY;

      this._lastPanX = e.clientX;
      this._lastPanY = e.clientY;

      this.updateSvgTransform();
    });

    document.addEventListener('mouseup', () => {
      if (this._isPanning) {
        this._isPanning = false;
        const panelEl = panel as HTMLElement;
        panelEl.style.cursor = 'grab';
      }
    });

    // Set initial cursor
    (panel as HTMLElement).style.cursor = 'grab';
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
    this._hintsDropdown.innerHTML = '<option value="">-- Select Hint --</option>';

    Object.keys(this._data.hints).forEach((hintId) => {
      const option = document.createElement("option");
      option.value = hintId;
      option.textContent = hintId;
      this._hintsDropdown!.appendChild(option);
    });

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
    this._animationsDropdown.innerHTML = '<option value="">-- Select Animation --</option>';

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
    if (this._scaleXInput) this._scaleXInput.value = hint.scaleX?.toString() || "1";
    if (this._scaleYInput) this._scaleYInput.value = hint.scaleY?.toString() || "1";
    if (this._rotationInput)
      this._rotationInput.value = hint.rotation?.toString() || "0";
    if (this._solidCheckbox) this._solidCheckbox.checked = hint.solid || false;
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
          this._jsTextarea.value = this._data.animations[animId] || "";
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
    if (this._solidCheckbox) this._solidCheckbox.checked = false;
    if (this._displacedRefSpanInput) this._displacedRefSpanInput.value = "";
    if (this._svgTextarea) this._svgTextarea.value = "";
    if (this._jsTextarea) this._jsTextarea.value = "";
    if (this._embeddedJsCheckbox) this._embeddedJsCheckbox.checked = false;
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
      solid: false,
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
    const jsCode = this._jsTextarea?.value || "";

    try {
      // Validate SVG (basic check)
      if (svgCode && !svgCode.trim().startsWith("<g")) {
        throw new Error("SVG must start with <g> element");
      }

      // Validate JS if embedded or animation selected
      const isEmbedded = this._embeddedJsCheckbox?.checked || false;
      if (jsCode && (isEmbedded || this._animationsDropdown?.value)) {
        // Try to create a function to validate syntax
        new Function("gsap", "targetEl", "rootEl", jsCode);
      }
    } catch (err) {
      this.showMessage(`Validation error: ${err}`, "error");
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
      solid: this._solidCheckbox?.checked || false,
      displacedRefSpan: this._displacedRefSpanInput?.value || undefined,
    };

    // Handle animation
    const isEmbedded = this._embeddedJsCheckbox?.checked || false;
    if (isEmbedded) {
      // Embedded JS
      hint.animation = jsCode;
    } else {
      // Referenced animation
      const animId = this._animationsDropdown?.value;
      if (animId) {
        // Prompt before overwriting animation
        if (
          this._data.animations[animId] &&
          this._data.animations[animId] !== jsCode
        ) {
          const confirm = window.confirm(
            `This will overwrite the animation "${animId}" which might be used by other hints. Continue?`
          );
          if (!confirm) {
            this.showMessage("Save cancelled", "info");
            return;
          }
        }

        // Save to animations catalog
        this._data.animations[animId] = jsCode;
        hint.animation = `#${animId}`;
      } else {
        hint.animation = undefined;
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

    // Clear existing content
    this._svgDisplay.innerHTML = "";

    if (!this._hintId || !this._data.hints[this._hintId]) {
      return;
    }

    const hint = this._data.hints[this._hintId];
    let svgCode = hint.svg;

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
      const importedNode = this._shadow.ownerDocument!.adoptNode(gElement.cloneNode(true)) as SVGGElement;
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
   * Play animation.
   */
  private playAnimation(): void {
    this._logger.debug("Animation", "playAnimation called", {
      hasTimeline: !!this._currentTimeline,
      isPlaying: this._isPlaying
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
      hintId: this._hintId
    });

    if (!this._svgDisplay || !this._hintId || !this._data.hints[this._hintId]) {
      this.showMessage("No hint to animate!", "error");
      this._logger.error("Animation", "Cannot create timeline - missing prerequisites");
      return;
    }

    const hint = this._data.hints[this._hintId];
    let jsCode = "";

    // Get animation code
    if (hint.animation) {
      if (hint.animation.startsWith("#")) {
        const animId = hint.animation.substring(1);
        jsCode = this._data.animations[animId] || "";
        this._logger.debug("Animation", "Using referenced animation", { animId, hasCode: !!jsCode });
      } else {
        jsCode = hint.animation;
        this._logger.debug("Animation", "Using embedded animation", { codeLength: jsCode.length });
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

      // Get the hint element
      const hintEl = this._svgDisplay.querySelector("g");
      if (!hintEl) {
        throw new Error("No <g> element found in SVG");
      }
      this._logger.debug("Animation", "Found hint element", { tagName: hintEl.tagName });

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
      gsap.to = function(...args: any[]) {
        const tween = originalTo.apply(gsap, args);
        capturedTweens.push(tween);
        return tween;
      };
      gsap.fromTo = function(...args: any[]) {
        const tween = originalFromTo.apply(gsap, args);
        capturedTweens.push(tween);
        return tween;
      };
      gsap.from = function(...args: any[]) {
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
        isPromise: result && typeof result.then === 'function',
        isTimeline: result && typeof result.progress === 'function',
        capturedTweensCount: capturedTweens.length
      });

      // Check what was returned
      if (result && typeof result.progress === 'function') {
        // Direct timeline/tween return
        this._currentTimeline = result;
        this._currentTimeline.pause();
        this._logger.debug("Animation", "Using returned timeline/tween directly");
      } else if (capturedTweens.length > 0) {
        // Animation called gsap methods - create timeline with captured tweens
        this._logger.debug("Animation", "Creating timeline from captured tweens", {
          tweenCount: capturedTweens.length,
          tweenDurations: capturedTweens.map(t => t.duration())
        });

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
            vars: tween.vars
          });

          // Get the animation method that was used (to, from, fromTo)
          const targets = tween.targets();
          const vars = { ...tween.vars };

          // Get the initial values if this was a fromTo or from tween
          const isFromTo = tween._from !== undefined;
          const isFrom = !isFromTo && tween.vars.hasOwnProperty('startAt');

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
          timelineDuration: this._currentTimeline.duration()
        });
      } else {
        // No tweens captured - animation has no effect
        this._logger.warn("Animation", "No tweens captured - creating empty timeline");
        this._currentTimeline = gsap.timeline({ paused: true });
      }

      this._logger.debug("Animation", "Timeline created", {
        duration: this._currentTimeline.duration(),
        progress: this._currentTimeline.progress(),
        paused: this._currentTimeline.paused()
      });

      // Check if timeline has duration
      if (this._currentTimeline.duration() === 0) {
        this._logger.warn("Animation", "Timeline has zero duration - animation may not work correctly");
        this.showMessage("Warning: Animation has zero duration. Check your animation code.", "info");
      }

      // Set up timeline callbacks
      this._currentTimeline.eventCallback("onComplete", () => {
        this._logger.debug("Animation", "Animation completed callback", {
          finalProgress: this._currentTimeline.progress(),
          finalTime: this._currentTimeline.time(),
          duration: this._currentTimeline.duration()
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
        duration: this._currentTimeline.duration()
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
      isPlaying: this._isPlaying
    });

    if (this._currentTimeline) {
      this._currentTimeline.pause();
      this._isPlaying = false;
      if (this._playButton) this._playButton.disabled = false;
      if (this._pauseButton) this._pauseButton.disabled = true;
      this.stopProgressUpdate();
      this._logger.debug("Animation", "Animation paused", {
        progress: this._currentTimeline.progress()
      });
    }
  }

  /**
   * Restart animation.
   */
  private restartAnimation(): void {
    this._logger.debug("Animation", "restartAnimation called", {
      hasTimeline: !!this._currentTimeline,
      isPlaying: this._isPlaying
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
      progressBarValue: this._progressBar?.value
    });

    if (!this._progressBar) return;

    // Create timeline if it doesn't exist yet
    if (!this._currentTimeline) {
      this._logger.debug("Animation", "No timeline, creating one");
      this.createTimeline();
      if (!this._currentTimeline) {
        this._logger.error("Animation", "Failed to create timeline for seeking");
        return; // Failed to create
      }
    }

    const progress = parseFloat(this._progressBar.value) / 1000;
    this._logger.debug("Animation", "Seeking to progress", {
      progressBarValue: this._progressBar.value,
      calculatedProgress: progress,
      wasPlaying: this._isPlaying,
      timelineDuration: this._currentTimeline.duration()
    });

    // Pause the timeline to prevent it from continuing to play
    const wasPlaying = this._isPlaying;
    this._currentTimeline.pause();

    // Seek to the desired position
    this._currentTimeline.progress(progress);

    this._logger.debug("Animation", "Seek completed", {
      newProgress: this._currentTimeline.progress(),
      timelinePaused: this._currentTimeline.paused()
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
      intervalId: this._progressUpdateInterval
    });
  }

  /**
   * Stop updating progress bar.
   */
  private stopProgressUpdate(): void {
    if (this._progressUpdateInterval) {
      this._logger.debug("Animation", "Stopping progress update", {
        intervalId: this._progressUpdateInterval
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
    this._zoomLevel = 1;
    this._panX = 0;
    this._panY = 0;
    this.updateSvgTransform();
  }

  /**
   * Update SVG transform based on zoom and pan.
   */
  private updateSvgTransform(): void {
    if (!this._svgDisplay) return;

    // Apply transform: translate first, then scale from the SVG's own center
    this._svgDisplay.style.transform = `translate(${this._panX}px, ${this._panY}px) scale(${this._zoomLevel})`;
    this._svgDisplay.style.transformOrigin = '0 0';

    // Only apply transition during zoom, not during pan (to avoid sluggishness)
    if (!this._isPanning) {
      this._svgDisplay.style.transition = 'transform 0.15s ease-out';
    } else {
      this._svgDisplay.style.transition = 'none';
    }
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
    this.fireEvent("hintVariablesChange", { hintVariables: this._hintVariables });
  }

  /**
   * Delete a variable.
   */
  private deleteVariable(index: number): void {
    this._hintVariables.splice(index, 1);
    this.refreshVariablesTable();
    this.fireEvent("hintVariablesChange", { hintVariables: this._hintVariables });
  }

  /**
   * Edit a variable.
   */
  private editVariable(index: number): void {
    const variable = this._hintVariables[index];
    const newValue = prompt(`Enter value for "${variable.name}":`, variable.value);
    if (newValue !== null) {
      variable.value = newValue;
      this.refreshVariablesTable();
      this.fireEvent("hintVariablesChange", { hintVariables: this._hintVariables });
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
    this.fireEvent("hintVariablesChange", { hintVariables: this._hintVariables });
  }

  /**
   * Refresh the variables table.
   */
  private refreshVariablesTable(): void {
    if (!this._variablesTable) return;

    this._variablesTable.innerHTML = "";

    if (this._hintVariables.length === 0) {
      const row = this._variablesTable.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 3;
      cell.textContent = "No variables defined";
      cell.style.fontStyle = "italic";
      cell.style.color = "#999";
      return;
    }

    this._hintVariables.forEach((variable, index) => {
      const row = this._variablesTable!.insertRow();

      // Actions cell
      const actionsCell = row.insertCell();

      const editBtn = this.createButton(`edit-var-${index}`, "✏️", "Edit variable");
      editBtn.onclick = () => this.editVariable(index);

      const deleteBtn = this.createButton(
        `delete-var-${index}`,
        "🗑️",
        "Delete variable"
      );
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
  }

  /**
   * Show a message in the message panel.
   */
  private showMessage(message: string, type: "info" | "success" | "error" | ""): void {
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
      this._logger.debug("Component", "Cannot highlight SVG - missing elements", {
        hasTextarea: !!this._svgTextarea,
        hasContainer: !!this._svgHighlightContainer
      });
      return;
    }

    const code = this._svgTextarea.value;
    this._logger.debug("Component", "Highlighting SVG", { codeLength: code.length });

    try {
      // Highlight as XML
      const highlighted = hljs.highlight(code, { language: 'xml' }).value;
      this._svgHighlightContainer.innerHTML = highlighted + '\n';
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
      this._logger.debug("Component", "Cannot highlight JS - missing elements", {
        hasTextarea: !!this._jsTextarea,
        hasContainer: !!this._jsHighlightContainer
      });
      return;
    }

    const code = this._jsTextarea.value;
    this._logger.debug("Component", "Highlighting JS", { codeLength: code.length });

    try {
      // Highlight as JavaScript
      const highlighted = hljs.highlight(code, { language: 'javascript' }).value;
      this._jsHighlightContainer.innerHTML = highlighted + '\n';
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
        grid-template-rows: auto 1fr auto auto auto auto;
        grid-template-areas:
          "toolbar"
          "svg-display"
          "timeline"
          "message"
          "properties"
          "variables";
        width: 100%;
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        background: var(--hint-designer-bg, #fafafa);
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
      }

      .toolbar-btn:hover:not(:disabled) {
        background: #e9e9e9;
        border-color: #999;
      }

      .toolbar-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
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
        min-height: 300px;
        max-height: 500px;
        background: var(--hint-designer-svg-bg, white);
        border-bottom: 1px solid var(--hint-designer-border, #ddd);
        overflow: auto;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .svg-display {
        display: block;
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
        grid-area: properties;
      }

      .variables-panel {
        grid-area: variables;
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

      .textarea-label {
        display: block;
        margin-top: 1rem;
        margin-bottom: 0.3rem;
        font-weight: bold;
        font-size: 13px;
      }

      /* Code Editor with Syntax Highlighting */
      .code-editor-wrapper {
        position: relative;
        width: 100%;
        min-height: 150px;
        background: #f5f5f5;
        border: 1px solid #ccc;
        border-radius: 3px;
      }

      .code-highlight {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 0.5rem;
        margin: 0;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.5;
        overflow: hidden;
        white-space: pre;
        word-wrap: normal;
        pointer-events: none;
        z-index: 1;
      }

      .code-textarea {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 100%;
        min-height: 150px;
        padding: 0.5rem;
        margin: 0;
        border: none;
        border-radius: 3px;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.5;
        resize: vertical;
        background: transparent;
        color: transparent;
        caret-color: #333;
        z-index: 2;
        overflow: auto;
        white-space: pre;
        word-wrap: normal;
        box-sizing: border-box;
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

      /* Responsive layout */
      @media (min-width: 900px) {
        .properties-panel .panel-content {
          display: grid;
          grid-template-columns: auto 1fr 1fr;
          grid-template-rows: auto auto 1fr;
          gap: 1rem;
          align-items: start;
        }

        .properties-form {
          grid-column: 1;
          grid-row: 1 / -1;
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

        /* SVG column */
        .textarea-label:nth-of-type(1) {
          grid-column: 2;
          grid-row: 1;
        }

        .code-editor-wrapper:nth-of-type(1) {
          grid-column: 2;
          grid-row: 2 / -1;
        }

        /* Animation column */
        .textarea-label:nth-of-type(2) {
          grid-column: 3;
          grid-row: 1;
        }

        .anim-controls {
          grid-column: 3;
          grid-row: 2;
          margin: 0;
        }

        .code-editor-wrapper:nth-of-type(2) {
          grid-column: 3;
          grid-row: 3;
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
