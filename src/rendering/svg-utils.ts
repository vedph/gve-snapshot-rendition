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
 */
export function getTextWidth(
  text: string,
  fontFamily: string,
  fontSize: number,
  bold: boolean = false,
  italic: boolean = false
): number {
  // Create temporary SVG and text element
  const svg = createSVGElement("svg");
  svg.style.visibility = "hidden";
  svg.style.position = "absolute";
  document.body.appendChild(svg);

  const textEl = createTextElement(text);
  applyTextStyle(textEl, { fontFamily, fontSize, bold, italic });
  svg.appendChild(textEl);

  const width = textEl.getBBox().width;

  document.body.removeChild(svg);

  return width;
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
