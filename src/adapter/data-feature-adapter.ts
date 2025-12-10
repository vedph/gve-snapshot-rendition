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
   * - steps[i].featureSet.features (global features)
   * - steps[i].featureSet.nodeFeatures (node-specific features)
   * - taggedNodes[version][i].features (features on nodes)
   *
   * Features NOT adapted:
   * - steps[i].operation.features (operation metadata)
   */
  adaptData(data: CharChainResult): CharChainResult {
    // Deep copy the data to avoid modifying the original
    const adaptedData = this.deepCopyData(data);

    // Adapt features in steps
    for (const step of adaptedData.steps) {
      // Adapt global features
      if (step.featureSet.features) {
        step.featureSet.features = this.featureAdapter.adapt(
          step.featureSet.features
        ) as any[];
      }

      // Adapt node features
      if (step.featureSet.nodeFeatures) {
        for (const nodeKey in step.featureSet.nodeFeatures) {
          const nodeFeatures = step.featureSet.nodeFeatures[nodeKey];
          step.featureSet.nodeFeatures[nodeKey] = this.featureAdapter.adapt(
            nodeFeatures
          ) as any[];
        }
      }

      // Note: We do NOT adapt step.operation.features as specified
    }

    // Adapt features in taggedNodes
    if (adaptedData.taggedNodes) {
      for (const versionTag in adaptedData.taggedNodes) {
        const nodes = adaptedData.taggedNodes[versionTag];
        for (const node of nodes) {
          if (node.features) {
            node.features = this.featureAdapter.adapt(node.features);
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
