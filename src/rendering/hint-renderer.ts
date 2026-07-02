import { CharNode } from "../models";
import { GveRenditionSettings } from "../settings/settings";
import { OperationHint } from "../settings/hint-models";
import { RelativePosition } from "../core/gve-snapshot-rendition";
import { Logger } from "../core/logger";
import { AnimationEngine } from "../animation/animation-engine";
import { BoundsCache, BoundingRect } from "./bounds-cache";
import {
  parseSVGContent,
  getSafeBBox,
  getTransformedBBox,
  applyTransform,
  getAverageCharWidth,
} from "./svg-utils";
import { resolvePlaceholders, parseOffset } from "../utils/text-utils";
import { parseDisplacedSpan } from "../utils/feature-utils";
import { getNodeSpan } from "../utils/node-utils";
import { HintOverrides } from "./feature-resolver";

/**
 * Hint renderer handles rendering of operation hints.
 * Hints are visual counterparts of editing operations.
 */
export class HintRenderer {
  private _settings: GveRenditionSettings;
  private _logger: Logger;
  private _animationEngine: AnimationEngine;
  private _boundsCache: BoundsCache;

  constructor(
    settings: GveRenditionSettings,
    logger: Logger,
    animationEngine: AnimationEngine,
    boundsCache: BoundsCache
  ) {
    this._settings = settings;
    this._logger = logger;
    this._animationEngine = animationEngine;
    this._boundsCache = boundsCache;
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
   * @param hintOverrides - Optional overrides from r_h-* features
   * @param panZoomInstance - The svg-pan-zoom instance (for prolog)
   * @param viewportWidth - Width of the visible viewport (for prolog)
   * @param viewportHeight - Height of the visible viewport (for prolog)
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
    versionTag: string,
    hintOverrides?: Map<string | number, HintOverrides>,
    panZoomInstance?: any,
    viewportWidth?: number,
    viewportHeight?: number
  ): Promise<void> {
    this._logger.time(`renderHint-${hintId}`);
    this._logger.info(`Rendering hint: ${hintId} for operation ${operationId}`);

    try {
      // 1. Apply r_h-* overrides to hint properties
      // Overrides can target this specific hint (by key or ordinal) or all hints ("*")
      const effectiveHint = this.applyHintOverrides(
        hint,
        hintId,
        hintOrdinal,
        hintOverrides,
        allBaseNodes
      );

      // 2. Resolve placeholders in SVG
      const resolvedSvg = resolvePlaceholders(effectiveHint.svg, variables);
      this._logger.debug("HintRenderer", `Placeholders resolved`, {
        original: effectiveHint.svg,
        resolved: resolvedSvg,
      });

      // 3. Parse SVG to get root <g> element
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
      if (effectiveHint.displacedRefSpan) {
        // Use displaced span instead of reference nodes
        rbrs = this.calculateDisplacedRBRs(
          effectiveHint.displacedRefSpan,
          allBaseNodes,
          rootSvg
        );
      } else {
        rbrs = this.calculateRBRs(referenceNodes, rootSvg);
      }

      if (rbrs.length === 0) {
        this._logger.warn(`No RBRs calculated for hint ${hintId}, skipping`);
        return;
      }

      // Average character width/height in the default text settings, used to
      // resolve "tw"/"th" units in offsetX/offsetY (r_h-offset-x/y). These are
      // NOT the RBR (reference text bounds) — see docs "Hints" properties.
      const avgCharWidth = getAverageCharWidth(
        this._settings.fontFamily,
        this._settings.fontSize,
        this._settings.bold,
        this._settings.italic,
        rootSvg
      );
      const avgCharHeight = this._settings.fontSize;

      // 5. Check if this is a placeholder hint
      const hasPlaceholder = hintGroup.querySelector("#placeholder") !== null;
      // Default-mode placeholder: a placeholder element WITHOUT class="fit".
      // Per documentation, in default mode the text keeps its natural size and the
      // container (if any) scales to fit it — meaning no RBR-based scaling is applied.
      // Fit-mode placeholders still scale the hint to the RBR normally.
      const isDefaultPlaceholder = hasPlaceholder &&
        !hintGroup.querySelector("#placeholder")?.classList.contains("fit");

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

        // 8. Get the scale factors needed to fit RBR
        const scalingInfo = this.calculateScalingInfo(
          currentHintGroup,
          effectiveHint,
          rbr
        );

        // For default-mode placeholder hints the text drives the size, not the RBR.
        // Override any RBR-derived scale so the hint keeps its natural rendered size.
        // The EBR (measured from the natural-size hint) is then used to center it.
        if (isDefaultPlaceholder) {
          scalingInfo.scaleX = 1;
          scalingInfo.scaleY = 1;
        }

        // 9. Apply scale and rotation transforms to prepare the hint
        await this.applyHintSizeTransforms(
          currentHintGroup,
          effectiveHint,
          scalingInfo
        );

        // 10. Get EBR (Element Bounding Rectangle) AFTER transformations
        // This is either the handle's bbox or the whole hint's bbox
        const ebrBounds = this.getEBRBounds(currentHintGroup);

        // 11. Apply positioning transform - align EBR with RBR based on position
        await this.applyHintPositionTransform(
          currentHintGroup,
          effectiveHint,
          rbr,
          ebrBounds,
          scalingInfo,
          avgCharWidth,
          avgCharHeight
        );

        // 10. Check if prolog panning is needed (element visibility check)
        // This must happen AFTER positioning and spreading, but BEFORE making visible
        if (panZoomInstance && viewportWidth && viewportHeight && this._settings.prologDuration > 0) {
          // IMPORTANT: Use getTransformedBBox() instead of getSafeBBox() here!
          // getSafeBBox() returns LOCAL coordinates (without transforms), which would
          // give incorrect results for the visibility check since the element has been
          // transformed to its final position.
          const finalBbox = getTransformedBBox(currentHintGroup);
          const isVisible = this._animationEngine.isElementVisible(
            finalBbox,
            panZoomInstance,
            viewportWidth,
            viewportHeight
          );

          if (!isVisible) {
            this._logger.debug(
              "HintRenderer",
              `Element ${currentHintGroup.getAttribute("id")} would be outside viewport, executing prolog`
            );
            await this._animationEngine.animateProlog(
              panZoomInstance,
              finalBbox,
              viewportWidth,
              viewportHeight,
              this._settings.prologDuration
            );
          }
        }

        // 12. Make visible (set initial opacity to 0 if animation present)
        currentHintGroup.removeAttribute("visibility");
        if (effectiveHint.animation) {
          currentHintGroup.style.opacity = "0";
        }

        // 13. Cache bounds
        const bbox = getSafeBBox(currentHintGroup);
        this._boundsCache.set(currentHintGroup.getAttribute("id")!, bbox);

        // 14. Animate entrance
        if (effectiveHint.animation) {
          const animation = this._animationEngine
            .getFactory()
            .resolveAnimation(
              effectiveHint.animation,
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
   *
   * @param rootSvg - Root SVG element, used to read each character's laid-out
   *   baseline `y` attribute for line-break detection (see below).
   */
  private calculateRBRs(nodes: CharNode[], rootSvg?: SVGElement): BoundingRect[] {
    if (nodes.length === 0) return [];

    const rbrs: BoundingRect[] = [];

    this._logger.debug(
      "HintRenderer",
      `Calculating RBRs for ${nodes.length} nodes`
    );

    // Group nodes by line by checking their Y coordinates.
    // IMPORTANT: this compares the character's laid-out baseline Y (the `y`
    // attribute TextLayout assigned when positioning it), NOT its cached
    // getBBox().y. The tight ink bbox top varies per glyph shape (e.g. an
    // ascender like "t" vs. a descender like "g" vs. an x-height-only glyph
    // like "s"), easily by more than the 5px tolerance below, even though
    // the characters sit on the very same line. Using bbox.y here would
    // spuriously split a single line into multiple "line groups" — and thus
    // multiple RBRs, causing hints to be rendered (and animated) more than
    // once for what is really a single reference span.
    const lineGroups: string[][] = [];
    let currentLineGroup: string[] = [];
    let lastBaselineY: number | null = null;
    const missingBounds: string[] = [];
    const skippedInvisible: string[] = [];

    for (const node of nodes) {
      const elementId = `n_${node.id}`;

      // Check if this is an invisible character (LF or space)
      // These characters don't have visual SVG text elements
      const isInvisible = node.data === '\n' || node.data === ' ';

      if (isInvisible) {
        this._logger.debug(
          "HintRenderer",
          `Skipping invisible node ${elementId} (char: ${node.data === '\n' ? 'LF' : 'space'})`
        );
        skippedInvisible.push(elementId);
        continue;
      }

      const bounds = this._boundsCache.get(elementId);
      if (!bounds) {
        this._logger.warn(`Bounds not found for visible node element ${elementId} (char: "${node.data}")`);
        missingBounds.push(elementId);
        continue;
      }

      // Prefer the laid-out baseline `y` attribute (deterministic, identical
      // for every character on the same line); fall back to the cached ink
      // bbox top only if the element can't be found (defensive).
      const el = rootSvg?.querySelector(`#${elementId}`);
      const attrY = el?.getAttribute("y");
      const baselineY = attrY !== null && attrY !== undefined ? parseFloat(attrY) : bounds.y;

      // If baseline Y coordinate significantly different, start new line group
      if (lastBaselineY !== null && Math.abs(baselineY - lastBaselineY) > 5) {
        if (currentLineGroup.length > 0) {
          lineGroups.push([...currentLineGroup]);
          currentLineGroup = [];
        }
      }

      currentLineGroup.push(elementId);
      lastBaselineY = baselineY;
    }

    // Add last group
    if (currentLineGroup.length > 0) {
      lineGroups.push(currentLineGroup);
    }

    if (skippedInvisible.length > 0) {
      this._logger.debug(
        "HintRenderer",
        `Skipped ${skippedInvisible.length} invisible nodes (LF/space)`,
        { skippedInvisible }
      );
    }

    if (missingBounds.length > 0) {
      this._logger.error(
        "HintRenderer",
        `Missing bounds for ${missingBounds.length} visible nodes. RBR calculation may be incorrect.`,
        { missingBounds }
      );
    }

    // Calculate RBR for each line group
    for (const group of lineGroups) {
      const rbr = this._boundsCache.getUnionBounds(group);
      if (rbr) {
        this._logger.debug(
          "HintRenderer",
          `Calculated RBR from ${group.length} elements`,
          { elements: group, rbr }
        );
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
    allBaseNodes: CharNode[],
    rootSvg?: SVGElement
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

    return this.calculateRBRs(nodes, rootSvg);
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

    // Calculate scale factors based on current hint size
    const currentBBox = getSafeBBox(hintGroup);
    const scaleX = currentBBox.width > 0 ? width / currentBBox.width : 1;
    const scaleY = currentBBox.height > 0 ? height / currentBBox.height : 1;

    return { scaleX, scaleY, width, height };
  }

  /**
   * Apply size transforms (scale and rotation) to the hint.
   * Per documentation, these are applied BEFORE positioning.
   *
   * IMPORTANT: We DON'T actually apply these as transforms on the element.
   * Instead, we just return the scaling info and rotation, and later we'll create
   * a combined transform that includes both sizing and positioning.
   */
  private async applyHintSizeTransforms(
    hintGroup: SVGGElement,
    hint: OperationHint,
    scalingInfo: { scaleX: number; scaleY: number }
  ): Promise<void> {
    // Don't apply transforms yet - we'll do it all at once in applyHintPositionTransform
    // This way we avoid the complexity of transform composition
    this._logger.debug("HintRenderer", `Size transforms calculated`, {
      scaleX: scalingInfo.scaleX,
      scaleY: scalingInfo.scaleY,
      rotation: hint.rotation,
    });
  }

  /**
   * Apply complete transform to the hint (both sizing and positioning).
   * This builds a single transform that:
   * 1. Translates so the EBR alignment point is at origin
   * 2. Scales and rotates the hint
   * 3. Translates to the final RBR position
   *
   * Per documentation: hints use the handle's bounding box as EBR if a handle element exists,
   * otherwise they use the whole hint's bounding box as EBR.
   */
  private async applyHintPositionTransform(
    hintGroup: SVGGElement,
    hint: OperationHint,
    rbr: BoundingRect,
    ebrBounds: BoundingRect,
    scalingInfo: { scaleX: number; scaleY: number },
    avgCharWidth: number,
    avgCharHeight: number
  ): Promise<void> {
    // Calculate the alignment point on the RBR
    const rbrAlignPoint = this.calculateRBRAlignmentPoint(hint.position, rbr);

    // Calculate the alignment point on the EBR (in local/untransformed coordinates)
    const ebrAlignPoint = this.calculateEBRAlignmentPoint(hint.position, ebrBounds);

    // Parse offsets (they can be px or "th"/"tw", resolved against the average
    // character height/width, not the RBR — see docs "Hints" properties).
    const offsetX = parseOffset(hint.offsetX, avgCharHeight, avgCharWidth);
    const offsetY = parseOffset(hint.offsetY, avgCharHeight, avgCharWidth);

    // Apply offsets to the RBR alignment point
    const finalRbrX = rbrAlignPoint.x + offsetX;
    const finalRbrY = rbrAlignPoint.y + offsetY;

    // Build the complete transform:
    // We want to scale/rotate around the EBR alignment point, then move it to the RBR position.
    //
    // The formula is: translate(finalPos) scale(s) rotate(r) translate(-ebrAlign)
    // This means:
    // 1. Move EBR align point to origin: translate(-ebrAlign)
    // 2. Scale and rotate around origin: scale(s) rotate(r)
    // 3. Move to final position: translate(finalPos)
    //
    // For a point P at (px, py):
    // - After translate(-ebrAlign): (px - ebrAlign.x, py - ebrAlign.y)
    // - After rotate (skip for now): same if rotation = 0
    // - After scale: ((px - ebrAlign.x)*sx, (py - ebrAlign.y)*sy)
    // - After translate(finalPos): ((px - ebrAlign.x)*sx + finalPos.x, (py - ebrAlign.y)*sy + finalPos.y)
    //
    // Check: The EBR align point (ebrAlign.x, ebrAlign.y) should end up at (finalRbrX, finalRbrY)
    // ((ebrAlign.x - ebrAlign.x)*sx + finalRbrX, (ebrAlign.y - ebrAlign.y)*sy + finalRbrY)
    // = (0*sx + finalRbrX, 0*sy + finalRbrY)
    // = (finalRbrX, finalRbrY) ✓

    const transforms: string[] = [];

    // Step 3: Translate to final position
    transforms.push(`translate(${finalRbrX}, ${finalRbrY})`);

    // Step 2: Apply scale
    if (scalingInfo.scaleX !== 1 || scalingInfo.scaleY !== 1) {
      transforms.push(`scale(${scalingInfo.scaleX}, ${scalingInfo.scaleY})`);
    }

    // Step 2b: Apply rotation if specified
    if (hint.rotation !== 0) {
      transforms.push(`rotate(${hint.rotation})`);
    }

    // Step 1: Move EBR align point to origin
    transforms.push(`translate(${-ebrAlignPoint.x}, ${-ebrAlignPoint.y})`);

    const transformString = transforms.join(" ");

    this._logger.debug("HintRenderer", `Applying complete transform`, {
      position: hint.position,
      rbr,
      rbrAlignPoint,
      ebrBounds_LOCAL: ebrBounds,
      ebrAlignPoint_LOCAL: ebrAlignPoint,
      scalingInfo,
      rotation: hint.rotation,
      offsetInputs: { x: hint.offsetX, y: hint.offsetY, avgCharWidth, avgCharHeight },
      offsets: { x: offsetX, y: offsetY },
      finalRbrPoint: { x: finalRbrX, y: finalRbrY },
      transformString,
    });

    hintGroup.setAttribute("transform", transformString);
  }

  /**
   * Get the EBR (Element Bounding Rectangle) for positioning.
   * Per documentation: if the hint has a handle element, use its bounding box.
   * Otherwise, use the whole hint's bounding box.
   */
  private getEBRBounds(hintGroup: SVGGElement): BoundingRect {
    const handleElement = hintGroup.querySelector("#handle");

    let bbox: DOMRect | SVGRect;
    if (handleElement) {
      // Use handle's bounding box as EBR
      bbox = getSafeBBox(handleElement as SVGElement);
    } else {
      // No handle element, use whole hint's bounding box as EBR
      bbox = getSafeBBox(hintGroup);
    }

    // Convert to BoundingRect with right and bottom properties
    return {
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height,
      right: bbox.x + bbox.width,
      bottom: bbox.y + bbox.height,
    };
  }

  /**
   * Calculate the alignment point on the RBR based on position type.
   * This is where the EBR's corresponding alignment point should be positioned.
   */
  private calculateRBRAlignmentPoint(
    position: string,
    rbr: BoundingRect
  ): { x: number; y: number } {
    const centerX = rbr.x + rbr.width / 2;
    const centerY = rbr.y + rbr.height / 2;

    switch (position) {
      // Outside positions
      case "n": // North: align to top-center of RBR
        return { x: centerX, y: rbr.y };
      case "ne": // Northeast: align to top-right corner of RBR
        return { x: rbr.right, y: rbr.y };
      case "e": // East: align to middle-right of RBR
        return { x: rbr.right, y: centerY };
      case "se": // Southeast: align to bottom-right corner of RBR
        return { x: rbr.right, y: rbr.bottom };
      case "s": // South: align to bottom-center of RBR
        return { x: centerX, y: rbr.bottom };
      case "sw": // Southwest: align to bottom-left corner of RBR
        return { x: rbr.x, y: rbr.bottom };
      case "w": // West: align to middle-left of RBR
        return { x: rbr.x, y: centerY };
      case "nw": // Northwest: align to top-left corner of RBR
        return { x: rbr.x, y: rbr.y };
      // Inside positions
      case "inw": // Inside Northwest: align to top-left corner of RBR
        return { x: rbr.x, y: rbr.y };
      case "ine": // Inside Northeast: align to top-right corner of RBR
        return { x: rbr.right, y: rbr.y };
      case "isw": // Inside Southwest: align to bottom-left corner of RBR
        return { x: rbr.x, y: rbr.bottom };
      case "ise": // Inside Southeast: align to bottom-right corner of RBR
        return { x: rbr.right, y: rbr.bottom };
      case "o": // Origin: align to center of RBR
      default:
        return { x: centerX, y: centerY };
    }
  }

  /**
   * Calculate the alignment point on the EBR based on position type.
   * This is the point on the EBR that should align with the RBR alignment point.
   */
  private calculateEBRAlignmentPoint(
    position: string,
    ebr: BoundingRect
  ): { x: number; y: number } {
    const centerX = ebr.x + ebr.width / 2;
    const centerY = ebr.y + ebr.height / 2;

    switch (position) {
      // Outside positions - EBR corners/edges that touch RBR
      case "n": // North: EBR bottom-center aligns with RBR top-center
        return { x: centerX, y: ebr.bottom };
      case "ne": // Northeast: EBR bottom-left corner aligns with RBR top-right corner
        return { x: ebr.x, y: ebr.bottom };
      case "e": // East: EBR left-center aligns with RBR right-center
        return { x: ebr.x, y: centerY };
      case "se": // Southeast: EBR top-left corner aligns with RBR bottom-right corner
        return { x: ebr.x, y: ebr.y };
      case "s": // South: EBR top-center aligns with RBR bottom-center
        return { x: centerX, y: ebr.y };
      case "sw": // Southwest: EBR top-right corner aligns with RBR bottom-left corner
        return { x: ebr.right, y: ebr.y };
      case "w": // West: EBR right-center aligns with RBR left-center
        return { x: ebr.right, y: centerY };
      case "nw": // Northwest: EBR bottom-right corner aligns with RBR top-left corner
        return { x: ebr.right, y: ebr.bottom };
      // Inside positions - EBR corners align with same RBR corners
      case "inw": // Inside Northwest: EBR top-left aligns with RBR top-left
        return { x: ebr.x, y: ebr.y };
      case "ine": // Inside Northeast: EBR top-right aligns with RBR top-right
        return { x: ebr.right, y: ebr.y };
      case "isw": // Inside Southwest: EBR bottom-left aligns with RBR bottom-left
        return { x: ebr.x, y: ebr.bottom };
      case "ise": // Inside Southeast: EBR bottom-right aligns with RBR bottom-right
        return { x: ebr.right, y: ebr.bottom };
      case "o": // Origin: EBR center aligns with RBR center
      default:
        return { x: centerX, y: centerY };
    }
  }

  /**
   * Apply r_h-* overrides to hint properties.
   * Priority (lowest to highest): wildcard ("*") < key-based < ordinal-based.
   *
   * @param hint - Original hint design
   * @param hintId - ID (key) of the hint being rendered
   * @param hintOrdinal - 1-based ordinal position of this hint within the operation
   * @param hintOverrides - Map of overrides from r_h-* features (keyed by ID string or ordinal number)
   * @param allBaseNodes - All base nodes for displaced span resolution
   * @returns Modified hint with overrides applied
   */
  private applyHintOverrides(
    hint: OperationHint,
    hintId: string,
    hintOrdinal: number,
    hintOverrides: Map<string | number, HintOverrides> | undefined,
    allBaseNodes: CharNode[]
  ): OperationHint {
    if (!hintOverrides || hintOverrides.size === 0) {
      return hint;
    }

    // Clone hint to avoid modifying original
    const effectiveHint = { ...hint };

    // Look up overrides by wildcard, key, and ordinal; merge in priority order
    const wildcardOverride = hintOverrides.get("*");
    const specificOverride = hintOverrides.get(hintId);
    const ordinalOverride = hintOverrides.get(hintOrdinal);

    // Ordinal (most specific) wins over key-specific, which wins over wildcard
    const override = {
      ...wildcardOverride,
      ...specificOverride,
      ...ordinalOverride,
    };

    // Apply each override property
    if (override.position !== undefined) {
      effectiveHint.position = override.position as RelativePosition;
      this._logger.debug(
        "HintRenderer",
        `Override position for ${hintId}: ${override.position}`
      );
    }

    if (override.offsetX !== undefined) {
      effectiveHint.offsetX = override.offsetX;
      this._logger.debug(
        "HintRenderer",
        `Override offsetX for ${hintId}: ${override.offsetX}`
      );
    }

    if (override.offsetY !== undefined) {
      effectiveHint.offsetY = override.offsetY;
      this._logger.debug(
        "HintRenderer",
        `Override offsetY for ${hintId}: ${override.offsetY}`
      );
    }

    if (override.scaleX !== undefined) {
      effectiveHint.scaleX = parseFloat(override.scaleX);
      this._logger.debug(
        "HintRenderer",
        `Override scaleX for ${hintId}: ${override.scaleX}`
      );
    }

    if (override.scaleY !== undefined) {
      effectiveHint.scaleY = parseFloat(override.scaleY);
      this._logger.debug(
        "HintRenderer",
        `Override scaleY for ${hintId}: ${override.scaleY}`
      );
    }

    if (override.rotation !== undefined) {
      effectiveHint.rotation = parseFloat(override.rotation);
      this._logger.debug(
        "HintRenderer",
        `Override rotation for ${hintId}: ${override.rotation}`
      );
    }

    if (override.displacedSpan !== undefined) {
      // Convert to displacedRefSpan format (e.g., "64x3")
      const { nodeId, count } = override.displacedSpan;
      effectiveHint.displacedRefSpan = `${nodeId}x${count}`;
      this._logger.debug(
        "HintRenderer",
        `Override displacedSpan for ${hintId}: ${effectiveHint.displacedRefSpan}`
      );
    }

    return effectiveHint;
  }

  /**
   * Update settings.
   */
  updateSettings(settings: GveRenditionSettings): void {
    this._settings = settings;
  }
}
