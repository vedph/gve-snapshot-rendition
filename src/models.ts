// TODO: remove and import from external package (first add text to CharChainResult)

/**
 * Generic name=value feature.
 */
export interface Feature {
  name: string;
  value: string;
  setPolicy: FeatureSetPolicy;
}

/**
 * Operation feature set policy.
 */
export enum FeatureSetPolicy {
  multiple = 0,
  single,
  singleFirst,
}

/**
 * Operation feature.
 */
export interface OperationFeature extends Feature {
  isNegated?: boolean;
  isGlobal?: boolean;
  isShortLived?: boolean;
}

/**
 * Source about a text variant. This is typically used when
 * variants come from different witnesses.
 */
export interface OperationSource {
  id: string;
  type: string;
  rank?: number;
  note?: string;
}

/**
 * Diplomatic data for a text variant.
 */
export interface OperationDiplomatics {
  g: string;
  isNewTextHidden?: boolean;
  features?: Feature[];
  elementFeatures?: Record<string, Feature[]>;
}

/**
 * Generic metadata about a text variant generation operation.
 */
export interface OperationMetadata {
  type: OperationType;
  id: string;
  rank?: number;
  groupId?: string;
  features?: OperationFeature[];
  sources?: OperationSource[];
  diplomatics?: OperationDiplomatics;
}

/**
 * Type of a text operation.
 */
export enum OperationType {
  replace = 0,
  delete,
  addBefore,
  addAfter,
  moveBefore,
  moveAfter,
  swap,
  annotate,
}

/**
 * Metadata of a char-based chain operation.
 */
export interface CharChainOperation extends OperationMetadata {
  at: number;
  atAsIndex?: boolean;
  // to is for move and swap only
  to?: number;
  toAsIndex?: boolean;
  inputTag?: string;
  outputTag?: string;
  run: number;
  toRun?: number;
  value?: string;
  // from DTO
  noTraceFeatures?: boolean;
  dsl?: string;
}

/**
 * A single character node in an operation execution result.
 */
export interface CharNode {
  id: number;
  index: number;
  label: string;
  data: string;
  sourceTag?: string;
  features?: Feature[];
}

/**
 * Execution step of a char-based chain operation.
 */
export interface ChainOperationContextStep {
  /**
   * The operation that was executed.
   */
  operation: CharChainOperation;
  /**
   * The input version tag.
   */
  inputTag: string;
  /**
   * The output version tag.
   */
  outputTag: string;
  /**
   * The string synthetically representing the resulting text
   * version.
   */
  result?: string;
  /**
   * The features emitted up to the executed operation.
   * These are the features of the text as a whole, and
   * those belonging to specific nodes, each keyed under
   * a string built with `v` + output version tag + `_`
   * + node ID (e.g. `v1_2` for node with ID 2 at version 1).
   */
  featureSet: {
    features: OperationFeature[];
    nodeFeatures: Record<string, OperationFeature[]>;
  };
  /**
   * The reference node IDs of the operation which was
   * executed.
   */
  refNodeIds: number[];
}

/**
 * Result of execution of a char-based chain.
 */
export interface CharChainResult {
  /**
   * The base text, as an array of character nodes or string.
   * This is not returned by the API, but can be supplied
   * by the caller.
   */
  text?: CharNode[] | string;
  /**
   * The execution steps of the chain.
   */
  steps: ChainOperationContextStep[];
  /**
   * The chain dump, which is the text representation of the chain.
   */
  chainDump: string;
  /**
   * The list of all unique tags in the chain.
   */
  chainTags: string[];
  /**
   * The sets of nodes in their order, for each version tag.
   * These nodes are collected by following the path defined
   * by the set of links of each version tag; so each of the
   * sets contains only the nodes used at that step to build
   * the text version, with their features up to that stage.
   */
  taggedNodes: { [key: string]: CharNode[] };
}

/**
 * The input and output tags of a char-based chain operation.
 */
export interface ChainOperationTags {
  inputTag: string;
  outputTag: string;
}

/**
 * The node of a character-based chain, used for diagnostic
 * or demonstration purposes.
 */
export interface CharChainNode {
  id: number;
  label: string;
  data: string;
  sourceTag?: string;
}

/**
 * The link of a character-based chain, used for diagnostic
 * or demonstration purposes.
 */
export interface CharChainLink {
  tag: string;
  sourceId: number;
  targetId: number;
}

/**
 * The character-based chain, as resulting from running operations
 * on a base text, used for diagnostic or demonstration purposes.
 */
export interface CharChain {
  nodes: CharChainNode[];
  links: CharChainLink[];
}
