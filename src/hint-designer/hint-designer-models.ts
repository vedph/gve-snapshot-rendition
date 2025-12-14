import { OperationHint } from "../settings/hint-models";

/**
 * String name-value pair used for hint variables.
 */
export interface StringPair {
  name: string;
  value: string;
}

/**
 * Data model for the hint designer component.
 */
export interface HintDesignerData {
  /** Dictionary of hints, keyed by hint ID */
  hints: Record<string, OperationHint>;
  /** Catalog of animation JS code fragments, keyed by ID */
  animations: Record<string, string>;
}

/**
 * Settings for the hint designer component.
 */
export interface HintDesignerSettings {
  /** Width of the hint's SVG design area in the editor */
  hintDesignWidth: number;
  /** Height of the hint's SVG design area in the editor */
  hintDesignHeight: number;
  /** Debug mode for verbose logging */
  debug: boolean;
}

/**
 * Default settings for the hint designer component.
 */
export const DEFAULT_HINT_DESIGNER_SETTINGS: HintDesignerSettings = {
  hintDesignWidth: 300,
  hintDesignHeight: 100,
  debug: false,
};
