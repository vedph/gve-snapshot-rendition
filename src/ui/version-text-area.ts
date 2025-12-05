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

  private _settings: GveRenditionSettings;
  private _logger: Logger;
  private _isCollapsed = false;
  private _wordWrap = true;
  private _currentFontSize: number;

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
            📋
          </button>
          <button id="wrap-text-btn" class="toolbar-btn" title="Toggle word wrap">
            ⤶
          </button>
          <button id="increase-font-btn" class="toolbar-btn" title="Increase font size">
            A+
          </button>
          <button id="decrease-font-btn" class="toolbar-btn" title="Decrease font size">
            A−
          </button>
          <button id="collapse-text-btn" class="toolbar-btn" title="Collapse">
            ▼
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
    `;

    // Get element references
    this.textArea = this.container.querySelector("#version-text")!;
    this.copyBtn = this.container.querySelector("#copy-text-btn")!;
    this.wrapBtn = this.container.querySelector("#wrap-text-btn")!;
    this.increaseFontBtn = this.container.querySelector("#increase-font-btn")!;
    this.decreaseFontBtn = this.container.querySelector("#decrease-font-btn")!;
    this.collapseBtn = this.container.querySelector("#collapse-text-btn")!;

    // Apply initial styles
    this.applyTextStyles();

    // Attach event listeners
    this.attachEventListeners();

    return this.container;
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
    const content = this.container.querySelector(".version-text-content")!;

    if (this._isCollapsed) {
      content.classList.add("collapsed");
      this.collapseBtn.textContent = "▲";
      this.collapseBtn.title = "Expand";
      this._logger.debug("VersionTextArea", "Collapsed");
    } else {
      content.classList.remove("collapsed");
      this.collapseBtn.textContent = "▼";
      this.collapseBtn.title = "Collapse";
      this._logger.debug("VersionTextArea", "Expanded");
    }
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
}
