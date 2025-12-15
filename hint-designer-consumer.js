// Consumer script for the hint designer component test page

document.addEventListener("DOMContentLoaded", () => {
  const designer = document.querySelector("gve-hint-designer");

  if (!designer) {
    console.error("Hint designer component not found!");
    return;
  }

  // Set initial settings
  designer.settings = {
    hintDesignWidth: 300,
    hintDesignHeight: 100,
    debug: true,
  };

  // Set initial data with sample hints and animations
  designer.data = {
    hints: {
      "diagonal-stroke": {
        svg: `<g>
  <line x1="0" y1="0" x2="300" y2="100" stroke="{{r_fore-color}}" stroke-width="2" />
</g>`,
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        solid: false,
        animation: "#wipe-right",
      },
      box: {
        svg: `<g>
  <rect x="0" y="0" width="300" height="100" fill="none" stroke="{{r_fore-color}}" stroke-width="2" />
</g>`,
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1.1,
        scaleY: 1.1,
        rotation: 0,
        solid: false,
        animation: "#scale-in",
      },
      note: {
        svg: `<g>
  <text id="placeholder" x="150" y="50" text-anchor="middle" dominant-baseline="middle" fill="{{r_fore-color}}" font-size="24">{{note}}</text>
</g>`,
        position: "n",
        offsetX: 0,
        offsetY: -10,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        solid: false,
        animation: "#fade-in",
      },
    },
    animations: {
      "fade-in": `
return new Promise(resolve => {
  gsap.fromTo(targetEl,
    { opacity: 0 },
    { opacity: 1, duration: 2, onComplete: resolve }
  );
});
`,
      "scale-in": `
return new Promise(resolve => {
  gsap.fromTo(targetEl,
    { opacity: 0, scale: 0.5 },
    { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)', onComplete: resolve }
  );
});
`,
      "wipe-right": `
// Simple wipe-right effect using GSAP DrawSVGPlugin
return new Promise(resolve => {
  // Set initial state
  targetEl.style.opacity = '1';

  // Find all drawable elements (line, path, polyline, polygon, circle, rect, ellipse)
  const drawables = targetEl.querySelectorAll('line, path, polyline, polygon, circle, rect, ellipse');

  gsap.fromTo(drawables,
    { drawSVG: '0%' },
    {
      drawSVG: '100%',
      duration: 0.8,
      ease: 'power2.out',
      stagger: 0.1,
      onComplete: resolve
    }
  );
});
`,
    },
  };

  // Set initial hint variables
  designer.hintVariables = [
    { name: "r_fore-color", value: "red" },
    { name: "note", value: "Test Note" },
  ];

  // Select the first hint
  designer.hintId = "diagonal-stroke";

  // Listen for events
  designer.addEventListener("dataChange", (e) => {
    console.log("Data changed:", e.detail);
  });

  designer.addEventListener("hintIdChange", (e) => {
    console.log("Hint ID changed:", e.detail);
  });

  designer.addEventListener("hintVariablesChange", (e) => {
    console.log("Hint variables changed:", e.detail);
  });

  console.log("Hint designer initialized successfully!");
});
