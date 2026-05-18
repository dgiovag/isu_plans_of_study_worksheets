'use strict';

const { makeRow, totalWidth } = require('./row-pdf');
const { drawTableHeaders, drawNote } = require('./table-pdf');
const { closeTable } = require('./render-fixed-pdf');

function renderOpenConstrained(ctx, x, y, widths, group, courseMap, fonts) {
  const count = group.count || 1;
  const colW  = totalWidth(widths);

  if (group.constraint) {
    y = drawNote(ctx.page, x, y, `Constraint: ${group.constraint}`, colW, fonts);
  }

  y = drawTableHeaders(ctx.page, x, y, widths, fonts);
  for (let i = 0; i < count; i++) {
    y = makeRow(ctx, x, y, widths, `${group.id}.${i}`, `Elective #${i + 1}`, fonts);
  }
  return closeTable(ctx.page, x, y, widths);
}

module.exports = { renderOpenConstrained };
