'use strict';

const { makeRow, totalWidth } = require('./row-pdf');
const { drawTableHeaders, drawNote } = require('./table-pdf');
const { closeTable } = require('./render-fixed-pdf');

function renderOpenConstrained(page, form, x, y, widths, group, courseMap, fonts) {
  const count = group.count || 1;
  const colW  = totalWidth(widths);

  if (group.constraint) {
    y = drawNote(page, x, y, `Constraint: ${group.constraint}`, colW, fonts);
  }

  y = drawTableHeaders(page, x, y, widths, fonts);
  for (let i = 0; i < count; i++) {
    y = makeRow(page, form, x, y, widths, `${group.id}.${i}`, `Elective #${i + 1}`, fonts);
  }
  return closeTable(page, x, y, widths);
}

module.exports = { renderOpenConstrained };
