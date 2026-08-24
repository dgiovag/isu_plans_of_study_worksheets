'use strict';

const L = require('../layout');
const { pageAt } = require('./page-pool');

const LINE_H = L.FONT.tableBody + 2.5; // vertical step between wrapped label lines

// y at which column content begins on a continuation page (inside top margin)
const CONTINUATION_Y = L.PAGE_HEIGHT - L.MARGIN.top - 16;

/**
 * If `y - neededH` would fall below the bottom margin, advances this context to
 * the next page in the shared pool (creating it only if no other context has
 * already), updates ctx.page/ctx.pageIdx, and returns the reset y for that page.
 * Otherwise returns y unchanged.
 *
 * Contexts share `ctx.pool` by reference, so two columns that both overflow land
 * on the same physical page instead of each appending one of their own.
 */
function breakIfNeeded(ctx, y, neededH, fonts) {
  if (y - neededH >= L.MARGIN.bottom) return y;

  ctx.pageIdx = (ctx.pageIdx || 0) + 1;
  ctx.page    = pageAt(ctx.pool, ctx.pageIdx, fonts);

  return CONTINUATION_Y;
}

/**
 * Draws one worksheet row (checkbox + label + course/grade/term fields).
 * Triggers a page break automatically when there is not enough room.
 *
 * @param {object}  ctx     { doc, page, form } — ctx.page may be replaced on break
 * @param {number}  x       left edge of column
 * @param {number}  y       top of row (pdf-lib coords: y=0 at bottom)
 * @param {object}  widths  COL_WIDTHS.left or COL_WIDTHS.right
 * @param {string}  rowId   unique AcroForm field name prefix
 * @param {string}  label   text shown in the requirement column
 * @param {object}  fonts   { reg, bold }
 * @param {object}  opts    { exempt, bold }
 * @returns {number}        y coordinate below this row
 */
function makeRow(ctx, x, y, widths, rowId, label, fonts, opts = {}) {
  const colW = totalWidth(widths);

  // Word-wrap the label; row height expands to fit.
  const labelFont  = opts.bold ? fonts.bold : fonts.reg;
  const labelLines = wrapText(labelFont, label, L.FONT.tableBody, widths.req - 3);

  // Graduation flag tag: fits inline with last label line, or drops to a new line.
  let tagText = null, tagInline = false;
  if (opts.flagTag && widths.req > 0) {
    tagText = '(' + opts.flagTag + ')';
    const lastLine  = labelLines[labelLines.length - 1] || '';
    const lastLineW = labelFont.widthOfTextAtSize(lastLine, L.FONT.tableBody);
    const tagW      = fonts.reg.widthOfTextAtSize(' ' + tagText, L.FONT.footnote);
    tagInline = (lastLineW + tagW <= widths.req - 3);
  }

  const extraLines = (tagText && !tagInline) ? 1 : 0;
  const rowHeight  = Math.max(L.ROW_H, (labelLines.length + extraLines) * LINE_H + 3);

  y = breakIfNeeded(ctx, y, rowHeight, fonts);

  const { page, form } = ctx;
  const bot = y - rowHeight;

  if (opts.exempt) {
    page.drawRectangle({ x, y: bot, width: colW, height: rowHeight, color: L.GRAY_BG });
  }

  page.drawLine({
    start: { x, y: bot }, end: { x: x + colW, y: bot },
    thickness: 0.3, color: L.GRAY_BORDER,
  });

  // Checkbox / exempt indicator — vertically centered
  const cbSize = 9;
  const cbY    = bot + (rowHeight - cbSize) / 2;
  if (opts.exempt) {
    page.drawRectangle({ x: x + 1, y: cbY, width: cbSize, height: cbSize, color: L.GRAY_BORDER });
  } else {
    const cb = form.createCheckBox(sanitizeId(rowId) + '_check');
    cb.addToPage(page, {
      x: x + 1, y: cbY, width: cbSize, height: cbSize,
      borderWidth: 0.5, borderColor: L.GRAY_BORDER, backgroundColor: L.WHITE,
    });
  }

  // Label lines — omitted when req column is collapsed (widths.req === 0)
  if (widths.req > 0) {
    const labelX = x + widths.check + 2;
    for (let i = 0; i < labelLines.length; i++) {
      page.drawText(labelLines[i], {
        x: labelX, y: y - L.FONT.tableBody - 1.5 - i * LINE_H,
        size: L.FONT.tableBody, font: labelFont,
        color: opts.exempt ? L.GRAY_TEXT : L.BLACK,
      });
    }

    if (tagText) {
      const lastIdx   = labelLines.length - 1;
      const lastLineY = y - L.FONT.tableBody - 1.5 - lastIdx * LINE_H;
      if (tagInline) {
        const lastLineW = labelFont.widthOfTextAtSize(labelLines[lastIdx] || '', L.FONT.tableBody);
        page.drawText(' ' + tagText, {
          x: labelX + lastLineW,
          y: lastLineY + (L.FONT.tableBody - L.FONT.footnote) / 2,
          size: L.FONT.footnote, font: fonts.reg, color: L.GRAY_TEXT,
        });
      } else {
        page.drawText(tagText, {
          x: labelX, y: lastLineY - LINE_H,
          size: L.FONT.footnote, font: fonts.reg, color: L.GRAY_TEXT,
        });
      }
    }
  }

  // AcroForm fields — vertically centered, fixed height
  if (!opts.exempt) {
    const fieldH  = L.ROW_H - 2;
    const fieldY  = bot + (rowHeight - fieldH) / 2;
    const courseX = x + widths.check + widths.req;

    if (widths.course > 0) {
      const tf = form.createTextField(sanitizeId(rowId) + '_course');
      tf.addToPage(page, {
        x: courseX, y: fieldY, width: widths.course - 1, height: fieldH,
        borderWidth: 0.3, borderColor: L.GRAY_BORDER, backgroundColor: L.WHITE,
      });
    }

    if (widths.hours > 0) {
      const hf = form.createTextField(sanitizeId(rowId) + '_hours');
      hf.addToPage(page, {
        x: courseX + widths.course, y: fieldY, width: widths.hours - 1, height: fieldH,
        borderWidth: 0.3, borderColor: L.GRAY_BORDER, backgroundColor: L.WHITE,
      });
      if (opts.hours != null) hf.setText(String(opts.hours));
    }

    const hoursOffset = widths.hours || 0;

    const gf = form.createTextField(sanitizeId(rowId) + '_grade');
    gf.addToPage(page, {
      x: courseX + widths.course + hoursOffset, y: fieldY, width: widths.grade - 1, height: fieldH,
      borderWidth: 0.3, borderColor: L.GRAY_BORDER, backgroundColor: L.WHITE,
    });

    const tf2 = form.createTextField(sanitizeId(rowId) + '_term');
    tf2.addToPage(page, {
      x: courseX + widths.course + hoursOffset + widths.grade, y: fieldY, width: widths.term, height: fieldH,
      borderWidth: 0.3, borderColor: L.GRAY_BORDER, backgroundColor: L.WHITE,
    });
  }

  return bot;
}

function wrapText(font, text, size, maxWidth) {
  const words = text.replace(/[\r\n]+/g, ' ').split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? current + ' ' + word : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function sanitizeId(id) {
  return id.replace(/\./g, '_').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function totalWidth(widths) {
  return widths.check + widths.req + widths.course + (widths.hours || 0) + widths.grade + widths.term;
}

function formatOption(opt, courseMap) {
  if (typeof opt === 'string') {
    const c = courseMap[opt];
    return c ? c.code : opt;
  }
  if (opt && opt.type === 'set') {
    return '(' + (opt.course_ids || []).map(id => {
      const c = courseMap[id]; return c ? c.code : id;
    }).join(' + ') + ')';
  }
  return String(opt);
}

// Returns a copy of widths with the req column collapsed into course.
// Use for open/open_constrained groups where no requirement label is shown.
function noReqWidths(widths) {
  return { ...widths, req: 0, course: widths.course + widths.req };
}

// Returns a copy of widths with the course write-in field removed.
// The course column width folds into req, giving more room for the label.
// Use for fixed/repeat groups where the course is already predetermined.
function noCourseWidths(widths) {
  return { ...widths, course: 0, req: widths.req + widths.course };
}

module.exports = { makeRow, breakIfNeeded, wrapText, sanitizeId, totalWidth, formatOption, noReqWidths, noCourseWidths };
