import { CharChainResult, CharNode, ChainOperationContextStep, OperationType } from "../models";
import { Logger } from "../core/logger";

/**
 * Service for building operation summaries.
 * Provides helper functions to extract and format operation data.
 */
export class OperationSummaryService {
  private _logger: Logger;
  private _data: CharChainResult | null = null;

  constructor(logger: Logger) {
    this._logger = logger;
  }

  /**
   * Update the data reference.
   */
  setData(data: CharChainResult | null): void {
    this._data = data;
  }

  /**
   * Get operation by version tag.
   * @param versionTag - Version tag (e.g., "v1", "v2")
   * @returns The step containing the operation, or null
   */
  getStepByVersionTag(versionTag: string): ChainOperationContextStep | null {
    if (!this._data || !this._data.steps) return null;

    const versionIndex = this.getVersionIndex(versionTag);
    if (versionIndex === 0) return null; // v0 has no operation

    const stepIndex = versionIndex - 1;
    if (stepIndex < 0 || stepIndex >= this._data.steps.length) return null;

    return this._data.steps[stepIndex];
  }

  /**
   * Get operation by ID.
   * @param operationId - Operation ID
   * @returns The step containing the operation, or null
   */
  getStepByOperationId(operationId: string): ChainOperationContextStep | null {
    if (!this._data || !this._data.steps) return null;

    return this._data.steps.find((step) => step.operation.id === operationId) || null;
  }

  /**
   * Get text from a node ID by searching in version tagged nodes.
   * @param nodeId - Node ID
   * @param versionTag - Version tag to search in (searches backwards if not found)
   * @returns The node's text, or empty string
   */
  getNodeText(nodeId: number, versionTag: string): string {
    const node = this.getNode(nodeId, versionTag);
    return node ? node.data : "";
  }

  /**
   * Get a node by ID, searching in version tagged nodes.
   * @param nodeId - Node ID
   * @param versionTag - Version tag to search in (searches backwards if not found)
   * @returns The node, or null
   */
  getNode(nodeId: number, versionTag: string): CharNode | null {
    if (!this._data || !this._data.taggedNodes) return null;

    // Search from the specified version backwards to v0
    const versionIndex = this.getVersionIndex(versionTag);

    for (let idx = versionIndex; idx >= 0; idx--) {
      const tag = `v${idx}`;
      const nodes = this._data.taggedNodes[tag];
      if (nodes) {
        const node = nodes.find((n) => n.id === nodeId);
        if (node) return node;
      }
    }

    return null;
  }

  /**
   * Get text from a span of nodes.
   * @param nodeIds - Array of node IDs
   * @param versionTag - Version tag
   * @returns Concatenated text
   */
  getSpanText(nodeIds: number[], versionTag: string): string {
    return nodeIds.map((id) => this.getNodeText(id, versionTag)).join("");
  }

  /**
   * Get context text around a node or span, including the affected text.
   * Uses node positions (at index) rather than searching by ID to handle deleted nodes.
   * @param nodeIds - Node IDs of the target span
   * @param versionTag - Version tag
   * @param atPosition - The 'at' position from the operation (node index)
   * @param contextSize - Number of characters before/after (default: 20)
   * @returns Context text including the affected span
   */
  getContext(nodeIds: number[], versionTag: string, atPosition?: number, contextSize: number = 20): string {
    if (!this._data || !this._data.taggedNodes || nodeIds.length === 0) {
      return "";
    }

    const versionNodes = this._data.taggedNodes[versionTag];
    if (!versionNodes) return "";

    // If atPosition is provided, use it; otherwise find the first node
    let firstNodeIndex = -1;
    if (atPosition !== undefined) {
      // For operations that work with positions (delete, replace, etc.)
      firstNodeIndex = atPosition;
    } else {
      // For operations where nodes exist in the version (move, swap, annotate)
      const firstNodeId = nodeIds[0];
      firstNodeIndex = versionNodes.findIndex((n) => n.id === firstNodeId);
    }

    if (firstNodeIndex === -1) {
      return "";
    }

    // Get text before
    let beforeText = "";
    let beforeCount = 0;
    for (let i = firstNodeIndex - 1; i >= 0 && beforeCount < contextSize; i--) {
      const text = versionNodes[i].data;
      beforeText = text + beforeText;
      beforeCount += text.length;
    }

    // Trim at word boundary if too long
    if (beforeText.length > contextSize) {
      let trimmed = beforeText.substring(beforeText.length - contextSize);
      // Find first space or newline to avoid cutting words
      const firstSpace = trimmed.search(/[\s\n]/);
      if (firstSpace > 0 && firstSpace < trimmed.length / 2) {
        trimmed = trimmed.substring(firstSpace + 1);
      }
      beforeText = "..." + trimmed;
    }

    // Get the affected text (the span itself)
    let spanText = "";
    const lastNodeIndex = firstNodeIndex + nodeIds.length - 1;
    if (firstNodeIndex < versionNodes.length) {
      for (let i = firstNodeIndex; i <= lastNodeIndex && i < versionNodes.length; i++) {
        spanText += versionNodes[i].data;
      }
    }

    // Get text after (start from the position after the span)
    let afterText = "";
    let afterCount = 0;
    for (let i = lastNodeIndex + 1; i < versionNodes.length && afterCount < contextSize; i++) {
      const text = versionNodes[i].data;
      afterText += text;
      afterCount += text.length;
    }

    // Trim at word boundary if too long
    if (afterText.length > contextSize) {
      let trimmed = afterText.substring(0, contextSize);
      // Find last space or newline to avoid cutting words
      const lastSpace = trimmed.search(/[\s\n][^\s\n]*$/);
      if (lastSpace > trimmed.length / 2) {
        trimmed = trimmed.substring(0, lastSpace);
      }
      afterText = trimmed + "...";
    }

    // Combine: before + span + after
    return beforeText + spanText + afterText;
  }

  /**
   * Get the operation type as a readable string.
   */
  getOperationTypeName(type: OperationType): string {
    const typeNames: Record<OperationType, string> = {
      [OperationType.replace]: "replace",
      [OperationType.delete]: "delete",
      [OperationType.addBefore]: "add-before",
      [OperationType.addAfter]: "add-after",
      [OperationType.moveBefore]: "move-before",
      [OperationType.moveAfter]: "move-after",
      [OperationType.swap]: "swap",
      [OperationType.annotate]: "annotate",
    };

    return typeNames[type] || "unknown";
  }

  /**
   * Get version index from version tag.
   */
  private getVersionIndex(versionTag: string): number {
    const match = versionTag.match(/^v(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Escape HTML special characters.
   */
  escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
