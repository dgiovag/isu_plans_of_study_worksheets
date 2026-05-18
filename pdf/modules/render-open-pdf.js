'use strict';

const { makeRow } = require('./row-pdf');
const { drawTableHeaders } = require('./table-pdf');
const { closeTable } = require('./render-fixed-pdf');

function renderOpen(page, form, x, y, widths, group, courseMap, fonts) {
  const count = group.count || 1;
  y = drawTableHeaders(page, x, y, widths, fonts);
  for (let i = 0; i < count; i++) {
    y = makeRow(page, form, x, y, widths, `${group.id}.${i}`, `Open Elective #${i + 1}`, fonts);
  }
  return closeTable(page, x, y, widths);
}

module.exports = { renderOpen };
