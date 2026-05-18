'use strict';

const { makeRow, totalWidth, formatOption } = require('./row-pdf');
const { drawTableHeaders } = require('./table-pdf');
const { closeTable } = require('./render-fixed-pdf');

function renderChooseOne(page, form, x, y, widths, group, courseMap, fonts) {
  y = drawTableHeaders(page, x, y, widths, fonts);
  const label = (group.options || []).map(o => formatOption(o, courseMap)).join(' or ');
  y = makeRow(page, form, x, y, widths, group.id, label, fonts);
  return closeTable(page, x, y, widths);
}

module.exports = { renderChooseOne };
