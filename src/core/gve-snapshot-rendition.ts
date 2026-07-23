import {
  CharChainResult,
  CharNode,
  ChainOperationContextStep,
} from "../models";
import { GveRenditionSettings, DEFAULT_SETTINGS } from "../settings/settings";
import { Logger } from "./logger";
import { AnimationEngine } from "../animation/animation-engine";
import { BoundsCache } from "../rendering/bounds-cache";
import { TextRenderer } from "../rendering/text-renderer";
import { HintRenderer } from "../rendering/hint-renderer";
import { FeatureResolver, RenditionConfig } from "../rendering/feature-resolver";
import { Toolbar } from "../ui/toolbar";
import { VersionTextArea } from "../ui/version-text-area";
import { DetailsArea } from "../ui/details-area";
import { VersionsListArea } from "../ui/versions-list-area";
import { Hilites } from "../ui/hilites";

// External libraries
import svgPanZoom from "svg-pan-zoom";
type SvgPanZoomInstance = ReturnType<typeof svgPanZoom>;
import gsap from "gsap";
import {
  GoldenLayout,
  LayoutConfig,
  ComponentContainer,
} from "golden-layout";
import { GOLDEN_LAYOUT_CSS } from "../layout/golden-layout-styles";

/**
 * Relative position for elements (hints and additional text) with respect to the RBR.
 * Specifies how the EBR (Element Bounding Rectangle) aligns with the RBR (Reference Bounding Rectangle).
 */
export type RelativePosition =
  // Outside positions - EBR positioned outside RBR
  | "n" // North: EBR-bottom aligned with RBR-top, horizontally centered
  | "ne" // Northeast: EBR-bottom-left corner aligned with RBR-top-right corner
  | "e" // East: EBR-left aligned with RBR-right, vertically centered
  | "se" // Southeast: EBR-top-left corner aligned with RBR-bottom-right corner
  | "s" // South: EBR-top aligned with RBR-bottom, horizontally centered
  | "sw" // Southwest: EBR-top-right corner aligned with RBR-bottom-left corner
  | "w" // West: EBR-right aligned with RBR-left, vertically centered
  | "nw" // Northwest: EBR-bottom-right corner aligned with RBR-top-left corner
  // Inside positions - EBR positioned inside RBR
  | "inw" // Inside Northwest: EBR-top-left corner aligned with RBR-top-left corner
  | "ine" // Inside Northeast: EBR-top-right corner aligned with RBR-top-right corner
  | "isw" // Inside Southwest: EBR-bottom-left corner aligned with RBR-bottom-left corner
  | "ise" // Inside Southeast: EBR-bottom-right corner aligned with RBR-bottom-right corner
  | "o"; // Origin: EBR center aligned with RBR center

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

  // Golden Layout instance and pre-built panel elements
  private _goldenLayout?: GoldenLayout;
  private _versionsListEl?: HTMLElement;
  private _svgContainerEl?: HTMLElement;
  private _versionTextEl?: HTMLElement;
  private _detailsEl?: HTMLElement;

  /**
   * Get the library version.
   * This value is injected at build time via @rollup/plugin-replace
   * from package.json. It allows consumers to verify which version
   * of the web component is loaded.
   */
  public static get version(): string {
    return "__VERSION__";
  }

  // State
  private _baseNodes: CharNode[] = [];
  private _nodeMap: Map<number, CharNode> = new Map();
  private _slideshowTimerId: number | null = null;
  private _currentVersion: string = "v0";
  private _currentVersionIndex: number = 0;
  private _autoForwardEnabled: boolean = false;
  private _autoForwardTimerId: number | null = null;
  // When true, version navigation skips hint/text entrance animations,
  // prolog panning animation, and the backward fade-out, applying each
  // version's final state immediately. Lets users jump to any version
  // without waiting for the (potentially many) animations/delays that
  // would otherwise play for every operation in between.
  private _compressedTimeMode: boolean = false;
  private _renderScheduled: boolean = false;
  // Guards against re-entrant navigation: a slideshow tick (or a rapid
  // double-click/keypress) firing while a previous goToVersionIndex() call
  // is still awaiting its hint/text animations would otherwise re-run the
  // whole render pipeline for the same transition, duplicating every
  // element and animation involved (see goToVersionIndex()).
  private _isNavigating: boolean = false;

  constructor() {
    super();

    // Initialize with default settings
    this._settings = { ...DEFAULT_SETTINGS };
    this._autoForwardEnabled = this._settings.autoForwardOnGroup;

    // Create logger
    this._logger = new Logger("GVE-Rendition", this._settings.debug);

    this._boundsCache = new BoundsCache(this._logger);

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
    // Cleanup Golden Layout
    if (this._goldenLayout) {
      this._goldenLayout.destroy();
      this._goldenLayout = undefined;
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

    if (this._textRenderer) {
      this._textRenderer.updateSettings(this._settings);
    }
    if (this._hintRenderer) {
      this._hintRenderer.updateSettings(this._settings);
    }
    // Build the UI shell on first call; after that just schedule a content
    // re-render so rapid settings+data assignments coalesce into one render.
    if (!this._container) {
      this.render();
    } else {
      this.scheduleRenderContent();
    }
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
      );
      this._hintRenderer = new HintRenderer(
        this._settings,
        this._logger,
        this._animationEngine,
        this._boundsCache,
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

    // Build fast node lookup map from the flat nodes array
    this._nodeMap = new Map<number, CharNode>();
    for (const node of this._data.nodes) {
      this._nodeMap.set(node.id, node);
    }

    // Build base nodes list from v0 version node IDs
    const v0Ids = this._data.versionNodeIds["v0"] ?? [];
    this._baseNodes = v0Ids
      .map((id) => this._nodeMap.get(id))
      .filter((n): n is CharNode => n !== undefined);


    this._logger.info(
      `Processed data: ${this._baseNodes.length} base nodes, ${this._data.steps.length} steps`
    );

    // Initialize toolbar if not already done; update it when data changes
    if (!this._toolbar && this._data.steps) {
      const toolbarContainer = this._shadow.querySelector("#toolbar-container");
      if (toolbarContainer) {
        this._toolbar = new Toolbar(toolbarContainer as HTMLElement);
        this._toolbar.updateData(this._data);
        this._toolbar.setCustomButtons(this._settings.customButtons || []);
        this._toolbar.setDisabledButtons(
          this._settings.disabledButtonIds || []
        );
        this._toolbar.setAutoForwardEnabled(this._autoForwardEnabled);
        this._toolbar.setCompressedTimeModeEnabled(this._compressedTimeMode);

        // Listen for toolbar navigation events
        toolbarContainer.addEventListener("toolbar-navigate", (e: Event) => {
          const customEvent = e as CustomEvent;
          this.handleToolbarNavigation(customEvent.detail.action);
        });

        // Listen for toolbar slideshow events
        toolbarContainer.addEventListener("toolbar-slideshow", (e: Event) => {
          const customEvent = e as CustomEvent;
          this.handleToolbarSlideshow(
            customEvent.detail.action,
            customEvent.detail.reverse
          );
        });

        // Listen for toolbar auto-forward events
        toolbarContainer.addEventListener(
          "toolbar-auto-forward",
          (e: Event) => {
            const customEvent = e as CustomEvent;
            this.setAutoForwardEnabled(customEvent.detail.enabled);
          }
        );

        // Listen for toolbar compressed-time-mode events
        toolbarContainer.addEventListener(
          "toolbar-compressed-time",
          (e: Event) => {
            const customEvent = e as CustomEvent;
            this.setCompressedTimeModeEnabled(customEvent.detail.enabled);
          }
        );

        // Listen for toolbar display events
        toolbarContainer.addEventListener("toolbar-display", (e: Event) => {
          const customEvent = e as CustomEvent;
          this.handleToolbarDisplay(customEvent.detail.action);
        });

        // Listen for toolbar layout events
        toolbarContainer.addEventListener("toolbar-layout", (e: Event) => {
          const customEvent = e as CustomEvent;
          if (customEvent.detail.action === "reset") {
            this.resetLayout();
          }
        });
      }
    } else if (this._toolbar) {
      // Toolbar already exists — update it with new data so step count
      // and navigation state reflect the latest snapshot.
      this._toolbar.updateData(this._data);
    }

    // Schedule content rendering. Using scheduleRenderContent() rather than
    // a direct call ensures that when settings and data are both set in the
    // same synchronous turn (the common Angular pattern), only one render
    // fires after both assignments have completed.
    if (this._textRenderer && this._rootSvg && this._baseNodes.length > 0) {
      this.scheduleRenderContent();
    }
  }

  /**
   * Render the component UI.
   */
  private render(): void {
    // Cancel any pending coalesced render — initializeGoldenLayout() will
    // trigger renderContent() once the new DOM is actually ready.
    this._renderScheduled = false;

    // Destroy existing GL instance before clearing the DOM
    if (this._goldenLayout) {
      this._goldenLayout.destroy();
      this._goldenLayout = undefined;
    }

    // Destroy pan/zoom — its internal state is tied to the old SVG element.
    // initializePanZoom() guards against double-init with a null-check,
    // so it must be reset here or it will silently skip re-initialization.
    if (this._panZoomInstance) {
      this._panZoomInstance.destroy();
      this._panZoomInstance = undefined;
    }

    // Kill in-flight GSAP animations on the old SVG tree.
    if (this._animationEngine) {
      this._animationEngine.killAll();
    }

    // Reset toolbar — processData() only creates it when this is null,
    // so leaving a stale reference would prevent toolbar rebuild.
    this._toolbar = undefined;

    this._shadow.innerHTML = "";

    // Add styles (includes inlined GL CSS for Shadow DOM compatibility)
    const style = document.createElement("style");
    style.textContent = this.getStyles();
    this._shadow.appendChild(style);

    // Root container
    this._container = document.createElement("div");
    this._container.className = "gve-container";

    // Toolbar sits outside GL so it is always fixed at the top
    const toolbarContainer = document.createElement("div");
    toolbarContainer.id = "toolbar-container";
    this._container.appendChild(toolbarContainer);

    // GL occupies all remaining vertical space
    const glContainer = document.createElement("div");
    glContainer.id = "gl-container";
    this._container.appendChild(glContainer);

    // Pre-build panel elements; GL factory functions will move them into GL panes
    this._versionsListArea = new VersionsListArea(this._settings, this._logger);
    this._versionsListEl = this._versionsListArea.create();

    this._versionsListArea.setNavigateCallback((versionTag: string) => {
      this.navigateToVersion(versionTag);
    });
    this._versionsListArea.setHiliteToggleCallback(
      (versionTag: string | null) => {
        this.toggleHilites(versionTag);
      }
    );

    // SVG container + root SVG
    this._svgContainerEl = document.createElement("div");
    this._svgContainerEl.id = "svg-container";
    this._rootSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    this._rootSvg.setAttribute("class", "gve-text-rendition");
    this._rootSvg.setAttribute("width", "100%");
    this._rootSvg.setAttribute("height", "100%");
    this._svgContainerEl.appendChild(this._rootSvg);

    this._versionTextArea = new VersionTextArea(this._settings, this._logger);
    this._versionTextEl = this._versionTextArea.create();

    this._detailsArea = new DetailsArea(this._settings, this._logger);
    this._detailsEl = this._detailsArea.create();

    this._hilites = new Hilites(
      this._logger,
      this._settings.hilitePadding,
      this._settings.hiliteFadeTime
    );

    // Custom drag handle that lets users grow / shrink the whole component
    const bottomHandle = document.createElement("div");
    bottomHandle.id = "component-resize-handle";
    this._container.appendChild(bottomHandle);
    this.setupBottomResizeHandle(bottomHandle);

    this._shadow.appendChild(this._container);

    // Initialize GL after the DOM is ready
    requestAnimationFrame(() => {
      this.initializeGoldenLayout();
    });

    this._logger.debug("Component", "UI structure rendered");
  }

  /**
   * Wire up the drag-to-resize handle at the bottom of the component.
   * Dragging it adjusts the host element's inline height, which overrides
   * the --gve-height CSS variable while keeping GL's ResizeObserver in sync.
   */
  private setupBottomResizeHandle(handle: HTMLElement): void {
    let startY = 0;
    let startHeight = 0;
    let minHeight = 0;

    const onMouseMove = (e: MouseEvent) => {
      const newHeight = Math.max(minHeight, startHeight + (e.clientY - startY));
      this.style.height = `${newHeight}px`;
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    handle.addEventListener("mousedown", (e: MouseEvent) => {
      e.preventDefault();
      startY = e.clientY;
      startHeight = this.offsetHeight;
      minHeight = parseInt(getComputedStyle(this).minHeight) || 600;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }

  /**
   * Initialize Golden Layout with the four resizable panels.
   * The SVG rendition panel has no header and acts as the fixed background.
   */
  private initializeGoldenLayout(): void {
    // Guard against stale rAF callbacks: render() can run more than once
    // before the first scheduled callback fires (e.g. a consumer sets
    // settings/data before the element is connected, then connectedCallback
    // renders again). Without these checks two GoldenLayout instances would
    // be created on the same container, duplicating panels and leaking the
    // first instance's ResizeObserver.
    if (!this.isConnected) {
      this._logger.debug("GL", "Skipping GL init - component not connected");
      return;
    }
    if (this._goldenLayout) {
      this._goldenLayout.destroy();
      this._goldenLayout = undefined;
    }

    const glContainer = this._shadow.getElementById(
      "gl-container"
    ) as HTMLElement;
    if (!glContainer) {
      this._logger.error("GL", "gl-container not found in Shadow DOM");
      return;
    }

    this._goldenLayout = new GoldenLayout(glContainer);

    // GL's ResizeObserver callback only fires when resizeWithContainerAutomatically
    // is true (defaults to false).  Without this flag, GL reads offsetWidth/offsetHeight
    // once during loadLayout — which can be 0 when the flex layout hasn't settled —
    // and never corrects itself.
    this._goldenLayout.resizeWithContainerAutomatically = true;

    // ── Register component factories ────────────────────────────────────

    this._goldenLayout.registerComponentFactoryFunction(
      "VersionsList",
      (container: ComponentContainer) => {
        if (this._versionsListEl) {
          container.element.style.overflow = "hidden";
          container.element.appendChild(this._versionsListEl);
        }
      }
    );

    this._goldenLayout.registerComponentFactoryFunction(
      "TextRendition",
      (container: ComponentContainer) => {
        if (this._svgContainerEl) {
          container.element.style.overflow = "hidden";
          container.element.appendChild(this._svgContainerEl);
        }
        // Throttle SVG resize math behind rAF so the browser is ready to paint
        container.on("resize", () => {
          requestAnimationFrame(() => {
            if (this._panZoomInstance) {
              this._panZoomInstance.resize();
            }
          });
        });
      }
    );

    this._goldenLayout.registerComponentFactoryFunction(
      "VersionText",
      (container: ComponentContainer) => {
        if (this._versionTextEl) {
          container.element.style.overflow = "hidden";
          container.element.appendChild(this._versionTextEl);
        }
      }
    );

    this._goldenLayout.registerComponentFactoryFunction(
      "Details",
      (container: ComponentContainer) => {
        if (this._detailsEl) {
          container.element.style.overflow = "hidden";
          container.element.appendChild(this._detailsEl);
        }
      }
    );

    // ── Load default layout ─────────────────────────────────────────────

    try {
      this._goldenLayout.loadLayout(this.getDefaultLayout());
    } catch (err) {
      console.error("[GL] Failed to load default layout:", err);
    }

    this._logger.info("GL", "Golden Layout initialized");

    // If data arrived before GL was ready (consumer set data synchronously
    // before the rAF fired), kick off content rendering now that the SVG
    // container is actually in the DOM inside a GL panel.
    if (this._textRenderer && this._rootSvg && this._baseNodes.length > 0) {
      this.renderContent();
    }
  }

  /**
   * Default layout: mirrors the original Split.js arrangement.
   *  Column:
   *    Row (60 %): VersionsList (15 %) | TextRendition (85 %, no header)
   *    Row (40 %): VersionText (60 %)  | Details (40 %)
   */
  private getDefaultLayout(): LayoutConfig {
    return {
      settings: {
        showPopoutIcon: false,
        showMaximiseIcon: false,
        showCloseIcon: false,
        // Tab dragging/docking is disabled: the four panels are fixed
        // functional areas, and users only need the splitters to
        // redistribute space. This prevents dragging a panel into another
        // stack (or into limbo) and losing the intended layout. The
        // "reset layout" toolbar button remains the escape hatch.
        reorderEnabled: false,
      },
      dimensions: {
        // Prevent panels from being collapsed to zero size via the
        // splitters, which would make them hard to grab back.
        defaultMinItemWidth: "80px",
        defaultMinItemHeight: "60px",
      },
      root: {
        type: "column",
        content: [
          {
            type: "row",
            size: "60%",
            content: [
              {
                type: "component",
                componentType: "VersionsList",
                title: "Versions",
                size: "15%",
              },
              {
                type: "component",
                componentType: "TextRendition",
                title: "Text Rendition",
                size: "85%",
              },
            ],
          },
          {
            type: "row",
            size: "40%",
            content: [
              {
                type: "component",
                componentType: "VersionText",
                title: "Version Text",
                size: "60%",
              },
              {
                type: "component",
                componentType: "Details",
                title: "Details",
                size: "40%",
              },
            ],
          },
        ],
      },
    };
  }

  /**
   * Reset layout to default panel sizes by reloading the default config.
   */
  public resetLayout(): void {
    try {
      if (this._goldenLayout) {
        this._goldenLayout.loadLayout(this.getDefaultLayout());
        this._logger.info("GL", "Layout reset to defaults");
      }
    } catch (error) {
      this._logger.error("GL", "Failed to reset layout", error);
    }
  }

  /**
   * Coalesce concurrent render requests into a single call.
   * Multiple same-turn invocations (e.g. settings setter + data setter both
   * firing in the same Angular expression) collapse into one microtask render,
   * always running after all synchronous assignments have completed so the
   * latest data is used.
   */
  private scheduleRenderContent(): void {
    if (this._renderScheduled) return;
    this._renderScheduled = true;
    Promise.resolve().then(() => {
      this._renderScheduled = false;
      this.renderContent();
    });
  }

  /**
   * Render content (base text only - starts at v0).
   * Use goToVersionIndex() to navigate to specific versions.
   */
  private async renderContent(): Promise<void> {
    if (!this._textRenderer || !this._rootSvg || this._baseNodes.length === 0) {
      return;
    }
    // SVG must be in the live DOM (inside a GL panel) before rendering.
    // If GL hasn't initialised yet the container is detached; renderContent()
    // will be called again from initializeGoldenLayout() once GL is ready.
    if (!this._svgContainerEl?.isConnected) {
      this._logger.debug("Component", "Deferring renderContent – SVG not yet in DOM");
      return;
    }

    this._logger.time("renderContent");
    this._logger.info("Rendering content");

    // Destroy pan/zoom before clearing SVG: svg-pan-zoom injects a <g>
    // viewport element inside the SVG. Clearing innerHTML removes it, leaving
    // the pan/zoom instance pointing at a detached node. Destroying first
    // lets initializePanZoom() create a fresh instance on the clean SVG.
    if (this._panZoomInstance) {
      this._panZoomInstance.destroy();
      this._panZoomInstance = undefined;
    }

    // Clear existing content
    this._rootSvg.innerHTML = "";
    this._boundsCache.clear();
    this._currentVersion = "v0";
    this._currentVersionIndex = 0;

    // Extract init features and render base text
    const charOffsets = this.extractCharOffsets();
    const nodeConfigs = this.extractInitNodeConfigs();
    await this._textRenderer.renderBaseText(
      this._baseNodes,
      this._rootSvg,
      charOffsets,
      nodeConfigs
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
      preventMouseEventsDefault: false, // Allow click events to propagate
      onZoom: (newZoom: number) => {
        // Zoom level is displayed in toolbar via version label area
        this._logger.debug("Zoom", `Zoom changed to ${newZoom.toFixed(2)}x`);
      },
    });

    this._logger.info("Pan/zoom initialized", {
      minZoom: this._settings.minZoom,
      maxZoom: this._settings.maxZoom,
      zoomStep: this._settings.zoomStep,
    });
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
    // Reference nodes are from the INPUT version (before this operation is applied)
    const refNodes = this.getReferenceNodes(step.refNodeIds, step.inputTag);
    if (refNodes.length === 0) {
      this._logger.warn(
        `No reference nodes found for operation ${operation.id}`
      );
      // Still fire event even if no reference nodes
      const previousVersion = this._currentVersion;
      this._currentVersion = versionTag;
      // Extract version index from tag (e.g., "v2" → 2)
      const versionMatch = versionTag.match(/v(\d+)/);
      this._currentVersionIndex = versionMatch ? parseInt(versionMatch[1]) : 0;
      this.dispatchEvent(
        new CustomEvent("versionTagChange", {
          detail: { from: previousVersion, to: versionTag },
        })
      );
      return;
    }

    // Resolve features to config; pass ref nodes so their per-version features
    // (e.g. "note") are available for hint placeholder resolution
    const config = this._featureResolver.resolve(
      this._settings,
      operation.features,
      {
        refNodes,
        outputTag: step.outputTag,
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
      // Get viewport dimensions for prolog
      const viewportWidth = this._rootSvg?.clientWidth || 0;
      const viewportHeight = this._rootSvg?.clientHeight || 0;

      await this._textRenderer.renderAdditionalText(
        addedNodes,
        this.getSvgContainer(), // Use viewport container, not root SVG
        config,
        versionTag,
        refNodes,
        this._baseNodes,
        this._panZoomInstance,
        viewportWidth,
        viewportHeight,
        this._compressedTimeMode
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
   * Get reference nodes for an operation from the flat node map.
   * All nodes (including deleted ones) are always present in the map.
   *
   * @param nodeIds - Array of node IDs from step.refNodeIds
   * @param inputTag - Kept for API compatibility; unused in new model
   * @returns Array of CharNode objects matching the IDs
   */
  private getReferenceNodes(nodeIds: number[], inputTag: string): CharNode[] {
    if (!nodeIds || nodeIds.length === 0) return [];

    const nodes: CharNode[] = [];
    for (const nodeId of nodeIds) {
      const node = this._nodeMap.get(nodeId);
      if (node) {
        nodes.push(node);
      } else {
        this._logger.warn(
          "Navigation",
          `Node with ID ${nodeId} not found (inputTag=${inputTag})`
        );
      }
    }
    return nodes;
  }

  /**
   * Get nodes added by a specific operation.
   * Nodes added by an operation carry an `opid` feature in their per-version
   * features for the output tag.
   *
   * @param operationId - The operation ID to match
   * @param outputTag - The output version tag (e.g., "v3") where the nodes were added
   * @returns Array of nodes added by this operation
   */
  private getAddedNodes(operationId: string, outputTag: string): CharNode[] {
    if (!this._data) return [];

    const nodeIds = this._data.versionNodeIds[outputTag];
    if (!nodeIds) return [];

    const added: CharNode[] = [];
    for (const nodeId of nodeIds) {
      const node = this._nodeMap.get(nodeId);
      if (!node) continue;
      const vFeatures = node.features?.[outputTag];
      if (!vFeatures) continue;
      const opidFeature = vFeatures.find((f) => f.name === "opid");
      if (opidFeature && opidFeature.value === operationId) {
        added.push(node);
      }
    }
    return added;
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
    hintOverrides?: Map<
      string | number,
      import("../rendering/feature-resolver").HintOverrides
    >
  ): Promise<void> {
    if (!this._hintRenderer || !this._rootSvg) return;

    for (let i = 0; i < hintIds.length; i++) {
      const hintId = hintIds[i];
      const hint = this._settings.hints[hintId];

      if (!hint) {
        this._logger.warn(`Hint not found: ${hintId}`);
        continue;
      }

      // Get viewport dimensions for prolog
      const viewportWidth = this._rootSvg?.clientWidth || 0;
      const viewportHeight = this._rootSvg?.clientHeight || 0;

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
        hintOverrides,
        this._panZoomInstance,
        viewportWidth,
        viewportHeight,
        this._compressedTimeMode
      );
    }
  }

  /**
   * Navigate to a specific version index (0 = base text, 1+ = after operations).
   * Uses accumulation model: forward adds elements, backward removes them.
   */
  private async goToVersionIndex(targetIndex: number): Promise<void> {
    if (!this._data || !this._textRenderer || !this._rootSvg) return;

    // Determine direction
    if (targetIndex === this._currentVersionIndex) {
      // Already at target
      return;
    }

    // Re-entrancy guard: a previous call may still be awaiting its hint/text
    // animations (which can take arbitrarily long, since hints and their
    // animations are user-defined). _currentVersionIndex is only updated
    // once that call finishes, so without this guard a caller that fires
    // again in the meantime (e.g. a slideshow tick, or a fast double-click)
    // would re-run the whole render pipeline for the same transition,
    // duplicating every hint/text element and animation it touches.
    if (this._isNavigating) {
      this._logger.warn(
        `Ignoring navigation to v${targetIndex} - a navigation is already in progress`
      );
      return;
    }
    this._isNavigating = true;

    try {
      this._logger.info(
        `Navigating from v${this._currentVersionIndex} to v${targetIndex}`
      );

      // Stop any pending auto-forward when user manually navigates
      this.stopAutoForward();

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

      // Check if we should auto-forward through grouped operations
      // Only auto-forward if:
      // 1. Feature is enabled
      // 2. We moved forward (targetIndex > previous index)
      // 3. Current operation has a groupId
      // 4. Not already in slideshow mode
      if (
        this._autoForwardEnabled &&
        targetIndex > 0 &&
        targetIndex <= (this._data?.steps?.length || 0) &&
        this._slideshowTimerId === null
      ) {
        this.checkAndTriggerAutoForward(targetIndex);
      }
    } finally {
      this._isNavigating = false;
    }
  }

  /**
   * Update the version text area with the current version's text.
   * @param versionIndex - The version index (0 = base text)
   */
  private updateVersionText(versionIndex: number): void {
    if (!this._versionTextArea || !this._data) return;

    let text = "";

    if (versionIndex === 0) {
      text = this._baseNodes.map((node) => node.data).join("");
    } else if (versionIndex > 0 && versionIndex <= this._data.steps.length) {
      text = this._data.steps[versionIndex - 1].result || "";
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

    this._logger.debug("Component", `Updated details area for ${versionTag}`);
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

      // Add click event for pinning
      svgTextEl.addEventListener("click", () => {
        this.handleTextElementClick(svgTextEl);
      });
    });

    this._logger.debug(
      "Component",
      `Set up hover listeners on ${freshTextElements.length} text elements`
    );
  }

  /**
   * Get the node from the node map by its SVG element ID.
   * Returns the node and the version tag at which to read its features.
   */
  private getNodeForElement(
    nodeId: number
  ): { node: CharNode; versionTag: string } | null {
    const node = this._nodeMap.get(nodeId);
    if (!node) return null;
    return { node, versionTag: this._currentVersion };
  }

  /**
   * Handle hover over a text element.
   */
  private handleTextElementHover(textEl: SVGTextElement): void {
    if (!this._detailsArea || !this._rootSvg) return;

    const elementId = textEl.id;
    const match = elementId.match(/^n_(\d+)$/);
    if (!match) {
      this._logger.warn(`Cannot extract node ID from element ID: ${elementId}`);
      return;
    }

    const hoveredNodeId = parseInt(match[1], 10);
    const result = this.getNodeForElement(hoveredNodeId);

    if (result) {
      this._detailsArea.updateHoveredElements([
        { element: textEl, node: result.node, versionTag: result.versionTag },
      ]);
      this._logger.debug(
        "Component",
        `Hovered over node ${hoveredNodeId} in ${this._currentVersion}`
      );
    } else {
      this._logger.warn(`Node ${hoveredNodeId} not found`);
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
   * Handle click on a text element (for pinning).
   */
  private handleTextElementClick(textEl: SVGTextElement): void {
    if (!this._detailsArea || !this._rootSvg) return;

    const elementId = textEl.id;
    const match = elementId.match(/^n_(\d+)$/);
    if (!match) {
      this._logger.warn(`Cannot extract node ID from element ID: ${elementId}`);
      return;
    }

    const clickedNodeId = parseInt(match[1], 10);
    this._logger.info("Component", `Click event fired on node ${clickedNodeId}`);

    const result = this.getNodeForElement(clickedNodeId);
    if (result) {
      this._detailsArea.pinElement(textEl, result.node, result.versionTag);
      this._logger.debug(
        "Component",
        `Clicked on node ${clickedNodeId} to pin/unpin in ${this._currentVersion}`
      );
    } else {
      this._logger.warn(`Node ${clickedNodeId} not found`);
    }
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
    const elements = Array.from(container.querySelectorAll(`.${versionClass}`));

    if (elements.length === 0) {
      this._logger.debug("Navigation", `No elements found for ${versionClass}`);
      return;
    }

    this._logger.info(
      `Removing ${elements.length} elements from v${versionIndex}`
    );

    // Step 1: If backwardFadeOutTime > 0, animate fadeout (skipped in
    // compressed time mode, where elements are removed immediately)
    if (this._settings.backwardFadeOutTime > 0 && !this._compressedTimeMode) {
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

    // Step 2: Remove elements from DOM
    elements.forEach((el) => el.remove());
  }

  /**
   * Extract char offsets from first operation if it's an annotate.
   */
  private extractCharOffsets():
    | Map<number, { x?: number | string; y?: number | string }>
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
   * Extract per-node rendition configs from the first operation if it's an annotate.
   * This allows init features like r_font-size, r_fore-color, etc. to override
   * the component-wide settings for specific base text nodes.
   */
  private extractInitNodeConfigs(): Map<number, RenditionConfig> | undefined {
    if (!this._data || this._data.steps.length === 0) return undefined;
    const firstStep = this._data.steps[0];
    if (firstStep.operation.type !== 7) return undefined; // annotate only
    const features = firstStep.operation.features;
    if (!features || features.length === 0) return undefined;

    // Only proceed if there are text rendition features beyond r_char-offsets
    const hasRenditionOverrides = features.some(
      (f) =>
        f.name.startsWith("r_") &&
        f.name !== "r_char-offsets" &&
        f.name !== "r_char-offset"
    );
    if (!hasRenditionOverrides) return undefined;

    const config = this._featureResolver.resolve(this._settings, features);
    const map = new Map<number, RenditionConfig>();
    for (const nodeId of firstStep.refNodeIds) {
      map.set(nodeId, config);
    }
    return map;
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
    this._logger.debug(
      "Zoom",
      `Zoomed in to ${this._panZoomInstance.getZoom().toFixed(2)}x`
    );
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
    this._logger.debug(
      "Zoom",
      `Zoomed out to ${this._panZoomInstance.getZoom().toFixed(2)}x`
    );
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
    // Toolbar zoom display removed; zoom level shown via other means
  }

  /**
   * Handle toolbar navigation actions.
   */
  private async handleToolbarNavigation(action: string): Promise<void> {
    if (!this._data) return;

    const totalVersions = this._data.steps?.length || 0;

    switch (action) {
      case "first":
        await this.goToVersionIndex(0);
        break;
      case "prev":
        if (this._currentVersionIndex > 0) {
          await this.goToVersionIndex(this._currentVersionIndex - 1);
        }
        break;
      case "prev-staged":
        await this.goToPrevStagedVersion();
        break;
      case "next-staged":
        await this.goToNextStagedVersion();
        break;
      case "next":
        if (this._currentVersionIndex < totalVersions) {
          await this.goToVersionIndex(this._currentVersionIndex + 1);
        }
        break;
      case "last":
        await this.goToVersionIndex(totalVersions);
        break;
    }
  }

  /**
   * Returns true when the given version tag is a staged version.
   * Checks globalFeatures (from new API) for a "version" feature.
   */
  private isStagedVersion(versionTag: string): boolean {
    if (!this._data) return false;
    const gf = this._data.globalFeatures[versionTag];
    return gf ? gf.some((f) => f.name === "version") : false;
  }

  /**
   * Navigate to previous staged version.
   */
  private async goToPrevStagedVersion(): Promise<void> {
    if (!this._data || !this._data.steps) return;

    for (let i = this._currentVersionIndex - 1; i >= 0; i--) {
      if (i === 0) {
        await this.goToVersionIndex(0);
        return;
      }

      if (this.isStagedVersion(`v${i}`)) {
        await this.goToVersionIndex(i);
        return;
      }
    }
  }

  /**
   * Navigate to next staged version.
   */
  private async goToNextStagedVersion(): Promise<void> {
    if (!this._data || !this._data.steps) return;

    const totalVersions = this._data.steps.length;
    for (let i = this._currentVersionIndex + 1; i <= totalVersions; i++) {
      if (this.isStagedVersion(`v${i}`)) {
        await this.goToVersionIndex(i);
        return;
      }
    }
  }

  /**
   * Handle toolbar slideshow actions.
   */
  private handleToolbarSlideshow(action: string, reverse?: boolean): void {
    switch (action) {
      case "start":
        this.startSlideshow();
        break;
      case "stop":
        this.stopSlideshow();
        break;
      case "toggle-reverse":
        // Reverse flag is already updated in toolbar
        this._logger.debug(
          "Slideshow",
          `Reverse mode ${reverse ? "enabled" : "disabled"}`
        );
        break;
    }
  }

  /**
   * Handle toolbar display actions.
   */
  private handleToolbarDisplay(action: string): void {
    switch (action) {
      case "zoom-in":
        this.zoomIn();
        break;
      case "zoom-out":
        this.zoomOut();
        break;
      case "fit":
        this.fitToView();
        break;
      case "download":
        this.downloadSVG();
        break;
    }
  }

  /**
   * Fit SVG to view (center and zoom to fit all content).
   */
  private fitToView(): void {
    if (!this._panZoomInstance || !this._rootSvg) {
      this._logger.warn("Cannot fit to view - pan/zoom not initialized");
      return;
    }

    // Get SVG bounding box
    const bbox = (this._rootSvg as SVGSVGElement).getBBox();
    if (bbox.width === 0 || bbox.height === 0) {
      this._logger.warn("Cannot fit to view - SVG has no content");
      return;
    }

    // Get container dimensions
    const container = this._rootSvg.parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Calculate zoom to fit with some padding (90% of container)
    const zoomX = (containerWidth * 0.9) / bbox.width;
    const zoomY = (containerHeight * 0.9) / bbox.height;
    const zoom = Math.min(zoomX, zoomY);

    // Apply zoom and center
    this._panZoomInstance.zoom(zoom);
    this._panZoomInstance.resetPan();

    this._logger.info(`Fit to view: zoom ${zoom.toFixed(2)}x`);
  }

  /**
   * Download SVG as a file.
   */
  private downloadSVG(): void {
    if (!this._rootSvg) {
      this._logger.warn("Cannot download - SVG not initialized");
      return;
    }

    // Serialize SVG to string
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(this._rootSvg);

    // Add XML declaration
    svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;

    // Create blob and download
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gve-rendition-v${this._currentVersionIndex}.svg`;
    link.click();
    URL.revokeObjectURL(url);

    this._logger.info(`Downloaded SVG for v${this._currentVersionIndex}`);
  }

  /**
   * Start slideshow mode.
   */
  private startSlideshow(): void {
    if (this._slideshowTimerId !== null) {
      this._logger.warn("Slideshow already running");
      return;
    }

    if (!this._data) {
      this._logger.warn("Cannot start slideshow - no data loaded");
      return;
    }

    this._logger.info("Starting slideshow");
    if (this._toolbar) {
      this._toolbar.setSlideshowActive(true);
      this._toolbar.setNavigationDisabled(true);
    }

    // Use a self-rescheduling setTimeout rather than setInterval: each tick
    // is scheduled only after the previous slideshowAdvance() (and the
    // navigation/animations it awaits) has fully completed. A fixed-tick
    // setInterval would keep firing regardless of how long a transition's
    // (user-defined) hint animations actually take, and once a tick landed
    // mid-transition it would re-enter goToVersionIndex() for the very same
    // transition, duplicating every hint/text element it renders.
    const scheduleTick = () => {
      this._slideshowTimerId = window.setTimeout(async () => {
        await this.slideshowAdvance();
        // Only reschedule if still active - slideshowAdvance() may have
        // called stopSlideshow() (reached the end/start with no loop).
        if (this._slideshowTimerId !== null) {
          scheduleTick();
        }
      }, this._settings.slideshowInterval);
    };
    scheduleTick();
  }

  /**
   * Stop slideshow mode.
   */
  private stopSlideshow(): void {
    if (this._slideshowTimerId === null) {
      this._logger.warn("Slideshow not running");
      return;
    }

    this._logger.info("Stopping slideshow");
    window.clearTimeout(this._slideshowTimerId);
    this._slideshowTimerId = null;

    if (this._toolbar) {
      this._toolbar.setSlideshowActive(false);
      this._toolbar.setNavigationDisabled(false);
    }
  }

  /**
   * Advance slideshow by one frame.
   */
  private async slideshowAdvance(): Promise<void> {
    if (!this._data) return;

    const totalVersions = this._data.steps?.length || 0;

    // Determine direction (forward by default, or reverse if enabled)
    const reverse = this._toolbar?.getSlideshowReverse() ?? false;

    if (reverse) {
      // Go backward
      if (this._currentVersionIndex > 0) {
        await this.goToVersionIndex(this._currentVersionIndex - 1);
      } else {
        // Reached beginning
        if (this._settings.slideshowLoop) {
          // Wait for delay then restart from end
          this.stopSlideshow();
          setTimeout(() => {
            this.goToVersionIndex(totalVersions).then(() => {
              this.startSlideshow();
            });
          }, this._settings.slideshowDelay);
        } else {
          // Stop at beginning
          this.stopSlideshow();
        }
      }
    } else {
      // Go forward
      if (this._currentVersionIndex < totalVersions) {
        await this.goToVersionIndex(this._currentVersionIndex + 1);
      } else {
        // Reached end
        if (this._settings.slideshowLoop) {
          // Wait for delay then restart from beginning
          this.stopSlideshow();
          setTimeout(() => {
            this.goToVersionIndex(0).then(() => {
              this.startSlideshow();
            });
          }, this._settings.slideshowDelay);
        } else {
          // Stop at end
          this.stopSlideshow();
        }
      }
    }
  }

  /**
   * Check if the current version belongs to a group and trigger auto-forward if needed.
   * Auto-forward continues to the next version after a delay, as long as operations
   * share the same groupId.
   *
   * @param versionIndex - The current version index (just navigated to)
   */
  private checkAndTriggerAutoForward(versionIndex: number): void {
    if (!this._data || !this._data.steps) return;

    // Get the current operation (versionIndex is 1-based for steps array)
    const stepIndex = versionIndex - 1;
    if (stepIndex < 0 || stepIndex >= this._data.steps.length) return;

    const currentStep = this._data.steps[stepIndex];
    const currentGroupId = currentStep.operation.groupId;

    // Only auto-forward if current operation has a groupId
    if (!currentGroupId) {
      this._logger.debug(
        "AutoForward",
        `Version v${versionIndex} has no groupId, not auto-forwarding`
      );
      return;
    }

    // Check if there's a next version
    const nextVersionIndex = versionIndex + 1;
    if (nextVersionIndex > this._data.steps.length) {
      this._logger.debug(
        "AutoForward",
        `Already at last version, not auto-forwarding`
      );
      return;
    }

    // Get the next operation
    const nextStepIndex = nextVersionIndex - 1;
    const nextStep = this._data.steps[nextStepIndex];
    const nextGroupId = nextStep.operation.groupId;

    // Only auto-forward if next operation has the SAME groupId
    if (nextGroupId !== currentGroupId) {
      this._logger.debug(
        "AutoForward",
        `Next version has different groupId (current: ${currentGroupId}, next: ${
          nextGroupId || "none"
        }), stopping auto-forward`
      );
      return;
    }

    // Trigger auto-forward after slideshow interval
    this._logger.info(
      `AutoForward`,
      `Continuing through group "${currentGroupId}" to v${nextVersionIndex}`
    );

    // Clear any existing timer
    if (this._autoForwardTimerId !== null) {
      window.clearTimeout(this._autoForwardTimerId);
    }

    // Set timer to advance to next version
    this._autoForwardTimerId = window.setTimeout(() => {
      this._autoForwardTimerId = null;
      this.goToVersionIndex(nextVersionIndex);
    }, this._settings.slideshowInterval);
  }

  /**
   * Stop any pending auto-forward timer.
   */
  private stopAutoForward(): void {
    if (this._autoForwardTimerId !== null) {
      this._logger.debug("AutoForward", "Stopping auto-forward");
      window.clearTimeout(this._autoForwardTimerId);
      this._autoForwardTimerId = null;
    }
  }

  /**
   * Toggle auto-forward on group feature.
   * @param enabled - Whether to enable auto-forward
   */
  public setAutoForwardEnabled(enabled: boolean): void {
    this._autoForwardEnabled = enabled;
    this._logger.info(`AutoForward ${enabled ? "enabled" : "disabled"}`);

    // If disabling, stop any pending auto-forward
    if (!enabled) {
      this.stopAutoForward();
    }
  }

  /**
   * Get current auto-forward enabled state.
   */
  public getAutoForwardEnabled(): boolean {
    return this._autoForwardEnabled;
  }

  /**
   * Toggle compressed time mode. When enabled, navigating to any version
   * skips hint/text entrance animations, prolog panning animation, and the
   * backward fade-out, so the target version's final state is shown right
   * away instead of playing every intervening operation's animations.
   * @param enabled - Whether to enable compressed time mode
   */
  public setCompressedTimeModeEnabled(enabled: boolean): void {
    this._compressedTimeMode = enabled;
    this._logger.info(`Compressed time mode ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Get current compressed time mode state.
   */
  public getCompressedTimeModeEnabled(): boolean {
    return this._compressedTimeMode;
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
      const viewport = this._rootSvg.querySelector(
        'g[id*="viewport"]'
      ) as SVGGElement;
      if (viewport) {
        return viewport;
      }

      // Alternative: get first <g> child (svg-pan-zoom's wrapper)
      const firstG = this._rootSvg.querySelector("g") as SVGGElement;
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
      await this._hilites.clearHilites();
      this._logger.debug("Component", "Cleared hilites");
    } else {
      const color =
        this._versionsListArea?.getVersionColor(versionTag) || "#FFE4E1";
      const nodeIds = this._data.versionNodeIds[versionTag] ?? [];
      await this._hilites.showHilites(nodeIds, versionTag, color);
      this._logger.debug("Component", `Showing hilites for ${versionTag}`);
    }
  }

  /**
   * Get component styles (includes inlined GL CSS for Shadow DOM compatibility).
   */
  private getStyles(): string {
    return `
      ${GOLDEN_LAYOUT_CSS}

      :host {
        display: block;
        width: 100%;
        /* Height can be set three ways (highest to lowest priority):
           1. External CSS:  gve-snapshot-rendition { height: 1200px }
           2. CSS variable:  gve-snapshot-rendition { --gve-height: 1200px }
                             or inline style="--gve-height:1200px"
           3. Built-in default: 900px
           Dragging the bottom handle sets this.style.height directly,
           overriding the CSS-variable default for the current session. */
        height: var(--gve-height, 900px);
        min-height: var(--gve-min-height, 600px);
        overflow: hidden;
      }

      .gve-container {
        width: 100%;
        height: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        /* Needed so #component-resize-handle can be absolute-positioned
           relative to this container, not to the viewport. */
        position: relative;
      }

      /* Drag handle that lets users grow/shrink the whole component.
         Styled like GL's own splitter bars for visual consistency. */
      #component-resize-handle {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 6px;
        cursor: ns-resize;
        background: var(--gve-border-color, #ccc);
        opacity: 0.4;
        transition: opacity 200ms ease;
        z-index: 100;
      }
      #component-resize-handle:hover,
      #component-resize-handle:active {
        opacity: 1;
      }

      /* GL container fills all remaining vertical space below the toolbar.
         min-height: 0 lets flex: 1 shrink below the content size;
         :host min-height: 600px is the real floor. */
      #gl-container {
        flex: 1;
        overflow: hidden;
        min-height: 0;
        position: relative;
      }

      /* SVG container fills its GL pane completely */
      #svg-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      #toolbar-container {
        flex-shrink: 0;
        min-height: 60px;
        max-height: 120px;
        overflow: hidden;
      }

      .toolbar {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 1rem;
        padding: 0.5rem 1rem;
        background: var(--gve-toolbar-bg, #f5f5f5);
        border-bottom: 1px solid var(--gve-border-color, #ddd);
        flex-shrink: 0;
        flex-wrap: wrap;
        min-height: 60px;
      }

      .toolbar-group {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        flex-wrap: nowrap;
      }

      .toolbar-group.navigation-group {
        gap: 0.25rem;
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

      .toolbar-log-display {
        padding: 0.5rem 1rem;
        font-size: 13px;
        color: var(--gve-text-color, #333);
        font-style: italic;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
        max-width: 800px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        line-height: 1.4;
        max-height: calc(1.4em * 2);
        cursor: help;
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
        width: 100%;
        height: 100%;
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

      /* Version Text Area — fills GL component pane */
      .version-text-area {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        background: var(--gve-text-pane-bg, #fff);
        min-height: 0;
        overflow: hidden;
        border-right: 1px solid var(--gve-border-color, #ddd);
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
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        overflow-x: hidden;
        min-height: 0;
      }

      .version-text {
        width: 100%;
        flex: 1;
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
        overflow: auto;
        min-height: 0;
      }

      .version-text:focus {
        outline: none;
      }

      .version-text::placeholder {
        color: var(--gve-placeholder-color, #999);
        font-style: italic;
      }

      /* Panel-level resize handles are hidden: GL's own splitter bars
         resize these panels. Keeping the rule (not removing the element)
         avoids JS errors in the area components. */
      .version-text-resize-handle {
        display: none;
      }

      /* Text Panels (A, B, Diff) */
      .text-panel {
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
        flex: 0 0 auto;
      }

      .text-panel:not(:last-child) {
        border-bottom: 1px solid var(--gve-border-color, #ddd);
      }

      /* Default heights for panels */
      #text-panel-a {
        height: 150px;
        min-height: 80px;
      }

      #text-panel-b {
        height: 150px;
        min-height: 80px;
      }

      #text-panel-diff {
        height: 180px;
        min-height: 100px;
        flex: 1 1 auto;
      }

      .panel-resize-handle {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 6px;
        cursor: ns-resize;
        background: transparent;
        transition: background-color 0.2s ease;
        z-index: 10;
      }

      .panel-resize-handle:hover {
        background-color: var(--gve-primary-color, #007bff);
        opacity: 0.3;
      }

      .text-panel-label {
        padding: 0.4rem 1rem;
        background: var(--gve-text-panel-label-bg, #f5f5f5);
        font-size: 12px;
        font-weight: 600;
        color: var(--gve-text-color, #333);
        border-bottom: 1px solid var(--gve-border-color, #e0e0e0);
      }

      .text-panel-b .text-panel-label {
        color: var(--gve-text-secondary-color, #666);
      }

      .text-panel-b .version-text-secondary {
        color: var(--gve-text-secondary-color, #666);
        background: var(--gve-text-pane-secondary-bg, #fafafa);
      }

      .diff-content {
        flex: 1;
        padding: 1rem;
        overflow: auto;
        font-family: var(--gve-text-pane-font-family, monospace);
        font-size: var(--gve-text-pane-font-size, 14px);
        line-height: 1.5;
        white-space: pre-wrap;
        background: var(--gve-text-pane-bg, #fff);
        min-height: 0;
      }

      .diff-empty {
        color: var(--gve-placeholder-color, #999);
        font-style: italic;
      }

      .diff-insert {
        background-color: var(--gve-diff-insert-bg, #d4edda);
        color: var(--gve-diff-insert-text, #155724);
      }

      .diff-delete {
        background-color: var(--gve-diff-delete-bg, #f8d7da);
        color: var(--gve-diff-delete-text, #721c24);
        text-decoration: line-through;
      }

      .diff-equal {
        color: var(--gve-text-color, #333);
      }

      /* Pin button active state */
      .toolbar-btn.active {
        background: var(--gve-primary-color, #007bff);
        color: white;
        border-color: var(--gve-primary-color, #007bff);
      }

      .toolbar-btn.active:hover:not(:disabled) {
        background: var(--gve-primary-dark, #0056b3);
        border-color: var(--gve-primary-dark, #0056b3);
      }

      /* Versions List Area — fills GL component pane */
      .versions-list-area {
        display: flex;
        flex-direction: column;
        background: var(--gve-versions-list-bg, #fff);
        border-right: 1px solid var(--gve-border-color, #ddd);
        width: 100%;
        height: 100%;
      }

      .versions-list-area.collapsed {
        overflow: hidden;
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

      /* Details Area — fills GL component pane */
      .details-area {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        background: var(--gve-details-bg, #fff);
        min-height: 0;
        overflow: hidden;
      }

      .details-area.collapsed {
        height: auto !important;
        max-height: none !important;
      }

      .details-area.collapsed .details-content {
        max-height: 0;
        overflow: hidden;
      }

      .details-area.collapsed .details-resize-handle {
        display: none;
      }

      .details-resize-handle {
        display: none;
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

      .hovered-section-header {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 0.5rem;
        padding: 0 0.5rem;
      }

      .pin-btn {
        padding: 0.25rem 0.5rem;
        background: var(--gve-btn-bg, #fff);
        border: 1px solid var(--gve-border-color, #ddd);
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 12px;
        color: var(--gve-text-color, #333);
        transition: all 0.2s ease;
      }

      .pin-btn:hover {
        background: var(--gve-btn-hover-bg, #f0f0f0);
        border-color: var(--gve-primary, #007bff);
      }

      .pin-btn.pinned {
        background: var(--gve-primary-light, #e7f3ff);
        border-color: var(--gve-primary, #007bff);
        color: var(--gve-primary, #007bff);
      }

      .pin-btn .feather-icon {
        width: 14px;
        height: 14px;
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

      .node-id {
        font-weight: bold;
        font-size: 12px;
        color: var(--gve-primary, #007bff);
        margin-bottom: 0.5rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--gve-border-color, #ddd);
      }
    `;
  }
}

// Register the custom element
customElements.define("gve-snapshot-rendition", GveSnapshotRendition);
