'use strict';

const L = require('../layout');
const { breakIfNeeded, sanitizeId, wrapText } = require('./row-pdf');
const { drawSectionTitle }                    = require('./table-pdf');

const CHECK_W = 10;
const TITLE_W = 270;

function renderGraduation(ctx, y, program, fonts) {
  const x    = L.MARGIN.left;
  const colW = L.CONTENT_WIDTH;
  const grad = program.graduation_requirements;
  if (!grad) return y;

  y = drawSectionTitle(ctx.page, x, y, 'Graduation Requirements', colW, fonts);

  // Top border for the item list
  ctx.page.drawLine({
    start: { x, y }, end: { x: x + colW, y },
    thickness: 0.4, color: L.GRAY_BORDER,
  });

  for (const item of grad.trackable || []) {
    y = breakIfNeeded(ctx, y, L.ROW_H, fonts);
    const bot = y - L.ROW_H;
    const { page, form } = ctx;

    page.drawLine({
      start: { x, y: bot }, end: { x: x + colW, y: bot },
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

    if (item.note) {
      page.drawText(item.note, {
        x: x + CHECK_W + 2 + TITLE_W, y: textY,
        size: L.FONT.footnote, font: fonts.reg, color: L.GRAY_TEXT,
      });
    }

    y = bot;
  }

  // Narrative paragraphs
  const lineH = L.FONT.footnote + 2.5;
  for (const para of grad.narrative || []) {
    const lines = wrapText(fonts.reg, para, L.FONT.footnote, colW - 8);
    y -= 4;
    for (const line of lines) {
      y = breakIfNeeded(ctx, y, lineH, fonts);
      y -= lineH;
      ctx.page.drawText(line, {
        x: x + 4, y,
        size: L.FONT.footnote, font: fonts.reg, color: L.GRAY_TEXT,
      });
    }
  }

  return y - 6;
}

module.exports = { renderGraduation };
