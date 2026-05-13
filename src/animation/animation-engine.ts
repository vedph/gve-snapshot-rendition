import { Logger } from "../core/logger";
import { AnimationFactory, AnimationFunction } from "./animation-factory";

/**
 * Animation engine that wraps GSAP and provides a consistent API.
 */
export class AnimationEngine {
  private _gsap: any;
  private _logger: Logger;
  private _factory: AnimationFactory;

  constructor(gsap: any, logger: Logger) {
    this._gsap = gsap;
    this._logger = logger;
    this._factory = new AnimationFactory(gsap, logger);
  }

  /**
   * Get the animation factory.
   */
  public getFactory(): AnimationFactory {
    return this._factory;
  }

  /**
   * Animate an element with an animation function.
   *
   * @param element - The target SVG element
   * @param animation - The animation function to execute
   * @param rootElement - The root SVG element
   * @returns Promise that resolves when animation completes
   */
  public async animate(
    element: SVGElement,
    animation: AnimationFunction,
    rootElement: SVGElement
  ): Promise<void> {
    try {
      await animation(this._gsap, element, rootElement);
    } catch (error) {
      this._logger.error("Animation execution error:", error);
    }
  }

  /**
   * Fade in multiple elements (used for hilites).
   *
   * @param elements - Array of elements to fade in
   * @param duration - Duration in milliseconds
   * @returns Promise that resolves when animation completes
   */
  public async fadeIn(elements: SVGElement[], duration: number): Promise<void> {
    if (elements.length === 0) return;

    this._logger.debug(
      "AnimationEngine",
      `Fading in ${elements.length} elements`
    );

    return new Promise<void>((resolve) => {
      this._gsap.fromTo(
        elements,
        { opacity: 0 },
        {
          opacity: 1,
          duration: duration / 1000,
          ease: "power2.inOut",
          onComplete: resolve,
        }
      );
    });
  }

  /**
   * Fade out multiple elements (used for hilites).
   *
   * @param elements - Array of elements to fade out
   * @param duration - Duration in milliseconds
   * @returns Promise that resolves when animation completes
   */
  public async fadeOut(elements: SVGElement[], duration: number): Promise<void> {
    if (elements.length === 0) return;

    this._logger.debug(
      "AnimationEngine",
      `Fading out ${elements.length} elements`
    );

    return new Promise<void>((resolve) => {
      this._gsap.to(elements, {
        opacity: 0,
        duration: duration / 1000,
        ease: "power2.inOut",
        onComplete: resolve,
      });
    });
  }

  /**
   * Animate pan and zoom transition.
   *
   * @param panZoomInstance - The svg-pan-zoom instance
   * @param newPan - New pan coordinates {x, y}
   * @param newZoom - New zoom level
   * @param duration - Duration in milliseconds
   * @returns Promise that resolves when animation completes
   */
  public async animatePanZoom(
    panZoomInstance: any,
    newPan: { x: number; y: number },
    newZoom: number,
    duration: number
  ): Promise<void> {
    this._logger.debug("AnimationEngine", "Animating pan/zoom transition", {
      newPan,
      newZoom,
    });

    const currentPan = panZoomInstance.getPan();
    const currentZoom = panZoomInstance.getZoom();

    return new Promise<void>((resolve) => {
      this._gsap.to(
        { pan: currentPan, zoom: currentZoom },
        {
          pan: newPan,
          zoom: newZoom,
          duration: duration / 1000,
          ease: "power2.inOut",
          onUpdate: function () {
            panZoomInstance.pan(this.targets()[0].pan);
            panZoomInstance.zoom(this.targets()[0].zoom);
          },
          onComplete: resolve,
        }
      );
    });
  }

  /**
   * Animate prolog panning to make an element visible.
   * This gracefully pans the viewport so there is room to display an element
   * that would otherwise fall outside the visible area.
   *
   * @param panZoomInstance - The svg-pan-zoom instance
   * @param elementBounds - Bounding rectangle of the element to make visible
   * @param viewportWidth - Width of the visible viewport
   * @param viewportHeight - Height of the visible viewport
   * @param duration - Duration in milliseconds
   * @returns Promise that resolves when animation completes
   */
  public async animateProlog(
    panZoomInstance: any,
    elementBounds: { x: number; y: number; width: number; height: number },
    viewportWidth: number,
    viewportHeight: number,
    duration: number
  ): Promise<void> {
    if (duration === 0) {
      // No animation, just pan immediately
      const adjustment = this.calculatePrologPan(
        elementBounds,
        panZoomInstance,
        viewportWidth,
        viewportHeight
      );
      if (adjustment) {
        panZoomInstance.pan(adjustment);
      }
      return;
    }

    this._logger.debug("AnimationEngine", "Calculating prolog pan adjustment", {
      elementBounds,
      viewportWidth,
      viewportHeight,
    });

    const adjustment = this.calculatePrologPan(
      elementBounds,
      panZoomInstance,
      viewportWidth,
      viewportHeight
    );

    if (!adjustment) {
      this._logger.debug("AnimationEngine", "Element already visible, no prolog needed");
      return;
    }

    this._logger.debug("AnimationEngine", "Animating prolog pan", adjustment);

    const currentPan = panZoomInstance.getPan();

    return new Promise<void>((resolve) => {
      this._gsap.to(
        currentPan,
        {
          x: adjustment.x,
          y: adjustment.y,
          duration: duration / 1000,
          ease: "power2.inOut",
          onUpdate: function () {
            const target = this.targets()[0];
            panZoomInstance.pan({ x: target.x, y: target.y });
          },
          onComplete: resolve,
        }
      );
    });
  }

  /**
   * Calculate the pan adjustment needed to make an element visible.
   * Returns null if the element is already fully visible.
   *
   * @param elementBounds - Bounding rectangle of the element in SVG coordinates
   * @param panZoomInstance - The svg-pan-zoom instance
   * @param viewportWidth - Width of the visible viewport
   * @param viewportHeight - Height of the visible viewport
   * @returns New pan coordinates or null if no adjustment needed
   */
  private calculatePrologPan(
    elementBounds: { x: number; y: number; width: number; height: number },
    panZoomInstance: any,
    viewportWidth: number,
    viewportHeight: number
  ): { x: number; y: number } | null {
    const currentPan = panZoomInstance.getPan();
    const currentZoom = panZoomInstance.getZoom();

    // Convert element bounds to viewport coordinates
    const elementLeft = elementBounds.x * currentZoom + currentPan.x;
    const elementRight = (elementBounds.x + elementBounds.width) * currentZoom + currentPan.x;
    const elementTop = elementBounds.y * currentZoom + currentPan.y;
    const elementBottom = (elementBounds.y + elementBounds.height) * currentZoom + currentPan.y;

    // Check if element is fully visible
    const isVisible =
      elementLeft >= 0 &&
      elementRight <= viewportWidth &&
      elementTop >= 0 &&
      elementBottom <= viewportHeight;

    if (isVisible) {
      return null; // Already visible
    }

    // Calculate required adjustment
    let adjustX = 0;
    let adjustY = 0;

    // Adjust X if element extends beyond left or right edge
    if (elementLeft < 0) {
      adjustX = -elementLeft; // Pan right to show left edge
    } else if (elementRight > viewportWidth) {
      adjustX = viewportWidth - elementRight; // Pan left to show right edge
    }

    // Adjust Y if element extends beyond top or bottom edge
    if (elementTop < 0) {
      adjustY = -elementTop; // Pan down to show top edge
    } else if (elementBottom > viewportHeight) {
      adjustY = viewportHeight - elementBottom; // Pan up to show bottom edge
    }

    return {
      x: currentPan.x + adjustX,
      y: currentPan.y + adjustY,
    };
  }

  /**
   * Check if an element is fully visible in the current viewport.
   *
   * @param elementBounds - Bounding rectangle of the element in SVG coordinates
   * @param panZoomInstance - The svg-pan-zoom instance
   * @param viewportWidth - Width of the visible viewport
   * @param viewportHeight - Height of the visible viewport
   * @returns True if element is fully visible, false otherwise
   */
  public isElementVisible(
    elementBounds: { x: number; y: number; width: number; height: number },
    panZoomInstance: any,
    viewportWidth: number,
    viewportHeight: number
  ): boolean {
    const currentPan = panZoomInstance.getPan();
    const currentZoom = panZoomInstance.getZoom();

    // Convert element bounds to viewport coordinates
    const elementLeft = elementBounds.x * currentZoom + currentPan.x;
    const elementRight = (elementBounds.x + elementBounds.width) * currentZoom + currentPan.x;
    const elementTop = elementBounds.y * currentZoom + currentPan.y;
    const elementBottom = (elementBounds.y + elementBounds.height) * currentZoom + currentPan.y;

    // Check if element is fully visible
    return (
      elementLeft >= 0 &&
      elementRight <= viewportWidth &&
      elementTop >= 0 &&
      elementBottom <= viewportHeight
    );
  }

  /**
   * Kill all active animations.
   */
  public killAll(): void {
    this._gsap.killTweensOf("*");
    this._logger.debug("AnimationEngine", "All animations killed");
  }

  /**
   * Get the GSAP instance.
   */
  public getGsap(): any {
    return this._gsap;
  }
}
