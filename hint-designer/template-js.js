/**
 * GVE Hint Designer - JavaScript Template
 *
 * This template helps you design and test hints for the GVE Snapshot Rendition component.
 *
 * HOW TO USE:
 * 1. Edit the CONFIG object to set canvas dimensions and grid size
 * 2. Edit the DATA object to add your hints and animations
 * 3. The rest of the code handles rendering and animation - don't modify unless needed
 */

// ============================================================================
// CONFIGURATION - Edit these values as needed
// ============================================================================

const CONFIG = {
  // Canvas dimensions - represents the mock RBR (Reference Bounding Rectangle)
  HINT_WIDTH: 200,   // Width of the design area
  HINT_HEIGHT: 40,   // Height of the design area

  // Grid settings for visual reference
  GRID_SIZE: 10,     // Grid cell size in pixels
};

// ============================================================================
// DATA - Edit your hints and animations here
// ============================================================================

const DATA = {
  // Hints catalog: each hint represents a visual operation
  hints: {
    "diagonal-stroke": {
      svg: '<g><line x1="0" y1="0" x2="100" y2="10" stroke="{{r_fore-color}}" stroke-width="2" /></g>',
      position: "o",
      offsetX: 0,
      offsetY: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      animation: "#fade-in"
    },

    "note": {
      svg: '<g><text x="0" y="0" font-family="Arial" font-size="14" fill="{{r_fore-color}}" id="placeholder">{{note}}</text></g>',
      position: "n",
      offsetX: 0,
      offsetY: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      animation: "#scale-in"
    },

    "note-interlinear-above": {
      svg: '<g><text x="0" y="0" font-family="Arial" font-size="14" fill="{{r_fore-color}}" id="placeholder">{{note-interlinear-above}}</text></g>',
      position: "n",
      offsetX: 0,
      offsetY: 14,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      animation: "#scale-in"
    },

    "note-underline": {
      svg: '<g><text x="0" y="0" font-family="Arial" font-size="14" fill="{{r_fore-color}}" text-decoration="underline" id="placeholder">{{note}}</text></g>',
      position: "nw",
      offsetX: -20,
      offsetY: -10,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      animation: "#wipe-right"
    },

    "box": {
      svg: '<g><rect x="0" y="0" width="100" height="30" fill="none" stroke="{{r_fore-color}}" stroke-width="1" /></g>',
      position: "o",
      offsetX: 0,
      offsetY: 0,
      scaleX: 1.1,
      scaleY: 1.1,
      rotation: 0,
      animation: "#fade-in"
    }
  },

  // Animations catalog: GSAP animations for hint entrance
  // Each animation receives: gsap, targetEl, rootEl
  // Must return a Promise that resolves when animation completes
  animations: {
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

    "bounce-in": `
      return new Promise(resolve => {
        gsap.fromTo(targetEl,
          { opacity: 0, y: -20, scale: 0.8 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.8,
            ease: 'elastic.out(1, 0.5)',
            onComplete: resolve
          }
        );
      });
    `
  }
};

// ============================================================================
// APPLICATION CODE - Handles rendering and interactions
// You typically don't need to modify this section
// ============================================================================

let currentHintId = null;
let currentTimeline = null;
let showHandle = false;

// Initialize when DOM is ready and scripts are loaded
// Wait for both DOM and window load to ensure external scripts are ready
window.addEventListener('load', () => {
  // Small delay to ensure scripts are fully initialized
  setTimeout(initializeApp, 100);
});

/**
 * Initialize the application
 */
function initializeApp() {
  console.log('Initializing GVE Hint Designer...');

  // Check if GSAP is loaded
  if (typeof gsap === 'undefined') {
    const errorMsg = 'Error: GSAP library not loaded. Please verify external scripts are added correctly in JS Settings.';
    console.error(errorMsg);
    console.error('Expected: https://cdn.jsdelivr.net/npm/gsap/dist/gsap.min.js');
    showStatus(errorMsg, 'error');
    document.getElementById('gsap-tools').innerHTML = '<p style="color: #ef4444; padding: 20px; text-align: center;"><strong>GSAP Not Loaded!</strong><br><br>Please check JS Settings and add:<br><code>https://cdn.jsdelivr.net/npm/gsap/dist/gsap.min.js</code></p>';
    return;
  }

  console.log('✓ GSAP loaded successfully:', gsap.version);

  // Check if GSDevTools is loaded
  if (typeof GSDevTools === 'undefined') {
    console.log('GSDevTools not loaded. Add it to external scripts for timeline controls.');
    document.getElementById('gsap-tools').innerHTML = '<p style="color: #999; font-style: italic; text-align: center;">Timeline controls not available<br>Add <code>https://cdn.jsdelivr.net/npm/gsap/GSDevTools.js</code> to external scripts<br>or use the "Reset Animation" button</p>';
  } else {
    // Register GSDevTools plugin
    gsap.registerPlugin(GSDevTools);
    console.log('GSDevTools plugin registered');

    // Initialize GSDevTools immediately with global timeline
    GSDevTools.create({
      animation: gsap.globalTimeline,
      container: document.getElementById('gsap-tools')
    });
  }

  // Setup canvas
  setupCanvas();

  // Populate hint selector
  populateHintSelector();

  // Setup event listeners
  setupEventListeners();

  // Update canvas info display
  updateCanvasInfo();

  showStatus('Ready - Select a hint to begin');
}

/**
 * Setup the SVG canvas with grid
 */
function setupCanvas() {
  const canvas = document.getElementById('canvas');
  const gridLayer = document.getElementById('grid-layer');

  // Set canvas dimensions
  canvas.setAttribute('width', CONFIG.HINT_WIDTH);
  canvas.setAttribute('height', CONFIG.HINT_HEIGHT);
  canvas.setAttribute('viewBox', `0 0 ${CONFIG.HINT_WIDTH} ${CONFIG.HINT_HEIGHT}`);

  // Draw grid
  drawGrid(gridLayer);
}

/**
 * Draw reference grid with rulers
 */
function drawGrid(gridLayer) {
  gridLayer.innerHTML = ''; // Clear existing grid

  const { HINT_WIDTH, HINT_HEIGHT, GRID_SIZE } = CONFIG;

  // Draw vertical lines
  for (let x = 0; x <= HINT_WIDTH; x += GRID_SIZE) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x);
    line.setAttribute('y1', 0);
    line.setAttribute('x2', x);
    line.setAttribute('y2', HINT_HEIGHT);
    line.setAttribute('class', x % (GRID_SIZE * 5) === 0 ? 'grid-line major' : 'grid-line');
    gridLayer.appendChild(line);

    // Add ruler numbers for major lines
    if (x % (GRID_SIZE * 5) === 0 && x > 0) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x);
      text.setAttribute('y', 8);
      text.setAttribute('class', 'ruler-text');
      text.setAttribute('text-anchor', 'middle');
      text.textContent = x;
      gridLayer.appendChild(text);
    }
  }

  // Draw horizontal lines
  for (let y = 0; y <= HINT_HEIGHT; y += GRID_SIZE) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', 0);
    line.setAttribute('y1', y);
    line.setAttribute('x2', HINT_WIDTH);
    line.setAttribute('y2', y);
    line.setAttribute('class', y % (GRID_SIZE * 5) === 0 ? 'grid-line major' : 'grid-line');
    gridLayer.appendChild(line);

    // Add ruler numbers for major lines
    if (y % (GRID_SIZE * 5) === 0 && y > 0) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', 5);
      text.setAttribute('y', y + 3);
      text.setAttribute('class', 'ruler-text');
      text.textContent = y;
      gridLayer.appendChild(text);
    }
  }
}

/**
 * Populate hint selector dropdown
 */
function populateHintSelector() {
  const select = document.getElementById('hint-select');
  const thumbnailsContainer = document.getElementById('thumbnails-container');

  // Clear existing options and thumbnails
  select.innerHTML = '<option value="">-- Choose a hint --</option>';
  thumbnailsContainer.innerHTML = '';

  // Add options and thumbnails for each hint
  Object.keys(DATA.hints).forEach(hintId => {
    // Add to dropdown
    const option = document.createElement('option');
    option.value = hintId;
    option.textContent = hintId;
    select.appendChild(option);

    // Create thumbnail
    const thumbnail = createThumbnail(hintId);
    thumbnailsContainer.appendChild(thumbnail);
  });

  // Select first hint if available
  const firstHintId = Object.keys(DATA.hints)[0];
  if (firstHintId) {
    select.value = firstHintId;
    renderHint(firstHintId);
  }
}

/**
 * Create a thumbnail for a hint
 */
function createThumbnail(hintId) {
  const thumbnail = document.createElement('div');
  thumbnail.className = 'thumbnail';
  thumbnail.dataset.hintId = hintId;

  // Create mini SVG preview
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${CONFIG.HINT_WIDTH} ${CONFIG.HINT_HEIGHT}`);

  // Add hint SVG (simplified, without animation)
  const hint = DATA.hints[hintId];
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(hint.svg, 'image/svg+xml');
  const hintElement = svgDoc.documentElement;

  // Simple rendering without transforms
  svg.appendChild(hintElement);
  thumbnail.appendChild(svg);

  // Add label
  const label = document.createElement('div');
  label.className = 'thumbnail-label';
  label.textContent = hintId;
  label.title = hintId;
  thumbnail.appendChild(label);

  // Click handler
  thumbnail.addEventListener('click', () => {
    document.getElementById('hint-select').value = hintId;
    renderHint(hintId);
  });

  return thumbnail;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Hint selector
  document.getElementById('hint-select').addEventListener('change', (e) => {
    if (e.target.value) {
      renderHint(e.target.value);
    }
  });

  // Navigation buttons
  document.getElementById('btn-prev').addEventListener('click', () => navigateHint(-1));
  document.getElementById('btn-next').addEventListener('click', () => navigateHint(1));

  // Action buttons
  document.getElementById('btn-copy').addEventListener('click', copyToClipboard);
  document.getElementById('btn-import').addEventListener('click', importFromClipboard);
  document.getElementById('btn-reset-animation').addEventListener('click', resetAnimation);
  document.getElementById('btn-toggle-handle').addEventListener('click', toggleHandle);
}

/**
 * Navigate to previous or next hint
 */
function navigateHint(direction) {
  const hintIds = Object.keys(DATA.hints);
  if (hintIds.length === 0) return;

  const currentIndex = hintIds.indexOf(currentHintId);
  let newIndex = currentIndex + direction;

  // Wrap around
  if (newIndex < 0) newIndex = hintIds.length - 1;
  if (newIndex >= hintIds.length) newIndex = 0;

  const newHintId = hintIds[newIndex];
  document.getElementById('hint-select').value = newHintId;
  renderHint(newHintId);
}

/**
 * Render a hint on the canvas
 */
function renderHint(hintId) {
  console.log('Rendering hint:', hintId);
  currentHintId = hintId;

  const hint = DATA.hints[hintId];
  if (!hint) {
    showStatus(`Error: Hint "${hintId}" not found`, 'error');
    return;
  }

  // Clear previous hint
  const hintLayer = document.getElementById('hint-layer');
  hintLayer.innerHTML = '';

  // Kill previous animation
  if (currentTimeline) {
    currentTimeline.kill();
    currentTimeline = null;
  }

  // Resolve placeholders (use mock values)
  let svgContent = hint.svg;
  svgContent = svgContent.replace(/\{\{r_fore-color\}\}/g, 'red');
  svgContent = svgContent.replace(/\{\{note-interlinear-above\}\}/g, 'Sample');
  svgContent = svgContent.replace(/\{\{note\}\}/g, 'Sample');
  svgContent = svgContent.replace(/\{\{[^}]+\}\}/g, 'PLACEHOLDER');

  // Parse and import the SVG element
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
  const parsedElement = svgDoc.documentElement;

  // Import the node into the current document's SVG namespace
  const hintElement = document.importNode(parsedElement, true);

  // Position hint in the center of canvas (mock RBR)
  const centerX = CONFIG.HINT_WIDTH / 2;
  const centerY = CONFIG.HINT_HEIGHT / 2;

  // Apply transform based on hint properties
  let transform = `translate(${centerX}, ${centerY})`;

  // Apply scale
  if (hint.scaleX !== 1 || hint.scaleY !== 1) {
    transform += ` scale(${hint.scaleX}, ${hint.scaleY})`;
  }

  // Apply rotation
  if (hint.rotation !== 0) {
    transform += ` rotate(${hint.rotation})`;
  }

  hintElement.setAttribute('transform', transform);
  hintElement.setAttribute('id', 'current-hint');

  // Add to canvas
  hintLayer.appendChild(hintElement);

  // Highlight handle if present
  updateHandleVisibility();

  // Update UI
  updateThumbnailSelection(hintId);
  updatePropertiesDisplay(hint, hintId);

  // Animate hint
  animateHint(hintElement, hint);

  showStatus(`Displaying: ${hintId}`);
}

/**
 * Animate hint using GSAP
 */
function animateHint(targetEl, hint) {
  if (!hint.animation) {
    console.log('No animation defined for hint');
    // Make sure element is visible if no animation
    gsap.set(targetEl, { opacity: 1 });
    return;
  }

  // Get root element
  const rootEl = document.getElementById('canvas');

  // Resolve animation code
  let animationCode = hint.animation;
  if (animationCode.startsWith('#')) {
    const animId = animationCode.substring(1);
    animationCode = DATA.animations[animId];
    if (!animationCode) {
      showStatus(`Error: Animation "${animId}" not found`, 'error');
      // Make sure element is visible even if animation not found
      gsap.set(targetEl, { opacity: 1 });
      return;
    }
  }

  try {
    // Create animation function
    // The animation code expects: gsap, targetEl, rootEl
    const animationFn = new Function('gsap', 'targetEl', 'rootEl', animationCode);

    // Execute animation
    const result = animationFn(gsap, targetEl, rootEl);

    // Handle promise or timeline
    if (result && typeof result.then === 'function') {
      result.then(() => {
        console.log('Animation completed');
      }).catch(err => {
        console.error('Animation error:', err);
        showStatus('Animation error - check console', 'error');
        // Make sure element is visible even if animation fails
        gsap.set(targetEl, { opacity: 1 });
      });
    }

  } catch (error) {
    console.error('Error executing animation:', error);
    showStatus('Animation error - check console', 'error');
    // Make sure element is visible even if error
    gsap.set(targetEl, { opacity: 1 });
  }
}

/**
 * Update thumbnail selection state
 */
function updateThumbnailSelection(hintId) {
  document.querySelectorAll('.thumbnail').forEach(thumb => {
    if (thumb.dataset.hintId === hintId) {
      thumb.classList.add('active');
    } else {
      thumb.classList.remove('active');
    }
  });
}

/**
 * Update properties display panel
 */
function updatePropertiesDisplay(hint, hintId) {
  const container = document.getElementById('hint-properties');
  container.innerHTML = '';

  const properties = [
    { label: 'ID', value: hintId },
    { label: 'Position', value: hint.position },
    { label: 'Offset X', value: hint.offsetX },
    { label: 'Offset Y', value: hint.offsetY },
    { label: 'Scale X', value: hint.scaleX },
    { label: 'Scale Y', value: hint.scaleY },
    { label: 'Rotation', value: `${hint.rotation}°` },
    { label: 'Animation', value: hint.animation || 'None' }
  ];

  properties.forEach(prop => {
    const row = document.createElement('div');
    row.className = 'property-row';
    row.innerHTML = `
      <div class="property-label">${prop.label}:</div>
      <div class="property-value">${prop.value}</div>
    `;
    container.appendChild(row);
  });
}

/**
 * Update canvas info display
 */
function updateCanvasInfo() {
  document.getElementById('canvas-dimensions').textContent =
    `${CONFIG.HINT_WIDTH} × ${CONFIG.HINT_HEIGHT} px`;
  document.getElementById('grid-info').textContent =
    `Grid: ${CONFIG.GRID_SIZE}px`;
}

/**
 * Toggle handle visibility
 */
function toggleHandle() {
  showHandle = !showHandle;
  updateHandleVisibility();
  showStatus(`Handle display: ${showHandle ? 'ON' : 'OFF'}`);
}

/**
 * Update handle visualization
 */
function updateHandleVisibility() {
  const hintElement = document.getElementById('current-hint');
  if (!hintElement) return;

  // Find handle element
  const handleEl = hintElement.querySelector('#handle');
  if (!handleEl) {
    console.log('No handle element found in this hint');
    return;
  }

  // Toggle visibility
  if (showHandle) {
    handleEl.classList.add('visible');
  } else {
    handleEl.classList.remove('visible');
  }
}

/**
 * Reset and replay animation
 */
function resetAnimation() {
  if (currentHintId) {
    renderHint(currentHintId);
    showStatus('Animation reset');
  }
}

/**
 * Copy hints and animations to clipboard
 */
async function copyToClipboard() {
  try {
    const jsonData = JSON.stringify(DATA, null, 2);
    await navigator.clipboard.writeText(jsonData);
    showStatus('✓ Copied to clipboard!', 'success');

    // Add visual feedback
    const btn = document.getElementById('btn-copy');
    btn.classList.add('pulsing');
    setTimeout(() => btn.classList.remove('pulsing'), 1000);
  } catch (error) {
    console.error('Copy error:', error);
    showStatus('Failed to copy to clipboard', 'error');
  }
}

/**
 * Import hints and animations from clipboard
 */
async function importFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    const importedData = JSON.parse(text);

    // Validate structure
    if (!importedData.hints || !importedData.animations) {
      throw new Error('Invalid data structure');
    }

    // Merge with existing data
    DATA.hints = { ...DATA.hints, ...importedData.hints };
    DATA.animations = { ...DATA.animations, ...importedData.animations };

    // Refresh UI
    populateHintSelector();
    showStatus('✓ Data imported successfully!', 'success');

    // Add visual feedback
    const btn = document.getElementById('btn-import');
    btn.classList.add('pulsing');
    setTimeout(() => btn.classList.remove('pulsing'), 1000);
  } catch (error) {
    console.error('Import error:', error);
    showStatus('Failed to import - check clipboard data format', 'error');
  }
}

/**
 * Show status message
 */
function showStatus(message, type = '') {
  const statusEl = document.getElementById('status-message');
  statusEl.textContent = message;
  statusEl.className = type;

  console.log(`[${type || 'info'}] ${message}`);
}
