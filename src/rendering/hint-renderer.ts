import { CharNode } from "../models";
import { GveRenditionSettings } from "../settings/settings";
import { OperationHint, HintPosition } from "../settings/hint-models";
import { Logger } from "../core/logger";
import { AnimationEngine } from "../animation/animation-engine";
import { BoundsCache, BoundingRect } from "./bounds-cache";
import { SpreadingEngine } from "./spreading-engine";
import {
  parseSVGContent,
  getSafeBBox,
  applyTransform,
  getRectCenter,
} from "./svg-utils";
import { resolvePlaceholders, parseOffset } from "../utils/text-utils";
import { parseDisplacedSpan } from "../utils/feature-utils";
import { getNodeSpan } from "../utils/node-utils";

/**
 * Hint renderer handles rendering of operation hints.
 * Hints are visual counterparts of editing operations.
 */
export class HintRenderer {
  private settings: GveRenditionSettings;
  private logger: Logger;
  private animationEngine: AnimationEngine;
  private boundsCache: BoundsCache;
  private spreadingEngine: SpreadingEngine;

  constructor(
    settings: GveRenditionSettings,
    logger: Logger,
    animationEngine: AnimationEngine,
    boundsCache: BoundsCache,
    spreadingEngine: SpreadingEngine
  ) {
    this.settings = settings;
    this.logger = logger;
    this.animationEngine = animationEngine;
    this.boundsCache = boundsCache;
    this.spreadingEngine = spreadingEngine;
  }

  /**
   * Render a hint for an operation.
   *
   * @param hintId - ID of the hint from settings.hints
   * @param hint - The hint configuration
   * @param referenceNodes - Nodes referenced by the operation (for RBR calculation)
   * @param rootSvg - Root SVG element to append hint to
   * @param variables - Variables from r_hint-vars for placeholder resolution
   * @param operationId - ID of the operation (for unique hint ID)
   * @param hintOrdinal - Ordinal number of this hint for the operation (1, 2, 3...)
   * @param allBaseNodes - All base text nodes (for displaced span)
   * @returns Promise that resolves when rendering completes
   */
  async renderHint(
    hintId: string,
    hint: OperationHint,
    referenceNodes: CharNode[],
    rootSvg: SVGElement,
    variables: Map<string, string>,
    operationId: string,
    hintOrdinal: number,
    allBaseNodes: CharNode[]
  ): Promise<void> {
    this.logger.time(`renderHint-${hintId}`);
    this.logger.info(`Rendering hint: ${hintId} for operation ${operationId}`);

    try {
      // 1. Resolve placeholders in SVG
      const resolvedSvg = resolvePlaceholders(hint.svg, variables);
      this.logger.debug("HintRenderer", `Placeholders resolved`, {
        original: hint.svg,
        resolved: resolvedSvg,
      });

      // 2. Parse SVG to get root <g> element
      const hintGroup = parseSVGContent(resolvedSvg);
      if (!hintGroup) {
        this.logger.error(`Failed to parse SVG for hint ${hintId}`);
        return;
      }

      // 3. Set unique ID for the hint
      const uniqueId = `hint-${operationId}-${hintOrdinal}`;
      hintGroup.setAttribute("id", uniqueId);

      // 4. Calculate RBR(s) - may be multiple if text split across lines
      let rbrs: BoundingRect[];
      if (hint.displacedRefSpan) {
        // Use displaced span instead of reference nodes
        rbrs = this.calculateDisplacedRBRs(hint.displacedRefSpan, allBaseNodes);
      } else {
        rbrs = this.calculateRBRs(referenceNodes);
      }

      if (rbrs.length === 0) {
        this.logger.warn(`No RBRs calculated for hint ${hintId}, skipping`);
        return;
      }

      this.logger.debug(
        "HintRenderer",
        `Calculated ${rbrs.length} RBR(s)`,
        rbrs
      );

      // 5. Check if this is a placeholder hint
      const hasPlaceholder = hintGroup.querySelector("#placeholder") !== null;

      // 6. Render hint for each RBR (unless it's a placeholder hint and already rendered once)
      let placeholderRendered = false;

      for (let i = 0; i < rbrs.length; i++) {
        const rbr = rbrs[i];

        // Skip if placeholder hint already rendered
        if (hasPlaceholder && placeholderRendered) {
          this.logger.debug(
            "HintRenderer",
            `Skipping RBR ${i + 1} for placeholder hint (already rendered once)`
          );
          continue;
        }

        // Clone the hint group for this RBR (except for first iteration)
        const currentHintGroup =
          i === 0 ? hintGroup : (hintGroup.cloneNode(true) as SVGGElement);
        if (i > 0) {
          currentHintGroup.setAttribute("id", `${uniqueId}-rbr${i + 1}`);
        }

        // 7. Apply initial transformations (scale)
        await this.applyHintTransformations(currentHintGroup, hint, rbr);

        // 8. Position the hint
        await this.positionHint(currentHintGroup, hint, rbr);

        // 9. Handle spreading if solid
        if (hint.solid) {
          await this.handleSpreading(currentHintGroup, rootSvg);
        }

        // 10. Append to SVG (set initial opacity to 0 if animation present)
        if (hint.animation) {
          currentHintGroup.setAttribute("opacity", "0");
        }
        rootSvg.appendChild(currentHintGroup);

        // 11. Cache bounds
        const bbox = getSafeBBox(currentHintGroup);
        this.boundsCache.set(currentHintGroup.getAttribute("id")!, bbox);

        // 12. Animate entrance
        if (hint.animation) {
          const animation = this.animationEngine
            .getFactory()
            .resolveAnimation(
              hint.animation,
              this.settings.animations,
              `hint-${hintId}`
            );
          if (animation) {
            await this.animationEngine.animate(
              currentHintGroup,
              animation,
              rootSvg
            );
          }
        }

        // Mark placeholder as rendered
        if (hasPlaceholder) {
          placeholderRendered = true;
        }
      }

      this.logger.timeEnd(`renderHint-${hintId}`);
    } catch (error) {
      this.logger.error(`Error rendering hint ${hintId}:`, error);
    }
  }

  /**
   * Calculate Reference Bounding Rectangles (RBRs) from reference nodes.
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
      const bounds = this.boundsCache.get(elementId);
      if (!bounds) {
        this.logger.warn(`Bounds not found for node element ${elementId}`);
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
      const rbr = this.boundsCache.getUnionBounds(group);
      if (rbr) {
        rbrs.push(rbr);
      }
    }

    return rbrs;
  }

  /**
   * Calculate RBRs from a displaced span reference (IDxN format).
   */
  private calculateDisplacedRBRs(
    displacedRefSpan: string,
    allBaseNodes: CharNode[]
  ): BoundingRect[] {
    const parsed = parseDisplacedSpan(displacedRefSpan);
    if (!parsed) {
      this.logger.warn(`Invalid displaced span format: ${displacedRefSpan}`);
      return [];
    }

    const nodes = getNodeSpan(allBaseNodes, parsed.nodeId, parsed.count);
    if (nodes.length === 0) {
      this.logger.warn(`No nodes found for displaced span ${displacedRefSpan}`);
      return [];
    }

    return this.calculateRBRs(nodes);
  }

  /**
   * Apply transformations (scaling) to the hint.
   */
  private async applyHintTransformations(
    hintGroup: SVGGElement,
    hint: OperationHint,
    rbr: BoundingRect
  ): Promise<void> {
    // Calculate initial size based on RBR
    let width = rbr.width;
    let height = rbr.height;

    // Apply scaling
    if (hint.scaleX !== 1 || hint.scaleY !== 1) {
      width *= hint.scaleX;
      height *= hint.scaleY;

      this.logger.debug("HintRenderer", `Scaling hint`, {
        scaleX: hint.scaleX,
        scaleY: hint.scaleY,
        originalSize: { width: rbr.width, height: rbr.height },
        scaledSize: { width, height },
      });
    }

    // Apply hint margin
    if (this.settings.hintMargin > 0) {
      width += this.settings.hintMargin * 2;
      height += this.settings.hintMargin * 2;

      this.logger.debug(
        "HintRenderer",
        `Applied hint margin: ${this.settings.hintMargin}px`
      );
    }

    // Scale the hint group to match calculated size
    const currentBBox = getSafeBBox(hintGroup);
    if (currentBBox.width > 0 && currentBBox.height > 0) {
      const scaleX = width / currentBBox.width;
      const scaleY = height / currentBBox.height;

      applyTransform(hintGroup, {
        scaleX,
        scaleY,
      });
    }
  }

  /**
   * Position the hint relative to its RBR.
   */
  private async positionHint(
    hintGroup: SVGGElement,
    hint: OperationHint,
    rbr: BoundingRect
  ): Promise<void> {
    // Find handle position in the hint
    const handlePos = this.findHandlePosition(hintGroup);

    // Calculate target position based on hint.position
    const targetPos = this.calculateTargetPosition(hint.position, rbr);

    // Parse offsets (they can be px or "th"/"tw")
    const offsetX = parseOffset(hint.offsetX, rbr.height, rbr.width);
    const offsetY = parseOffset(hint.offsetY, rbr.height, rbr.width);

    // Calculate final position: target - handle + offsets
    const finalX = targetPos.x - handlePos.x + offsetX;
    const finalY = targetPos.y - handlePos.y + offsetY;

    this.logger.debug("HintRenderer", `Positioning hint`, {
      position: hint.position,
      targetPos,
      handlePos,
      offsets: { x: offsetX, y: offsetY },
      final: { x: finalX, y: finalY },
    });

    // Apply position and rotation
    applyTransform(hintGroup, {
      translateX: finalX,
      translateY: finalY,
      rotate: hint.rotation,
      originX: targetPos.x,
      originY: targetPos.y,
    });

    // Handle hint handle visibility for debugging
    if (this.settings.showHintHandles) {
      const handleElement = hintGroup.querySelector("#handle");
      if (handleElement) {
        handleElement.setAttribute("opacity", "1");
      }
    }
  }

  /**
   * Find the handle position within the hint SVG.
   * Returns the handle element's position, or the center of the hint if no handle.
   */
  private findHandlePosition(hintGroup: SVGGElement): { x: number; y: number } {
    const handleElement = hintGroup.querySelector("#handle");

    if (handleElement) {
      const bbox = getSafeBBox(handleElement as SVGElement);
      return getRectCenter(bbox);
    }

    // No handle element, use center of hint group
    const bbox = getSafeBBox(hintGroup);
    return getRectCenter(bbox);
  }

  /**
   * Calculate target position on the RBR based on hint position type.
   */
  private calculateTargetPosition(
    position: HintPosition,
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
   * Handle spreading for solid hints.
   */
  private async handleSpreading(
    hintGroup: SVGGElement,
    rootSvg: SVGElement
  ): Promise<void> {
    const hintBounds = getSafeBBox(hintGroup);
    const hintId = hintGroup.getAttribute("id")!;

    const spreading = this.spreadingEngine.calculateSpreading(hintBounds, [
      hintId,
    ]);

    if (spreading.hasShifts) {
      this.logger.debug(
        "HintRenderer",
        `Spreading required for hint ${hintId}`,
        {
          horizontalShifts: spreading.horizontalShifts.size,
          verticalShifts: spreading.verticalShifts.size,
        }
      );

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
      await this.animationEngine.animateSpreading(
        combinedShifts,
        this.settings.spreadTime,
        rootSvg
      );

      // Update cached bounds for shifted elements
      for (const id of allIds) {
        const element = rootSvg.querySelector(`#${id}`);
        if (element) {
          this.boundsCache.updateFromElement(element as SVGElement);
        }
      }
    }
  }

  /**
   * Update settings.
   */
  updateSettings(settings: GveRenditionSettings): void {
    this.settings = settings;
  }
}
