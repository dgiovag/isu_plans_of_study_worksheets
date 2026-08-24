'use strict';

const L = require('../layout');
const { drawSectionTitle } = require('./table-pdf');
const { renderGroup, heightEnv } = require('./render-group-pdf');
const { packTwoColumns } = require('./pack-columns');

// Groups whose courses are predetermined — no student choice needed.
const FIXED_FILLS = new Set(['fixed', 'repeat']);

function renderMajor(ctx, startY, program, courseMap, fonts) {
  const halfX = L.MARGIN.left + L.HALF_WIDTH + L.HALF_GAP;

  let y = drawSectionTitle(ctx.page, halfX, startY,
    program.major.title || 'Major Requirements', L.HALF_WIDTH, fonts);

  if (ctx.xrefCourseIds && ctx.xrefCourseIds.size > 0) {
    ctx.page.drawText('Bold = also satisfies a gen-ed requirement', {
      x: halfX + 5, y: y - 8,
      size: L.FONT.footnote, font: fonts.reg, color: L.GRAY_TEXT,
    });
    y -= 12;
  }

  const groups = flattenMajorGroups(program.major);
  if (groups.length === 0) return y;

  const subWidths = L.COL_WIDTHS.sub;
  const x1 = halfX;
  const x2 = halfX + L.SUB_COL_WIDTH + L.SUB_GAP;

  if (groups.length === 1) {
    y = renderGroup(ctx, x1, y, subWidths, groups[0], courseMap, fonts);
    return y;
  }

  const env = heightEnv(ctx, subWidths, courseMap, fonts);
  const { col1Groups, col2Groups } = packTwoColumns(groups, env, y, semanticCandidates(groups));

  // Independent contexts — share doc/form, track pages separately.
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

  // Full-width panels may follow below, so report the furthest page either
  // sub-column reached and the lowest y still occupied on it.
  if (ctx2.pageIdx > ctx1.pageIdx)      { ctx.pageIdx = ctx2.pageIdx; ctx.page = ctx2.page; return y2; }
  if (ctx1.pageIdx > ctx2.pageIdx)      { ctx.pageIdx = ctx1.pageIdx; ctx.page = ctx1.page; return y1; }
  ctx.pageIdx = ctx1.pageIdx;
  ctx.page    = ctx1.page;
  return Math.min(y1, y2);
}

// The major half reads better with predetermined groups (fixed/repeat) in sub-col
// A and choice groups in sub-col B. Offered to the packer as a preference: it is
// used whenever it needs no more pages than the best order-preserving split, and
// silently dropped when it would cost a page.
function semanticCandidates(groups) {
  const col1Groups = groups.filter(g => FIXED_FILLS.has(g.fill));
  const col2Groups = groups.filter(g => !FIXED_FILLS.has(g.fill));
  return [{ col1Groups, col2Groups }];
}

function flattenMajorGroups(major) {
  if (major.phases && major.phases.length > 0) {
    return major.phases.flatMap(phase => phase.groups || []);
  }
  return major.groups || [];
}

module.exports = { renderMajor };
