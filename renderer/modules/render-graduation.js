'use strict';
const { esc } = require('./utils');

// Returns true if a trackable item should appear for this program.
function applies(item, program) {
  if (!item.applies_when) return true;
  const aw = item.applies_when;
  if (aw.degree  && aw.degree  !== program.program.degree)  return false;
  if (aw.college && aw.college !== program.program.college) return false;
  return true;
}

module.exports = function renderGraduation(program) {
  const gr = program.graduation_requirements;
  if (!gr) return '';

  const p = program.program;
  const trackable = (gr.trackable || []).filter(item => applies(item, program));

  const listItems = trackable.map(item => {
    const isAutoFulfilled = item.auto_fulfilled_by && item.auto_fulfilled_by.length > 0;
    const checkedAttr = isAutoFulfilled ? ' checked' : '';
    const itemClass = isAutoFulfilled ? ' class="auto-fulfilled-grad"' : '';
    const note = item.note || '';
    return `<li${itemClass}>
    <input type="checkbox" data-grad="${esc(item.id)}"${checkedAttr}>
    <span class="item-text">
      <strong>${esc(item.title)}</strong>
      ${note ? `<div class="item-note">${esc(note)}</div>` : ''}
    </span>
  </li>`;
  }).join('\n  ');

  const narrativeItems = (gr.narrative || []).map(n =>
    `<p>${esc(n)}</p>`
  ).join('\n      ');

  return `<div class="grad-panel">
  <h2>Graduation Requirements</h2>
  <div style="font-size:0.8em;color:var(--gray-text);margin-bottom:4px;">
    General requirements for all students. Some may be satisfied through Gen Ed and/or major coursework.
  </div>
  <div class="grad-grid">
    <div class="grad-trackable">
      <h3>Trackable Requirements</h3>
      <ul id="grad-list">
        ${listItems}
      </ul>
    </div>
    <div class="grad-narrative">
      <h3>Notes &amp; Conditional Requirements</h3>
      ${narrativeItems}
      <p style="font-size:0.85em;color:var(--gray-text);margin-top:8px;">
        Students may apply for and receive two bachelor's degrees simultaneously.
        Refer to Academic Policies and Practices in the catalog for details.
      </p>
    </div>
  </div>
</div>`;
};
