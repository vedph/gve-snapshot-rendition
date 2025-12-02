import { CharChainResult, CharNode, ChainOperationContextStep } from "../models";
import { GveRenditionSettings, DEFAULT_SETTINGS } from "../settings/settings";
import { Logger } from "./logger";
import { AnimationEngine } from "../animation/animation-engine";
import { BoundsCache } from "../rendering/bounds-cache";
import { SpreadingEngine } from "../rendering/spreading-engine";
import { TextRenderer } from "../rendering/text-renderer";
import { HintRenderer } from "../rendering/hint-renderer";
import { FeatureResolver } from "../rendering/feature-resolver";
import { stringToNodes } from "../utils/node-utils";
import { generateVersionPalette } from "../utils/color-palette";

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
  private logger: Logger;
  private animationEngine?: AnimationEngine;
  private boundsCache: BoundsCache;
  private spreadingEngine: SpreadingEngine;
  private textRenderer?: TextRenderer;
  private hintRenderer?: HintRenderer;
  private featureResolver: FeatureResolver;

  // UI elements
  private shadow: ShadowRoot;
  private rootSvg?: SVGElement;
  private container?: HTMLElement;

  // State
  private baseNodes: CharNode[] = [];
  private versionPalette: Map<string, string> = new Map();
  private currentVersion: string = "v0";

  constructor() {
    super();

    // Initialize with default settings
    this._settings = { ...DEFAULT_SETTINGS };

    // Create logger
    this.logger = new Logger("GVE-Rendition", this._settings.debug);

    // Create bounds cache and spreading engine
    this.boundsCache = new BoundsCache(this.logger);
    this.spreadingEngine = new SpreadingEngine(this.boundsCache, this.logger);

    // Create feature resolver
    this.featureResolver = new FeatureResolver(this.logger);

    // Create shadow DOM
    this.shadow = this.attachShadow({ mode: "open" });

    this.logger.info("GveSnapshotRendition component created");
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
    this.logger.info("Component connected to DOM");
    this.render();
    this.initializeGsap();
  }

  /**
   * Called when component is removed from the DOM.
   */
  disconnectedCallback(): void {
    this.logger.info("Component disconnected from DOM");
    if (this.animationEngine) {
      this.animationEngine.killAll();
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
    this.logger.setEnabled(this._settings.debug || false);
    this.logger.info("Settings updated");
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
    this.logger.info("Data updated", value);
    this.processData();
    this.render();
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
      this.animationEngine = new AnimationEngine(gsap, this.logger);
      this.textRenderer = new TextRenderer(
        this._settings,
        this.logger,
        this.animationEngine,
        this.boundsCache,
        this.spreadingEngine
      );
      this.hintRenderer = new HintRenderer(
        this._settings,
        this.logger,
        this.animationEngine,
        this.boundsCache,
        this.spreadingEngine
      );
      this.logger.info("GSAP initialized");
      this.renderContent();
    } else {
      this.logger.warn("GSAP not available. Please include GSAP library.");
    }
  }

  /**
   * Process data to prepare for rendering.
   */
  private processData(): void {
    if (!this._data) return;

    // Convert text to nodes if it's a string
    if (typeof this._data.text === "string") {
      this.baseNodes = stringToNodes(this._data.text);
    } else if (Array.isArray(this._data.text)) {
      this.baseNodes = this._data.text;
    }

    // Generate version color palette
    this.versionPalette = generateVersionPalette(this._data.chainTags);

    this.logger.info(
      `Processed data: ${this.baseNodes.length} base nodes, ${this._data.steps.length} steps`
    );
  }

  /**
   * Render the component UI.
   */
  private render(): void {
    this.shadow.innerHTML = "";

    // Add styles
    const style = document.createElement("style");
    style.textContent = this.getStyles();
    this.shadow.appendChild(style);

    // Create container
    this.container = document.createElement("div");
    this.container.className = "gve-container";

    // Create SVG root
    this.rootSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    this.rootSvg.setAttribute("class", "gve-text-rendition");
    this.rootSvg.setAttribute("width", "100%");
    this.rootSvg.setAttribute("height", "600px");

    this.container.appendChild(this.rootSvg);
    this.shadow.appendChild(this.container);

    this.logger.debug("Component", "UI structure rendered");
  }

  /**
   * Render content (base text and operations).
   */
  private async renderContent(): Promise<void> {
    if (!this.textRenderer || !this.rootSvg || this.baseNodes.length === 0) {
      return;
    }

    this.logger.time("renderContent");
    this.logger.info("Rendering content");

    // Clear existing content
    this.rootSvg.innerHTML = "";
    this.boundsCache.clear();
    this.currentVersion = "v0";

    // Extract init features (from first operation if it's an annotate)
    let charOffsets: Map<number, { x?: number; y?: number }> | undefined;
    if (this._data && this._data.steps.length > 0) {
      const firstOp = this._data.steps[0].operation;
      if (firstOp.type === 7) {
        // annotate
        charOffsets = this.featureResolver.extractCharOffsets(firstOp.features);
      }
    }

    // Render base text
    await this.textRenderer.renderBaseText(
      this.baseNodes,
      this.rootSvg,
      charOffsets
    );

    // Process operations
    if (this._data && this._data.steps && this._data.steps.length > 0) {
      await this.processOperations();
    }

    this.logger.timeEnd("renderContent");
    this.logger.info("Content rendering complete");
  }

  /**
   * Process operations to render text transformations.
   * Processes operations in order, rendering hints and additional text.
   */
  private async processOperations(): Promise<void> {
    if (!this._data || !this._data.steps) {
      this.logger.warn("No operations to process");
      return;
    }

    this.logger.time("processOperations");
    this.logger.info(`Processing ${this._data.steps.length} operations`);

    for (const step of this._data.steps) {
      await this.processOperation(step);
    }

    this.logger.timeEnd("processOperations");
  }

  /**
   * Process a single operation step.
   */
  private async processOperation(step: ChainOperationContextStep): Promise<void> {
    const operation = step.operation;
    this.logger.debug(
      "GveSnapshotRendition",
      `Processing operation ${operation.id} (type=${operation.type}, outputTag=${operation.outputTag})`
    );

    // Fire versionTagChanging event
    const versionTag = operation.outputTag || `v${step.operation.run}`;
    this.dispatchEvent(
      new CustomEvent("versionTagChanging", {
        detail: { from: this.currentVersion, to: versionTag },
      })
    );

    // Get reference nodes (nodes affected by this operation)
    const refNodes = this.getReferenceNodes(operation);
    if (refNodes.length === 0) {
      this.logger.warn(
        `No reference nodes found for operation ${operation.id}`
      );
      // Still fire event even if no reference nodes
      this.currentVersion = versionTag;
      this.dispatchEvent(
        new CustomEvent("versionTagChange", {
          detail: { from: this.currentVersion, to: versionTag },
        })
      );
      return;
    }

    // Resolve features to config
    const config = this.featureResolver.resolve(
      this._settings,
      operation.features,
      undefined // textBounds - calculate if needed
    );

    // Render hints if specified
    if (config.hints && config.hints.length > 0 && this.hintRenderer && this.rootSvg) {
      await this.renderHints(
        config.hints,
        refNodes,
        config.hintVars || new Map(),
        operation.id || `op${operation.run}`
      );
    }

    // Render additional text if this operation added nodes
    const addedNodes = this.getAddedNodes(operation.id || `op${operation.run}`);
    if (addedNodes.length > 0 && this.textRenderer && this.rootSvg) {
      await this.textRenderer.renderAdditionalText(
        addedNodes,
        this.rootSvg,
        config,
        versionTag,
        refNodes,
        this.baseNodes
      );
    }

    // Update current version
    this.currentVersion = versionTag;

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
   * Reference nodes are the nodes at the operation's position.
   */
  private getReferenceNodes(operation: any): CharNode[] {
    if (!this.baseNodes || this.baseNodes.length === 0) return [];

    // For operations with 'at' position
    if (typeof operation.at === "number") {
      const index = operation.atAsIndex ? operation.at : operation.at - 1;

      // Get nodes around the operation position
      // For most operations, we want the node at 'at' position
      const node = this.baseNodes[index];
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
    if (!this.baseNodes) return [];

    return this.baseNodes.filter((node) => {
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
    if (!this.hintRenderer || !this.rootSvg) return;

    for (let i = 0; i < hintIds.length; i++) {
      const hintId = hintIds[i];
      const hint = this._settings.hints[hintId];

      if (!hint) {
        this.logger.warn(`Hint not found: ${hintId}`);
        continue;
      }

      await this.hintRenderer.renderHint(
        hintId,
        hint,
        refNodes,
        this.rootSvg,
        hintVars,
        operationId,
        i + 1, // ordinal (1-based)
        this.baseNodes
      );
    }
  }

  /**
   * Navigate to a specific version.
   */
  private async navigateToVersion(
    versionTag: string | undefined
  ): Promise<void> {
    if (!versionTag) return;
    this.logger.info(`Navigating to version: ${versionTag}`);
    // TODO: Implement version navigation
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
      }

      .gve-text-rendition {
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
