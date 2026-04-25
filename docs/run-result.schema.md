# API Run Operation Result Schema

This is the JSON schema of the result of the API endpoint used to run operations. Data returned by this schema are sampled in `data/*.data.json`.

```json
{
  "required": ["result"],
  "type": "object",
  "properties": {
    "error": {
      "type": ["null", "string"],
      "description": "The error message."
    },
    "result": {
      "oneOf": [
        {
          "type": "null"
        },
        {
          "type": "object",
          "properties": {
            "steps": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "operation": {
                    "type": "object",
                    "properties": {
                      "dsl": {
                        "type": ["null", "string"],
                        "description": "Gets the domain-specific language (DSL) representation of the operation.\r\nUsed for DTO."
                      },
                      "toAsIndex": {
                        "type": "boolean",
                        "description": "Gets or sets a value indicating whether the target position should be\r\ninterpreted as an index."
                      },
                      "to": {
                        "pattern": "^-?(?:0|[1-9]\\d*)$",
                        "type": "string",
                        "description": "Gets or sets the target position.",
                        "format": "int32"
                      },
                      "toRun": {
                        "pattern": "^-?(?:0|[1-9]\\d*)$",
                        "type": "string",
                        "description": "Gets or sets the to-count.",
                        "format": "int32"
                      },
                      "inputTag": {
                        "type": ["null", "string"],
                        "description": "Gets or sets the input version tag for this operation. If null,\r\nthe default tag (=the tag of the last operation executed on the context)\r\nis used."
                      },
                      "outputTag": {
                        "type": ["null", "string"],
                        "description": "Gets or sets the output version tag for this operation. If null,\r\na value will be automatically generated from the input tag if this\r\nends with digits; else, it will be equal to the input tag."
                      },
                      "atAsIndex": {
                        "type": "boolean",
                        "description": "Gets or sets a value indicating whether int CharChainOperation.At refers to\r\nan index rather than a chain node ID."
                      },
                      "at": {
                        "pattern": "^-?(?:0|[1-9]\\d*)$",
                        "type": "string",
                        "description": "Gets or sets the ordinal character number to start at.",
                        "format": "int32"
                      },
                      "run": {
                        "pattern": "^-?(?:0|[1-9]\\d*)$",
                        "type": "string",
                        "description": "Gets or sets the run of characters to include from int CharChainOperation.At.",
                        "format": "int32"
                      },
                      "value": {
                        "type": ["null", "string"],
                        "description": "Gets the value argument for this operation. This is the primary argument,\r\nwhose meaning varies depending on the operation type."
                      },
                      "noTraceFeatures": {
                        "type": "boolean",
                        "description": "Gets or sets a value indicating whether trace features should not be\r\nadded."
                      },
                      "type": {
                        "type": "integer",
                        "description": "Type of operation."
                      },
                      "id": {
                        "type": "string",
                        "description": "Gets or sets the operation identifier. This can be used to reference\r\na specific operation in a transformation, and is automatically\r\ngenerated using string Nanoid.Generate(string alphabet = \"_-0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ\", int size = 21) unless\r\nyou want to assign it some human-friendly name."
                      },
                      "rank": {
                        "pattern": "^-?(?:0|[1-9]\\d*)$",
                        "type": "string",
                        "description": "Gets or sets the certainty rank for this operation: 0=not specified,\r\n1=most probable, 2=less probable, etc.",
                        "format": "int16"
                      },
                      "groupId": {
                        "type": ["null", "string"],
                        "description": "Gets or sets the optional group identifier. When an operation is part\r\nof a group, all the operation in it are considered as a unique virtual\r\noperation."
                      },
                      "features": {
                        "type": "array",
                        "items": {
                          "required": ["name", "value"],
                          "type": "object",
                          "properties": {
                            "isNegated": {
                              "type": "boolean",
                              "description": "Gets or sets a value indicating whether this feature is negated.\r\nA negated feature means that any existing feature with the same name\r\nshould be removed.",
                              "default": false
                            },
                            "isGlobal": {
                              "type": "boolean",
                              "description": "Gets a value indicating whether this feature globally refers to the\r\noperation context as a whole, rather than to its affected nodes.",
                              "default": false
                            },
                            "isShortLived": {
                              "type": "boolean",
                              "description": "Gets or sets a value indicating whether this instance is short-lived.\r\nWhen true, the feature is removed on the next update.",
                              "default": false
                            },
                            "setPolicy": {
                              "type": "integer",
                              "description": "Policy for adding a Feature to a set.",
                              "default": 0
                            },
                            "name": {
                              "type": "string"
                            },
                            "value": {
                              "type": ["null", "string"]
                            }
                          },
                          "description": "A feature attached to a text variant generation operation. This adds\r\nmetadata to the feature to drive its application to the operation context."
                        },
                        "description": "Gets or sets the features to be attached to the result of this operation."
                      },
                      "sources": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "properties": {
                            "id": {
                              "type": "string",
                              "description": "Gets or sets the source identifier."
                            },
                            "type": {
                              "type": ["null", "string"],
                              "description": "Gets or sets the source type (e.g. manuscript, author...)."
                            },
                            "rank": {
                              "pattern": "^-?(?:0|[1-9]\\d*)$",
                              "type": "string",
                              "description": "Gets or sets the probability rank for the source attribution (0=not\r\nspecified, 1=most probable, 2=less probable, etc.).",
                              "format": "int16"
                            },
                            "note": {
                              "type": ["null", "string"],
                              "description": "Gets or sets an optional note."
                            }
                          },
                          "description": "The source for an operation. This is specialized metadata about the source\r\nof an operation, such as a manuscript, an author, etc."
                        },
                        "description": "Gets or sets the sources for this operation. These represent any type\r\nof source for it, such as a manuscript, an author, etc."
                      }
                    },
                    "description": "Common operation DTO used for most char-chain operations."
                  },
                  "inputTag": {
                    "type": ["null", "string"],
                    "description": "Gets the input tag."
                  },
                  "outputTag": {
                    "type": ["null", "string"],
                    "description": "Gets the output tag."
                  },
                  "result": {
                    "type": ["null", "string"],
                    "description": "Gets a string synthetically representing the result (the text produced\r\nby this operation)."
                  },
                  "refNodeIds": {
                    "type": "array",
                    "items": {
                      "pattern": "^-?(?:0|[1-9]\\d*)$",
                      "type": "string",
                      "format": "int32"
                    },
                    "description": "Gets the reference node IDs (the nodes involved in this operation,\r\ne.g. deleted nodes for a delete operation)."
                  }
                },
                "description": "Data transfer object for a single step within a chain operation context.\r\nRecords the operation metadata, input/output version tags, the result text,\r\nand the IDs of nodes referenced by the operation."
              },
              "description": "The execution steps, one per operation. Each step records the operation\r\nmetadata, input/output version tags, the result text, and the IDs of\r\nnodes referenced by the operation."
            },
            "chainDump": {
              "type": ["null", "string"],
              "description": "The chain dump text (diagnostic)."
            },
            "chainTags": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "description": "The list of unique chain tags in version order, including `v0`."
            },
            "nodes": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": {
                    "pattern": "^-?(?:0|[1-9]\\d*)$",
                    "type": "string",
                    "description": "The autonumber assigned to this node in the context of its chain.",
                    "format": "int32"
                  },
                  "index": {
                    "pattern": "^-?(?:0|[1-9]\\d*)$",
                    "type": "string",
                    "description": "Gets or sets the node's index in the base text.",
                    "format": "int32"
                  },
                  "label": {
                    "type": "string",
                    "description": "The node label."
                  },
                  "data": {
                    "maxLength": 1,
                    "minLength": 1,
                    "type": "string",
                    "description": "The data attached to this node.",
                    "format": "char"
                  },
                  "sourceTag": {
                    "type": "string",
                    "description": "The source tag for this node, i.e. the tag of the version which first\r\nadded it to the chain."
                  },
                  "features": {
                    "type": "object",
                    "additionalProperties": {
                      "type": "array",
                      "items": {
                        "required": ["name", "value"],
                        "type": "object",
                        "properties": {
                          "setPolicy": {
                            "type": "integer",
                            "description": "Policy for adding a Feature to a set.",
                            "default": 0
                          },
                          "name": {
                            "type": "string"
                          },
                          "value": {
                            "type": ["null", "string"]
                          }
                        },
                        "description": "A generic name=value (or just named) feature."
                      }
                    },
                    "description": "The features for this node, grouped by version tag. Each entry is the\r\nlist of features that apply to this node at that version. Null when the\r\nnode has no features in any version."
                  }
                },
                "description": "Base text character chain node."
              },
              "description": "All nodes in the chain, regardless of which version(s) they belong to.\r\nEach node carries its per-version features in\r\nIDictionary&lt;string, IList&lt;Feature&gt;&gt;? CharChainNode.Features. Deleted nodes are included so\r\nthat consumers can reconstruct the full history."
            },
            "versionNodeIds": {
              "type": "object",
              "additionalProperties": {
                "type": "array",
                "items": {
                  "pattern": "^-?(?:0|[1-9]\\d*)$",
                  "type": "string",
                  "format": "int32"
                }
              },
              "description": "For each version tag (including `v0`), the ordered sequence of\r\nnode IDs that make up that version's text. Consumers use this together\r\nwith IList&lt;CharChainNode&gt; CharChainResultModel.Nodes (looked up by ID) to render any version\r\nwithout duplicating node data."
            },
            "globalFeatures": {
              "type": "object",
              "additionalProperties": {
                "type": "array",
                "items": {
                  "required": ["name", "value"],
                  "type": "object",
                  "properties": {
                    "isNegated": {
                      "type": "boolean",
                      "description": "Gets or sets a value indicating whether this feature is negated.\r\nA negated feature means that any existing feature with the same name\r\nshould be removed.",
                      "default": false
                    },
                    "isGlobal": {
                      "type": "boolean",
                      "description": "Gets a value indicating whether this feature globally refers to the\r\noperation context as a whole, rather than to its affected nodes.",
                      "default": false
                    },
                    "isShortLived": {
                      "type": "boolean",
                      "description": "Gets or sets a value indicating whether this instance is short-lived.\r\nWhen true, the feature is removed on the next update.",
                      "default": false
                    },
                    "setPolicy": {
                      "type": "integer",
                      "description": "Policy for adding a Feature to a set.",
                      "default": 0
                    },
                    "name": {
                      "type": "string"
                    },
                    "value": {
                      "type": ["null", "string"]
                    }
                  },
                  "description": "A feature attached to a text variant generation operation. This adds\r\nmetadata to the feature to drive its application to the operation context."
                }
              },
              "description": "The global chain features grouped by version tag. Each entry is the\r\nsnapshot of accumulated global features at the end of that version.\r\nIncludes an entry for `v0` (always empty) so that consumers do\r\nnot need to special-case the base text."
            }
          },
          "description": "Result of executing operations on a char-based chain."
        }
      ]
    }
  },
  "description": "The result of some task, which can be either a result or an error message."
}
```
