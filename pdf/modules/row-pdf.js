'use strict';

const L = require('../layout');

/**
 * Draws one worksheet row (checkbox + label + course/grade/term fields).
 *
 * @param {PDFPage}  page
 * @param {PDFForm}  form
 * @param {number}   x       left edge of column
 * @param {number}   y       top of row (pdf-lib coords: y=0 at bottom)
 * @param {object}   widths  COL_WIDTHS.left or COL_WIDTHS.right
 * @param {string}   rowId   unique AcroForm field name prefix
 * @param {string}   label   text shown in the requirement column
 * @param {object}   fonts   { reg, bold }
 * @param {object}   opts    { preChecked, exempt, autoFulfilled }
 * @returns {number}         y coordinate below this row
 */
function makeRow(page, form, x, y, widths, rowId, label, fonts, opts = {}) {
  const bot = y - L.ROW_H;
  const colW = totalWidth(widths);
  const textY = bot + 4;

  if (opts.exempt) {
    page.drawRectangle({ x, y: bot, width: colW, height: L.ROW_H, color: L.GRAY_BG });
  }

  // Bottom separator
  page.drawLine({
    start: { x, y: bot }, end: { x: x + colW, y: bot },
    thickness: 0.3, color: L.GRAY_BORDER,
  });

  // Checkbox or exempt indicator
  const cbSize = L.ROW_H - 4;
  if (opts.exempt) {
    page.drawRectangle({ x: x + 1, y: bot + 2, width: cbSize, height: cbSize, color: L.GRAY_BORDER });
  } else {
    const cb = form.createCheckBox(sanitizeId(rowId) + '_check');
    if (opts.preChecked) cb.check();
    cb.addToPage(page, {
      x: x + 1, y: bot + 2, width: cbSize, height: cbSize,
      borderWidth: 0.5, borderColor: L.GRAY_BORDER, backgroundColor: L.WHITE,
    });
  }

  // Requirement label (clipped to column width)
  const clipped = clipText(fonts.reg, label, L.FONT.tableBody, widths.req - 3);
  page.drawText(clipped, {
    x: x + widths.check + 2, y: textY,
    size: L.FONT.tableBody, font: fonts.reg,
    color: opts.exempt ? L.GRAY_TEXT : L.BLACK,
  });

  // Interactive fields (not on exempt rows)
  if (!opts.exempt) {
    const courseX = x + widths.check + widths.req;

    const tf = form.createTextField(sanitizeId(rowId) + '_course');
    tf.addToPage(page, {
      x: courseX, y: bot + 1, width: widths.course - 1, height: L.ROW_H - 2,
      borderWidth: 0.3, borderColor: L.GRAY_BORDER, backgroundColor: L.WHITE,
    });

    const gf = form.createTextField(sanitizeId(rowId) + '_grade');
    gf.addToPage(page, {
      x: courseX + widths.course, y: bot + 1, width: widths.grade - 1, height: L.ROW_H - 2,
      borderWidth: 0.3, borderColor: L.GRAY_BORDER, backgroundColor: L.WHITE,
    });

    const tf2 = form.createTextField(sanitizeId(rowId) + '_term');
    tf2.addToPage(page, {
      x: courseX + widths.course + widths.grade, y: bot + 1, width: widths.term, height: L.ROW_H - 2,
      borderWidth: 0.3, borderColor: L.GRAY_BORDER, backgroundColor: L.WHITE,
    });
  }

  return bot;
}

// Truncates text to fit maxWidth at the given font size.
function clipText(font, text, size, maxWidth) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(t + '…', size) > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '…';
}

// Converts a dotted group ID to a safe AcroForm field name prefix.
function sanitizeId(id) {
  return id.replace(/\./g, '_').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function totalWidth(widths) {
  return widths.check + widths.req + widths.course + widths.grade + widths.term;
}

module.exports = { makeRow, clipText, sanitizeId, totalWidth };
