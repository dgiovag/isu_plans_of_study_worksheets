'use strict';

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Turns "major.required" or "isu.communication_composition" into "major-required"
function sanitizeId(id) {
  return String(id).replace(/[._\s]/g, '-').toLowerCase();
}

const STATUS_OPTIONS = `<option value="">—</option>
      <option value="planned">Planned</option>
      <option value="in-progress">In Progress</option>
      <option value="completed">Completed</option>
      <option value="transferred">Transferred</option>
      <option value="waived">Waived/Exempt</option>`;

const STATUS_OPTIONS_WAIVED = `<option value="">—</option>
      <option value="planned">Planned</option>
      <option value="in-progress">In Progress</option>
      <option value="completed">Completed</option>
      <option value="transferred">Transferred</option>
      <option value="waived" selected>Waived/Exempt</option>`;

// opts: { autoFulfilled, exempt, preChecked, preWaived, credits, singleCourse }
// credits: known credit value (pre-fills Hrs field as read-only); null/undefined = editable
// singleCourse: true marks the Course Taken cell for conditional hide/show by runtime
function makeRow(rowId, prefix, codeHTML, descHTML, opts) {
  const o = opts || {};
  const isChecked  = o.exempt || o.preChecked;
  const isWaived   = o.exempt || o.preWaived;

  const classes = [];
  if (o.autoFulfilled) classes.push('auto-fulfilled');
  if (o.exempt)        classes.push('exempt', 'completed');
  else if (isChecked && !o.autoFulfilled) classes.push('completed');
  const classAttr = classes.length ? ` class="${classes.join(' ')}"` : '';
  const checkedAttr = isChecked ? ' checked' : '';
  const statusOpts  = isWaived ? STATUS_OPTIONS_WAIVED : STATUS_OPTIONS;

  const hrsKnown    = o.credits != null;
  const hrsVal      = hrsKnown ? ` value="${o.credits}"` : '';
  const hrsReadOnly = hrsKnown ? ' readonly' : '';
  const courseTdAttr = o.singleCourse ? ' data-single="1"' : '';

  return `<tr id="row-${rowId}"${classAttr}>
  <td class="col-check"><input type="checkbox" id="chk-${rowId}" data-id="${rowId}" data-prefix="${prefix}"${checkedAttr}></td>
  <td class="req">
    <div class="req-code">${codeHTML}</div>
    ${descHTML ? `<div class="req-desc">${descHTML}</div>` : ''}
  </td>
  <td class="col-hrs"><input type="number" min="0" step="0.5" placeholder="—" data-id="${rowId}" data-field="hrs"${hrsVal}${hrsReadOnly}></td>
  <td class="col-course"${courseTdAttr}><input type="text" placeholder="e.g. ENG 101" data-id="${rowId}" data-field="course"></td>
  <td><input type="text" placeholder="—" data-id="${rowId}" data-field="grade" maxlength="3"></td>
  <td><input type="text" placeholder="Fa 25" data-id="${rowId}" data-field="term"></td>
  <td><select data-id="${rowId}" data-prefix="${prefix}" data-field="status">${statusOpts}</select></td>
</tr>
<tr id="transfer-${rowId}" class="transfer-detail" style="display:none;">
  <td></td>
  <td colspan="6">
    <span style="font-size:0.78em;color:var(--gray-text);font-style:italic;margin-right:6px;">Transferred from:</span>
    <input type="text" placeholder="Institution name" data-id="${rowId}" data-field="from" style="width:70%;max-width:400px;">
  </td>
</tr>`;
}

const THEAD = `<thead><tr>
  <th class="col-check"></th>
  <th class="col-req">Requirement</th>
  <th class="col-hrs">Hrs</th>
  <th class="col-course">Course Taken</th>
  <th class="col-grade">Grade</th>
  <th class="col-term">Term</th>
  <th class="col-status">Status</th>
</tr></thead>`;

function tableWrap(tbodyHTML) {
  return `<table>${THEAD}<tbody>${tbodyHTML}</tbody></table>`;
}

module.exports = { esc, sanitizeId, makeRow, tableWrap };
