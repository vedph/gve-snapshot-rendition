/**
 * Parser for the feature adapter DSL.
 * Implements recursive descent parsing with operator precedence:
 * 1. NOT (highest)
 * 2. AND
 * 3. OR (lowest)
 */

import {
  Token,
  TokenType,
  Clause,
  PatternExpression,
  ClauseExpression,
  LogicalExpression,
  LogicalOperator,
  ComparisonOperator,
  AdapterError,
} from "./adapter-models";
import { Tokenizer } from "./tokenizer";

/**
 * Parser for DSL patterns.
 */
export class Parser {
  private tokens: Token[];
  private position: number;
  private current: Token;
  private groupCounter: number;

  constructor(private input: string) {
    const tokenizer = new Tokenizer(input);
    this.tokens = tokenizer.tokenize();
    this.position = 0;
    this.current = this.tokens[0] || {
      type: TokenType.EOF,
      value: "",
      position: 0,
    };
    this.groupCounter = 0;
  }

  /**
   * Parse the pattern and return the AST.
   */
  parse(): PatternExpression {
    const expr = this.parseOrExpression();

    if (this.current.type !== TokenType.EOF) {
      throw new AdapterError(
        `Unexpected token: ${this.current.value}`,
        this.current.position,
        this.getContext(this.current.position)
      );
    }

    return expr;
  }

  /**
   * Parse OR expression (lowest precedence).
   * or_expr := and_expr (OR and_expr | OR NOT and_expr)*
   */
  private parseOrExpression(): PatternExpression {
    let left = this.parseAndExpression();

    while (
      this.current.type === TokenType.LOGICAL &&
      (this.current.value === LogicalOperator.OR ||
        this.current.value === LogicalOperator.OR_NOT)
    ) {
      const operator = this.current.value as LogicalOperator;
      this.advance();
      const right = this.parseAndExpression();

      left = {
        type: "logical",
        operator,
        left,
        right,
      } as LogicalExpression;
    }

    return left;
  }

  /**
   * Parse AND expression (middle precedence).
   * and_expr := primary (AND primary | AND NOT primary)*
   */
  private parseAndExpression(): PatternExpression {
    let left = this.parsePrimary();

    while (
      this.current.type === TokenType.LOGICAL &&
      (this.current.value === LogicalOperator.AND ||
        this.current.value === LogicalOperator.AND_NOT)
    ) {
      const operator = this.current.value as LogicalOperator;
      this.advance();
      const right = this.parsePrimary();

      left = {
        type: "logical",
        operator,
        left,
        right,
      } as LogicalExpression;
    }

    return left;
  }

  /**
   * Parse primary expression (clause or grouped expression).
   * primary := clause | '(' or_expr ')' | '[' clause ']' | '[' NAME ':' clause ']'
   */
  private parsePrimary(): PatternExpression {
    // Grouped expression
    if (this.current.type === TokenType.LPAREN) {
      this.advance();
      const expr = this.parseOrExpression();

      if (this.current.type !== TokenType.RPAREN) {
        throw new AdapterError(
          "Expected closing parenthesis ')'",
          this.current.position,
          this.getContext(this.current.position)
        );
      }

      this.advance();
      return expr;
    }

    // Captured group
    if (this.current.type === TokenType.LBRACKET) {
      return this.parseCapturedClause();
    }

    // Regular clause
    return this.parseClause(false);
  }

  /**
   * Parse a captured clause: [name:clause] or [clause]
   */
  private parseCapturedClause(): ClauseExpression {
    this.advance(); // Skip '['

    let groupName: string | undefined;

    // Check if this is a named group [name:...]
    if (this.current.type === TokenType.NAME) {
      const lookahead = this.peek();
      if (lookahead && lookahead.type === TokenType.COLON) {
        groupName = this.current.value;
        this.advance(); // Skip name
        this.advance(); // Skip ':'
      }
    }

    // Parse the clause
    const clauseExpr = this.parseClause(true, groupName);

    if (this.current.type !== TokenType.RBRACKET) {
      throw new AdapterError(
        "Expected closing bracket ']'",
        this.current.position,
        this.getContext(this.current.position)
      );
    }

    this.advance(); // Skip ']'
    return clauseExpr;
  }

  /**
   * Parse a clause: name [operator value]
   */
  private parseClause(capture: boolean, groupName?: string): ClauseExpression {
    if (this.current.type !== TokenType.NAME) {
      throw new AdapterError(
        `Expected feature name, got: ${this.current.value}`,
        this.current.position,
        this.getContext(this.current.position)
      );
    }

    const name = this.current.value;
    this.advance();

    let operator: ComparisonOperator | undefined;
    let value: string | undefined;

    // Check for operator
    if (this.current.type === TokenType.OPERATOR) {
      operator = this.current.value as ComparisonOperator;
      this.advance();

      // After operator, we expect a value
      if (this.current.type === TokenType.VALUE) {
        value = this.current.value;
        this.advance();
      } else if (this.current.type === TokenType.NAME) {
        // Unquoted value (trim whitespace as specified)
        value = this.current.value.trim();
        this.advance();
      } else {
        throw new AdapterError(
          `Expected value after operator '${operator}'`,
          this.current.position,
          this.getContext(this.current.position)
        );
      }
    }

    const clause: Clause = {
      name,
      operator,
      value,
      capture,
      groupName: capture ? groupName || String(++this.groupCounter) : undefined,
    };

    return {
      type: "clause",
      clause,
    } as ClauseExpression;
  }

  /**
   * Advance to the next token.
   */
  private advance(): void {
    this.position++;
    this.current = this.tokens[this.position] || {
      type: TokenType.EOF,
      value: "",
      position: this.input.length,
    };
  }

  /**
   * Peek at the next token without consuming it.
   */
  private peek(): Token | null {
    return this.tokens[this.position + 1] || null;
  }

  /**
   * Get context around a position for error messages.
   */
  private getContext(position: number): string {
    const start = Math.max(0, position - 20);
    const end = Math.min(this.input.length, position + 20);
    return this.input.substring(start, end);
  }
}
