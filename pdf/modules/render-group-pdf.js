'use strict';

const L = require('../layout');
const { totalWidth, breakIfNeeded }              = require('./row-pdf');
const { drawGroupTitle, drawNote }               = require('./table-pdf');
const { renderFixed }                            = require('./render-fixed-pdf');
const { renderChooseOne }                        = require('./render-choose-one-pdf');
const { renderChooseN, chooseNRowCount }          = require('./render-choose-n-pdf');
const { renderChooseNGrouped }                   = require('./render-choose-n-grouped-pdf');
const { renderChooseOneTrack }                   = require('./render-choose-one-track-pdf');
const { renderOpen }                             = require('./render-open-pdf');
const { renderOpenConstrained }                  = require('./render-open-constrained-pdf');
const { renderRepeat }                           = require('./render-repeat-pdf');
const { renderEscrow }                           = require('./render-escrow-pdf');

// Compute blank row count for open/open_constrained groups.
// When minimum_hours is set (credit-hour requirement), derive rows from hours;
// otherwise use count directly. Assumes 3 credit hours per course.
function openRowCount(group) {
  if (group.minimum_hours) return Math.ceil(group.minimum_hours / 3);
  return group.count || 1;
}

// Minimum vertical space to reserve before starting a group:
// group title bar + table header row + at least three data rows.
const MIN_GROUP_SPACE = L.GROUP_TITLE_H + L.TABLE_HDR_H + 3 * L.ROW_H;

// Maximum height of a continuation column — anything taller can never fit on
// a single page, so we fall back to MIN_GROUP_SPACE for those.
// CONTINUATION_Y - MARGIN.bottom = available content height on a fresh page.
const MAX_COL_H = L.PAGE_HEIGHT - L.MARGIN.top - 16 - L.MARGIN.bottom;

function estimateGroupHeight(group) {
  if (group.exempt) return L.GROUP_TITLE_H + 14;
  if (group.fill === 'escrow') return L.ROW_H * 4;

  const base   = L.GROUP_TITLE_H + L.TABLE_HDR_H;
  const noteH  = group.note ? 20 : 0; // buffer for wrapped note text
  switch (group.fill) {
    case 'repeat':         return base + noteH + (group.semesters || 1) * L.ROW_H;
    case 'open':           return base + noteH + openRowCount(group) * L.ROW_H;
    case 'open_constrained': return base + noteH + openRowCount(group) * L.ROW_H + 10;
    case 'choose_one':
    case 'choose_one_set': return base + noteH + (group.options || []).length * L.ROW_H;
    case 'choose_n':       return base + noteH + chooseNRowCount(group) * L.ROW_H;
    case 'fixed':          return base + noteH + (group.slots || []).length * L.ROW_H;
    case 'choose_n_grouped': {
      let rows = 0;
      for (const sg of group.groups || []) {
        rows += 1 + (sg.options || []).length;
      }
      return base + noteH + rows * L.ROW_H;
    }
    case 'choose_one_track': {
      let rows = 0;
      for (const t of group.tracks || []) rows += 1 + (t.slots || []).length;
      return base + noteH + rows * L.ROW_H;
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

module.exports = { renderGroup, estimateGroupHeight };
