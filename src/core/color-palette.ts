/**
 * Generate a pastel color palette for version tags with maximum visual distinction.
 * Uses HSL color space to generate evenly distributed, light, pastel colors.
 */
export class ColorPalette {
  private colors: Map<string, string> = new Map();

  /**
   * Generate a pastel color for a given version tag.
   * The color generation is idempotent - same version tag always generates the same color.
   * @param versionTag - Version tag (e.g., "v0", "v1", "v2")
   * @returns Pastel color as hex string (e.g., "#FFE4E1")
   */
  getColor(versionTag: string): string {
    if (this.colors.has(versionTag)) {
      return this.colors.get(versionTag)!;
    }

    // Extract version number from tag (e.g., "v5" -> 5)
    const versionNumber = this.extractVersionNumber(versionTag);

    // Generate color using golden ratio for maximum distribution
    const color = this.generatePastelColor(versionNumber);
    this.colors.set(versionTag, color);

    return color;
  }

  /**
   * Extract version number from version tag.
   * @param versionTag - Version tag like "v0", "v1", etc.
   * @returns Version number
   */
  private extractVersionNumber(versionTag: string): number {
    const match = versionTag.match(/^v(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Generate a pastel color using HSL color space with golden ratio distribution.
   * This ensures maximum visual distinction between colors.
   * @param index - Version index number
   * @returns Hex color string
   */
  private generatePastelColor(index: number): string {
    // Golden ratio for optimal distribution
    const goldenRatio = 0.618033988749895;

    // Calculate hue using golden ratio to maximize visual distinction
    // Multiply by 360 to get degrees, modulo 360 to wrap around
    const hue = (index * goldenRatio * 360) % 360;

    // Pastel colors: high lightness (75-85%), low saturation (40-60%)
    const saturation = 45 + (index % 3) * 5; // Varies between 45-55%
    const lightness = 78 + (index % 4) * 2; // Varies between 78-84%

    return this.hslToHex(hue, saturation, lightness);
  }

  /**
   * Convert HSL to hex color.
   * @param h - Hue (0-360)
   * @param s - Saturation (0-100)
   * @param l - Lightness (0-100)
   * @returns Hex color string
   */
  private hslToHex(h: number, s: number, l: number): string {
    // Convert to 0-1 range
    const sat = s / 100;
    const light = l / 100;

    const c = (1 - Math.abs(2 * light - 1)) * sat;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = light - c / 2;

    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) {
      r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
      r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
      r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
      r = x; g = 0; b = c;
    } else if (h >= 300 && h < 360) {
      r = c; g = 0; b = x;
    }

    // Convert to 0-255 range and create hex
    const toHex = (val: number) => {
      const hex = Math.round((val + m) * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * Clear all cached colors.
   */
  clear(): void {
    this.colors.clear();
  }
}
