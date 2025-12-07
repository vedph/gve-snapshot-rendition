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
 * Parse char-offsets feature value.
 * Format: "ID:y=...,x=... ID:y=...,x=..." (multiple patterns separated by space)
 * Each pattern: ID:y=value,x=value (y and x are optional, can be in any order)
 *
 * @returns Map of node ID to {x?: number, y?: number}
 */
export function parseCharOffsets(
  value: string
): Map<number, { x?: number; y?: number }> {
  const result = new Map<number, { x?: number; y?: number }>();

  // Split by space to get individual patterns
  const patterns = value.trim().split(/\s+/);

  for (const pattern of patterns) {
    // Parse pattern: ID:y=value,x=value or ID:x=value,y=value or ID:y=value or ID:x=value
    const match = pattern.match(/^(\d+):(.+)$/);
    if (!match) continue;

    const nodeId = parseInt(match[1], 10);
    const offsetsStr = match[2];

    const offsets: { x?: number; y?: number } = {};

    // Parse comma-separated x and y values
    const parts = offsetsStr.split(",");
    for (const part of parts) {
      const kv = part.trim().split("=");
      if (kv.length === 2) {
        const key = kv[0].trim();
        const val = parseFloat(kv[1].trim());
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
 * Parse border feature value.
 * Format: "EDGES THICKNESS PADDING TYPE COLOR"
 * Example: "tlbr 1 4 solid silver"
 *
 * @returns Parsed border configuration or undefined if invalid
 */
export function parseBorder(value: string):
  | {
      edges: { top: boolean; left: boolean; bottom: boolean; right: boolean };
      thickness: number;
      padding: number;
      type: string;
      color: string;
    }
  | undefined {
  const parts = value.trim().split(/\s+/);
  if (parts.length !== 5) return undefined;

  const [edgesStr, thicknessStr, paddingStr, type, color] = parts;

  const edges = {
    top: edgesStr.includes("t"),
    left: edgesStr.includes("l"),
    bottom: edgesStr.includes("b"),
    right: edgesStr.includes("r"),
  };

  const thickness = parseFloat(thicknessStr);
  const padding = parseFloat(paddingStr);

  if (isNaN(thickness) || isNaN(padding)) return undefined;

  return { edges, thickness, padding, type, color };
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
