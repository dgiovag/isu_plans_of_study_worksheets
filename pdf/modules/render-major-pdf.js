'use strict';

const L = require('../layout');
const { drawSectionTitle } = require('./table-pdf');
const { renderGroup } = require('./render-group-pdf');

/**
 * Renders the full major column (right column).
 * Returns the y coordinate after all content.
 */
function renderMajor(page, form, y, program, courseMap, fonts) {
  const x = L.MARGIN.left + L.COL_LEFT_WIDTH + L.COL_GAP;
  const widths = L.COL_WIDTHS.right;

  y = drawSectionTitle(page, x, y, program.major.title || 'Major Requirements', L.COL_RIGHT_WIDTH, fonts);

  const groups = flattenMajorGroups(program.major);
  for (const group of groups) {
    y = renderGroup(page, form, x, y, widths, group, courseMap, fonts);
    y -= 3; // gap between groups
  }

  return y;
}

// Handles phased programs (nursing) and flat programs.
function flattenMajorGroups(major) {
  if (major.phases && major.phases.length > 0) {
    return major.phases.flatMap(phase => phase.groups || []);
  }
  return major.groups || [];
}

module.exports = { renderMajor };
