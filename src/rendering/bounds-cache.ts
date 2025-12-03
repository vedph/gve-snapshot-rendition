import { Logger } from "../core/logger";

/**
 * Bounding rectangle with position and dimensions.
 */
export interface BoundingRect {
  x: number; // Left edge
  y: number; // Top edge
  width: number;
  height: number;
  right: number; // Right edge (x + width)
  bottom: number; // Bottom edge (y + height)
}

/**
 * Cache for storing bounding rectangles of SVG elements.
 * This avoids expensive getBBox() calls and improves spreading performance.
 */
export class BoundsCache {
  private _cache: Map<string, BoundingRect>;
  private _logger: Logger;

  constructor(logger: Logger) {
    this._cache = new Map();
    this._logger = logger;
  }

  /**
   * Add or update a bounding rectangle for an element.
   */
  set(elementId: string, bounds: DOMRect | SVGRect): void {
    const rect: BoundingRect = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      right: bounds.x + bounds.width,
      bottom: bounds.y + bounds.height,
    };

    this._cache.set(elementId, rect);
    this._logger.debug("BoundsCache", `Cached bounds for ${elementId}`, rect);
  }

  /**
   * Get the bounding rectangle for an element.
   */
  get(elementId: string): BoundingRect | undefined {
    return this._cache.get(elementId);
  }

  /**
   * Check if an element's bounds are cached.
   */
  has(elementId: string): boolean {
    return this._cache.has(elementId);
  }

  /**
   * Remove bounds for an element.
   */
  delete(elementId: string): void {
    this._cache.delete(elementId);
  }

  /**
   * Clear all cached bounds.
   */
  clear(): void {
    this._cache.clear();
    this._logger.debug("BoundsCache", "Cache cleared");
  }

  /**
   * Get all cached element IDs.
   */
  getAllIds(): string[] {
    return Array.from(this._cache.keys());
  }

  /**
   * Get all cached bounds.
   */
  getAllBounds(): BoundingRect[] {
    return Array.from(this._cache.values());
  }

  /**
   * Update bounds for an element by ID from the DOM.
   * Returns true if successful, false if element not found.
   */
  updateFromElement(element: SVGElement): boolean {
    const id = element.getAttribute("id");
    if (!id) {
      this._logger.warn("Attempted to cache bounds for element without id");
      return false;
    }

    try {
      const bbox = (element as any).getBBox();
      this.set(id, bbox);
      return true;
    } catch (error) {
      this._logger.warn(`Failed to get bounds for element ${id}`, error);
      return false;
    }
  }

  /**
   * Get the bounding rectangle that encloses multiple elements.
   */
  getUnionBounds(elementIds: string[]): BoundingRect | undefined {
    if (elementIds.length === 0) return undefined;

    const bounds = elementIds
      .map((id) => this.get(id))
      .filter((b) => b !== undefined) as BoundingRect[];

    if (bounds.length === 0) return undefined;

    const minX = Math.min(...bounds.map((b) => b.x));
    const minY = Math.min(...bounds.map((b) => b.y));
    const maxRight = Math.max(...bounds.map((b) => b.right));
    const maxBottom = Math.max(...bounds.map((b) => b.bottom));

    return {
      x: minX,
      y: minY,
      width: maxRight - minX,
      height: maxBottom - minY,
      right: maxRight,
      bottom: maxBottom,
    };
  }

  /**
   * Get the number of cached items.
   */
  size(): number {
    return this._cache.size;
  }
}
