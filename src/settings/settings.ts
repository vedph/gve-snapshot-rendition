import { OperationHint } from "./hint-models";

/**
 * Settings for a custom button added to the toolbar.
 */
export interface CustomButtonSettings {
  /** Unique ID for the custom button */
  id: string;

  /** Icon to use for the button (can be emoji, Unicode symbol, or HTML) */
  icon: string;

  /** Text label for the button */
  label: string;

  /** Tooltip shown on hover */
  tooltip: string;

  /** Callback invoked when button is pressed */
  callback: (id: string, svg: SVGElement) => void;
}

/**
 * Settings for the GVE Snapshot Rendition component.
 */
export interface GveRenditionSettings {
  // ==================== Display Settings ====================

  /** Default font size in pixels */
  fontSize: number;

  /** Default font family */
  fontFamily: string;

  /** Default foreground color */
  foreColor: string;

  /** Default background color */
  backColor: string;

  /** Default italic state */
  italic: boolean;

  /** Default bold state */
  bold: boolean;

  /** Default underline thickness in pixels (undefined = no underline) */
  underline?: number;

  /** Default overline thickness in pixels (undefined = no overline) */
  overline?: number;

  /** Default strikethrough thickness in pixels (undefined = no strike) */
  strike?: number;

  // ==================== Spacing Settings ====================

  /** Fraction of reference character width to use for space width (default: 0.33) */
  spaceWidthFraction: number;

  /** Spacing between each character in pixels */
  charSpacing: number;

  /** Line height multiplier (1.5 = 150% of font size) */
  lineHeight: number;

  /** Additional spacing between lines in pixels */
  lineSpacing: number;

  /** Top margin of the text rendition area in pixels */
  marginTop: number;

  /** Left margin of the text rendition area in pixels */
  marginLeft: number;

  /** Right margin of the text rendition area in pixels */
  marginRight: number;

  /** Bottom margin of the text rendition area in pixels */
  marginBottom: number;

  // ==================== Viewport Settings ====================

  /** Initial zoom factor */
  initialZoom: number;

  /** Minimum zoom factor */
  minZoom: number;

  /** Maximum zoom factor */
  maxZoom: number;

  /** Zoom step for zoom in/out */
  zoomStep: number;

  // ==================== Behavior Settings ====================

  /** Milliseconds between each frame in slideshow mode */
  slideshowInterval: number;

  /** Whether to loop the slideshow when it ends */
  slideshowLoop: boolean;

  /** Milliseconds delay between slideshow restarts (when looping) */
  slideshowDelay: number;

  /** Enable detailed logging for diagnostic purposes */
  debug?: boolean;

  // ==================== Custom Buttons ====================

  /** Array of custom buttons to add to the toolbar */
  customButtons?: CustomButtonSettings[];

  /** Array of button IDs (including custom buttons) to disable */
  disabledButtonIds?: string[];

  // ==================== Animation ====================

  /** Catalog of animation JS code fragments, keyed by ID */
  animations: Record<string, string>;

  /** ID of animation to use for each character (from animations catalog) */
  charAnimationId?: string;

  /** Duration in milliseconds for spreading animation */
  spreadTime: number;

  // ==================== Hints ====================

  /** Dictionary of hints, keyed by hint ID */
  hints: Record<string, OperationHint>;

  /** Margin around each rendered hint in pixels */
  hintMargin: number;

  /** Design-time width used when creating hints */
  hintDesignWidth: number;

  /** Design-time height used when creating hints */
  hintDesignHeight: number;

  /** Show the handle element from SVG hint (for diagnostic purposes) */
  showHintHandles: boolean;

  // ==================== Hilites ====================

  /** Padding to increase hilite rectangle size in pixels */
  hilitePadding: number;

  /** Duration in milliseconds for hilite fade in/out animation */
  hiliteFadeTime: number;
}

/**
 * Default settings for the component.
 */
export const DEFAULT_SETTINGS: GveRenditionSettings = {
  // Display settings
  fontSize: 24,
  fontFamily: "monospace",
  foreColor: "#000000",
  backColor: "transparent",
  italic: false,
  bold: false,
  underline: undefined,
  overline: undefined,
  strike: undefined,

  // Spacing settings
  spaceWidthFraction: 0.33,
  charSpacing: 2,
  lineHeight: 1.5,
  lineSpacing: 4,
  marginTop: 20,
  marginLeft: 20,
  marginRight: 20,
  marginBottom: 20,

  // Viewport settings
  initialZoom: 1,
  minZoom: 0.5,
  maxZoom: 3,
  zoomStep: 0.1,

  // Behavior settings
  slideshowInterval: 1000,
  slideshowLoop: false,
  slideshowDelay: 3000,
  debug: false,

  // Custom buttons
  customButtons: [],
  disabledButtonIds: [],

  // Animation
  animations: {
    "text-fade-in": `
      return new Promise(resolve => {
        gsap.fromTo(targetEl,
          { opacity: 0 },
          { opacity: 1, duration: 0.05, onComplete: resolve }
        );
      });
    `,
    "fade-in": `
      return new Promise(resolve => {
        gsap.fromTo(targetEl,
          { opacity: 0 },
          { opacity: 1, duration: 0.3, onComplete: resolve }
        );
      });
    `,
    "wipe-right": `
      return new Promise(resolve => {
        gsap.fromTo(targetEl,
          { opacity: 0, x: -10 },
          { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out', onComplete: resolve }
        );
      });
    `,
    "scale-in": `
      return new Promise(resolve => {
        gsap.fromTo(targetEl,
          { opacity: 0, scale: 0.5 },
          { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.7)', onComplete: resolve }
        );
      });
    `,
  },
  charAnimationId: undefined, // No character animation by default
  spreadTime: 1500,

  // Hints - empty by default, to be filled by consumer code
  hints: {},
  hintMargin: 0,
  hintDesignWidth: 100,
  hintDesignHeight: 100,
  showHintHandles: false,

  // Hilites
  hilitePadding: 2,
  hiliteFadeTime: 300,
};
