## Introduction

This workspace contains a custom web component for the rendition of a complex Academic model representing the transformations of an autograph text. This peculiar document was written by the hand of the author, and contains a lot of often chaotic annotations on top of a base text. These annotations represent changes to the first draft of the text mostly by the hand of the author himself, thus providing a unique insight in the writer's creative process.

For the visualization of the digital model designed to represent this text with all its variations together with its diplomatic data, we consider 3 entities to display:

- the base text, which is the starting point and the bearer of all the annotations.
- the added text. This is text added by operations like add or replace.
- all other signs: these are the visual counterparts of editing operations on the text, which hint at them in a graphical way. For instance, a line on top of a text meaning it should be deleted. There is no limit to the variety of these signs: they might be lines, shapes, callouts, boxes, etc.

Text (whether it is base or added text) is represented character by character; each character is named _node_, because in backend, where all the transformations happen, there is a graph-like structure which recombines the same characters to form different versions of the text, just like nodes are connected by edges in a graph.

Transformations are essentially represented by a set of editing operations (like delete, replace, add, move, swap) which are executed one after another starting with a base text. The base text is known as version 0 (tag=`v0`). All the operations are executed in their order and each outputs a new version of the text, progressively numbered (`v1`, `v2`...).

Operations also inject metadata, in form of features (essentially name=value pairs), either into versions as a whole (for global features), or into specific characters of the output text (node features).

A specific set of features (rendition features, all starting with prefix `r_`) is used to represent the visual counterpart of each operation; for instance, a delete might be visually represented by a diagonal line on top of the portion of the text being deleted. In this case, multiple features of the operation (which injects them into nodes) are used to set the drawing connected to it, here a line, and specify additional parameters like its color.

Such drawings are often recurring multiple times; so, they belong to a catalog of so-called "hints", because they hint at the operation with their appearance (e.g. a line stroke on a text hints at its deletion). These hints have entrance animations, handled by GSAP (like any other animations in this project). These typically belong to a catalog of animations, too.

Both hints and animations are part of the settings for the component. The component is found under [src/core/gve-snapshot-rendition.ts](src/core/gve-snapshot-rendition.ts), and most of its logic is properly encapsulated in its own set of classes, following a systematic separation of concerns to ensure flexibility, extendibility, and easy maintenance.

## Your Task

1. fully read the conceptual documentation about the rendition component in rendition.md.
2. read the corresponding code in src/core/gve-snapshot-rendition.ts. Be sure to fully understand how it implements the design, because it's rather complex and we want to absolutely avoid introducing regression when touching it.

Once you have gained a full understanding of the code, TODO
