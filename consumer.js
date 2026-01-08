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

  // Load sample data assuming that for each sample there are three files:
  // 1. <sampleName>.data.json
  // 2. <sampleName>.base.txt
  // 3. <sampleName>.settings.json
  try {
    // Load all three files in parallel
    const dataFile = `./data/${sampleName}.data.json`;
    const textFile = `./data/${sampleName}.base.txt`;
    const settingsFile = `./data/${sampleName}.settings.json`;

    console.log('Loading all data files...');
    const [dataResponse, textResponse, settingsResponse] = await Promise.all([
      fetch(dataFile),
      fetch(textFile),
      fetch(settingsFile)
    ]);

    // Parse all responses
    const [jsonData, text, settings] = await Promise.all([
      dataResponse.json(),
      textResponse.text(),
      settingsResponse.json()
    ]);

    const data = jsonData.result;

    // Normalize line endings: replace CRLF with LF
    data.text = text.replace(/\r\n/g, '\n');

    // Add operation summary function (not stored in JSON)
    settings.opSummaryFn = renderOperationSummary;

    console.log(`All data loaded from: ${dataFile}, ${textFile}, ${settingsFile}`);

    // Apply settings and data to component AT ONCE to prevent flashing
    component.settings = settings;
    component.data = data;
    console.log("Component initialized successfully!");
  } catch (error) {
    console.error("Error loading data:", error);
  }
});
