/**
 * TypeScript declaration for feather-icons module.
 */
declare module "feather-icons" {
  export function replace(options?: { class?: string; "stroke-width"?: number }): void;
  export function toSvg(name: string, options?: Record<string, any>): string;
  export const icons: Record<string, { name: string; contents: string; tags: string[]; attrs: Record<string, string> }>;
}
