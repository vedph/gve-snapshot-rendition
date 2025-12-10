/**
 * Tests for the FeatureAdapter service.
 */

import { describe, it, expect } from "vitest";
import { FeatureAdapter } from "./feature-adapter";
import { ProcessingMode } from "./adapter-models";
import { Feature, FeatureSetPolicy } from "../models";

describe("FeatureAdapter", () => {
  const createFeature = (name: string, value: string): Feature => ({
    name,
    value,
    setPolicy: FeatureSetPolicy.multiple,
  });

  describe("Basic matching", () => {
    it("should match by name only", () => {
      const adapter = new FeatureAdapter({
        operations: [
          {
            pattern: "note",
            features: ["matched=true"],
          },
        ],
      });

      const features = [createFeature("note", "some value")];
      const result = adapter.adapt(features);

      expect(result).toHaveLength(2);
      expect(result[1].name).toBe("matched");
      expect(result[1].value).toBe("true");
    });

    it("should match by name and value with equals", () => {
      const adapter = new FeatureAdapter({
        operations: [
          {
            pattern: "color=red",
            features: ["matched=true"],
          },
        ],
      });

      const features = [
        createFeature("color", "red"),
        createFeature("color", "blue"),
      ];
      const result = adapter.adapt(features);

      expect(result).toHaveLength(3);
      expect(result[2].name).toBe("matched");
    });

    it("should not add features when pattern doesn't match", () => {
      const adapter = new FeatureAdapter({
        operations: [
          {
            pattern: "nonexistent",
            features: ["matched=true"],
          },
        ],
      });

      const features = [createFeature("note", "value")];
      const result = adapter.adapt(features);

      expect(result).toHaveLength(1);
      expect(result).toEqual(features);
    });
  });

  describe("Comparison operators", () => {
    it("should match with starts-with operator", () => {
      const adapter = new FeatureAdapter({
        operations: [
          {
            pattern: "note^=corr",
            features: ["matched=true"],
          },
        ],
      });

      const features = [createFeature("note", "corrected")];
      const result = adapter.adapt(features);

      expect(result[1].name).toBe("matched");
    });

    it("should match with ends-with operator", () => {
      const adapter = new FeatureAdapter({
        operations: [
          {
            pattern: "note$=ed",
            features: ["matched=true"],
          },
        ],
      });

      const features = [createFeature("note", "corrected")];
      const result = adapter.adapt(features);

      expect(result[1].name).toBe("matched");
    });

    it("should match with contains operator", () => {
      const adapter = new FeatureAdapter({
        operations: [
          {
            pattern: "note*=rect",
            features: ["matched=true"],
          },
        ],
      });

      const features = [createFeature("note", "corrected")];
      const result = adapter.adapt(features);

      expect(result[1].name).toBe("matched");
    });

    it("should match with wildcard operator", () => {
      const adapter = new FeatureAdapter({
        operations: [
          {
            pattern: "note?=corr*ed",
            features: ["matched=true"],
          },
        ],
      });

      const features = [createFeature("note", "corrected")];
      const result = adapter.adapt(features);

      expect(result[1].name).toBe("matched");
    });

    it("should match with regex operator", () => {
      const adapter = new FeatureAdapter({
        operations: [
          {
            pattern: "note~^corr.*ed$",
            features: ["matched=true"],
          },
        ],
      });

      const features = [createFeature("note", "corrected")];
      const result = adapter.adapt(features);

      expect(result[1].name).toBe("matched");
    });

    it("should match with numeric operators", () => {
      const adapter = new FeatureAdapter({
        operations: [
          {
            pattern: "size>10",
            features: ["large=true"],
          },
        ],
      });

      const features = [createFeature("size", "15")];
      const result = adapter.adapt(features);

      expect(result[1].name).toBe("large");
    });

    it("should not match numeric operators with non-numeric values", () => {
      const adapter = new FeatureAdapter({
        operations: [
          {
            pattern: "size>10",
            features: ["large=true"],
          },
        ],
      });

      const features = [createFeature("size", "large")];
      const result = adapter.adapt(features);

      expect(result).toHaveLength(1); // No match
    });
  });

  describe("Logical operators", () => {
    it("should match with AND operator", () => {
      const adapter = new FeatureAdapter({
        operations: [
          {
            pattern: "color=red AND size=large",
            features: ["matched=true"],
          },
        ],
      });

      const features = [
        createFeature("color", "red"),
        createFeature("size", "large"),
      ];
      const result = adapter.adapt(features);

      expect(result[2].name).toBe("matched");
    });

    it("should not match with AND when one clause fails", () => {
      const adapter = new FeatureAdapter({
        operations: [
          {
            pattern: "color=red AND size=small",
            features: ["matched=true"],
          },
        ],
      });

      const features = [
        createFeature("color", "red"),
        createFeature("size", "large"),
      ];
      const result = adapter.adapt(features);

      expect(result).toHaveLength(2); // No match
    });

    it("should match with OR operator when one clause succeeds", () => {
      const adapter = new FeatureAdapter({
        operations: [
          {
            pattern: "color=red OR color=blue",
            features: ["matched=true"],
          },
        ],
      });

      const features = [createFeature("color", "blue")];
      const result = adapter.adapt(features);

      expect(result[1].name).toBe("matched");
    });

    it("should match with AND NOT operator", () => {
      const adapter = new FeatureAdapter({
        operations: [
          {
            pattern: "color=red AND NOT size=small",
            features: ["matched=true"],
          },
        ],
      });

      const features = [
        createFeature("color", "red"),
        createFeature("size", "large"),
      ];
      const result = adapter.adapt(features);

      expect(result[2].name).toBe("matched");
    });

    it("should respect operator precedence", () => {
      const adapter = new FeatureAdapter({
        operations: [
          {
            pattern: "a OR b AND c",
            features: ["matched=true"],
          },
        ],
      });

      // Should match: a OR (b AND c)
      // So just having 'a' should match
      const features = [createFeature("a", "value")];
      const result = adapter.adapt(features);

      expect(result[1].name).toBe("matched");
    });
  });

  describe("Capture groups", () => {
    it("should capture numbered groups", () => {
      const adapter = new FeatureAdapter({
        operations: [
          {
            pattern: "[note^=corr]",
            features: ["captured-name=$1.name", "captured-value=$1.value"],
          },
        ],
      });

      const features = [createFeature("note", "corrected")];
      const result = adapter.adapt(features);

      expect(result[1].name).toBe("captured-name");
      expect(result[1].value).toBe("note");
      expect(result[2].name).toBe("captured-value");
      expect(result[2].value).toBe("corrected");
    });

    it("should capture named groups", () => {
      const adapter = new FeatureAdapter({
        operations: [
          {
            pattern: "[corr:note^=corrected]",
            features: ["note-name=$corr.name", "note-value=$corr.value"],
          },
        ],
      });

      const features = [createFeature("note", "corrected")];
      const result = adapter.adapt(features);

      expect(result[1].value).toBe("note");
      expect(result[2].value).toBe("corrected");
    });

    it("should handle multiple captures", () => {
      const adapter = new FeatureAdapter({
        operations: [
          {
            pattern: "[note^=corr] AND [col:color=red]",
            features: ["n=$1.value", "c=$col.value"],
          },
        ],
      });

      const features = [
        createFeature("note", "corrected"),
        createFeature("color", "red"),
      ];
      const result = adapter.adapt(features);

      expect(result[2].name).toBe("n");
      expect(result[2].value).toBe("corrected");
      expect(result[3].name).toBe("c");
      expect(result[3].value).toBe("red");
    });

    it("should handle missing capture groups", () => {
      const adapter = new FeatureAdapter({
        operations: [
          {
            pattern: "[note=corrected]",
            features: ["result=$missing.value"],
          },
        ],
      });

      const features = [createFeature("note", "corrected")];
      const result = adapter.adapt(features);

      // Missing placeholder should resolve to empty string
      expect(result[1].value).toBe("");
    });
  });

  describe("Processing modes", () => {
    it("should add features in ADD mode (default)", () => {
      const adapter = new FeatureAdapter({
        operations: [
          {
            pattern: "note=old",
            features: ["note=new"],
            mode: ProcessingMode.ADD,
          },
        ],
      });

      const features = [createFeature("note", "old")];
      const result = adapter.adapt(features);

      expect(result).toHaveLength(2);
      expect(result[0].value).toBe("old");
      expect(result[1].value).toBe("new");
    });

    it("should replace features in REPLACE mode", () => {
      const adapter = new FeatureAdapter({
        operations: [
          {
            pattern: "note=old",
            features: ["note=new"],
            mode: ProcessingMode.REPLACE,
          },
        ],
      });

      const features = [createFeature("note", "old")];
      const result = adapter.adapt(features);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe("new");
    });

    it("should remove features in REPLACE mode with empty features array", () => {
      const adapter = new FeatureAdapter({
        operations: [
          {
            pattern: "note=old",
            features: [],
            mode: ProcessingMode.REPLACE,
          },
        ],
      });

      const features = [
        createFeature("note", "old"),
        createFeature("color", "red"),
      ];
      const result = adapter.adapt(features);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("color");
    });
  });

  describe("Multiple operations", () => {
    it("should apply operations in sequence", () => {
      const adapter = new FeatureAdapter({
        operations: [
          {
            pattern: "note=v1",
            features: ["note=v2"],
            mode: ProcessingMode.REPLACE,
          },
          {
            pattern: "note=v2",
            features: ["note=v3"],
            mode: ProcessingMode.REPLACE,
          },
        ],
      });

      const features = [createFeature("note", "v1")];
      const result = adapter.adapt(features);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe("v3");
    });

    it("should chain transformations with captures", () => {
      const adapter = new FeatureAdapter({
        operations: [
          {
            pattern: "[num:epigram-nr==12]",
            features: [
              "r_hints=note",
              "r_hint-vars=note=$num.value",
              "r_h-position=nw",
            ],
          },
          {
            pattern: "r_h-position=nw",
            features: ["r_h-offset-y=10"],
          },
        ],
      });

      const features = [createFeature("epigram-nr", "12")];
      const result = adapter.adapt(features);

      expect(result).toHaveLength(5);
      expect(result.find((f) => f.name === "r_hints")?.value).toBe("note");
      expect(result.find((f) => f.name === "r_hint-vars")?.value).toBe(
        "note=12"
      );
      expect(result.find((f) => f.name === "r_h-position")?.value).toBe("nw");
      expect(result.find((f) => f.name === "r_h-offset-y")?.value).toBe("10");
    });
  });

  describe("Example from documentation", () => {
    it("should transform epigram-nr into rendition features", () => {
      const adapter = new FeatureAdapter({
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

      const features = [createFeature("epigram-nr", "12")];
      const result = adapter.adapt(features);

      expect(result).toHaveLength(5);
      expect(result.find((f) => f.name === "epigram-nr")).toBeUndefined();
      expect(result.find((f) => f.name === "r_hints")?.value).toBe("note");
      expect(result.find((f) => f.name === "r_hint-vars")?.value).toBe(
        "note=12"
      );
      expect(result.find((f) => f.name === "r_h-position")?.value).toBe("nw");
      expect(result.find((f) => f.name === "r_h-offset-y")?.value).toBe("10");
      expect(result.find((f) => f.name === "r_h-scale-x")?.value).toBe("2");
    });
  });

  describe("Error handling", () => {
    it("should throw on invalid pattern during construction", () => {
      expect(() => {
        new FeatureAdapter({
          operations: [
            {
              pattern: "invalid syntax (",
              features: [],
            },
          ],
        });
      }).toThrow();
    });

    it("should throw on invalid feature specification", () => {
      const adapter = new FeatureAdapter({
        operations: [
          {
            pattern: "note",
            features: ["invalid-no-equals"],
          },
        ],
      });

      const features = [createFeature("note", "value")];

      expect(() => adapter.adapt(features)).toThrow(
        "Invalid feature specification"
      );
    });
  });
});
