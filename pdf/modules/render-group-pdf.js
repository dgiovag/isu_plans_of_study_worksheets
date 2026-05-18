'use strict';

const { totalWidth } = require('./row-pdf');
const { drawGroupTitle, drawNote } = require('./table-pdf');
const { renderFixed } = require('./render-fixed-pdf');
const L = require('../layout');

/**
 * Dispatches a group to its fill-type renderer.
 * Returns the y coordinate after the group.
 */
function renderGroup(page, form, x, y, widths, group, courseMap, fonts) {
  const colW = totalWidth(widths);

  // Exempt groups: gray title bar only, no interactive rows
  if (group.exempt) {
    y = drawGroupTitle(page, x, y, group.title, colW, fonts);
    page.drawText('EXEMPT — satisfied by major coursework', {
      x: x + 4, y: y - 10,
      size: L.FONT.footnote, font: fonts.reg, color: L.GRAY_TEXT,
    });
    return y - 14;
  }

  y = drawGroupTitle(page, x, y, group.title, colW, fonts);

  if (group.note) {
    y = drawNote(page, x, y, group.note, colW, fonts);
  }

  switch (group.fill) {
    case 'fixed':
      y = renderFixed(page, form, x, y, widths, group, courseMap, fonts);
      break;

    // Stubs for fill types implemented in Chunk 4
    default:
      y = renderStub(page, x, y, widths, group.fill, fonts);
  }

  return y;
}

function renderStub(page, x, y, widths, fillType, fonts) {
  const colW = totalWidth(widths);
  page.drawRectangle({ x, y: y - 14, width: colW, height: 14, color: L.YELLOW_BG });
  page.drawText(`[ ${fillType} — coming in Chunk 4 ]`, {
    x: x + 4, y: y - 10,
    size: L.FONT.footnote, font: fonts.reg, color: L.GRAY_TEXT,
  });
  return y - 14;
}

module.exports = { renderGroup };
