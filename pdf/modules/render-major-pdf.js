'use strict';

const L = require('../layout');
const { drawSectionTitle } = require('./table-pdf');
const { renderGroup, estimateGroupHeight, heightEnv } = require('./render-group-pdf');

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
  const { col1Groups, col2Groups } = semanticSplit(groups, env);

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

// Semantic split: predetermined groups (fixed/repeat) → col A,
// choice groups → col B. Falls back to sequential height-balance
// when either bucket would be empty or the split is badly skewed (>2x).
function semanticSplit(groups, env) {
  const col1Groups = groups.filter(g => FIXED_FILLS.has(g.fill));
  const col2Groups = groups.filter(g => !FIXED_FILLS.has(g.fill));

  if (col1Groups.length === 0 || col2Groups.length === 0) {
    return sequentialSplit(groups, env);
  }

  const h1 = col1Groups.reduce((s, g) => s + estimateGroupHeight(g, env), 0);
  const h2 = col2Groups.reduce((s, g) => s + estimateGroupHeight(g, env), 0);
  if (Math.max(h1, h2) > 2 * Math.min(h1, h2)) {
    return sequentialSplit(groups, env);
  }

  return { col1Groups, col2Groups };
}

// Sequential split at height midpoint, preserving program order.
function sequentialSplit(groups, env) {
  const heights = groups.map(g => estimateGroupHeight(g, env));
  const total   = heights.reduce((a, b) => a + b, 0);
  const half    = total / 2;

  let acc = 0, splitIdx = groups.length;
  for (let i = 0; i < groups.length; i++) {
    acc += heights[i];
    if (acc >= half) { splitIdx = i + 1; break; }
  }

  if (splitIdx >= groups.length) splitIdx = groups.length - 1;

  return {
    col1Groups: groups.slice(0, splitIdx),
    col2Groups: groups.slice(splitIdx),
  };
}

function flattenMajorGroups(major) {
  if (major.phases && major.phases.length > 0) {
    return major.phases.flatMap(phase => phase.groups || []);
  }
  return major.groups || [];
}

module.exports = { renderMajor };
