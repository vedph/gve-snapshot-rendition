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
  /** Features keyed by version tag (e.g. "v1" → feature list). */
  features?: Record<string, Feature[]>;
}

/**
 * Execution step of a char-based chain operation.
 */
export interface ChainOperationContextStep {
  /** The operation that was executed. */
  operation: CharChainOperation;
  /** The input version tag. */
  inputTag: string;
  /** The output version tag. */
  outputTag: string;
  /** The string synthetically representing the resulting text version. */
  result?: string;
  /** The reference node IDs of the operation which was executed. */
  refNodeIds: number[];
}

/**
 * Result of execution of a char-based chain.
 */
export interface CharChainResult {
  /** The execution steps of the chain. */
  steps: ChainOperationContextStep[];
  /** The chain dump, which is the text representation of the chain. */
  chainDump: string | null;
  /** The list of all unique tags in the chain, including v0. */
  chainTags: string[];
  /**
   * All character nodes in the chain (base text and added nodes).
   * Node features are keyed by version tag.
   */
  nodes: CharNode[];
  /**
   * IDs of nodes forming each version's text, keyed by version tag.
   * Includes v0 (base text).
   */
  versionNodeIds: Record<string, number[]>;
  /**
   * Global features accumulated up to each version, keyed by version tag.
   * Includes v0 (empty list).
   */
  globalFeatures: Record<string, OperationFeature[]>;
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
