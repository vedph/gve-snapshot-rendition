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

  // State
  private _baseNodes: CharNode[] = [];
  private _versionPalette: Map<string, string> = new Map();
  private _currentVersion: string = "v0";

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
  static get observedAttributes(): string[] {
    return ["version-tag"];
  }

  /**
   * Called when component is added to the DOM.
   */
  connectedCallback(): void {
    this._logger.info("Component connected to DOM");
    this.render();
    this.initializeGsap();
  }

  /**
   * Called when component is removed from the DOM.
   */
  disconnectedCallback(): void {
    this._logger.info("Component disconnected from DOM");
    if (this._animationEngine) {
      this._animationEngine.killAll();
    }
  }

  /**
   * Called when observed attributes change.
   */
  attributeChangedCallback(
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
  get settings(): GveRenditionSettings {
    return this._settings;
  }

  set settings(value: GveRenditionSettings) {
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
  get data(): CharChainResult | undefined {
    return this._data;
  }

  set data(value: CharChainResult | undefined) {
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
  get versionTag(): string | undefined {
    return this._versionTag;
  }

  set versionTag(value: string | undefined) {
    this._versionTag = value;
    this.navigateToVersion(value);
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

    this._logger.timeEnd("renderContent");
    this._logger.info("Content rendering complete - showing v0 (base text)");
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
    const operation = step.operation;
    this._logger.debug(
      "GveSnapshotRendition",
      `Processing operation ${operation.id} (type=${operation.type}, outputTag=${operation.outputTag})`
    );

    // Fire versionTagChanging event
    const versionTag = operation.outputTag || `v${step.operation.run}`;
    this.dispatchEvent(
      new CustomEvent("versionTagChanging", {
        detail: { from: this._currentVersion, to: versionTag },
      })
    );

    // Get reference nodes (nodes affected by this operation)
    const refNodes = this.getReferenceNodes(operation);
    if (refNodes.length === 0) {
      this._logger.warn(
        `No reference nodes found for operation ${operation.id}`
      );
      // Still fire event even if no reference nodes
      this._currentVersion = versionTag;
      this.dispatchEvent(
        new CustomEvent("versionTagChange", {
          detail: { from: this._currentVersion, to: versionTag },
        })
      );
      return;
    }

    // Resolve features to config
    const config = this._featureResolver.resolve(
      this._settings,
      operation.features,
      undefined // textBounds - calculate if needed
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
        operation.id || `op${operation.run}`
      );
    }

    // Render additional text if this operation added nodes
    const addedNodes = this.getAddedNodes(operation.id || `op${operation.run}`);
    if (addedNodes.length > 0 && this._textRenderer && this._rootSvg) {
      await this._textRenderer.renderAdditionalText(
        addedNodes,
        this._rootSvg,
        config,
        versionTag,
        refNodes,
        this._baseNodes
      );
    }

    // Update current version
    this._currentVersion = versionTag;

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
   * Get reference nodes for an operation.
   * Reference nodes are the nodes affected by the operation.
   */
  private getReferenceNodes(operation: any): CharNode[] {
    if (!this._baseNodes || this._baseNodes.length === 0) return [];

    // For operations with 'from' and 'to' (like delete, move, copy)
    // Return all nodes in the range
    if (
      typeof operation.from === "number" &&
      typeof operation.to === "number"
    ) {
      const fromIndex = operation.fromAsIndex
        ? operation.from
        : operation.from - 1;
      const toIndex = operation.toAsIndex ? operation.to : operation.to - 1;

      const nodes: CharNode[] = [];
      for (let i = fromIndex; i <= toIndex; i++) {
        if (i >= 0 && i < this._baseNodes.length) {
          nodes.push(this._baseNodes[i]);
        }
      }
      return nodes;
    }

    // For operations with 'at' position (like insert, replace)
    if (typeof operation.at === "number") {
      const index = operation.atAsIndex ? operation.at : operation.at - 1;

      const node = this._baseNodes[index];
      if (node) {
        return [node];
      }
    }

    return [];
  }

  /**
   * Get nodes added by a specific operation.
   * These are nodes with opid feature matching the operation ID.
   */
  private getAddedNodes(operationId: string): CharNode[] {
    if (!this._baseNodes) return [];

    return this._baseNodes.filter((node) => {
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
    operationId: string
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
        this._rootSvg,
        hintVars,
        operationId,
        i + 1, // ordinal (1-based)
        this._baseNodes
      );
    }
  }

  /**
   * Navigate to a specific version index (0 = base text, 1+ = after operations).
   */
  private async goToVersionIndex(targetIndex: number): Promise<void> {
    if (!this._data || !this._textRenderer || !this._rootSvg) return;

    this._logger.info(`Navigating to version index ${targetIndex}`);

    // Clear and reset
    this._rootSvg.innerHTML = "";
    this._boundsCache.clear();
    this._currentVersion = "v0";

    // Render base text
    const charOffsets = this.extractCharOffsets();
    await this._textRenderer.renderBaseText(
      this._baseNodes,
      this._rootSvg,
      charOffsets
    );

    // Process operations up to target index
    if (targetIndex > 0 && this._data.steps) {
      for (let i = 0; i < targetIndex && i < this._data.steps.length; i++) {
        await this.processOperation(this._data.steps[i]);
      }
    }

    // Update toolbar
    if (this._toolbar) {
      this._toolbar.setCurrentIndex(targetIndex);
    }
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
   * Navigate to a specific version.
   */
  private async navigateToVersion(
    versionTag: string | undefined
  ): Promise<void> {
    if (!versionTag) return;
    this._logger.info(`Navigating to version: ${versionTag}`);
    // TODO: Implement version navigation by tag
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
        display: flex;
        flex-direction: column;
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
        flex: 1;
        background: var(--gve-bg-color, #fafafa);
        border: 1px solid var(--gve-border-color, #ddd);
      }

      .node {
        cursor: pointer;
      }

      .node:hover {
        opacity: 0.7;
      }
    `;
  }
}

// Register the custom element
customElements.define("gve-snapshot-rendition", GveSnapshotRendition);
