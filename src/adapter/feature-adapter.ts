/**
 * Feature adapter service for transforming feature sets.
 */

import {
  FeatureAdapterSettings,
  AdapterOperation,
  ProcessingMode,
  AdapterError,
  PatternExpression,
} from "./adapter-models";
import { Feature } from "../models";
import { Parser } from "./parser";
import { FeatureMatcher } from "./matcher";

/**
 * Service for adapting features based on configured operations.
 */
export class FeatureAdapter {
  private settings: FeatureAdapterSettings;
  private compiledPatterns: Map<string, PatternExpression>;
  private matcher: FeatureMatcher;

  constructor(settings: FeatureAdapterSettings) {
    this.settings = settings;
    this.compiledPatterns = new Map();
    this.matcher = new FeatureMatcher();

    // Pre-compile all patterns
    this.compilePatterns();
  }

  /**
   * Adapt a feature array by applying all configured operations.
   */
  adapt(features: Feature[]): Feature[] {
    // Make a copy to avoid modifying the input
    let result = [...features];

    // Apply each operation in order
    for (const operation of this.settings.operations) {
      result = this.applyOperation(result, operation);
    }

    return result;
  }

  /**
   * Apply a single operation to a feature array.
   */
  private applyOperation(
    features: Feature[],
    operation: AdapterOperation
  ): Feature[] {
    const expression = this.compiledPatterns.get(operation.pattern);
    if (!expression) {
      throw new AdapterError(
        `Pattern not found in compiled patterns: ${operation.pattern}`
      );
    }

    // Match features
    const matchResult = this.matcher.match(features, expression);

    if (!matchResult.matched) {
      // No match, return features unchanged
      return features;
    }

    // Determine processing mode
    const mode = operation.mode || ProcessingMode.ADD;

    // Start with current features
    let result = [...features];

    // If mode is REPLACE, remove matched features
    if (mode === ProcessingMode.REPLACE) {
      result = result.filter((f) => !matchResult.matchedFeatures.includes(f));
    }

    // Add new features (if any)
    if (operation.features && operation.features.length > 0) {
      const newFeatures = this.createFeatures(
        operation.features,
        matchResult.captures
      );
      result.push(...newFeatures);
    }

    return result;
  }

  /**
   * Create features from feature specifications, resolving placeholders.
   */
  private createFeatures(
    featureSpecs: string[],
    captures: Map<string, { name: string; value: string }>
  ): Feature[] {
    const features: Feature[] = [];

    for (const spec of featureSpecs) {
      const eqIndex = spec.indexOf("=");
      if (eqIndex === -1) {
        throw new AdapterError(
          `Invalid feature specification (missing '='): ${spec}`
        );
      }

      let name = spec.substring(0, eqIndex).trim();
      let value = spec.substring(eqIndex + 1).trim();

      // Resolve placeholders
      name = this.resolvePlaceholders(name, captures);
      value = this.resolvePlaceholders(value, captures);

      features.push({
        name,
        value,
        setPolicy: 0, // Default set policy
      });
    }

    return features;
  }

  /**
   * Resolve placeholders in a string (e.g., $1.value, $color.name).
   */
  private resolvePlaceholders(
    text: string,
    captures: Map<string, { name: string; value: string }>
  ): string {
    return text.replace(
      /\$(\w+)\.(name|value)/g,
      (match, groupKey, property) => {
        const capture = captures.get(groupKey);
        if (!capture) {
          // Placeholder references non-existent group, return empty string
          console.warn(
            `Placeholder ${match} references non-existent capture group '${groupKey}'`
          );
          return "";
        }

        return property === "name" ? capture.name : capture.value;
      }
    );
  }

  /**
   * Pre-compile all patterns to detect errors early.
   */
  private compilePatterns(): void {
    for (const operation of this.settings.operations) {
      try {
        const parser = new Parser(operation.pattern);
        const expression = parser.parse();
        this.compiledPatterns.set(operation.pattern, expression);
      } catch (error) {
        if (error instanceof AdapterError) {
          throw new AdapterError(
            `Error compiling pattern "${operation.pattern}": ${error.message}`,
            error.position,
            error.context
          );
        }
        throw error;
      }
    }
  }
}
