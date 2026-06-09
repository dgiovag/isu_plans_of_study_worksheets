'use strict';
module.exports = `
:root {
  --red: #CE1126;
  --gray-bg: #f4f4f4;
  --gray-border: #d0d0d0;
  --gray-text: #555;
}
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
  margin: 0;
  padding: 20px;
  background: var(--gray-bg);
  color: #222;
}
header { max-width: 1400px; margin: 0 auto 16px; }
.disclaimer {
  font-size: 0.78rem;
  color: #555;
  background: #f9f9f6;
  border-top: 1px solid #ddd;
  border-bottom: 1px solid #ddd;
  padding: 0.45rem 1.2rem;
  margin: 0 auto 12px;
  max-width: 1400px;
}
.disclaimer a { color: inherit; text-decoration: underline; }
h1 {
  margin: 0 0 4px;
  color: var(--red);
  font-size: 1.4em;
}
.subtitle {
  color: var(--gray-text);
  font-size: 0.9em;
  margin-bottom: 12px;
}
.summary {
  background: white;
  border: 1px solid var(--gray-border);
  border-radius: 4px;
  padding: 10px 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  font-size: 0.9em;
  align-items: center;
}
.summary strong { color: var(--red); }
.controls {
  margin-left: auto;
  display: flex;
  gap: 8px;
  font-size: 0.85em;
}
.controls button {
  padding: 4px 10px;
  border: 1px solid var(--gray-border);
  background: white;
  cursor: pointer;
  border-radius: 3px;
}
.controls button:hover { background: #f0f0f0; }

.student-info, .track-selector {
  max-width: 1400px;
  margin: 0 auto 12px;
  background: white;
  border: 1px solid var(--gray-border);
  border-radius: 4px;
  padding: 10px 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 0.85em;
  align-items: center;
}
.student-info label, .track-selector label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--gray-text);
}
.student-info input, .track-selector input {
  padding: 3px 6px;
  border: 1px solid var(--gray-border);
  border-radius: 3px;
  font-family: inherit;
  font-size: 0.95em;
}
.track-selector .track-label {
  font-weight: 600;
  color: #222;
  margin-right: 4px;
}
.track-selector .radio-group {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}
.track-selector .radio-group label {
  color: #222;
  cursor: pointer;
}
#associates-detail {
  width: 100%;
  display: none;
  padding-top: 8px;
  border-top: 1px dashed var(--gray-border);
  margin-top: 4px;
  gap: 14px;
  flex-wrap: wrap;
}
#associates-detail.active { display: flex; }

.columns {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.columns--single { grid-template-columns: 1fr; }
@media (max-width: 1100px) {
  .columns { grid-template-columns: 1fr; }
}
.column {
  background: white;
  border: 1px solid var(--gray-border);
  border-radius: 4px;
  padding: 14px;
}
.column h2 {
  margin: 0 0 4px;
  font-size: 1.1em;
  color: var(--red);
  border-bottom: 2px solid var(--red);
  padding-bottom: 4px;
}
.column .col-meta {
  font-size: 0.8em;
  color: var(--gray-text);
  margin-bottom: 10px;
}
.track-panel { display: none; }
.track-panel.active { display: block; }
.associates-panel-content {
  background: #f7faff;
  border: 1px dashed #b0c8de;
  padding: 12px;
  border-radius: 4px;
  margin-top: 10px;
  font-size: 0.9em;
  line-height: 1.5;
}
.associates-panel-content strong { color: var(--red); }

.group {
  margin-top: 12px;
  page-break-inside: avoid;
  break-inside: avoid;
}
.group-label {
  font-weight: 600;
  font-size: 0.85em;
  color: #333;
  margin-bottom: 4px;
  background: #efefef;
  padding: 4px 6px;
  border-left: 3px solid var(--red);
}
.group-note {
  font-size: 0.75em;
  color: var(--gray-text);
  font-style: italic;
  font-weight: normal;
  margin-left: 6px;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82em;
  table-layout: fixed;
}
th, td {
  text-align: left;
  padding: 4px 5px;
  border-bottom: 1px solid #eee;
  vertical-align: middle;
}
th {
  font-weight: 600;
  font-size: 0.72em;
  text-transform: uppercase;
  color: var(--gray-text);
}
td.req { white-space: normal; }
.req-code { font-weight: 600; }
.req-desc { color: var(--gray-text); font-size: 0.85em; }
input[type="text"] {
  width: 100%;
  padding: 3px 4px;
  border: 1px solid var(--gray-border);
  border-radius: 3px;
  font-size: 0.9em;
  font-family: inherit;
}
select {
  width: 100%;
  padding: 2px 2px;
  border: 1px solid var(--gray-border);
  border-radius: 3px;
  font-size: 0.85em;
  background: white;
  font-family: inherit;
}
tr.completed { background: #eaf5ec; }
tr.in-progress { background: #fdf6e3; }
tr.transferred-row { background: #eef4fb; }

.col-check { width: 22px; text-align: center; }
.col-req { width: auto; }
.col-hrs { width: 38px; text-align: center; }
.col-hrs input { text-align: center; padding: 2px 2px; }
.col-hrs input[readonly] { background: transparent; border-color: transparent; cursor: default; }
.col-course { width: 80px; }
.col-grade { width: 42px; }
.col-term { width: 80px; }
.col-status { width: 100px; }

tr.transfer-detail td {
  border-bottom: 1px solid #eee;
  padding: 2px 5px 6px;
  background: #f7faff;
}

/* === Graduation requirements panel === */
.grad-panel {
  max-width: 1400px;
  margin: 16px auto 0;
  background: white;
  border: 1px solid var(--gray-border);
  border-radius: 4px;
  padding: 14px;
}
.grad-panel h2 {
  margin: 0 0 8px;
  font-size: 1.1em;
  color: var(--red);
  border-bottom: 2px solid var(--red);
  padding-bottom: 4px;
}
.grad-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 10px;
}
@media (max-width: 800px) { .grad-grid { grid-template-columns: 1fr; } }
.grad-trackable, .grad-narrative {
  font-size: 0.85em;
}
.grad-trackable h3, .grad-narrative h3 {
  margin: 0 0 6px;
  font-size: 0.85em;
  text-transform: uppercase;
  color: var(--gray-text);
  letter-spacing: 0.03em;
}
.grad-trackable ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.grad-trackable li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid #f0f0f0;
}
.grad-trackable li:last-child { border-bottom: none; }
.grad-trackable input[type="checkbox"] { margin-top: 3px; }
.grad-trackable .item-text { flex: 1; }
.grad-trackable .item-note {
  color: var(--gray-text);
  font-size: 0.9em;
  font-style: italic;
}
.grad-narrative p {
  margin: 0 0 6px;
  color: #333;
  line-height: 1.45;
}
.grad-narrative .ba-bs-conditional {
  background: #f7faff;
  border-left: 3px solid #b0c8de;
  padding: 6px 10px;
  margin-top: 6px;
}

/* === Completion layout === */
.completion-notice {
  max-width: 1400px;
  margin: 0 auto 12px;
  background: #f7faff;
  border: 1px dashed #b0c8de;
  border-radius: 4px;
  padding: 10px 14px;
  font-size: 0.9em;
}

/* === Phase headers === */
.phase-section { margin-top: 16px; }
.phase-header {
  font-weight: 700;
  font-size: 0.9em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #fff;
  background: var(--red);
  padding: 4px 8px;
  margin-bottom: 4px;
}

/* === Auto-fulfilled and exempt rows === */
tr.auto-fulfilled { opacity: 0.55; }
tr.auto-fulfilled td { font-style: italic; }
tr.exempt { opacity: 0.6; background: #f8f8f8; }

/* === choose_n_grouped sub-group header row === */
tr.sub-group-header td {
  background: #e8e8e8;
  font-size: 0.8em;
  padding: 3px 6px;
  border-bottom: 1px solid #ccc;
  color: #333;
}

/* === Escrow block === */
.escrow-block {
  background: #fffbe6;
  border: 1px dashed #c9a800;
  border-radius: 4px;
  padding: 10px 12px;
  margin-top: 8px;
  font-size: 0.85em;
  line-height: 1.5;
}

/* === College and compliance panels === */
.college-panel, .compliance-panel {
  max-width: 1400px;
  margin: 16px auto 0;
  background: white;
  border: 1px solid var(--gray-border);
  border-radius: 4px;
  padding: 14px;
}
.college-panel h2, .compliance-panel h2 {
  margin: 0 0 8px;
  font-size: 1.1em;
  color: var(--red);
  border-bottom: 2px solid var(--red);
  padding-bottom: 4px;
}
.college-constraint-note {
  font-size: 0.8em;
  color: var(--gray-text);
  font-style: italic;
  margin: 0 0 8px;
}
.compliance-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 8px;
}
.compliance-category {
  flex: 1 1 200px;
  font-size: 0.85em;
}
.compliance-category h3 {
  margin: 0 0 4px;
  font-size: 0.82em;
  text-transform: uppercase;
  color: var(--gray-text);
  letter-spacing: 0.03em;
}
.compliance-category ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.compliance-category li {
  padding: 3px 0;
  border-bottom: 1px solid #f0f0f0;
}
.compliance-category li:last-child { border-bottom: none; }
.compliance-category label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

/* === Auto-fulfilled graduation checkboxes === */
li.auto-fulfilled-grad {
  opacity: 0.6;
}
li.auto-fulfilled-grad .item-text { font-style: italic; }

/* === choose_one_track sub-panels within major === */
.track-sub-selector {
  font-size: 0.82em;
  margin-bottom: 8px;
  padding: 6px 8px;
  background: #f0f0f0;
  border-radius: 3px;
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  align-items: center;
}
.track-sub-panel { display: none; }
.track-sub-panel.active { display: block; }

/* === Co-requisite badge === */
.corequired-badge {
  font-size: 0.75em;
  color: #666;
  font-style: italic;
  margin-left: 4px;
}

/* ================= PRINT ================= */
@media print {
  @page { size: letter landscape; margin: 0.4in; }
  body { background: white; padding: 0; font-size: 9pt; }
  header, .student-info, .track-selector, .columns, .grad-panel,
  .college-panel, .compliance-panel { max-width: none; }
  .controls, button { display: none !important; }
  h1 { color: black; font-size: 13pt; margin-bottom: 2px; }
  .subtitle { font-size: 8pt; margin-bottom: 6px; }
  .summary, .student-info, .track-selector, .grad-panel,
  .college-panel, .compliance-panel {
    border: 1px solid #999;
    padding: 4px 8px;
    font-size: 8pt;
    page-break-inside: avoid;
  }
  .summary strong { color: black; }
  .student-info input, .track-selector input {
    border: none;
    border-bottom: 1px solid #666;
    border-radius: 0;
    background: transparent;
  }
  .track-panel:not(.active) { display: none !important; }
  .track-selector .radio-group label { display: none; }
  .track-selector .radio-group label.selected-print {
    display: inline-block;
    font-weight: 600;
  }
  .track-selector .radio-group input[type="radio"] { display: none; }

  .columns { gap: 10px; }
  .column {
    border: 1px solid #999;
    padding: 8px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .column h2 { color: black; border-bottom: 1.5pt solid black; font-size: 10pt; }
  .group {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .group-label {
    background: white;
    border-left: 2px solid black;
    border-bottom: 1px solid #999;
    padding: 2px 4px;
    font-size: 8.5pt;
  }
  .phase-section { break-inside: avoid; page-break-inside: avoid; }
  .phase-header { background: #555; font-size: 8pt; }
  table { font-size: 8pt; }
  th { font-size: 6.5pt; border-bottom: 1px solid #666; }
  td { padding: 2px 3px; }
  tr.completed, tr.in-progress, tr.transferred-row { background: white !important; }
  tr.auto-fulfilled { opacity: 1; }
  tr.sub-group-header td { background: #ddd; font-size: 7pt; }
  /* Hide sub-track radio selectors; only show active panel */
  .track-sub-selector { display: none; }
  .track-sub-panel:not(.active) { display: none !important; }
  li.auto-fulfilled-grad { opacity: 1; }
  .compliance-grid { flex-direction: row; gap: 8px; }
  .compliance-category { font-size: 7.5pt; }
  input[type="checkbox"] {
    appearance: none;
    -webkit-appearance: none;
    width: 10pt;
    height: 10pt;
    border: 1px solid black;
    border-radius: 0;
    background: white;
    vertical-align: middle;
    position: relative;
  }
  input[type="checkbox"]:checked::after {
    content: "✓";
    position: absolute;
    top: -3pt;
    left: 0.5pt;
    font-size: 11pt;
    font-weight: bold;
    color: black;
  }
  input[type="text"] {
    border: none;
    border-bottom: 1px solid #999;
    border-radius: 0;
    padding: 0 2px;
    background: transparent;
  }
  select {
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    border: none;
    border-bottom: 1px solid #999;
    border-radius: 0;
    padding: 0 2px;
    background: transparent;
    color: black;
  }
  select::-ms-expand { display: none; }
  tr.transfer-detail td { background: white !important; border-bottom: 1px solid #ddd; }
  .associates-panel-content {
    background: white;
    border: 1px solid #999;
  }
  .grad-panel h2, .college-panel h2, .compliance-panel h2 {
    color: black;
    border-bottom: 1.5pt solid black;
    font-size: 10pt;
  }
  .grad-narrative .ba-bs-conditional { background: white; border-left: 2px solid #666; }
  .completion-notice { background: white; border: 1px solid #999; }
  .track-sub-panel:not(.active) { display: none !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;
