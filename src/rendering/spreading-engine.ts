import { BoundsCache, BoundingRect } from "./bounds-cache";
import { Logger } from "../core/logger";

/**
 * Result of spreading calculation.
 */
export interface SpreadingResult {
  /** Map of element ID to its horizontal shift amount */
  horizontalShifts: Map<string, number>;

  /** Map of element ID to its vertical shift amount */
  verticalShifts: Map<string, number>;

  /** Whether any spreading was needed */
  hasShifts: boolean;
}

/**
 * Engine for calculating spreading (making room for new elements).
 * Implements the "stone in pond" ripple effect to preserve layout.
 */
export class SpreadingEngine {
  private boundsCache: BoundsCache;
  private logger: Logger;

  constructor(boundsCache: BoundsCache, logger: Logger) {
    this.boundsCache = boundsCache;
    this.logger = logger;
  }

  /**
   * Calculate spreading required to make room for a new element.
   *
   * @param newElementBounds - Bounds of the element to be added
   * @param excludeIds - Element IDs to exclude from shifting (e.g., the new element itself)
   * @returns Spreading result with shift amounts for each affected element
   */
  calculateSpreading(
    newElementBounds: BoundingRect,
    excludeIds: string[] = []
  ): SpreadingResult {
    this.logger.time("calculateSpreading");
    this.logger.debug(
      "Spreading",
      "Calculating spreading for new element",
      newElementBounds
    );

    const horizontalShifts = new Map<string, number>();
    const verticalShifts = new Map<string, number>();

    // Get all existing elements
    const allIds = this.boundsCache
      .getAllIds()
      .filter((id) => !excludeIds.includes(id));

    // Calculate horizontal spreading
    const hShifts = this.calculateHorizontalSpreading(newElementBounds, allIds);
    hShifts.forEach((shift, id) => horizontalShifts.set(id, shift));

    // Calculate vertical spreading
    const vShifts = this.calculateVerticalSpreading(newElementBounds, allIds);
    vShifts.forEach((shift, id) => verticalShifts.set(id, shift));

    const hasShifts = horizontalShifts.size > 0 || verticalShifts.size > 0;

    this.logger.debug("Spreading", "Spreading calculation complete", {
      horizontalShifts: horizontalShifts.size,
      verticalShifts: verticalShifts.size,
      hasShifts,
    });
    this.logger.timeEnd("calculateSpreading");

    return { horizontalShifts, verticalShifts, hasShifts };
  }

  /**
   * Calculate horizontal spreading.
   * Elements overlapping on the left are shifted left, those on the right are shifted right.
   */
  private calculateHorizontalSpreading(
    newBounds: BoundingRect,
    elementIds: string[]
  ): Map<string, number> {
    const shifts = new Map<string, number>();

    let maxLeftOverlap = 0;
    let maxRightOverlap = 0;

    // Find all overlaps
    const leftElements: string[] = [];
    const rightElements: string[] = [];

    for (const id of elementIds) {
      const bounds = this.boundsCache.get(id);
      if (!bounds) continue;

      // Check for horizontal overlap
      const horizontalOverlap = this.calculateHorizontalOverlap(
        newBounds,
        bounds
      );

      if (horizontalOverlap > 0) {
        // Determine which side this element is on
        if (bounds.right > newBounds.x && bounds.x < newBounds.x) {
          // Element overlaps from the left
          leftElements.push(id);
          maxLeftOverlap = Math.max(maxLeftOverlap, horizontalOverlap);
        } else if (
          bounds.x < newBounds.right &&
          bounds.right > newBounds.right
        ) {
          // Element overlaps from the right
          rightElements.push(id);
          maxRightOverlap = Math.max(maxRightOverlap, horizontalOverlap);
        }
      }
    }

    // Apply shifts
    if (maxLeftOverlap > 0) {
      for (const id of leftElements) {
        shifts.set(id, -maxLeftOverlap); // Shift left (negative)
        this.logger.debug(
          "Spreading",
          `Element ${id} shifts left by ${maxLeftOverlap}px`
        );
      }
    }

    if (maxRightOverlap > 0) {
      for (const id of rightElements) {
        shifts.set(id, maxRightOverlap); // Shift right (positive)
        this.logger.debug(
          "Spreading",
          `Element ${id} shifts right by ${maxRightOverlap}px`
        );
      }
    }

    return shifts;
  }

  /**
   * Calculate vertical spreading.
   * Elements overlapping from above are shifted up, those from below are shifted down.
   */
  private calculateVerticalSpreading(
    newBounds: BoundingRect,
    elementIds: string[]
  ): Map<string, number> {
    const shifts = new Map<string, number>();

    let maxTopOverlap = 0;
    let maxBottomOverlap = 0;

    // Find all overlaps
    const topElements: string[] = [];
    const bottomElements: string[] = [];

    for (const id of elementIds) {
      const bounds = this.boundsCache.get(id);
      if (!bounds) continue;

      // Check for vertical overlap
      const verticalOverlap = this.calculateVerticalOverlap(newBounds, bounds);

      if (verticalOverlap > 0) {
        // Determine which side this element is on
        if (bounds.bottom > newBounds.y && bounds.y < newBounds.y) {
          // Element overlaps from above
          topElements.push(id);
          maxTopOverlap = Math.max(maxTopOverlap, verticalOverlap);
        } else if (
          bounds.y < newBounds.bottom &&
          bounds.bottom > newBounds.bottom
        ) {
          // Element overlaps from below
          bottomElements.push(id);
          maxBottomOverlap = Math.max(maxBottomOverlap, verticalOverlap);
        }
      }
    }

    // Apply shifts
    if (maxTopOverlap > 0) {
      for (const id of topElements) {
        shifts.set(id, -maxTopOverlap); // Shift up (negative)
        this.logger.debug(
          "Spreading",
          `Element ${id} shifts up by ${maxTopOverlap}px`
        );
      }
    }

    if (maxBottomOverlap > 0) {
      for (const id of bottomElements) {
        shifts.set(id, maxBottomOverlap); // Shift down (positive)
        this.logger.debug(
          "Spreading",
          `Element ${id} shifts down by ${maxBottomOverlap}px`
        );
      }
    }

    return shifts;
  }

  /**
   * Calculate the horizontal overlap between two bounding rectangles.
   * Returns 0 if there is no overlap.
   */
  private calculateHorizontalOverlap(
    rect1: BoundingRect,
    rect2: BoundingRect
  ): number {
    // Check if rectangles overlap horizontally
    const overlapLeft = Math.max(rect1.x, rect2.x);
    const overlapRight = Math.min(rect1.right, rect2.right);

    if (overlapLeft < overlapRight) {
      return overlapRight - overlapLeft;
    }

    return 0;
  }

  /**
   * Calculate the vertical overlap between two bounding rectangles.
   * Returns 0 if there is no overlap.
   */
  private calculateVerticalOverlap(
    rect1: BoundingRect,
    rect2: BoundingRect
  ): number {
    // Check if rectangles overlap vertically
    const overlapTop = Math.max(rect1.y, rect2.y);
    const overlapBottom = Math.min(rect1.bottom, rect2.bottom);

    if (overlapTop < overlapBottom) {
      return overlapBottom - overlapTop;
    }

    return 0;
  }

  /**
   * Check if two bounding rectangles overlap.
   */
  checkOverlap(rect1: BoundingRect, rect2: BoundingRect): boolean {
    return !(
      (
        rect1.right <= rect2.x || // rect1 is to the left of rect2
        rect1.x >= rect2.right || // rect1 is to the right of rect2
        rect1.bottom <= rect2.y || // rect1 is above rect2
        rect1.y >= rect2.bottom
      ) // rect1 is below rect2
    );
  }

  /**
   * Find all elements that overlap with given bounds.
   */
  findOverlappingElements(
    bounds: BoundingRect,
    excludeIds: string[] = []
  ): string[] {
    const overlapping: string[] = [];

    for (const id of this.boundsCache.getAllIds()) {
      if (excludeIds.includes(id)) continue;

      const elementBounds = this.boundsCache.get(id);
      if (!elementBounds) continue;

      if (this.checkOverlap(bounds, elementBounds)) {
        overlapping.push(id);
      }
    }

    return overlapping;
  }
}
