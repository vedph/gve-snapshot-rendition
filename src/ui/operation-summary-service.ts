import {
  CharChainResult,
  CharNode,
  ChainOperationContextStep,
  OperationType,
} from "../models";
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

    return (
      this._data.steps.find((step) => step.operation.id === operationId) || null
    );
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
   *
   * Searches backwards from the specified version to v0. Since v0 is normalized
   * and added to taggedNodes by the component during data processing, no special
   * handling is needed.
   *
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
   * Extends context to word boundaries (space or LF) after collecting minimum characters.
   * @param nodeIds - Node IDs of the target span (used when atAsIndex is false)
   * @param versionTag - Version tag
   * @param atValue - The 'at' value from the operation (node ID or index depending on atAsIndex)
   * @param atAsIndex - Whether 'at' is an index (true) or node ID (false)
   * @param contextSize - Minimum number of characters before/after (default: 20)
   * @returns Context text including the affected span
   */
  getContext(
    nodeIds: number[],
    versionTag: string,
    atValue?: number,
    atAsIndex: boolean = false,
    contextSize: number = 20
  ): string {
    if (!this._data || !this._data.taggedNodes || nodeIds.length === 0) {
      return "";
    }

    const versionNodes = this._data.taggedNodes[versionTag];
    if (!versionNodes) return "";

    // Find the index of the first node in the span
    let firstNodeIndex = -1;
    if (atValue !== undefined) {
      if (atAsIndex) {
        // atValue is already an index
        firstNodeIndex = atValue;
      } else {
        // atValue is a node ID, find its index
        firstNodeIndex = versionNodes.findIndex((n) => n.id === atValue);
      }
    } else {
      // No atValue provided, search for the first node ID
      const firstNodeId = nodeIds[0];
      firstNodeIndex = versionNodes.findIndex((n) => n.id === firstNodeId);
    }

    if (firstNodeIndex === -1) {
      return "";
    }

    // Get the affected text (the span itself)
    let spanText = "";
    const lastNodeIndex = firstNodeIndex + nodeIds.length - 1;
    for (let i = firstNodeIndex; i <= lastNodeIndex && i < versionNodes.length; i++) {
      spanText += versionNodes[i].data;
    }

    // Get text before: collect at least contextSize chars, then extend to word boundary
    let beforeText = "";
    let charCount = 0;
    for (let i = firstNodeIndex - 1; i >= 0; i--) {
      const text = versionNodes[i].data;
      beforeText = text + beforeText;
      charCount += text.length;

      // After collecting minimum chars, stop at first space/LF
      if (charCount >= contextSize && /[\s\n]/.test(text)) {
        break;
      }
    }

    // Trim leading text if too long, keeping word boundary
    if (beforeText.length > contextSize * 2) {
      const startPos = beforeText.length - contextSize * 2;
      let trimmed = beforeText.substring(startPos);
      // Find first space/LF to avoid cutting words
      const firstSpace = trimmed.search(/[\s\n]/);
      if (firstSpace !== -1) {
        trimmed = trimmed.substring(firstSpace + 1);
      }
      beforeText = "..." + trimmed;
    }

    // Get text after: collect at least contextSize chars, then extend to word boundary
    let afterText = "";
    charCount = 0;
    for (let i = lastNodeIndex + 1; i < versionNodes.length; i++) {
      const text = versionNodes[i].data;
      afterText += text;
      charCount += text.length;

      // After collecting minimum chars, stop at first space/LF
      if (charCount >= contextSize && /[\s\n]/.test(text)) {
        break;
      }
    }

    // Trim trailing text if too long, keeping word boundary
    if (afterText.length > contextSize * 2) {
      let trimmed = afterText.substring(0, contextSize * 2);
      // Find last space/LF to avoid cutting words
      const lastSpaceMatch = trimmed.match(/[\s\n](?=[^\s\n]*$)/);
      if (lastSpaceMatch && lastSpaceMatch.index !== undefined) {
        trimmed = trimmed.substring(0, lastSpaceMatch.index);
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
