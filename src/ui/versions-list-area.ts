import { GveRenditionSettings } from "../settings/settings";
import { Logger } from "../core/logger";
import { CharChainResult } from "../models";
import { ColorPalette } from "../core/color-palette";

/**
 * Version item info for rendering.
 */
interface VersionInfo {
  tag: string;
  index: number;
  stagedVersion?: string;
  groupId?: string;
  isStaged: boolean;
}

/**
 * Versions list area component - displays list of all versions with hilite and navigation.
 */
export class VersionsListArea {
  private container!: HTMLElement;
  private listContainer!: HTMLElement;
  private stagedOnlyCheckbox!: HTMLInputElement;
  private collapseBtn!: HTMLButtonElement;

  private _settings: GveRenditionSettings;
  private _logger: Logger;
  private _colorPalette: ColorPalette;
  private _isCollapsed = false;
  private _showStagedOnly = false;
  private _data: CharChainResult | null = null;
  private _currentVersionTag = "v0";
  private _hilitedVersionTag: string | null = null;
  private _versions: VersionInfo[] = [];
  private _hasStagedVersions = false;

  // Callbacks
  private _onNavigate?: (versionTag: string) => void;
  private _onHiliteToggle?: (versionTag: string | null) => void;

  constructor(settings: GveRenditionSettings, logger: Logger) {
    this._settings = settings;
    this._logger = logger;
    this._colorPalette = new ColorPalette();
  }

  create(): HTMLElement {
    this.container = document.createElement("div");
    this.container.className = "versions-list-area";
    this.container.innerHTML = `
      <div class="versions-list-header">
        <span class="versions-list-title">Versions</span>
        <div class="versions-list-toolbar">
          <label class="versions-checkbox-label">
            <input type="checkbox" id="staged-only-checkbox" disabled />
            <span>Staged only</span>
          </label>
          <button id="collapse-versions-btn" class="toolbar-btn" title="Collapse">▼</button>
        </div>
      </div>
      <div class="versions-list-content">
        <div id="versions-list-container" class="versions-list-items"></div>
      </div>
    `;

    // Get element references
    this.listContainer = this.container.querySelector("#versions-list-container")!;
    this.stagedOnlyCheckbox = this.container.querySelector("#staged-only-checkbox")!;
    this.collapseBtn = this.container.querySelector("#collapse-versions-btn")!;

    this.attachEventListeners();

    return this.container;
  }

  /**
   * Attach event listeners.
   */
  private attachEventListeners(): void {
    // Staged only checkbox
    this.stagedOnlyCheckbox.addEventListener("change", () => {
      this._showStagedOnly = this.stagedOnlyCheckbox.checked;
      this._logger.debug(
        "VersionsListArea",
        `Staged only ${this._showStagedOnly ? "on" : "off"}`
      );
      this.renderVersionsList();
    });

    // Collapse/expand button
    this.collapseBtn.addEventListener("click", () => {
      this.toggleCollapse();
    });
  }

  /**
   * Toggle collapse/expand state.
   */
  private toggleCollapse(): void {
    this._isCollapsed = !this._isCollapsed;

    if (this._isCollapsed) {
      this.container.classList.add("collapsed");
      this.collapseBtn.textContent = "▲";
      this.collapseBtn.title = "Expand";
      this._logger.debug("VersionsListArea", "Collapsed");
    } else {
      this.container.classList.remove("collapsed");
      this.collapseBtn.textContent = "▼";
      this.collapseBtn.title = "Collapse";
      this._logger.debug("VersionsListArea", "Expanded");
    }
  }

  /**
   * Set navigation callback.
   */
  setNavigateCallback(callback: (versionTag: string) => void): void {
    this._onNavigate = callback;
  }

  /**
   * Set hilite toggle callback.
   */
  setHiliteToggleCallback(callback: (versionTag: string | null) => void): void {
    this._onHiliteToggle = callback;
  }

  /**
   * Update with new data.
   * @param data - The CharChainResult data
   */
  updateData(data: CharChainResult | null): void {
    this._data = data;

    // Clear color palette for new data
    this._colorPalette.clear();

    // Build versions list
    this.buildVersionsList();

    // Render the list
    this.renderVersionsList();
  }

  /**
   * Update current version tag.
   * @param versionTag - Current version tag
   */
  updateCurrentVersion(versionTag: string): void {
    this._currentVersionTag = versionTag;
    this.renderVersionsList();
  }

  /**
   * Clear hilites (e.g., when navigating to another version).
   */
  clearHilites(): void {
    if (this._hilitedVersionTag) {
      this._hilitedVersionTag = null;
      this.renderVersionsList();
      if (this._onHiliteToggle) {
        this._onHiliteToggle(null);
      }
    }
  }

  /**
   * Build the versions list from data.
   */
  private buildVersionsList(): void {
    this._versions = [];
    this._hasStagedVersions = false;

    if (!this._data) {
      this.stagedOnlyCheckbox.disabled = true;
      return;
    }

    // v0 (base text) is always present
    const v0Info: VersionInfo = {
      tag: "v0",
      index: 0,
      isStaged: false,
    };
    this._versions.push(v0Info);

    // Get other versions from steps
    if (this._data.steps) {
      for (let i = 0; i < this._data.steps.length; i++) {
        const step = this._data.steps[i];
        const versionTag = step.outputTag || `v${i + 1}`;

        // Check if this is a staged version (has "version" global feature)
        let stagedVersion: string | undefined;
        let isStaged = false;
        if (step.operation?.features) {
          const versionFeature = step.operation.features.find(
            (f) => f.name === "version" && f.isGlobal
          );
          if (versionFeature) {
            stagedVersion = versionFeature.value;
            isStaged = true;
            this._hasStagedVersions = true;
          }
        }

        // Get group ID if present
        const groupId = step.operation?.groupId;

        this._versions.push({
          tag: versionTag,
          index: i + 1,
          stagedVersion,
          groupId,
          isStaged,
        });
      }
    }

    // Enable/disable staged only checkbox
    this.stagedOnlyCheckbox.disabled = !this._hasStagedVersions;
    if (!this._hasStagedVersions) {
      this._showStagedOnly = false;
      this.stagedOnlyCheckbox.checked = false;
    }

    this._logger.debug(
      "VersionsListArea",
      `Built versions list: ${this._versions.length} versions, ${this._hasStagedVersions ? "has" : "no"} staged versions`
    );
  }

  /**
   * Render the versions list.
   */
  private renderVersionsList(): void {
    this.listContainer.innerHTML = "";

    if (!this._data || this._versions.length === 0) {
      return;
    }

    // Filter versions if "staged only" is enabled
    const versionsToShow = this._showStagedOnly
      ? this._versions.filter((v) => v.isStaged || v.tag === "v0")
      : this._versions;

    // Get current version index to determine which versions can be hilited
    const currentVersionIndex = this._versions.findIndex(
      (v) => v.tag === this._currentVersionTag
    );

    for (const versionInfo of versionsToShow) {
      const item = this.createVersionItem(versionInfo, currentVersionIndex);
      this.listContainer.appendChild(item);
    }
  }

  /**
   * Create a version list item.
   */
  private createVersionItem(versionInfo: VersionInfo, currentVersionIndex: number): HTMLElement {
    const item = document.createElement("div");
    item.className = "version-item";

    // Add indentation for non-staged versions (except v0)
    if (!versionInfo.isStaged && versionInfo.tag !== "v0") {
      item.classList.add("indented");
    }

    // Add active class if this is the current version
    if (versionInfo.tag === this._currentVersionTag) {
      item.classList.add("active");
    }

    // Add hilited class if this version is hilited
    if (versionInfo.tag === this._hilitedVersionTag) {
      item.classList.add("hilited");
    }

    // Get color for this version
    const color = this.getVersionColor(versionInfo.tag);

    // Create navigate button
    const navBtn = document.createElement("button");
    navBtn.className = "version-nav-btn";
    navBtn.innerHTML = "→";
    navBtn.title = `Navigate to ${versionInfo.tag}`;
    navBtn.disabled = versionInfo.tag === this._currentVersionTag;
    navBtn.addEventListener("click", () => this.handleNavigate(versionInfo.tag));

    // Create version link (for hilite toggle)
    const link = document.createElement("a");
    link.className = "version-link";
    link.href = "#";
    link.style.backgroundColor = color;

    // Only enable hilite toggle for versions up to current version
    const canHilite = versionInfo.index <= currentVersionIndex;
    if (canHilite) {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleHiliteToggle(versionInfo.tag);
      });
    } else {
      link.classList.add("disabled");
      link.style.cursor = "default";
    }

    // Build version text
    let versionText = `${versionInfo.index + 1}. ${versionInfo.tag}`;
    if (versionInfo.stagedVersion) {
      versionText += ` \`${versionInfo.stagedVersion}\``;
    }

    link.textContent = versionText;

    // Add group badge if present
    if (versionInfo.groupId) {
      const badge = document.createElement("span");
      badge.className = "version-group-badge";
      badge.textContent = versionInfo.groupId;
      link.appendChild(document.createTextNode(" "));
      link.appendChild(badge);
    }

    item.appendChild(navBtn);
    item.appendChild(link);

    return item;
  }

  /**
   * Get color for a version tag.
   */
  getVersionColor(versionTag: string): string {
    // Check if explicitly defined in settings
    if (this._settings.versionColors && this._settings.versionColors[versionTag]) {
      return this._settings.versionColors[versionTag];
    }

    // Use color palette
    return this._colorPalette.getColor(versionTag);
  }

  /**
   * Handle navigate button click.
   */
  private handleNavigate(versionTag: string): void {
    this._logger.debug("VersionsListArea", `Navigate to ${versionTag}`);
    if (this._onNavigate) {
      this._onNavigate(versionTag);
    }
  }

  /**
   * Handle hilite toggle on version link click.
   */
  private handleHiliteToggle(versionTag: string): void {
    if (this._hilitedVersionTag === versionTag) {
      // Toggle off
      this._hilitedVersionTag = null;
      this._logger.debug("VersionsListArea", `Hilite off for ${versionTag}`);
    } else {
      // Toggle on
      this._hilitedVersionTag = versionTag;
      this._logger.debug("VersionsListArea", `Hilite on for ${versionTag}`);
    }

    this.renderVersionsList();

    if (this._onHiliteToggle) {
      this._onHiliteToggle(this._hilitedVersionTag);
    }
  }

  /**
   * Update settings.
   */
  updateSettings(settings: GveRenditionSettings): void {
    this._settings = settings;
    // Re-render to apply new colors if changed
    this.renderVersionsList();
  }
}
