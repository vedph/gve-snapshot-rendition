/**
 * Tests for the DSL parser.
 */

import { describe, it, expect } from "vitest";
import { Parser } from "./parser";
import {
  ClauseExpression,
  LogicalExpression,
  LogicalOperator,
  ComparisonOperator,
} from "./adapter-models";

describe("Parser", () => {
  describe("Simple clauses", () => {
    it("should parse a name-only clause", () => {
      const parser = new Parser("note");
      const result = parser.parse();

      expect(result.type).toBe("clause");
      const clause = (result as ClauseExpression).clause;
      expect(clause.name).toBe("note");
      expect(clause.operator).toBeUndefined();
      expect(clause.value).toBeUndefined();
    });

    it("should parse a clause with equals operator", () => {
      const parser = new Parser("color=red");
      const result = parser.parse();

      expect(result.type).toBe("clause");
      const clause = (result as ClauseExpression).clause;
      expect(clause.name).toBe("color");
      expect(clause.operator).toBe(ComparisonOperator.EQUALS);
      expect(clause.value).toBe("red");
    });

    it("should parse a clause with quoted value", () => {
      const parser = new Parser('note="corrected text"');
      const result = parser.parse();

      const clause = (result as ClauseExpression).clause;
      expect(clause.value).toBe("corrected text");
    });

    it("should parse clauses with different operators", () => {
      const testCases = [
        ["note^=corr", ComparisonOperator.STARTS_WITH, "corr"],
        ["note$=ed", ComparisonOperator.ENDS_WITH, "ed"],
        ["note*=correct", ComparisonOperator.CONTAINS, "correct"],
        ["note?=corr*", ComparisonOperator.MATCHES_WILDCARDS, "corr*"],
        ["note~^corr", ComparisonOperator.MATCHES_REGEX, "^corr"],
        ["size==12", ComparisonOperator.NUMERIC_EQUALS, "12"],
        ["size<>10", ComparisonOperator.NUMERIC_NOT_EQUALS, "10"],
        ["size>10", ComparisonOperator.NUMERIC_GT, "10"],
        ["size<20", ComparisonOperator.NUMERIC_LT, "20"],
        ["size>=10", ComparisonOperator.NUMERIC_GTE, "10"],
        ["size<=20", ComparisonOperator.NUMERIC_LTE, "20"],
      ];

      for (const [pattern, operator, value] of testCases) {
        const parser = new Parser(pattern as string);
        const result = parser.parse();
        const clause = (result as ClauseExpression).clause;

        expect(clause.operator).toBe(operator);
        expect(clause.value).toBe(value);
      }
    });
  });

  describe("Logical expressions", () => {
    it("should parse AND expression", () => {
      const parser = new Parser("color=red AND size=large");
      const result = parser.parse();

      expect(result.type).toBe("logical");
      const logical = result as LogicalExpression;
      expect(logical.operator).toBe(LogicalOperator.AND);
      expect(logical.left.type).toBe("clause");
      expect(logical.right.type).toBe("clause");
    });

    it("should parse OR expression", () => {
      const parser = new Parser("color=red OR color=blue");
      const result = parser.parse();

      expect(result.type).toBe("logical");
      const logical = result as LogicalExpression;
      expect(logical.operator).toBe(LogicalOperator.OR);
    });

    it("should parse AND NOT expression", () => {
      const parser = new Parser("color=red AND NOT size=small");
      const result = parser.parse();

      expect(result.type).toBe("logical");
      const logical = result as LogicalExpression;
      expect(logical.operator).toBe(LogicalOperator.AND_NOT);
    });

    it("should parse OR NOT expression", () => {
      const parser = new Parser("color=red OR NOT size=small");
      const result = parser.parse();

      expect(result.type).toBe("logical");
      const logical = result as LogicalExpression;
      expect(logical.operator).toBe(LogicalOperator.OR_NOT);
    });
  });

  describe("Operator precedence", () => {
    it("should give AND higher precedence than OR", () => {
      // a OR b AND c should parse as: a OR (b AND c)
      const parser = new Parser("a OR b AND c");
      const result = parser.parse() as LogicalExpression;

      expect(result.type).toBe("logical");
      expect(result.operator).toBe(LogicalOperator.OR);

      // Left should be simple clause 'a'
      expect(result.left.type).toBe("clause");
      expect((result.left as ClauseExpression).clause.name).toBe("a");

      // Right should be AND expression
      expect(result.right.type).toBe("logical");
      const rightAnd = result.right as LogicalExpression;
      expect(rightAnd.operator).toBe(LogicalOperator.AND);
      expect((rightAnd.left as ClauseExpression).clause.name).toBe("b");
      expect((rightAnd.right as ClauseExpression).clause.name).toBe("c");
    });

    it("should handle multiple ANDs and ORs", () => {
      // a AND b OR c AND d should parse as: (a AND b) OR (c AND d)
      const parser = new Parser("a AND b OR c AND d");
      const result = parser.parse() as LogicalExpression;

      expect(result.operator).toBe(LogicalOperator.OR);
      expect(result.left.type).toBe("logical");
      expect(result.right.type).toBe("logical");

      const leftAnd = result.left as LogicalExpression;
      expect(leftAnd.operator).toBe(LogicalOperator.AND);

      const rightAnd = result.right as LogicalExpression;
      expect(rightAnd.operator).toBe(LogicalOperator.AND);
    });

    it("should handle NOT with correct precedence", () => {
      // a OR NOT b AND c should parse as: a OR NOT (b AND c)
      // Because AND has higher precedence, and OR NOT is a single operator
      const parser = new Parser("a OR NOT b AND c");
      const result = parser.parse() as LogicalExpression;

      expect(result.operator).toBe(LogicalOperator.OR_NOT);
      expect(result.left.type).toBe("clause");
      expect(result.right.type).toBe("logical");

      const rightAnd = result.right as LogicalExpression;
      expect(rightAnd.operator).toBe(LogicalOperator.AND);
    });
  });

  describe("Parentheses", () => {
    it("should respect parentheses for grouping", () => {
      // (a OR b) AND c
      const parser = new Parser("(a OR b) AND c");
      const result = parser.parse() as LogicalExpression;

      expect(result.operator).toBe(LogicalOperator.AND);
      expect(result.left.type).toBe("logical");

      const leftOr = result.left as LogicalExpression;
      expect(leftOr.operator).toBe(LogicalOperator.OR);
    });

    it("should handle nested parentheses", () => {
      // ((a OR b) AND (c OR d))
      const parser = new Parser("((a OR b) AND (c OR d))");
      const result = parser.parse() as LogicalExpression;

      expect(result.operator).toBe(LogicalOperator.AND);
      expect(result.left.type).toBe("logical");
      expect(result.right.type).toBe("logical");
    });

    it("should throw on mismatched parentheses", () => {
      expect(() => new Parser("(a OR b").parse()).toThrow("Expected closing parenthesis");
    });
  });

  describe("Capture groups", () => {
    it("should parse a numbered capture group", () => {
      const parser = new Parser("[note^=corr]");
      const result = parser.parse();

      expect(result.type).toBe("clause");
      const clause = (result as ClauseExpression).clause;
      expect(clause.capture).toBe(true);
      expect(clause.groupName).toBe("1");
    });

    it("should parse a named capture group", () => {
      const parser = new Parser("[corr:note^=corrected]");
      const result = parser.parse();

      const clause = (result as ClauseExpression).clause;
      expect(clause.capture).toBe(true);
      expect(clause.groupName).toBe("corr");
    });

    it("should assign sequential numbers to multiple unnamed groups", () => {
      const parser = new Parser("[note^=corr] AND [color=red]");
      const result = parser.parse() as LogicalExpression;

      const leftClause = (result.left as ClauseExpression).clause;
      const rightClause = (result.right as ClauseExpression).clause;

      expect(leftClause.groupName).toBe("1");
      expect(rightClause.groupName).toBe("2");
    });

    it("should throw on unclosed bracket", () => {
      expect(() => new Parser("[note^=corr").parse()).toThrow("Expected closing bracket");
    });
  });

  describe("Complex patterns", () => {
    it("should parse the example from documentation", () => {
      const parser = new Parser('[note^=corrected] AND (color=red OR color=green)');
      const result = parser.parse() as LogicalExpression;

      expect(result.operator).toBe(LogicalOperator.AND);
      expect(result.left.type).toBe("clause");

      const leftClause = (result.left as ClauseExpression).clause;
      expect(leftClause.capture).toBe(true);
      expect(leftClause.name).toBe("note");
      expect(leftClause.operator).toBe(ComparisonOperator.STARTS_WITH);
      expect(leftClause.value).toBe("corrected");

      expect(result.right.type).toBe("logical");
      const rightOr = result.right as LogicalExpression;
      expect(rightOr.operator).toBe(LogicalOperator.OR);
    });

    it("should handle multiple named captures", () => {
      const parser = new Parser('[corr:note^=corrected] AND [col:color=red]');
      const result = parser.parse() as LogicalExpression;

      const leftClause = (result.left as ClauseExpression).clause;
      const rightClause = (result.right as ClauseExpression).clause;

      expect(leftClause.groupName).toBe("corr");
      expect(rightClause.groupName).toBe("col");
    });

    it("should handle complex nesting with captures", () => {
      const parser = new Parser("([a] OR [b]) AND ([c] OR NOT [d])");
      const result = parser.parse() as LogicalExpression;

      expect(result.operator).toBe(LogicalOperator.AND);

      // All four clauses should have captures
      const checkCaptures = (expr: any): void => {
        if (expr.type === "clause") {
          expect(expr.clause.capture).toBe(true);
        } else if (expr.type === "logical") {
          checkCaptures(expr.left);
          checkCaptures(expr.right);
        }
      };

      checkCaptures(result);
    });
  });

  describe("Error handling", () => {
    it("should throw on unexpected tokens", () => {
      expect(() => new Parser("note AND").parse()).toThrow();
    });

    it("should throw on missing value after operator", () => {
      expect(() => new Parser("note=").parse()).toThrow("Expected value after operator");
    });

    it("should provide position information in errors", () => {
      try {
        new Parser("note AND").parse();
        expect.fail("Should have thrown");
      } catch (error: any) {
        expect(error.position).toBeDefined();
        expect(error.context).toBeDefined();
      }
    });
  });
});
