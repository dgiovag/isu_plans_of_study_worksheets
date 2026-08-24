'use strict';

/**
 * Chooses how to divide a half's groups between its two sub-columns.
 *
 * The old heuristic split at the height midpoint, which balances the two
 * columns but is the wrong objective: when balanced columns each slightly
 * exceed page-1 capacity, *both* spill and the sheet grows a page, where an
 * unbalanced split would have kept one column entirely on page 1.
 *
 * Here the objective is page count first, balance only as a tie-break. The
 * search space is one-dimensional — a single split index preserving program
 * order — because each sub-column paginates deterministically once its group
 * list is fixed. So we simulate every candidate split and keep the best.
 *
 * The simulation mirrors renderGroup + the caller's render loop exactly
 * (reserve min(estimate, MAX_COL_H), break if it won't fit, 3pt inter-group
 * gap). It is only as good as estimate-height.js, which is why accurate
 * estimation had to land first.
 */

const L = require('../layout');
const { CONTINUATION_Y } = require('./row-pdf');
const { estimateGroupHeight, MIN_GROUP_SPACE } = require('./estimate-height');

// Usable height of a column on a continuation page.
const MAX_COL_H = L.PAGE_HEIGHT - L.MARGIN.top - 16 - L.MARGIN.bottom;

const GROUP_GAP = 3;

/**
 * Walks one sub-column's group list the way the render loop will, and reports
 * how many pages it needs and where it ends up.
 */
function simulateColumn(groups, env, startY) {
  let y = startY;
  let pageIdx = 0;

  for (const group of groups) {
    const est = estimateGroupHeight(group, env);

    // Mirrors renderGroup: reserve the whole group, unless it is taller than a
    // fresh column, in which case it cannot fit anywhere and only its head is
    // protected from being orphaned.
    const needed = est > MAX_COL_H ? MIN_GROUP_SPACE : est;
    if (y - needed < L.MARGIN.bottom) {
      pageIdx++;
      y = CONTINUATION_Y;
    }

    // Consume the group's height, flowing onto further pages if it outgrows the
    // space left — that is what makeRow's own breakIfNeeded calls will do.
    let remaining = est;
    while (remaining > y - L.MARGIN.bottom) {
      remaining -= y - L.MARGIN.bottom;
      pageIdx++;
      y = CONTINUATION_Y;
    }
    y -= remaining + GROUP_GAP;
  }

  return { pages: pageIdx + 1, endY: y + GROUP_GAP, lastPageIdx: pageIdx };
}

/**
 * Scores a candidate assignment. Lower is better, compared field by field:
 *   1. pages    — physical pages this half needs (the whole point)
 *   2. spread   — how uneven the two columns are on their final page
 * `spread` only breaks ties, so balance never costs a page.
 *
 * `footerH` is height that must still fit *below* both sub-columns once they
 * finish — the graduation panel in the gen-ed half. A split that leaves no room
 * for it is scored as needing one more page, which is exactly what happens at
 * render time, so the packer stops choosing splits that orphan the panel.
 */
function score(col1Groups, col2Groups, env, startY, footerH = 0) {
  const s1 = simulateColumn(col1Groups, env, startY);
  const s2 = simulateColumn(col2Groups, env, startY);
  let pages = Math.max(s1.pages, s2.pages);

  // Compare fill depth on the last page both columns share; when they finish on
  // different pages, the one that finished earlier is treated as fully drained.
  const depth1 = s1.lastPageIdx === s2.lastPageIdx ? s1.endY : L.MARGIN.bottom;
  const depth2 = s2.lastPageIdx === s1.lastPageIdx ? s2.endY : L.MARGIN.bottom;

  // The footer starts where the deepest column left off — the same y renderGenEd
  // returns to template-pdf.js.
  let footerRoom = Infinity;
  if (footerH > 0) {
    const deepIdx = Math.max(s1.lastPageIdx, s2.lastPageIdx);
    footerRoom = Math.min(
      s1.lastPageIdx === deepIdx ? s1.endY : Infinity,
      s2.lastPageIdx === deepIdx ? s2.endY : Infinity,
    ) - L.MARGIN.bottom;
    if (footerRoom < footerH) pages += 1;
  }

  return { pages, spread: Math.abs(depth1 - depth2), footerRoom, s1, s2 };
}

function better(a, b) {
  if (!b) return true;
  if (a.pages !== b.pages) return a.pages < b.pages;
  return a.spread < b.spread;
}

/**
 * Picks the best split of `groups` into two sub-columns.
 *
 * `candidates` may supply extra non-contiguous assignments to consider (the
 * major half offers its semantic fixed-vs-choice split). A candidate only wins
 * if it needs no more pages than the best contiguous split, so a preferred
 * grouping is kept whenever it is free and dropped when it would cost a page.
 *
 * `footerH` reserves room below both columns for a panel that follows (see
 * `score`). Pass 0 when nothing follows the half.
 *
 * Returns { col1Groups, col2Groups, pages }.
 */
function packTwoColumns(groups, env, startY, candidates = [], footerH = 0) {
  if (groups.length === 0) return { col1Groups: [], col2Groups: [], pages: 1 };
  if (groups.length === 1) return { col1Groups: groups, col2Groups: [], pages: 1 };

  let best = null;
  let bestSplit = null;

  // Every contiguous split, both columns non-empty.
  for (let i = 1; i < groups.length; i++) {
    const col1Groups = groups.slice(0, i);
    const col2Groups = groups.slice(i);
    const s = score(col1Groups, col2Groups, env, startY, footerH);
    if (better(s, best)) { best = s; bestSplit = { col1Groups, col2Groups }; }
  }

  // Preferred non-contiguous assignments win ties, never cost a page.
  for (const cand of candidates) {
    if (cand.col1Groups.length === 0 || cand.col2Groups.length === 0) continue;
    const s = score(cand.col1Groups, cand.col2Groups, env, startY, footerH);
    if (s.pages <= best.pages) { best = s; bestSplit = cand; }
  }

  return { ...bestSplit, pages: best.pages };
}

module.exports = { packTwoColumns, simulateColumn, MAX_COL_H, GROUP_GAP };
