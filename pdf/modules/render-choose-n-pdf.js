'use strict';

const { makeRow, totalWidth, formatOption } = require('./row-pdf');
const { drawTableHeaders, drawNote } = require('./table-pdf');
const { closeTable } = require('./render-fixed-pdf');

function renderChooseN(ctx, x, y, widths, group, courseMap, fonts) {
  const n    = group.n || 1;
  const colW = totalWidth(widths);

  if (group.options && group.options.length > 0) {
    const optList = group.options.map(o => formatOption(o, courseMap)).join(', ');
    y = drawNote(ctx.page, x, y, `Choose ${n} from: ${optList}`, colW, fonts);
  }

  y = drawTableHeaders(ctx.page, x, y, widths, fonts);

  for (let i = 0; i < n; i++) {
    y = makeRow(ctx, x, y, widths, `${group.id}.${i}`, `Elective #${i + 1}`, fonts);
  }

  return closeTable(ctx.page, x, y, widths);
}

module.exports = { renderChooseN };
