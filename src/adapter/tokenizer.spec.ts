/**
 * Tests for the DSL tokenizer.
 */

import { describe, it, expect } from "vitest";
import { Tokenizer } from "./tokenizer";
import {
  TokenType,
  LogicalOperator,
  ComparisonOperator,
} from "./adapter-models";

describe("Tokenizer", () => {
  describe("Basic tokens", () => {
    it("should tokenize a simple name", () => {
      const tokenizer = new Tokenizer("note");
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.NAME);
      expect(tokens[0].value).toBe("note");
    });

    it("should tokenize names with hyphens, underscores, and dots", () => {
      const tokenizer = new Tokenizer("r_fore-color.v1");
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.NAME);
      expect(tokens[0].value).toBe("r_fore-color.v1");
    });

    it("should tokenize parentheses", () => {
      const tokenizer = new Tokenizer("()");
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.LPAREN);
      expect(tokens[1].type).toBe(TokenType.RPAREN);
    });

    it("should tokenize brackets", () => {
      const tokenizer = new Tokenizer("[]");
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.LBRACKET);
      expect(tokens[1].type).toBe(TokenType.RBRACKET);
    });

    it("should tokenize colon", () => {
      const tokenizer = new Tokenizer(":");
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.COLON);
    });
  });

  describe("Operators", () => {
    it("should tokenize equals operator", () => {
      const tokenizer = new Tokenizer("name=value");
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.NAME);
      expect(tokens[1].type).toBe(TokenType.OPERATOR);
      expect(tokens[1].value).toBe(ComparisonOperator.EQUALS);
      expect(tokens[2].type).toBe(TokenType.VALUE);
      expect(tokens[2].value).toBe("value");
    });

    it("should tokenize two-character operators", () => {
      const operators = [
        ["!=", ComparisonOperator.NOT_EQUALS],
        ["^=", ComparisonOperator.STARTS_WITH],
        ["$=", ComparisonOperator.ENDS_WITH],
        ["*=", ComparisonOperator.CONTAINS],
        ["?=", ComparisonOperator.MATCHES_WILDCARDS],
        ["==", ComparisonOperator.NUMERIC_EQUALS],
        ["<>", ComparisonOperator.NUMERIC_NOT_EQUALS],
        [">=", ComparisonOperator.NUMERIC_GTE],
        ["<=", ComparisonOperator.NUMERIC_LTE],
      ];

      for (const [op, expected] of operators) {
        const tokenizer = new Tokenizer(`name${op}value`);
        const tokens = tokenizer.tokenize();

        expect(tokens[1].type).toBe(TokenType.OPERATOR);
        expect(tokens[1].value).toBe(expected);
      }
    });

    it("should tokenize single-character comparison operators", () => {
      const operators = [
        [">", ComparisonOperator.NUMERIC_GT],
        ["<", ComparisonOperator.NUMERIC_LT],
        ["~", ComparisonOperator.MATCHES_REGEX],
      ];

      for (const [op, expected] of operators) {
        const tokenizer = new Tokenizer(`name${op}value`);
        const tokens = tokenizer.tokenize();

        expect(tokens[1].type).toBe(TokenType.OPERATOR);
        expect(tokens[1].value).toBe(expected);
      }
    });
  });

  describe("Logical operators", () => {
    it("should tokenize AND operator", () => {
      const tokenizer = new Tokenizer("a AND b");
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[1].type).toBe(TokenType.LOGICAL);
      expect(tokens[1].value).toBe(LogicalOperator.AND);
    });

    it("should tokenize OR operator", () => {
      const tokenizer = new Tokenizer("a OR b");
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[1].type).toBe(TokenType.LOGICAL);
      expect(tokens[1].value).toBe(LogicalOperator.OR);
    });

    it("should tokenize AND NOT operator", () => {
      const tokenizer = new Tokenizer("a AND NOT b");
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[1].type).toBe(TokenType.LOGICAL);
      expect(tokens[1].value).toBe(LogicalOperator.AND_NOT);
    });

    it("should tokenize OR NOT operator", () => {
      const tokenizer = new Tokenizer("a OR NOT b");
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[1].type).toBe(TokenType.LOGICAL);
      expect(tokens[1].value).toBe(LogicalOperator.OR_NOT);
    });

    it("should be case-insensitive for logical operators", () => {
      const tokenizer = new Tokenizer("a and b or c");
      const tokens = tokenizer.tokenize();

      expect(tokens[1].value).toBe(LogicalOperator.AND);
      expect(tokens[3].value).toBe(LogicalOperator.OR);
    });
  });

  describe("Quoted strings", () => {
    it("should tokenize quoted strings", () => {
      const tokenizer = new Tokenizer('name="quoted value"');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[2].type).toBe(TokenType.VALUE);
      expect(tokens[2].value).toBe("quoted value");
    });

    it("should handle escaped quotes in strings", () => {
      const tokenizer = new Tokenizer('name="value with \\"quotes\\""');
      const tokens = tokenizer.tokenize();

      expect(tokens[2].type).toBe(TokenType.VALUE);
      expect(tokens[2].value).toBe('value with "quotes"');
    });

    it("should handle escaped backslashes", () => {
      const tokenizer = new Tokenizer('name="path\\\\to\\\\file"');
      const tokens = tokenizer.tokenize();

      expect(tokens[2].type).toBe(TokenType.VALUE);
      expect(tokens[2].value).toBe("path\\to\\file");
    });

    it("should handle escape sequences", () => {
      const tokenizer = new Tokenizer('name="line1\\nline2\\ttab"');
      const tokens = tokenizer.tokenize();

      expect(tokens[2].type).toBe(TokenType.VALUE);
      expect(tokens[2].value).toBe("line1\nline2\ttab");
    });

    it("should throw on unterminated string", () => {
      const tokenizer = new Tokenizer('name="unterminated');

      expect(() => tokenizer.tokenize()).toThrow("Unterminated quoted string");
    });
  });

  describe("Whitespace handling", () => {
    it("should skip whitespace between tokens", () => {
      const tokenizer = new Tokenizer("  name   =   value  ");
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].value).toBe("name");
      expect(tokens[2].value).toBe("value");
    });

    it("should preserve whitespace in quoted strings", () => {
      const tokenizer = new Tokenizer('name="  spaces  "');
      const tokens = tokenizer.tokenize();

      expect(tokens[2].value).toBe("  spaces  ");
    });
  });

  describe("Complex expressions", () => {
    it("should tokenize a complete pattern with groups", () => {
      const tokenizer = new Tokenizer(
        "[note^=corrected] AND (color=red OR color=green)"
      );
      const tokens = tokenizer.tokenize();

      expect(tokens[0].type).toBe(TokenType.LBRACKET);
      expect(tokens[1].type).toBe(TokenType.NAME);
      expect(tokens[1].value).toBe("note");
      expect(tokens[2].type).toBe(TokenType.OPERATOR);
      expect(tokens[2].value).toBe(ComparisonOperator.STARTS_WITH);
      expect(tokens[3].type).toBe(TokenType.VALUE);
      expect(tokens[3].value).toBe("corrected");
      expect(tokens[4].type).toBe(TokenType.RBRACKET);
      expect(tokens[5].type).toBe(TokenType.LOGICAL);
      expect(tokens[5].value).toBe(LogicalOperator.AND);
      expect(tokens[6].type).toBe(TokenType.LPAREN);
    });

    it("should tokenize named capture groups", () => {
      const tokenizer = new Tokenizer("[corr:note^=corrected]");
      const tokens = tokenizer.tokenize();

      expect(tokens[0].type).toBe(TokenType.LBRACKET);
      expect(tokens[1].type).toBe(TokenType.NAME);
      expect(tokens[1].value).toBe("corr");
      expect(tokens[2].type).toBe(TokenType.COLON);
      expect(tokens[3].type).toBe(TokenType.NAME);
      expect(tokens[3].value).toBe("note");
    });
  });

  describe("Error handling", () => {
    it("should throw on unexpected characters", () => {
      const tokenizer = new Tokenizer("name @ value");

      expect(() => tokenizer.tokenize()).toThrow("Unexpected character");
    });

    it("should provide position information in errors", () => {
      const tokenizer = new Tokenizer("name @ value");

      try {
        tokenizer.tokenize();
        expect.fail("Should have thrown");
      } catch (error: any) {
        expect(error.position).toBeDefined();
        expect(error.context).toBeDefined();
      }
    });
  });
});
