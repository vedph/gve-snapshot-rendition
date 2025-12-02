/**
 * Toolbar component for version navigation.
 * Provides Previous/Next buttons and version label display.
 */
export class Toolbar {
  private container: HTMLElement;
  private prevBtn!: HTMLButtonElement;
  private nextBtn!: HTMLButtonElement;
  private versionLabel!: HTMLSpanElement;
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
        <button id="prev-btn" class="toolbar-btn" title="Previous Version">
          ← Previous
        </button>
        <span id="version-label" class="version-label">v0</span>
        <button id="next-btn" class="toolbar-btn" title="Next Version">
          Next →
        </button>
      </div>
    `;

    this.prevBtn = this.container.querySelector("#prev-btn")!;
    this.nextBtn = this.container.querySelector("#next-btn")!;
    this.versionLabel = this.container.querySelector("#version-label")!;

    this.attachEventListeners();
    this.updateButtons();
  }

  /**
   * Attach event listeners to buttons.
   */
  private attachEventListeners(): void {
    this.prevBtn.addEventListener("click", () => this.goPrevious());
    this.nextBtn.addEventListener("click", () => this.goNext());
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
   * Update button states and version label.
   */
  private updateButtons(): void {
    this.prevBtn.disabled = this.currentIndex === 0;
    this.nextBtn.disabled = this.currentIndex === this.totalVersions;
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
}
