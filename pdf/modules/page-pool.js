'use strict';

const L = require('../layout');

/**
 * A page pool shared by every rendering context in one PDF.
 *
 * Each column context paginates independently (gen-ed sub-col A/B, major
 * sub-col A/B, the full-width panels), but they must all continue onto the
 * *same* physical page 2 rather than each appending a fresh page of their own.
 * The pool owns the page list; contexts only hold an index into it.
 */
function createPagePool(doc) {
  const first = doc.addPage([L.PAGE_WIDTH, L.PAGE_HEIGHT]);
  return { doc, pages: [first] };
}

/**
 * Returns the physical page at `idx`, creating it (and any pages before it)
 * if no context has needed it yet. The "(continued)" marker is drawn once,
 * at creation time, so concurrent contexts don't stamp it repeatedly.
 */
function pageAt(pool, idx, fonts) {
  while (pool.pages.length <= idx) {
    const page = pool.doc.addPage([L.PAGE_WIDTH, L.PAGE_HEIGHT]);
    page.drawText('(continued)', {
      x: L.MARGIN.left, y: L.PAGE_HEIGHT - L.MARGIN.top - 8,
      size: 7, font: fonts.reg, color: L.GRAY_TEXT,
    });
    pool.pages.push(page);
  }
  return pool.pages[idx];
}

module.exports = { createPagePool, pageAt };
