'use strict';
const { esc, sanitizeId, makeRow, tableWrap } = require('./utils');

// fill=open_constrained: `count` rows with a descriptive label and constraint guidance.
module.exports = function renderOpenConstrained(group, courseMap, prefix, opts) {
  const base  = sanitizeId(group.id);
  const count = group.count || 1;
  const descParts = [];
  if (group.constraint) descParts.push(esc(group.constraint));
  if (group.note)       descParts.push(esc(group.note));
  const descHTML = descParts.join(' · ');

  const rows = [];
  for (let i = 0; i < count; i++) {
    const label = count === 1 ? esc(group.title) : `${esc(group.title)} #${i + 1}`;
    rows.push(makeRow(`${base}-${i}`, prefix, label, i === 0 ? descHTML : '', opts));
  }
  return tableWrap(rows.join(''));
};
