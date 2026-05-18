'use strict';

const L = require('../layout');
const { drawSectionTitle, drawNote } = require('./table-pdf');
const { renderGroup }                = require('./render-group-pdf');

function renderCollege(ctx, y, program, courseMap, fonts) {
  const coll = program.college_requirements;
  if (!coll) return y;

  const x    = L.MARGIN.left;
  const colW = L.CONTENT_WIDTH;

  y = drawSectionTitle(ctx.page, x, y, coll.title || 'College Requirements', colW, fonts);

  for (const c of coll.constraints || []) {
    if (c.description) {
      y = drawNote(ctx.page, x, y, `Note: ${c.description}`, colW, fonts);
    }
  }

  for (const group of coll.groups || []) {
    y = renderGroup(ctx, x, y, L.FULL_WIDTHS, group, courseMap, fonts);
    y -= 3;
  }

  return y;
}

module.exports = { renderCollege };
