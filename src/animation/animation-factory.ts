import { Logger } from '../core/logger';

/**
 * Animation function signature.
 * Receives gsap instance, target element, and root SVG element.
 * Returns a Promise that resolves when animation completes.
 */
export type AnimationFunction = (
  gsap: any,
  targetEl: SVGElement,
  rootEl: SVGElement
) => Promise<void>;

/**
 * Factory for creating animation functions from code strings.
 * This wraps user-provided GSAP animation code into executable functions.
 */
export class AnimationFactory {
  private logger: Logger;
  private gsap: any;

  constructor(gsap: any, logger: Logger) {
    this.gsap = gsap;
    this.logger = logger;
  }

  /**
   * Create an animation function from a code string.
   *
   * @param code - The JavaScript code as a string that uses GSAP
   * @param label - Optional label for debugging
   * @returns An animation function that returns a Promise
   */
  createAnimation(code: string, label?: string): AnimationFunction {
    return async (gsap: any, targetEl: SVGElement, rootEl: SVGElement): Promise<void> => {
      try {
        this.logger.debug('Animation', `Creating animation${label ? ` (${label})` : ''}`, { code });

        // Create a function from the code string
        // The code has access to: gsap, targetEl, rootEl
        const fn = new Function('gsap', 'targetEl', 'rootEl', code);

        // Execute the function
        const result = fn(gsap, targetEl, rootEl);

        // If the result is a GSAP timeline or tween, wait for it to complete
        if (result && typeof result.then === 'function') {
          await result;
        } else if (result && typeof result.eventCallback === 'function') {
          // GSAP tween/timeline - wrap in promise
          await new Promise<void>((resolve) => {
            result.eventCallback('onComplete', resolve);
          });
        }

        this.logger.debug('Animation', `Animation complete${label ? ` (${label})` : ''}`);
      } catch (error) {
        this.logger.error(`Animation error${label ? ` (${label})` : ''}:`, error);
        // Don't throw - allow rendering to continue even if animation fails
      }
    };
  }

  /**
   * Create an animation function from an ID reference.
   * The ID should exist in the animations catalog.
   *
   * @param animationId - The ID of the animation (with or without # prefix)
   * @param animationsCatalog - The catalog of animations from settings
   * @param label - Optional label for debugging
   * @returns An animation function or undefined if not found
   */
  createAnimationFromId(
    animationId: string,
    animationsCatalog: Record<string, string>,
    label?: string
  ): AnimationFunction | undefined {
    // Remove # prefix if present
    const id = animationId.startsWith('#') ? animationId.substring(1) : animationId;

    const code = animationsCatalog[id];
    if (!code) {
      this.logger.warn(`Animation ID "${id}" not found in catalog`);
      return undefined;
    }

    return this.createAnimation(code, label || id);
  }

  /**
   * Resolve an animation property value to an animation function.
   * Handles both direct code strings and ID references.
   *
   * @param animationValue - Either a code string or an ID reference (starting with #)
   * @param animationsCatalog - The catalog of animations from settings
   * @param label - Optional label for debugging
   * @returns An animation function or undefined
   */
  resolveAnimation(
    animationValue: string | undefined,
    animationsCatalog: Record<string, string>,
    label?: string
  ): AnimationFunction | undefined {
    if (!animationValue) return undefined;

    if (animationValue.startsWith('#')) {
      // It's an ID reference
      return this.createAnimationFromId(animationValue, animationsCatalog, label);
    } else {
      // It's direct code
      return this.createAnimation(animationValue, label);
    }
  }

  /**
   * Create a no-op animation that resolves immediately.
   * Used when no animation is specified.
   */
  createNoOpAnimation(): AnimationFunction {
    return async () => {
      // Do nothing, resolve immediately
    };
  }
}
