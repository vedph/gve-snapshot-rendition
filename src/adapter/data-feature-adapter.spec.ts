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
        refNodeIds: [1],
      },
    ],
    chainDump: "test",
    chainTags: ["v0", "v1"],
    nodes: [
      {
        id: 1,
        index: 0,
        label: "t",
        data: "t",
        sourceTag: "v0",
        features: {
          v0: [createFeature("tagged-feature", "old-value")],
          v1: [createFeature("node-feature", "old-value")],
        },
      },
    ],
    versionNodeIds: {
      v0: [1],
      v1: [1],
    },
    globalFeatures: {
      v0: [],
      v1: [createFeature("global-feature", "old-value")],
    },
  });

  describe("Basic adaptation", () => {
    it("should create a copy of the data", () => {
      const adapter = new DataFeatureAdapter({
        operations: [],
      });

      const originalData = createMockData();
      const adaptedData = adapter.adaptData(originalData);

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
      const originalValue = originalData.globalFeatures["v1"][0].value;

      adapter.adaptData(originalData);

      expect(originalData.globalFeatures["v1"][0].value).toBe(originalValue);
    });
  });

  describe("Global features adaptation", () => {
    it("should adapt global features", () => {
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

      const globalFeatures = result.globalFeatures["v1"];
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

      const globalFeatures = result.globalFeatures["v1"];
      expect(globalFeatures).toHaveLength(2);
      expect(globalFeatures[1].name).toBe("added-feature");
      expect(globalFeatures[1].value).toBe("added-value");
    });
  });

  describe("Node features adaptation", () => {
    it("should adapt node features", () => {
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

      const nodeFeatures = result.nodes[0].features!["v1"];
      expect(nodeFeatures).toHaveLength(1);
      expect(nodeFeatures[0].value).toBe("new-value");
    });

    it("should adapt multiple node version feature sets", () => {
      const data = createMockData();
      data.nodes[0].features!["v2"] = [
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

      expect(result.nodes[0].features!["v1"][0].value).toBe("new-value");
      expect(result.nodes[0].features!["v2"][0].value).toBe("new-value");
    });
  });

  describe("Node versioned features adaptation", () => {
    it("should adapt per-version node features", () => {
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

      const v0Features = result.nodes[0].features!["v0"];
      expect(v0Features).toHaveLength(1);
      expect(v0Features[0].value).toBe("new-value");
    });

    it("should handle nodes without features", () => {
      const data = createMockData();
      data.nodes[0].features = undefined;

      const adapter = new DataFeatureAdapter({
        operations: [
          {
            pattern: "any-feature",
            features: ["added=true"],
          },
        ],
      });

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

  describe("Multiple versions", () => {
    it("should adapt global features in all version entries", () => {
      const data = createMockData();
      data.globalFeatures["v2"] = [createFeature("global-feature", "old-value")];

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

      expect(result.globalFeatures["v1"][0].value).toBe("new-value");
      expect(result.globalFeatures["v2"][0].value).toBe("new-value");
    });
  });

  describe("Complex transformation example", () => {
    it("should transform high-level features to rendition features", () => {
      const data: CharChainResult = {
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
            refNodeIds: [1],
          },
        ],
        chainDump: "test",
        chainTags: ["v0", "v1"],
        nodes: [
          {
            id: 1,
            index: 0,
            label: "t",
            data: "t",
            sourceTag: "v0",
            features: {
              v0: [createFeature("epigram-nr", "12")],
              v1: [createFeature("epigram-nr", "12")],
            },
          },
        ],
        versionNodeIds: { v0: [1], v1: [1] },
        globalFeatures: { v0: [], v1: [] },
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

      // Check node features were adapted in v1
      const nodeFeatures = result.nodes[0].features!["v1"];
      expect(nodeFeatures.find((f) => f.name === "epigram-nr")).toBeUndefined();
      expect(nodeFeatures.find((f) => f.name === "r_hints")?.value).toBe("note");
      expect(nodeFeatures.find((f) => f.name === "r_hint-vars")?.value).toBe("note=12");
      expect(nodeFeatures.find((f) => f.name === "r_h-position")?.value).toBe("nw");
      expect(nodeFeatures.find((f) => f.name === "r_h-offset-y")?.value).toBe("10");
      expect(nodeFeatures.find((f) => f.name === "r_h-scale-x")?.value).toBe("2");

      // Check v0 node features were also adapted
      const v0NodeFeatures = result.nodes[0].features!["v0"];
      expect(v0NodeFeatures.find((f) => f.name === "epigram-nr")).toBeUndefined();
      expect(v0NodeFeatures.find((f) => f.name === "r_hints")?.value).toBe("note");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty steps", () => {
      const data: CharChainResult = {
        steps: [],
        chainDump: "test",
        chainTags: ["v0"],
        nodes: [],
        versionNodeIds: { v0: [] },
        globalFeatures: { v0: [] },
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

    it("should handle empty nodes", () => {
      const data = createMockData();
      data.nodes = [];

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

    it("should handle steps without global features for that tag", () => {
      const data = createMockData();
      data.globalFeatures["v1"] = [];

      const adapter = new DataFeatureAdapter({
        operations: [
          {
            pattern: "any",
            features: ["new=value"],
          },
        ],
      });

      const result = adapter.adaptData(data);
      expect(result.globalFeatures["v1"]).toHaveLength(0);
    });
  });
});
