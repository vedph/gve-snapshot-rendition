import * as feather from "feather-icons";
import { GveRenditionSettings } from "../settings/settings";
import { Logger } from "../core/logger";
import { CharChainResult, OperationFeature, CharNode } from "../models";
import { OperationSummaryService } from "./operation-summary-service";

/**
 * Details area component - displays operation metadata and hovered element details.
 */
export class DetailsArea {
  private container!: HTMLElement;
  private operationSection!: HTMLElement;
  private versionFeaturesSection!: HTMLElement;
  private hoveredElementsSection!: HTMLElement;
  private hiddenFeaturesCheckbox!: HTMLInputElement;
  private collapseBtn!: HTMLButtonElement;
  private resizeHandle!: HTMLElement;

  private _settings: GveRenditionSettings;
  private _logger: Logger;
  private _summaryService: OperationSummaryService;
  private _isCollapsed = false;
  private _showHiddenFeatures = false;
  private _data: CharChainResult | null = null;
  private _currentVersionTag = "v0";
  private _isResizing = false;
  private _initialHeight = 0;
  private _initialMouseY = 0;
  private _isPinned = false;
  private _pinnedElements: Array<{ element: SVGTextElement; node: CharNode }> = [];

  constructor(settings: GveRenditionSettings, logger: Logger) {
    this._settings = settings;
    this._logger = logger;
    this._summaryService = new OperationSummaryService(logger);
  }

  create(): HTMLElement {
    this.container = document.createElement("div");
    this.container.className = "details-area";
    this.container.innerHTML = `
      <div class="details-header">
        <span class="details-title">Details</span>
        <div class="details-toolbar">
          <label class="details-checkbox-label">
            <input type="checkbox" id="hidden-features-checkbox" />
            <span>Hidden features</span>
          </label>
          <button id="collapse-details-btn" class="toolbar-btn" title="Collapse">
            <i data-feather="chevron-down"></i>
          </button>
        </div>
      </div>
      <div class="details-content">
        <div id="operation-section" class="details-operation-section"></div>
        <div id="hovered-elements-section" class="details-hovered-section"></div>
        <div id="version-features-section" class="details-version-section"></div>
      </div>
      <div class="details-resize-handle" id="details-resize-handle"></div>
    `;

    // Get element references
    this.operationSection = this.container.querySelector("#operation-section")!;
    this.versionFeaturesSection = this.container.querySelector("#version-features-section")!;
    this.hoveredElementsSection = this.container.querySelector("#hovered-elements-section")!;
    this.hiddenFeaturesCheckbox = this.container.querySelector("#hidden-features-checkbox")!;
    this.collapseBtn = this.container.querySelector("#collapse-details-btn")!;
    this.resizeHandle = this.container.querySelector("#details-resize-handle")!;

    this.attachEventListeners();

    // Replace feather icons - must be done after elements are in DOM
    this.replaceFeatherIcons();

    return this.container;
  }

  /**
   * Replace feather icon placeholders with actual SVG icons.
   */
  private replaceFeatherIcons(): void {
    const icons = this.container.querySelectorAll("[data-feather]");
    icons.forEach((icon) => {
      const iconName = icon.getAttribute("data-feather");
      if (iconName && feather.icons[iconName]) {
        const svg = feather.icons[iconName].toSvg({
          class: "feather-icon",
          width: 16,
          height: 16,
        });
        icon.innerHTML = svg;
      }
    });
  }

  /**
   * Attach event listeners.
   */
  private attachEventListeners(): void {
    // Hidden features checkbox
    this.hiddenFeaturesCheckbox.addEventListener("change", () => {
      this._showHiddenFeatures = this.hiddenFeaturesCheckbox.checked;
      this._logger.debug(
        "DetailsArea",
        `Hidden features ${this._showHiddenFeatures ? "shown" : "hidden"}`
      );
      // Re-render with current data
      this.updateVersion(this._data, this._currentVersionTag);
    });

    // Collapse/expand button
    this.collapseBtn.addEventListener("click", () => {
      this.toggleCollapse();
    });

    // Resize handle
    this.resizeHandle.addEventListener("mousedown", (e: MouseEvent) => {
      this.startResize(e);
    });
  }

  /**
   * Start resizing the details area.
   */
  private startResize(e: MouseEvent): void {
    e.preventDefault();
    this._isResizing = true;
    this._initialHeight = this.container.offsetHeight;
    this._initialMouseY = e.clientY;

    // Attach document-level listeners for smooth resizing
    const onMouseMove = (e: MouseEvent) => this.handleResize(e);
    const onMouseUp = () => this.stopResize(onMouseMove, onMouseUp);

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    this._logger.debug("DetailsArea", "Started resizing");
  }

  /**
   * Handle resize drag.
   */
  private handleResize(e: MouseEvent): void {
    if (!this._isResizing) return;

    // Calculate delta: dragging down increases height, dragging up decreases height
    const deltaY = e.clientY - this._initialMouseY;
    const newHeight = this._initialHeight + deltaY;

    // Enforce minimum and maximum height
    const minHeight = 100;
    const maxHeight = 1200;
    const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

    this.container.style.height = `${clampedHeight}px`;
    this.container.style.maxHeight = `${clampedHeight}px`;
  }

  /**
   * Stop resizing the details area.
   */
  private stopResize(onMouseMove: (e: MouseEvent) => void, onMouseUp: () => void): void {
    this._isResizing = false;

    // Remove document-level listeners
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);

    this._logger.debug("DetailsArea", `Stopped resizing (height: ${this.container.offsetHeight}px)`);
  }

  /**
   * Toggle collapse/expand state.
   */
  private toggleCollapse(): void {
    this._isCollapsed = !this._isCollapsed;

    if (this._isCollapsed) {
      this.container.classList.add("collapsed");
      this.collapseBtn.innerHTML = '<i data-feather="chevron-up"></i>';
      this.collapseBtn.title = "Expand";
      this._logger.debug("DetailsArea", "Collapsed");
    } else {
      this.container.classList.remove("collapsed");
      this.collapseBtn.innerHTML = '<i data-feather="chevron-down"></i>';
      this.collapseBtn.title = "Collapse";
      this._logger.debug("DetailsArea", "Expanded");
    }

    // Replace feather icons after updating content
    this.replaceFeatherIcons();
  }

  /**
   * Update the details area with version information.
   * @param data - The CharChainResult data
   * @param versionTag - The version tag (e.g., "v0", "v1")
   */
  updateVersion(data: CharChainResult | null, versionTag: string): void {
    this._data = data;
    this._currentVersionTag = versionTag;

    // Update summary service with new data
    this._summaryService.setData(data);

    if (!data) {
      this.clear();
      return;
    }

    // Clear hovered elements section when version changes
    this.hoveredElementsSection.innerHTML = "";

    // Update operation section
    this.updateOperationSection(data, versionTag);

    // Update version features section
    this.updateVersionFeaturesSection(data, versionTag);

    this._logger.debug("DetailsArea", `Updated for version ${versionTag}`);
  }

  /**
   * Update the operation section with operation summary and features.
   */
  private updateOperationSection(data: CharChainResult, versionTag: string): void {
    const versionIndex = this.getVersionIndex(versionTag);

    // v0 has no operation
    if (versionIndex === 0) {
      this.operationSection.innerHTML = "";
      return;
    }

    const step = data.steps[versionIndex - 1];
    if (!step || !step.operation) {
      this.operationSection.innerHTML = "";
      return;
    }

    const operation = step.operation;

    // Generate operation summary
    let summary = "";
    if (this._settings.opSummaryFn) {
      summary = this._settings.opSummaryFn(data, versionTag, this._summaryService);
    } else if (operation.dsl) {
      summary = operation.dsl;
    } else {
      summary = `Operation ${operation.id}`;
    }

    // Get operation features
    const opFeatures = operation.features || [];
    const filteredFeatures = this.filterFeatures(opFeatures);

    // Build HTML
    let html = `
      <fieldset class="details-fieldset operation-fieldset">
        <legend>Operation</legend>
        <div class="operation-summary">${summary}</div>
    `;

    if (filteredFeatures.length > 0) {
      html += `<div class="operation-features">`;
      html += this.renderFeatureList(filteredFeatures);
      html += `</div>`;
    }

    html += `</fieldset>`;

    this.operationSection.innerHTML = html;
  }

  /**
   * Update the version features section with global features.
   */
  private updateVersionFeaturesSection(data: CharChainResult, versionTag: string): void {
    const versionIndex = this.getVersionIndex(versionTag);

    // Get global features for this version
    const globalFeatures: OperationFeature[] = [];

    // Collect global features from all steps up to this version
    for (let i = 0; i < versionIndex && i < data.steps.length; i++) {
      const step = data.steps[i];
      if (step.operation?.features) {
        const stepGlobalFeatures = step.operation.features.filter((f: OperationFeature) => f.isGlobal);
        globalFeatures.push(...stepGlobalFeatures);
      }
    }

    const filteredFeatures = this.filterFeatures(globalFeatures);

    // Build HTML
    let html = `
      <fieldset class="details-fieldset version-fieldset">
        <legend>${versionTag}</legend>
    `;

    if (filteredFeatures.length > 0) {
      html += `<div class="version-features">`;
      html += this.renderFeatureList(filteredFeatures);
      html += `</div>`;
    } else {
      html += `<div class="no-features">No global features</div>`;
    }

    html += `</fieldset>`;

    this.versionFeaturesSection.innerHTML = html;
  }

  /**
   * Update the hovered elements section.
   * @param hoveredElements - Array of hovered text SVG elements with their node data
   */
  updateHoveredElements(hoveredElements: Array<{ element: SVGTextElement; node: CharNode }>): void {
    // If pinned, ignore hover updates
    if (this._isPinned) {
      return;
    }

    if (hoveredElements.length === 0) {
      this.hoveredElementsSection.innerHTML = "";
      return;
    }

    this.renderHoveredElements(hoveredElements);
  }

  /**
   * Render hovered elements with pin button.
   */
  private renderHoveredElements(hoveredElements: Array<{ element: SVGTextElement; node: CharNode }>): void {
    // Clear section
    this.hoveredElementsSection.innerHTML = "";

    if (hoveredElements.length === 0) {
      return;
    }

    // Create header with pin button
    const headerDiv = document.createElement("div");
    headerDiv.className = "hovered-section-header";

    const pinBtn = document.createElement("button");
    pinBtn.className = `pin-btn ${this._isPinned ? "pinned" : ""}`;
    pinBtn.title = this._isPinned ? "Unpin (allow hover updates)" : "Pin (freeze current display)";
    pinBtn.innerHTML = '<i data-feather="lock"></i>';

    pinBtn.addEventListener("click", () => {
      this.togglePin(hoveredElements);
    });

    headerDiv.appendChild(pinBtn);
    this.hoveredElementsSection.appendChild(headerDiv);

    // Render each hovered element
    for (const { element, node } of hoveredElements) {
      // Clone the SVG text element
      const clonedElement = element.cloneNode(true) as SVGTextElement;

      // Create a container for this hovered element
      const elementContainer = document.createElement("div");
      elementContainer.className = "hovered-element-container";

      // Create SVG wrapper for scaled glyph
      const svgWrapper = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svgWrapper.setAttribute("class", "hovered-glyph-svg");
      svgWrapper.setAttribute("width", this._settings.refGlyphWidth.toString());
      svgWrapper.setAttribute("height", this._settings.refGlyphHeight.toString());

      // Get the bounding box of the original element to calculate scale
      const bbox = element.getBBox();
      const scaleX = this._settings.refGlyphWidth / (bbox.width || 1);
      const scaleY = this._settings.refGlyphHeight / (bbox.height || 1);
      const scale = Math.min(scaleX, scaleY) * 0.8; // Use 80% to add padding

      // Center the glyph
      const translateX = (this._settings.refGlyphWidth - bbox.width * scale) / 2 - bbox.x * scale;
      const translateY = (this._settings.refGlyphHeight - bbox.height * scale) / 2 - bbox.y * scale;

      clonedElement.setAttribute("transform", `translate(${translateX}, ${translateY}) scale(${scale})`);

      svgWrapper.appendChild(clonedElement);

      // Get node features
      const nodeFeatures = node.features || [];
      const filteredFeatures = this.filterFeatures(nodeFeatures);

      // Build features HTML with node ID
      const featuresContainer = document.createElement("div");
      featuresContainer.className = "hovered-features";

      // Add node ID header
      let html = `<div class="node-id">Node ID: ${node.id}</div>`;
      html += this.renderFeatureList(filteredFeatures);
      featuresContainer.innerHTML = html;

      // Assemble the element container
      elementContainer.appendChild(svgWrapper);
      elementContainer.appendChild(featuresContainer);

      this.hoveredElementsSection.appendChild(elementContainer);
    }

    // Replace feather icons in the pin button
    this.replaceFeatherIcons();

    this._logger.debug("DetailsArea", `Updated with ${hoveredElements.length} hovered element(s)`);
  }

  /**
   * Toggle pin state.
   */
  private togglePin(currentElements: Array<{ element: SVGTextElement; node: CharNode }>): void {
    this._isPinned = !this._isPinned;

    if (this._isPinned) {
      // Store current elements
      this._pinnedElements = currentElements;
      this._logger.info("DetailsArea", "Pinned hovered elements");
    } else {
      // Clear pinned elements
      this._pinnedElements = [];
      this._logger.info("DetailsArea", "Unpinned hovered elements");
    }

    // Re-render with updated pin state
    this.renderHoveredElements(currentElements);
  }

  /**
   * Pin a specific element (triggered by click).
   */
  public pinElement(element: SVGTextElement, node: CharNode): void {
    const elements = [{ element, node }];

    if (this._isPinned) {
      // If already pinned, unpin
      this._isPinned = false;
      this._pinnedElements = [];
      this._logger.info("DetailsArea", "Unpinned via click");
    } else {
      // Pin this element
      this._isPinned = true;
      this._pinnedElements = elements;
      this._logger.info("DetailsArea", "Pinned via click");
    }

    // Render the element
    this.renderHoveredElements(elements);
  }

  /**
   * Filter features based on hidden features setting.
   */
  private filterFeatures(features: OperationFeature[]): OperationFeature[] {
    if (this._showHiddenFeatures) {
      return features;
    }

    // Get the list of hidden feature names from settings
    const hiddenFeatureNames = this._settings.hiddenFeatures || [];

    return features.filter((f) => {
      // Hide features whose name matches ^[^_]+_ (prefix followed by underscore)
      if (/^[^_]+_/.test(f.name)) {
        return false;
      }

      // Hide features whose name is in the hiddenFeatures list
      if (hiddenFeatureNames.includes(f.name)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Render a list of features as HTML.
   */
  private renderFeatureList(features: OperationFeature[]): string {
    if (features.length === 0) {
      return '<div class="no-features">No features</div>';
    }

    // Sort features alphabetically by name
    const sortedFeatures = [...features].sort((a, b) => a.name.localeCompare(b.name));

    let html = '<div class="feature-list">';
    for (const feature of sortedFeatures) {
      html += `
        <div class="feature-item">
          <span class="feature-name">${this.escapeHtml(feature.name)}</span>:
          <span class="feature-value">${this.escapeHtml(feature.value)}</span>
        </div>
      `;
    }
    html += "</div>";

    return html;
  }

  /**
   * Get version index from version tag.
   */
  private getVersionIndex(versionTag: string): number {
    const match = versionTag.match(/^v(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Escape HTML special characters.
   */
  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Clear all sections.
   */
  clear(): void {
    this.operationSection.innerHTML = "";
    this.versionFeaturesSection.innerHTML = "";
    this.hoveredElementsSection.innerHTML = "";
  }

  /**
   * Update settings.
   */
  updateSettings(settings: GveRenditionSettings): void {
    this._settings = settings;
  }
}
