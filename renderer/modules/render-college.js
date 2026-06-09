'use strict';
const { esc } = require('./utils');
const renderGroup = require('./render-group');

module.exports = function renderCollege(program, courseMap) {
  const cr = program.college_requirements;
  if (!cr) return '';

  const constraintsHTML = (cr.constraints || [])
    .filter(c => c.description)
    .map(c => `<p class="college-constraint-note">${esc(c.description)}</p>`)
    .join('\n  ');

  const groupsHTML = (cr.groups || [])
    .map(group => renderGroup(group, courseMap, 'college'))
    .join('\n');

  return `<div class="college-panel">
  <h2>${esc(cr.title)}</h2>
  ${constraintsHTML}
  ${groupsHTML}
</div>`;
};
