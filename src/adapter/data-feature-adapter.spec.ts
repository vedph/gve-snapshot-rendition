/**
 * Tests for the DataFeatureAdapter service.
 */

import { describe, it, expect } from "vitest";
import { DataFeatureAdapter } from "./data-feature-adapter.js";
import { ProcessingMode } from "./adapter-models.js";
import {
  CharChainResult,
  Feature,
  FeatureSetPolicy,
  OperationType,
} from "../models.js";

describe("DataFeatureAdapter", () => {
  const createFeature = (name: string, value: string): Feature => ({
    name,
    value,
    setPolicy: FeatureSetPolicy.multiple,
  });

  const createMockData = (): CharChainResult => ({
    text: "test",
    steps: [
      {
        operation: {
          type: OperationType.annotate,
          id: "op1",
          at: 1,
          run: 1,
          features: [
            {
              name: "op-feature",
              value: "should-not-change",
              setPolicy: FeatureSetPolicy.multiple,
            },
          ],
        },
        inputTag: "v0",
        outputTag: "v1",
        result: "test",
        featureSet: {
          features: [createFeature("global-feature", "old-value")],
          nodeFeatures: {
            v1_1: [createFeature("node-feature", "old-value")],
          },
        },
        refNodeIds: [1],
      },
    ],
    chainDump: "test",
    chainTags: ["v0", "v1"],
    taggedNodes: {
      v0: [
        {
          id: 1,
          index: 0,
          label: "t",
          data: "t",
          features: [createFeature("tagged-feature", "old-value")],
        },
      ],
      v1: [
        {
          id: 1,
          index: 0,
          label: "t",
          data: "t",
          features: [createFeature("tagged-feature", "old-value")],
        },
      ],
    },
  });

  describe("Basic adaptation", () => {
    it("should create a copy of the data", () => {
      const adapter = new DataFeatureAdapter({
        operations: [],
      });

      const originalData = createMockData();
      const adaptedData = adapter.adaptData(originalData);

      // Should be a different object
      expect(adaptedData).not.toBe(originalData);
      expect(adaptedData.steps[0]).not.toBe(originalData.steps[0]);
    });

    it("should not modify original data", () => {
      const adapter = new DataFeatureAdapter({
        operations: [
          {
            pattern: "global-feature=old-value",
            features: ["global-feature=new-value"],
            mode: ProcessingMode.REPLACE,
          },
        ],
      });

      const originalData = createMockData();
      const originalGlobalFeature =
        originalData.steps[0].featureSet.features[0];
      const originalValue = originalGlobalFeature.value;

      adapter.adaptData(originalData);

      // Original should be unchanged
      expect(originalData.steps[0].featureSet.features[0].value).toBe(
        originalValue
      );
    });
  });

  describe("Global features adaptation", () => {
    it("should adapt global features in steps", () => {
      const adapter = new DataFeatureAdapter({
        operations: [
          {
            pattern: "global-feature=old-value",
            features: ["global-feature=new-value"],
            mode: ProcessingMode.REPLACE,
          },
        ],
      });

      const data = createMockData();
      const result = adapter.adaptData(data);

      const globalFeatures = result.steps[0].featureSet.features;
      expect(globalFeatures).toHaveLength(1);
      expect(globalFeatures[0].value).toBe("new-value");
    });

    it("should add features when pattern matches", () => {
      const adapter = new DataFeatureAdapter({
        operations: [
          {
            pattern: "global-feature",
            features: ["added-feature=added-value"],
          },
        ],
      });

      const data = createMockData();
      const result = adapter.adaptData(data);

      const globalFeatures = result.steps[0].featureSet.features;
      expect(globalFeatures).toHaveLength(2);
      expect(globalFeatures[1].name).toBe("added-feature");
      expect(globalFeatures[1].value).toBe("added-value");
    });
  });

  describe("Node features adaptation", () => {
    it("should adapt node features in steps", () => {
      const adapter = new DataFeatureAdapter({
        operations: [
          {
            pattern: "node-feature=old-value",
            features: ["node-feature=new-value"],
            mode: ProcessingMode.REPLACE,
          },
        ],
      });

      const data = createMockData();
      const result = adapter.adaptData(data);

      const nodeFeatures = result.steps[0].featureSet.nodeFeatures["v1_1"];
      expect(nodeFeatures).toHaveLength(1);
      expect(nodeFeatures[0].value).toBe("new-value");
    });

    it("should adapt multiple node feature sets", () => {
      const data = createMockData();
      data.steps[0].featureSet.nodeFeatures["v1_2"] = [
        createFeature("node-feature", "old-value"),
      ];

      const adapter = new DataFeatureAdapter({
        operations: [
          {
            pattern: "node-feature=old-value",
            features: ["node-feature=new-value"],
            mode: ProcessingMode.REPLACE,
          },
        ],
      });

      const result = adapter.adaptData(data);

      expect(result.steps[0].featureSet.nodeFeatures["v1_1"][0].value).toBe(
        "new-value"
      );
      expect(result.steps[0].featureSet.nodeFeatures["v1_2"][0].value).toBe(
        "new-value"
      );
    });
  });

  describe("Tagged nodes adaptation", () => {
    it("should adapt features in taggedNodes", () => {
      const adapter = new DataFeatureAdapter({
        operations: [
          {
            pattern: "tagged-feature=old-value",
            features: ["tagged-feature=new-value"],
            mode: ProcessingMode.REPLACE,
          },
        ],
      });

      const data = createMockData();
      const result = adapter.adaptData(data);

      const v0Features = result.taggedNodes["v0"][0].features;
      const v1Features = result.taggedNodes["v1"][0].features;

      expect(v0Features).toHaveLength(1);
      expect(v0Features![0].value).toBe("new-value");
      expect(v1Features).toHaveLength(1);
      expect(v1Features![0].value).toBe("new-value");
    });

    it("should handle nodes without features", () => {
      const data = createMockData();
      data.taggedNodes["v0"][0].features = undefined;

      const adapter = new DataFeatureAdapter({
        operations: [
          {
            pattern: "any-feature",
            features: ["added=true"],
          },
        ],
      });

      // Should not throw
      expect(() => adapter.adaptData(data)).not.toThrow();
    });
  });

  describe("Operation features preservation", () => {
    it("should NOT adapt operation features", () => {
      const adapter = new DataFeatureAdapter({
        operations: [
          {
            pattern: "op-feature=should-not-change",
            features: ["op-feature=changed"],
            mode: ProcessingMode.REPLACE,
          },
        ],
      });

      const data = createMockData();
      const result = adapter.adaptData(data);

      const opFeatures = result.steps[0].operation.features;
      expect(opFeatures).toHaveLength(1);
      expect(opFeatures![0].value).toBe("should-not-change");
    });
  });

  describe("Multiple steps", () => {
    it("should adapt features in all steps", () => {
      const data = createMockData();
      data.steps.push({
        operation: {
          type: OperationType.annotate,
          id: "op2",
          at: 1,
          run: 1,
        },
        inputTag: "v1",
        outputTag: "v2",
        result: "test",
        featureSet: {
          features: [createFeature("global-feature", "old-value")],
          nodeFeatures: {},
        },
        refNodeIds: [1],
      });

      const adapter = new DataFeatureAdapter({
        operations: [
          {
            pattern: "global-feature=old-value",
            features: ["global-feature=new-value"],
            mode: ProcessingMode.REPLACE,
          },
        ],
      });

      const result = adapter.adaptData(data);

      expect(result.steps[0].featureSet.features[0].value).toBe("new-value");
      expect(result.steps[1].featureSet.features[0].value).toBe("new-value");
    });
  });

  describe("Complex transformation example", () => {
    it("should transform high-level features to rendition features", () => {
      const data: CharChainResult = {
        text: "test",
        steps: [
          {
            operation: {
              type: OperationType.annotate,
              id: "op1",
              at: 1,
              run: 1,
            },
            inputTag: "v0",
            outputTag: "v1",
            result: "test",
            featureSet: {
              features: [],
              nodeFeatures: {
                v1_1: [createFeature("epigram-nr", "12")],
              },
            },
            refNodeIds: [1],
          },
        ],
        chainDump: "test",
        chainTags: ["v0", "v1"],
        taggedNodes: {
          v0: [
            {
              id: 1,
              index: 0,
              label: "t",
              data: "t",
              features: [createFeature("epigram-nr", "12")],
            },
          ],
        },
      };

      const adapter = new DataFeatureAdapter({
        operations: [
          {
            pattern: "[num:epigram-nr==12]",
            features: [
              "r_hints=note",
              "r_hint-vars=note=$num.value",
              "r_h-position=nw",
              "r_h-offset-y=10",
              "r_h-scale-x=2",
            ],
            mode: ProcessingMode.REPLACE,
          },
        ],
      });

      const result = adapter.adaptData(data);

      // Check node features were adapted
      const nodeFeatures = result.steps[0].featureSet.nodeFeatures["v1_1"];
      expect(nodeFeatures.find((f) => f.name === "epigram-nr")).toBeUndefined();
      expect(nodeFeatures.find((f) => f.name === "r_hints")?.value).toBe(
        "note"
      );
      expect(nodeFeatures.find((f) => f.name === "r_hint-vars")?.value).toBe(
        "note=12"
      );
      expect(nodeFeatures.find((f) => f.name === "r_h-position")?.value).toBe(
        "nw"
      );
      expect(nodeFeatures.find((f) => f.name === "r_h-offset-y")?.value).toBe(
        "10"
      );
      expect(nodeFeatures.find((f) => f.name === "r_h-scale-x")?.value).toBe(
        "2"
      );

      // Check tagged node features were adapted
      const taggedFeatures = result.taggedNodes["v0"][0].features;
      expect(
        taggedFeatures!.find((f) => f.name === "epigram-nr")
      ).toBeUndefined();
      expect(taggedFeatures!.find((f) => f.name === "r_hints")?.value).toBe(
        "note"
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle empty steps", () => {
      const data: CharChainResult = {
        text: "test",
        steps: [],
        chainDump: "test",
        chainTags: ["v0"],
        taggedNodes: {},
      };

      const adapter = new DataFeatureAdapter({
        operations: [
          {
            pattern: "any",
            features: ["new=value"],
          },
        ],
      });

      const result = adapter.adaptData(data);
      expect(result.steps).toHaveLength(0);
    });

    it("should handle empty taggedNodes", () => {
      const data = createMockData();
      data.taggedNodes = {};

      const adapter = new DataFeatureAdapter({
        operations: [
          {
            pattern: "any",
            features: ["new=value"],
          },
        ],
      });

      expect(() => adapter.adaptData(data)).not.toThrow();
    });

    it("should handle steps without features", () => {
      const data = createMockData();
      data.steps[0].featureSet.features = [];
      data.steps[0].featureSet.nodeFeatures = {};

      const adapter = new DataFeatureAdapter({
        operations: [
          {
            pattern: "any",
            features: ["new=value"],
          },
        ],
      });

      const result = adapter.adaptData(data);
      expect(result.steps[0].featureSet.features).toHaveLength(0);
    });
  });
});
