/**
 * Tokenizer for the feature adapter DSL.
 */

import {
  Token,
  TokenType,
  ComparisonOperator,
  LogicalOperator,
  AdapterError,
} from "./adapter-models";

/**
 * Tokenizes a DSL pattern string into tokens.
 */
export class Tokenizer {
  private input: string;
  private position: number;
  private current: string;
  private expectValue: boolean;

  constructor(input: string) {
    this.input = input;
    this.position = 0;
    this.current = input.length > 0 ? input[0] : "";
    this.expectValue = false;
  }

  /**
   * Tokenize the entire input.
   */
  tokenize(): Token[] {
    const tokens: Token[] = [];
    let token: Token;

    while ((token = this.nextToken()).type !== TokenType.EOF) {
      tokens.push(token);
    }

    return tokens;
  }

  /**
   * Get the next token from input.
   */
  private nextToken(): Token {
    this.skipWhitespace();

    if (this.position >= this.input.length) {
      return { type: TokenType.EOF, value: "", position: this.position };
    }

    const startPos = this.position;

    // Check for special characters
    switch (this.current) {
      case "(":
        this.advance();
        return { type: TokenType.LPAREN, value: "(", position: startPos };
      case ")":
        this.advance();
        return { type: TokenType.RPAREN, value: ")", position: startPos };
      case "[":
        this.advance();
        return { type: TokenType.LBRACKET, value: "[", position: startPos };
      case "]":
        this.advance();
        return { type: TokenType.RBRACKET, value: "]", position: startPos };
      case ":":
        this.advance();
        return { type: TokenType.COLON, value: ":", position: startPos };
      case '"':
        return this.readQuotedString(startPos);
    }

    // Check for operators (must check multi-char operators first)
    const operatorToken = this.tryReadOperator(startPos);
    if (operatorToken) {
      // After an operator, we expect a value
      // Mark the next token to be read as a value
      this.expectValue = true;
      return operatorToken;
    }

    // If we're expecting a value (after an operator), read unquoted value
    if (this.expectValue) {
      this.expectValue = false;
      const value = this.readUnquotedValue();
      if (value) {
        return { type: TokenType.VALUE, value, position: startPos };
      }
    }

    // Check for logical operators or names
    const word = this.readWord();
    if (word) {
      // Check if it's a logical operator
      const upperWord = word.toUpperCase();

      // Check for two-word operators (AND NOT, OR NOT)
      if (upperWord === "AND" || upperWord === "OR") {
        this.skipWhitespace();
        const nextWordStart = this.position;
        const nextWord = this.peekWord();

        if (nextWord && nextWord.toUpperCase() === "NOT") {
          // Consume the NOT word
          this.readWord();
          const logicalOp =
            upperWord === "AND"
              ? LogicalOperator.AND_NOT
              : LogicalOperator.OR_NOT;
          return {
            type: TokenType.LOGICAL,
            value: logicalOp,
            position: startPos,
          };
        }

        // Single-word operator
        const logicalOp =
          upperWord === "AND" ? LogicalOperator.AND : LogicalOperator.OR;
        return {
          type: TokenType.LOGICAL,
          value: logicalOp,
          position: startPos,
        };
      }

      // Otherwise, it's a name
      return { type: TokenType.NAME, value: word.trim(), position: startPos };
    }

    throw new AdapterError(
      `Unexpected character '${this.current}'`,
      this.position,
      this.getContext()
    );
  }

  /**
   * Try to read a comparison operator.
   */
  private tryReadOperator(startPos: number): Token | null {
    // Check multi-character operators first
    if (this.position + 1 < this.input.length) {
      const twoChar = this.input.substring(this.position, this.position + 2);

      const ops: Record<string, ComparisonOperator> = {
        "!=": ComparisonOperator.NOT_EQUALS,
        "^=": ComparisonOperator.STARTS_WITH,
        "$=": ComparisonOperator.ENDS_WITH,
        "*=": ComparisonOperator.CONTAINS,
        "?=": ComparisonOperator.MATCHES_WILDCARDS,
        "==": ComparisonOperator.NUMERIC_EQUALS,
        "<>": ComparisonOperator.NUMERIC_NOT_EQUALS,
        ">=": ComparisonOperator.NUMERIC_GTE,
        "<=": ComparisonOperator.NUMERIC_LTE,
      };

      if (ops[twoChar]) {
        this.position += 2;
        this.current =
          this.position < this.input.length ? this.input[this.position] : "";
        return {
          type: TokenType.OPERATOR,
          value: ops[twoChar],
          position: startPos,
        };
      }
    }

    // Check single-character operators
    const singleOps: Record<string, ComparisonOperator> = {
      "=": ComparisonOperator.EQUALS,
      "~": ComparisonOperator.MATCHES_REGEX,
      ">": ComparisonOperator.NUMERIC_GT,
      "<": ComparisonOperator.NUMERIC_LT,
    };

    if (singleOps[this.current]) {
      const op = singleOps[this.current];
      this.advance();
      return { type: TokenType.OPERATOR, value: op, position: startPos };
    }

    return null;
  }

  /**
   * Read a quoted string (handles escape sequences).
   */
  private readQuotedString(startPos: number): Token {
    this.advance(); // Skip opening quote
    let value = "";

    while (this.position < this.input.length && this.current !== '"') {
      if (this.current === "\\") {
        this.advance();
        if (this.position >= this.input.length) {
          throw new AdapterError(
            "Unexpected end of input in quoted string",
            this.position,
            this.getContext()
          );
        }
        // Handle escape sequences
        // After a backslash, this.current contains the literal character to escape
        const char = this.current as string;
        switch (char) {
          case '"':
            value += '"';
            break;
          case '\\':
            value += '\\';
            break;
          case 'n':
            value += '\n';
            break;
          case 't':
            value += '\t';
            break;
          default:
            // For any other character, just include it literally
            value += char;
            break;
        }
        this.advance();
      } else {
        value += this.current;
        this.advance();
      }
    }

    if (this.current !== '"') {
      throw new AdapterError(
        "Unterminated quoted string",
        startPos,
        this.getContext()
      );
    }

    this.advance(); // Skip closing quote
    return { type: TokenType.VALUE, value, position: startPos };
  }

  /**
   * Read a word (name or keyword).
   */
  private readWord(): string {
    const startPos = this.position;

    // Words can contain letters, digits, underscores, hyphens, and dots
    while (
      this.position < this.input.length &&
      /[a-zA-Z0-9_\-.]/.test(this.current)
    ) {
      this.advance();
    }

    return this.input.substring(startPos, this.position);
  }

  /**
   * Read an unquoted value (after an operator).
   * Values can include special characters like *, ?, ^, $, etc.
   */
  private readUnquotedValue(): string {
    const startPos = this.position;

    // Values continue until whitespace or special grouping characters
    while (
      this.position < this.input.length &&
      !/[\s()\[\]:]/.test(this.current)
    ) {
      this.advance();
    }

    return this.input.substring(startPos, this.position).trim();
  }

  /**
   * Peek at the next word without consuming it.
   */
  private peekWord(): string | null {
    const savedPos = this.position;
    const savedCurrent = this.current;

    const word = this.readWord();

    // Restore position
    this.position = savedPos;
    this.current = savedCurrent;

    return word || null;
  }

  /**
   * Skip whitespace.
   */
  private skipWhitespace(): void {
    while (this.position < this.input.length && /\s/.test(this.current)) {
      this.advance();
    }
  }

  /**
   * Advance to next character.
   */
  private advance(): void {
    this.position++;
    this.current =
      this.position < this.input.length ? this.input[this.position] : "";
  }

  /**
   * Get context around current position for error messages.
   */
  private getContext(): string {
    const start = Math.max(0, this.position - 20);
    const end = Math.min(this.input.length, this.position + 20);
    return this.input.substring(start, end);
  }
}
