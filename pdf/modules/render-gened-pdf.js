'use strict';

const L = require('../layout');
const { drawSectionTitle, drawNote } = require('./table-pdf');
const { renderGroup, heightEnv } = require('./render-group-pdf');
const { packTwoColumns } = require('./pack-columns');
const { graduationHeight } = require('./render-graduation-pdf');
const { wrapText } = require('./row-pdf');

const DATA_TRACK = { isu: 'isu', iai: 'iai', ad: 'iai' };

const SECTION_TITLES = {
  isu: 'ISU General Education',
  iai: 'IAI Transferable Core',
  ad:  "Associate's Degree (IAI)",
};

/**
 * Renders the gen-ed left half as two sub-columns. The section title spans the
 * full half width; groups keep their natural order and are divided by
 * packTwoColumns, which picks the split that needs the fewest pages.
 */
function renderGenEd(ctx, startY, program, track, courseMap, fonts) {
  const halfX = L.MARGIN.left;
  const ge    = program.general_education || { tracks: [] };

  let y = drawSectionTitle(ctx.page, halfX, startY, SECTION_TITLES[track], L.HALF_WIDTH, fonts);

  if (ge.assumed_complete && track !== 'ad') {
    return renderAssumedComplete(ctx.page, halfX, y, ge, fonts);
  }

  if (track === 'ad') {
    const assocTrack = (ge.tracks || []).find(t => t.id === 'associates');
    if (assocTrack && assocTrack.fields && assocTrack.fields.length > 0) {
      y = renderAssociatesFields(ctx, halfX, y, assocTrack, fonts);
      y -= 4;
    }
  }

  const dataTrackId = DATA_TRACK[track];
  const dataTrack   = (ge.tracks || []).find(t => t.id === dataTrackId);

  if (!dataTrack || !dataTrack.groups || dataTrack.groups.length === 0) {
    ctx.page.drawText('No course-based general education requirements for this track.', {
      x: halfX + 4, y: y - 10,
      size: L.FONT.footnote, font: fonts.reg, color: L.GRAY_TEXT,
    });
    return y - 14;
  }

  const groups    = dataTrack.groups;
  const subWidths = L.COL_WIDTHS.sub;
  const x1        = halfX;
  const x2        = halfX + L.SUB_COL_WIDTH + L.SUB_GAP;

  if (groups.length === 1) {
    y = renderGroup(ctx, x1, y, subWidths, groups[0], courseMap, fonts);
    return y;
  }

  // The graduation panel is drawn below this half at whatever y we return, with
  // no pagination of its own worth speaking of, so reserve its height here.
  const footerH = graduationHeight(program, L.COL_LEFT_WIDTH, fonts, ctx.gradFlagsMap);

  const env = heightEnv(ctx, subWidths, courseMap, fonts);
  const { col1Groups, col2Groups } = packTwoColumns(groups, env, y, [], footerH);

  // Independent rendering contexts — share doc/form, track pages separately.
  const ctx1 = { ...ctx };
  const ctx2 = { ...ctx };

  let y1 = y;
  for (const group of col1Groups) {
    y1 = renderGroup(ctx1, x1, y1, subWidths, group, courseMap, fonts);
    y1 -= 3;
  }

  let y2 = y;
  for (const group of col2Groups) {
    y2 = renderGroup(ctx2, x2, y2, subWidths, group, courseMap, fonts);
    y2 -= 3;
  }

  // Graduation goes below this half, so it must clear both sub-columns: report
  // the furthest page either reached, and the lowest y still occupied on it.
  if (ctx2.pageIdx > ctx1.pageIdx)      { ctx.pageIdx = ctx2.pageIdx; ctx.page = ctx2.page; return y2; }
  if (ctx1.pageIdx > ctx2.pageIdx)      { ctx.pageIdx = ctx1.pageIdx; ctx.page = ctx1.page; return y1; }
  ctx.pageIdx = ctx1.pageIdx;
  ctx.page    = ctx1.page;
  return Math.min(y1, y2);
}

function renderAssumedComplete(page, x, y, ge, fonts) {
  const noteText = ge.assumed_via === 'admission_requirement'
    ? "General Education requirements are satisfied by the Associate's Degree required for program admission."
    : 'General Education requirements are assumed complete.';

  const lines  = wrapText(fonts.reg, noteText, L.FONT.footnote, L.HALF_WIDTH - 8);
  const blockH = lines.length * 8 + 10;

  page.drawRectangle({ x, y: y - blockH, width: L.HALF_WIDTH, height: blockH, color: L.GRAY_BG });
  let ty = y - 8;
  for (const line of lines) {
    page.drawText(line, { x: x + 4, y: ty, size: L.FONT.footnote, font: fonts.reg, color: L.GRAY_TEXT });
    ty -= 8;
  }
  return y - blockH - 4;
}

function renderAssociatesFields(ctx, x, y, assocTrack, fonts) {
  const { page, form } = ctx;
  const fields  = assocTrack.fields || [];
  const colW    = L.HALF_WIDTH;
  const FIELD_H = 14;
  const ROW_H   = FIELD_H + 11;

  const rows = [];
  for (let i = 0; i < fields.length; i += 2) rows.push(fields.slice(i, i + 2));

  const blockH = rows.length * ROW_H + 6;

  page.drawRectangle({ x, y: y - blockH, width: colW, height: blockH, color: L.GRAY_BG });

  let rowTop = y - 4;
  for (const row of rows) {
    const fw = row.length === 2 ? Math.floor((colW - 6) / 2) : colW - 4;
    for (let i = 0; i < row.length; i++) {
      const f  = row[i];
      const fx = x + 2 + i * (fw + 2);

      page.drawText(f.label, {
        x: fx, y: rowTop - L.FONT.label,
        size: L.FONT.label, font: fonts.reg, color: L.BLACK,
      });

      const tf = form.createTextField(`assoc_${f.id}`);
      tf.addToPage(page, {
        x: fx, y: rowTop - L.FONT.label - FIELD_H - 1,
        width: fw, height: FIELD_H,
        borderWidth: 0.3, borderColor: L.GRAY_BORDER, backgroundColor: L.WHITE,
      });
    }
    rowTop -= ROW_H;
  }

  return y - blockH;
}

module.exports = { renderGenEd };
