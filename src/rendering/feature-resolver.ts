import { Feature, OperationFeature } from "../models";
import { GveRenditionSettings } from "../settings/settings";
import { Logger } from "../core/logger";
import {
  getFeatureValue,
  parseCharOffsets,
  parseDisplacedSpan,
  parseHintVars,
} from "../utils/feature-utils";

/**
 * Hint property overrides from r_h-* features.
 */
export interface HintOverrides {
  position?: string;
  offsetX?: string;
  offsetY?: string;
  scaleX?: string;
  scaleY?: string;
  rotation?: string;
  solid?: boolean;
  displacedSpan?: { nodeId: number; count: number };
}

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

  // r_t-* features for added text
  textPosition?: string;    // r_t-position
  textOffsetX: number | string;      // r_t-offset-x (can be string like "0.5th" for relative offsets)
  textOffsetY: number | string;      // r_t-offset-y (can be string like "0.5th" for relative offsets)
  textSolid?: boolean;      // r_t-solid
  textDisplacedSpan?: { nodeId: number; count: number }; // r_t-displaced-span
  textValue?: string;       // r_t-value (display-only override for operation value)

  hints?: string[]; // Array of hint IDs from r_hints

  // r_h-* hint overrides (applies to hints in operation)
  hintOverrides?: Map<string, HintOverrides>; // key=hint ID, value=overrides

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
   * @param nodeFeatureContext - Optional context for extracting node features for placeholder resolution
   * @returns Resolved rendition configuration
   */
  resolve(
    baseSettings: GveRenditionSettings,
    features: Feature[] | undefined,
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

    // Initialize hintOverrides map for r_h-* features
    config.hintOverrides = new Map<string, HintOverrides>();

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

        // r_t-* features for added text
        case "r_t-position":
          config.textPosition = value;
          break;

        case "r_t-offset-x":
          // Store the value as-is (number or string). It will be parsed later
          // in renderAdditionalText when RBR bounds are available.
          config.textOffsetX = typeof value === "number" ? value : value;
          break;

        case "r_t-offset-y":
          // Store the value as-is (number or string). It will be parsed later
          // in renderAdditionalText when RBR bounds are available.
          config.textOffsetY = typeof value === "number" ? value : value;
          break;

        case "r_t-solid":
          config.textSolid = value === "1" || value === "true";
          break;

        case "r_t-displaced-span":
          config.textDisplacedSpan = parseDisplacedSpan(value);
          if (!config.textDisplacedSpan) {
            this._logger.warn(`Invalid r_t-displaced-span value: ${value}`);
          }
          break;

        case "r_t-value":
          config.textValue = value;
          break;

        case "r_hints":
          config.hints = value.trim().split(/\s+/);
          break;

        case "r_hint-vars":
          // Parse custom variables and merge with existing hintVars
          const customVars = parseHintVars(value);
          customVars.forEach((val, key) => {
            config.hintVars!.set(key, val);
          });
          break;

        // r_h-* features for hint property overrides
        default:
          if (feature.name.startsWith("r_h-")) {
            this.parseHintOverride(feature.name, value, config);
          }
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

  /**
   * Parse r_h-* hint override features.
   * Format: "value" applies to all hints, or "@hintId1 hintId2:value" applies to specific hints.
   *
   * @param featureName - The feature name (e.g., "r_h-position")
   * @param value - The feature value
   * @param config - The rendition config to update
   */
  private parseHintOverride(
    featureName: string,
    value: string,
    config: RenditionConfig
  ): void {
    // Extract property name from feature name (r_h-position -> position)
    const propertyName = featureName.substring(4); // Remove "r_h-"

    // Parse value to check if it targets specific hints
    let targetHints: string[] | null = null; // null = all hints
    let actualValue = value;

    if (value.startsWith("@")) {
      // Format: "@hintId1 hintId2:value"
      const colonIndex = value.indexOf(":");
      if (colonIndex > 0) {
        const hintIdsStr = value.substring(1, colonIndex); // Remove "@" and get up to ":"
        targetHints = hintIdsStr.trim().split(/\s+/);
        actualValue = value.substring(colonIndex + 1);
      } else {
        this._logger.warn(
          `Invalid r_h-* format (missing colon): ${featureName}=${value}`
        );
        return;
      }
    }

    // If no hints defined yet in config, we'll still store the override
    // It will be applied when hints are processed
    const hints = targetHints || (config.hints ? config.hints : ["*"]);

    for (const hintId of hints) {
      // Get or create override object for this hint
      let override = config.hintOverrides!.get(hintId);
      if (!override) {
        override = {};
        config.hintOverrides!.set(hintId, override);
      }

      // Set the property value
      switch (propertyName) {
        case "position":
          override.position = actualValue;
          break;
        case "offset-x":
          override.offsetX = actualValue;
          break;
        case "offset-y":
          override.offsetY = actualValue;
          break;
        case "scale-x":
          override.scaleX = actualValue;
          break;
        case "scale-y":
          override.scaleY = actualValue;
          break;
        case "rotation":
          override.rotation = actualValue;
          break;
        case "solid":
          override.solid = actualValue === "1" || actualValue === "true";
          break;
        case "displaced-span":
          override.displacedSpan = parseDisplacedSpan(actualValue);
          if (!override.displacedSpan) {
            this._logger.warn(
              `Invalid r_h-displaced-span value: ${actualValue}`
            );
          }
          break;
        default:
          this._logger.warn(`Unknown hint override property: ${propertyName}`);
          break;
      }

      this._logger.debug(
        "FeatureResolver",
        `Added hint override for ${hintId}: ${propertyName}=${actualValue}`
      );
    }
  }
}
