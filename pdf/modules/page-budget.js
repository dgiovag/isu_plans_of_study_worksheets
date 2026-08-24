'use strict';

/**
 * Enforces the printable-sheet budget: a worksheet must fit on one sheet of
 * paper, front and back.
 *
 * The check deliberately uses the *actual* rendered page count rather than a
 * re-prediction from estimate-height.js. The estimator is currently exact, but
 * it is a model of the renderer, and a model can drift from what it models. Page
 * count cannot drift — it is what the file contains.
 *
 * When a program does overflow, the estimator's per-bucket numbers are still
 * what makes the failure actionable, so the report names which bucket ran past
 * the budget and by how much. The catalog is re-scraped biannually, so this
 * exists to make future data growth fail loudly instead of silently shipping a
 * page 3 that nobody prints.
 */

const L = require('../layout');
const { CONTINUATION_Y } = require('./row-pdf');

// One sheet, front and back.
const PAGE_BUDGET = 2;

/**
 * Builds the per-track budget record. `buckets` are the independently paginated
 * regions of the worksheet, each reporting the 1-based page it finished on and
 * the y it finished at.
 */
function budgetReport(track, pages, buckets) {
  return { track, pages, buckets: buckets.filter(Boolean) };
}

/**
 * Returns null when the program is within budget, otherwise a description of
 * what overflowed. `spill` is how much content height landed beyond the budget —
 * i.e. roughly how much this bucket needs to shed to fit.
 */
function checkBudget(report) {
  if (report.pages <= PAGE_BUDGET) return null;

  // The bucket sitting furthest past the budget is the one to fix; among equals,
  // the one that ran deepest down the page.
  const over = report.buckets
    .filter(b => b.page > PAGE_BUDGET)
    .sort((a, b) => (b.page - a.page) || (a.endY - b.endY));

  const worst = over[0];
  const spill = worst
    ? Math.max(0, Math.round(CONTINUATION_Y - worst.endY))
    : null;

  return {
    track:   report.track,
    pages:   report.pages,
    bucket:  worst ? worst.name : 'unknown',
    page:    worst ? worst.page : report.pages,
    spill,
    buckets: report.buckets,
  };
}

/** One-line summary for the build log. */
function formatOverflow(programId, o) {
  const where = o.spill === null
    ? `${o.pages} pages`
    : `${o.pages} pages — "${o.bucket}" ran onto page ${o.page}, ${o.spill}pt past the budget`;
  return `${programId}-${o.track}: ${where}`;
}

/** Indented per-bucket breakdown, for diagnosing the overflow. */
function formatBuckets(o) {
  return o.buckets
    .map(b => `      ${b.name.padEnd(26)} ends page ${b.page} at y=${Math.round(b.endY)}`)
    .join('\n');
}

module.exports = {
  PAGE_BUDGET, budgetReport, checkBudget, formatOverflow, formatBuckets,
  CONTINUATION_Y, MARGIN_BOTTOM: L.MARGIN.bottom,
};
