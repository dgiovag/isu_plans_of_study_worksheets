'use strict';

const L = require('../layout');
const { totalWidth, wrapText } = require('./row-pdf');
const { drawTableHeaders } = require('./table-pdf');
const { renderSlots, closeTable } = require('./render-fixed-pdf');

function renderChooseOneTrack(page, form, x, y, widths, group, courseMap, fonts) {
  const colW = totalWidth(widths);
  const tracks = group.tracks || [];

  // "Choose one track" notice
  const noticeLines = wrapText(fonts.reg, `Choose one track (${tracks.map(t => t.title).join(' / ')})`, L.FONT.footnote, colW - 8);
  for (let i = 0; i < noticeLines.length; i++) {
    y -= 8;
    page.drawText(noticeLines[i], {
      x: x + 4, y,
      size: L.FONT.footnote, font: fonts.reg, color: L.GRAY_TEXT,
    });
  }
  y -= 2;

  for (const track of tracks) {
    y = drawTrackHeader(page, x, y, track.title, colW, fonts);
    y = drawTableHeaders(page, x, y, widths, fonts);
    y = renderSlots(page, form, x, y, widths, track.courses || [], track.id, courseMap, fonts);
    y = closeTable(page, x, y, widths);
    y -= 2;
  }

  return y;
}

function drawTrackHeader(page, x, y, title, colW, fonts) {
  const lines  = wrapText(fonts.bold, title, L.FONT.groupTitle, colW - 8);
  const height = Math.max(L.GROUP_TITLE_H, lines.length * (L.FONT.groupTitle + 2) + 4);

  // Indented darker bar (dark blue-ish? let's use a dark gray with left red accent)
  page.drawRectangle({ x, y: y - height, width: 3, height, color: L.RED });
  page.drawRectangle({ x: x + 3, y: y - height, width: colW - 3, height, color: L.GRAY_BG });

  for (let i = 0; i < lines.length; i++) {
    page.drawText(lines[i], {
      x: x + 8, y: y - L.FONT.groupTitle - 2 - i * (L.FONT.groupTitle + 2),
      size: L.FONT.groupTitle, font: fonts.bold, color: L.BLACK,
    });
  }
  return y - height;
}

module.exports = { renderChooseOneTrack };
