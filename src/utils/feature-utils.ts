import { Feature, OperationFeature, CharNode } from "../models";

/**
 * Utility functions for working with features.
 */

/**
 * Get the value of a feature by name from a feature array.
 * Returns undefined if not found.
 */
export function getFeatureValue(
  features: Feature[] | undefined,
  name: string
): string | undefined {
  if (!features) return undefined;
  const feature = features.find((f) => f.name === name);
  return feature?.value;
}

/**
 * Check if a feature exists in a feature array.
 */
export function hasFeature(
  features: Feature[] | undefined,
  name: string
): boolean {
  if (!features) return false;
  return features.some((f) => f.name === name);
}

/**
 * Get all features with names starting with a specific prefix.
 */
export function getFeaturesByPrefix(
  features: Feature[] | undefined,
  prefix: string
): Feature[] {
  if (!features) return [];
  return features.filter((f) => f.name.startsWith(prefix));
}

/**
 * Get all rendition features (those starting with "r_").
 */
export function getRenditionFeatures(
  features: Feature[] | undefined
): Feature[] {
  return getFeaturesByPrefix(features, "r_");
}

/**
 * Get all trace features (those starting with "$").
 */
export function getTraceFeatures(features: Feature[] | undefined): Feature[] {
  return getFeaturesByPrefix(features, "$");
}

/**
 * Check if a feature is a trace feature.
 */
export function isTraceFeature(feature: Feature): boolean {
  return feature.name.startsWith("$");
}

/**
 * Check if a feature is a rendition feature.
 */
export function isRenditionFeature(feature: Feature): boolean {
  return feature.name.startsWith("r_");
}

/**
 * Filter out trace features from a feature array.
 */
export function filterTraceFeatures(
  features: Feature[] | undefined
): Feature[] {
  if (!features) return [];
  return features.filter((f) => !isTraceFeature(f));
}

/**
 * Filter out rendition features from a feature array (unless debug mode is on).
 */
export function filterRenditionFeatures(
  features: Feature[] | undefined,
  debug: boolean
): Feature[] {
  if (!features) return [];
  if (debug) return features; // Show all in debug mode
  return features.filter((f) => !isRenditionFeature(f));
}

/**
 * Parse an individual offset value for r_char-offset(s).
 * Accepts a plain number string (e.g. "10") or a suffixed value
 * (e.g. "0.5th", "2tw").  Suffixed values are kept as strings so they can
 * be resolved later when the average character dimensions are known.
 */
function parseCharOffsetValue(raw: string): number | string {
  // If it carries a tw/th unit suffix, return as-is for deferred resolution
  if (/^[-\d.]+(?:tw|th)$/.test(raw)) {
    return raw;
  }
  const num = parseFloat(raw);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse char-offsets feature value.
 * Format: "ID:y=...,x=... ID:y=...,x=..." (multiple patterns separated by space)
 * Each pattern: ID:y=value,x=value (y and x are optional, can be in any order)
 * Values can be plain pixels (e.g. "10") or use font-relative units:
 *   tw = average character width of the base text font
 *   th = average character height of the base text font (≈ font size)
 * e.g. "0.5th" = half the average character height, "2tw" = twice the average width.
 *
 * @returns Map of node ID to {x?: number|string, y?: number|string}
 */
export function parseCharOffsets(
  value: string
): Map<number, { x?: number | string; y?: number | string }> {
  const result = new Map<number, { x?: number | string; y?: number | string }>();

  // Split by space to get individual patterns
  const patterns = value.trim().split(/\s+/);

  for (const pattern of patterns) {
    // Parse pattern: ID:y=value,x=value or ID:x=value,y=value or ID:y=value or ID:x=value
    const match = pattern.match(/^(\d+):(.+)$/);
    if (!match) continue;

    const nodeId = parseInt(match[1], 10);
    const offsetsStr = match[2];

    const offsets: { x?: number | string; y?: number | string } = {};

    // Parse comma-separated x and y values
    const parts = offsetsStr.split(",");
    for (const part of parts) {
      const kv = part.trim().split("=");
      if (kv.length === 2) {
        const key = kv[0].trim();
        const val = parseCharOffsetValue(kv[1].trim());
        if (key === "x") offsets.x = val;
        else if (key === "y") offsets.y = val;
      }
    }

    if (offsets.x !== undefined || offsets.y !== undefined) {
      result.set(nodeId, offsets);
    }
  }

  return result;
}

/**
 * Parse displaced span reference.
 * Format: "IDxN" where ID is node ID and N is count
 * Example: "21x7" means starting from node 21, include 7 characters
 *
 * @returns {nodeId, count} or undefined if invalid
 */
export function parseDisplacedSpan(
  value: string
): { nodeId: number; count: number } | undefined {
  const match = value.match(/^(\d+)x(\d+)$/);
  if (!match) return undefined;

  return {
    nodeId: parseInt(match[1], 10),
    count: parseInt(match[2], 10),
  };
}

/**
 * Parse hint variable assignments from r_hint-vars feature.
 * Format: "name=value name=value ..."
 * Example: "color=red bold=1"
 *
 * @returns Map of variable name to value
 */
export function parseHintVars(value: string): Map<string, string> {
  const result = new Map<string, string>();

  // Match pattern name=value
  const pairs = value.trim().split(/\s+/);
  for (const pair of pairs) {
    const [name, val] = pair.split("=");
    if (name && val) {
      result.set(name.trim(), val.trim());
    }
  }

  return result;
}

/**
 * Get node features for a specific node at a specific version.
 * Node features are keyed as "vTAG_NODEID" in the nodeFeatures map.
 */
export function getNodeFeatures(
  nodeFeatures: Record<string, OperationFeature[]>,
  versionTag: string,
  nodeId: number
): OperationFeature[] {
  const key = `${versionTag}_${nodeId}`;
  return nodeFeatures[key] || [];
}
