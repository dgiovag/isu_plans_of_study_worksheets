'use strict';
const { esc } = require('./utils');
const renderGroup = require('./render-group');

module.exports = function renderCollege(program, courseMap) {
  const cr = program.college_requirements;
  if (!cr) return '';

  const groupsHTML = (cr.groups || [])
    .map(group => renderGroup(group, courseMap, 'college'))
    .join('\n');

  return `<div class="college-panel">
  <h2>${esc(cr.title)}</h2>
  ${groupsHTML}
</div>`;
};
