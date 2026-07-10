import { describe, it, expect } from "vitest";
import { parseOffset, resolvePlaceholders } from "./text-utils";

describe("resolvePlaceholders", () => {
  const vars = new Map<string, string>([
    ["r_color", "red"],
    ["r_fore-color", "blue"],
    ["note", "hello"],
    ["empty", ""],
  ]);

  describe("single placeholders", () => {
    it("should replace a placeholder with its variable value", () => {
      expect(resolvePlaceholders("<rect fill=\"{{r_color}}\"/>", vars)).toBe(
        "<rect fill=\"red\"/>"
      );
    });

    it("should keep the placeholder when the variable is not found", () => {
      expect(resolvePlaceholders("{{missing}}", vars)).toBe("{{missing}}");
    });

    it("should replace multiple placeholders in the same content", () => {
      expect(resolvePlaceholders("{{r_color}}-{{note}}", vars)).toBe(
        "red-hello"
      );
    });

    it("should replace with an empty string value", () => {
      expect(resolvePlaceholders("[{{empty}}]", vars)).toBe("[]");
    });

    it("should tolerate spaces inside the whiskers", () => {
      expect(resolvePlaceholders("{{ r_color }}", vars)).toBe("red");
    });
  });

  describe("fallback chains (??)", () => {
    it("should use the first name when it resolves", () => {
      expect(resolvePlaceholders("{{r_fore-color ?? r_color}}", vars)).toBe(
        "blue"
      );
    });

    it("should fall back to the next name when the first is missing", () => {
      expect(resolvePlaceholders("{{missing ?? r_color}}", vars)).toBe("red");
    });

    it("should walk an arbitrarily long chain", () => {
      expect(
        resolvePlaceholders("{{a ?? b ?? c ?? note ?? r_color}}", vars)
      ).toBe("hello");
    });

    it("should keep the placeholder when no name in the chain resolves", () => {
      expect(resolvePlaceholders("{{a ?? b ?? c}}", vars)).toBe(
        "{{a ?? b ?? c}}"
      );
    });

    it("should treat an empty string value as found (no fallback)", () => {
      expect(resolvePlaceholders("[{{empty ?? r_color}}]", vars)).toBe("[]");
    });

    it("should work without spaces around ??", () => {
      expect(resolvePlaceholders("{{missing??r_color}}", vars)).toBe("red");
    });
  });
});

describe("parseOffset", () => {
  it("should return numbers as-is", () => {
    expect(parseOffset(10, 20, 15)).toBe(10);
  });

  it("should parse plain numeric strings as pixels", () => {
    expect(parseOffset("12.5", 20, 15)).toBe(12.5);
  });

  it("should resolve th against text height", () => {
    expect(parseOffset("0.5th", 20, 15)).toBe(10);
  });

  it("should resolve tw against text width", () => {
    expect(parseOffset("2tw", 20, 15)).toBe(30);
  });

  it("should resolve negative suffixed values", () => {
    expect(parseOffset("-1th", 20, 15)).toBe(-20);
  });

  it("should return 0 for unparsable values", () => {
    expect(parseOffset("abc", 20, 15)).toBe(0);
  });
});
