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
        svg: '<g>\n  <line x1="0" y1="0" x2="300" y2="100" stroke="{{r_fore-color}}" stroke-width="5" />\n</g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        animation: "#wipe-right",
      },
      "diagonal-stroke-up": {
        svg: '<g>\n  <line x1="0" y1="100" x2="300" y2="0" stroke="{{r_fore-color}}" stroke-width="5" />\n</g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        animation: "#wipe-right",
      },
      "cross-stroke": {
        svg: '<g>\n  <line x1="0" y1="0" x2="300" y2="100" stroke="{{r_fore-color}}" stroke-width="5" />\n  <line x1="0" y1="100" x2="300" y2="0" stroke="{{r_fore-color}}" stroke-width="5" />\n</g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        animation: "#wipe-right",
      },
      "horizontal-stroke": {
        svg: '<g>\n  <rect x="0" y="0" width="300" height="100" fill="none" stroke="none"/>\n  <line x1="0" y1="50" x2="300" y2="50" stroke="{{r_fore-color}}" stroke-width="5" />\n</g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        animation: "#wipe-right",
      },
      "vertical-stroke": {
        svg: '<g>\n  <rect x="0" y="0" width="300" height="100" fill="none" stroke="none"/>\n  <line x1="150" y1="0" x2="150" y2="100" stroke="{{r_fore-color}}" stroke-width="5" />\n</g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        animation: "#wipe-down",
      },
      hamburger: {
        svg: '<g>\n  <line x1="0" y1="0" x2="300" y2="0" stroke="{{r_fore-color}}" stroke-width="5" />\n  <line x1="0" y1="50" x2="300" y2="50" stroke="{{r_fore-color}}" stroke-width="5" />\n  <line x1="0" y1="100" x2="300" y2="100" stroke="{{r_fore-color}}" stroke-width="5" />\n</g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        animation: "#wipe-right",
      },
      hotdog: {
        svg: '<g>\n  <line x1="50" y1="0" x2="300" y2="0" stroke="{{r_fore-color}}" stroke-width="5" />\n  <line x1="0" y1="50" x2="250" y2="50" stroke="{{r_fore-color}}" stroke-width="5" />\n  <line x1="50" y1="100" x2="300" y2="100" stroke="{{r_fore-color}}" stroke-width="5" />\n</g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        animation: "#wipe-right",
      },
      pie: {
        svg: '<g><line x1="0" y1="80" x2="300" y2="80" stroke="{{r_fore-color}}" stroke-width="5"/><line x1="50" y1="96" x2="250" y2="96" stroke="{{r_fore-color}}" stroke-width="5"/></g>',
        position: "o",
        offsetX: 0,
        offsetY: 20,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        animation: "#wipe-right",
      },
      "slash-double": {
        svg: '<g><line x1="200" y1="5" x2="140" y2="95" stroke="{{r_fore-color}}" stroke-width="5" /><line x1="165" y1="5" x2="105" y2="95" stroke="{{r_fore-color}}" stroke-width="5" /></g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        animation: "#wipe-right",
      },
      "backslash-double": {
        svg: '<g><line x1="105" y1="5" x2="165" y2="95" stroke="{{r_fore-color}}" stroke-width="5" /><line x1="140" y1="5" x2="200" y2="95" stroke="{{r_fore-color}}" stroke-width="5" /></g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        animation: "#wipe-right",
      },
      "scribble-wavy": {
        svg: '<g><path d="m 101.71765,72.575516 c 0,-31.957318 0,-63.9146364 10.43942,-68.4799676 10.43943,-4.5653312 19.57393,9.1306626 19.57393,31.9573186 0,22.826656 -9.1345,45.653312 -1.30493,54.783974 7.82957,9.130663 24.79364,9.130663 30.01336,-9.130662 5.21971,-18.261325 0,-50.218643 10.43943,-52.501309 10.43942,-2.282666 16.96407,6.847997 15.65914,22.826656 -1.30493,15.978659 -7.82957,27.391987 -2.60986,29.674653 5.21972,2.282665 11.74436,-6.847997 14.35421,-41.087981" fill="none" stroke="{{r_fore-color}}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" /></g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1.1,
        scaleY: 1.1,
        rotation: 0,
        animation: "#wipe-right",
      },
      box: {
        svg: '<g>\n  <rect x="0" y="0" width="300" height="100" fill="none" stroke="{{r_fore-color}}" stroke-width="5" />\n</g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1.1,
        scaleY: 1.1,
        rotation: 0,
        animation: "#wipe-right",
      },
      "filled-box": {
        svg: '<g>\n  <rect x="0" y="0" width="300" height="100" fill="{{color}}" fill-opacity="0.3" stroke="{{color}}" stroke-width="5" />\n</g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1.1,
        scaleY: 1.1,
        rotation: 0,
        animation: "#wipe-right",
      },
      "line-bottom": {
        svg: '<g>\n  <rect x="0" y="0" width="300" height="100" fill="none" stroke="none"/>\n  <line x1="0" y1="100" x2="300" y2="100" stroke="{{r_fore-color}}" stroke-width="5" />\n</g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        animation: "#wipe-right",
      },
      "line-bottom-dotted": {
        svg: '<g>\n  <rect x="0" y="0" width="300" height="100" fill="none" stroke="none"/>\n  <line x1="0" y1="100" x2="300" y2="100" stroke="{{r_fore-color}}" stroke-width="5" stroke-linecap="round" stroke-dasharray="0 16"/>\n</g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        animation: "#wipe-right",
      },
      "line-top": {
        svg: '<g>\n  <rect x="0" y="0" width="300" height="100" fill="none" stroke="none"/>\n  <line x1="0" y1="0" x2="300" y2="0" stroke="{{r_fore-color}}" stroke-width="5" />\n</g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        animation: "#wipe-right",
      },
      "line-top-dotted": {
        svg: '<g>\n  <rect x="0" y="0" width="300" height="100" fill="none" stroke="none"/>\n  <line x1="0" y1="0" x2="300" y2="0" stroke="{{r_fore-color}}" stroke-width="5" stroke-linecap="round" stroke-dasharray="0 16"/>\n</g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        animation: "#wipe-right",
      },
      "line-left": {
        svg: '<g>\n  <rect x="0" y="0" width="300" height="100" fill="none" stroke="none"/>\n  <line x1="0" y1="0" x2="0" y2="100" stroke="{{r_fore-color}}" stroke-width="5" />\n</g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        animation: "#wipe-down",
      },
      "line-right": {
        svg: '<g>\n  <rect x="0" y="0" width="300" height="100" fill="none" stroke="none"/>\n  <line x1="300" y1="0" x2="300" y2="100" stroke="{{r_fore-color}}" stroke-width="5" />\n</g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        animation: "#wipe-down",
      },
      "bracket-left": {
        svg: '<g>\n<rect x="0" y="0" width="300" height="100" fill="none" stroke="none"/>\n<path d="m 3.56006,49.999974 q 0,12.676253 4.05023,22.783563 4.05023,10.107306 11.36541,18.656405 h 9.46424 v -0.421105 q -3.1823,-2.905852 -6.36461,-7.117229 -3.22363,-4.169265 -5.662,-9.349266 -2.56244,-5.390561 -4.05023,-11.370725 -1.52918,-5.980156 -1.52918,-13.181614 0,-6.906658 1.52918,-13.139503 1.52912,-6.232838 4.05023,-11.412841 2.60371,-5.348446 5.662,-9.349259 3.01697,-4.042924 6.36461,-7.1172293 V 8.56006 H 18.9757 Q 11.66052,17.109159 7.61029,27.216469 3.56006,37.323779 3.56006,50.000032 Z" style="fill:{{r_fore-color}};stroke:{{r_fore-color}};stroke-width:7;stroke-opacity:1" />\n</g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        animation: "#wipe-down",
      },
      "bracket-right": {
        svg: '<g>\n<rect x="0" y="0" width="300" height="100" fill="none" stroke="none"/>\n<path d="m 296.43994,49.999971 q 0,12.676253 -4.05023,22.783563 -4.05023,10.107306 -11.36541,18.656405 h -9.46424 v -0.421105 q 3.1823,-2.905852 6.36461,-7.117229 3.22363,-4.169265 5.662,-9.349266 2.56244,-5.390561 4.05023,-11.370725 1.52918,-5.980156 1.52918,-13.181614 0,-6.906658 -1.52918,-13.139503 -1.52912,-6.232838 -4.05023,-11.412841 -2.60371,-5.348446 -5.662,-9.349259 -3.01697,-4.042924 -6.36461,-7.1172288 V 8.5600575 h 9.46424 q 7.31518,8.5490985 11.36541,18.6564085 4.05023,10.10731 4.05023,22.783563 z" style="fill:{{r_fore-color}};stroke:{{r_fore-color}};stroke-width:7;stroke-opacity:1" />\n</g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        animation: "#wipe-down",
      },
      "dotless-exclamation": {
        svg: '<g><rect style="fill:{{r_fore-color}};stroke-width:5;stroke-linecap:round" width="14.5" height="74" x="142" y="2" /></g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        animation: "#wipe-down",
      },
      "i-dot": {
        svg: '<g>\n  <circle\n     style="fill:{{r_fore-color}};fill-opacity:1;stroke:none;stroke-width:5;stroke-linecap:round;stroke-opacity:1"\n     cx="150"\n     cy="9"\n     r="9" />\n</g>',
        position: "o",
        offsetX: 0,
        offsetY: -16,
        scaleX: 1,
        scaleY: 0.3,
        rotation: 0,
        animation: "#fade-in",
      },
      umlaut: {
        svg: '<g>\n<circle\n  style="fill:{{r_fore-color}};fill-opacity:1;stroke:none;stroke-width:5;stroke-linecap:round;stroke-opacity:1"\n  cx="170"\n  cy="9"\n  r="9" />\n<circle\n  style="fill:{{r_fore-color}};fill-opacity:1;stroke:none;stroke-width:5;stroke-linecap:round;stroke-opacity:1"\n  cx="129"\n  cy="9"\n  r="9" />\n</g>',
        position: "o",
        offsetX: 0,
        offsetY: -16,
        scaleX: 1,
        scaleY: 0.3,
        rotation: 0,
        animation: "#fade-in",
      },
      "half-psi": {
        svg: '<g>\n  <path\n     style="fill:none;fill-opacity:1;stroke:{{r_fore-color}};stroke-width:5.04942;stroke-opacity:1"\n     d="M 150,0 V 100"\n     />\n  <path\n     style="fill:none;fill-opacity:1;stroke:{{r_fore-color}};stroke-width:4.70823;stroke-linecap:round;stroke-opacity:1"\n     d="m 152.09414,34.999888 11.93025,-11.63501 a 30.931452,30.496454 0 0 0 5.68666,-7.604445 l 4.43347,-8.4004413 a 8.2686977,8.1524124 0 0 1 2.87164,-3.0995426 l 2.8897,-1.8269636 v 0"\n     />\n</g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1.5,
        rotation: 0,
        animation: "#wipe-down",
      },
      snake: {
        svg: '<g>\n  <path\n     style="fill:none;stroke:{{r_fore-color}};stroke-width:5"\n     d="M 197.68715,3.0148358 156.47518,14.039149 a 12.787826,12.680467 0 0 0 -9.33488,10.493488 l -6.78784,48.324095 a 14.545787,14.42367 0 0 1 -7.3582,10.627309 l -25.56877,14.045081 v 0"\n     />\n</g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1.2,
        scaleY: 2,
        rotation: 0,
        animation: "#wipe-right",
      },
      "snake-left": {
        svg: '<g>\n  <rect x="0" y="0" width="300" height="100" fill="none" stroke="none"/>\n  <path\n     style="fill:none;stroke:{{r_fore-color}};stroke-width:5"\n     d="M 91.465289,2.7174008 50.253319,13.741714 a 12.787826,12.680467 0 0 0 -9.33488,10.493488 l -6.78784,48.324095 a 14.545787,14.42367 0 0 1 -7.3582,10.627309 L 1.2036293,97.231687 v 0"\n     />\n</g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 2,
        rotation: 0,
        animation: "#wipe-right",
      },
      "snake-right": {
        svg: '<g>\n  <rect x="0" y="0" width="300" height="100" fill="none" stroke="none"/>\n  <path\n     style="fill:none;stroke:{{r_fore-color}};stroke-width:5"\n     d="M 298.46529,3.0148358 257.25332,14.039149 a 12.787826,12.680467 0 0 0 -9.33488,10.493488 l -6.78784,48.324095 a 14.545787,14.42367 0 0 1 -7.3582,10.627309 l -25.56877,14.045081 v 0"\n     />\n</g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 2,
        rotation: 0,
        animation: "#wipe-right",
      },
      "snake-callout": {
        svg: '<g>\n  <path\n     style="fill:none;stroke:{{r_fore-color}};stroke-width:5"\n     d="m 197.78287,15.856525 -41.29892,9.551979 a 12.814808,10.986948 0 0 0 -9.35458,9.092047 L 140.32721,76.3708 a 14.576478,12.49734 0 0 1 -7.37373,9.207996 l -25.62272,12.169313 v 0"\n     id="path1" />\n  <text\n     xml:space="preserve"\n     fill="{{r_fore-color}}"\n     x="146"\n     y="12"\n     id="text1">{{note}}</text>\n</g>',
        position: "o",
        offsetX: 0,
        offsetY: 0,
        scaleX: 1.2,
        scaleY: 2,
        rotation: 0,
        animation: "#wipe-right",
      },
      "note-above": {
        svg: '<g>\n  <text id="placeholder" x="150" y="50" text-anchor="middle" dominant-baseline="middle" fill="{{r_fore-color}}" font-size="24">{{note}}</text>\n</g>',
        position: "n",
        offsetX: 0,
        offsetY: -10,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        animation: "#wipe-right",
      },
      "note-interlinear-above": {
        svg: '<g><text x="0" y="0" font-size="14" fill="{{r_fore-color}}" id="placeholder">{{note}}</text></g>',
        position: "n",
        offsetX: 0,
        offsetY: 4,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        animation: "#wipe-right",
      },
      checkmark: {
        svg: '<g><path d="M 101.521975 48.841189 C 107.062322 59.521266 113.987753 78.211400 118.143012 92.896506 127.838617 71.536352 145.844740 39.496122 170.776295 18.135968 181.856986 8.790901 191.552591 3.450863 198.478023 8.790901" fill="none" stroke="{{r_fore-color}}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" /></g>',
        offsetX: 0,
        offsetY: 0,
        scaleX: 2,
        scaleY: 2,
        rotation: 0,
        animation: "#wipe-right",
      },
      "circle-dotted": {
        svg: '<g><circle cx="150" cy="50" r="46" fill="none" stroke="{{r_fore-color}}" stroke-width="8" /><circle cx="150" cy="50" r="5" fill="{{r_fore-color}}" /></g>',
        offsetX: 0,
        offsetY: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        rotation: 0,
        animation: "#wipe-right",
      },
      "nota-bene": {
        svg: '<g><path d="m 111.488,31.589 v 28.837 l 5.926,2.403 17.779,-58.876 7.111,42.054 c 9.482,-20.426 28.446,-44.457 42.669,-26.434 9.482,12.016 -21.334,21.628 -21.334,21.628 23.705,2.403 33.187,32.442 16.593,48.062 -16.593,14.419 -52.15,0 -62.818,0" fill="none" stroke="{{r_fore-color}}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" /></g>',
        offsetX: 0,
        offsetY: 0,
        scaleX: 2,
        scaleY: 2,
        rotation: 0,
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
    { name: "color", value: "red" },
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
