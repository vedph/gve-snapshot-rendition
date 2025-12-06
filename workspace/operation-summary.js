/**
 * Custom operation summary function for the GVE Snapshot Rendition component.
 * This function renders detailed operation summaries with context.
 *
 * @param {Object} data - The CharChainResult data
 * @param {string} versionTag - The version tag (e.g., "v1", "v2")
 * @param {Object} summaryService - The OperationSummaryService instance
 * @returns {string} HTML string for the operation summary
 */
function renderOperationSummary(data, versionTag, summaryService) {
  const step = summaryService.getStepByVersionTag(versionTag);
  if (!step || !step.operation) {
    return "No operation";
  }

  const op = step.operation;
  const typeName = summaryService.getOperationTypeName(op.type);

  // Get version tags from step (not from operation)
  const inputTag = step.inputTag || '?';
  const outputTag = step.outputTag || '?';

  // Build the header line: type inputTag → outputTag [id] [rank] [groupId]
  let header = `<div class="op-summary-header">`;
  header += `<span class="op-type">${summaryService.escapeHtml(typeName)}</span> `;
  header += `<span class="op-tags">${summaryService.escapeHtml(inputTag)} → ${summaryService.escapeHtml(outputTag)}</span> `;
  header += `<span class="op-id">[${summaryService.escapeHtml(op.id)}]</span>`;

  if (op.rank && op.rank !== 0) {
    header += ` <span class="op-rank">rank:${op.rank}</span>`;
  }

  if (op.groupId) {
    header += ` <span class="op-group">group:${summaryService.escapeHtml(op.groupId)}</span>`;
  }
  header += `</div>`;

  // Add DSL if present
  let dslLine = "";
  if (op.dsl) {
    dslLine = `<div class="op-dsl"><code>${summaryService.escapeHtml(op.dsl)}</code></div>`;
  }

  // Build the operation description based on type
  let description = "";

  switch (op.type) {
    case 0: // OperationType.replace
      {
        // Get deleted nodes (from 'at' to 'at + run')
        const deletedIds = [];
        for (let i = 0; i < (op.run || 0); i++) {
          deletedIds.push(op.at + i);
        }
        const deletedText = summaryService.getSpanText(deletedIds, inputTag);

        // Get added text (from operation value)
        const addedText = op.value || "";

        // Get context (pass at value and atAsIndex flag)
        const context = summaryService.getContext(deletedIds, inputTag, op.at, op.atAsIndex || false);

        description = `<div class="op-desc">Replace ` +
          `<span class="op-text-old">"${summaryService.escapeHtml(deletedText)}"</span> with ` +
          `<span class="op-text-new">"${summaryService.escapeHtml(addedText)}"</span> ` +
          `in <span class="op-context">"${summaryService.escapeHtml(context)}"</span>` +
          `</div>`;
      }
      break;

    case 1: // OperationType.delete
      {
        const deletedIds = [];
        for (let i = 0; i < (op.run || 0); i++) {
          deletedIds.push(op.at + i);
        }
        const deletedText = summaryService.getSpanText(deletedIds, inputTag);
        const context = summaryService.getContext(deletedIds, inputTag, op.at, op.atAsIndex || false);

        description = `<div class="op-desc">Delete ` +
          `<span class="op-text-old">"${summaryService.escapeHtml(deletedText)}"</span> ` +
          `in <span class="op-context">"${summaryService.escapeHtml(context)}"</span>` +
          `</div>`;
      }
      break;

    case 2: // OperationType.addBefore
      {
        const addedText = op.value || "";
        const anchorId = op.at;
        const anchorText = summaryService.getNodeText(anchorId, outputTag);
        const context = summaryService.getContext([anchorId], outputTag, op.at, op.atAsIndex || false);

        description = `<div class="op-desc">Add ` +
          `<span class="op-text-new">"${summaryService.escapeHtml(addedText)}"</span> before ` +
          `<span class="op-anchor">"${summaryService.escapeHtml(anchorText)}"</span> ` +
          `in <span class="op-context">"${summaryService.escapeHtml(context)}"</span>` +
          `</div>`;
      }
      break;

    case 3: // OperationType.addAfter
      {
        const addedText = op.value || "";
        const anchorId = op.at;
        const anchorText = summaryService.getNodeText(anchorId, outputTag);
        const context = summaryService.getContext([anchorId], outputTag, op.at, op.atAsIndex || false);

        description = `<div class="op-desc">Add ` +
          `<span class="op-text-new">"${summaryService.escapeHtml(addedText)}"</span> after ` +
          `<span class="op-anchor">"${summaryService.escapeHtml(anchorText)}"</span> ` +
          `in <span class="op-context">"${summaryService.escapeHtml(context)}"</span>` +
          `</div>`;
      }
      break;

    case 4: // OperationType.moveBefore
      {
        const movedIds = [];
        for (let i = 0; i < (op.run || 0); i++) {
          movedIds.push(op.at + i);
        }
        const movedText = summaryService.getSpanText(movedIds, outputTag);
        const anchorId = op.to || 0;
        const anchorText = summaryService.getNodeText(anchorId, outputTag);
        const context = summaryService.getContext([anchorId], outputTag, op.to, op.toAsIndex || false);

        description = `<div class="op-desc">Move ` +
          `<span class="op-text-moved">"${summaryService.escapeHtml(movedText)}"</span> before ` +
          `<span class="op-anchor">"${summaryService.escapeHtml(anchorText)}"</span> ` +
          `in <span class="op-context">"${summaryService.escapeHtml(context)}"</span>` +
          `</div>`;
      }
      break;

    case 5: // OperationType.moveAfter
      {
        const movedIds = [];
        for (let i = 0; i < (op.run || 0); i++) {
          movedIds.push(op.at + i);
        }
        const movedText = summaryService.getSpanText(movedIds, outputTag);
        const anchorId = op.to || 0;
        const anchorText = summaryService.getNodeText(anchorId, outputTag);
        const context = summaryService.getContext([anchorId], outputTag, op.to, op.toAsIndex || false);

        description = `<div class="op-desc">Move ` +
          `<span class="op-text-moved">"${summaryService.escapeHtml(movedText)}"</span> after ` +
          `<span class="op-anchor">"${summaryService.escapeHtml(anchorText)}"</span> ` +
          `in <span class="op-context">"${summaryService.escapeHtml(context)}"</span>` +
          `</div>`;
      }
      break;

    case 6: // OperationType.swap
      {
        const span1Ids = [];
        for (let i = 0; i < (op.run || 0); i++) {
          span1Ids.push(op.at + i);
        }
        const span1Text = summaryService.getSpanText(span1Ids, outputTag);

        const span2Ids = [];
        for (let i = 0; i < (op.toRun || 0); i++) {
          span2Ids.push((op.to || 0) + i);
        }
        const span2Text = summaryService.getSpanText(span2Ids, outputTag);

        const context = summaryService.getContext(span1Ids, outputTag, op.at, op.atAsIndex || false);

        description = `<div class="op-desc">Swap ` +
          `<span class="op-text-moved">"${summaryService.escapeHtml(span1Text)}"</span> with ` +
          `<span class="op-text-moved">"${summaryService.escapeHtml(span2Text)}"</span> ` +
          `in <span class="op-context">"${summaryService.escapeHtml(context)}"</span>` +
          `</div>`;
      }
      break;

    case 7: // OperationType.annotate
      {
        const annotatedIds = [];
        for (let i = 0; i < (op.run || 0); i++) {
          annotatedIds.push(op.at + i);
        }
        const annotatedText = summaryService.getSpanText(annotatedIds, outputTag);
        const context = summaryService.getContext(annotatedIds, outputTag, op.at, op.atAsIndex || false);

        description = `<div class="op-desc">Annotate ` +
          `<span class="op-text-annotated">"${summaryService.escapeHtml(annotatedText)}"</span> ` +
          `in <span class="op-context">"${summaryService.escapeHtml(context)}"</span>` +
          `</div>`;
      }
      break;

    default:
      description = `<div class="op-desc">Unknown operation type</div>`;
  }

  // Build sources section
  let sources = "";
  if (op.sources && op.sources.length > 0) {
    sources = `<div class="op-sources">`;
    for (const source of op.sources) {
      sources += `<div class="op-source">`;
      sources += `<span class="source-id">${summaryService.escapeHtml(source.id)}</span>`;
      if (source.type) {
        sources += ` <span class="source-type">(${summaryService.escapeHtml(source.type)})</span>`;
      }
      if (source.rank) {
        sources += ` <span class="source-rank">rank:${source.rank}</span>`;
      }
      if (source.note) {
        sources += ` <span class="source-note">${summaryService.escapeHtml(source.note)}</span>`;
      }
      sources += `</div>`;
    }
    sources += `</div>`;
  }

  // Combine all parts with CSS classes for styling
  return `
    <style>
      .op-summary-header { font-weight: bold; margin-bottom: 0.5rem; }
      .op-type { color: #0066cc; font-weight: bold; }
      .op-tags { color: #666; }
      .op-id { color: #999; font-size: 0.9em; }
      .op-rank { color: #ff6600; font-size: 0.9em; }
      .op-group { color: #9900cc; font-size: 0.9em; }
      .op-dsl { margin: 0.5rem 0; font-family: monospace; background: #f5f5f5; padding: 0.3rem; border-radius: 3px; }
      .op-desc { margin: 0.5rem 0; line-height: 1.4; }
      .op-text-old { color: #cc0000; font-weight: bold; }
      .op-text-new { color: #00cc00; font-weight: bold; }
      .op-text-moved { color: #0066cc; font-weight: bold; }
      .op-text-annotated { color: #9900cc; font-weight: bold; }
      .op-anchor { color: #ff6600; font-style: italic; }
      .op-context { color: #666; font-style: italic; }
      .op-sources { margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #ddd; }
      .op-source { font-size: 0.9em; margin: 0.2rem 0; }
      .source-id { color: #0066cc; font-weight: bold; }
      .source-type { color: #666; }
      .source-rank { color: #ff6600; }
      .source-note { color: #333; font-style: italic; }
    </style>
    ${header}
    ${dslLine}
    ${description}
    ${sources}
  `;
}
