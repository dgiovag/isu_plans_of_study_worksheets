'use strict';

const L = require('../layout');
const { wrapText, sanitizeId, totalWidth, breakIfNeeded } = require('./row-pdf');

function renderEscrow(ctx, x, y, widths, group, courseMap, fonts) {
  const colW = totalWidth(widths);

  const triggerCodes = (group.trigger_courses || []).map(id => { const c = courseMap[id]; return c ? c.code : id; });
  const grantedCodes = (group.granted_courses || []).map(id => { const c = courseMap[id]; return c ? c.code : id; });
  const crText       = group.total_credits ? ` (${group.total_credits} cr)` : '';
  const bodyText     = `Completing ${triggerCodes.join(' or ')} grants credit for ${grantedCodes.join(', ')}${crText}.`;
  const noteText     = group.note || '';

  const bodyLines = wrapText(fonts.reg, bodyText, L.FONT.footnote, colW - 10);
  const noteLines = noteText ? wrapText(fonts.reg, noteText, L.FONT.footnote, colW - 10) : [];
  const checkRowH = 14;
  const blockH    = 8 + bodyLines.length * 8 + (noteLines.length ? noteLines.length * 8 + 3 : 0) + checkRowH + 6;

  y = breakIfNeeded(ctx, y, blockH, fonts);
  const { page, form } = ctx;

  page.drawRectangle({ x, y: y - blockH, width: colW, height: blockH, color: L.YELLOW_BG });
  page.drawRectangle({ x, y: y - 2,      width: colW, height: 2,      color: L.RED });

  page.drawText('ESCROW CREDIT', {
    x: x + 5, y: y - L.FONT.groupTitle - 3,
    size: L.FONT.groupTitle, font: fonts.bold, color: L.BLACK,
  });

  let ty = y - L.FONT.groupTitle - 3 - 8;
  for (const line of bodyLines) {
    page.drawText(line, { x: x + 5, y: ty, size: L.FONT.footnote, font: fonts.reg, color: L.BLACK });
    ty -= 8;
  }
  if (noteLines.length) {
    ty -= 3;
    for (const line of noteLines) {
      page.drawText(line, { x: x + 5, y: ty, size: L.FONT.footnote, font: fonts.reg, color: L.GRAY_TEXT });
      ty -= 8;
    }
  }

  const cbY = ty - checkRowH + (checkRowH - 9) / 2;
  const cb  = form.createCheckBox(sanitizeId(group.id) + '_escrow_check');
  cb.addToPage(page, {
    x: x + 5, y: cbY, width: 9, height: 9,
    borderWidth: 0.5, borderColor: L.GRAY_BORDER, backgroundColor: L.WHITE,
  });
  page.drawText('Escrow credit applied', {
    x: x + 18, y: cbY + 1,
    size: L.FONT.footnote, font: fonts.reg, color: L.BLACK,
  });

  return y - blockH - 2;
}

module.exports = { renderEscrow };
