'use strict';
const { esc, sanitizeId, makeRow, tableWrap } = require('./utils');

// Return the common credit value across a list of course IDs, or null if they differ.
function commonCredits(ids, courseMap) {
  const vals = ids.map(id => courseMap[id]?.credits).filter(c => c != null);
  if (!vals.length) return null;
  return vals.every(c => c === vals[0]) ? vals[0] : null;
}

// fill=choose_one (group-level): one row, options joined by " or ".
module.exports = function renderChooseOne(group, courseMap, prefix, opts) {
  const rowId = `${sanitizeId(group.id)}-0`;
  const codes = (group.options || []).map(id => {
    const c = courseMap[id];
    return c ? esc(c.code) : esc(id);
  });
  const codeHTML = codes.join(' or ');
  const descHTML = group.note ? esc(group.note) : '';
  const credits  = commonCredits(group.options || [], courseMap);
  return tableWrap(makeRow(rowId, prefix, codeHTML, descHTML, { ...opts, credits }));
};
