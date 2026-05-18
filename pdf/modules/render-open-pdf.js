'use strict';

const { makeRow, noReqWidths } = require('./row-pdf');
const { drawTableHeaders }     = require('./table-pdf');
const { closeTable }           = require('./render-fixed-pdf');

function renderOpen(ctx, x, y, widths, group, courseMap, fonts) {
  const count = group.count || 1;
  const w     = noReqWidths(widths);

  y = drawTableHeaders(ctx.page, x, y, w, fonts);
  for (let i = 0; i < count; i++) {
    y = makeRow(ctx, x, y, w, `${group.id}.${i}`, '', fonts);
  }
  return closeTable(ctx.page, x, y, w);
}

module.exports = { renderOpen };
