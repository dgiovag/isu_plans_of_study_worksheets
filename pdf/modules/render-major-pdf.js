'use strict';

const L = require('../layout');
const { drawSectionTitle } = require('./table-pdf');
const { renderGroup }      = require('./render-group-pdf');

function renderMajor(ctx, y, program, courseMap, fonts) {
  const x      = L.MARGIN.left + L.COL_LEFT_WIDTH + L.COL_GAP;
  const widths = L.COL_WIDTHS.right;

  y = drawSectionTitle(ctx.page, x, y, program.major.title || 'Major Requirements', L.COL_RIGHT_WIDTH, fonts);

  for (const group of flattenMajorGroups(program.major)) {
    y = renderGroup(ctx, x, y, widths, group, courseMap, fonts);
    y -= 3;
  }

  return y;
}

function flattenMajorGroups(major) {
  if (major.phases && major.phases.length > 0) {
    return major.phases.flatMap(phase => phase.groups || []);
  }
  return major.groups || [];
}

module.exports = { renderMajor };
