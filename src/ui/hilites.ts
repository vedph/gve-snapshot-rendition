import { Logger } from "../core/logger";

/**
 * Hilites manager - handles creating and animating hilite rectangles.
 */
export class Hilites {
  private _logger: Logger;
  private _rootSvg: SVGSVGElement | null = null;
  private _hilitesGroup: SVGGElement | null = null;
  private _activeHilites: SVGRectElement[] = [];
  private _hilitePadding: number;
  private _hiliteFadeTime: number;

  constructor(logger: Logger, hilitePadding: number, hiliteFadeTime: number) {
    this._logger = logger;
    this._hilitePadding = hilitePadding;
    this._hiliteFadeTime = hiliteFadeTime;
  }

  /**
   * Set root SVG element reference.
   */
  setRootSvg(rootSvg: SVGSVGElement): void {
    this._rootSvg = rootSvg;

    // Create hilites group if it doesn't exist
    // NOTE: The group will be created, but we'll insert it dynamically
    // into the correct container (viewport group) when showing hilites
    if (!this._hilitesGroup) {
      this._hilitesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      this._hilitesGroup.setAttribute("id", "hilites-group");
    }
  }

  /**
   * Update settings.
   */
  updateSettings(hilitePadding: number, hiliteFadeTime: number): void {
    this._hilitePadding = hilitePadding;
    this._hiliteFadeTime = hiliteFadeTime;
  }

  /**
   * Show hilites for a specific version.
   * @param nodeIds - IDs of nodes to hilite (from versionNodeIds[versionTag])
   * @param versionTag - Version tag label (for logging)
   * @param color - Hilite color
   */
  async showHilites(nodeIds: number[], versionTag: string, color: string): Promise<void> {
    if (!this._rootSvg || !this._hilitesGroup) {
      this._logger.warn("Hilites", "Root SVG not set");
      return;
    }

    await this.clearHilites();

    const container = this.getSvgContainer();

    if (!container.contains(this._hilitesGroup)) {
      container.insertBefore(this._hilitesGroup, container.firstChild);
      this._logger.debug("Hilites", "Inserted hilites group into viewport container");
    }

    if (nodeIds.length === 0) {
      this._logger.warn("Hilites", `No nodes for version ${versionTag}`);
      return;
    }

    const hilites: SVGRectElement[] = [];
    for (const nodeId of nodeIds) {
      const textEl = container.querySelector<SVGTextElement>(`text.node#n_${nodeId}`);
      if (textEl) {
        const hiliteRect = this.createHiliteRect(textEl, color);
        hilites.push(hiliteRect);
        this._hilitesGroup.appendChild(hiliteRect);
      }
    }

    this._activeHilites = hilites;
    await this.animateHilitesIn();

    this._logger.debug("Hilites", `Showed ${hilites.length} hilites for ${versionTag}`);
  }

  /**
   * Clear all hilites.
   */
  async clearHilites(): Promise<void> {
    if (this._activeHilites.length === 0) {
      return;
    }

    // Animate hilites out
    await this.animateHilitesOut();

    // Remove all hilite rectangles
    this._activeHilites.forEach((rect) => rect.remove());
    this._activeHilites = [];

    this._logger.debug("Hilites", "Cleared hilites");
  }


  /**
   * Create a hilite rectangle for a text element.
   *
   * IMPORTANT: Since hilites are now placed in the same container (viewport group)
   * as the text elements, they share the same coordinate space and transforms.
   * This means getBBox() gives us the correct relative coordinates, and the
   * hilites will automatically pan/zoom with the text when PROLOG is triggered.
   */
  private createHiliteRect(textEl: SVGTextElement, color: string): SVGRectElement {
    const bbox = textEl.getBBox();

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("class", "hilite");

    // Apply padding
    const x = bbox.x - this._hilitePadding;
    const y = bbox.y - this._hilitePadding;
    const width = bbox.width + this._hilitePadding * 2;
    const height = bbox.height + this._hilitePadding * 2;

    rect.setAttribute("x", x.toString());
    rect.setAttribute("y", y.toString());
    rect.setAttribute("width", width.toString());
    rect.setAttribute("height", height.toString());
    rect.setAttribute("fill", color);
    rect.setAttribute("opacity", "0"); // Start hidden for animation

    return rect;
  }

  /**
   * Animate hilites in using GSAP.
   */
  private async animateHilitesIn(): Promise<void> {
    if (this._activeHilites.length === 0 || this._hiliteFadeTime === 0) {
      // No animation or instant show
      this._activeHilites.forEach((rect) => rect.setAttribute("opacity", "1"));
      return;
    }

    return new Promise((resolve) => {
      // @ts-ignore - gsap is global
      const gsap = window.gsap;
      if (!gsap) {
        this._logger.warn("Hilites", "GSAP not available");
        this._activeHilites.forEach((rect) => rect.setAttribute("opacity", "1"));
        resolve();
        return;
      }

      gsap.fromTo(
        this._activeHilites,
        { opacity: 0 },
        {
          opacity: 1,
          duration: this._hiliteFadeTime / 1000,
          ease: "power2.inOut",
          onComplete: resolve,
        }
      );
    });
  }

  /**
   * Animate hilites out using GSAP.
   */
  private async animateHilitesOut(): Promise<void> {
    if (this._activeHilites.length === 0 || this._hiliteFadeTime === 0) {
      return;
    }

    return new Promise((resolve) => {
      // @ts-ignore - gsap is global
      const gsap = window.gsap;
      if (!gsap) {
        this._logger.warn("Hilites", "GSAP not available");
        resolve();
        return;
      }

      gsap.to(this._activeHilites, {
        opacity: 0,
        duration: this._hiliteFadeTime / 1000,
        ease: "power2.inOut",
        onComplete: resolve,
      });
    });
  }

  /**
   * Check if hilites are currently active.
   */
  hasActiveHilites(): boolean {
    return this._activeHilites.length > 0;
  }

  /**
   * Get the SVG container where hilites should be added.
   * When svg-pan-zoom is active, this returns the viewport group.
   * Otherwise, returns the root SVG.
   *
   * CRITICAL: svg-pan-zoom wraps all content in a <g> viewport element.
   * Hilites MUST be added to this group, not the root SVG, so they
   * transform with the content when PROLOG panning occurs.
   */
  private getSvgContainer(): SVGElement {
    if (!this._rootSvg) {
      throw new Error("Root SVG not initialized");
    }

    // Try to find the svg-pan-zoom viewport group
    // svg-pan-zoom creates a <g> with id containing 'viewport'
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

    // No pan/zoom viewport found - use root SVG
    return this._rootSvg;
  }
}
