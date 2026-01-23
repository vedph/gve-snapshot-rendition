import { CharNode } from "../models";
import { GveRenditionSettings } from "../settings/settings";
import { Logger } from "../core/logger";
import { isLineBreak, isSpace } from "../utils/node-utils";
import { getTextWidth } from "./svg-utils";

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

    // DIAGNOSTIC: Log measurement context details
    const rootDimensions = {
      clientWidth: root.clientWidth,
      clientHeight: root.clientHeight,
      boundingRect: root.getBoundingClientRect(),
    };
    this._logger.info(
      "TextLayout",
      "Setting measurement root - dimensions:",
      rootDimensions
    );

    // DIAGNOSTIC: Compare measurements in document.body vs measurementRoot
    const testChar = "M";
    const bodyWidth = this.measureInDocumentBody(testChar);
    const rootWidth = this.measureInRoot(testChar);
    this._logger.info(
      "TextLayout",
      `DIAGNOSTIC: '${testChar}' width - document.body: ${bodyWidth.toFixed(2)}, measurementRoot: ${rootWidth.toFixed(2)}, diff: ${(rootWidth - bodyWidth).toFixed(2)}`
    );

    // Recalculate space width in the new context
    this._spaceWidth = this.calculateSpaceWidth();
    this._logger.info(
      "TextLayout",
      "Measurement root set, space width recalculated",
      { spaceWidth: this._spaceWidth }
    );
  }

  /**
   * DIAGNOSTIC: Measure text width in document.body for comparison.
   */
  private measureInDocumentBody(text: string): number {
    return getTextWidth(
      text,
      this._settings.fontFamily,
      this._settings.fontSize,
      this._settings.bold,
      this._settings.italic
      // No measurementRoot = uses document.body
    );
  }

  /**
   * DIAGNOSTIC: Measure text width in the measurement root.
   */
  private measureInRoot(text: string): number {
    return getTextWidth(
      text,
      this._settings.fontFamily,
      this._settings.fontSize,
      this._settings.bold,
      this._settings.italic,
      this._measurementRoot
    );
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
   * @param charOffsets - Map of node IDs to their offset overrides (from r_char-offsets feature)
   * @returns Array of character positions
   */
  calculateBaseTextPositions(
    nodes: CharNode[],
    charOffsets?: Map<number, { x?: number; y?: number }>
  ): CharPosition[] {
    this._logger.time("calculateBaseTextPositions");

    const positions: CharPosition[] = [];
    let currentX = this._settings.marginLeft;
    let currentY = this._settings.marginTop + this._settings.fontSize;
    let lineNumber = 0;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      // Check for character offset overrides
      const offset = charOffsets?.get(node.id);
      if (offset) {
        if (offset.x !== undefined) {
          currentX += offset.x;
          this._logger.debug(
            "TextLayout",
            `Applied X offset ${offset.x} to node ${node.id}`
          );
        }
        if (offset.y !== undefined) {
          currentY += offset.y;
          this._logger.debug(
            "TextLayout",
            `Applied Y offset ${offset.y} to node ${node.id}`
          );
        }
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
