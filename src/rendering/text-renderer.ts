import { CharNode } from "../models";
import { GveRenditionSettings } from "../settings/settings";
import { Logger } from "../core/logger";
import { AnimationEngine } from "../animation/animation-engine";
import { BoundsCache, BoundingRect } from "./bounds-cache";
import { TextLayout, CharPosition } from "./text-layout";
import { RenditionConfig } from "./feature-resolver";
import { isLineBreak, isSpace, getNodeSpan } from "../utils/node-utils";
import {
  createSVGElement,
  createTextElement,
  applyTextStyle,
  getSafeBBox,
  getTextWidth,
  getAverageCharWidth,
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
  private _textLayout: TextLayout;

  /**
   * Reference to the root SVG element for text width measurements.
   * This ensures measurements happen in the same CSS context as rendering,
   * which is critical when running inside Angular or other frameworks
   * that apply global CSS styles to document.body.
   */
  private _measurementRoot?: SVGElement;

  constructor(
    settings: GveRenditionSettings,
    logger: Logger,
    animationEngine: AnimationEngine,
    boundsCache: BoundsCache,
  ) {
    this._settings = settings;
    this._logger = logger;
    this._animationEngine = animationEngine;
    this._boundsCache = boundsCache;
    this._textLayout = new TextLayout(settings, logger);
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
    charOffsets?: Map<number, { x?: number | string; y?: number | string }>,
    nodeConfigs?: Map<number, RenditionConfig>,
  ): Promise<void> {
    this._logger.time("renderBaseText");
    this._logger.info(`Rendering ${nodes.length} base text characters`);

    // Store and set the measurement root to ensure text width measurements
    // happen in the same CSS context as actual rendering (inside Shadow DOM).
    // This is critical for correct positioning when running inside Angular
    // or other frameworks that apply global CSS styles to document.body.
    this._measurementRoot = rootSvg;
    this._textLayout.setMeasurementRoot(rootSvg);

    const positions = this._textLayout.calculateBaseTextPositions(
      nodes,
      charOffsets,
      nodeConfigs
    );

    // Get animation function if specified
    const animationFn = this._settings.charAnimationId
      ? this._animationEngine
          .getFactory()
          .resolveAnimation(
            `#${this._settings.charAnimationId}`,
            this._settings.animations,
            "char",
          )
      : undefined;
    if (!animationFn) {
      this._logger.debug(
        "TextRenderer",
        "No character animation function specified",
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

      // Skip nodes added by operations (have opid in any version) — rendered later
      const hasOpid =
        node.features &&
        Object.values(node.features).some((vf) =>
          vf.some((f) => f.name === "opid")
        );
      if (hasOpid) {
        continue;
      }

      await this.renderCharacter(
        node,
        pos,
        rootSvg,
        "v0",
        animationFn,
        nodeConfigs?.get(node.id),
      );
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
      rootEl: SVGElement,
    ) => Promise<void>,
    config?: RenditionConfig,
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
    viewportHeight?: number,
  ): Promise<void> {
    this._logger.time(`renderAdditionalText-${versionTag}`);
    this._logger.info(
      `Rendering ${nodes.length} additional text characters for ${versionTag}`,
    );

    if (nodes.length === 0) {
      this._logger.warn("No nodes to render");
      return;
    }

    // Apply r_t-value override if specified
    // This overrides the operation's value (the text being added) for display only
    if (config.textValue !== null && config.textValue !== undefined) {
      this._logger.debug(
        "TextRenderer",
        `Applying r_t-value override: "${config.textValue}" (original text had ${nodes.length} characters)`,
      );

      // Replace node data with characters from r_t-value
      // If r_t-value has fewer characters than nodes, we only override the first N nodes
      // If r_t-value has more characters, we only use the first N characters
      const overrideChars = config.textValue.split("");
      const charsToOverride = Math.min(nodes.length, overrideChars.length);

      for (let i = 0; i < charsToOverride; i++) {
        nodes[i] = { ...nodes[i], data: overrideChars[i] };
      }

      // If r_t-value has fewer characters, we need to only render those nodes
      if (overrideChars.length < nodes.length) {
        nodes = nodes.slice(0, overrideChars.length);
        this._logger.debug(
          "TextRenderer",
          `r_t-value has fewer characters (${overrideChars.length}) than nodes (${nodes.length}), only rendering first ${overrideChars.length} characters`,
        );
      }
    }

    // 1. Calculate RBR (or use displaced span if specified)
    let rbrs: BoundingRect[];
    if (config.textDisplacedSpan) {
      const nodes = getNodeSpan(
        allBaseNodes,
        config.textDisplacedSpan.nodeId,
        config.textDisplacedSpan.count,
      );
      rbrs = this.calculateRBRs(nodes, rootSvg);
    } else {
      rbrs = this.calculateRBRs(referenceNodes, rootSvg);
    }

    if (rbrs.length === 0) {
      this._logger.warn("No RBRs calculated for additional text, skipping");
      return;
    }

    // Use first RBR for positioning (additional text doesn't repeat per RBR)
    const rbr = rbrs[0];

    this._logger.debug("TextRenderer", `Using RBR for positioning`, rbr);

    // 2. Calculate position and offsets.
    // "tw"/"th" resolve against the average character width/height in the
    // current (possibly r_font-size/r_font-family-overridden) font, not the RBR.
    const position = config.textPosition || "o";
    const avgCharWidth = getAverageCharWidth(
      config.fontFamily,
      config.fontSize,
      config.bold,
      config.italic,
      rootSvg
    );
    const avgCharHeight = config.fontSize;
    const offsetX = parseOffset(config.textOffsetX || 0, avgCharHeight, avgCharWidth);
    const offsetY = parseOffset(config.textOffsetY || 0, avgCharHeight, avgCharWidth);

    // 3. Render characters at preliminary positions (baseline y=0) into a hidden
    //    temporary group so we can measure the actual visual EBR via getBBox().
    //    This mirrors the hint renderer's approach: render → measure → reposition.
    //    Using config font metrics here ensures correct character widths.
    const initialPositions = this.calculateAdditionalTextPositions(nodes, 0, 0, config);

    const tempGroup = createSVGElement("g");
    tempGroup.setAttribute("visibility", "hidden");
    rootSvg.appendChild(tempGroup);

    const measuredElements: Array<{ el: SVGTextElement; node: CharNode; initX: number; initY: number }> = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const pos = initialPositions[i];
      if (isLineBreak(node) || isSpace(node)) continue;

      const textEl = createTextElement(node.data, {
        id: `n_${node.id}`,
        class: `node version-${versionTag}`,
        x: pos.x,
        y: pos.y,
      });
      applyTextStyle(textEl, {
        fontFamily: config.fontFamily,
        fontSize: config.fontSize,
        foreColor: config.foreColor,
        backColor: config.backColor,
        italic: config.italic,
        bold: config.bold,
      });
      tempGroup.appendChild(textEl);
      measuredElements.push({ el: textEl, node, initX: pos.x, initY: pos.y });
    }

    // 4. Measure actual visual EBR from the temp group
    const ebrBbox = getSafeBBox(tempGroup);
    const ebr: BoundingRect = {
      x: ebrBbox.x,
      y: ebrBbox.y,
      width: ebrBbox.width,
      height: ebrBbox.height,
      right: ebrBbox.x + ebrBbox.width,
      bottom: ebrBbox.y + ebrBbox.height,
    };

    // 5. Compute translation: align EBR with RBR using the same logic as hints
    const rbrAlignPoint = this.calculateRBRAlignmentPoint(position, rbr);
    const ebrAlignPoint = this.calculateEBRAlignmentPoint(position, ebr);
    const dx = rbrAlignPoint.x - ebrAlignPoint.x + offsetX;
    const dy = rbrAlignPoint.y - ebrAlignPoint.y + offsetY;

    tempGroup.remove();

    this._logger.debug("TextRenderer", `Text position calculated`, {
      position,
      rbr,
      ebr,
      rbrAlignPoint,
      ebrAlignPoint,
      offsets: { x: offsetX, y: offsetY },
      translation: { dx, dy },
    });

    // 6. Compute final textBounds for prolog check
    const textBounds: BoundingRect = {
      x: ebr.x + dx,
      y: ebr.y + dy,
      width: ebr.width,
      height: ebr.height,
      right: ebr.right + dx,
      bottom: ebr.bottom + dy,
    };

    // 7. Check if prolog panning is needed
    if (
      panZoomInstance &&
      viewportWidth &&
      viewportHeight &&
      this._settings.prologDuration > 0
    ) {
      const isVisible = this._animationEngine.isElementVisible(
        textBounds,
        panZoomInstance,
        viewportWidth,
        viewportHeight,
      );

      if (!isVisible) {
        this._logger.debug(
          "TextRenderer",
          `Additional text for ${versionTag} would be outside viewport, executing prolog`,
        );
        await this._animationEngine.animateProlog(
          panZoomInstance,
          textBounds,
          viewportWidth,
          viewportHeight,
          this._settings.prologDuration,
        );
      }
    }

    // 8. Get animation function if specified
    const animationFn = this._settings.charAnimationId
      ? this._animationEngine
          .getFactory()
          .resolveAnimation(
            `#${this._settings.charAnimationId}`,
            this._settings.animations,
            "char",
          )
      : undefined;

    // 9. Move each element to its final position and add to the SVG
    for (const { el, node, initX, initY } of measuredElements) {
      el.setAttribute("x", String(initX + dx));
      el.setAttribute("y", String(initY + dy));

      rootSvg.appendChild(el);

      const bbox = getSafeBBox(el);
      this._boundsCache.set(`n_${node.id}`, bbox);

      if (animationFn) {
        el.style.opacity = "0";
        await this._animationEngine.animate(el, animationFn, rootSvg);
      }
    }

    this._logger.timeEnd(`renderAdditionalText-${versionTag}`);
  }

  /**
   * Calculate positions for additional text characters.
   * Additional text flows left to right from the base position.
   * When config is provided its font metrics are used for character width
   * measurement, matching what applyTextStyle will actually render.
   */
  private calculateAdditionalTextPositions(
    nodes: CharNode[],
    baseX: number,
    baseY: number,
    config?: RenditionConfig,
  ): CharPosition[] {
    const positions: CharPosition[] = [];
    let currentX = baseX;
    const currentY = baseY;

    const fontSize = config?.fontSize ?? this._settings.fontSize;
    const fontFamily = config?.fontFamily ?? this._settings.fontFamily;
    const bold = config?.bold ?? this._settings.bold;
    const italic = config?.italic ?? this._settings.italic;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      if (isLineBreak(node)) {
        positions.push({ x: currentX, y: currentY, nodeId: node.id, lineNumber: 0 });
      } else if (isSpace(node)) {
        const spaceWidth = fontSize * 0.33;
        positions.push({ x: currentX, y: currentY, nodeId: node.id, lineNumber: 0 });
        currentX += spaceWidth + this._settings.charSpacing;
      } else {
        positions.push({ x: currentX, y: currentY, nodeId: node.id, lineNumber: 0 });
        const charWidth = getTextWidth(
          node.data,
          fontFamily,
          fontSize,
          bold,
          italic,
          this._measurementRoot,
        );
        currentX += charWidth + this._settings.charSpacing;
      }
    }

    return positions;
  }

  /**
   * Calculate the RBR anchor point for a given position type.
   * This is the point on the RBR where the corresponding EBR point will land.
   */
  private calculateRBRAlignmentPoint(
    position: string,
    rbr: BoundingRect,
  ): { x: number; y: number } {
    const centerX = rbr.x + rbr.width / 2;
    const centerY = rbr.y + rbr.height / 2;
    switch (position) {
      case "n":   return { x: centerX,   y: rbr.y      };
      case "ne":  return { x: rbr.right, y: rbr.y      };
      case "e":   return { x: rbr.right, y: centerY    };
      case "se":  return { x: rbr.right, y: rbr.bottom };
      case "s":   return { x: centerX,   y: rbr.bottom };
      case "sw":  return { x: rbr.x,     y: rbr.bottom };
      case "w":   return { x: rbr.x,     y: centerY    };
      case "nw":  return { x: rbr.x,     y: rbr.y      };
      case "inw": return { x: rbr.x,     y: rbr.y      };
      case "ine": return { x: rbr.right, y: rbr.y      };
      case "isw": return { x: rbr.x,     y: rbr.bottom };
      case "ise": return { x: rbr.right, y: rbr.bottom };
      case "o":
      default:    return { x: centerX,   y: centerY    };
    }
  }

  /**
   * Calculate the EBR anchor point for a given position type.
   * This is the point on the EBR that should coincide with the RBR anchor point.
   */
  private calculateEBRAlignmentPoint(
    position: string,
    ebr: BoundingRect,
  ): { x: number; y: number } {
    const centerX = ebr.x + ebr.width / 2;
    const centerY = ebr.y + ebr.height / 2;
    switch (position) {
      case "n":   return { x: centerX,   y: ebr.bottom };
      case "ne":  return { x: ebr.x,     y: ebr.bottom };
      case "e":   return { x: ebr.x,     y: centerY    };
      case "se":  return { x: ebr.x,     y: ebr.y      };
      case "s":   return { x: centerX,   y: ebr.y      };
      case "sw":  return { x: ebr.right, y: ebr.y      };
      case "w":   return { x: ebr.right, y: centerY    };
      case "nw":  return { x: ebr.right, y: ebr.bottom };
      case "inw": return { x: ebr.x,     y: ebr.y      };
      case "ine": return { x: ebr.right, y: ebr.y      };
      case "isw": return { x: ebr.x,     y: ebr.bottom };
      case "ise": return { x: ebr.right, y: ebr.bottom };
      case "o":
      default:    return { x: centerX,   y: centerY    };
    }
  }

  /**
   * Calculate RBRs from reference nodes.
   * Nodes on different lines create separate RBRs.
   *
   * @param rootSvg - Root SVG element, used to read each character's laid-out
   *   baseline `y` attribute for line-break detection (see below).
   */
  private calculateRBRs(nodes: CharNode[], rootSvg?: SVGElement): BoundingRect[] {
    if (nodes.length === 0) return [];

    const rbrs: BoundingRect[] = [];

    // Group nodes by line by checking their Y coordinates.
    // IMPORTANT: spaces and line breaks are skipped, exactly as in
    // HintRenderer.calculateRBRs. They have no SVG element, so the baseline
    // read below would fall back to their cached synthetic bounds top
    // (baseline - fontSize), which differs from neighboring characters'
    // baseline by ~fontSize — far beyond the 5px tolerance — falsely
    // splitting a single line into one group per word. Interior spaces
    // don't affect the union bounds anyway, since the flanking characters
    // cover their x-range.
    // IMPORTANT: this compares the character's laid-out baseline Y (the `y`
    // attribute TextLayout assigned when positioning it), NOT its cached
    // getBBox().y. The tight ink bbox top varies per glyph shape (ascenders,
    // descenders, x-height-only glyphs), easily by more than the 5px
    // tolerance below, even on the very same line — using bbox.y here would
    // spuriously split one line into multiple RBRs.
    const lineGroups: string[][] = [];
    let currentLineGroup: string[] = [];
    let lastBaselineY: number | null = null;

    for (const node of nodes) {
      if (isSpace(node) || isLineBreak(node)) {
        continue;
      }

      const elementId = `n_${node.id}`;
      const bounds = this._boundsCache.get(elementId);
      if (!bounds) {
        this._logger.warn(`Bounds not found for node element ${elementId}`);
        continue;
      }

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

    // Fallback: if every reference node is invisible (e.g. the operation's
    // reference span is a lone space), use the cached synthetic bounds of
    // all nodes as a single group so the added text still gets an RBR.
    if (lineGroups.length === 0) {
      const cachedIds = nodes
        .map((n) => `n_${n.id}`)
        .filter((id) => this._boundsCache.get(id) !== undefined);
      if (cachedIds.length > 0) {
        lineGroups.push(cachedIds);
      }
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
   * Update settings.
   */
  public updateSettings(settings: GveRenditionSettings): void {
    this._settings = settings;
    this._textLayout.updateSettings(settings);
  }
}
