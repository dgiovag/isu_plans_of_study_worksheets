'use strict';

const { makeRow } = require('./row-pdf');
const { drawTableHeaders } = require('./table-pdf');
const { closeTable } = require('./render-fixed-pdf');

function renderOpen(ctx, x, y, widths, group, courseMap, fonts) {
  const count = group.count || 1;
  y = drawTableHeaders(ctx.page, x, y, widths, fonts);
  for (let i = 0; i < count; i++) {
    y = makeRow(ctx, x, y, widths, `${group.id}.${i}`, `Open Elective #${i + 1}`, fonts);
  }
  return closeTable(ctx.page, x, y, widths);
}

module.exports = { renderOpen };
