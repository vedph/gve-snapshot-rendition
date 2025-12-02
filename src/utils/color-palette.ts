/**
 * Generates pastel colors for version tags with maximum visual distinction.
 * Uses HSL color space to ensure consistent saturation and lightness
 * while varying hue to maximize differentiation.
 */

/**
 * Generate a deterministic pastel color for a version tag.
 * The same version tag will always produce the same color.
 *
 * @param versionTag - The version tag (e.g., "v0", "v1", "v2")
 * @returns A CSS color string in HSL format
 */
export function getVersionColor(versionTag: string): string {
  // Extract version number from tag like "v0", "v1", etc.
  const match = versionTag.match(/v(\d+)/);
  const versionNum = match ? parseInt(match[1], 10) : 0;

  return getColorByIndex(versionNum);
}

/**
 * Generate a pastel color by index using golden ratio distribution.
 * This ensures maximum visual distinction between colors.
 *
 * @param index - The index (0-based)
 * @returns A CSS color string in HSL format
 */
export function getColorByIndex(index: number): string {
  // Use golden ratio for optimal color distribution
  const goldenRatioConjugate = 0.618033988749895;

  // Start with a base hue and distribute using golden ratio
  const hue = (index * goldenRatioConjugate * 360) % 360;

  // Use consistent saturation and lightness for pastel effect
  // Lower saturation and higher lightness create soft, distinguishable colors
  const saturation = 45; // 45% for subtle, non-aggressive colors
  const lightness = 85; // 85% for light, pastel appearance

  return `hsl(${Math.round(hue)}, ${saturation}%, ${lightness}%)`;
}

/**
 * Generate a color palette for all version tags.
 *
 * @param versionTags - Array of version tags
 * @returns Map of version tag to color string
 */
export function generateVersionPalette(
  versionTags: string[]
): Map<string, string> {
  const palette = new Map<string, string>();

  for (const tag of versionTags) {
    palette.set(tag, getVersionColor(tag));
  }

  return palette;
}

/**
 * Get a darker variant of a color for hover/active states.
 *
 * @param hslColor - HSL color string
 * @param lightnessReduction - How much to reduce lightness (default: 10%)
 * @returns Darker HSL color string
 */
export function getDarkerVariant(
  hslColor: string,
  lightnessReduction: number = 10
): string {
  const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return hslColor;

  const hue = parseInt(match[1], 10);
  const saturation = parseInt(match[2], 10);
  const lightness = Math.max(0, parseInt(match[3], 10) - lightnessReduction);

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
