/**
 * Models and types for the feature adapter system.
 */

import { Feature } from "../models.js";

/**
 * Comparison operator for feature matching.
 */
export enum ComparisonOperator {
  /** Equals (string) */
  EQUALS = "=",
  /** Not equals (string) */
  NOT_EQUALS = "!=",
  /** Starts with */
  STARTS_WITH = "^=",
  /** Ends with */
  ENDS_WITH = "$=",
  /** Contains */
  CONTAINS = "*=",
  /** Matches wildcards (? and *) */
  MATCHES_WILDCARDS = "?=",
  /** Matches regular expression */
  MATCHES_REGEX = "~",
  /** Numeric equals */
  NUMERIC_EQUALS = "==",
  /** Numeric not equals */
  NUMERIC_NOT_EQUALS = "<>",
  /** Numeric greater than */
  NUMERIC_GT = ">",
  /** Numeric less than */
  NUMERIC_LT = "<",
  /** Numeric greater than or equal */
  NUMERIC_GTE = ">=",
  /** Numeric less than or equal */
  NUMERIC_LTE = "<=",
}

/**
 * Logical operator for combining clauses.
 */
export enum LogicalOperator {
  AND = "AND",
  OR = "OR",
  AND_NOT = "AND NOT",
  OR_NOT = "OR NOT",
}

/**
 * Token type for DSL parsing.
 */
export enum TokenType {
  /** Feature name */
  NAME,
  /** Comparison operator */
  OPERATOR,
  /** Value (quoted or unquoted) */
  VALUE,
  /** Logical operator (AND, OR, AND NOT, OR NOT) */
  LOGICAL,
  /** Left parenthesis */
  LPAREN,
  /** Right parenthesis */
  RPAREN,
  /** Left square bracket for group capture */
  LBRACKET,
  /** Right square bracket for group capture */
  RBRACKET,
  /** Colon (used in named groups) */
  COLON,
  /** End of input */
  EOF,
}

/**
 * Token from DSL parsing.
 */
export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

/**
 * A single clause in a pattern (e.g., "name=value").
 */
export interface Clause {
  /** Feature name to match */
  name: string;
  /** Comparison operator (optional if just matching by name) */
  operator?: ComparisonOperator;
  /** Value to compare against (optional if just matching by name) */
  value?: string;
  /** Whether this clause should be captured as a group */
  capture?: boolean;
  /** Group name (if named capture), or undefined for numbered capture */
  groupName?: string;
}

/**
 * Pattern expression node (for AST representation).
 */
export interface PatternExpression {
  type: "clause" | "logical";
}

/**
 * Clause expression node.
 */
export interface ClauseExpression extends PatternExpression {
  type: "clause";
  clause: Clause;
}

/**
 * Logical expression node (binary operation).
 */
export interface LogicalExpression extends PatternExpression {
  type: "logical";
  operator: LogicalOperator;
  left: PatternExpression;
  right: PatternExpression;
}

/**
 * Result of matching a pattern against features.
 */
export interface MatchResult {
  /** Whether the pattern matched */
  matched: boolean;
  /** Captured groups (keyed by group name or number as string) */
  captures: Map<string, CapturedGroup>;
  /** Features that were matched */
  matchedFeatures: Feature[];
}

/**
 * A captured group from pattern matching.
 */
export interface CapturedGroup {
  name: string;
  value: string;
}

/**
 * Mode for feature processing.
 */
export enum ProcessingMode {
  /** Add features without removing matched ones */
  ADD = "add",
  /** Replace: remove matched features, then add new ones */
  REPLACE = "replace",
}

/**
 * A single adapter operation configuration.
 */
export interface AdapterOperation {
  /** Pattern DSL string to match features */
  pattern: string;
  /** Features to add (with format "name=value", can include placeholders) */
  features: string[];
  /** Processing mode (default: add) */
  mode?: ProcessingMode;
}

/**
 * Configuration for the feature adapter.
 */
export interface FeatureAdapterSettings {
  /** List of adapter operations to apply in order */
  operations: AdapterOperation[];
}

/**
 * Error thrown during DSL parsing or pattern matching.
 */
export class AdapterError extends Error {
  constructor(
    message: string,
    public position?: number,
    public context?: string
  ) {
    super(message);
    this.name = "AdapterError";
  }

  /**
   * Format error message with context.
   */
  toString(): string {
    let msg = `${this.name}: ${this.message}`;
    if (this.position !== undefined && this.context) {
      msg += `\nAt position ${this.position}:\n${this.context}\n${" ".repeat(
        this.position
      )}^`;
    }
    return msg;
  }
}
