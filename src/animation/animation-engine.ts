import { Logger } from '../core/logger';
import { AnimationFactory, AnimationFunction } from './animation-factory';

/**
 * Animation engine that wraps GSAP and provides a consistent API.
 */
export class AnimationEngine {
  private gsap: any;
  private logger: Logger;
  private factory: AnimationFactory;

  constructor(gsap: any, logger: Logger) {
    this.gsap = gsap;
    this.logger = logger;
    this.factory = new AnimationFactory(gsap, logger);
  }

  /**
   * Get the animation factory.
   */
  getFactory(): AnimationFactory {
    return this.factory;
  }

  /**
   * Animate an element with an animation function.
   *
   * @param element - The target SVG element
   * @param animation - The animation function to execute
   * @param rootElement - The root SVG element
   * @returns Promise that resolves when animation completes
   */
  async animate(
    element: SVGElement,
    animation: AnimationFunction,
    rootElement: SVGElement
  ): Promise<void> {
    try {
      await animation(this.gsap, element, rootElement);
    } catch (error) {
      this.logger.error('Animation execution error:', error);
    }
  }

  /**
   * Animate multiple elements with spreading transitions.
   * All elements are animated in parallel with GSAP.
   *
   * @param shifts - Map of element IDs to their shift amounts {x, y}
   * @param duration - Duration in milliseconds
   * @param rootElement - The root SVG element containing all elements
   * @returns Promise that resolves when all animations complete
   */
  async animateSpreading(
    shifts: Map<string, { x: number; y: number }>,
    duration: number,
    rootElement: SVGElement
  ): Promise<void> {
    if (shifts.size === 0) {
      this.logger.debug('AnimationEngine', 'No elements to spread');
      return;
    }

    this.logger.debug('AnimationEngine', `Animating spreading for ${shifts.size} elements`);
    this.logger.time('animateSpreading');

    const timeline = this.gsap.timeline();

    for (const [elementId, shift] of shifts.entries()) {
      const element = rootElement.querySelector(`#${elementId}`);
      if (!element) {
        this.logger.warn(`Element ${elementId} not found for spreading animation`);
        continue;
      }

      // Get current transform
      const currentTransform = element.getAttribute('transform') || '';
      const translateMatch = currentTransform.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);

      let currentX = 0;
      let currentY = 0;

      if (translateMatch) {
        currentX = parseFloat(translateMatch[1]);
        currentY = parseFloat(translateMatch[2]);
      }

      const newX = currentX + shift.x;
      const newY = currentY + shift.y;

      // Add to timeline (animations run in parallel with position 0)
      timeline.to(
        element,
        {
          attr: { transform: `translate(${newX}, ${newY})` },
          duration: duration / 1000, // Convert ms to seconds for GSAP
          ease: 'power2.inOut',
        },
        0 // Start time: 0 means all animations start together
      );
    }

    // Wait for timeline to complete
    await new Promise<void>((resolve) => {
      timeline.eventCallback('onComplete', resolve);
    });

    this.logger.timeEnd('animateSpreading');
  }

  /**
   * Fade in multiple elements (used for hilites).
   *
   * @param elements - Array of elements to fade in
   * @param duration - Duration in milliseconds
   * @returns Promise that resolves when animation completes
   */
  async fadeIn(elements: SVGElement[], duration: number): Promise<void> {
    if (elements.length === 0) return;

    this.logger.debug('AnimationEngine', `Fading in ${elements.length} elements`);

    return new Promise<void>((resolve) => {
      this.gsap.fromTo(
        elements,
        { opacity: 0 },
        {
          opacity: 1,
          duration: duration / 1000,
          ease: 'power2.inOut',
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
  async fadeOut(elements: SVGElement[], duration: number): Promise<void> {
    if (elements.length === 0) return;

    this.logger.debug('AnimationEngine', `Fading out ${elements.length} elements`);

    return new Promise<void>((resolve) => {
      this.gsap.to(elements, {
        opacity: 0,
        duration: duration / 1000,
        ease: 'power2.inOut',
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
  async animatePanZoom(
    panZoomInstance: any,
    newPan: { x: number; y: number },
    newZoom: number,
    duration: number
  ): Promise<void> {
    this.logger.debug('AnimationEngine', 'Animating pan/zoom transition', { newPan, newZoom });

    const currentPan = panZoomInstance.getPan();
    const currentZoom = panZoomInstance.getZoom();

    return new Promise<void>((resolve) => {
      this.gsap.to(
        { pan: currentPan, zoom: currentZoom },
        {
          pan: newPan,
          zoom: newZoom,
          duration: duration / 1000,
          ease: 'power2.inOut',
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
   * Kill all active animations.
   */
  killAll(): void {
    this.gsap.killTweensOf('*');
    this.logger.debug('AnimationEngine', 'All animations killed');
  }

  /**
   * Get the GSAP instance.
   */
  getGsap(): any {
    return this.gsap;
  }
}
