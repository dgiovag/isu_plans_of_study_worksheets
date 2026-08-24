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
const { estimateGroupHeight }                    = require('./estimate-height');

// Maximum height of a continuation column — anything taller can never fit on
// a single page, so we fall back to MIN_GROUP_SPACE for those.
// CONTINUATION_Y - MARGIN.bottom = available content height on a fresh page.
const MAX_COL_H = L.PAGE_HEIGHT - L.MARGIN.top - 16 - L.MARGIN.bottom;

// Bundles everything group heights depend on, for estimate-height.js.
function heightEnv(ctx, widths, courseMap, fonts) {
  return {
    widths, fonts, courseMap,
    gradFlagsMap:  ctx && ctx.gradFlagsMap,
    xrefCourseIds: ctx && ctx.xrefCourseIds,
  };
}

function renderGroup(ctx, x, y, widths, group, courseMap, fonts) {
  const colW = totalWidth(widths);

  // If the whole group fits on a fresh page, break before the title so the
  // table never splits. If it's too tall to ever fit on one page, fall back
  // to just ensuring title + header + one row aren't orphaned.
  const env     = heightEnv(ctx, widths, courseMap, fonts);
  const neededH = Math.min(estimateGroupHeight(group, env), MAX_COL_H);
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

  // Escrow is excluded: renderEscrow draws group.note itself, inside its block.
  // Drawing it here too rendered the note twice.
  if (group.note && group.fill !== 'escrow') {
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

module.exports = { renderGroup, estimateGroupHeight, heightEnv };
