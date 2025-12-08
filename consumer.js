/**
 * Consumer code for testing the GVE Snapshot Rendition component.
 */

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing GVE Snapshot Rendition demo...");

  // Get the component
  const component = document.querySelector("gve-snapshot-rendition");
  if (!component) {
    console.error("Component not found!");
    return;
  }

  // Load sample data
  try {
    const response = await fetch("./data.json");
    const jsonData = await response.json();
    const data = jsonData.result;

    console.log("Data loaded:", data);

    // Add base text (the example text from documentation)
    data.text = `In this test I show all operation
types.
It is not complex nor long.
This too, is another line`;

    // Create settings with hints
    const settings = {
      fontSize: 24,
      fontFamily: "Georgia, serif",
      foreColor: "#000000",
      debug: true, // Enable logging

      // Define some simple hints for the example
      hints: {
        "diagonal-stroke": {
          svg: '<g><line x1="0" y1="0" x2="100" y2="10" stroke="{{r_fore-color}}" stroke-width="2" /></g>',
          position: "o",
          offsetX: 0,
          offsetY: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          animation: "#fade-in",
        },
        note: {
          svg: '<g><text x="0" y="0" font-family="Arial" font-size="14" fill="{{r_fore-color}}" id="placeholder">{{note}}</text></g>',
          position: "n",
          offsetX: 0,
          offsetY: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          animation: "#scale-in",
        },
        "note-interlinear-above": {
          svg: '<g><text x="0" y="0" font-family="Arial" font-size="14" fill="{{r_fore-color}}" id="placeholder">{{note}}</text></g>',
          position: "n",
          offsetX: 0,
          offsetY: 14,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          animation: "#scale-in",
        },
        "note-underline": {
          svg: '<g><text x="0" y="0" font-family="Arial" font-size="14" fill="{{r_fore-color}}" text-decoration="underline" id="placeholder">{{note}}</text></g>',
          position: "nw",
          offsetX: -20,
          offsetY: -10,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          animation: "#wipe-right",
        },
        box: {
          svg: '<g><rect x="0" y="0" width="100" height="30" fill="none" stroke="{{r_fore-color}}" stroke-width="1" /></g>',
          position: "o",
          offsetX: 0,
          offsetY: 0,
          scaleX: 1.1,
          scaleY: 1.1,
          rotation: 0,
          animation: "#fade-in",
        },
      },

      // Animations
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
              { opacity: 1, duration: 1, onComplete: resolve }
            );
          });
        `,
        "wipe-right": `
          return new Promise(resolve => {
            gsap.fromTo(targetEl,
              { opacity: 0, x: -20 },
              { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out', onComplete: resolve }
            );
          });
        `,
        "scale-in": `
          return new Promise(resolve => {
            gsap.fromTo(targetEl,
              { opacity: 0, scale: 0.5 },
              { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)', onComplete: resolve }
            );
          });
        `,
      },

      charAnimationId: "text-fade-in", // Animate each character

      // Add operation summary function
      opSummaryFn: renderOperationSummary,
    };

    // Apply settings and data to component
    component.settings = settings;
    component.data = data;

    console.log("Component initialized successfully!");
  } catch (error) {
    console.error("Error loading data:", error);
  }
});
