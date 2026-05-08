'use strict';
const { esc, sanitizeId } = require('./utils');

// fill=escrow: info block + single checkbox for the escrow event.
// Not table-based — returns a .escrow-block div.
module.exports = function renderEscrow(group, courseMap, prefix) {
  const rowId = `escrow-${sanitizeId(group.id)}`;

  const triggerCodes = (group.trigger_courses || []).map(id => {
    const c = courseMap[id];
    return c ? c.code : id;
  }).join(', ');

  const grantedParts = (group.granted_courses || []).map(id => {
    const c = courseMap[id];
    if (!c) return esc(id);
    const creditNote = c.credits ? ` (${c.credits} hrs)` : '';
    return `${esc(c.code)}${creditNote}`;
  }).join(', ');

  const totalNote = group.total_credits ? `${group.total_credits} total credit hours` : '';

  return `<div class="escrow-block">
  <p><strong>Trigger courses (all required):</strong> ${esc(triggerCodes)}</p>
  <p><strong>Credits granted${totalNote ? ' (' + totalNote + ')' : ''}:</strong> ${grantedParts}</p>
  ${group.note ? `<p>${esc(group.note)}</p>` : ''}
  <label style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:0.9em;">
    <input type="checkbox" id="chk-${rowId}" data-id="${rowId}" data-prefix="${prefix}">
    Escrow credits applied to transcript
  </label>
  <input type="hidden" id="transfer-${rowId}">
</div>`;
};
