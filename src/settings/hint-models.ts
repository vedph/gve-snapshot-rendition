/**
 * Models for operation hints.
 */

/**
 * Hint position relative to the reference bounding rectangle.
 */
export type HintPosition =
  | "n" // North (top center)
  | "ne" // Northeast (top right)
  | "e" // East (middle right)
  | "se" // Southeast (bottom right)
  | "s" // South (bottom center)
  | "sw" // Southwest (bottom left)
  | "w" // West (middle left)
  | "nw" // Northwest (top left)
  | "o"; // Origin (center)

/**
 * An editing operation's hint.
 * Hints represent the visual counterpart of an operation.
 */
export interface OperationHint {
  /**
   * SVG code for hint's visuals.
   * Always has a root `g` element.
   * May contain placeholders in {{name}} format.
   */
  svg: string;

  /**
   * Relative position for the hint with respect to the reference bounding rectangle.
   */
  position: HintPosition;

  /**
   * X offset from the computed position.
   * Can be:
   * - A number (pixels)
   * - A string with suffix: "0.5th" (half text height), "0.5tw" (half text width)
   */
  offsetX: number | string;

  /**
   * Y offset from the computed position.
   * Can be:
   * - A number (pixels)
   * - A string with suffix: "0.5th" (half text height), "0.5tw" (half text width)
   */
  offsetY: number | string;

  /**
   * Horizontal scale: 1 = match bounds width, 1.1 = 110% of bounds width.
   * Default: 1
   */
  scaleX: number;

  /**
   * Vertical scale: 1 = match bounds height, 1.1 = 110% of bounds height.
   * Default: 1
   */
  scaleY: number;

  /**
   * Rotation in degrees. 0 = no rotation.
   * Rotation is applied with reference to the origin of the reference bounding rectangle.
   */
  rotation: number;

  /**
   * Whether this hint is "solid" and requires spreading.
   * Default: false (most hints are overlays that don't need spreading)
   */
  solid?: boolean;

  /**
   * JS code for animating the hint's entrance via GSAP.
   * If it starts with "#", it references an animation from settings.animations.
   * The code receives parameters: (gsap, hintEl, rootEl)
   */
  animation?: string;

  /**
   * A span of base text with format IDxN where ID=node ID and N=count of chars,
   * to be used as the RBR instead of the default RBR.
   * Used for displaced hints.
   */
  displacedRefSpan?: string;
}
