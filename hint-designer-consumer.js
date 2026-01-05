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
      "diagonal-stroke-down": {
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
      "diagonal-stroke-up": {
        svg: `<g>
  <line x1="0" y1="100" x2="300" y2="0" stroke="{{r_fore-color}}" stroke-width="2" />
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
      "cross-stroke": {
        svg: `<g>
  <line x1="0" y1="0" x2="300" y2="100" stroke="{{r_fore-color}}" stroke-width="2" />
  <line x1="0" y1="100" x2="300" y2="0" stroke="{{r_fore-color}}" stroke-width="2" />
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
      "horizontal-stroke": {
        svg: `<g>
  <line x1="0" y1="50" x2="300" y2="50" stroke="{{r_fore-color}}" stroke-width="2" />
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
      "vertical-stroke": {
        svg: `<g>
  <line x1="150" y1="0" x2="150" y2="100" stroke="{{r_fore-color}}" stroke-width="2" />
</g>`,
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        solid: false,
        animation: "#wipe-down",
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
      "half-psi": {
        svg: `<g>
  <path
     style="fill:none;fill-opacity:1;stroke:#ff0000;stroke-width:5.04942;stroke-opacity:1"
     d="M 150,0 V 100"
     />
  <path
     style="fill:none;fill-opacity:1;stroke:#ff0000;stroke-width:4.70823;stroke-linecap:round;stroke-opacity:1"
     d="m 152.09414,34.999888 11.93025,-11.63501 a 30.931452,30.496454 0 0 0 5.68666,-7.604445 l 4.43347,-8.4004413 a 8.2686977,8.1524124 0 0 1 2.87164,-3.0995426 l 2.8897,-1.8269636 v 0"
     />
</g>`,
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1.5,
        rotation: 0,
        solid: false,
        animation: "#wipe-up",
      },
      "i-dot": {
        svg: `<g>
  <circle
     style="fill:#ff0000;fill-opacity:1;stroke:none;stroke-width:5;stroke-linecap:round;stroke-opacity:1"
     cx="150"
     cy="9"
     r="9" />
</g>`,
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        solid: false,
        animation: "#fade-in",
      },
      snake: {
        svg: `<g>
  <path
     style="fill:none;stroke:red;stroke-width:5"
     d="M 197.68715,3.0148358 156.47518,14.039149 a 12.787826,12.680467 0 0 0 -9.33488,10.493488 l -6.78784,48.324095 a 14.545787,14.42367 0 0 1 -7.3582,10.627309 l -25.56877,14.045081 v 0"
     />
</g>`,
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 2,
        rotation: 0,
        solid: false,
        animation: "#wipe-right",
      },
      "snake-callout": {
        svg: `<g>
  <path
     style="fill:none;stroke:#e40000;stroke-width:5"
     d="m 197.78287,15.856525 -41.29892,9.551979 a 12.814808,10.986948 0 0 0 -9.35458,9.092047 L 140.32721,76.3708 a 14.576478,12.49734 0 0 1 -7.37373,9.207996 l -25.62272,12.169313 v 0"
     id="path1" />
  <text
     xml:space="preserve"
     fill="red"
     x="146"
     y="12"
     id="text1">{{note}}</text>
</g>`,
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 2,
        rotation: 0,
        solid: false,
        animation: "#wipe-right",
      },
    },
    animations: {
      "fade-in": `// Fade in using GSAP
return new Promise(resolve => {
  gsap.fromTo(targetEl,
    { opacity: 0 },
    { opacity: 1, duration: 2, onComplete: resolve }
  );
});
`,
      "scale-in": `// Scale in using GSAP
return new Promise(resolve => {
  gsap.fromTo(targetEl,
    { opacity: 0, scale: 0.5 },
    { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)', onComplete: resolve }
  );
});
`,
      "wipe-left": `// Wipe from right to left using GSAP DrawSVGPlugin
return new Promise(resolve => {
  // Set initial state
  targetEl.style.opacity = '1';

  // Find all drawable elements (line, path, polyline, polygon, circle, rect, ellipse)
  const drawables = targetEl.querySelectorAll('line, path, polyline, polygon, circle, rect, ellipse');

  gsap.fromTo(drawables,
    { drawSVG: '100% 100%' },
    {
      drawSVG: '0% 100%',
      duration: 0.8,
      ease: 'power2.out',
      stagger: 0.1,
      onComplete: resolve
    }
  );
});
`,
      "wipe-right": `// Wipe from left to right using GSAP DrawSVGPlugin
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
      "wipe-up": `// Wipe from bottom to top using GSAP DrawSVGPlugin
return new Promise(resolve => {
  // Set initial state
  targetEl.style.opacity = '1';

  // Find all drawable elements (line, path, polyline, polygon, circle, rect, ellipse)
  const drawables = targetEl.querySelectorAll('line, path, polyline, polygon, circle, rect, ellipse');

  gsap.fromTo(drawables,
    { drawSVG: '100%' },
    {
      drawSVG: '0%',
      duration: 0.8,
      ease: 'power2.out',
      stagger: 0.1,
      onComplete: resolve
    }
  );
});
`,
      "wipe-down": `// Wipe from top to bottom using GSAP DrawSVGPlugin
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
  designer.hintId = "diagonal-stroke-down";

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
