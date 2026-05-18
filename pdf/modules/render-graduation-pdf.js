'use strict';

const L = require('../layout');
const { breakIfNeeded, sanitizeId } = require('./row-pdf');
const { drawSectionTitle }                    = require('./table-pdf');

const CHECK_W  = 10;
// Notes are only shown when there is enough horizontal room (full-width mode).
const NOTE_MIN_WIDTH = 400;
const TITLE_W  = 270; // space reserved for title before the note column

function renderGraduation(ctx, x, y, colWidth, program, fonts) {
  const grad = program.graduation_requirements;
  if (!grad) return y;

  const showNotes = colWidth >= NOTE_MIN_WIDTH;

  y = drawSectionTitle(ctx.page, x, y, 'Graduation Requirements', colWidth, fonts);

  // Top border for the item list
  ctx.page.drawLine({
    start: { x, y }, end: { x: x + colWidth, y },
    thickness: 0.4, color: L.GRAY_BORDER,
  });

  for (const item of grad.trackable || []) {
    y = breakIfNeeded(ctx, y, L.ROW_H, fonts);
    const bot = y - L.ROW_H;
    const { page, form } = ctx;

    page.drawLine({
      start: { x, y: bot }, end: { x: x + colWidth, y: bot },
      thickness: 0.3, color: L.GRAY_BORDER,
    });

    const cbSize = 9;
    const cbY    = bot + (L.ROW_H - cbSize) / 2;
    const cb = form.createCheckBox(sanitizeId(`grad_${item.id}`) + '_check');
    cb.addToPage(page, {
      x: x + 1, y: cbY, width: cbSize, height: cbSize,
      borderWidth: 0.5, borderColor: L.GRAY_BORDER, backgroundColor: L.WHITE,
    });

    const textY = y - L.FONT.tableBody - 1.5;
    page.drawText(item.title, {
      x: x + CHECK_W + 2, y: textY,
      size: L.FONT.tableBody, font: fonts.bold, color: L.BLACK,
    });

    if (showNotes && item.note) {
      page.drawText(item.note, {
        x: x + CHECK_W + 2 + TITLE_W, y: textY,
        size: L.FONT.footnote, font: fonts.reg, color: L.GRAY_TEXT,
      });
    }

    y = bot;
  }

  return y - 6;
}

module.exports = { renderGraduation };
