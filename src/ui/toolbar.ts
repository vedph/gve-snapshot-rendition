/**
 * Toolbar component for version navigation.
 * Provides Previous/Next buttons and version label display.
 */
export class Toolbar {
  private container: HTMLElement;
  private firstBtn!: HTMLButtonElement;
  private prevBtn!: HTMLButtonElement;
  private nextBtn!: HTMLButtonElement;
  private lastBtn!: HTMLButtonElement;
  private versionLabel!: HTMLSpanElement;
  private zoomInBtn!: HTMLButtonElement;
  private zoomOutBtn!: HTMLButtonElement;
  private resetZoomBtn!: HTMLButtonElement;
  private zoomSlider!: HTMLInputElement;
  private zoomLabel!: HTMLSpanElement;
  private currentIndex: number = 0;
  private totalVersions: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  /**
   * Render toolbar UI elements.
   */
  private render(): void {
    this.container.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-group">
          <button id="first-btn" class="toolbar-btn" title="First Version (Home)">
            ⏮ First
          </button>
          <button id="prev-btn" class="toolbar-btn" title="Previous Version (←)">
            ← Previous
          </button>
          <span id="version-label" class="version-label">v0</span>
          <button id="next-btn" class="toolbar-btn" title="Next Version (→)">
            Next →
          </button>
          <button id="last-btn" class="toolbar-btn" title="Last Version (End)">
            Last ⏭
          </button>
        </div>
        <div class="toolbar-group zoom-controls">
          <button id="zoom-out-btn" class="toolbar-btn zoom-btn" title="Zoom Out">
            −
          </button>
          <input
            type="range"
            id="zoom-slider"
            class="zoom-slider"
            min="10"
            max="400"
            value="100"
            step="10"
            title="Zoom Level"
          />
          <span id="zoom-label" class="zoom-label">100%</span>
          <button id="zoom-in-btn" class="toolbar-btn zoom-btn" title="Zoom In">
            +
          </button>
          <button id="reset-zoom-btn" class="toolbar-btn" title="Reset Zoom (100%)">
            ⊙
          </button>
        </div>
      </div>
    `;

    this.firstBtn = this.container.querySelector("#first-btn")!;
    this.prevBtn = this.container.querySelector("#prev-btn")!;
    this.nextBtn = this.container.querySelector("#next-btn")!;
    this.lastBtn = this.container.querySelector("#last-btn")!;
    this.versionLabel = this.container.querySelector("#version-label")!;
    this.zoomInBtn = this.container.querySelector("#zoom-in-btn")!;
    this.zoomOutBtn = this.container.querySelector("#zoom-out-btn")!;
    this.resetZoomBtn = this.container.querySelector("#reset-zoom-btn")!;
    this.zoomSlider = this.container.querySelector("#zoom-slider")!;
    this.zoomLabel = this.container.querySelector("#zoom-label")!;

    this.attachEventListeners();
    this.updateButtons();
  }

  /**
   * Attach event listeners to buttons.
   */
  private attachEventListeners(): void {
    this.firstBtn.addEventListener("click", () => this.goFirst());
    this.prevBtn.addEventListener("click", () => this.goPrevious());
    this.nextBtn.addEventListener("click", () => this.goNext());
    this.lastBtn.addEventListener("click", () => this.goLast());

    // Zoom button events
    this.zoomInBtn.addEventListener("click", () => this.dispatchZoomEvent("in"));
    this.zoomOutBtn.addEventListener("click", () => this.dispatchZoomEvent("out"));
    this.resetZoomBtn.addEventListener("click", () =>
      this.dispatchZoomEvent("reset")
    );

    // Zoom slider event
    this.zoomSlider.addEventListener("input", () => {
      const zoomPercent = parseInt(this.zoomSlider.value);
      const zoomLevel = zoomPercent / 100;
      this.dispatchZoomEvent("set", zoomLevel);
    });
  }

  /**
   * Navigate to first version.
   */
  private goFirst(): void {
    if (this.currentIndex !== 0) {
      this.currentIndex = 0;
      this.updateButtons();
      this.dispatchNavigationEvent();
    }
  }

  /**
   * Navigate to previous version.
   */
  private goPrevious(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateButtons();
      this.dispatchNavigationEvent();
    }
  }

  /**
   * Navigate to next version.
   */
  private goNext(): void {
    if (this.currentIndex < this.totalVersions) {
      this.currentIndex++;
      this.updateButtons();
      this.dispatchNavigationEvent();
    }
  }

  /**
   * Navigate to last version.
   */
  private goLast(): void {
    if (this.currentIndex !== this.totalVersions) {
      this.currentIndex = this.totalVersions;
      this.updateButtons();
      this.dispatchNavigationEvent();
    }
  }

  /**
   * Update button states and version label.
   */
  private updateButtons(): void {
    this.firstBtn.disabled = this.currentIndex === 0;
    this.prevBtn.disabled = this.currentIndex === 0;
    this.nextBtn.disabled = this.currentIndex === this.totalVersions;
    this.lastBtn.disabled = this.currentIndex === this.totalVersions;
    this.versionLabel.textContent = `v${this.currentIndex}`;
  }

  /**
   * Dispatch navigation event for parent component to handle.
   */
  private dispatchNavigationEvent(): void {
    this.container.dispatchEvent(
      new CustomEvent("navigate", {
        detail: { index: this.currentIndex },
        bubbles: true,
      })
    );
  }

  /**
   * Set total number of versions (for button disabling).
   */
  setTotalVersions(total: number): void {
    this.totalVersions = total;
    this.updateButtons();
  }

  /**
   * Set current version index (for external updates).
   */
  setCurrentIndex(index: number): void {
    this.currentIndex = index;
    this.updateButtons();
  }

  /**
   * Get current version index.
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * Dispatch zoom event for parent component to handle.
   */
  private dispatchZoomEvent(action: "in" | "out" | "reset" | "set", zoomLevel?: number): void {
    this.container.dispatchEvent(
      new CustomEvent("zoom", {
        detail: { action, zoomLevel },
        bubbles: true,
      })
    );
  }

  /**
   * Update zoom level display (called externally when zoom changes).
   */
  updateZoomLevel(zoom: number): void {
    const zoomPercent = Math.round(zoom * 100);
    this.zoomLabel.textContent = `${zoomPercent}%`;
    this.zoomSlider.value = zoomPercent.toString();
  }
}
