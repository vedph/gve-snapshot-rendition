import { Logger } from "../core/logger";
import { CharChainResult } from "../models";

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
    if (!this._hilitesGroup) {
      this._hilitesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      this._hilitesGroup.setAttribute("id", "hilites-group");
      // Insert at the beginning so hilites are behind everything
      this._rootSvg.insertBefore(this._hilitesGroup, this._rootSvg.firstChild);
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
   * @param data - The CharChainResult data
   * @param versionTag - Version tag to hilite
   * @param color - Hilite color
   */
  async showHilites(data: CharChainResult, versionTag: string, color: string): Promise<void> {
    if (!this._rootSvg || !this._hilitesGroup) {
      this._logger.warn("Hilites", "Root SVG not set");
      return;
    }

    // Clear any existing hilites first
    await this.clearHilites();

    // Get node IDs for this version
    const nodeIds = this.getVersionNodeIds(data, versionTag);
    if (nodeIds.length === 0) {
      this._logger.warn("Hilites", `No nodes found for version ${versionTag}`);
      return;
    }

    // Create hilite rectangles for each text element
    const hilites: SVGRectElement[] = [];
    for (const nodeId of nodeIds) {
      const textEl = this._rootSvg.querySelector<SVGTextElement>(`text.node#n_${nodeId}`);
      if (textEl) {
        const hiliteRect = this.createHiliteRect(textEl, color);
        hilites.push(hiliteRect);
        this._hilitesGroup.appendChild(hiliteRect);
      }
    }

    this._activeHilites = hilites;

    // Animate hilites in
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
   * Get node IDs for a specific version.
   */
  private getVersionNodeIds(data: CharChainResult, versionTag: string): number[] {
    if (!data.taggedNodes || !data.taggedNodes[versionTag]) {
      return [];
    }

    return data.taggedNodes[versionTag].map((node) => node.id);
  }

  /**
   * Create a hilite rectangle for a text element.
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
}
