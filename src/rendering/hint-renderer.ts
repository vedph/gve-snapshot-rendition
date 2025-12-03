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
  private _settings: GveRenditionSettings;
  private _logger: Logger;
  private _animationEngine: AnimationEngine;
  private _boundsCache: BoundsCache;
  private _spreadingEngine: SpreadingEngine;

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
   * @param versionTag - Version tag to add as CSS class
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
    allBaseNodes: CharNode[],
    versionTag: string
  ): Promise<void> {
    this._logger.time(`renderHint-${hintId}`);
    this._logger.info(`Rendering hint: ${hintId} for operation ${operationId}`);

    try {
      // 1. Resolve placeholders in SVG
      const resolvedSvg = resolvePlaceholders(hint.svg, variables);
      this._logger.debug("HintRenderer", `Placeholders resolved`, {
        original: hint.svg,
        resolved: resolvedSvg,
      });

      // 2. Parse SVG to get root <g> element
      const hintGroup = parseSVGContent(resolvedSvg);
      if (!hintGroup) {
        this._logger.error(`Failed to parse SVG for hint ${hintId}`);
        return;
      }

      // 3. Set unique ID and version class for the hint
      const uniqueId = `hint-${operationId}-${hintOrdinal}`;
      hintGroup.setAttribute("id", uniqueId);
      hintGroup.setAttribute("class", `hint version-${versionTag}`);

      // 4. Calculate RBR(s) - may be multiple if text split across lines
      let rbrs: BoundingRect[];
      if (hint.displacedRefSpan) {
        // Use displaced span instead of reference nodes
        rbrs = this.calculateDisplacedRBRs(hint.displacedRefSpan, allBaseNodes);
      } else {
        rbrs = this.calculateRBRs(referenceNodes);
      }

      if (rbrs.length === 0) {
        this._logger.warn(`No RBRs calculated for hint ${hintId}, skipping`);
        return;
      }

      this._logger.debug(
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
          this._logger.debug(
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

        // 7. Append to SVG early (but invisible) so getBBox works
        // Set visibility hidden temporarily for measurements
        currentHintGroup.setAttribute("visibility", "hidden");
        rootSvg.appendChild(currentHintGroup);

        // 8. Find handle position BEFORE scaling (important!)
        const handlePos = this.findHandlePosition(currentHintGroup);

        // 9. Get the scale factors needed to fit RBR
        const scalingInfo = this.calculateScalingInfo(
          currentHintGroup,
          hint,
          rbr
        );

        // 10. Apply combined transform (scale + position) in one operation
        await this.applyHintTransform(
          currentHintGroup,
          hint,
          rbr,
          handlePos,
          scalingInfo
        );

        // 10. Handle spreading if solid
        if (hint.solid) {
          await this.handleSpreading(currentHintGroup, rootSvg);
        }

        // 11. Make visible (set initial opacity to 0 if animation present)
        currentHintGroup.removeAttribute("visibility");
        if (hint.animation) {
          currentHintGroup.style.opacity = "0";
        }

        // 11. Cache bounds
        const bbox = getSafeBBox(currentHintGroup);
        this._boundsCache.set(currentHintGroup.getAttribute("id")!, bbox);

        // 12. Animate entrance
        if (hint.animation) {
          const animation = this._animationEngine
            .getFactory()
            .resolveAnimation(
              hint.animation,
              this._settings.animations,
              `hint-${hintId}`
            );
          if (animation) {
            await this._animationEngine.animate(
              currentHintGroup,
              animation,
              rootSvg
            );
            // Remove opacity attribute after animation to avoid conflicts with style
            currentHintGroup.removeAttribute("opacity");
          }
        }

        // Mark placeholder as rendered
        if (hasPlaceholder) {
          placeholderRendered = true;
        }
      }

      this._logger.timeEnd(`renderHint-${hintId}`);
    } catch (error) {
      this._logger.error(`Error rendering hint ${hintId}:`, error);
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
   * Calculate RBRs from a displaced span reference (IDxN format).
   */
  private calculateDisplacedRBRs(
    displacedRefSpan: string,
    allBaseNodes: CharNode[]
  ): BoundingRect[] {
    const parsed = parseDisplacedSpan(displacedRefSpan);
    if (!parsed) {
      this._logger.warn(`Invalid displaced span format: ${displacedRefSpan}`);
      return [];
    }

    const nodes = getNodeSpan(allBaseNodes, parsed.nodeId, parsed.count);
    if (nodes.length === 0) {
      this._logger.warn(
        `No nodes found for displaced span ${displacedRefSpan}`
      );
      return [];
    }

    return this.calculateRBRs(nodes);
  }

  /**
   * Calculate scaling information for the hint.
   * Returns scale factors and target dimensions.
   */
  private calculateScalingInfo(
    hintGroup: SVGGElement,
    hint: OperationHint,
    rbr: BoundingRect
  ): { scaleX: number; scaleY: number; width: number; height: number } {
    // Calculate initial size based on RBR
    let width = rbr.width;
    let height = rbr.height;

    // Apply custom scaling
    if (hint.scaleX !== 1 || hint.scaleY !== 1) {
      width *= hint.scaleX;
      height *= hint.scaleY;

      this._logger.debug("HintRenderer", `Scaling hint`, {
        scaleX: hint.scaleX,
        scaleY: hint.scaleY,
        originalSize: { width: rbr.width, height: rbr.height },
        scaledSize: { width, height },
      });
    }

    // Apply hint margin
    if (this._settings.hintMargin > 0) {
      width += this._settings.hintMargin * 2;
      height += this._settings.hintMargin * 2;

      this._logger.debug(
        "HintRenderer",
        `Applied hint margin: ${this._settings.hintMargin}px`
      );
    }

    // Calculate scale factors based on current hint size
    const currentBBox = getSafeBBox(hintGroup);
    const scaleX =
      currentBBox.width > 0 ? width / currentBBox.width : 1;
    const scaleY =
      currentBBox.height > 0 ? height / currentBBox.height : 1;

    return { scaleX, scaleY, width, height };
  }

  /**
   * Apply combined transform (scale + position + rotation) to the hint.
   * This must be done in a single operation to avoid transform conflicts.
   */
  private async applyHintTransform(
    hintGroup: SVGGElement,
    hint: OperationHint,
    rbr: BoundingRect,
    handlePos: { x: number; y: number },
    scalingInfo: { scaleX: number; scaleY: number }
  ): Promise<void> {
    // Calculate target position based on hint.position
    const targetPos = this.calculateTargetPosition(hint.position, rbr);

    // Parse offsets (they can be px or "th"/"tw")
    const offsetX = parseOffset(hint.offsetX, rbr.height, rbr.width);
    const offsetY = parseOffset(hint.offsetY, rbr.height, rbr.width);

    // After scaling, the handle will be at: handlePos * scale
    // We want it at: targetPos + offset
    // So translate by: targetPos + offset - (handlePos * scale)
    const scaledHandleX = handlePos.x * scalingInfo.scaleX;
    const scaledHandleY = handlePos.y * scalingInfo.scaleY;

    const translateX = targetPos.x + offsetX - scaledHandleX;
    const translateY = targetPos.y + offsetY - scaledHandleY;

    this._logger.debug("HintRenderer", `Applying hint transform`, {
      position: hint.position,
      rbr,
      targetPos,
      handlePos,
      scalingInfo,
      scaledHandle: { x: scaledHandleX, y: scaledHandleY },
      offsets: { x: offsetX, y: offsetY },
      translate: { x: translateX, y: translateY },
    });

    // Apply combined transform: translate then scale (order matters!)
    applyTransform(hintGroup, {
      translateX,
      translateY,
      scaleX: scalingInfo.scaleX,
      scaleY: scalingInfo.scaleY,
      rotate: hint.rotation,
      originX: targetPos.x,
      originY: targetPos.y,
    });
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

    const spreading = this._spreadingEngine.calculateSpreading(hintBounds, [
      hintId,
    ]);

    if (spreading.hasShifts) {
      this._logger.debug(
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

  /**
   * Update settings.
   */
  updateSettings(settings: GveRenditionSettings): void {
    this._settings = settings;
  }
}
