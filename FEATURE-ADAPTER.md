# Feature Adapter System

This document describes the Feature Adapter system added to the GVE Snapshot Rendition component.

## Purpose

The Feature Adapter system provides utility services that enable consumers of the GVE web component to transform high-level features into low-level rendition features. This is particularly useful when scholars want to use abstract taxonomies in their data entry but need specific rendition hints for the component.

## Architecture

The system consists of several modular components:

### Core Services

1. **FeatureAdapter** (`src/adapter/feature-adapter.ts`)
   - Low-level service for transforming feature arrays
   - Independent of the GVE component
   - Works with any array of name-value features

2. **DataFeatureAdapter** (`src/adapter/data-feature-adapter.ts`)
   - High-level service for transforming CharChainResult data
   - Applies FeatureAdapter to all feature sets in the data
   - Preserves operation metadata unchanged

### Supporting Components

3. **Tokenizer** (`src/adapter/tokenizer.ts`)
   - Lexical analysis of the pattern DSL
   - Handles escape sequences, operators, quoted strings
   - Provides detailed error positions

4. **Parser** (`src/adapter/parser.ts`)
   - Syntactic analysis with operator precedence
   - Supports capture groups (named and numbered)
   - Builds Abstract Syntax Tree (AST)

5. **Matcher** (`src/adapter/matcher.ts`)
   - Evaluates parsed patterns against features
   - Implements all comparison operators
   - Handles logical expressions with short-circuit evaluation

6. **Models** (`src/adapter/adapter-models.ts`)
   - TypeScript interfaces and enums
   - Error handling with AdapterError class
   - Configuration structures

## Pattern Matching DSL

The adapter uses a powerful DSL for matching features:

### Operators

**Comparison Operators:**
- `=` equals
- `!=` not equals
- `^=` starts with
- `$=` ends with
- `*=` contains
- `?=` wildcard match
- `~` regex match
- `==`, `<>`, `>`, `<`, `>=`, `<=` numeric comparisons

**Logical Operators (precedence: NOT > AND > OR):**
- `AND`, `OR`, `AND NOT`, `OR NOT`
- Parentheses `()` for grouping

**Capture Groups:**
- `[clause]` numbered capture ($1, $2, ...)
- `[name:clause]` named capture ($name)

### Examples

```
note^=corrected                               # Starts with
[num:epigram-nr==12]                         # Named capture
color=red AND (size=large OR size=medium)    # Logical grouping
note?=corr*ed                                # Wildcards
note~^corr.*ed$                              # Regex
```

## Usage Example

```typescript
import { DataFeatureAdapter, ProcessingMode } from "./adapter/index.js";

// Configure the adapter
const adapter = new DataFeatureAdapter({
  operations: [
    {
      // Match epigram numbers and transform to rendition hints
      pattern: "[num:epigram-nr==12]",
      features: [
        "r_hints=note",
        "r_hint-vars=note=$num.value",  // Use captured value
        "r_h-position=nw",
        "r_h-offset-y=10",
        "r_h-scale-x=2",
      ],
      mode: ProcessingMode.REPLACE,  // Remove original, add new
    },
  ],
});

// Apply to data before passing to component
const originalData = fetchDataFromBackend();
const adaptedData = adapter.adaptData(originalData);

// Use with component
component.data = adaptedData;
```

## Use Cases

1. **Abstract Data Entry**: Scholars can use high-level taxonomies (e.g., `epigram-nr`, `correction-type`) without worrying about rendition details.

2. **Feature Transformation**: Convert domain-specific features to rendition features the component understands.

3. **Conditional Rendering**: Apply different hints based on feature values or combinations.

4. **Data Normalization**: Clean up, standardize, or enrich features before rendering.

## Files Added

```
src/adapter/
├── adapter-models.ts           # TypeScript models and types
├── tokenizer.ts                # DSL tokenizer
├── tokenizer.spec.ts           # Tokenizer tests
├── parser.ts                   # DSL parser
├── parser.spec.ts              # Parser tests
├── matcher.ts                  # Feature matching engine
├── feature-adapter.ts          # FeatureAdapter service
├── feature-adapter.spec.ts     # FeatureAdapter tests
├── data-feature-adapter.ts     # DataFeatureAdapter service
├── data-feature-adapter.spec.ts # DataFeatureAdapter tests
├── index.ts                    # Public API exports
└── README.md                   # Detailed documentation
```

## Testing

The system includes comprehensive test coverage (89 tests):

- **Tokenizer**: 24 tests covering all token types, operators, escape sequences
- **Parser**: 24 tests covering precedence, grouping, captures, error handling
- **FeatureAdapter**: 27 tests covering operators, captures, modes, transformations
- **DataFeatureAdapter**: 14 tests covering data adaptation, preservation, edge cases

All tests pass successfully:

```bash
pnpm test

Test Files  4 passed (4)
     Tests  89 passed (89)
```

## Design Decisions

### 1. Operator Precedence

Following standard boolean algebra:
1. NOT (highest)
2. AND
3. OR (lowest)

### 2. Escape Sequences

Standard C-style: `\"` for quotes, `\\` for backslash, `\n`, `\t`.

### 3. Error Handling

Fail-fast with detailed error messages including position and context.

### 4. Whitespace

Trimmed in unquoted values, preserved in quoted strings.

### 5. Independence

FeatureAdapter is completely independent from the web component, enabling reuse.

## Performance

- **Pattern Compilation**: Patterns are compiled once during construction
- **Short-Circuit Evaluation**: Logical operators use short-circuit evaluation
- **Deep Copy**: Data is deep-copied to avoid mutations (uses JSON serialization)
- **No Dependencies**: Pure TypeScript, no external dependencies beyond the project

## Future Enhancements

Potential improvements (not implemented):

1. **Pattern Caching**: Cache compiled patterns across instances
2. **Incremental Updates**: Update only changed features instead of full deep copy
3. **Custom Functions**: Allow user-defined functions in feature values
4. **Validation**: Schema validation for feature transformations
5. **Performance Profiling**: Optimize for large datasets

## Integration with Web Component

The adapter is designed to be used **before** passing data to the web component:

```
Backend Data → DataFeatureAdapter → Adapted Data → Web Component
```

The web component remains unchanged and unaware of the adapter. This maintains separation of concerns and allows the adapter to be optional.

## Documentation

- Main documentation: [src/adapter/README.md](src/adapter/README.md)
- This file: Overview and architecture
- Code comments: Inline documentation in source files
- Tests: Serve as usage examples

## License

Same as the parent project (ISC).

## Contributors

- Claude Sonnet 4.5 (AI Assistant) - Initial implementation
- Project maintainers - Design guidance and requirements
