/**
 * SVG utility functions for creating and manipulating SVG elements.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Create an SVG element with the given tag name.
 */
export function createSVGElement<K extends keyof SVGElementTagNameMap>(
  tagName: K
): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tagName);
}

/**
 * Set multiple attributes on an SVG element.
 */
export function setAttributes(
  element: SVGElement,
  attributes: Record<string, string | number>
): void {
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }
}

/**
 * Create an SVG text element with content and attributes.
 */
export function createTextElement(
  content: string,
  attributes: Record<string, string | number> = {}
): SVGTextElement {
  const text = createSVGElement("text");
  text.textContent = content;
  setAttributes(text, attributes);
  return text;
}

/**
 * Create an SVG group element.
 */
export function createGroup(id?: string, classes?: string[]): SVGGElement {
  const g = createSVGElement("g");
  if (id) g.setAttribute("id", id);
  if (classes && classes.length > 0) {
    g.setAttribute("class", classes.join(" "));
  }
  return g;
}

/**
 * Create an SVG rect element.
 */
export function createRect(
  x: number,
  y: number,
  width: number,
  height: number,
  attributes: Record<string, string | number> = {}
): SVGRectElement {
  const rect = createSVGElement("rect");
  setAttributes(rect, {
    x,
    y,
    width,
    height,
    ...attributes,
  });
  return rect;
}

/**
 * Create an SVG line element.
 */
export function createLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  attributes: Record<string, string | number> = {}
): SVGLineElement {
  const line = createSVGElement("line");
  setAttributes(line, {
    x1,
    y1,
    x2,
    y2,
    ...attributes,
  });
  return line;
}

/**
 * Apply text styling attributes based on settings.
 */
export function applyTextStyle(
  element: SVGTextElement,
  style: {
    fontFamily?: string;
    fontSize?: number;
    foreColor?: string;
    backColor?: string;
    italic?: boolean;
    bold?: boolean;
    underline?: number;
    overline?: number;
    strike?: number;
    rotate?: number;
  }
): void {
  const attrs: Record<string, string | number> = {};

  if (style.fontFamily) attrs["font-family"] = style.fontFamily;
  if (style.fontSize) attrs["font-size"] = `${style.fontSize}px`;
  if (style.foreColor) attrs["fill"] = style.foreColor;
  if (style.backColor && style.backColor !== "transparent") {
    attrs["paint-order"] = "stroke fill";
    attrs["stroke"] = style.backColor;
    attrs["stroke-width"] = "3";
  }
  if (style.italic) attrs["font-style"] = "italic";
  if (style.bold) attrs["font-weight"] = "bold";
  if (style.rotate) attrs["transform"] = `rotate(${style.rotate})`;

  // Text decorations
  const decorations: string[] = [];
  if (style.underline) decorations.push("underline");
  if (style.overline) decorations.push("overline");
  if (style.strike) decorations.push("line-through");

  if (decorations.length > 0) {
    attrs["text-decoration"] = decorations.join(" ");
  }

  setAttributes(element, attrs);
}

/**
 * Apply line decoration to text (for custom thickness support).
 * This creates actual line elements for better control over thickness.
 */
export function applyLineDecoration(
  parentGroup: SVGGElement,
  textElement: SVGTextElement,
  type: "underline" | "overline" | "strike",
  thickness: number,
  color: string,
  style: string = "solid"
): SVGLineElement {
  const bbox = textElement.getBBox();
  let y: number;

  switch (type) {
    case "underline":
      y = bbox.y + bbox.height + 2;
      break;
    case "overline":
      y = bbox.y - 2;
      break;
    case "strike":
      y = bbox.y + bbox.height / 2;
      break;
  }

  const line = createLine(bbox.x, y, bbox.x + bbox.width, y, {
    stroke: color,
    "stroke-width": thickness,
    "stroke-dasharray":
      style === "dashed" ? "4,2" : style === "dotted" ? "1,2" : "none",
  });

  parentGroup.appendChild(line);
  return line;
}

/**
 * Parse SVG from string and return the root element.
 * Assumes the SVG content has a root <g> element.
 */
export function parseSVGContent(svgString: string): SVGGElement | null {
  // Create a temporary SVG element in the current document
  // This ensures elements are created in the proper SVG namespace
  const tempSvg = document.createElementNS(SVG_NS, "svg");

  // Set the inner HTML of the temp SVG
  tempSvg.innerHTML = svgString;

  // Find the root g element
  const gElement = tempSvg.querySelector("g");
  if (!gElement) {
    console.error("SVG content must have a root <g> element");
    return null;
  }

  // Remove from temp container and return
  // Element is already in the correct namespace since it was created via innerHTML on an SVG element
  gElement.remove();
  return gElement as SVGGElement;
}

/**
 * Clone an SVG element and all its children.
 */
export function cloneSVGElement<T extends SVGElement>(element: T): T {
  return element.cloneNode(true) as T;
}

/**
 * Get the bounding box of an SVG element in a safe way.
 * Returns a default rectangle if getBBox() fails.
 *
 * IMPORTANT: This returns the bbox in LOCAL coordinates (without transforms).
 * Use getTransformedBBox() if you need the actual screen/SVG coordinates.
 */
export function getSafeBBox(element: SVGElement): DOMRect {
  try {
    return (element as any).getBBox();
  } catch (error) {
    console.warn("getBBox() failed, returning default rect", error);
    return new DOMRect(0, 0, 0, 0);
  }
}

/**
 * Get the bounding box of an SVG element WITH transforms applied.
 * This returns the actual position in the SVG coordinate system.
 *
 * This is crucial for visibility checks because getBBox() returns local coords
 * which don't reflect the element's actual position after transforms.
 *
 * @param element - The SVG element
 * @returns The bounding box in SVG coordinate space (with transforms applied)
 */
export function getTransformedBBox(element: SVGElement): DOMRect {
  try {
    // Get the bounding box in local coordinates
    const localBBox = (element as any).getBBox();

    // Get the transformation matrix from the element's coordinate system to the SVG root
    const svg = element.ownerSVGElement;
    if (!svg) {
      return localBBox;
    }

    // getCTM() is only available on SVGGraphicsElement (which includes g, text, etc.)
    // We need transformation to the SVG coordinate system
    const ctm = (element as SVGGraphicsElement).getCTM();
    if (!ctm) {
      return localBBox;
    }

    // Transform the bounding box corners using the CTM
    // We need to transform all 4 corners and then find the bounding box of the result
    // because rotation/skew can change which corners are the min/max
    const topLeft = svg.createSVGPoint();
    topLeft.x = localBBox.x;
    topLeft.y = localBBox.y;
    const transformedTopLeft = topLeft.matrixTransform(ctm);

    const topRight = svg.createSVGPoint();
    topRight.x = localBBox.x + localBBox.width;
    topRight.y = localBBox.y;
    const transformedTopRight = topRight.matrixTransform(ctm);

    const bottomLeft = svg.createSVGPoint();
    bottomLeft.x = localBBox.x;
    bottomLeft.y = localBBox.y + localBBox.height;
    const transformedBottomLeft = bottomLeft.matrixTransform(ctm);

    const bottomRight = svg.createSVGPoint();
    bottomRight.x = localBBox.x + localBBox.width;
    bottomRight.y = localBBox.y + localBBox.height;
    const transformedBottomRight = bottomRight.matrixTransform(ctm);

    // Find the bounding box of the transformed corners
    const minX = Math.min(
      transformedTopLeft.x,
      transformedTopRight.x,
      transformedBottomLeft.x,
      transformedBottomRight.x
    );
    const maxX = Math.max(
      transformedTopLeft.x,
      transformedTopRight.x,
      transformedBottomLeft.x,
      transformedBottomRight.x
    );
    const minY = Math.min(
      transformedTopLeft.y,
      transformedTopRight.y,
      transformedBottomLeft.y,
      transformedBottomRight.y
    );
    const maxY = Math.max(
      transformedTopLeft.y,
      transformedTopRight.y,
      transformedBottomLeft.y,
      transformedBottomRight.y
    );

    return new DOMRect(minX, minY, maxX - minX, maxY - minY);
  } catch (error) {
    console.warn("getTransformedBBox() failed, returning default rect", error);
    return new DOMRect(0, 0, 0, 0);
  }
}

/**
 * Apply a transform to an SVG element.
 */
export function applyTransform(
  element: SVGElement,
  transform: {
    translateX?: number;
    translateY?: number;
    scaleX?: number;
    scaleY?: number;
    rotate?: number;
    originX?: number;
    originY?: number;
  }
): void {
  const transforms: string[] = [];

  if (
    transform.translateX !== undefined ||
    transform.translateY !== undefined
  ) {
    const tx = transform.translateX || 0;
    const ty = transform.translateY || 0;
    transforms.push(`translate(${tx}, ${ty})`);
  }

  if (transform.rotate !== undefined && transform.rotate !== 0) {
    const ox = transform.originX || 0;
    const oy = transform.originY || 0;
    transforms.push(`rotate(${transform.rotate}, ${ox}, ${oy})`);
  }

  if (transform.scaleX !== undefined || transform.scaleY !== undefined) {
    const sx = transform.scaleX || 1;
    const sy = transform.scaleY || 1;
    transforms.push(`scale(${sx}, ${sy})`);
  }

  if (transforms.length > 0) {
    element.setAttribute("transform", transforms.join(" "));
  }
}

/**
 * Calculate the center point of a bounding rectangle.
 */
export function getRectCenter(
  rect: DOMRect | { x: number; y: number; width: number; height: number }
): {
  x: number;
  y: number;
} {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

/**
 * Get computed text width for a given text and style.
 * Creates a temporary SVG element to measure.
 *
 * IMPORTANT: The measurementRoot parameter is critical for correct measurements
 * when the component runs inside Angular or other frameworks that apply global
 * CSS styles (like font-family) to document.body. Without it, measurements
 * happen in document.body where inherited styles may affect font metrics,
 * but actual rendering happens inside Shadow DOM where styles are isolated.
 * This mismatch causes text positions and hint placements to be incorrect.
 *
 * When measurementRoot is provided (typically the component's root SVG element),
 * measurements happen in the same CSS context as the actual rendering,
 * ensuring consistent font metrics.
 *
 * @param text - The text to measure
 * @param fontFamily - Font family to use
 * @param fontSize - Font size in pixels
 * @param bold - Whether text is bold
 * @param italic - Whether text is italic
 * @param measurementRoot - Optional SVG element to use as measurement context.
 *                          If provided, a temporary text element is appended here
 *                          for measurement (same CSS context as rendering).
 *                          If not provided, falls back to document.body (legacy behavior).
 */
export function getTextWidth(
  text: string,
  fontFamily: string,
  fontSize: number,
  bold: boolean = false,
  italic: boolean = false,
  measurementRoot?: SVGElement
): number {
  let svg: SVGSVGElement;
  let needsCleanup = false;

  if (measurementRoot) {
    // Use the provided measurement root (same CSS context as rendering)
    // Create a temporary SVG inside the measurement root's owner SVG
    const ownerSvg = measurementRoot.ownerSVGElement || measurementRoot;
    svg = ownerSvg as SVGSVGElement;
  } else {
    // Fallback: create temporary SVG in document.body (legacy behavior)
    // WARNING: This may produce incorrect measurements when global CSS
    // affects font rendering differently than inside Shadow DOM
    svg = createSVGElement("svg");
    svg.style.visibility = "hidden";
    svg.style.position = "absolute";
    document.body.appendChild(svg);
    needsCleanup = true;
  }

  const textEl = createTextElement(text);
  applyTextStyle(textEl, { fontFamily, fontSize, bold, italic });

  // Make the measurement element invisible but still measurable
  textEl.style.visibility = "hidden";
  textEl.setAttribute("x", "-9999");
  textEl.setAttribute("y", "-9999");

  svg.appendChild(textEl);

  const width = textEl.getBBox().width;

  // Clean up the temporary text element
  svg.removeChild(textEl);

  // Only remove the SVG if we created it (fallback case)
  if (needsCleanup) {
    document.body.removeChild(svg);
  }

  return width;
}

/**
 * Reference character used to compute the "average character width/height"
 * that the "tw"/"th" offset units resolve against (see getAverageCharWidth).
 * This is the same reference character used to size the space character.
 */
export const REFERENCE_CHAR = "m";

/**
 * Get the average character width for the given font settings, using
 * REFERENCE_CHAR ("m") as the reference glyph. This is the basis for the
 * "tw" (text width) unit used by r_char-offsets, r_t-offset-x/y, and
 * r_h-offset-x/y — NOT the bounding box of a whole reference text span.
 *
 * @param measurementRoot - Optional SVG element to use as measurement context
 *                          (see getTextWidth for why this matters).
 */
export function getAverageCharWidth(
  fontFamily: string,
  fontSize: number,
  bold: boolean = false,
  italic: boolean = false,
  measurementRoot?: SVGElement
): number {
  return getTextWidth(
    REFERENCE_CHAR,
    fontFamily,
    fontSize,
    bold,
    italic,
    measurementRoot
  );
}

/**
 * Move an element to the back (lowest z-index in SVG).
 */
export function moveToBack(element: SVGElement): void {
  const parent = element.parentElement;
  if (parent && parent.firstChild) {
    parent.insertBefore(element, parent.firstChild);
  }
}

/**
 * Move an element to the front (highest z-index in SVG).
 */
export function moveToFront(element: SVGElement): void {
  const parent = element.parentElement;
  if (parent) {
    parent.appendChild(element);
  }
}
