import { CharNode } from "../models";
import { GveRenditionSettings } from "../settings/settings";
import { Logger } from "../core/logger";
import { AnimationEngine } from "../animation/animation-engine";
import { BoundsCache, BoundingRect } from "./bounds-cache";
import { SpreadingEngine } from "./spreading-engine";
import { TextLayout, CharPosition } from "./text-layout";
import { FeatureResolver, RenditionConfig } from "./feature-resolver";
import { isLineBreak, isSpace, getNodeSpan } from "../utils/node-utils";
import {
  createTextElement,
  applyTextStyle,
  getSafeBBox,
  createLine,
  getTextWidth,
} from "./svg-utils";
import { parseOffset } from "../utils/text-utils";

/**
 * Text renderer handles rendering of base text and additional text.
 */
export class TextRenderer {
  private _settings: GveRenditionSettings;
  private _logger: Logger;
  private _animationEngine: AnimationEngine;
  private _boundsCache: BoundsCache;
  private _spreadingEngine: SpreadingEngine;
  private _textLayout: TextLayout;
  private _featureResolver: FeatureResolver;

  constructor(
    settings: GveRenditionSettings,
    logger: Logger,
    animationEngine: AnimationEngine,
    boundsCache: BoundsCache,
    spreadingEngine: SpreadingEngine
  ) {
    this._settings = settings;
    this._logger = logger;
    this._animationEngine = animationEngine;
    this._boundsCache = boundsCache;
    this._spreadingEngine = spreadingEngine;
    this._textLayout = new TextLayout(settings, logger);
    this._featureResolver = new FeatureResolver(logger);
  }

  /**
   * Render base text (v0).
   *
   * @param nodes - Character nodes to render
   * @param rootSvg - Root SVG element
   * @param charOffsets - Optional character offset overrides
   * @returns Promise that resolves when rendering completes
   */
  public async renderBaseText(
    nodes: CharNode[],
    rootSvg: SVGElement,
    charOffsets?: Map<number, { x?: number; y?: number }>
  ): Promise<void> {
    this._logger.time("renderBaseText");
    this._logger.info(`Rendering ${nodes.length} base text characters`);

    const positions = this._textLayout.calculateBaseTextPositions(
      nodes,
      charOffsets
    );

    // Get animation function if specified
    const animationFn = this._settings.charAnimationId
      ? this._animationEngine
          .getFactory()
          .resolveAnimation(
            `#${this._settings.charAnimationId}`,
            this._settings.animations,
            "char"
          )
      : undefined;
    if (!animationFn) {
      this._logger.debug(
        "TextRenderer",
        "No character animation function specified"
      );
    }

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const pos = positions[i];

      // Skip rendering for line breaks and spaces (they affect layout but aren't visible)
      if (isLineBreak(node) || isSpace(node)) {
        continue;
      }

      // Skip nodes that have opid feature - they'll be rendered by operations
      const opidFeature = node.features?.find((f) => f.name === "opid");
      if (opidFeature) {
        continue;
      }

      await this.renderCharacter(node, pos, rootSvg, "v0", animationFn);
    }

    this._logger.timeEnd("renderBaseText");
  }

  /**
   * Render a single character node.
   */
  private async renderCharacter(
    node: CharNode,
    position: CharPosition,
    rootSvg: SVGElement,
    versionTag: string,
    animationFn?: (
      gsap: any,
      targetEl: SVGElement,
      rootEl: SVGElement
    ) => Promise<void>
  ): Promise<void> {
    const textEl = createTextElement(node.data, {
      id: `n_${node.id}`,
      class: `node ${versionTag}`,
      x: position.x,
      y: position.y,
    });

    // Apply default styling
    applyTextStyle(textEl, {
      fontFamily: this._settings.fontFamily,
      fontSize: this._settings.fontSize,
      foreColor: this._settings.foreColor,
      backColor: this._settings.backColor,
      italic: this._settings.italic,
      bold: this._settings.bold,
    });

    rootSvg.appendChild(textEl);

    // Cache bounds
    const bbox = getSafeBBox(textEl);
    this._boundsCache.set(`n_${node.id}`, bbox);

    // Animate if function provided
    if (animationFn) {
      // Set initial opacity to 0 for animation
      textEl.setAttribute("opacity", "0");
      await this._animationEngine.animate(textEl, animationFn, rootSvg);
    }
  }

  /**
   * Render additional text added by operations.
   *
   * @param nodes - Nodes to render
   * @param rootSvg - Root SVG element
   * @param config - Rendition configuration
   * @param versionTag - Version tag for class
   * @param referenceNodes - Reference nodes for RBR calculation
   * @param allBaseNodes - All base text nodes (for displaced span)
   * @returns Promise that resolves when rendering completes
   */
  public async renderAdditionalText(
    nodes: CharNode[],
    rootSvg: SVGElement,
    config: RenditionConfig,
    versionTag: string,
    referenceNodes: CharNode[],
    allBaseNodes: CharNode[]
  ): Promise<void> {
    this._logger.time(`renderAdditionalText-${versionTag}`);
    this._logger.info(
      `Rendering ${nodes.length} additional text characters for ${versionTag}`
    );

    if (nodes.length === 0) {
      this._logger.warn("No nodes to render");
      return;
    }

    // 1. Calculate RBR (or use displaced span if specified)
    let rbrs: BoundingRect[];
    if (config.textDisplacedSpan) {
      const nodes = getNodeSpan(
        allBaseNodes,
        config.textDisplacedSpan.nodeId,
        config.textDisplacedSpan.count
      );
      rbrs = this.calculateRBRs(nodes);
    } else {
      rbrs = this.calculateRBRs(referenceNodes);
    }

    if (rbrs.length === 0) {
      this._logger.warn("No RBRs calculated for additional text, skipping");
      return;
    }

    // Use first RBR for positioning (additional text doesn't repeat per RBR)
    const rbr = rbrs[0];

    this._logger.debug("TextRenderer", `Using RBR for positioning`, rbr);

    // 2. Calculate text position based on r_text-position + offsets
    const position = config.textPosition || "o"; // Default to origin if not specified
    const targetPos = this.calculateTargetPosition(position, rbr);

    const offsetX = parseOffset(config.textOffsetX || 0, rbr.height, rbr.width);
    const offsetY = parseOffset(config.textOffsetY || 0, rbr.height, rbr.width);

    const baseX = targetPos.x + offsetX;
    const baseY = targetPos.y + offsetY;

    this._logger.debug("TextRenderer", `Text position calculated`, {
      position,
      targetPos,
      offsets: { x: offsetX, y: offsetY },
      base: { x: baseX, y: baseY },
    });

    // 3. Calculate positions for each character
    const positions = this.calculateAdditionalTextPositions(
      nodes,
      baseX,
      baseY
    );

    // 4. Apply spreading (additional text is always solid)
    // We need to calculate the bounding rectangle for all the text first
    const textBounds = this.calculateTextBounds(nodes, positions);

    if (textBounds) {
      this._logger.debug(
        "TextRenderer",
        `Applying spreading for additional text`,
        textBounds
      );

      const spreading = this._spreadingEngine.calculateSpreading(textBounds, [
        `text-group-${versionTag}`,
      ]);

      if (spreading.hasShifts) {
        // Combine horizontal and vertical shifts
        const combinedShifts = new Map<string, { x: number; y: number }>();
        const allIds = new Set([
          ...spreading.horizontalShifts.keys(),
          ...spreading.verticalShifts.keys(),
        ]);

        for (const id of allIds) {
          combinedShifts.set(id, {
            x: spreading.horizontalShifts.get(id) || 0,
            y: spreading.verticalShifts.get(id) || 0,
          });
        }

        // Animate spreading
        await this._animationEngine.animateSpreading(
          combinedShifts,
          this._settings.spreadTime,
          rootSvg
        );

        // Update cached bounds for shifted elements
        for (const id of allIds) {
          const element = rootSvg.querySelector(`#${id}`);
          if (element) {
            this._boundsCache.updateFromElement(element as SVGElement);
          }
        }
      }
    }

    // 5. Get animation function if specified
    const animationFn = this._settings.charAnimationId
      ? this._animationEngine
          .getFactory()
          .resolveAnimation(
            `#${this._settings.charAnimationId}`,
            this._settings.animations,
            "char"
          )
      : undefined;

    // 6. Render each character with features
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const pos = positions[i];

      // Skip rendering for line breaks and spaces
      if (isLineBreak(node) || isSpace(node)) {
        continue;
      }

      await this.renderCharacter(node, pos, rootSvg, versionTag, animationFn);
    }

    // 7. Draw borders if r_border specified
    if (config.border && textBounds) {
      await this.drawBorder(
        config.border.edges,
        config.border.thickness,
        config.border.padding,
        config.border.type,
        config.border.color,
        textBounds,
        rootSvg,
        versionTag
      );
    }

    this._logger.timeEnd(`renderAdditionalText-${versionTag}`);
  }

  /**
   * Calculate positions for additional text characters.
   * Additional text flows left to right from the base position.
   */
  private calculateAdditionalTextPositions(
    nodes: CharNode[],
    baseX: number,
    baseY: number
  ): CharPosition[] {
    const positions: CharPosition[] = [];
    let currentX = baseX;
    const currentY = baseY;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      if (isLineBreak(node)) {
        // Line breaks in additional text just get stored but don't render
        positions.push({
          x: currentX,
          y: currentY,
          nodeId: node.id,
          lineNumber: 0,
        });
      } else if (isSpace(node)) {
        // Space: advance by space width
        const spaceWidth = this._settings.fontSize * 0.33;
        positions.push({
          x: currentX,
          y: currentY,
          nodeId: node.id,
          lineNumber: 0,
        });
        currentX += spaceWidth + this._settings.charSpacing;
      } else {
        // Regular character
        positions.push({
          x: currentX,
          y: currentY,
          nodeId: node.id,
          lineNumber: 0,
        });

        // Calculate character width for next position
        const charWidth = getTextWidth(
          node.data,
          this._settings.fontFamily,
          this._settings.fontSize,
          this._settings.bold,
          this._settings.italic
        );

        currentX += charWidth + this._settings.charSpacing;
      }
    }

    return positions;
  }

  /**
   * Calculate RBRs from reference nodes.
   * Nodes on different lines create separate RBRs.
   */
  private calculateRBRs(nodes: CharNode[]): BoundingRect[] {
    if (nodes.length === 0) return [];

    const rbrs: BoundingRect[] = [];
    const nodeElementIds = nodes.map((n) => `n_${n.id}`);

    // Group nodes by line by checking their Y coordinates
    const lineGroups: string[][] = [];
    let currentLineGroup: string[] = [];
    let lastY: number | null = null;

    for (const elementId of nodeElementIds) {
      const bounds = this._boundsCache.get(elementId);
      if (!bounds) {
        this._logger.warn(`Bounds not found for node element ${elementId}`);
        continue;
      }

      // If Y coordinate significantly different, start new line group
      if (lastY !== null && Math.abs(bounds.y - lastY) > 5) {
        if (currentLineGroup.length > 0) {
          lineGroups.push([...currentLineGroup]);
          currentLineGroup = [];
        }
      }

      currentLineGroup.push(elementId);
      lastY = bounds.y;
    }

    // Add last group
    if (currentLineGroup.length > 0) {
      lineGroups.push(currentLineGroup);
    }

    // Calculate RBR for each line group
    for (const group of lineGroups) {
      const rbr = this._boundsCache.getUnionBounds(group);
      if (rbr) {
        rbrs.push(rbr);
      }
    }

    return rbrs;
  }

  /**
   * Calculate target position on the RBR based on position type.
   */
  private calculateTargetPosition(
    position: string,
    rbr: BoundingRect
  ): { x: number; y: number } {
    const centerX = rbr.x + rbr.width / 2;
    const centerY = rbr.y + rbr.height / 2;

    switch (position) {
      case "n": // North (top center)
        return { x: centerX, y: rbr.y };
      case "ne": // Northeast (top right)
        return { x: rbr.right, y: rbr.y };
      case "e": // East (middle right)
        return { x: rbr.right, y: centerY };
      case "se": // Southeast (bottom right)
        return { x: rbr.right, y: rbr.bottom };
      case "s": // South (bottom center)
        return { x: centerX, y: rbr.bottom };
      case "sw": // Southwest (bottom left)
        return { x: rbr.x, y: rbr.bottom };
      case "w": // West (middle left)
        return { x: rbr.x, y: centerY };
      case "nw": // Northwest (top left)
        return { x: rbr.x, y: rbr.y };
      case "o": // Origin (center)
      default:
        return { x: centerX, y: centerY };
    }
  }

  /**
   * Calculate bounding rectangle for a set of positioned characters.
   */
  private calculateTextBounds(
    nodes: CharNode[],
    positions: CharPosition[]
  ): BoundingRect | null {
    if (nodes.length === 0) return null;

    // We need to estimate bounds before rendering
    // Use approximate character dimensions based on settings
    const charWidth = this._settings.fontSize * 0.6; // Approximate
    const charHeight = this._settings.fontSize;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < nodes.length; i++) {
      const pos = positions[i];
      const node = nodes[i];

      if (isLineBreak(node) || isSpace(node)) continue;

      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y - charHeight);
      maxX = Math.max(maxX, pos.x + charWidth);
      maxY = Math.max(maxY, pos.y);
    }

    if (!isFinite(minX)) return null;

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      right: maxX,
      bottom: maxY,
    };
  }

  /**
   * Draw border lines around text.
   */
  private async drawBorder(
    edges: { top: boolean; left: boolean; bottom: boolean; right: boolean },
    thickness: number,
    padding: number,
    lineType: string,
    color: string,
    bounds: BoundingRect,
    rootSvg: SVGElement,
    versionTag: string
  ): Promise<void> {
    this._logger.debug("TextRenderer", `Drawing border`, {
      edges,
      thickness,
      padding,
      lineType,
      color,
    });

    // Expand bounds by padding
    const x1 = bounds.x - padding;
    const y1 = bounds.y - padding;
    const x2 = bounds.right + padding;
    const y2 = bounds.bottom + padding;

    // Draw each requested edge
    const groupId = `border-${versionTag}`;
    const borderGroup = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    );
    borderGroup.setAttribute("id", groupId);
    borderGroup.setAttribute("class", "border");

    if (edges.top) {
      // Top edge
      const line = createLine(x1, y1, x2, y1, {
        stroke: color,
        strokeWidth: thickness,
        strokeDasharray: this.getStrokeDasharray(lineType),
      });
      borderGroup.appendChild(line);
    }

    if (edges.bottom) {
      // Bottom edge
      const line = createLine(x1, y2, x2, y2, {
        stroke: color,
        strokeWidth: thickness,
        strokeDasharray: this.getStrokeDasharray(lineType),
      });
      borderGroup.appendChild(line);
    }

    if (edges.left) {
      // Left edge
      const line = createLine(x1, y1, x1, y2, {
        stroke: color,
        strokeWidth: thickness,
        strokeDasharray: this.getStrokeDasharray(lineType),
      });
      borderGroup.appendChild(line);
    }

    if (edges.right) {
      // Right edge
      const line = createLine(x2, y1, x2, y2, {
        stroke: color,
        strokeWidth: thickness,
        strokeDasharray: this.getStrokeDasharray(lineType),
      });
      borderGroup.appendChild(line);
    }

    rootSvg.appendChild(borderGroup);

    // Cache bounds for the border group
    const bbox = getSafeBBox(borderGroup);
    this._boundsCache.set(groupId, bbox);
  }

  /**
   * Get SVG stroke-dasharray value for line type.
   */
  private getStrokeDasharray(lineType: string): string {
    switch (lineType) {
      case "dotted":
        return "2,2";
      case "dashed":
        return "5,5";
      case "wavy":
        // Wavy is approximated with dashed for now
        return "3,2";
      case "solid":
      default:
        return "none";
    }
  }

  /**
   * Update settings.
   */
  public updateSettings(settings: GveRenditionSettings): void {
    this._settings = settings;
    this._textLayout.updateSettings(settings);
  }
}
