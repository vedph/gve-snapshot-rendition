import { CharNode } from "../models";
import { GveRenditionSettings } from "../settings/settings";
import { Logger } from "../core/logger";
import { AnimationEngine } from "../animation/animation-engine";
import { BoundsCache } from "./bounds-cache";
import { TextLayout, CharPosition } from "./text-layout";
import { FeatureResolver, RenditionConfig } from "./feature-resolver";
import { isLineBreak, isSpace } from "../utils/node-utils";
import { createTextElement, applyTextStyle, getSafeBBox } from "./svg-utils";

/**
 * Text renderer handles rendering of base text and additional text.
 */
export class TextRenderer {
  private settings: GveRenditionSettings;
  private logger: Logger;
  private animationEngine: AnimationEngine;
  private boundsCache: BoundsCache;
  private textLayout: TextLayout;
  private featureResolver: FeatureResolver;

  constructor(
    settings: GveRenditionSettings,
    logger: Logger,
    animationEngine: AnimationEngine,
    boundsCache: BoundsCache
  ) {
    this.settings = settings;
    this.logger = logger;
    this.animationEngine = animationEngine;
    this.boundsCache = boundsCache;
    this.textLayout = new TextLayout(settings, logger);
    this.featureResolver = new FeatureResolver(logger);
  }

  /**
   * Render base text (v0).
   *
   * @param nodes - Character nodes to render
   * @param rootSvg - Root SVG element
   * @param charOffsets - Optional character offset overrides
   * @returns Promise that resolves when rendering completes
   */
  async renderBaseText(
    nodes: CharNode[],
    rootSvg: SVGElement,
    charOffsets?: Map<number, { x?: number; y?: number }>
  ): Promise<void> {
    this.logger.time("renderBaseText");
    this.logger.info(`Rendering ${nodes.length} base text characters`);

    const positions = this.textLayout.calculateBaseTextPositions(
      nodes,
      charOffsets
    );

    // Get animation function if specified
    const animationFn = this.settings.charAnimationId
      ? this.animationEngine
          .getFactory()
          .resolveAnimation(
            `#${this.settings.charAnimationId}`,
            this.settings.animations,
            "char"
          )
      : undefined;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const pos = positions[i];

      // Skip rendering for line breaks and spaces (they affect layout but aren't visible)
      if (isLineBreak(node) || isSpace(node)) {
        continue;
      }

      await this.renderCharacter(node, pos, rootSvg, "v0", animationFn);
    }

    this.logger.timeEnd("renderBaseText");
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
    const textEl = createTextElement(node.label, {
      id: `n_${node.id}`,
      class: `node ${versionTag}`,
      x: position.x,
      y: position.y,
    });

    // Apply default styling
    applyTextStyle(textEl, {
      fontFamily: this.settings.fontFamily,
      fontSize: this.settings.fontSize,
      foreColor: this.settings.foreColor,
      backColor: this.settings.backColor,
      italic: this.settings.italic,
      bold: this.settings.bold,
    });

    // Set initial opacity if animation is present
    if (animationFn) {
      textEl.setAttribute("opacity", "0");
    }

    rootSvg.appendChild(textEl);

    // Cache bounds
    const bbox = getSafeBBox(textEl);
    this.boundsCache.set(`n_${node.id}`, bbox);

    // Animate if function provided
    if (animationFn) {
      await this.animationEngine.animate(textEl, animationFn, rootSvg);
    }
  }

  /**
   * Render additional text added by operations.
   *
   * @param nodes - Nodes to render
   * @param rootSvg - Root SVG element
   * @param config - Rendition configuration
   * @param versionTag - Version tag for class
   * @returns Promise that resolves when rendering completes
   */
  async renderAdditionalText(
    nodes: CharNode[],
    rootSvg: SVGElement,
    config: RenditionConfig,
    versionTag: string
  ): Promise<void> {
    this.logger.debug(
      "TextRenderer",
      `Rendering ${nodes.length} additional text characters`
    );

    // TODO: Implement additional text rendering with proper positioning
    // This requires RBR calculation and feature-based positioning
    // For now, this is a placeholder

    this.logger.warn("renderAdditionalText not yet fully implemented");
  }

  /**
   * Update settings.
   */
  updateSettings(settings: GveRenditionSettings): void {
    this.settings = settings;
    this.textLayout.updateSettings(settings);
  }
}
