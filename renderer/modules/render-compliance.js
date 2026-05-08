'use strict';
const { esc } = require('./utils');

const CATEGORY_LABELS = {
  health:     'Health & Medical',
  background: 'Background Screening',
  licensure:  'Licensure',
  general:    'General',
};

module.exports = function renderCompliance(program) {
  const items = program.compliance_requirements;
  if (!items || !items.length) return '';

  // Group by category, preserving first-seen order.
  const order = [];
  const byCategory = {};
  items.forEach(item => {
    const cat = item.category || 'general';
    if (!byCategory[cat]) { byCategory[cat] = []; order.push(cat); }
    byCategory[cat].push(item);
  });

  const sections = order.map(cat => {
    const label = CATEGORY_LABELS[cat] || cat;
    const checkboxes = byCategory[cat].map(item => `<li>
      <label>
        <input type="checkbox" data-compliance="${esc(item.id)}">
        ${esc(item.title)}
      </label>
    </li>`).join('\n      ');
    return `<div class="compliance-category">
    <h3>${esc(label)}</h3>
    <ul>${checkboxes}</ul>
  </div>`;
  }).join('\n  ');

  return `<div class="compliance-panel">
  <h2>Compliance Requirements</h2>
  <div style="font-size:0.8em;color:var(--gray-text);margin-bottom:8px;">
    Must be satisfied prior to or during clinical/professional coursework.
  </div>
  <div class="compliance-grid">
    ${sections}
  </div>
</div>`;
};
