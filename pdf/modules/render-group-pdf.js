'use strict';

const L = require('../layout');
const { totalWidth, breakIfNeeded }              = require('./row-pdf');
const { drawGroupTitle, drawNote }               = require('./table-pdf');
const { renderFixed }                            = require('./render-fixed-pdf');
const { renderChooseOne }                        = require('./render-choose-one-pdf');
const { renderChooseN }                          = require('./render-choose-n-pdf');
const { renderChooseNGrouped }                   = require('./render-choose-n-grouped-pdf');
const { renderChooseOneTrack }                   = require('./render-choose-one-track-pdf');
const { renderOpen }                             = require('./render-open-pdf');
const { renderOpenConstrained }                  = require('./render-open-constrained-pdf');
const { renderRepeat }                           = require('./render-repeat-pdf');
const { renderEscrow }                           = require('./render-escrow-pdf');

// Minimum vertical space to reserve before starting a group:
// group title bar + table header row + at least one data row.
const MIN_GROUP_SPACE = L.GROUP_TITLE_H + L.TABLE_HDR_H + L.ROW_H;

function renderGroup(ctx, x, y, widths, group, courseMap, fonts) {
  const colW = totalWidth(widths);

  // Ensure there is room for at least the title + header + one row before
  // committing to this page; otherwise start a fresh continuation page.
  y = breakIfNeeded(ctx, y, MIN_GROUP_SPACE, fonts);

  if (group.exempt) {
    y = drawGroupTitle(ctx.page, x, y, group.title, colW, fonts);
    ctx.page.drawText('EXEMPT — satisfied by major coursework', {
      x: x + 4, y: y - 10,
      size: L.FONT.footnote, font: fonts.reg, color: L.GRAY_TEXT,
    });
    return y - 14;
  }

  if (group.fill !== 'escrow') {
    y = drawGroupTitle(ctx.page, x, y, group.title, colW, fonts);
  }

  if (group.note) {
    y = drawNote(ctx.page, x, y, group.note, colW, fonts);
  }

  switch (group.fill) {
    case 'fixed':            return renderFixed(ctx, x, y, widths, group, courseMap, fonts);
    case 'choose_one':
    case 'choose_one_set':   return renderChooseOne(ctx, x, y, widths, group, courseMap, fonts);
    case 'choose_n':         return renderChooseN(ctx, x, y, widths, group, courseMap, fonts);
    case 'choose_n_grouped': return renderChooseNGrouped(ctx, x, y, widths, group, courseMap, fonts);
    case 'choose_one_track': return renderChooseOneTrack(ctx, x, y, widths, group, courseMap, fonts);
    case 'open':             return renderOpen(ctx, x, y, widths, group, courseMap, fonts);
    case 'open_constrained': return renderOpenConstrained(ctx, x, y, widths, group, courseMap, fonts);
    case 'repeat':           return renderRepeat(ctx, x, y, widths, group, courseMap, fonts);
    case 'escrow':           return renderEscrow(ctx, x, y, widths, group, courseMap, fonts);
    default:                 return renderUnknown(ctx.page, x, y, widths, group.fill, fonts);
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
