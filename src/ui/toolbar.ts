import * as feather from "feather-icons";
import { CharChainResult } from "../models";
import { CustomButtonSettings } from "../settings/settings";

/**
 * Version information for current step.
 */
interface VersionInfo {
  tag: string;
  position: number; // 1-based position
  total: number;
  stagedVersion?: string;
  groupId?: string;
}

/**
 * Comprehensive toolbar component for version navigation, slideshow, zoom, and custom actions.
 */
export class Toolbar {
  private container: HTMLElement;

  // Navigation buttons
  private firstBtn!: HTMLButtonElement;
  private prevBtn!: HTMLButtonElement;
  private prevStagedBtn!: HTMLButtonElement;
  private nextStagedBtn!: HTMLButtonElement;
  private nextBtn!: HTMLButtonElement;
  private lastBtn!: HTMLButtonElement;

  // Current step label
  private versionLabel!: HTMLElement;
  private groupBadge!: HTMLElement;
  private logDisplay!: HTMLElement;

  // Slideshow buttons
  private slideshowStartBtn!: HTMLButtonElement;
  private slideshowStopBtn!: HTMLButtonElement;
  private slideshowReverseBtn!: HTMLButtonElement;
  private autoForwardBtn!: HTMLButtonElement;
  private compressedTimeBtn!: HTMLButtonElement;

  // Display buttons
  private zoomInBtn!: HTMLButtonElement;
  private zoomOutBtn!: HTMLButtonElement;
  private fitBtn!: HTMLButtonElement;
  private downloadBtn!: HTMLButtonElement;

  // Layout buttons
  private resetLayoutBtn!: HTMLButtonElement;

  // State
  private _data: CharChainResult | null = null;
  private _currentVersionIndex: number = 0;
  private _customButtons: CustomButtonSettings[] = [];
  private _disabledButtonIds: string[] = [];
  private _slideshowReverse: boolean = false;
  private _autoForwardEnabled: boolean = false;
  private _compressedTimeModeEnabled: boolean = false;

  /**
   * Get slideshow reverse state.
   */
  getSlideshowReverse(): boolean {
    return this._slideshowReverse;
  }

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
        <!-- Navigation Group -->
        <div class="toolbar-group navigation-group">
          <button id="first-btn" class="toolbar-btn" title="First Version (Home)">
            <i data-feather="skip-back"></i>
          </button>
          <button id="prev-staged-btn" class="toolbar-btn" title="Previous Staged Version">
            <i data-feather="chevrons-left"></i>
          </button>
          <button id="prev-btn" class="toolbar-btn" title="Previous Version (←)">
            <i data-feather="chevron-left"></i>
          </button>
          <button id="next-btn" class="toolbar-btn" title="Next Version (→)">
            <i data-feather="chevron-right"></i>
          </button>
          <button id="next-staged-btn" class="toolbar-btn" title="Next Staged Version">
            <i data-feather="chevrons-right"></i>
          </button>
          <button id="last-btn" class="toolbar-btn" title="Last Version (End)">
            <i data-feather="skip-forward"></i>
          </button>
        </div>

        <!-- Slideshow Group -->
        <div class="toolbar-group slideshow-group">
          <button id="slideshow-start-btn" class="toolbar-btn" title="Start Slideshow">
            <i data-feather="play"></i>
          </button>
          <button id="slideshow-stop-btn" class="toolbar-btn" title="Stop Slideshow" style="display:none;">
            <i data-feather="pause"></i>
          </button>
          <button id="slideshow-reverse-btn" class="toolbar-btn" title="Toggle Reverse Slideshow">
            <i data-feather="rotate-ccw"></i>
          </button>
          <button id="auto-forward-btn" class="toolbar-btn" title="Auto-Forward on Group: Continue through grouped operations automatically">
            <i data-feather="fast-forward"></i>
          </button>
          <button id="compressed-time-btn" class="toolbar-btn" title="Compressed Time: jump between versions instantly, without animations or delays">
            <i data-feather="zap"></i>
          </button>
        </div>

        <!-- Display Group -->
        <div class="toolbar-group display-group">
          <button id="zoom-in-btn" class="toolbar-btn" title="Zoom In (+)">
            <i data-feather="zoom-in"></i>
          </button>
          <button id="zoom-out-btn" class="toolbar-btn" title="Zoom Out (-)">
            <i data-feather="zoom-out"></i>
          </button>
          <button id="fit-btn" class="toolbar-btn" title="Fit to View">
            <i data-feather="maximize"></i>
          </button>
          <button id="download-btn" class="toolbar-btn" title="Download SVG">
            <i data-feather="download"></i>
          </button>
        </div>

        <!-- Layout Group -->
        <div class="toolbar-group layout-group">
          <button id="reset-layout-btn" class="toolbar-btn" title="Reset Layout to Default Sizes">
            <i data-feather="layout"></i>
          </button>
        </div>

        <!-- Custom Buttons Group -->
        <div id="custom-buttons-group" class="toolbar-group custom-buttons-group">
        </div>

        <!-- Log Display (flexible space) -->
        <div id="log-display" class="toolbar-log-display" style="flex: 1; display: none;"></div>

        <!-- Version Label and Group Badge (at the right edge) -->
        <div class="toolbar-group version-info-group" style="margin-left: auto;">
          <div id="version-label" class="version-label">v0 (1/1)</div>
          <div id="group-badge" class="version-group-badge" style="display: none;"></div>
        </div>
      </div>
    `;

    // Get element references
    this.firstBtn = this.container.querySelector("#first-btn")!;
    this.prevBtn = this.container.querySelector("#prev-btn")!;
    this.prevStagedBtn = this.container.querySelector("#prev-staged-btn")!;
    this.nextStagedBtn = this.container.querySelector("#next-staged-btn")!;
    this.nextBtn = this.container.querySelector("#next-btn")!;
    this.lastBtn = this.container.querySelector("#last-btn")!;
    this.versionLabel = this.container.querySelector("#version-label")!;
    this.groupBadge = this.container.querySelector("#group-badge")!;
    this.logDisplay = this.container.querySelector("#log-display")!;

    this.slideshowStartBtn = this.container.querySelector("#slideshow-start-btn")!;
    this.slideshowStopBtn = this.container.querySelector("#slideshow-stop-btn")!;
    this.slideshowReverseBtn = this.container.querySelector("#slideshow-reverse-btn")!;
    this.autoForwardBtn = this.container.querySelector("#auto-forward-btn")!;
    this.compressedTimeBtn = this.container.querySelector("#compressed-time-btn")!;

    this.zoomInBtn = this.container.querySelector("#zoom-in-btn")!;
    this.zoomOutBtn = this.container.querySelector("#zoom-out-btn")!;
    this.fitBtn = this.container.querySelector("#fit-btn")!;
    this.downloadBtn = this.container.querySelector("#download-btn")!;

    this.resetLayoutBtn = this.container.querySelector("#reset-layout-btn")!;

    this.attachEventListeners();
    this.updateButtons();
    this.renderCustomButtons();

    // Replace feather icons - must be done after elements are in DOM
    this.replaceFeatherIcons();
  }

  /**
   * Replace feather icon placeholders with actual SVG icons.
   */
  private replaceFeatherIcons(): void {
    // Manually replace feather icons in this container
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
   * Attach event listeners to buttons.
   */
  private attachEventListeners(): void {
    // Navigation buttons
    this.firstBtn.addEventListener("click", () => this.dispatchNavigationEvent("first"));
    this.prevBtn.addEventListener("click", () => this.dispatchNavigationEvent("prev"));
    this.prevStagedBtn.addEventListener("click", () => this.dispatchNavigationEvent("prev-staged"));
    this.nextStagedBtn.addEventListener("click", () => this.dispatchNavigationEvent("next-staged"));
    this.nextBtn.addEventListener("click", () => this.dispatchNavigationEvent("next"));
    this.lastBtn.addEventListener("click", () => this.dispatchNavigationEvent("last"));

    // Slideshow buttons
    this.slideshowStartBtn.addEventListener("click", () => this.dispatchSlideshowEvent("start"));
    this.slideshowStopBtn.addEventListener("click", () => this.dispatchSlideshowEvent("stop"));
    this.slideshowReverseBtn.addEventListener("click", () => {
      this._slideshowReverse = !this._slideshowReverse;
      this.updateSlideshowReverseButton();
      this.dispatchSlideshowEvent("toggle-reverse", this._slideshowReverse);
    });
    this.autoForwardBtn.addEventListener("click", () => {
      this._autoForwardEnabled = !this._autoForwardEnabled;
      this.updateAutoForwardButton();
      this.dispatchAutoForwardEvent(this._autoForwardEnabled);
    });
    this.compressedTimeBtn.addEventListener("click", () => {
      this._compressedTimeModeEnabled = !this._compressedTimeModeEnabled;
      this.updateCompressedTimeButton();
      this.dispatchCompressedTimeEvent(this._compressedTimeModeEnabled);
    });

    // Display buttons
    this.zoomInBtn.addEventListener("click", () => this.dispatchDisplayEvent("zoom-in"));
    this.zoomOutBtn.addEventListener("click", () => this.dispatchDisplayEvent("zoom-out"));
    this.fitBtn.addEventListener("click", () => this.dispatchDisplayEvent("fit"));
    this.downloadBtn.addEventListener("click", () => this.dispatchDisplayEvent("download"));

    // Layout buttons
    this.resetLayoutBtn.addEventListener("click", () => this.dispatchLayoutEvent("reset"));
  }

  /**
   * Render custom buttons from settings.
   */
  private renderCustomButtons(): void {
    const customGroup = this.container.querySelector("#custom-buttons-group")!;
    customGroup.innerHTML = "";

    for (const btnSettings of this._customButtons) {
      const btn = document.createElement("button");
      btn.id = btnSettings.id;
      btn.className = "toolbar-btn custom-btn";
      btn.title = btnSettings.tooltip;
      btn.innerHTML = btnSettings.icon;

      // Check if button should be disabled
      if (this._disabledButtonIds.includes(btnSettings.id)) {
        btn.disabled = true;
      }

      btn.addEventListener("click", () => {
        // Get the root SVG element
        const svg = document.querySelector(".gve-text-rendition svg");
        if (svg && btnSettings.callback) {
          btnSettings.callback(btnSettings.id, svg as SVGElement);
        }
      });

      customGroup.appendChild(btn);
    }

    // Replace feather icons if any custom buttons use data-feather
    this.replaceFeatherIcons();
  }

  /**
   * Update button states and version label.
   */
  private updateButtons(): void {
    if (!this._data) {
      this.firstBtn.disabled = true;
      this.prevBtn.disabled = true;
      this.prevStagedBtn.disabled = true;
      this.nextStagedBtn.disabled = true;
      this.nextBtn.disabled = true;
      this.lastBtn.disabled = true;
      return;
    }

    const totalVersions = (this._data.steps?.length || 0);

    this.firstBtn.disabled = this._currentVersionIndex === 0;
    this.prevBtn.disabled = this._currentVersionIndex === 0;
    this.nextBtn.disabled = this._currentVersionIndex === totalVersions;
    this.lastBtn.disabled = this._currentVersionIndex === totalVersions;

    // Update prev/next staged buttons
    this.prevStagedBtn.disabled = !this.hasPrevStagedVersion();
    this.nextStagedBtn.disabled = !this.hasNextStagedVersion();

    // Update version label with comprehensive info
    this.updateVersionLabel();

    // Apply disabled state from settings
    this.applyDisabledButtons();
  }

  /**
   * Update version label with current version information.
   */
  private updateVersionLabel(): void {
    const info = this.getVersionInfo();
    if (!info) {
      this.versionLabel.innerHTML = "v0 (1/1)";
      this.groupBadge.style.display = "none";
      this.logDisplay.style.display = "none";
      return;
    }

    let labelHtml = `<span class="version-tag">${info.tag}</span>`;
    labelHtml += ` <span class="version-position">(${info.position}/${info.total})</span>`;

    if (info.stagedVersion) {
      labelHtml += ` <span class="version-staged">${info.stagedVersion}</span>`;
    }

    this.versionLabel.innerHTML = labelHtml;

    // Update group badge (displayed at the end of the toolbar)
    if (info.groupId) {
      this.groupBadge.textContent = info.groupId;
      this.groupBadge.style.display = "inline-block";
    } else {
      this.groupBadge.style.display = "none";
    }

    // Update log display
    this.updateLogDisplay();
  }

  /**
   * Update the log display with the current operation's log feature.
   */
  private updateLogDisplay(): void {
    if (!this._data || this._currentVersionIndex === 0) {
      // v0 has no operation, hide log
      this.logDisplay.style.display = "none";
      this.logDisplay.textContent = "";
      this.logDisplay.title = "";
      return;
    }

    const stepIndex = this._currentVersionIndex - 1;
    if (stepIndex < 0 || stepIndex >= (this._data.steps?.length || 0)) {
      this.logDisplay.style.display = "none";
      this.logDisplay.textContent = "";
      this.logDisplay.title = "";
      return;
    }

    const step = this._data.steps![stepIndex];

    // Look for a global feature named "log"
    const logFeature = step.operation?.features?.find(
      (f) => f.name === "log" && f.isGlobal
    );

    if (logFeature && logFeature.value) {
      this.logDisplay.textContent = logFeature.value;
      this.logDisplay.title = logFeature.value; // Add tooltip with full text
      this.logDisplay.style.display = "block";
    } else {
      this.logDisplay.style.display = "none";
      this.logDisplay.textContent = "";
      this.logDisplay.title = "";
    }
  }

  /**
   * Get version information for current step.
   */
  private getVersionInfo(): VersionInfo | null {
    if (!this._data) {
      return null;
    }

    const totalVersions = (this._data.steps?.length || 0) + 1;
    const versionTag = `v${this._currentVersionIndex}`;

    let stagedVersion: string | undefined;
    let groupId: string | undefined;

    // Get info from current step if not v0
    if (this._currentVersionIndex > 0 && this._data.steps) {
      const stepIndex = this._currentVersionIndex - 1;
      const step = this._data.steps[stepIndex];

      if (step?.operation?.features) {
        const versionFeature = step.operation.features.find(
          (f) => f.name === "version" && f.isGlobal
        );
        if (versionFeature) {
          stagedVersion = versionFeature.value;
        }
      }

      if (step?.operation?.groupId) {
        groupId = step.operation.groupId;
      }
    }

    return {
      tag: versionTag,
      position: this._currentVersionIndex + 1,
      total: totalVersions,
      stagedVersion,
      groupId,
    };
  }

  /**
   * Check if there is a previous staged version.
   */
  private hasPrevStagedVersion(): boolean {
    if (!this._data || !this._data.steps) {
      return false;
    }

    for (let i = this._currentVersionIndex - 1; i >= 0; i--) {
      if (i === 0) {
        // v0 is always considered staged
        return true;
      }

      const stepIndex = i - 1;
      const step = this._data.steps[stepIndex];
      if (step?.operation?.features) {
        const hasVersion = step.operation.features.some(
          (f) => f.name === "version" && f.isGlobal
        );
        if (hasVersion) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if there is a next staged version.
   */
  private hasNextStagedVersion(): boolean {
    if (!this._data || !this._data.steps) {
      return false;
    }

    const totalVersions = this._data.steps.length;
    for (let i = this._currentVersionIndex + 1; i <= totalVersions; i++) {
      const stepIndex = i - 1;
      const step = this._data.steps[stepIndex];
      if (step?.operation?.features) {
        const hasVersion = step.operation.features.some(
          (f) => f.name === "version" && f.isGlobal
        );
        if (hasVersion) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Update slideshow reverse button appearance.
   */
  private updateSlideshowReverseButton(): void {
    if (this._slideshowReverse) {
      this.slideshowReverseBtn.classList.add("active");
    } else {
      this.slideshowReverseBtn.classList.remove("active");
    }
  }

  /**
   * Update auto-forward button visual state.
   */
  private updateAutoForwardButton(): void {
    if (this._autoForwardEnabled) {
      this.autoForwardBtn.classList.add("active");
    } else {
      this.autoForwardBtn.classList.remove("active");
    }
  }

  /**
   * Update compressed time mode button visual state.
   */
  private updateCompressedTimeButton(): void {
    if (this._compressedTimeModeEnabled) {
      this.compressedTimeBtn.classList.add("active");
    } else {
      this.compressedTimeBtn.classList.remove("active");
    }
  }

  /**
   * Apply disabled state to buttons from settings.
   */
  private applyDisabledButtons(): void {
    const buttonMap: Record<string, HTMLButtonElement> = {
      "first-btn": this.firstBtn,
      "prev-btn": this.prevBtn,
      "prev-staged-btn": this.prevStagedBtn,
      "next-staged-btn": this.nextStagedBtn,
      "next-btn": this.nextBtn,
      "last-btn": this.lastBtn,
      "slideshow-start-btn": this.slideshowStartBtn,
      "slideshow-stop-btn": this.slideshowStopBtn,
      "slideshow-reverse-btn": this.slideshowReverseBtn,
      "compressed-time-btn": this.compressedTimeBtn,
      "zoom-in-btn": this.zoomInBtn,
      "zoom-out-btn": this.zoomOutBtn,
      "fit-btn": this.fitBtn,
      "download-btn": this.downloadBtn,
    };

    for (const btnId of this._disabledButtonIds) {
      const btn = buttonMap[btnId];
      if (btn) {
        btn.disabled = true;
      }
    }
  }

  /**
   * Dispatch navigation event for parent component to handle.
   */
  private dispatchNavigationEvent(action: "first" | "prev" | "prev-staged" | "next-staged" | "next" | "last"): void {
    this.container.dispatchEvent(
      new CustomEvent("toolbar-navigate", {
        detail: { action },
        bubbles: true,
      })
    );
  }

  /**
   * Dispatch slideshow event for parent component to handle.
   */
  private dispatchSlideshowEvent(action: "start" | "stop" | "toggle-reverse", reverse?: boolean): void {
    this.container.dispatchEvent(
      new CustomEvent("toolbar-slideshow", {
        detail: { action, reverse },
        bubbles: true,
      })
    );
  }

  /**
   * Dispatch auto-forward event for parent component to handle.
   */
  private dispatchAutoForwardEvent(enabled: boolean): void {
    this.container.dispatchEvent(
      new CustomEvent("toolbar-auto-forward", {
        detail: { enabled },
        bubbles: true,
      })
    );
  }

  /**
   * Dispatch compressed time event for parent component to handle.
   */
  private dispatchCompressedTimeEvent(enabled: boolean): void {
    this.container.dispatchEvent(
      new CustomEvent("toolbar-compressed-time", {
        detail: { enabled },
        bubbles: true,
      })
    );
  }

  /**
   * Dispatch display event for parent component to handle.
   */
  private dispatchDisplayEvent(action: "zoom-in" | "zoom-out" | "fit" | "download"): void {
    this.container.dispatchEvent(
      new CustomEvent("toolbar-display", {
        detail: { action },
        bubbles: true,
      })
    );
  }

  /**
   * Dispatch layout event for parent component to handle.
   */
  private dispatchLayoutEvent(action: "reset"): void {
    this.container.dispatchEvent(
      new CustomEvent("toolbar-layout", {
        detail: { action },
        bubbles: true,
      })
    );
  }

  /**
   * Update data reference (for staged version detection).
   */
  updateData(data: CharChainResult | null): void {
    this._data = data;
    this.updateButtons();
  }

  /**
   * Set current version index (for external updates).
   */
  setCurrentIndex(index: number): void {
    this._currentVersionIndex = index;
    this.updateButtons();
  }

  /**
   * Get current version index.
   */
  getCurrentIndex(): number {
    return this._currentVersionIndex;
  }

  /**
   * Set custom buttons from settings.
   */
  setCustomButtons(customButtons: CustomButtonSettings[]): void {
    this._customButtons = customButtons;
    this.renderCustomButtons();
  }

  /**
   * Set disabled button IDs from settings.
   */
  setDisabledButtons(disabledButtonIds: string[]): void {
    this._disabledButtonIds = disabledButtonIds;
    this.applyDisabledButtons();
  }

  /**
   * Set slideshow active state (show/hide start/stop buttons).
   */
  setSlideshowActive(active: boolean): void {
    if (active) {
      this.slideshowStartBtn.style.display = "none";
      this.slideshowStopBtn.style.display = "inline-block";
    } else {
      this.slideshowStartBtn.style.display = "inline-block";
      this.slideshowStopBtn.style.display = "none";
    }
  }

  /**
   * Disable all navigation buttons (e.g., during slideshow).
   */
  setNavigationDisabled(disabled: boolean): void {
    this.firstBtn.disabled = disabled;
    this.prevBtn.disabled = disabled;
    this.prevStagedBtn.disabled = disabled;
    this.nextStagedBtn.disabled = disabled;
    this.nextBtn.disabled = disabled;
    this.lastBtn.disabled = disabled;
  }

  /**
   * Set auto-forward enabled state and update button appearance.
   */
  setAutoForwardEnabled(enabled: boolean): void {
    this._autoForwardEnabled = enabled;
    this.updateAutoForwardButton();
  }

  /**
   * Set compressed time mode enabled state and update button appearance.
   */
  setCompressedTimeModeEnabled(enabled: boolean): void {
    this._compressedTimeModeEnabled = enabled;
    this.updateCompressedTimeButton();
  }
}
