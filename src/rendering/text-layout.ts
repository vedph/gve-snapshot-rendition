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
  private settings: GveRenditionSettings;
  private logger: Logger;
  private spaceWidth: number;

  constructor(settings: GveRenditionSettings, logger: Logger) {
    this.settings = settings;
    this.logger = logger;

    // Calculate space width based on reference character
    this.spaceWidth = this.calculateSpaceWidth();
  }

  /**
   * Calculate the width of a space character based on reference character.
   */
  private calculateSpaceWidth(): number {
    const refCharWidth = getTextWidth(
      REFERENCE_CHAR,
      this.settings.fontFamily,
      this.settings.fontSize,
      this.settings.bold,
      this.settings.italic
    );

    return refCharWidth * this.settings.spaceWidthFraction;
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
    this.logger.time("calculateBaseTextPositions");

    const positions: CharPosition[] = [];
    let currentX = this.settings.marginLeft;
    let currentY = this.settings.marginTop + this.settings.fontSize;
    let lineNumber = 0;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      // Check for character offset overrides
      const offset = charOffsets?.get(node.id);
      if (offset) {
        if (offset.x !== undefined) {
          currentX += offset.x;
          this.logger.debug(
            "TextLayout",
            `Applied X offset ${offset.x} to node ${node.id}`
          );
        }
        if (offset.y !== undefined) {
          currentY += offset.y;
          this.logger.debug(
            "TextLayout",
            `Applied Y offset ${offset.y} to node ${node.id}`
          );
        }
      }

      if (isLineBreak(node)) {
        // Line break: move to next line
        currentX = this.settings.marginLeft;
        currentY +=
          this.settings.fontSize * this.settings.lineHeight +
          this.settings.lineSpacing;
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

        currentX += this.spaceWidth + this.settings.charSpacing;
      } else {
        // Regular character
        positions.push({
          x: currentX,
          y: currentY,
          nodeId: node.id,
          lineNumber,
        });

        // Calculate character width for next position
        const charWidth = getTextWidth(
          node.data,
          this.settings.fontFamily,
          this.settings.fontSize,
          this.settings.bold,
          this.settings.italic
        );

        currentX += charWidth + this.settings.charSpacing;
      }
    }

    this.logger.debug(
      "TextLayout",
      `Calculated ${positions.length} positions across ${lineNumber + 1} lines`
    );
    this.logger.timeEnd("calculateBaseTextPositions");

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
    this.settings = settings;
    this.spaceWidth = this.calculateSpaceWidth();
  }

  /**
   * Get the computed space width.
   */
  getSpaceWidth(): number {
    return this.spaceWidth;
  }
}
