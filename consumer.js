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

  // Get sample name from query string parameter, default to 'default'
  const urlParams = new URLSearchParams(window.location.search);
  const sampleName = urlParams.get('sample') || 'default';

  console.log(`Loading sample: ${sampleName}`);

  // Load sample data from two files:
  // 1. <sampleName>.data.json  — API result (includes all nodes and version data)
  // 2. <sampleName>.settings.json — component settings
  try {
    const dataFile = `./data/${sampleName}.data.json`;
    const settingsFile = `./data/${sampleName}.settings.json`;

    console.log('Loading data files...');
    const [dataResponse, settingsResponse] = await Promise.all([
      fetch(dataFile),
      fetch(settingsFile)
    ]);

    const [jsonData, settings] = await Promise.all([
      dataResponse.json(),
      settingsResponse.json()
    ]);

    // The API response wraps the result; unwrap it
    const data = jsonData.result ?? jsonData;

    // Add operation summary function (not stored in JSON)
    settings.opSummaryFn = renderOperationSummary;

    console.log(`Data loaded from: ${dataFile}, ${settingsFile}`);

    // Apply settings and data to component AT ONCE to prevent flashing
    component.settings = settings;
    component.data = data;
    console.log("Component initialized successfully!");
  } catch (error) {
    console.error("Error loading data:", error);
  }
});
