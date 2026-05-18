'use strict';

const { makeRow, totalWidth, noReqWidths } = require('./row-pdf');
const { drawTableHeaders, drawNote }       = require('./table-pdf');
const { closeTable }                       = require('./render-fixed-pdf');

function renderOpenConstrained(ctx, x, y, widths, group, courseMap, fonts) {
  const count = group.count || 1;
  const w     = noReqWidths(widths);

  if (group.constraint) {
    y = drawNote(ctx.page, x, y, `Constraint: ${group.constraint}`, totalWidth(widths), fonts);
  }

  y = drawTableHeaders(ctx.page, x, y, w, fonts);
  for (let i = 0; i < count; i++) {
    y = makeRow(ctx, x, y, w, `${group.id}.${i}`, '', fonts);
  }
  return closeTable(ctx.page, x, y, w);
}

module.exports = { renderOpenConstrained };
