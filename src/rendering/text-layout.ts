import { CharNode } from "../models";
import { GveRenditionSettings } from "../settings/settings";
import { Logger } from "../core/logger";
import { isLineBreak, isSpace } from "../utils/node-utils";
import { getTextWidth } from "./svg-utils";
import { parseOffset } from "../utils/text-utils";
import { parseCharOffsets } from "../utils/feature-utils";

/**
 * Position information for a character node.
 */
export interface CharPosition {
  x: number;
  y: number;
  nodeId: number;
  lineNumber: number;
}

/**
 * Reference character for calculating space width.
 * This can be changed if needed.
 */
const REFERENCE_CHAR = "m";

/**
 * Text layout calculator.
 * Handles positioning of base text characters, respecting line breaks,
 * spaces, and character offsets.
 */
export class TextLayout {
  private _settings: GveRenditionSettings;
  private _logger: Logger;
  private _spaceWidth: number;

  /**
   * The SVG element used as the measurement context for text width calculations.
   * This ensures measurements happen in the same CSS context as actual rendering,
   * which is critical when the component runs inside frameworks like Angular
   * that may apply global CSS styles affecting font metrics.
   *
   * When this is undefined, measurements fall back to document.body (legacy behavior)
   * which can cause position mismatches if global styles differ from Shadow DOM styles.
   */
  private _measurementRoot?: SVGElement;

  constructor(settings: GveRenditionSettings, logger: Logger) {
    this._settings = settings;
    this._logger = logger;

    // Calculate space width based on reference character
    // Note: This initial calculation uses document.body as fallback.
    // When setMeasurementRoot() is called, space width will be recalculated
    // in the correct CSS context.
    this._spaceWidth = this.calculateSpaceWidth();
  }

  /**
   * Set the measurement root for text width calculations.
   * This should be called with the root SVG element after it's created,
   * before any layout calculations are performed.
   *
   * IMPORTANT: This ensures text measurements happen in the same CSS context
   * as actual rendering (inside Shadow DOM), avoiding position mismatches
   * caused by different font metrics in document.body vs Shadow DOM.
   *
   * @param root - The SVG element to use as measurement context
   */
  setMeasurementRoot(root: SVGElement): void {
    this._measurementRoot = root;
    // Recalculate space width in the new context
    this._spaceWidth = this.calculateSpaceWidth();
  }

  /**
   * Calculate the width of a space character based on reference character.
   */
  private calculateSpaceWidth(): number {
    const refCharWidth = getTextWidth(
      REFERENCE_CHAR,
      this._settings.fontFamily,
      this._settings.fontSize,
      this._settings.bold,
      this._settings.italic,
      this._measurementRoot // Use measurement root for consistent font metrics
    );

    return refCharWidth * this._settings.spaceWidthFraction;
  }

  /**
   * Calculate positions for all base text nodes.
   *
   * @param nodes - The character nodes to position
   * @param charOffsets - Map of node IDs to their offset overrides (from r_char-offsets feature).
   *   Offset values may be plain numbers (px) or strings with units "tw"/"th"
   *   (average character width / height of the current font).
   * @returns Array of character positions
   */
  calculateBaseTextPositions(
    nodes: CharNode[],
    charOffsets?: Map<number, { x?: number | string; y?: number | string }>
  ): CharPosition[] {
    this._logger.time("calculateBaseTextPositions");

    // Compute the average character dimensions used to resolve "tw" and "th" units.
    // tw = average character width (width of the reference character 'm' in the current font)
    // th = average character height  (≈ font size, which is the em-square in CSS/SVG pixels)
    const avgCharWidth = getTextWidth(
      REFERENCE_CHAR,
      this._settings.fontFamily,
      this._settings.fontSize,
      this._settings.bold,
      this._settings.italic,
      this._measurementRoot
    );
    const avgCharHeight = this._settings.fontSize;

    const positions: CharPosition[] = [];
    let currentX = this._settings.marginLeft;
    let currentY = this._settings.marginTop + this._settings.fontSize;
    let lineNumber = 0;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      // Resolve character offset for this node.
      // Priority: r_char-offsets (init feature) is the base; a per-node r_char-offset
      // feature on the node itself can supplement or override it.
      let offsetX: number | string | undefined = charOffsets?.get(node.id)?.x;
      let offsetY: number | string | undefined = charOffsets?.get(node.id)?.y;

      // Check per-node r_char-offset feature (singular)
      const nodeOffsetFeature = node.features?.find(
        (f) => f.name === "r_char-offset"
      );
      if (nodeOffsetFeature) {
        const nodeOffsetMap = parseCharOffsets(nodeOffsetFeature.value);
        const nodeOffset = nodeOffsetMap.get(node.id);
        if (nodeOffset) {
          // Per-node feature overrides the init-feature value when both are present
          if (nodeOffset.x !== undefined) offsetX = nodeOffset.x;
          if (nodeOffset.y !== undefined) offsetY = nodeOffset.y;
        }
      }

      // Apply resolved offsets (resolving tw/th units against avg char dimensions)
      if (offsetX !== undefined) {
        const resolvedX = parseOffset(offsetX, avgCharHeight, avgCharWidth);
        currentX += resolvedX;
        this._logger.debug(
          "TextLayout",
          `Applied X offset ${offsetX} (→${resolvedX}px) to node ${node.id}`
        );
      }
      if (offsetY !== undefined) {
        const resolvedY = parseOffset(offsetY, avgCharHeight, avgCharWidth);
        currentY += resolvedY;
        this._logger.debug(
          "TextLayout",
          `Applied Y offset ${offsetY} (→${resolvedY}px) to node ${node.id}`
        );
      }

      if (isLineBreak(node)) {
        // Line break: move to next line
        currentX = this._settings.marginLeft;
        currentY +=
          this._settings.fontSize * this._settings.lineHeight +
          this._settings.lineSpacing;
        lineNumber++;

        // Store position even for line breaks (though they won't be rendered)
        positions.push({
          x: currentX,
          y: currentY,
          nodeId: node.id,
          lineNumber,
        });
      } else if (isSpace(node)) {
        // Space: advance by space width
        positions.push({
          x: currentX,
          y: currentY,
          nodeId: node.id,
          lineNumber,
        });

        currentX += this._spaceWidth + this._settings.charSpacing;
      } else {
        // Regular character
        positions.push({
          x: currentX,
          y: currentY,
          nodeId: node.id,
          lineNumber,
        });

        // Calculate character width for next position
        // Use measurement root for consistent font metrics with actual rendering
        const charWidth = getTextWidth(
          node.data,
          this._settings.fontFamily,
          this._settings.fontSize,
          this._settings.bold,
          this._settings.italic,
          this._measurementRoot
        );

        currentX += charWidth + this._settings.charSpacing;
      }
    }

    this._logger.debug(
      "TextLayout",
      `Calculated ${positions.length} positions across ${lineNumber + 1} lines`
    );
    this._logger.timeEnd("calculateBaseTextPositions");

    return positions;
  }

  /**
   * Calculate position for a single additional text node.
   * Additional text positioning is driven by rendition features.
   *
   * @param referencePosition - The position to use as reference (e.g., from RBR)
   * @param position - Position type (n, ne, e, se, s, sw, w, nw, o)
   * @param offsetX - X offset (can be number or string like "0.5th")
   * @param offsetY - Y offset (can be number or string like "0.5tw")
   * @param refBounds - Reference bounding rectangle dimensions
   * @returns Calculated position
   */
  calculateAdditionalTextPosition(
    referencePosition: { x: number; y: number },
    position: string,
    offsetX: number,
    offsetY: number,
    refBounds: { width: number; height: number }
  ): { x: number; y: number } {
    let x = referencePosition.x;
    let y = referencePosition.y;

    // Apply position relative to reference bounds
    switch (position) {
      case "n": // North (top center)
        x += refBounds.width / 2;
        y -= refBounds.height / 2;
        break;
      case "ne": // Northeast (top right)
        x += refBounds.width;
        y -= refBounds.height / 2;
        break;
      case "e": // East (middle right)
        x += refBounds.width;
        break;
      case "se": // Southeast (bottom right)
        x += refBounds.width;
        y += refBounds.height / 2;
        break;
      case "s": // South (bottom center)
        x += refBounds.width / 2;
        y += refBounds.height / 2;
        break;
      case "sw": // Southwest (bottom left)
        y += refBounds.height / 2;
        break;
      case "w": // West (middle left)
        // x and y stay at reference position (left middle)
        break;
      case "nw": // Northwest (top left)
        y -= refBounds.height / 2;
        break;
      case "o": // Origin (center)
        x += refBounds.width / 2;
        break;
    }

    // Apply offsets
    x += offsetX;
    y += offsetY;

    return { x, y };
  }

  /**
   * Get the line number for a given node ID from positions.
   */
  getLineNumber(positions: CharPosition[], nodeId: number): number {
    const pos = positions.find((p) => p.nodeId === nodeId);
    return pos?.lineNumber ?? 0;
  }

  /**
   * Get all positions for a specific line.
   */
  getLinePositions(
    positions: CharPosition[],
    lineNumber: number
  ): CharPosition[] {
    return positions.filter((p) => p.lineNumber === lineNumber);
  }

  /**
   * Update settings and recalculate space width.
   */
  updateSettings(settings: GveRenditionSettings): void {
    this._settings = settings;
    this._spaceWidth = this.calculateSpaceWidth();
  }

  /**
   * Get the computed space width.
   */
  getSpaceWidth(): number {
    return this._spaceWidth;
  }
}
