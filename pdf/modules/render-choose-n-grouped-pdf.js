'use strict';

const L = require('../layout');
const { makeRow, totalWidth, wrapText, formatOption } = require('./row-pdf');
const { drawTableHeaders, drawNote } = require('./table-pdf');
const { closeTable } = require('./render-fixed-pdf');

function renderChooseNGrouped(ctx, x, y, widths, group, courseMap, fonts) {
  const n      = group.n || 1;
  const colW   = totalWidth(widths);
  let   rowNum = 0;

  y = drawTableHeaders(ctx.page, x, y, widths, fonts);

  for (const sub of (group.sub_groups || [])) {
    const subTitle = `${sub.title}${sub.minimum_picks ? ` — choose at least ${sub.minimum_picks}` : ''}`;
    y = drawSubHeader(ctx.page, x, y, subTitle, colW, fonts);

    if (sub.options && sub.options.length > 0) {
      const optList = sub.options.map(o => formatOption(o, courseMap)).join(', ');
      y = drawNote(ctx.page, x, y, `Options: ${optList}`, colW, fonts);
    }

    const picks = sub.minimum_picks || 1;
    for (let i = 0; i < picks; i++) {
      y = makeRow(ctx, x, y, widths, `${sub.id}.${i}`, `${sub.title} #${i + 1}`, fonts);
      rowNum++;
    }
  }

  while (rowNum < n) {
    y = makeRow(ctx, x, y, widths, `${group.id}.extra.${rowNum}`, `Additional Elective #${rowNum + 1}`, fonts);
    rowNum++;
  }

  return closeTable(ctx.page, x, y, widths);
}

function drawSubHeader(page, x, y, title, colW, fonts) {
  const lines  = wrapText(fonts.bold, title, L.FONT.footnote, colW - 8);
  const height = Math.max(10, lines.length * 8 + 3);

  page.drawRectangle({ x, y: y - height, width: colW, height, color: L.GRAY_BG });
  for (let i = 0; i < lines.length; i++) {
    page.drawText(lines[i], {
      x: x + 5, y: y - L.FONT.footnote - 1.5 - i * 8,
      size: L.FONT.footnote, font: fonts.bold, color: L.BLACK,
    });
  }
  return y - height;
}

module.exports = { renderChooseNGrouped };
