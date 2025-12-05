import { Feature, OperationFeature } from "../models";
import { GveRenditionSettings } from "../settings/settings";
import { Logger } from "../core/logger";
import {
  getFeatureValue,
  parseCharOffsets,
  parseBorder,
  parseDisplacedSpan,
  parseHintVars,
} from "../utils/feature-utils";
import { parseOffset } from "../utils/text-utils";

/**
 * Resolved rendition configuration for text rendering.
 */
export interface RenditionConfig {
  fontSize: number;
  fontFamily: string;
  foreColor: string;
  backColor: string;
  italic: boolean;
  bold: boolean;
  underline?: number;
  overline?: number;
  strike?: number;
  textLineStyle?: string;
  textLineColor?: string;
  rotate?: number;
  textPosition?: string;
  textOffsetX: number;
  textOffsetY: number;
  hints?: string[]; // Array of hint IDs
  border?: {
    edges: { top: boolean; left: boolean; bottom: boolean; right: boolean };
    thickness: number;
    padding: number;
    type: string;
    color: string;
  };
  textDisplacedSpan?: { nodeId: number; count: number };
  hintVars?: Map<string, string>;
}

/**
 * Feature resolver converts features into rendition configuration.
 * This handles all the r_* rendition features and applies them to create
 * a complete configuration for rendering.
 */
export class FeatureResolver {
  private _logger: Logger;

  constructor(logger: Logger) {
    this._logger = logger;
  }

  /**
   * Resolve rendition features into a complete configuration.
   * Features override the base settings.
   *
   * @param baseSettings - The base settings from component
   * @param features - Array of features to apply
   * @param textBounds - Optional text bounds for offset calculations
   * @param nodeFeatureContext - Optional context for extracting node features for placeholder resolution
   * @returns Resolved rendition configuration
   */
  resolve(
    baseSettings: GveRenditionSettings,
    features: Feature[] | undefined,
    textBounds?: { width: number; height: number },
    nodeFeatureContext?: {
      nodeFeatures: Record<string, OperationFeature[]>;
      outputTag: string;
      refNodeIds: number[];
    }
  ): RenditionConfig {
    const config: RenditionConfig = {
      fontSize: baseSettings.fontSize,
      fontFamily: baseSettings.fontFamily,
      foreColor: baseSettings.foreColor,
      backColor: baseSettings.backColor,
      italic: baseSettings.italic,
      bold: baseSettings.bold,
      underline: baseSettings.underline,
      overline: baseSettings.overline,
      strike: baseSettings.strike,
      textOffsetX: 0,
      textOffsetY: 0,
    };

    if (!features || features.length === 0) {
      return config;
    }

    // Initialize hintVars map - will contain ALL feature values for placeholder
    // replacement
    config.hintVars = new Map<string, string>();

    // First, extract ALL features from reference nodes for placeholder resolution
    // This includes features like "note", "group", etc. that don't have r_ prefix
    // Features are stored in featureSet.nodeFeatures with keys like "v6_64" (outputTag_nodeId)
    if (nodeFeatureContext) {
      const { nodeFeatures, outputTag, refNodeIds } = nodeFeatureContext;

      for (const nodeId of refNodeIds) {
        // Construct the key: outputTag + "_" + nodeId (e.g., "v6_64")
        const key = `${outputTag}_${nodeId}`;
        const nodeFeaturesArray = nodeFeatures[key];

        if (!nodeFeaturesArray) continue;

        for (const nodeFeature of nodeFeaturesArray) {
          // Skip internal features (starting with $)
          if (nodeFeature.name.startsWith("$")) continue;

          // Add feature to hintVars if not already present
          // Note: we take the first occurrence if multiple nodes have the same feature
          if (!config.hintVars.has(nodeFeature.name)) {
            config.hintVars.set(nodeFeature.name, nodeFeature.value);
            this._logger.debug(
              "FeatureResolver",
              `Added node feature to hintVars from ${key}: ${nodeFeature.name}=${nodeFeature.value}`
            );
          }
        }
      }
    }

    // Process each rendition feature from operation
    for (const feature of features) {
      if (!feature.name.startsWith("r_")) continue;

      const value = feature.value;

      // Add ALL r_* features to hintVars for placeholder replacement
      // This allows {{r_fore-color}}, {{r_font-size}}, etc. in hint SVG templates
      // These override any node features with the same name
      config.hintVars.set(feature.name, value);

      switch (feature.name) {
        case "r_font-size":
          config.fontSize = parseFloat(value);
          break;

        case "r_font-family":
          config.fontFamily = value;
          break;

        case "r_fore-color":
          config.foreColor = value;
          break;

        case "r_back-color":
          config.backColor = value;
          break;

        case "r_italic":
          config.italic = value === "true" || value === "1";
          break;

        case "r_bold":
          config.bold = value === "true" || value === "1";
          break;

        case "r_underline":
          config.underline = parseFloat(value);
          break;

        case "r_overline":
          config.overline = parseFloat(value);
          break;

        case "r_strike":
          config.strike = parseFloat(value);
          break;

        case "r_text-line-style":
          config.textLineStyle = value;
          break;

        case "r_text-line-color":
          config.textLineColor = value;
          break;

        case "r_rotate":
          config.rotate = parseFloat(value);
          break;

        case "r_text-position":
          config.textPosition = value;
          break;

        case "r_text-offset-x":
          if (textBounds) {
            config.textOffsetX = parseOffset(
              value,
              textBounds.height,
              textBounds.width
            );
          } else {
            config.textOffsetX =
              typeof value === "number" ? value : parseFloat(value);
          }
          break;

        case "r_text-offset-y":
          if (textBounds) {
            config.textOffsetY = parseOffset(
              value,
              textBounds.height,
              textBounds.width
            );
          } else {
            config.textOffsetY =
              typeof value === "number" ? value : parseFloat(value);
          }
          break;

        case "r_hints":
          config.hints = value.trim().split(/\s+/);
          break;

        case "r_border":
          config.border = parseBorder(value);
          if (!config.border) {
            this._logger.warn(`Invalid r_border value: ${value}`);
          }
          break;

        case "r_text-displaced-span":
          config.textDisplacedSpan = parseDisplacedSpan(value);
          if (!config.textDisplacedSpan) {
            this._logger.warn(`Invalid r_text-displaced-span value: ${value}`);
          }
          break;

        case "r_hint-vars":
          // Parse custom variables and merge with existing hintVars
          const customVars = parseHintVars(value);
          customVars.forEach((val, key) => {
            config.hintVars!.set(key, val);
          });
          break;
      }
    }

    return config;
  }

  /**
   * Extract character offsets from init features.
   * This is used for base text layout adjustments.
   *
   * @param features - Features from the first annotate operation (init features)
   * @returns Map of node IDs to their offsets
   */
  extractCharOffsets(
    features: Feature[] | undefined
  ): Map<number, { x?: number; y?: number }> {
    if (!features) return new Map();

    const charOffsetsValue = getFeatureValue(features, "r_char-offsets");
    if (!charOffsetsValue) return new Map();

    return parseCharOffsets(charOffsetsValue);
  }

  /**
   * Check if features contain a specific rendition feature.
   */
  hasRenditionFeature(
    features: Feature[] | undefined,
    featureName: string
  ): boolean {
    if (!features) return false;
    return features.some((f) => f.name === featureName);
  }

  /**
   * Get the value of a rendition feature.
   */
  getRenditionFeatureValue(
    features: Feature[] | undefined,
    featureName: string
  ): string | undefined {
    return getFeatureValue(features, featureName);
  }
}
