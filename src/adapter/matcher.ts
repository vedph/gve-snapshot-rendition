/**
 * Feature matching engine for the adapter.
 */

import {
  Clause,
  PatternExpression,
  ClauseExpression,
  LogicalExpression,
  LogicalOperator,
  ComparisonOperator,
  MatchResult,
  CapturedGroup,
  AdapterError,
} from "./adapter-models";
import { Feature } from "../models";

/**
 * Matches features against a pattern expression.
 */
export class FeatureMatcher {
  /**
   * Match features against a parsed pattern expression.
   */
  match(features: Feature[], expression: PatternExpression): MatchResult {
    const captures = new Map<string, CapturedGroup>();
    const matchedFeatures: Feature[] = [];

    const matched = this.evaluateExpression(
      features,
      expression,
      captures,
      matchedFeatures
    );

    return {
      matched,
      captures,
      matchedFeatures,
    };
  }

  /**
   * Evaluate a pattern expression against features.
   */
  private evaluateExpression(
    features: Feature[],
    expression: PatternExpression,
    captures: Map<string, CapturedGroup>,
    matchedFeatures: Feature[]
  ): boolean {
    if (expression.type === "clause") {
      return this.evaluateClause(
        features,
        (expression as ClauseExpression).clause,
        captures,
        matchedFeatures
      );
    } else if (expression.type === "logical") {
      const logicalExpr = expression as LogicalExpression;
      const leftResult = this.evaluateExpression(
        features,
        logicalExpr.left,
        captures,
        matchedFeatures
      );

      switch (logicalExpr.operator) {
        case LogicalOperator.AND:
          // Short-circuit: if left is false, don't evaluate right
          if (!leftResult) return false;
          return this.evaluateExpression(
            features,
            logicalExpr.right,
            captures,
            matchedFeatures
          );

        case LogicalOperator.OR:
          // Short-circuit: if left is true, don't evaluate right
          if (leftResult) return true;
          return this.evaluateExpression(
            features,
            logicalExpr.right,
            captures,
            matchedFeatures
          );

        case LogicalOperator.AND_NOT:
          // Short-circuit: if left is false, don't evaluate right
          if (!leftResult) return false;
          return !this.evaluateExpression(
            features,
            logicalExpr.right,
            captures,
            matchedFeatures
          );

        case LogicalOperator.OR_NOT:
          // Short-circuit: if left is true, don't evaluate right
          if (leftResult) return true;
          return !this.evaluateExpression(
            features,
            logicalExpr.right,
            captures,
            matchedFeatures
          );

        default:
          throw new AdapterError(
            `Unknown logical operator: ${logicalExpr.operator}`
          );
      }
    }

    throw new AdapterError(`Unknown expression type`);
  }

  /**
   * Evaluate a clause against features.
   */
  private evaluateClause(
    features: Feature[],
    clause: Clause,
    captures: Map<string, CapturedGroup>,
    matchedFeatures: Feature[]
  ): boolean {
    // Find features matching the clause
    for (const feature of features) {
      if (this.matchFeature(feature, clause)) {
        // Track matched feature
        if (!matchedFeatures.includes(feature)) {
          matchedFeatures.push(feature);
        }

        // Capture if needed
        if (clause.capture && clause.groupName) {
          captures.set(clause.groupName, {
            name: feature.name,
            value: feature.value,
          });
        }

        return true;
      }
    }

    return false;
  }

  /**
   * Check if a single feature matches a clause.
   */
  private matchFeature(feature: Feature, clause: Clause): boolean {
    // First, check if name matches
    if (feature.name !== clause.name) {
      return false;
    }

    // If no operator specified, name match is sufficient
    if (!clause.operator || clause.value === undefined) {
      return true;
    }

    // Apply operator comparison
    return this.compareValues(feature.value, clause.value, clause.operator);
  }

  /**
   * Compare values using the specified operator.
   */
  private compareValues(
    featureValue: string,
    clauseValue: string,
    operator: ComparisonOperator
  ): boolean {
    switch (operator) {
      case ComparisonOperator.EQUALS:
        return featureValue === clauseValue;

      case ComparisonOperator.NOT_EQUALS:
        return featureValue !== clauseValue;

      case ComparisonOperator.STARTS_WITH:
        return featureValue.startsWith(clauseValue);

      case ComparisonOperator.ENDS_WITH:
        return featureValue.endsWith(clauseValue);

      case ComparisonOperator.CONTAINS:
        return featureValue.includes(clauseValue);

      case ComparisonOperator.MATCHES_WILDCARDS:
        return this.matchWildcard(featureValue, clauseValue);

      case ComparisonOperator.MATCHES_REGEX:
        try {
          const regex = new RegExp(clauseValue);
          return regex.test(featureValue);
        } catch (e) {
          throw new AdapterError(
            `Invalid regular expression: ${clauseValue}: ${
              e instanceof Error ? e.message : String(e)
            }`
          );
        }

      case ComparisonOperator.NUMERIC_EQUALS:
      case ComparisonOperator.NUMERIC_NOT_EQUALS:
      case ComparisonOperator.NUMERIC_GT:
      case ComparisonOperator.NUMERIC_LT:
      case ComparisonOperator.NUMERIC_GTE:
      case ComparisonOperator.NUMERIC_LTE:
        return this.compareNumeric(featureValue, clauseValue, operator);

      default:
        throw new AdapterError(`Unknown operator: ${operator}`);
    }
  }

  /**
   * Match a value against a wildcard pattern (? and *).
   */
  private matchWildcard(value: string, pattern: string): boolean {
    // Convert wildcard pattern to regex
    // Escape special regex characters except ? and *
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\?/g, ".")
      .replace(/\*/g, ".*");

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(value);
  }

  /**
   * Compare numeric values.
   */
  private compareNumeric(
    featureValue: string,
    clauseValue: string,
    operator: ComparisonOperator
  ): boolean {
    const featureNum = parseFloat(featureValue);
    const clauseNum = parseFloat(clauseValue);

    // If either fails to parse, return false
    if (isNaN(featureNum) || isNaN(clauseNum)) {
      return false;
    }

    switch (operator) {
      case ComparisonOperator.NUMERIC_EQUALS:
        return featureNum === clauseNum;
      case ComparisonOperator.NUMERIC_NOT_EQUALS:
        return featureNum !== clauseNum;
      case ComparisonOperator.NUMERIC_GT:
        return featureNum > clauseNum;
      case ComparisonOperator.NUMERIC_LT:
        return featureNum < clauseNum;
      case ComparisonOperator.NUMERIC_GTE:
        return featureNum >= clauseNum;
      case ComparisonOperator.NUMERIC_LTE:
        return featureNum <= clauseNum;
      default:
        return false;
    }
  }
}
