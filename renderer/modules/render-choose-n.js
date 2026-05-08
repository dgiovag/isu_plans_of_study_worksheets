'use strict';
const { esc, sanitizeId, makeRow, tableWrap } = require('./utils');

// fill=choose_n: n rows labeled "Elective #1", "#2"…
// Options listed as guidance on every row so the advisor can see choices inline.
module.exports = function renderChooseN(group, courseMap, prefix, opts) {
  const base = sanitizeId(group.id);
  const n = group.n || 1;
  const optionCodes = (group.options || []).map(id => {
    const c = courseMap[id];
    return c ? c.code : id;
  });
  const guidanceDesc = optionCodes.length > 0
    ? `Choose from: ${esc(optionCodes.join(', '))}`
    : (group.note ? esc(group.note) : '');

  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.push(makeRow(`${base}-${i}`, prefix, `Elective #${i + 1}`, guidanceDesc, opts));
  }
  return tableWrap(rows.join(''));
};
