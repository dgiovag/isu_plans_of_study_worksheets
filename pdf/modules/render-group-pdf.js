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

// Maximum height of a continuation column — anything taller can never fit on
// a single page, so we fall back to MIN_GROUP_SPACE for those.
const MAX_COL_H = L.PAGE_HEIGHT - L.MARGIN.bottom - 25; // 25 = continuation header

function estimateGroupHeight(group) {
  if (group.exempt) return L.GROUP_TITLE_H + 14;
  if (group.fill === 'escrow') return L.ROW_H * 4;

  const base = L.GROUP_TITLE_H + L.TABLE_HDR_H;
  switch (group.fill) {
    case 'repeat':         return base + (group.semesters || 1) * L.ROW_H;
    case 'open':           return base + (group.count || 1) * L.ROW_H;
    case 'open_constrained': return base + (group.count || 1) * L.ROW_H + 10;
    case 'choose_one':
    case 'choose_one_set': return base + L.ROW_H;
    case 'choose_n':       return base + (group.n || 1) * L.ROW_H;
    case 'fixed':          return base + (group.slots || []).length * L.ROW_H;
    case 'choose_n_grouped': {
      let rows = 0;
      for (const sg of group.groups || []) {
        rows += 1 + (sg.minimum_picks || (sg.options || []).length || 1);
      }
      return base + rows * L.ROW_H;
    }
    case 'choose_one_track': {
      let rows = 0;
      for (const t of group.tracks || []) rows += 1 + (t.slots || []).length;
      return base + rows * L.ROW_H;
    }
    default: return MIN_GROUP_SPACE;
  }
}

function renderGroup(ctx, x, y, widths, group, courseMap, fonts) {
  const colW = totalWidth(widths);

  // If the whole group fits on a fresh page, break before the title so the
  // table never splits. If it's too tall to ever fit on one page, fall back
  // to just ensuring title + header + one row aren't orphaned.
  const neededH = Math.min(estimateGroupHeight(group), MAX_COL_H);
  y = breakIfNeeded(ctx, y, neededH, fonts);

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
