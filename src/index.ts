/**
 * GVE Snapshot Rendition Component
 *
 * A web component for rendering interactive text transformations
 * based on the GVE snapshot model.
 */

// Export main component
export { GveSnapshotRendition } from "./core/gve-snapshot-rendition";

// Export types
export type {
  GveRenditionSettings,
  CustomButtonSettings,
} from "./settings/settings";

export type { OperationHint, HintPosition } from "./settings/hint-models";

export { DEFAULT_SETTINGS } from "./settings/settings";

// Export models (re-export from models.ts)
export type {
  Feature,
  OperationFeature,
  OperationSource,
  OperationDiplomatics,
  OperationMetadata,
  CharChainOperation,
  CharNode,
  ChainOperationContextStep,
  CharChainResult,
  ChainOperationTags,
  CharChainNode,
  CharChainLink,
  CharChain,
} from "./models";

export { FeatureSetPolicy, OperationType } from "./models";
