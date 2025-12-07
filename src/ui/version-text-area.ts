import * as feather from "feather-icons";
import { GveRenditionSettings } from "../settings/settings";
import { Logger } from "../core/logger";

/**
 * Version text area component - displays plain text for current version.
 * Can be collapsed/expanded and includes toolbar for text manipulation.
 */
export class VersionTextArea {
  private container!: HTMLElement;
  private textArea!: HTMLTextAreaElement;
  private copyBtn!: HTMLButtonElement;
  private wrapBtn!: HTMLButtonElement;
  private increaseFontBtn!: HTMLButtonElement;
  private decreaseFontBtn!: HTMLButtonElement;
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
          <button id="copy-text-btn" class="toolbar-btn" title="Copy all text">
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
          <button id="collapse-text-btn" class="toolbar-btn" title="Collapse">
            <i data-feather="chevron-down"></i>
          </button>
        </div>
      </div>
      <div class="version-text-content">
        <textarea
          id="version-text"
          class="version-text"
          readonly
          placeholder="Version text will appear here..."
        ></textarea>
      </div>
      <div class="version-text-resize-handle" title="Drag to resize"></div>
    `;

    // Get element references
    this.textArea = this.container.querySelector("#version-text")!;
    this.copyBtn = this.container.querySelector("#copy-text-btn")!;
    this.wrapBtn = this.container.querySelector("#wrap-text-btn")!;
    this.increaseFontBtn = this.container.querySelector("#increase-font-btn")!;
    this.decreaseFontBtn = this.container.querySelector("#decrease-font-btn")!;
    this.collapseBtn = this.container.querySelector("#collapse-text-btn")!;
    this.resizeHandle = this.container.querySelector(".version-text-resize-handle")!;

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
    this.textArea.style.fontFamily = this._settings.textPaneFontFamily;
    this.textArea.style.fontSize = `${this._currentFontSize}px`;
    this.textArea.style.whiteSpace = this._wordWrap ? "pre-wrap" : "pre";
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

    // Collapse/expand button
    this.collapseBtn.addEventListener("click", () => {
      this.toggleCollapse();
    });

    // Resize handle
    this.resizeHandle.addEventListener("mousedown", (e) => {
      this.startResize(e);
    });
  }

  /**
   * Copy all text to clipboard.
   */
  private copyText(): void {
    const text = this.textArea.value;
    if (!text) {
      this._logger.warn("No text to copy");
      return;
    }

    navigator.clipboard
      .writeText(text)
      .then(() => {
        this._logger.info("Text copied to clipboard");
        // Visual feedback
        this.copyBtn.textContent = "✓";
        setTimeout(() => {
          this.copyBtn.textContent = "📋";
        }, 1000);
      })
      .catch((err) => {
        this._logger.error("Failed to copy text:", err);
      });
  }

  /**
   * Toggle word wrap for text area.
   */
  private toggleWordWrap(): void {
    this._wordWrap = !this._wordWrap;
    this.textArea.style.whiteSpace = this._wordWrap ? "pre-wrap" : "pre";
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
    this.textArea.style.fontSize = `${this._currentFontSize}px`;
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
    this.textArea.style.fontSize = `${this._currentFontSize}px`;
    this._logger.debug(
      "VersionTextArea",
      `Font size decreased to ${this._currentFontSize}px`
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
    this.textArea.value = text;
    this._logger.debug("VersionTextArea", `Updated text (${text.length} chars)`);
  }

  /**
   * Clear the text area.
   */
  clear(): void {
    this.textArea.value = "";
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
    const newHeight = Math.max(100, Math.min(800, this._startHeight + deltaY));

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
}
