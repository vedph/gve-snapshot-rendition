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
    // Load data from data folder
    const dataFile = `./data/${sampleName}.data.json`;
    const dataResponse = await fetch(dataFile);
    const jsonData = await dataResponse.json();
    const data = jsonData.result;
    console.log(`Data loaded from: ${dataFile}`);

    // Load text from corresponding .base.txt file
    const textFile = `./data/${sampleName}.base.txt`;
    const textResponse = await fetch(textFile);
    data.text = await textResponse.text();

    // Normalize line endings: replace CRLF with LF
    data.text = data.text.replace(/\r\n/g, '\n');
    console.log(`Text loaded from: ${textFile}`);

    // Load settings from corresponding .settings.json file
    const settingsFile = `./data/${sampleName}.settings.json`;
    const settingsResponse = await fetch(settingsFile);
    const settings = await settingsResponse.json();
    console.log(`Settings loaded from: ${settingsFile}`);

    // Add operation summary function (not stored in JSON)
    settings.opSummaryFn = renderOperationSummary;

    // Apply settings and data to component
    component.settings = settings;
    component.data = data;
    console.log("Component initialized successfully!");
  } catch (error) {
    console.error("Error loading data:", error);
  }
});
