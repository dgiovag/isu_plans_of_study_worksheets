'use strict';
const { esc, sanitizeId, makeRow, tableWrap } = require('./utils');

// fill=choose_one (group-level): one row, options joined by " or ".
module.exports = function renderChooseOne(group, courseMap, prefix, opts) {
  const rowId = `${sanitizeId(group.id)}-0`;
  const codes = (group.options || []).map(id => {
    const c = courseMap[id];
    return c ? esc(c.code) : esc(id);
  });
  const codeHTML = codes.join(' or ');
  const descHTML = group.note ? esc(group.note) : '';
  return tableWrap(makeRow(rowId, prefix, codeHTML, descHTML, opts));
};
