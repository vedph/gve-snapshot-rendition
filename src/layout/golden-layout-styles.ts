/**
 * Golden Layout CSS inlined for Shadow DOM compatibility.
 * GL injects styles into document.head, which doesn't reach inside Shadow DOM.
 * Source: golden-layout@2.6.0 dist/css/goldenlayout-base.css + adapted light theme.
 * Update this file when upgrading golden-layout.
 */
export const GOLDEN_LAYOUT_CSS = `
/* ── Golden Layout base ──────────────────────────────────────────────── */
.lm_root {
  position: relative;
}
.lm_row > .lm_item {
  float: left;
}
.lm_content {
  overflow: hidden;
  position: relative;
}
.lm_dragging,
.lm_dragging * {
  cursor: move !important;
  user-select: none;
}
.lm_maximised {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 40;
}
.lm_maximise_placeholder {
  display: none;
}
.lm_splitter {
  position: relative;
  z-index: 2;
  touch-action: none;
}
.lm_splitter.lm_vertical .lm_drag_handle {
  width: 100%;
  position: absolute;
  cursor: ns-resize;
  touch-action: none;
  user-select: none;
}
.lm_splitter.lm_horizontal {
  float: left;
  height: 100%;
}
.lm_splitter.lm_horizontal .lm_drag_handle {
  height: 100%;
  position: absolute;
  cursor: ew-resize;
  touch-action: none;
  user-select: none;
}
.lm_header {
  overflow: visible;
  position: relative;
  z-index: 1;
  user-select: none;
}
.lm_header [class^=lm_] {
  box-sizing: content-box !important;
}
.lm_header .lm_controls {
  position: absolute;
  right: 3px;
  display: flex;
}
.lm_header .lm_controls > * {
  cursor: pointer;
  float: left;
  width: 18px;
  height: 18px;
  text-align: center;
}
.lm_header .lm_tabs {
  position: absolute;
  display: flex;
}
.lm_header .lm_tab {
  cursor: pointer;
  float: left;
  height: 14px;
  margin-top: 1px;
  padding: 0px 10px 5px;
  padding-right: 25px;
  position: relative;
  touch-action: none;
}
.lm_header .lm_tab i {
  width: 2px;
  height: 19px;
  position: absolute;
}
.lm_header .lm_tab i.lm_left {
  top: 0;
  left: -2px;
}
.lm_header .lm_tab i.lm_right {
  top: 0;
  right: -2px;
}
.lm_header .lm_tab .lm_title {
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lm_header .lm_tab .lm_close_tab {
  width: 14px;
  height: 14px;
  position: absolute;
  top: 0;
  right: 0;
  text-align: center;
}
.lm_stack {
  position: relative;
}
.lm_stack > .lm_items {
  overflow: hidden;
}
.lm_stack.lm_left > .lm_items {
  position: absolute;
  left: 20px;
  top: 0;
}
.lm_stack.lm_right > .lm_items {
  position: absolute;
  right: 20px;
  top: 0;
}
.lm_stack.lm_right > .lm_header {
  position: absolute;
  right: 0;
  top: 0;
}
.lm_stack.lm_bottom > .lm_items {
  position: absolute;
  bottom: 20px;
}
.lm_stack.lm_bottom > .lm_header {
  position: absolute;
  bottom: 0;
}
.lm_left.lm_stack .lm_header,
.lm_right.lm_stack .lm_header {
  height: 100%;
}
.lm_left.lm_dragProxy .lm_header,
.lm_right.lm_dragProxy .lm_header,
.lm_left.lm_dragProxy .lm_items,
.lm_right.lm_dragProxy .lm_items {
  float: left;
}
.lm_left.lm_dragProxy .lm_header,
.lm_right.lm_dragProxy .lm_header,
.lm_left.lm_stack .lm_header,
.lm_right.lm_stack .lm_header {
  width: 20px;
  vertical-align: top;
}
.lm_left.lm_dragProxy .lm_header .lm_tabs,
.lm_right.lm_dragProxy .lm_header .lm_tabs,
.lm_left.lm_stack .lm_header .lm_tabs,
.lm_right.lm_stack .lm_header .lm_tabs {
  transform-origin: left top;
  top: 0;
  width: 1000px;
}
.lm_left.lm_dragProxy .lm_header .lm_controls,
.lm_right.lm_dragProxy .lm_header .lm_controls,
.lm_left.lm_stack .lm_header .lm_controls,
.lm_right.lm_stack .lm_header .lm_controls {
  bottom: 0;
  flex-flow: column;
}
.lm_dragProxy.lm_left .lm_header .lm_tabs,
.lm_stack.lm_left .lm_header .lm_tabs {
  transform: rotate(-90deg) scaleX(-1);
  left: 0;
}
.lm_dragProxy.lm_left .lm_header .lm_tabs .lm_tab,
.lm_stack.lm_left .lm_header .lm_tabs .lm_tab {
  transform: scaleX(-1);
  margin-top: 1px;
}
.lm_dragProxy.lm_right .lm_content {
  float: left;
}
.lm_dragProxy.lm_right .lm_header .lm_tabs,
.lm_stack.lm_right .lm_header .lm_tabs {
  transform: rotate(90deg) scaleX(1);
  left: 100%;
  margin-left: 0;
}
.lm_dragProxy.lm_right .lm_header .lm_controls,
.lm_stack.lm_right .lm_header .lm_controls {
  left: 3px;
}
.lm_dragProxy.lm_bottom .lm_header,
.lm_stack.lm_bottom .lm_header {
  width: 100%;
}
.lm_dragProxy.lm_bottom .lm_header .lm_tab,
.lm_stack.lm_bottom .lm_header .lm_tab {
  margin-top: 0;
  border-top: none;
}
.lm_dragProxy.lm_bottom .lm_header .lm_controls,
.lm_stack.lm_bottom .lm_header .lm_controls {
  top: 3px;
}
.lm_drop_tab_placeholder {
  float: left;
  width: 100px;
  visibility: hidden;
}
.lm_header .lm_controls .lm_tabdropdown:before {
  content: '';
  width: 0;
  height: 0;
  vertical-align: middle;
  display: inline-block;
  border-top: 5px dashed;
  border-right: 5px solid transparent;
  border-left: 5px solid transparent;
  color: white;
}
.lm_header .lm_tabdropdown_list {
  position: absolute;
  top: 20px;
  right: 0;
  z-index: 5;
  overflow: hidden;
}
.lm_header .lm_tabdropdown_list .lm_tab {
  clear: both;
  padding-right: 10px;
  margin: 0;
}
.lm_header .lm_tabdropdown_list .lm_tab .lm_title {
  width: 100px;
}
.lm_header .lm_tabdropdown_list .lm_close_tab {
  display: none !important;
}
.lm_dragProxy {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 30;
}
.lm_dragProxy .lm_header {
  background: transparent;
}
.lm_dragProxy .lm_content {
  border-top: none;
  overflow: hidden;
}
.lm_dropTargetIndicator {
  display: none;
  position: absolute;
  z-index: 35;
  transition: all 200ms ease;
}
.lm_dropTargetIndicator .lm_inner {
  width: 100%;
  height: 100%;
  position: relative;
  top: 0;
  left: 0;
}
.lm_transition_indicator {
  display: none;
  width: 20px;
  height: 20px;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 20;
}
.lm_popin {
  width: 20px;
  height: 20px;
  position: absolute;
  bottom: 0;
  right: 0;
  z-index: 9999;
}
.lm_popin > * {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}
.lm_popin > .lm_bg {
  z-index: 10;
}
.lm_popin > .lm_icon {
  z-index: 20;
}

/* ── Adapted theme (using --gve- CSS variables) ──────────────────────── */
.lm_goldenlayout {
  background: transparent;
}
.lm_content {
  background: var(--gve-bg-color, #fafafa);
  border: none;
}
.lm_dragProxy .lm_content {
  box-shadow: 2px 2px 4px rgba(0,0,0,0.2);
}
.lm_dropTargetIndicator {
  box-shadow: inset 0 0 30px rgba(0,0,0,0.3);
  outline: 1px dashed var(--gve-border-color, #ccc);
}
.lm_dropTargetIndicator .lm_inner {
  background: #000;
  opacity: 0.08;
}
.lm_splitter {
  background: var(--gve-border-color, #ccc);
  opacity: 0.4;
  transition: opacity 200ms ease;
}
.lm_splitter:hover,
.lm_splitter.lm_dragging {
  background: var(--gve-border-color, #aaa);
  opacity: 1;
}
.lm_header {
  height: 26px;
  background: var(--gve-toolbar-bg, #f5f5f5);
  border-bottom: 1px solid var(--gve-border-color, #ddd);
}
.lm_header .lm_tab {
  font-family: Arial, sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--gve-text-secondary, #777);
  background: transparent;
  margin-right: 2px;
  padding: 5px 10px 4px;
  padding-right: 14px;
  border: none;
}
.lm_header .lm_tab .lm_title {
  padding-top: 1px;
}
.lm_header .lm_tab.lm_active {
  background: var(--gve-bg-color, #fff);
  color: var(--gve-text-color, #333);
  border-bottom: 2px solid var(--gve-primary-color, #007bff);
  padding-bottom: 3px;
}
.lm_header .lm_tab:hover {
  color: var(--gve-text-color, #333);
}
.lm_header .lm_controls .lm_tabdropdown:before {
  color: var(--gve-text-color, #333);
}
.lm_transition_indicator {
  background: #000;
  border: 1px dashed #555;
}
.lm_popin {
  cursor: pointer;
}
.lm_popin .lm_bg {
  background: #000;
  opacity: 0.7;
}
`;
