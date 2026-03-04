/**
 * TypeScript declaration for feather-icons module.
 */
declare module "feather-icons" {
  export interface FeatherIcon {
    name: string;
    contents: string;
    tags: string[];
    attrs: Record<string, string>;
    /** Renders this icon as an SVG string with optional attribute overrides. */
    toSvg(options?: Record<string, any>): string;
  }

  export function replace(options?: { class?: string; "stroke-width"?: number }): void;
  /** @deprecated Use feather.icons[name].toSvg() instead. */
  export function toSvg(name: string, options?: Record<string, any>): string;
  export const icons: Record<string, FeatherIcon>;
}
