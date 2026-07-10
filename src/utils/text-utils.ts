/**
 * Text processing utilities.
 */

/**
 * Escape HTML special characters to prevent injection.
 */
export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Parse an offset value which can be either:
 * - A number (e.g., 10)
 * - A suffixed number with "th" (text height) or "tw" (text width)
 *
 * @param value - The offset value (number or string)
 * @param textHeight - The height of reference text bounds
 * @param textWidth - The width of reference text bounds
 * @returns The computed offset in pixels
 */
export function parseOffset(
  value: number | string,
  textHeight: number,
  textWidth: number
): number {
  if (typeof value === "number") {
    return value;
  }

  // Parse suffixed values like "0.5th" or "0.5tw"
  const match = value.match(/^([-\d.]+)(th|tw)$/);
  if (!match) {
    // Try to parse as number
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }

  const multiplier = parseFloat(match[1]);
  const suffix = match[2];

  if (suffix === "th") {
    return multiplier * textHeight;
  } else if (suffix === "tw") {
    return multiplier * textWidth;
  }

  return 0;
}

/**
 * Replace placeholders in SVG content.
 * Placeholders are in the format {{featureName}}, or a fallback chain
 * {{name ?? other ?? ...}}: names are tried left to right and the first one
 * having a variable wins. There is no limit to the number of fallbacks.
 * For instance {{r_fore-color ?? r_color}} resolves to the value of
 * r_fore-color when defined, otherwise to the value of r_color.
 *
 * @param svgContent - The SVG content with placeholders
 * @param variables - Map of variable names to values
 * @returns SVG content with placeholders replaced
 */
export function resolvePlaceholders(
  svgContent: string,
  variables: Map<string, string>
): string {
  // Match {{name}} or {{name ?? name ?? ...}} where each name can contain
  // letters, numbers, hyphens, and underscores
  return svgContent.replace(
    /\{\{\s*([\w\-]+(?:\s*\?\?\s*[\w\-]+)*)\s*\}\}/g,
    (match, chain: string) => {
      const names = chain.split("??").map((n) => n.trim());
      for (const name of names) {
        const value = variables.get(name);
        // An empty string is a defined value; only a missing variable
        // falls through to the next name in the chain
        if (value !== undefined) {
          return value;
        }
      }
      return match; // Keep placeholder if no name in the chain resolves
    }
  );
}

/**
 * Generate a unique ID by combining prefix and suffix.
 */
export function generateId(prefix: string, suffix: string | number): string {
  return `${prefix}_${suffix}`;
}

/**
 * Truncate a string to a maximum length, adding ellipsis if needed.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}
