/**
 * GVE Snapshot Rendition Component
 *
 * A web component for rendering interactive text transformations
 * based on the GVE snapshot model.
 */

// Export main component
export { GveSnapshotRendition } from "./core/gve-snapshot-rendition";

// Export hint designer component
export { GveHintDesigner } from "./hint-designer/gve-hint-designer";

// Export types
export type { RelativePosition } from "./core/gve-snapshot-rendition";

export type {
  GveRenditionSettings,
  CustomButtonSettings,
} from "./settings/settings";

export type { OperationHint } from "./settings/hint-models";

export { DEFAULT_SETTINGS } from "./settings/settings";

// Export hint designer types
export type {
  HintDesignerData,
  HintDesignerSettings,
  StringPair,
} from "./hint-designer/hint-designer-models";

export { DEFAULT_HINT_DESIGNER_SETTINGS } from "./hint-designer/hint-designer-models";

// Export operation summary service
export { OperationSummaryService } from "./ui/operation-summary-service";

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
