# Feature Adapter

The Feature Adapter is a utility system for transforming feature sets in GVE snapshot data. It allows you to adapt higher-level features into lower-level rendition features that the GVE web component can use for rendering.

## Overview

The adapter system consists of two main services:

1. **FeatureAdapter**: A low-level service that transforms arrays of features based on pattern matching and replacement rules.
2. **DataFeatureAdapter**: A high-level service that applies `FeatureAdapter` transformations to `CharChainResult` data structures.

## Usage

### Basic Example

```ts
import { FeatureAdapter, ProcessingMode } from "./adapter/index.js";

// Create an adapter with transformation rules
const adapter = new FeatureAdapter({
  operations: [
    {
      // Match features named "epigram-nr" with numeric value 12
      pattern: "[num:epigram-nr==12]",
      // Replace with rendition features
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

// Apply transformations
const inputFeatures = [{ name: "epigram-nr", value: "12", setPolicy: 0 }];

const outputFeatures = adapter.adapt(inputFeatures);
// Result: 5 rendition features instead of the original epigram-nr
```

### Using with Data

```ts
import { DataFeatureAdapter } from "./adapter/index.js";
import { CharChainResult } from "./models.js";

// Create the adapter
const dataAdapter = new DataFeatureAdapter({
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

// Apply to CharChainResult data
const originalData: CharChainResult = loadData();
const adaptedData = dataAdapter.adaptData(originalData);

// Pass adapted data to the web component
component.data = adaptedData;
```

## Pattern Matching DSL

The adapter uses a Domain-Specific Language (DSL) for pattern matching. This DSL supports:

### Basic Clauses

```
feature-name                  # Match any feature with this name
feature-name=value           # Match name and value (string equals)
feature-name!=value          # Not equals
feature-name^=prefix         # Starts with
feature-name$=suffix         # Ends with
feature-name*=substring      # Contains
feature-name?=wild*card      # Wildcard match (? = one char, * = any)
feature-name~^regex$         # Regular expression match
feature-name==12             # Numeric equals
feature-name<>12             # Numeric not equals
feature-name>10              # Numeric greater than
feature-name<20              # Numeric less than
feature-name>=10             # Numeric greater than or equal
feature-name<=20             # Numeric less than or equal
```

### Logical Operators

Combine clauses with logical operators (precedence: NOT > AND > OR):

```txt
color=red AND size=large
color=red OR color=blue
color=red AND NOT size=small
color=red OR NOT size=small
(color=red OR color=blue) AND size=large
```

### Capture Groups

Capture matched feature names and values for use in replacements:

```txt
[feature-name^=prefix]              # Numbered capture: use as $1.name, $1.value
[corr:note^=corrected]              # Named capture: use as $corr.name, $corr.value
[note^=corr] AND [col:color=red]    # Multiple captures
```

### Quoted Values

Use quotes for values with spaces or special characters:

```txt
note="value with spaces"
note="value with \"quotes\""
note="line1\nline2"
```

## Processing Modes

Two modes control how matched features are processed:

- **ADD** (default): Add new features without removing matched ones
- **REPLACE**: Remove matched features, then add new features

## Complete Example

Transform manuscript annotations into rendition features:

```ts
const adapter = new FeatureAdapter({
  operations: [
    // Transform high-level epigram numbers to rendition hints
    {
      pattern: "[num:epigram-nr]",
      features: [
        "r_hints=note",
        "r_hint-vars=note=$num.value",
        "r_h-position=nw",
        "r_h-offset-y=10",
        "r_h-scale-x=2",
      ],
      mode: ProcessingMode.REPLACE,
    },

    // Transform correction markers
    {
      pattern: "[corr:note^=corrected] AND [col:color]",
      features: [
        "r_hints=diagonal-stroke",
        "r_fore-color=$col.value",
        "r_t-position=n",
        "r_font-size=14",
      ],
      mode: ProcessingMode.ADD,
    },

    // Clean up temporary markers
    {
      pattern: "temp-marker",
      features: [],
      mode: ProcessingMode.REPLACE, // Remove without adding anything
    },
  ],
});
```

## Error Handling

The adapter provides detailed error messages with position information:

```ts
try {
  const adapter = new FeatureAdapter({
    operations: [
      {
        pattern: "invalid ( syntax", // Invalid syntax
        features: ["error=true"],
      },
    ],
  });
} catch (error) {
  if (error instanceof AdapterError) {
    console.error(error.toString());
    // Outputs:
    // AdapterError: Expected closing parenthesis ')'
    // At position 9:
    // invalid ( syntax
    //         ^
  }
}
```

## What Gets Adapted

`DataFeatureAdapter` adapts features in:

- ✅ `steps[i].featureSet.features` (global features)
- ✅ `steps[i].featureSet.nodeFeatures` (node-specific features)
- ✅ `taggedNodes[version][i].features` (features on nodes)

It does NOT adapt:

- ❌ `steps[i].operation.features` (operation metadata)

This ensures operation metadata remains untouched while all rendering-relevant features are transformed.

## Performance Considerations

- Patterns are compiled once during adapter construction
- Invalid patterns are detected immediately
- Deep copying of data ensures the original remains untouched
- Short-circuit evaluation optimizes logical expressions

## API Reference

### FeatureAdapter

```ts
class FeatureAdapter {
  constructor(settings: FeatureAdapterSettings);
  adapt(features: Feature[]): Feature[];
}
```

### DataFeatureAdapter

```ts
class DataFeatureAdapter {
  constructor(settings: FeatureAdapterSettings);
  adaptData(data: CharChainResult): CharChainResult;
}
```

### FeatureAdapterSettings

```ts
interface FeatureAdapterSettings {
  operations: AdapterOperation[];
}

interface AdapterOperation {
  pattern: string; // DSL pattern to match
  features: string[]; // Features to add (format: "name=value")
  mode?: ProcessingMode; // "add" | "replace" (default: "add")
}
```

## Testing

The adapter module includes comprehensive test suites:

- `tokenizer.spec.ts`: DSL tokenization tests
- `parser.spec.ts`: DSL parsing and precedence tests
- `feature-adapter.spec.ts`: Feature transformation tests
- `data-feature-adapter.spec.ts`: Data adaptation tests

Run tests with:

```bash
pnpm test
```
