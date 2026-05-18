'use strict';

const L = require('../layout');
const { totalWidth } = require('./row-pdf');
const { drawGroupTitle, drawNote }           = require('./table-pdf');
const { renderFixed }                        = require('./render-fixed-pdf');
const { renderChooseOne }                    = require('./render-choose-one-pdf');
const { renderChooseN }                      = require('./render-choose-n-pdf');
const { renderChooseNGrouped }               = require('./render-choose-n-grouped-pdf');
const { renderChooseOneTrack }               = require('./render-choose-one-track-pdf');
const { renderOpen }                         = require('./render-open-pdf');
const { renderOpenConstrained }              = require('./render-open-constrained-pdf');
const { renderRepeat }                       = require('./render-repeat-pdf');
const { renderEscrow }                       = require('./render-escrow-pdf');

/**
 * Dispatches a group to its fill-type renderer.
 * Returns the y coordinate after the group.
 */
function renderGroup(page, form, x, y, widths, group, courseMap, fonts) {
  const colW = totalWidth(widths);

  // Exempt groups: gray title bar, no interactive rows
  if (group.exempt) {
    y = drawGroupTitle(page, x, y, group.title, colW, fonts);
    page.drawText('EXEMPT — satisfied by major coursework', {
      x: x + 4, y: y - 10,
      size: L.FONT.footnote, font: fonts.reg, color: L.GRAY_TEXT,
    });
    return y - 14;
  }

  // Escrow has its own header — skip drawGroupTitle
  if (group.fill !== 'escrow') {
    y = drawGroupTitle(page, x, y, group.title, colW, fonts);
  }

  if (group.note) {
    y = drawNote(page, x, y, group.note, colW, fonts);
  }

  switch (group.fill) {
    case 'fixed':
      return renderFixed(page, form, x, y, widths, group, courseMap, fonts);
    case 'choose_one':
    case 'choose_one_set':
      return renderChooseOne(page, form, x, y, widths, group, courseMap, fonts);
    case 'choose_n':
      return renderChooseN(page, form, x, y, widths, group, courseMap, fonts);
    case 'choose_n_grouped':
      return renderChooseNGrouped(page, form, x, y, widths, group, courseMap, fonts);
    case 'choose_one_track':
      return renderChooseOneTrack(page, form, x, y, widths, group, courseMap, fonts);
    case 'open':
      return renderOpen(page, form, x, y, widths, group, courseMap, fonts);
    case 'open_constrained':
      return renderOpenConstrained(page, form, x, y, widths, group, courseMap, fonts);
    case 'repeat':
      return renderRepeat(page, form, x, y, widths, group, courseMap, fonts);
    case 'escrow':
      return renderEscrow(page, form, x, y, widths, group, courseMap, fonts);
    default:
      return renderUnknown(page, x, y, widths, group.fill, fonts);
  }
}

function renderUnknown(page, x, y, widths, fillType, fonts) {
  const colW = totalWidth(widths);
  page.drawRectangle({ x, y: y - 14, width: colW, height: 14, color: L.YELLOW_BG });
  page.drawText(`[ unknown fill type: ${fillType} ]`, {
    x: x + 4, y: y - 10,
    size: L.FONT.footnote, font: fonts.reg, color: L.GRAY_TEXT,
  });
  return y - 14;
}

module.exports = { renderGroup };
