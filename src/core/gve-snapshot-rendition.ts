import {
  CharChainResult,
  CharNode,
  ChainOperationContextStep,
} from "../models";
import { GveRenditionSettings, DEFAULT_SETTINGS } from "../settings/settings";
import { Logger } from "./logger";
import { AnimationEngine } from "../animation/animation-engine";
import { BoundsCache } from "../rendering/bounds-cache";
import { SpreadingEngine } from "../rendering/spreading-engine";
import { TextRenderer } from "../rendering/text-renderer";
import { HintRenderer } from "../rendering/hint-renderer";
import { FeatureResolver } from "../rendering/feature-resolver";
import { Toolbar } from "../ui/toolbar";
import { VersionTextArea } from "../ui/version-text-area";
import { DetailsArea } from "../ui/details-area";
import { VersionsListArea } from "../ui/versions-list-area";
import { Hilites } from "../ui/hilites";
import { stringToNodes } from "../utils/node-utils";
import { generateVersionPalette } from "../utils/color-palette";

// External libraries
import svgPanZoom from "svg-pan-zoom";
type SvgPanZoomInstance = ReturnType<typeof svgPanZoom>;
import gsap from "gsap";

/**
 * GVE Snapshot Rendition Web Component.
 * Renders interactive text transformations from snapshot model data.
 */
export class GveSnapshotRendition extends HTMLElement {
  // Settings and data
  private _settings: GveRenditionSettings;
  private _data?: CharChainResult;
  private _versionTag?: string;

  // Core systems
  private _logger: Logger;
  private _animationEngine?: AnimationEngine;
  private _boundsCache: BoundsCache;
  private _spreadingEngine: SpreadingEngine;
  private _textRenderer?: TextRenderer;
  private _hintRenderer?: HintRenderer;
  private _featureResolver: FeatureResolver;

  // UI elements
  private _shadow: ShadowRoot;
  private _rootSvg?: SVGElement;
  private _container?: HTMLElement;
  private _toolbar?: Toolbar;
  private _versionTextArea?: VersionTextArea;
  private _detailsArea?: DetailsArea;
  private _versionsListArea?: VersionsListArea;
  private _hilites?: Hilites;
  private _panZoomInstance?: SvgPanZoomInstance;
  private _keyboardHandler?: (e: KeyboardEvent) => void;

  // State
  private _baseNodes: CharNode[] = [];
  private _versionPalette: Map<string, string> = new Map();
  private _currentVersion: string = "v0";
  private _currentVersionIndex: number = 0;

  constructor() {
    super();

    // Initialize with default settings
    this._settings = { ...DEFAULT_SETTINGS };

    // Create logger
    this._logger = new Logger("GVE-Rendition", this._settings.debug);

    // Create bounds cache and spreading engine
    this._boundsCache = new BoundsCache(this._logger);
    this._spreadingEngine = new SpreadingEngine(
      this._boundsCache,
      this._logger
    );

    // Create feature resolver
    this._featureResolver = new FeatureResolver(this._logger);

    // Create shadow DOM
    this._shadow = this.attachShadow({ mode: "open" });

    this._logger.info("GveSnapshotRendition component created");
  }

  /**
   * Observed attributes for the web component.
   */
  public static get observedAttributes(): string[] {
    return ["version-tag"];
  }

  /**
   * Called when component is added to the DOM.
   */
  public connectedCallback(): void {
    this._logger.info("Component connected to DOM");
    this.render();
    this.initializeGsap();
    this.setupKeyboardShortcuts();
  }

  /**
   * Called when component is removed from the DOM.
   */
  public disconnectedCallback(): void {
    this._logger.info("Component disconnected from DOM");
    if (this._animationEngine) {
      this._animationEngine.killAll();
    }
    // Cleanup pan/zoom instance
    if (this._panZoomInstance) {
      this._panZoomInstance.destroy();
      this._panZoomInstance = undefined;
      this._logger.info("Pan/zoom destroyed");
    }
    // Cleanup keyboard shortcuts
    if (this._keyboardHandler) {
      document.removeEventListener("keydown", this._keyboardHandler);
      this._keyboardHandler = undefined;
      this._logger.info("Keyboard shortcuts removed");
    }
  }

  /**
   * Called when observed attributes change.
   */
  public attributeChangedCallback(
    name: string,
    oldValue: string,
    newValue: string
  ): void {
    if (name === "version-tag" && oldValue !== newValue) {
      this._versionTag = newValue || undefined;
      this.navigateToVersion(newValue);
    }
  }

  /**
   * Settings property (bindable).
   */
  public get settings(): GveRenditionSettings {
    return this._settings;
  }

  public set settings(value: GveRenditionSettings) {
    this._settings = { ...DEFAULT_SETTINGS, ...value };
    this._logger.setEnabled(this._settings.debug || false);
    this._logger.info("Settings updated", this._settings);

    // When settings change, update renderers
    if (this._textRenderer) {
      this._textRenderer.updateSettings(this._settings);
    }
    if (this._hintRenderer) {
      this._hintRenderer.updateSettings(this._settings);
    }
    this.render();
  }

  /**
   * Data property (bindable).
   */
  public get data(): CharChainResult | undefined {
    return this._data;
  }

  public set data(value: CharChainResult | undefined) {
    this._data = value;
    this._logger.info("Data updated", value);

    // Check if we need to initialize UI first
    const needsUISetup = !this._rootSvg || !this._container;

    if (needsUISetup) {
      this.render();
    }

    this.processData();
  }

  /**
   * Version tag property (bindable).
   */
  public get versionTag(): string | undefined {
    return this._versionTag;
  }

  public set versionTag(value: string | undefined) {
    this._versionTag = value;
    if (value) {
      this.navigateToVersion(value);
    }
  }

  /**
   * Initialize GSAP when available.
   */
  private initializeGsap(): void {
    // Check if GSAP is available globally
    const gsap = (window as any).gsap;
    if (gsap) {
      this._animationEngine = new AnimationEngine(gsap, this._logger);
      this._textRenderer = new TextRenderer(
        this._settings,
        this._logger,
        this._animationEngine,
        this._boundsCache,
        this._spreadingEngine
      );
      this._hintRenderer = new HintRenderer(
        this._settings,
        this._logger,
        this._animationEngine,
        this._boundsCache,
        this._spreadingEngine
      );
      this._logger.info("GSAP initialized");
      this.renderContent();
    } else {
      this._logger.warn("GSAP not available. Please include GSAP library.");
    }
  }

  /**
   * Process data to prepare for rendering.
   */
  private processData(): void {
    if (!this._data) return;

    // Convert text to nodes if it's a string
    if (typeof this._data.text === "string") {
      this._baseNodes = stringToNodes(this._data.text);
    } else if (Array.isArray(this._data.text)) {
      this._baseNodes = this._data.text;
    }

    // Generate version color palette
    this._versionPalette = generateVersionPalette(this._data.chainTags);

    this._logger.info(
      `Processed data: ${this._baseNodes.length} base nodes, ${this._data.steps.length} steps`
    );

    // Initialize toolbar if not already done
    if (!this._toolbar && this._data.steps) {
      const toolbarContainer = this._shadow.querySelector("#toolbar-container");
      if (toolbarContainer) {
        this._toolbar = new Toolbar(toolbarContainer as HTMLElement);
        this._toolbar.setTotalVersions(this._data.steps.length);

        // Listen for navigation events
        toolbarContainer.addEventListener("navigate", (e: Event) => {
          const customEvent = e as CustomEvent;
          this.goToVersionIndex(customEvent.detail.index);
        });

        // Listen for zoom events
        toolbarContainer.addEventListener("zoom", (e: Event) => {
          const customEvent = e as CustomEvent;
          const { action, zoomLevel } = customEvent.detail;

          switch (action) {
            case "in":
              this.zoomIn();
              break;
            case "out":
              this.zoomOut();
              break;
            case "reset":
              this.resetZoom();
              break;
            case "set":
              if (zoomLevel !== undefined) {
                this.setZoom(zoomLevel);
              }
              break;
          }
        });
      }
    }

    // Trigger content rendering if renderers are ready
    if (this._textRenderer && this._rootSvg && this._baseNodes.length > 0) {
      this.renderContent();
    }
  }

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
    this._container = document.createElement("div");
    this._container.className = "gve-container";

    // Create toolbar container
    const toolbarContainer = document.createElement("div");
    toolbarContainer.id = "toolbar-container";
    this._container.appendChild(toolbarContainer);

    // Create SVG root
    this._rootSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    this._rootSvg.setAttribute("class", "gve-text-rendition");
    this._rootSvg.setAttribute("width", "100%");
    this._rootSvg.setAttribute("height", "600px");

    this._container.appendChild(this._rootSvg);

    // Create versions list area
    this._versionsListArea = new VersionsListArea(this._settings, this._logger);
    const versionsListContainer = this._versionsListArea.create();
    versionsListContainer.id = "versions-list-container";
    this._container.appendChild(versionsListContainer);

    // Set up versions list callbacks
    this._versionsListArea.setNavigateCallback((versionTag: string) => {
      this.navigateToVersion(versionTag);
    });
    this._versionsListArea.setHiliteToggleCallback((versionTag: string | null) => {
      this.toggleHilites(versionTag);
    });

    // Create version text area
    this._versionTextArea = new VersionTextArea(this._settings, this._logger);
    const versionTextContainer = this._versionTextArea.create();
    versionTextContainer.id = "version-text-container";
    this._container.appendChild(versionTextContainer);

    // Create details area
    this._detailsArea = new DetailsArea(this._settings, this._logger);
    const detailsContainer = this._detailsArea.create();
    detailsContainer.id = "details-container";
    this._container.appendChild(detailsContainer);

    // Create hilites manager
    this._hilites = new Hilites(
      this._logger,
      this._settings.hilitePadding,
      this._settings.hiliteFadeTime
    );

    this._shadow.appendChild(this._container);

    this._logger.debug("Component", "UI structure rendered");
  }

  /**
   * Render content (base text only - starts at v0).
   * Use goToVersionIndex() to navigate to specific versions.
   */
  private async renderContent(): Promise<void> {
    if (!this._textRenderer || !this._rootSvg || this._baseNodes.length === 0) {
      return;
    }

    this._logger.time("renderContent");
    this._logger.info("Rendering content");

    // Clear existing content
    this._rootSvg.innerHTML = "";
    this._boundsCache.clear();
    this._currentVersion = "v0";
    this._currentVersionIndex = 0;

    // Extract init features and render base text
    const charOffsets = this.extractCharOffsets();
    await this._textRenderer.renderBaseText(
      this._baseNodes,
      this._rootSvg,
      charOffsets
    );

    // NOTE: Do NOT process operations here!
    // Component starts at v0 (base text only)
    // Use toolbar or goToVersionIndex() to navigate to other versions

    // Initialize pan/zoom after SVG is ready
    this.initializePanZoom();

    // Initialize hilites with root SVG
    if (this._hilites) {
      this._hilites.setRootSvg(this._rootSvg as SVGSVGElement);
    }

    // Update versions list area with data
    if (this._versionsListArea && this._data) {
      this._versionsListArea.updateData(this._data);
      this._versionsListArea.updateCurrentVersion("v0");
    }

    // Update version text area with base text
    this.updateVersionText(0);

    // Update details area with base version
    this.updateDetailsArea(0);

    // Set up hover listeners on text elements
    this.setupTextElementHoverListeners();

    this._logger.timeEnd("renderContent");
    this._logger.info("Content rendering complete - showing v0 (base text)");
  }

  /**
   * Initialize pan/zoom functionality on the SVG element.
   * Enables mouse wheel zoom, click-and-drag pan, with configurable limits.
   */
  private initializePanZoom(): void {
    if (!this._rootSvg) {
      this._logger.warn("Cannot initialize pan/zoom - no root SVG");
      return;
    }

    // Don't reinitialize if already exists
    if (this._panZoomInstance) {
      this._logger.debug("Pan/zoom", "Already initialized, skipping");
      return;
    }

    this._panZoomInstance = svgPanZoom(this._rootSvg, {
      zoomEnabled: true,
      panEnabled: true,
      controlIconsEnabled: false, // We use toolbar controls
      fit: false, // Don't auto-fit (preserve layout)
      center: false, // Don't auto-center
      minZoom: this._settings.minZoom,
      maxZoom: this._settings.maxZoom,
      zoomScaleSensitivity: this._settings.zoomStep,
      dblClickZoomEnabled: false, // Disable double-click zoom to avoid conflicts
      mouseWheelZoomEnabled: true, // Enable mouse wheel zoom
      preventMouseEventsDefault: true, // Prevent default mouse events
      onZoom: (newZoom: number) => {
        // Update toolbar slider when zoom changes (e.g., via mouse wheel)
        if (this._toolbar) {
          this._toolbar.updateZoomLevel(newZoom);
        }
        this._logger.debug("Zoom", `Zoom changed to ${newZoom.toFixed(2)}x`);
      },
    });

    this._logger.info("Pan/zoom initialized", {
      minZoom: this._settings.minZoom,
      maxZoom: this._settings.maxZoom,
      zoomStep: this._settings.zoomStep,
    });

    // Update toolbar with initial zoom level
    if (this._toolbar) {
      const zoom = this._panZoomInstance.getZoom();
      this._toolbar.updateZoomLevel(zoom);
    }
  }

  /**
   * Process operations to render text transformations.
   * Processes operations in order, rendering hints and additional text.
   */
  private async processOperations(): Promise<void> {
    if (!this._data || !this._data.steps) {
      this._logger.warn("No operations to process");
      return;
    }

    this._logger.time("processOperations");
    this._logger.info(`Processing ${this._data.steps.length} operations`);

    for (const step of this._data.steps) {
      await this.processOperation(step);
    }

    this._logger.timeEnd("processOperations");
  }

  /**
   * Process a single operation step.
   */
  private async processOperation(
    step: ChainOperationContextStep
  ): Promise<void> {
    // Disable pan/zoom during rendering to ensure correct coordinate space
    this.disablePanZoom();

    try {
      await this.processOperationInternal(step);
    } finally {
      // Always re-enable pan/zoom, even if rendering fails
      this.enablePanZoom();
    }
  }

  /**
   * Internal operation processing (called with pan/zoom disabled).
   */
  private async processOperationInternal(
    step: ChainOperationContextStep
  ): Promise<void> {
    const operation = step.operation;
    this._logger.debug(
      "GveSnapshotRendition",
      `Processing operation ${operation.id} (type=${operation.type}, outputTag=${step.outputTag})`
    );

    // Fire versionTagChanging event
    // Use step.outputTag which is the correct version tag for this operation's result
    const versionTag = step.outputTag || `v${step.operation.run}`;
    this.dispatchEvent(
      new CustomEvent("versionTagChanging", {
        detail: { from: this._currentVersion, to: versionTag },
      })
    );

    // Get reference nodes (nodes affected by this operation)
    // Use refNodeIds from the step (populated from trace features)
    const refNodes = this.getReferenceNodes(step.refNodeIds);
    if (refNodes.length === 0) {
      this._logger.warn(
        `No reference nodes found for operation ${operation.id}`
      );
      // Still fire event even if no reference nodes
      this._currentVersion = versionTag;
      // Extract version index from tag (e.g., "v2" → 2)
      const versionMatch = versionTag.match(/v(\d+)/);
      this._currentVersionIndex = versionMatch ? parseInt(versionMatch[1]) : 0;
      this.dispatchEvent(
        new CustomEvent("versionTagChange", {
          detail: { from: this._currentVersion, to: versionTag },
        })
      );
      return;
    }

    // Resolve features to config
    // Pass node feature context so all node features (including "note", etc.) are available for placeholder resolution
    const config = this._featureResolver.resolve(
      this._settings,
      operation.features,
      undefined, // textBounds - calculate if needed
      {
        nodeFeatures: step.featureSet.nodeFeatures,
        outputTag: step.outputTag,
        refNodeIds: step.refNodeIds,
      }
    );

    // Render hints if specified
    if (
      config.hints &&
      config.hints.length > 0 &&
      this._hintRenderer &&
      this._rootSvg
    ) {
      await this.renderHints(
        config.hints,
        refNodes,
        config.hintVars || new Map(),
        operation.id || `op${operation.run}`,
        versionTag,
        config.hintOverrides
      );
    }

    // Render additional text if this operation added nodes
    const addedNodes = this.getAddedNodes(
      operation.id || `op${operation.run}`,
      step.outputTag
    );
    if (addedNodes.length > 0 && this._textRenderer && this._rootSvg) {
      await this._textRenderer.renderAdditionalText(
        addedNodes,
        this.getSvgContainer(), // Use viewport container, not root SVG
        config,
        versionTag,
        refNodes,
        this._baseNodes
      );
    }

    // Update current version
    this._currentVersion = versionTag;
    // Extract version index from tag (e.g., "v2" → 2)
    const versionMatch = versionTag.match(/v(\d+)/);
    this._currentVersionIndex = versionMatch ? parseInt(versionMatch[1]) : 0;

    // Fire versionTagChange event
    this.dispatchEvent(
      new CustomEvent("versionTagChange", {
        detail: {
          from: operation.inputTag || `v${operation.run - 1}`,
          to: versionTag,
        },
      })
    );
  }

  /**
   * Get reference nodes for an operation using node IDs from trace features.
   * Reference nodes are the nodes affected by the operation.
   *
   * @param nodeIds - Array of node IDs from step.refNodeIds (extracted from trace features)
   * @returns Array of CharNode objects matching the IDs
   */
  private getReferenceNodes(nodeIds: number[]): CharNode[] {
    if (!this._baseNodes || this._baseNodes.length === 0 || !nodeIds) return [];

    const nodes: CharNode[] = [];

    // Find nodes by their IDs
    for (const nodeId of nodeIds) {
      const node = this._baseNodes.find((n) => n.id === nodeId);
      if (node) {
        nodes.push(node);
      } else {
        this._logger.warn(
          "Navigation",
          `Node with ID ${nodeId} not found in base nodes`
        );
      }
    }

    return nodes;
  }

  /**
   * Get nodes added by a specific operation.
   * These are nodes with opid feature matching the operation ID.
   *
   * @param operationId - The operation ID to match
   * @param outputTag - The output version tag (e.g., "v3") where the nodes were added
   * @returns Array of nodes added by this operation
   */
  private getAddedNodes(operationId: string, outputTag: string): CharNode[] {
    if (!this._data || !this._data.taggedNodes) return [];

    // Get nodes from the output version
    const versionNodes = this._data.taggedNodes[outputTag];
    if (!versionNodes) return [];

    // Filter nodes that have opid feature matching this operation
    return versionNodes.filter((node) => {
      const opidFeature = node.features?.find((f) => f.name === "opid");
      return opidFeature && opidFeature.value === operationId;
    });
  }

  /**
   * Render hints for an operation.
   */
  private async renderHints(
    hintIds: string[],
    refNodes: CharNode[],
    hintVars: Map<string, string>,
    operationId: string,
    versionTag: string,
    hintOverrides?: Map<string, import("../rendering/feature-resolver").HintOverrides>
  ): Promise<void> {
    if (!this._hintRenderer || !this._rootSvg) return;

    for (let i = 0; i < hintIds.length; i++) {
      const hintId = hintIds[i];
      const hint = this._settings.hints[hintId];

      if (!hint) {
        this._logger.warn(`Hint not found: ${hintId}`);
        continue;
      }

      await this._hintRenderer.renderHint(
        hintId,
        hint,
        refNodes,
        this.getSvgContainer(), // Use viewport container, not root SVG
        hintVars,
        operationId,
        i + 1, // ordinal (1-based)
        this._baseNodes,
        versionTag,
        hintOverrides
      );
    }
  }

  /**
   * Navigate to a specific version index (0 = base text, 1+ = after operations).
   * Uses accumulation model: forward adds elements, backward removes them.
   */
  private async goToVersionIndex(targetIndex: number): Promise<void> {
    if (!this._data || !this._textRenderer || !this._rootSvg) return;

    this._logger.info(
      `Navigating from v${this._currentVersionIndex} to v${targetIndex}`
    );

    // Determine direction
    if (targetIndex === this._currentVersionIndex) {
      // Already at target
      return;
    }

    // Clear hilites before navigating
    if (this._hilites && this._hilites.hasActiveHilites()) {
      await this._hilites.clearHilites();
    }
    if (this._versionsListArea) {
      this._versionsListArea.clearHilites();
    }

    if (targetIndex > this._currentVersionIndex) {
      // FORWARD navigation: add elements
      await this.navigateForward(targetIndex);
    } else {
      // BACKWARD navigation: remove elements
      await this.navigateBackward(targetIndex);
    }

    // Update versions list area
    const versionTag = `v${targetIndex}`;
    if (this._versionsListArea) {
      this._versionsListArea.updateCurrentVersion(versionTag);
    }

    // Update toolbar
    if (this._toolbar) {
      this._toolbar.setCurrentIndex(targetIndex);
    }

    // Update version text area
    this.updateVersionText(targetIndex);

    // Update details area
    this.updateDetailsArea(targetIndex);

    // Re-setup hover listeners (new text elements may have been added)
    this.setupTextElementHoverListeners();
  }

  /**
   * Update the version text area with the current version's text.
   * @param versionIndex - The version index (0 = base text)
   */
  private updateVersionText(versionIndex: number): void {
    if (!this._versionTextArea || !this._data) return;

    let text = "";

    if (versionIndex === 0) {
      // For v0, use the base text
      text = this._baseNodes.map((node) => node.data).join("");
    } else if (
      this._data.steps &&
      versionIndex > 0 &&
      versionIndex <= this._data.steps.length
    ) {
      // For other versions, use the result from the corresponding step
      const step = this._data.steps[versionIndex - 1];
      text = step.result || "";
    }

    this._versionTextArea.updateText(text);
    this._logger.debug(
      "Component",
      `Updated version text for v${versionIndex} (${text.length} chars)`
    );
  }

  /**
   * Update the details area with the current version's information.
   * @param versionIndex - The version index (0 = base text)
   */
  private updateDetailsArea(versionIndex: number): void {
    if (!this._detailsArea || !this._data) return;

    const versionTag = `v${versionIndex}`;
    this._detailsArea.updateVersion(this._data, versionTag);

    this._logger.debug(
      "Component",
      `Updated details area for ${versionTag}`
    );
  }

  /**
   * Set up hover listeners on all text elements to update details area.
   */
  private setupTextElementHoverListeners(): void {
    if (!this._rootSvg || !this._detailsArea) return;

    // Remove existing hover listeners first by cloning and replacing elements
    // This prevents duplicate listeners from accumulating
    const textElements = this._rootSvg.querySelectorAll("text.node");

    textElements.forEach((textEl) => {
      const svgTextEl = textEl as SVGTextElement;

      // Clone the element to remove all event listeners
      const clonedEl = svgTextEl.cloneNode(true) as SVGTextElement;
      svgTextEl.parentNode?.replaceChild(clonedEl, svgTextEl);
    });

    // Now add fresh listeners to all text elements
    const freshTextElements = this._rootSvg.querySelectorAll("text.node");

    freshTextElements.forEach((textEl) => {
      const svgTextEl = textEl as SVGTextElement;

      // Add mouseenter event
      svgTextEl.addEventListener("mouseenter", () => {
        this.handleTextElementHover(svgTextEl);
      });

      // Add mouseleave event
      svgTextEl.addEventListener("mouseleave", () => {
        this.handleTextElementLeave();
      });
    });

    this._logger.debug(
      "Component",
      `Set up hover listeners on ${freshTextElements.length} text elements`
    );
  }

  /**
   * Handle hover over a text element.
   */
  private handleTextElementHover(textEl: SVGTextElement): void {
    if (!this._detailsArea || !this._rootSvg) return;

    // Extract node ID from the hovered element (format: "n_{nodeId}")
    const elementId = textEl.id;
    const match = elementId.match(/^n_(\d+)$/);
    if (!match) {
      this._logger.warn(`Cannot extract node ID from element ID: ${elementId}`);
      return;
    }

    const hoveredNodeId = parseInt(match[1], 10);

    // Search from current version backwards to find this specific node
    let foundElement: SVGTextElement | null = null;
    let foundNode: CharNode | null = null;

    for (let versionIdx = this._currentVersionIndex; versionIdx >= 0; versionIdx--) {
      const versionTag = `v${versionIdx}`;
      const versionClass = `version-${versionTag}`;

      // Look for this specific node in this version
      const elementInVersion = this._rootSvg.querySelector(
        `text.${versionClass}#n_${hoveredNodeId}`
      ) as SVGTextElement;

      if (elementInVersion) {
        // Found the element in this version, now get the node data
        // First try baseNodes (for original nodes)
        let node = this._baseNodes.find((n) => n.id === hoveredNodeId);

        // If not found in baseNodes, look in taggedNodes for this version (for added nodes)
        if (!node && this._data?.taggedNodes) {
          const versionNodes = this._data.taggedNodes[versionTag];
          if (versionNodes) {
            node = versionNodes.find((n) => n.id === hoveredNodeId);
          }
        }

        if (node) {
          foundElement = elementInVersion;
          foundNode = node;
          break; // Stop at first match (most recent version)
        }
      }
    }

    // Update details area with the found element
    if (foundElement && foundNode) {
      this._detailsArea.updateHoveredElements([{ element: foundElement, node: foundNode }]);
      this._logger.debug(
        "Component",
        `Hovered over node ${hoveredNodeId} in ${this._currentVersion}`
      );
    } else {
      this._logger.warn(`Node ${hoveredNodeId} not found in any version`);
    }
  }

  /**
   * Handle leaving a text element.
   */
  private handleTextElementLeave(): void {
    if (!this._detailsArea) return;

    // Clear hovered elements
    this._detailsArea.updateHoveredElements([]);
  }

  /**
   * Navigate forward by processing operations one by one.
   * Each operation adds hints and/or text that persist for all future versions.
   */
  private async navigateForward(targetIndex: number): Promise<void> {
    if (!this._data || !this._data.steps) return;

    // Process each operation from current+1 to target
    for (
      let i = this._currentVersionIndex;
      i < targetIndex && i < this._data.steps.length;
      i++
    ) {
      await this.processOperation(this._data.steps[i]);
    }

    this._currentVersionIndex = targetIndex;
  }

  /**
   * Navigate backward by removing elements added in later versions.
   * Reverses operations from current down to target.
   */
  private async navigateBackward(targetIndex: number): Promise<void> {
    if (!this._rootSvg) return;

    // Remove elements from each version going backward
    for (let i = this._currentVersionIndex; i > targetIndex; i--) {
      await this.removeVersionElements(i);
    }

    this._currentVersionIndex = targetIndex;

    // Update current version tag
    this._currentVersion = targetIndex === 0 ? "v0" : `v${targetIndex}`;
  }

  /**
   * Remove all elements belonging to a specific version.
   * Optionally fades them out before removal based on settings.
   */
  private async removeVersionElements(versionIndex: number): Promise<void> {
    if (!this._rootSvg || !this._animationEngine) return;

    const versionClass = `version-v${versionIndex}`;
    const container = this.getSvgContainer();
    const elements = Array.from(
      container.querySelectorAll(`.${versionClass}`)
    );

    if (elements.length === 0) {
      this._logger.debug("Navigation", `No elements found for ${versionClass}`);
      return;
    }

    this._logger.info(
      `Removing ${elements.length} elements from v${versionIndex}`
    );

    // Step 1: Reverse spreading animation if spreadTime > 0
    // This must happen BEFORE removing elements and BEFORE fadeout
    if (
      this._settings.spreadTime > 0 &&
      this._spreadingEngine &&
      this._animationEngine
    ) {
      const spreadingMetadata =
        this._spreadingEngine.getSpreadingForVersion(versionIndex);

      if (spreadingMetadata.size > 0) {
        this._logger.debug(
          "Navigation",
          `Reversing spreading for ${spreadingMetadata.size} elements from v${versionIndex}`
        );

        // Build combined shifts (negative of original shifts to reverse)
        const reverseShifts = new Map<string, { x: number; y: number }>();

        for (const [elementId, metadata] of spreadingMetadata.entries()) {
          reverseShifts.set(elementId, {
            x: -metadata.horizontalShift, // Negative to reverse
            y: -metadata.verticalShift, // Negative to reverse
          });
        }

        // Animate spreading reversal
        await this._animationEngine.animateSpreading(
          reverseShifts,
          this._settings.spreadTime,
          container // Use container for animation context
        );

        // Update cached bounds for shifted elements
        if (this._boundsCache) {
          for (const elementId of reverseShifts.keys()) {
            const element = container.querySelector(`#${elementId}`);
            if (element) {
              this._boundsCache.updateFromElement(element as SVGElement);
            }
          }
        }

        // Clear spreading history for this version
        this._spreadingEngine.clearSpreadingForVersion(versionIndex);
      }
    }

    // Step 2: If backwardFadeOutTime > 0, animate fadeout
    if (this._settings.backwardFadeOutTime > 0) {
      const fadeOutPromises: Promise<void>[] = [];

      elements.forEach((el) => {
        const promise = gsap.to(el, {
          opacity: 0,
          duration: this._settings.backwardFadeOutTime / 1000,
        });
        fadeOutPromises.push(promise as any);
      });

      await Promise.all(fadeOutPromises);
    }

    // Step 3: Remove elements from DOM
    elements.forEach((el) => el.remove());
  }

  /**
   * Extract char offsets from first operation if it's an annotate.
   */
  private extractCharOffsets():
    | Map<number, { x?: number; y?: number }>
    | undefined {
    if (this._data && this._data.steps.length > 0) {
      const firstOp = this._data.steps[0].operation;
      if (firstOp.type === 7) {
        // annotate
        return this._featureResolver.extractCharOffsets(firstOp.features);
      }
    }
    return undefined;
  }

  /**
   * Zoom in by configured step amount.
   */
  public zoomIn(): void {
    if (!this._panZoomInstance) {
      this._logger.warn("Cannot zoom in - pan/zoom not initialized");
      return;
    }
    this._panZoomInstance.zoomIn();
    this.updateToolbarZoom();
    this._logger.debug("Zoom", `Zoomed in to ${this._panZoomInstance.getZoom().toFixed(2)}x`);
  }

  /**
   * Zoom out by configured step amount.
   */
  public zoomOut(): void {
    if (!this._panZoomInstance) {
      this._logger.warn("Cannot zoom out - pan/zoom not initialized");
      return;
    }
    this._panZoomInstance.zoomOut();
    this.updateToolbarZoom();
    this._logger.debug("Zoom", `Zoomed out to ${this._panZoomInstance.getZoom().toFixed(2)}x`);
  }

  /**
   * Reset zoom to 100% and center pan.
   */
  public resetZoom(): void {
    if (!this._panZoomInstance) {
      this._logger.warn("Cannot reset zoom - pan/zoom not initialized");
      return;
    }
    this._panZoomInstance.resetZoom();
    this._panZoomInstance.resetPan();
    this.updateToolbarZoom();
    this._logger.info("Zoom reset to 100%");
  }

  /**
   * Set zoom to specific level (1.0 = 100%).
   */
  public setZoom(zoomLevel: number): void {
    if (!this._panZoomInstance) {
      this._logger.warn("Cannot set zoom - pan/zoom not initialized");
      return;
    }
    // Clamp to min/max
    const clampedZoom = Math.max(
      this._settings.minZoom,
      Math.min(this._settings.maxZoom, zoomLevel)
    );
    this._panZoomInstance.zoom(clampedZoom);
    this.updateToolbarZoom();
    this._logger.debug("Zoom", `Set zoom to ${clampedZoom.toFixed(2)}x`);
  }

  /**
   * Get current zoom level.
   */
  public getZoom(): number {
    if (!this._panZoomInstance) return 1.0;
    return this._panZoomInstance.getZoom();
  }

  /**
   * Update toolbar with current zoom level.
   */
  private updateToolbarZoom(): void {
    if (!this._toolbar || !this._panZoomInstance) return;
    const zoom = this._panZoomInstance.getZoom();
    this._toolbar.updateZoomLevel(zoom);
  }

  /**
   * Setup keyboard shortcuts for navigation and zoom.
   * Shortcuts:
   * - ArrowLeft/ArrowRight: Previous/Next version
   * - Home/End: First/Last version
   * - 0-9: Jump to version 0-9
   * - +/-: Zoom in/out
   */
  private setupKeyboardShortcuts(): void {
    this._keyboardHandler = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          if (this._currentVersionIndex > 0) {
            this.goToVersionIndex(this._currentVersionIndex - 1);
          }
          break;

        case "ArrowRight":
          e.preventDefault();
          if (
            this._data &&
            this._currentVersionIndex < this._data.steps.length
          ) {
            this.goToVersionIndex(this._currentVersionIndex + 1);
          }
          break;

        case "Home":
          e.preventDefault();
          this.goToVersionIndex(0);
          break;

        case "End":
          e.preventDefault();
          if (this._data) {
            this.goToVersionIndex(this._data.steps.length);
          }
          break;

        case "+":
        case "=":
          e.preventDefault();
          this.zoomIn();
          break;

        case "-":
        case "_":
          e.preventDefault();
          this.zoomOut();
          break;

        case "0":
          // Handle Ctrl+0 or Cmd+0 for reset zoom
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.resetZoom();
          } else {
            // Navigate to version 0
            e.preventDefault();
            this.goToVersionIndex(0);
          }
          break;

        default:
          // Handle number keys 1-9 for quick version navigation
          if (e.key >= "1" && e.key <= "9" && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            const versionIndex = parseInt(e.key);
            if (this._data && versionIndex <= this._data.steps.length) {
              this.goToVersionIndex(versionIndex);
            }
          }
          break;
      }
    };

    document.addEventListener("keydown", this._keyboardHandler);
    this._logger.info("Keyboard shortcuts enabled");
  }

  /**
   * Get the SVG element where content should be appended.
   * When pan/zoom is active, returns the transformed viewport group.
   * When pan/zoom is inactive, returns the root SVG.
   *
   * CRITICAL: svg-pan-zoom wraps content in a <g> element. New elements
   * must be added to this group, not the root SVG, or they won't transform.
   */
  private getSvgContainer(): SVGElement {
    if (!this._rootSvg) {
      throw new Error("Root SVG not initialized");
    }

    // If pan/zoom is active, get the viewport element (the transformed <g>)
    if (this._panZoomInstance) {
      // svg-pan-zoom creates a <g> with id containing 'viewport'
      // Try to find it, fall back to rootSvg if not found
      const viewport = this._rootSvg.querySelector('g[id*="viewport"]') as SVGGElement;
      if (viewport) {
        return viewport;
      }

      // Alternative: get first <g> child (svg-pan-zoom's wrapper)
      const firstG = this._rootSvg.querySelector('g') as SVGGElement;
      if (firstG) {
        return firstG;
      }
    }

    // No pan/zoom or viewport not found - use root SVG
    return this._rootSvg;
  }

  /**
   * Temporarily disable pan/zoom for rendering operations.
   * CRITICAL: Disables user input but preserves viewport transform.
   */
  private disablePanZoom(): void {
    if (!this._panZoomInstance) return;
    this._panZoomInstance.disablePan();
    this._panZoomInstance.disableZoom();
  }

  /**
   * Re-enable pan/zoom after rendering operations complete.
   */
  private enablePanZoom(): void {
    if (!this._panZoomInstance) return;
    this._panZoomInstance.enablePan();
    this._panZoomInstance.enableZoom();
  }

  /**
   * Navigate to a specific version by tag.
   * @param versionTag - Version tag (e.g., "v0", "v1")
   */
  private async navigateToVersion(versionTag: string): Promise<void> {
    if (!this._data) return;

    // Extract version index from tag
    const match = versionTag.match(/^v(\d+)$/);
    if (!match) {
      this._logger.warn("Component", `Invalid version tag: ${versionTag}`);
      return;
    }

    const versionIndex = parseInt(match[1], 10);
    await this.goToVersionIndex(versionIndex);
  }

  /**
   * Toggle hilites for a specific version.
   * @param versionTag - Version tag to hilite, or null to clear hilites
   */
  private async toggleHilites(versionTag: string | null): Promise<void> {
    if (!this._hilites || !this._data) return;

    if (versionTag === null) {
      // Clear hilites
      await this._hilites.clearHilites();
      this._logger.debug("Component", "Cleared hilites");
    } else {
      // Show hilites for the version
      const color = this._versionsListArea?.getVersionColor(versionTag) || "#FFE4E1";
      await this._hilites.showHilites(this._data, versionTag, color);
      this._logger.debug("Component", `Showing hilites for ${versionTag}`);
    }
  }

  /**
   * Get component styles.
   */
  private getStyles(): string {
    return `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }

      .gve-container {
        width: 100%;
        height: 100%;
        overflow: hidden;
        display: grid;
        grid-template-columns: auto 1fr;
        grid-template-rows: auto 1fr auto;
        grid-template-areas:
          "toolbar toolbar"
          "versions-list text-rendition"
          "version-text details";
      }

      /* Responsive layout: stack vertically on small screens */
      @media (max-width: 1024px) {
        .gve-container {
          grid-template-columns: 1fr;
          grid-template-rows: auto auto auto auto auto;
          grid-template-areas:
            "toolbar"
            "text-rendition"
            "versions-list"
            "version-text"
            "details";
        }
      }

      #toolbar-container {
        grid-area: toolbar;
      }

      .toolbar {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        padding: 0.5rem 1rem;
        background: var(--gve-toolbar-bg, #f5f5f5);
        border-bottom: 1px solid var(--gve-border-color, #ddd);
        flex-shrink: 0;
      }

      .toolbar-btn {
        padding: 0.5rem 1rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        font-size: 14px;
        font-family: inherit;
        transition: all 0.2s ease;
      }

      .toolbar-btn:hover:not(:disabled) {
        background: #e9e9e9;
        border-color: #999;
      }

      .toolbar-btn:active:not(:disabled) {
        background: #ddd;
      }

      .toolbar-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background: #f5f5f5;
      }

      .version-label {
        font-family: monospace;
        font-size: 16px;
        font-weight: bold;
        padding: 0.5rem 1rem;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        min-width: 60px;
        text-align: center;
      }

      .gve-text-rendition {
        grid-area: text-rendition;
        background: var(--gve-bg-color, #fafafa);
        border: 1px solid var(--gve-border-color, #ddd);
        overflow: hidden;
      }

      .node {
        cursor: pointer;
      }

      .node:hover {
        opacity: 0.7;
      }

      /* Version Text Area */
      #version-text-container {
        grid-area: version-text;
      }

      .version-text-area {
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        background: var(--gve-text-pane-bg, #fff);
        border-top: 1px solid var(--gve-border-color, #ddd);
        border-bottom: 1px solid var(--gve-border-color, #ddd);
        max-height: 500px;
        height: 500px;
        position: relative;
      }

      .version-text-area.collapsed {
        height: auto !important;
        max-height: none !important;
      }

      .version-text-area.collapsed .version-text-content {
        max-height: 0;
        overflow: hidden;
      }

      .version-text-area.collapsed .version-text-resize-handle {
        display: none;
      }

      .version-text-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 1rem;
        background: var(--gve-text-pane-header-bg, #f9f9f9);
        border-bottom: 1px solid var(--gve-border-color, #ddd);
      }

      .version-text-title {
        font-weight: bold;
        font-size: 14px;
        color: var(--gve-text-color, #333);
      }

      .version-text-toolbar {
        display: flex;
        gap: 0.5rem;
      }

      .version-text-content {
        flex: 1;
        overflow: auto;
        transition: max-height 0.3s ease;
        min-height: 0;
      }

      .version-text {
        width: 100%;
        min-height: 100%;
        padding: 1rem;
        border: none;
        resize: none;
        font-family: var(--gve-text-pane-font-family, monospace);
        font-size: var(--gve-text-pane-font-size, 14px);
        line-height: 1.5;
        color: var(--gve-text-color, #333);
        background: transparent;
        white-space: pre-wrap;
        box-sizing: border-box;
      }

      .version-text:focus {
        outline: none;
      }

      .version-text::placeholder {
        color: var(--gve-placeholder-color, #999);
        font-style: italic;
      }

      .version-text-resize-handle {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 6px;
        cursor: ns-resize;
        background: transparent;
        transition: background-color 0.2s ease;
      }

      .version-text-resize-handle:hover {
        background-color: var(--gve-border-color, #ddd);
      }

      /* Versions List Area */
      #versions-list-container {
        grid-area: versions-list;
      }

      .versions-list-area {
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        background: var(--gve-versions-list-bg, #fff);
        border-right: 1px solid var(--gve-border-color, #ddd);
        max-width: 250px;
        min-width: 200px;
        width: 250px;
      }

      .versions-list-area.collapsed {
        width: auto !important;
        max-width: none !important;
      }

      .versions-list-area.collapsed .versions-list-content {
        display: none;
      }

      .versions-list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 1rem;
        background: var(--gve-versions-list-header-bg, #f5f5f5);
        border-bottom: 1px solid var(--gve-border-color, #ddd);
        flex-shrink: 0;
      }

      .versions-list-title {
        font-weight: bold;
        font-size: 14px;
        color: var(--gve-text-color, #333);
      }

      .versions-list-toolbar {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }

      .versions-checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 12px;
        cursor: pointer;
      }

      .versions-checkbox-label input[type="checkbox"]:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }

      .versions-list-content {
        flex: 1;
        overflow-y: auto;
        padding: 0.5rem;
      }

      .versions-list-items {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .version-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.25rem 0;
      }

      .version-item.indented {
        padding-left: 1.5rem;
      }

      .version-item.active .version-link {
        font-weight: bold;
        border: 2px solid var(--gve-primary-color, #007bff);
      }

      .version-item.hilited .version-link {
        box-shadow: 0 0 0 2px var(--gve-hilite-ring, rgba(0, 123, 255, 0.5));
      }

      .version-nav-btn {
        background: var(--gve-button-bg, #fff);
        border: 1px solid var(--gve-border-color, #ddd);
        border-radius: 3px;
        padding: 0.2rem 0.4rem;
        font-size: 12px;
        cursor: pointer;
        color: var(--gve-text-color, #333);
        min-width: 24px;
      }

      .version-nav-btn:hover:not(:disabled) {
        background: var(--gve-button-hover-bg, #f5f5f5);
      }

      .version-nav-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .version-link {
        flex: 1;
        padding: 0.4rem 0.6rem;
        border-radius: 4px;
        text-decoration: none;
        color: var(--gve-text-color, #333);
        font-size: 13px;
        border: 1px solid transparent;
        transition: all 0.2s;
      }

      .version-link:not(.disabled):hover {
        border-color: var(--gve-border-color, #ddd);
        text-decoration: underline;
      }

      .version-link.disabled {
        cursor: default;
        opacity: 0.6;
      }

      .version-group-badge {
        display: inline-block;
        padding: 0.1rem 0.4rem;
        background: var(--gve-badge-bg, #e9ecef);
        border: 1px solid var(--gve-border-color, #ddd);
        border-radius: 3px;
        font-size: 11px;
        font-weight: normal;
        color: var(--gve-badge-text, #666);
      }

      /* Details Area */
      #details-container {
        grid-area: details;
      }

      .details-area {
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        background: var(--gve-details-bg, #fff);
        border-top: 1px solid var(--gve-border-color, #ddd);
        border-bottom: 1px solid var(--gve-border-color, #ddd);
        max-height: 400px;
        height: 400px;
        position: relative;
      }

      .details-area.collapsed {
        height: auto !important;
        max-height: none !important;
      }

      .details-area.collapsed .details-content {
        max-height: 0;
        overflow: hidden;
      }

      .details-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 1rem;
        background: var(--gve-details-header-bg, #f5f5f5);
        border-bottom: 1px solid var(--gve-border-color, #ddd);
      }

      .details-title {
        font-weight: bold;
        font-size: 14px;
        color: var(--gve-text-color, #333);
      }

      .details-toolbar {
        display: flex;
        gap: 1rem;
        align-items: center;
      }

      .details-checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 12px;
        color: var(--gve-text-color, #333);
        cursor: pointer;
      }

      .details-checkbox-label input[type="checkbox"] {
        cursor: pointer;
      }

      .details-content {
        flex: 1;
        overflow: auto;
        padding: 0.5rem;
        transition: max-height 0.3s ease;
        min-height: 0;
      }

      .details-fieldset {
        margin: 0.5rem 0;
        padding: 0.5rem;
        border: 1px solid var(--gve-border-color, #ddd);
        border-radius: 4px;
        background: var(--gve-details-section-bg, #fafafa);
      }

      .details-fieldset legend {
        font-weight: bold;
        font-size: 12px;
        color: var(--gve-text-color, #333);
        padding: 0 0.3rem;
      }

      .operation-fieldset {
        background: var(--gve-operation-section-bg, #fff9e6);
      }

      .version-fieldset {
        background: var(--gve-version-section-bg, #e6f7ff);
      }

      .operation-summary {
        padding: 0.3rem 0;
        font-size: 13px;
        color: var(--gve-text-color, #333);
        font-family: monospace;
        word-wrap: break-word;
      }

      .operation-features,
      .version-features {
        margin-top: 0.5rem;
      }

      .feature-list {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }

      .feature-item {
        font-size: 11px;
        padding: 0.2rem 0.3rem;
        background: var(--gve-feature-bg, #fff);
        border-radius: 2px;
        border: 1px solid var(--gve-feature-border, #e0e0e0);
      }

      .feature-name {
        font-weight: bold;
        color: var(--gve-feature-name-color, #0066cc);
      }

      .feature-value {
        color: var(--gve-feature-value-color, #333);
        font-family: monospace;
      }

      .no-features {
        font-size: 11px;
        color: var(--gve-placeholder-color, #999);
        font-style: italic;
        padding: 0.3rem;
      }

      .details-hovered-section {
        margin-top: 0.5rem;
      }

      .hovered-element-container {
        display: flex;
        gap: 0.5rem;
        align-items: flex-start;
        padding: 0.5rem;
        margin-bottom: 0.5rem;
        background: var(--gve-hovered-element-bg, #f0f0f0);
        border: 1px solid var(--gve-border-color, #ddd);
        border-radius: 4px;
      }

      .hovered-glyph-svg {
        flex-shrink: 0;
        border: 1px solid var(--gve-border-color, #ddd);
        background: var(--gve-glyph-bg, #fff);
      }

      .hovered-features {
        flex: 1;
        min-width: 0;
      }
    `;
  }
}

// Register the custom element
customElements.define("gve-snapshot-rendition", GveSnapshotRendition);
