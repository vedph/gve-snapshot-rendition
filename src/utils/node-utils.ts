import { CharNode } from "../models";

/**
 * Utility functions for working with character nodes.
 */

/**
 * Generate character nodes from a string.
 * Each character gets a node with a sequential ID starting from 1.
 *
 * @param text - The text to convert to nodes
 * @returns Array of character nodes
 */
export function stringToNodes(text: string): CharNode[] {
  const nodes: CharNode[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    nodes.push({
      id: i + 1, // IDs start from 1
      index: i,
      data: char,
      label: char === "\n" ? "↵" : char === " " ? "␣" : char, // Use visual labels for non-printable chars
      sourceTag: "v0", // Base text always has source tag v0
      features: [],
    });
  }

  return nodes;
}

/**
 * Get a label for a character node suitable for display.
 * Uses special symbols for whitespace characters.
 */
export function getNodeLabel(node: CharNode): string {
  return node.label;
}

/**
 * Check if a node represents a line break.
 */
export function isLineBreak(node: CharNode): boolean {
  return node.data === "\n";
}

/**
 * Check if a node represents a space.
 */
export function isSpace(node: CharNode): boolean {
  return node.data === " ";
}

/**
 * Check if a node is printable (not a space or line break).
 */
export function isPrintable(node: CharNode): boolean {
  return !isLineBreak(node) && !isSpace(node);
}

/**
 * Find a node by ID in an array of nodes.
 */
export function findNodeById(
  nodes: CharNode[],
  id: number
): CharNode | undefined {
  return nodes.find((n) => n.id === id);
}

/**
 * Get a range of nodes starting from a specific node ID.
 * Used for processing displaced spans (IDxN format).
 *
 * @param nodes - All available nodes
 * @param startId - Starting node ID
 * @param count - Number of nodes to include
 * @returns Array of nodes in the span, or empty array if not found
 */
export function getNodeSpan(
  nodes: CharNode[],
  startId: number,
  count: number
): CharNode[] {
  const result: CharNode[] = [];

  // Find start node
  const startIndex = nodes.findIndex((n) => n.id === startId);
  if (startIndex === -1) return result;

  // Collect subsequent nodes
  for (let i = 0; i < count && startIndex + i < nodes.length; i++) {
    result.push(nodes[startIndex + i]);
  }

  return result;
}

/**
 * Get nodes by their IDs.
 */
export function getNodesByIds(nodes: CharNode[], ids: number[]): CharNode[] {
  return ids
    .map((id) => findNodeById(nodes, id))
    .filter((n) => n !== undefined) as CharNode[];
}
