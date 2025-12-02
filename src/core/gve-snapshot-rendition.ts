import { CharChainResult, CharNode } from "../models";
import { GveRenditionSettings, DEFAULT_SETTINGS } from "../settings/settings";
import { Logger } from "./logger";
import { AnimationEngine } from "../animation/animation-engine";
import { BoundsCache } from "../rendering/bounds-cache";
import { SpreadingEngine } from "../rendering/spreading-engine";
import { TextRenderer } from "../rendering/text-renderer";
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
  private featureResolver: FeatureResolver;

  // UI elements
  private shadow: ShadowRoot;
  private rootSvg?: SVGElement;
  private container?: HTMLElement;

  // State
  private baseNodes: CharNode[] = [];
  private versionPalette: Map<string, string> = new Map();

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
        this.boundsCache
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

    this.logger.info("Rendering content");

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

    this.logger.info("Content rendering complete");
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
