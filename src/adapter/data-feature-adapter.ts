/**
 * Data feature adapter for applying feature transformations to CharChainResult data.
 */

import { CharChainResult } from "../models";
import { FeatureAdapter } from "./feature-adapter";
import { FeatureAdapterSettings } from "./adapter-models";

/**
 * Adapter service that applies feature transformations to CharChainResult data.
 * This service creates a copy of the data and adapts all features except those
 * belonging to operation metadata.
 */
export class DataFeatureAdapter {
  private featureAdapter: FeatureAdapter;

  constructor(settings: FeatureAdapterSettings) {
    this.featureAdapter = new FeatureAdapter(settings);
  }

  /**
   * Adapt all features in the CharChainResult data.
   * Returns a new copy of the data with adapted features.
   *
   * Features adapted:
   * - globalFeatures[tag][i] (global features per version)
   * - nodes[i].features[tag][j] (per-node, per-version features)
   *
   * Features NOT adapted:
   * - steps[i].operation.features (operation metadata)
   */
  adaptData(data: CharChainResult): CharChainResult {
    const adaptedData = this.deepCopyData(data);

    // Adapt global features (keyed by version tag)
    if (adaptedData.globalFeatures) {
      for (const tag in adaptedData.globalFeatures) {
        adaptedData.globalFeatures[tag] = this.featureAdapter.adapt(
          adaptedData.globalFeatures[tag]
        ) as any[];
      }
    }

    // Adapt node features (each node has a dict keyed by version tag)
    if (adaptedData.nodes) {
      for (const node of adaptedData.nodes) {
        if (node.features) {
          for (const tag in node.features) {
            node.features[tag] = this.featureAdapter.adapt(node.features[tag]);
          }
        }
      }
    }

    return adaptedData;
  }

  /**
   * Deep copy the CharChainResult data structure.
   */
  private deepCopyData(data: CharChainResult): CharChainResult {
    // Use JSON serialization for deep copy
    // This works well for data structures without functions or circular references
    return JSON.parse(JSON.stringify(data));
  }
}
