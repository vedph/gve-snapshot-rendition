import * as feather from "feather-icons";
import diff from "fast-diff";
import { GveRenditionSettings } from "../settings/settings";
import { Logger } from "../core/logger";

/**
 * Version text area component - displays plain text for current version.
 * Can be collapsed/expanded and includes toolbar for text manipulation.
 * Now includes previous text (Text B), pinning, and diff view.
 */
export class VersionTextArea {
  private container!: HTMLElement;
  private textAreaA!: HTMLTextAreaElement;
  private textAreaB!: HTMLTextAreaElement;
  private diffPanel!: HTMLDivElement;
  private textPanelA!: HTMLElement;
  private textPanelB!: HTMLElement;
  private textPanelDiff!: HTMLElement;
  private copyBtn!: HTMLButtonElement;
  private wrapBtn!: HTMLButtonElement;
  private increaseFontBtn!: HTMLButtonElement;
  private decreaseFontBtn!: HTMLButtonElement;
  private pinBtn!: HTMLButtonElement;
  private diffDirectionBtn!: HTMLButtonElement;
  private collapseBtn!: HTMLButtonElement;
  private resizeHandle!: HTMLElement;

  private _settings: GveRenditionSettings;
  private _logger: Logger;
  private _isCollapsed = false;
  private _wordWrap = true;
  private _currentFontSize: number;
  private _isDragging = false;
  private _startY = 0;
  private _startHeight = 0;
  private _isPinned = false;
  private _diffDirection: "AtoB" | "BtoA" = "BtoA"; // B→A shows what changed from B to get A
  private _previousText = ""; // Stores the previous version text (Text B)

  // Panel resizing state
  private _panelResizing: {
    panel: HTMLElement;
    startY: number;
    startHeight: number;
  } | null = null;

  constructor(settings: GveRenditionSettings, logger: Logger) {
    this._settings = settings;
    this._logger = logger;
    this._currentFontSize = settings.textPaneFontSize;
  }

  /**
   * Create and return the version text area container.
   */
  create(): HTMLElement {
    this.container = document.createElement("div");
    this.container.className = "version-text-area";
    this.container.innerHTML = `
      <div class="version-text-header">
        <span class="version-text-title">Version Text</span>
        <div class="version-text-toolbar">
          <button id="copy-text-btn" class="toolbar-btn" title="Copy current text (A)">
            <i data-feather="copy"></i>
          </button>
          <button id="wrap-text-btn" class="toolbar-btn" title="Toggle word wrap">
            <i data-feather="align-left"></i>
          </button>
          <button id="increase-font-btn" class="toolbar-btn" title="Increase font size">
            <i data-feather="zoom-in"></i>
          </button>
          <button id="decrease-font-btn" class="toolbar-btn" title="Decrease font size">
            <i data-feather="zoom-out"></i>
          </button>
          <button id="pin-btn" class="toolbar-btn" title="Pin previous text (B)">
            <i data-feather="unlock"></i>
          </button>
          <button id="diff-direction-btn" class="toolbar-btn" title="Toggle diff direction (B→A / A→B)">
            <i data-feather="repeat"></i>
          </button>
          <button id="collapse-text-btn" class="toolbar-btn" title="Collapse">
            <i data-feather="chevron-down"></i>
          </button>
        </div>
      </div>
      <div class="version-text-content">
        <div class="text-panel" id="text-panel-a">
          <div class="text-panel-label">Current Text (A)</div>
          <textarea
            id="version-text-a"
            class="version-text"
            readonly
            placeholder="Current version text will appear here..."
          ></textarea>
          <div class="panel-resize-handle" data-panel="a"></div>
        </div>
        <div class="text-panel text-panel-b" id="text-panel-b">
          <div class="text-panel-label">Previous Text (B)</div>
          <textarea
            id="version-text-b"
            class="version-text version-text-secondary"
            readonly
            placeholder="Previous version text will appear here..."
          ></textarea>
          <div class="panel-resize-handle" data-panel="b"></div>
        </div>
        <div class="text-panel text-panel-diff" id="text-panel-diff">
          <div class="text-panel-label">
            <span id="diff-label">Diff (B→A)</span>
          </div>
          <div id="diff-content" class="diff-content"></div>
        </div>
      </div>
      <div class="version-text-resize-handle" title="Drag to resize"></div>
    `;

    // Get element references
    this.textAreaA = this.container.querySelector("#version-text-a")!;
    this.textAreaB = this.container.querySelector("#version-text-b")!;
    this.diffPanel = this.container.querySelector("#diff-content")!;
    this.textPanelA = this.container.querySelector("#text-panel-a")!;
    this.textPanelB = this.container.querySelector("#text-panel-b")!;
    this.textPanelDiff = this.container.querySelector("#text-panel-diff")!;
    this.copyBtn = this.container.querySelector("#copy-text-btn")!;
    this.wrapBtn = this.container.querySelector("#wrap-text-btn")!;
    this.increaseFontBtn = this.container.querySelector("#increase-font-btn")!;
    this.decreaseFontBtn = this.container.querySelector("#decrease-font-btn")!;
    this.pinBtn = this.container.querySelector("#pin-btn")!;
    this.diffDirectionBtn = this.container.querySelector(
      "#diff-direction-btn"
    )!;
    this.collapseBtn = this.container.querySelector("#collapse-text-btn")!;
    this.resizeHandle = this.container.querySelector(
      ".version-text-resize-handle"
    )!;

    // Apply initial styles
    this.applyTextStyles();

    // Attach event listeners
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
        const svg = feather.toSvg(iconName, {
          class: "feather-icon",
          width: 16,
          height: 16,
        });
        icon.innerHTML = svg;
      }
    });
  }

  /**
   * Apply text styles from settings.
   */
  private applyTextStyles(): void {
    const whiteSpace = this._wordWrap ? "pre-wrap" : "pre";

    this.textAreaA.style.fontFamily = this._settings.textPaneFontFamily;
    this.textAreaA.style.fontSize = `${this._currentFontSize}px`;
    this.textAreaA.style.whiteSpace = whiteSpace;

    this.textAreaB.style.fontFamily = this._settings.textPaneFontFamily;
    this.textAreaB.style.fontSize = `${this._currentFontSize}px`;
    this.textAreaB.style.whiteSpace = whiteSpace;

    this.diffPanel.style.fontFamily = this._settings.textPaneFontFamily;
    this.diffPanel.style.fontSize = `${this._currentFontSize}px`;
    this.diffPanel.style.whiteSpace = whiteSpace;
  }

  /**
   * Attach event listeners to toolbar buttons.
   */
  private attachEventListeners(): void {
    // Copy text button
    this.copyBtn.addEventListener("click", () => {
      this.copyText();
    });

    // Word wrap toggle button
    this.wrapBtn.addEventListener("click", () => {
      this.toggleWordWrap();
    });

    // Increase font size button
    this.increaseFontBtn.addEventListener("click", () => {
      this.increaseFontSize();
    });

    // Decrease font size button
    this.decreaseFontBtn.addEventListener("click", () => {
      this.decreaseFontSize();
    });

    // Pin button
    this.pinBtn.addEventListener("click", () => {
      this.togglePin();
    });

    // Diff direction button
    this.diffDirectionBtn.addEventListener("click", () => {
      this.toggleDiffDirection();
    });

    // Collapse/expand button
    this.collapseBtn.addEventListener("click", () => {
      this.toggleCollapse();
    });

    // Resize handle
    this.resizeHandle.addEventListener("mousedown", (e) => {
      this.startResize(e);
    });

    // Panel resize handles
    const panelHandles = this.container.querySelectorAll(
      ".panel-resize-handle"
    );
    panelHandles.forEach((handle) => {
      handle.addEventListener("mousedown", (e) => {
        this.startPanelResize(e as MouseEvent, handle as HTMLElement);
      });
    });
  }

  /**
   * Copy current text (A) to clipboard.
   */
  private copyText(): void {
    const text = this.textAreaA.value;
    if (!text) {
      this._logger.warn("No text to copy");
      return;
    }

    navigator.clipboard
      .writeText(text)
      .then(() => {
        this._logger.info("Text copied to clipboard");
        // Visual feedback - store original icon
        const originalIcon = this.copyBtn.querySelector(".feather-icon");
        if (originalIcon) {
          const checkSvg = feather.toSvg("check", {
            class: "feather-icon",
            width: 16,
            height: 16,
          });
          this.copyBtn.querySelector("i")!.innerHTML = checkSvg;
          setTimeout(() => {
            const copySvg = feather.toSvg("copy", {
              class: "feather-icon",
              width: 16,
              height: 16,
            });
            this.copyBtn.querySelector("i")!.innerHTML = copySvg;
          }, 1000);
        }
      })
      .catch((err) => {
        this._logger.error("Failed to copy text:", err);
      });
  }

  /**
   * Toggle word wrap for text areas.
   */
  private toggleWordWrap(): void {
    this._wordWrap = !this._wordWrap;
    this.applyTextStyles();
    this._logger.debug(
      "VersionTextArea",
      `Word wrap ${this._wordWrap ? "enabled" : "disabled"}`
    );
  }

  /**
   * Increase font size.
   */
  private increaseFontSize(): void {
    this._currentFontSize = Math.min(this._currentFontSize + 2, 32);
    this.applyTextStyles();
    this._logger.debug(
      "VersionTextArea",
      `Font size increased to ${this._currentFontSize}px`
    );
  }

  /**
   * Decrease font size.
   */
  private decreaseFontSize(): void {
    this._currentFontSize = Math.max(this._currentFontSize - 2, 8);
    this.applyTextStyles();
    this._logger.debug(
      "VersionTextArea",
      `Font size decreased to ${this._currentFontSize}px`
    );
  }

  /**
   * Toggle pin state for previous text (B).
   */
  private togglePin(): void {
    this._isPinned = !this._isPinned;

    if (this._isPinned) {
      this.pinBtn.innerHTML = '<i data-feather="lock"></i>';
      this.pinBtn.title = "Unpin previous text (B)";
      this.pinBtn.classList.add("active");
      this._logger.debug("VersionTextArea", "Pinned text B");
    } else {
      this.pinBtn.innerHTML = '<i data-feather="unlock"></i>';
      this.pinBtn.title = "Pin previous text (B)";
      this.pinBtn.classList.remove("active");
      this._logger.debug("VersionTextArea", "Unpinned text B");
    }

    this.replaceFeatherIcons();
  }

  /**
   * Toggle diff direction (B→A or A→B).
   */
  private toggleDiffDirection(): void {
    this._diffDirection = this._diffDirection === "BtoA" ? "AtoB" : "BtoA";

    const diffLabel = this.container.querySelector("#diff-label");
    if (diffLabel) {
      diffLabel.textContent =
        this._diffDirection === "BtoA" ? "Diff (B→A)" : "Diff (A→B)";
    }

    // Update diff display
    this.updateDiff();

    this._logger.debug(
      "VersionTextArea",
      `Diff direction: ${this._diffDirection}`
    );
  }

  /**
   * Toggle collapse/expand state.
   */
  private toggleCollapse(): void {
    this._isCollapsed = !this._isCollapsed;

    if (this._isCollapsed) {
      // Add collapsed class to container
      this.container.classList.add("collapsed");
      this.collapseBtn.innerHTML = '<i data-feather="chevron-up"></i>';
      this.collapseBtn.title = "Expand";
      this._logger.debug("VersionTextArea", "Collapsed");
    } else {
      // Remove collapsed class from container
      this.container.classList.remove("collapsed");
      this.collapseBtn.innerHTML = '<i data-feather="chevron-down"></i>';
      this.collapseBtn.title = "Collapse";
      this._logger.debug("VersionTextArea", "Expanded");
    }

    // Replace feather icons after updating content
    this.replaceFeatherIcons();
  }

  /**
   * Update the displayed text.
   * @param text - The plain text to display
   */
  updateText(text: string): void {
    // Store current A as previous B (unless pinned)
    if (!this._isPinned && this.textAreaA.value) {
      this._previousText = this.textAreaA.value;
      this.textAreaB.value = this._previousText;
    }

    // Update current text A
    this.textAreaA.value = text;

    // Update diff
    this.updateDiff();

    this._logger.debug(
      "VersionTextArea",
      `Updated text (${text.length} chars)`
    );
  }

  /**
   * Update the diff panel.
   */
  private updateDiff(): void {
    const textA = this.textAreaA.value;
    const textB = this.textAreaB.value;

    if (!textA && !textB) {
      this.diffPanel.innerHTML =
        '<span class="diff-empty">No text to compare</span>';
      this.textPanelDiff.style.display = "none";
      return;
    }

    if (!textB) {
      this.diffPanel.innerHTML =
        '<span class="diff-empty">No previous text (B) available</span>';
      this.textPanelDiff.style.display = "none";
      return;
    }

    // Hide diff panel if texts are identical
    if (textA === textB) {
      this.textPanelDiff.style.display = "none";
      return;
    }

    // Show diff panel
    this.textPanelDiff.style.display = "flex";

    // Calculate diff based on direction
    const diffs =
      this._diffDirection === "BtoA"
        ? diff(textB, textA) // Changes from B to A
        : diff(textA, textB); // Changes from A to B

    // Render diff
    const html = this.renderDiff(diffs);
    this.diffPanel.innerHTML = html;
  }

  /**
   * Render diff results as HTML.
   * @param diffs - Array of diff operations
   */
  private renderDiff(diffs: Array<[number, string]>): string {
    const parts: string[] = [];
    const INSERT = 1;
    const DELETE = -1;
    const EQUAL = 0;

    for (const [operation, text] of diffs) {
      const escapedText = this.escapeHtml(text);

      switch (operation) {
        case INSERT:
          // Green for additions
          parts.push(`<span class="diff-insert">${escapedText}</span>`);
          break;
        case DELETE:
          // Red with strikethrough for deletions
          parts.push(`<span class="diff-delete">${escapedText}</span>`);
          break;
        case EQUAL:
          // Normal text for unchanged
          parts.push(`<span class="diff-equal">${escapedText}</span>`);
          break;
      }
    }

    return parts.join("");
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
   * Clear the text area.
   */
  clear(): void {
    this.textAreaA.value = "";
    this.textAreaB.value = "";
    this._previousText = "";
    this.diffPanel.innerHTML =
      '<span class="diff-empty">No text to compare</span>';
  }

  /**
   * Update settings.
   */
  updateSettings(settings: GveRenditionSettings): void {
    this._settings = settings;
    this._currentFontSize = settings.textPaneFontSize;
    this.applyTextStyles();
  }

  /**
   * Start resize operation.
   */
  private startResize(e: MouseEvent): void {
    if (this._isCollapsed) return;

    this._isDragging = true;
    this._startY = e.clientY;
    this._startHeight = this.container.offsetHeight;

    // Add document-level event listeners for smooth dragging
    const handleMouseMove = (e: MouseEvent) => this.handleResize(e);
    const handleMouseUp = () => this.endResize(handleMouseMove, handleMouseUp);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    // Prevent text selection during drag
    e.preventDefault();
    document.body.style.userSelect = "none";

    this._logger.debug("VersionTextArea", "Started resize");
  }

  /**
   * Handle resize during drag.
   */
  private handleResize(e: MouseEvent): void {
    if (!this._isDragging) return;

    const deltaY = e.clientY - this._startY;
    const newHeight = Math.max(200, Math.min(1000, this._startHeight + deltaY));

    this.container.style.maxHeight = `${newHeight}px`;
    this.container.style.height = `${newHeight}px`;
  }

  /**
   * End resize operation.
   */
  private endResize(
    moveHandler: (e: MouseEvent) => void,
    upHandler: () => void
  ): void {
    this._isDragging = false;

    // Remove document-level event listeners
    document.removeEventListener("mousemove", moveHandler);
    document.removeEventListener("mouseup", upHandler);

    // Restore text selection
    document.body.style.userSelect = "";

    this._logger.debug(
      "VersionTextArea",
      `Resize ended at height ${this.container.offsetHeight}px`
    );
  }

  /**
   * Start panel resize operation.
   */
  private startPanelResize(e: MouseEvent, handle: HTMLElement): void {
    if (this._isCollapsed) return;

    const panelId = handle.getAttribute("data-panel");
    let panel: HTMLElement | null = null;

    if (panelId === "a") {
      panel = this.textPanelA;
    } else if (panelId === "b") {
      panel = this.textPanelB;
    }

    if (!panel) return;

    this._panelResizing = {
      panel,
      startY: e.clientY,
      startHeight: panel.offsetHeight,
    };

    // Add document-level event listeners for smooth dragging
    const handleMouseMove = (e: MouseEvent) => this.handlePanelResize(e);
    const handleMouseUp = () =>
      this.endPanelResize(handleMouseMove, handleMouseUp);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    // Prevent text selection during drag
    e.preventDefault();
    document.body.style.userSelect = "none";

    this._logger.debug(
      "VersionTextArea",
      `Started panel resize for ${panelId}`
    );
  }

  /**
   * Handle panel resize during drag.
   */
  private handlePanelResize(e: MouseEvent): void {
    if (!this._panelResizing) return;

    const { panel, startY, startHeight } = this._panelResizing;
    const deltaY = e.clientY - startY;
    const newHeight = Math.max(50, Math.min(500, startHeight + deltaY));

    // Set explicit height and override flex properties
    panel.style.height = `${newHeight}px`;
    panel.style.minHeight = `${newHeight}px`;
    panel.style.maxHeight = `${newHeight}px`;
    panel.style.flex = "0 0 auto";

    this._logger.debug("VersionTextArea", `Resizing panel to ${newHeight}px`);
  }

  /**
   * End panel resize operation.
   */
  private endPanelResize(
    moveHandler: (e: MouseEvent) => void,
    upHandler: () => void
  ): void {
    if (!this._panelResizing) return;

    const finalHeight = this._panelResizing.panel.offsetHeight;
    this._panelResizing = null;

    // Remove document-level event listeners
    document.removeEventListener("mousemove", moveHandler);
    document.removeEventListener("mouseup", upHandler);

    // Restore text selection
    document.body.style.userSelect = "";

    this._logger.debug(
      "VersionTextArea",
      `Panel resize ended at height ${finalHeight}px`
    );
  }
}
