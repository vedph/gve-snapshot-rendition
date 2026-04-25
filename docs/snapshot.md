# Snapshot Model

The snapshot model is the backend model behind the generation of the multiple versions of a same text which are interactively displayed by the GVE snapshot rendition custom web component in this workspace.

## Backend Model

The purpose of the data model visualized by this component is to represent the **changes of a text during time**. Typically this is an autograph text by some historical author, which came to us in a manuscript, and is studied to discover the creative process which led to the final text of a literary work. The author starts with a draft, and then later annotates it in one or more successive sessions, progressively changing the text.

The model behind this component has been designed in an Academic research project codenamed GVE to adequately represent both the textual and visual details of these autograph manuscripts, in the context of a well-defined theorical and methodological philology framework.

Let us describe the essential points of this model. In raw terms, here we deal with sheets carrying signs, and we know that these signs were laid on top of it at different times, with the intention of modifying the "base" text represented by some of them. The problem is that while our signs are **objective** (excluding corner cases where they might be hardly readable), to reconstruct the missing dimension of time is up to our interpretation, which, though based on judgement and all the objective clues we see, is **subjective**. Also, we must devise the best way of representing what these signs mean: a **dynamic** text flowing through time, even if it happened to be frozen by the snapshot we got.

Now, with our sheet we have a bidimensional plane (our sheet; for our purposes we can ignore the depth) with signs on it. The third dimension here is **time**, and we have no objective way to reconstruct it: i.e. to define how the same signs on the same plane exactly changed during time. If we have 3 signs, X Y Z, on top of it, and X clearly appears to belong to the original session, we must decide about the others: maybe first Y appeared first, and later Z; or vice-versa; or both appeared at the same time (this is materially not possible as that's not print; but with "same time" we mean in the same time-defined editing session).

Of course, our interpretation is not without foundations: it relies on all the possible clues from those signs, like color, shape, position, dimension, substance used to trace it, and of course its meaning, especially when the shape is text. But in the end, it's just a subjective interpretation. The alternative would be presenting all the possible combinations of our signs on the plane; but this would be a much less useful operation, rather confusing, and only apparently rooted in a more objective approach. A massive amount of data with no guidance nor critical judgement is no different than claiming that collecting all the texts from all the manuscripts of a work is its critical edition.

Now, the case can even be more special, where we have autograph documents representing the transformation of texts which never got some kind of authoritative publication to use as a reference. They are like branches from a common root, and it would not be possible nor meaningful to decide for one. So, rather than presenting all the possible readings at the same time, which would be confusing and leave any critical judgement to readers, what we do is trying to reconstruct the **history of the making** of an artifact which was never completed. We focus on the creative _process_ behind these documents, to get a different type of information: not just a static text with our notes, but the representation of a dynamic process.

What we have in front of us is the sheet which accumulated all the signs during time; everything is there at the same time when we are looking at it. So, our task is to recover the third dimension, and provide a history of the signs on that document.

### Operations

So, until now this description might even fit to non-textual objects: for instance, a drawing, or a painting. Now, in our specific case, these signs, whether they are writing or just conventional traits (strokes, crosses, arrows, etc.), are applied to a text with the intent of changing it; whatever the reason, the time, and their author.

So, what is the meaning of those signs in our specific case? An **editing operation**. One or more signs taken together represent a single operation; for instance, a replacement might appear as a stroke sign on top of the text to replace, and writing signs above it, representing the new text.

This is why our model focuses on editing operations, which in turn have a corresponding visual hint on the sheet. In the end, all what we have in the model is two things: the **base text** we start from, and the **operations** which change it. Each operation changes the text and thus its output is another text.

Now, what if we want to say something about this text? Maybe we want to say that the operation which inserted a word is due to metrical reasons; so we could annotate this word with something like "metri gratia". The text here is immaterial: we dynamically generate it from operations. So, we do not annotate text (directly); we rather **annotate operations**. Note that I have just explained this in a practical way to be simple: all what we have is operations, so we have no way for annotating texts, because they do not exist. But the real reason is theorical and methodological: we do want the model in this way, because it is the model of a process (which happens to generate text).

Given that we focus on process, we want to keep track of each portion of text across transformations. In backend, this is done by representing text versions with a directed **graph**: each character becomes a **node**, and each text version provides a set of links, tagged for that version, which connect them into a specific sequence. So, transforming text means adding new tagged links which connect the same character nodes in different ways (and possibly adding new nodes, when new text is added via replace or insert operations).

The node model ([CharNode](../src/models.ts)) has these properties:

- `id`: a numeric ID, which is just a progressive number assigned like an autoincrement key in a database. The process starts with a base text, representing the input to the first operation; in this base text, each character gets an ID in order; so, the first character ID is 1, the second is 2, and so forth. Later, when new nodes are inserted, they just get the next available numeric ID. So IDs do not represent indexes in a string; they are just identifiers of nodes, which are variously connected to build strings by a set of links for each generated version.
- `index`: the index of the character in a specific version. This is assigned only to nodes in the context of an execution result, where each version has its own copy of the nodes required to represent it.
- `label`: the label displayed for the character. Usually this is equal to the character itself, i.e. to `data`, except when the character is not printable (e.g. a LF).
- `data`: the character.
- `sourceTag`: the tag of the version which first added this node.
- `features`: features attached to the node. This is a set of open metadata, injected by certain operations (see below).

This way, we can represent in a highly compact model all the versions of a text, using only:

- a set of character nodes.
- a set of links, variously tagged by their versions.

Note that here we deal with plain text only. Eventual styles can be represented by node features. So each character node contains its character, and an optional set of features received from operations which manipulated it. Anyway, the **LF character** is part of the text, because we need to represent the original lines of the text and how they possibly change during edits. Also, LF being a character like any other, it might be edited during transforms; for instance, an operation could delete it and thus merge two lines.

There are 8 types of operations (encoded by the `OperationType` enum in [models](../src/models.ts)):

- **replace**: replaces a span of text with a new one.
- **delete**: deletes a span of text.
- **add before**: adds a new span of text before the specified anchor character.
- **add after**: adds a new span of text after the specified anchor character.
- **move before**: moves a span of text before the specified anchor character.
- **move after**: moves a span of text after the specified anchor character.
- **swap**: swaps two spans of text.
- **annotate**: this is a do-nothing operation which affects only metadata by updating features.

Among these, the replace and add operations are the only ones which add new text.

#### Visual Counterparts

So far for text. Additionally, we might also want to represent the **visual** counterpart of each operation; for instance, if a cross represents a deletion, the visual part of that operation, hinting at a deletion, is that cross. The model can represent the visual parts in two ways, which are not mutually exclusive:

1. **graphical**: the most faithful and detailed one is a fully diplomatic representation, literally drawn on the text surface via SVG. Each operation carries some metadata about its visual part, which among other contain an SVG code fragment, always rooted at a `g` element, representing the visual hints for that operation, like the cross in the deletion example. A custom web component displays these hints on top of the photographic image of the manuscript, animating them step after step.
2. **symbolic**: a more economic and symbolic representation is rather focused on the text, and just aims to give the general sense of the transformation with the aid of visuals and animations, like the previous one. Anyway, it is just an approximation of the graphical appearance found in the real manuscript. The degree of this approximation is up to the user. This type of visualization is what is covered by the _GVE snapshot rendition_ web component.

#### Operation Model

Visual data are not the only metadata attached to operations. The metadata we have illustrated until now represent the visual hints which in the manuscript mean each editing operation; these are the **diplomatic** portion of metadata. But an operation also carries some specific metadata. The full data model of an operation is defined by `CharChainOperation` in [models.ts](../src/models.ts). Here is a short summary:

- `type`: the operation's type (delete, replace, move before, etc.). The type belongs to a closed set of operations.
- `id`: a GUID-like unique string identifier, granted to be unique at least in the context of each snapshot.
- `rank`: a probability rank. This says the level of confidence we assign to the reconstruction of this operation (1=most probable, 2=less probable, etc.)
- `groupId`: a group identifier. This is just a string which virtually groups multiple operations together, because they can be thought as logically connected. This has no practical consequence on the model, it is just a metadatum.
- `features`: an open set of so-called [features](#operation-features), providing more metadata for the operation.
- `sources`: the reconstructed sources of it: e.g. the author, a revisor, etc.
- `diplomatics`: data specific to the diplomatic domain, i.e. the visuals of the manuscript.
  - `g`: the SVG `g` root element graphically representing the visual appearance of the operation (e.g. a cross, a line, etc.)
  - `isNewTextHidden`: whether the new text nodes added by this operation (when there are any) are to be initially hidden. This happens when you want to apply some enter animation to them. Such data are not used by the GVE result view component, but are used by the graphical display component.
  - `features`: the optional generic set of features attached to the text output as a whole (e.g. type, size, etc.). Again, this is for the graphical display component.
  - `elementFeatures`: the optional features attached to specific SVG elements defined in `g`. Each element is identified by its `id` attribute, which is a key in this dictionary.
- `inputTag`, `outputTag`: the input and output version tags.
- various parameters required for the operation, according to its type. Typically these refer to their reference text, expressed with node identifiers. For instance, a delete operation has an `at` property representing the first character to be deleted, and a `run` property representing the number of characters to delete starting from `at`; a replace operation also adds a `value` property with the new text; etc.

#### Operation Features

Features are a set of name=value pair, where both are strings. These can be defined according to the purposes of the project and the texts being studied. For instance, they could provide the reason for an operation, or the type of ink or drawing tool used to draw the visuals corresponding to that operation, or anything else. This is an open set, where strings typically draw from some preset taxonomies.

Features are designed to be **injected** by the operation into the output text, either as a whole, or into specific nodes of it. This allows injecting metadata into text, and then use these metadata to either render or export it into specific formats, like XML TEI: there, a portion of deleted text will be marked as deleted, a portion of inserted text as added, a red-ink text as such, and so forth. So, the model not only has the data to represent all the versions of a text, but also all its relevant metadata.

> A special node feature, named `opid` (=operation ID), contains the ID of the operation which first introduced that node in the set.

Another usage of features is also providing a symbolic representation of the **visuals** linked to an operation in the manuscript. On one side, for the graphical visualization some feature names are reserved to provide data like:

- `x`: the X coordinate where to display the text value for the feature.
- `y`: the Y coordinate where to display the text value for the feature.
- `style`: the CSS style for the feature's value text.

On the other side, if scholars have no resources or interest for graphically representing these visuals, they can just assign a feature which at least defines the typology of its appearance: e.g. line, cross, etc. This is a purely symbolic representation, which nonetheless might be displayed in the GVE result view component. To do this, scholars will just provide a mapping between some features and the hints to represent them in the GVE result view component. This will be a higher level of customization, where instead of just using a set of hints, one for each operation type, we use a set of hints where each is linked to a specific operation instance via its features. This way, scholars will just be adding features to operation, and these will dictate how each single operation appears in the GVE result view component.

So, for symbolic visualization there are different levels of customization:

- the lowest one requires no input from users. The GVE result view component just has a set of stock operation hints (in the component's settings), and selects each according to the operation's type.
- if operations of the same type should be rendered with different hints, users can add those hints in the setttings, and map each to the its operation ID. This way, some or all the operations can get a specific hint.
- in a more abstract data entry scenario, users just add features to operations, using some taxonomies. For instance, one might have a feature named `shape` with a closed list of values representing sign shapes: `cross`, `line`, `scribble`, etc. Then, an adapter layer with a mapper will read these features in advance and create settings accordingly, so that each value is mapped to a hint.

Given that features can be important to inject metadata in text nodes or into the text itself, in addition to the operations which effectively change the text there is a special `annotation` operation which just injects features into the output (either global features, attached to the step as a whole, or node features, attached to specific nodes).

So, the types of operations are:

- delete
- replace
- add-before
- add-after
- move-before
- move-after
- swap
- annotate

> Note that among features there is a global feature conventionally named `version` which applies to the text as a whole by definition (that's why it's global), and means that the output generated represents a step staged to represent what we consider a "true" text version. In transforming a text, we generate one version per operation; their changes accumulate in the path towards what we can consider a self-consistent and historically isolated stage in the process of the making of the text. So, this is just a label, because every operation just produces a new output, a step, which is a new version. Anyway, we arbitrarily mark selected steps as _staged_ with the `version` feature. We call this a **staged feature**.

#### Feature Logic

All operation features have metadata which provide directions to the backend for their injection or removal. This is why in [models](../src/models.ts) the generic feature as a simple name=value pair is represented by `Feature`, while the operation feature is `OperationFeature` derived from it. An operation feature has these metadata:

- `name` and `value` (from `Feature`)
- `setPolicy` (from `Feature`): the policy for adding the feature to the output set of features (whether this is the text as a whole, or a single character node). This can be:
  - `multiple`: allow multiple features with the same name.
  - `single`: do not allow multiple features with the same name. If a feature with the same name is added, the old one will be removed.
  - `singleFirst`: this works as single the first time, and then as multiple all the other times, in the scope of the operation. So this means that there can be multiple features with the same name but only in the scope of the same operation; if the next operation adds a feature with the same name of this type, all the features with that name will be removed before adding the new one(s).
  - `isNegated`: this is a way for removing existing features from the output set. As features accumulate operation after operation (according to their policies and lifespan), if you want to remove a feature you just add a negated feature, which removes any feature with that name.
  - `isGlobal`: true if this feature targets the output text as a whole, rather than being injected into nodes.
  - `isShortLived`: if true, the feature will live only in the output of this operation. As soon as the next operation is executed, the feature will be automatically removed.

#### Trace Features

A special type of features are named _trace features_, used to help renderers (like the GVE result view component) track the effects of operations on text. These are fully detailed at <https://vedph.github.io/gve-doc/export/trace-features.html>. That webpage refers to TEI rendition, but trace features are injected during transformation, before rendering, whatever the rendition is. So, this makes trace features useful for our component rendition, too. Thanks to these features, at each version we can see all the nodes affected by the operation which generated it, and connect them to the previous or next versions.

Trace features are clearly distinguished from those added to any operations. All the trace features have these properties:

- their _name_ starts with `$`.
- their _value_ is composite. It always includes operation ID, input and output version, and possibly the segment ordinal number for the features requiring it. All these components are separated by space.
- their lifespan is limited: they are _not_ copied into the next version (the next step in the transformation). Whenever a new operation is executed, it does not inherit trace features from the previous result. This avoids accumulating traces belonging to previous steps, which in most cases are useless and might generate confusion. When software needs to track the effects of an operation, it relies on the output trace features injected in its output, and possibly on the input trace features injected in the previous step.

Trace features are injected into nodes by operations according to their type:

- **replace**:
  - input: the segment to be replaced.
  - output: the new segment nodes which replaced the old one.
- **delete**:
  - input: the segment to be deleted.
  - output: one/two trace features, named `$left-anchor` and `$right-anchor`, attached to the node preceding and following the place where the deleted text was located. Apart from this indirect trace, the delete has no output segment by definition. So, the deleted node, once detached from the version text, will just retain its input segment feature. Anyway, all deleted nodes have a standard `del` feature whose value is equal to that of trace features for segments. The `del` feature it's not a trace feature because it must persist forever once attached to a node: once a node is deleted, it will never come back in a sequence. In fact, together with `opid` , these feature mark the entrance and exit of a node, as versions define new sequences.
- **add before**, **add after**:
  - input: the anchor node gets an anchor feature.
  - output: the added segment nodes.
- **move before**, **move after**:
  - input: the segment to be moved; also, the anchor node gets an anchor feature.
  - output: the added segment nodes.
- **swap**:
  - input: the segments to be swapped: one in `$seg-in` and another in `$seg2-in`.
  - output: the swapped segments: one in `$seg-out` and another in `$seg2-out`.
- **annotate**:
  - input: the segment to annotate.
  - output: the segment annotated. This is equal to the input segment.

So, for instance a replacement operation will mark with all the characters it is going to replace with a specific trace feature, and all the characters replacing them with another one. The first feature will tell us that those nodes were collected for deletion; the second one that other nodes were added to their place.

There are these types of trace features:

- `$seg-in`: input _segment_ (=sequence of _contiguous_ nodes) selected by the operation. Value is `OPID TAGIN:TAGOUT N` where `OPID` is the operation ID, `TAGIN` the input version tag, `TAGOUT` the output version tag, and `N` the ordinal number of the node in the segment captured by the operation.
- `$seg-out`: output segment affected by the operation. Value is the same as `$seg-in`.
- `$seg2-in`: same as `seg-in`, for the second segment in a swap operation.
- `$seg2-out`: same as `seg-out`, for the second segment in a swap operation.
- `$anchor`: marks a single anchor node, used as a reference for add or move operations. The value is like that of segments, except for the final `N` which would not make sense for an anchor. By definition, only a single node can be used as anchor, so there is no need to specify its relative position in a segment.
- `$left-anchor`, `$right-anchor`: anchor nodes set in the node before a deleted segment, and in the node after it (when they are present). Value is `OPID TAGIN:TAGOUT IDLIST` where `IDLIST` is the list of the IDs of the deleted nodes.

An example of trace features for each operation type follows.

##### Tracing Replace

- input: the segment to be replaced.
- output: the new segment nodes which replaced the old one.

💡 Example: replace `R` with `B` in `ARZDC` (`v0`) > `ABZDC` (`v1`):

- `v0`:
  - `$seg-in` for `R`
- `v1`:
  - `opid` for `B`
  - `$seg-out` for `B`

##### Tracing Delete

- input: the segment to be deleted.
- output: left/right anchors. The delete operation has no output segment by definition; so, the deleted node, once detached from the version text, will just retain its input segment feature. Anyway, all _deleted_ nodes have a standard `del` feature, whose value is equal to that of the trace features for segments. The `del` feature is not a trace feature because it must persist forever once attached to a node: once a node is deleted, it will never come back in a sequence. In fact, together with `opid`, these feature mark the entrance and exit of a node, as versions define new sequences.

💡 Example: delete `Z` in `ARZDC` (`v0`) > `ARDC` (`v1`):

- `v0`:
  - `$seg-in` for `Z`
- `v1`:
  - `$left-anchor` for `R`
  - `$right-anchor` for `D`

##### Tracing Add Before/After

- input: the anchor node gets an anchor feature.
- output: the added segment nodes.

💡 Example: add `Y` before `Z` in `ARZDC` (`v0`) > `ARYZDC` (`v1`):

- `v0`:
  - `$anchor` for `Z`
- `v1`:
  - `$opid` for `Y`
  - `$seg-out` for `Y`

##### Tracing Move Before/After

- input: the segment to be moved; also, the anchor node gets an anchor feature.
- output: the added segment nodes.

💡 Example: move `Z` after `C` in `ARZDC` (`v0`) > `ARDCZ` (`v1`):

- `v0`:
  - `$seg-in` for `Z`
- `v1`:
  - `$anchor` for `C`

##### Tracing Swap

- input: the segments to be swapped: one in `seg-in` and another in `seg2-in`.
- output: the swapped segments: one in `seg-out` and another in `seg2-out`.

💡 Example: swap `AR` with `DC` in `ARZDC` (`v0`) > `DCZAR` (`v1`):

- `v0`:
  - `$seg-in` for `AR`
  - `$seg2-in` for `DC`
- `v1`:
  - `$seg2-out` for `AR`
  - `$seg2-out` for `DC`

##### Tracing Annotate

The annotate operation is the only operation which does not affect text; it just changes some of its features.

- input: the segment to annotate.
- output: the segment annotated. This is equal to the input segment.

💡 Example: annotate `Z` in `ARZDC` (`v0`) > unchanged (`v1`):

- `v0`:
  - `$seg-in` for `Z`
- `v1`:
  - `note` = `sample`
  - `$seg-out` for `Z`

### Model Recap

So, to recap, the snapshot model:

- focuses on a process, structured with granular operations which change a base text.
- separates the objective and subjective planes, and the textual and diplomatic planes, while connecting them.
- allows for other alternative interpretations, which can be modeled in the same way, starting from the same basic data.
- it can generate all the texts produced by each operation at once on demand. It does not store texts; it stores the operations to generate them. That's consistent with a model focused on a process, and also is economical (it's more efficient than storing each version separately with all its metadata, and then synching them in some way).
- operations have an open set of metadata, which can be fed by custom taxonomies.
- metadata can represent both textual and visual information.
- software can be used to variously present such data, even adding back the dimension of time (the one we had lost!) by means of animation.

This means that once you have filled the snapshot, you potentially have:

- all the texts ever generated by all the transformations, with their metadata.
- both textual and visual data (if you want to add them, either symbolic or graphic).
- the full reconstruction in time of the creative process frozen by our snapshot document.

## Result Model

The backend is in charge of running a sequence of operations on a text and return a result which contains the details of all the steps generated, with their metadata and corresponding operations.

This model is `CharChainResult` in [models](../src/models.ts), sampled with this template-like JSON:

```json
{
  // either error message, or the result
  "error": null,
  "result": {
    // execution steps
    "steps": [
      // sample step
      {
        // the operation which generated the step
        "operation": {
          "dsl": "",
          "toAsIndex": false,
          "to": 0,
          "toRun": 0,
          "inputTag": "",
          "outputTag": "",
          "atAsIndex": false,
          "at": 0,
          "run": 0,
          "value": "",
          "noTraceFeatures": false,
          "type": 1,
          "id": "",
          "rank": "",
          "groupId": "",
          "features": [
            {
              "isNegated": false,
              "isGlobal": false,
              "isShortLived": false,
              "setPolicy": 0,
              "name": "",
              "value": null
            }
          ],
          "sources": [
            {
              "id": "",
              "type": null,
              "rank": 0,
              "note": null
            }
          ]
        },
        // input and output tags
        "inputTag": "",
        "outputTag": "",
        // result text
        "result": "",
        // IDs of nodes affected by operation
        "refNodeIds": [""]
      }
    ],
    // chain textual dump
    "chainDump": null,
    // chain tags in order
    "chainTags": [""],
    // chain text nodes
    "nodes": [
      {
        "id": 0,
        "index": 0,
        "label": "",
        "data": "",
        "sourceTag": "",
        // node features keyed by version tag
        "features": {
          "version-tag": [
            {
              "setPolicy": 0,
              "name": "",
              "value": ""
            }
          ]
        }
      }
    ],
    // IDs of nodes in the sequence building the version's text,
    // keyed by version tag
    "versionNodeIds": {
      "version-tag": [1, 2, 3]
    },
    // global features, keyed by version tag
    "globalFeatures": {
      "version-tag": [
        {
          "isNegated": false,
          "isGlobal": false,
          "isShortLived": false,
          "setPolicy": 0,
          "name": "",
          "value": ""
        }
      ]
    }
  }
}
```

>The model before version 1.0.0 was:

```json
{
  "steps": [
    {
      "operation": { "id": "...", "type": "Delete", ... },
      "inputTag": "v0",
      "outputTag": "v1",
      "result": "BC",
      "refNodeIds": [1]
    }
  ],
  "chainDump": "...",
  "chainTags": ["v0", "v1", "v2"],
  "nodes": [
    {
      "id": 1, "label": "A", "data": "A", "sourceTag": "v0",
      "features": {
        "v1": [{ "name": "del", "value": "op1 v0:v1 1", ... }]
      }
    },
    { "id": 2, "label": "B", "data": "B", "sourceTag": "v0", "features": null }
  ],
  "versionNodeIds": {
    "v0": [1, 2, 3],
    "v1": [2, 3]
  },
  "globalFeatures": {
    "v0": [],
    "v1": [{ "name": "log", "value": "deleted A", "isGlobal": true }]
  }
}
```

You can compare old vs. new API response data in `data/default.data.old.json` (old) vs. `data/default.data.json` (new).
