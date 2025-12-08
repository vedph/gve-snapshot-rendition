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

      // Cache bounds for spaces even though they're not rendered
      // This is needed for RBR calculations that include spaces
      if (isSpace(node)) {
        const spaceWidth =
          this._settings.fontSize * this._settings.spaceWidthFraction;
        const spaceY = pos.y - this._settings.fontSize; // Approximate top of character
        // Create a DOMRect-like object for the space bounds
        const spaceBounds = {
          x: pos.x,
          y: spaceY,
          width: spaceWidth,
          height: this._settings.fontSize,
          top: spaceY,
          right: pos.x + spaceWidth,
          bottom: spaceY + this._settings.fontSize,
          left: pos.x,
          toJSON: () => ({}),
        } as DOMRect;
        this._boundsCache.set(`n_${node.id}`, spaceBounds);
        continue;
      }

      // Skip rendering for line breaks (they affect layout but aren't visible)
      if (isLineBreak(node)) {
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
    ) => Promise<void>,
    config?: RenditionConfig
  ): Promise<void> {
    const textEl = createTextElement(node.data, {
      id: `n_${node.id}`,
      class: `node version-${versionTag}`,
      x: position.x,
      y: position.y,
    });

    // Apply styling from config if provided, otherwise use default settings
    if (config) {
      applyTextStyle(textEl, {
        fontFamily: config.fontFamily,
        fontSize: config.fontSize,
        foreColor: config.foreColor,
        backColor: config.backColor,
        italic: config.italic,
        bold: config.bold,
      });
    } else {
      applyTextStyle(textEl, {
        fontFamily: this._settings.fontFamily,
        fontSize: this._settings.fontSize,
        foreColor: this._settings.foreColor,
        backColor: this._settings.backColor,
        italic: this._settings.italic,
        bold: this._settings.bold,
      });
    }

    rootSvg.appendChild(textEl);

    // Cache bounds
    const bbox = getSafeBBox(textEl);
    this._boundsCache.set(`n_${node.id}`, bbox);

    // Animate if function provided
    if (animationFn) {
      // Set initial opacity to 0 for animation via CSS style (GSAP animates CSS)
      textEl.style.opacity = "0";
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
   * @param panZoomInstance - The svg-pan-zoom instance (for prolog)
   * @param viewportWidth - Width of the visible viewport (for prolog)
   * @param viewportHeight - Height of the visible viewport (for prolog)
   * @returns Promise that resolves when rendering completes
   */
  public async renderAdditionalText(
    nodes: CharNode[],
    rootSvg: SVGElement,
    config: RenditionConfig,
    versionTag: string,
    referenceNodes: CharNode[],
    allBaseNodes: CharNode[],
    panZoomInstance?: any,
    viewportWidth?: number,
    viewportHeight?: number
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

    // 2. Calculate text position based on r_t-position + offsets
    const position = config.textPosition || "o"; // Default to origin if not specified
    const targetPos = this.calculateTargetPosition(position, rbr);

    // Parse offsets using RBR bounds (offsets can be like "0.5th" = half of RBR height)
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

    // 4. Calculate bounding rectangle for the text (needed for spreading and prolog)
    const textBounds = this.calculateTextBounds(nodes, positions);

    // 5. Apply spreading if r_t-solid=1
    // Check config.textSolid to determine if spreading should be applied
    if (config.textSolid) {
      if (textBounds) {
        this._logger.debug(
          "TextRenderer",
          `Applying spreading for solid additional text`,
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
    } else {
      this._logger.debug(
        "TextRenderer",
        `Skipping spreading - additional text is not solid (r_t-solid not set)`
      );
    }

    // 6. Check if prolog panning is needed (element visibility check)
    // This must happen AFTER positioning and spreading, but BEFORE rendering characters
    if (panZoomInstance && viewportWidth && viewportHeight && this._settings.prologDuration > 0 && textBounds) {
      const isVisible = this._animationEngine.isElementVisible(
        textBounds,
        panZoomInstance,
        viewportWidth,
        viewportHeight
      );

      if (!isVisible) {
        this._logger.debug(
          "TextRenderer",
          `Additional text for ${versionTag} would be outside viewport, executing prolog`
        );
        await this._animationEngine.animateProlog(
          panZoomInstance,
          textBounds,
          viewportWidth,
          viewportHeight,
          this._settings.prologDuration
        );
      }
    }

    // 7. Get animation function if specified
    const animationFn = this._settings.charAnimationId
      ? this._animationEngine
          .getFactory()
          .resolveAnimation(
            `#${this._settings.charAnimationId}`,
            this._settings.animations,
            "char"
          )
      : undefined;

    // 8. Render each character with features
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const pos = positions[i];

      // Skip rendering for line breaks and spaces
      if (isLineBreak(node) || isSpace(node)) {
        continue;
      }

      await this.renderCharacter(node, pos, rootSvg, versionTag, animationFn, config);
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
   * Update settings.
   */
  public updateSettings(settings: GveRenditionSettings): void {
    this._settings = settings;
    this._textLayout.updateSettings(settings);
  }
}
