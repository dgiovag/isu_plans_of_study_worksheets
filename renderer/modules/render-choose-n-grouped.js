'use strict';
const { esc, sanitizeId, makeRow, tableWrap } = require('./utils');

const SUB_HDR = (title, minPicks, options, courseMap) => {
  const optCodes = options.map(id => {
    const c = courseMap[id];
    return c ? c.code : id;
  }).join(', ');
  const pickNote = minPicks > 1 ? `at least ${minPicks}` : 'at least 1';
  return `<tr class="sub-group-header"><td colspan="6"><strong>${esc(title)}</strong> — ${pickNote} · Choose from: ${esc(optCodes)}</td></tr>`;
};

// fill=choose_n_grouped: n total rows with sub-group section headers.
// Each sub_group contributes minimum_picks rows; remaining slots go under "Additional".
module.exports = function renderChooseNGrouped(group, courseMap, prefix, opts) {
  const n        = group.n || 1;
  const subGroups = group.sub_groups || [];
  const totalMin = subGroups.reduce((sum, sg) => sum + (sg.minimum_picks || 1), 0);
  const extra    = Math.max(0, n - totalMin);

  const rows = [];

  subGroups.forEach(sg => {
    const picks = sg.minimum_picks || 1;
    const optCodes = (sg.options || []).map(id => {
      const c = courseMap[id];
      return c ? c.code : id;
    }).join(', ');
    const desc = `Choose from: ${esc(optCodes)}`;
    rows.push(SUB_HDR(sg.title, picks, sg.options || [], courseMap));
    for (let i = 0; i < picks; i++) {
      rows.push(makeRow(`${sanitizeId(sg.id)}-${i}`, prefix, `Elective (#${rows.filter(r=>r.includes('req-code')).length + 1})`, desc, opts));
    }
  });

  if (extra > 0) {
    const allOptions = subGroups.flatMap(sg => sg.options || []).map(id => {
      const c = courseMap[id];
      return c ? c.code : id;
    }).join(', ');
    const desc = `Additional elective — choose from any group: ${esc(allOptions)}`;
    rows.push(`<tr class="sub-group-header"><td colspan="6"><strong>Additional Electives</strong> — ${extra} remaining</td></tr>`);
    for (let i = 0; i < extra; i++) {
      rows.push(makeRow(`${sanitizeId(group.id)}-extra-${i}`, prefix, `Elective (additional #${i + 1})`, desc, opts));
    }
  }

  return tableWrap(rows.join(''));
};
