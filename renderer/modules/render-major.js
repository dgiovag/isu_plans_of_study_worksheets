'use strict';
const { esc } = require('./utils');
const renderGroup = require('./render-group');

module.exports = function renderMajor(program, courseMap) {
  const major = program.major;

  if (major.phases) {
    return major.phases.map(phase => {
      const groupsHTML = (phase.groups || [])
        .map(group => renderGroup(group, courseMap, 'major'))
        .join('\n');
      return `<div class="phase-section">
  <div class="phase-header">${esc(phase.title)}</div>
  ${groupsHTML}
</div>`;
    }).join('\n');
  }

  return (major.groups || [])
    .map(group => renderGroup(group, courseMap, 'major'))
    .join('\n');
};
