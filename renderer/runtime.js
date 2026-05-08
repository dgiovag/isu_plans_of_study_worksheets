'use strict';
// Full client-side runtime, inlined into every generated worksheet.
module.exports = `
// ── Track switching (gen-ed column) ──────────────────────────────────────────

function setTrack(track) {
  document.querySelectorAll('#gened-col .track-panel').forEach(function(p) {
    p.classList.remove('active');
  });
  var panel = document.getElementById('panel-' + track);
  if (panel) panel.classList.add('active');

  var detail = document.getElementById('associates-detail');
  if (detail) detail.classList.toggle('active', track === 'associates');

  document.querySelectorAll('.radio-group label').forEach(function(l) {
    l.classList.remove('selected-print');
  });
  var radio = document.querySelector('input[name="track"][value="' + track + '"]');
  if (radio && radio.parentElement) radio.parentElement.classList.add('selected-print');

  updateSummary();
}

// ── choose_one_track sub-panel switching (major column) ───────────────────────

function setSubTrack(groupEl, trackId) {
  groupEl.querySelectorAll('.track-sub-panel').forEach(function(p) {
    p.classList.toggle('active', p.dataset.subTrack === trackId);
  });
  updateSummary();
}

document.querySelectorAll('.track-sub-selector').forEach(function(sel) {
  var groupEl = sel.closest('.group');
  sel.querySelectorAll('input[type="radio"]').forEach(function(r) {
    r.addEventListener('change', function(e) {
      if (groupEl) setSubTrack(groupEl, e.target.value);
    });
  });
});

// ── Row interaction ───────────────────────────────────────────────────────────

var DONE_STATUSES = ['completed', 'transferred', 'waived'];

function updateRow(id) {
  var chk         = document.getElementById('chk-' + id);
  var statusSel   = document.querySelector('select[data-id="' + id + '"][data-field="status"]');
  var row         = document.getElementById('row-' + id);
  var transferRow = document.getElementById('transfer-' + id);
  if (!chk || !statusSel || !row) return;

  var statusVal = statusSel.value;
  var isDone    = chk.checked || DONE_STATUSES.indexOf(statusVal) !== -1;

  row.classList.remove('completed', 'in-progress', 'transferred-row');
  if (statusVal === 'transferred')   row.classList.add('transferred-row');
  else if (isDone)                   row.classList.add('completed');
  else if (statusVal === 'in-progress') row.classList.add('in-progress');

  if (transferRow) transferRow.style.display = (statusVal === 'transferred') ? '' : 'none';
}

// ── Summary counters ──────────────────────────────────────────────────────────

function getActiveTrack() {
  var r = document.querySelector('input[name="track"]:checked');
  return r ? r.value : null;
}

// Return true if a course row belongs to the currently-visible set for counting.
function rowIsVisible(chk) {
  var prefix = chk.dataset.prefix;
  var activeTrack = getActiveTrack();

  if (prefix === 'major') {
    // Inside a choose_one_track group: only count rows in the active sub-panel.
    var subPanel = chk.closest('.track-sub-panel');
    if (subPanel) return subPanel.classList.contains('active');
    return true;
  }

  if (prefix === 'college') return true; // college reqs always visible

  // Gen-ed: only count if this prefix matches the active gen-ed track.
  return prefix === activeTrack;
}

function updateSummary() {
  var totals = { gened: {done:0,all:0}, major: {done:0,all:0}, grad: {done:0,all:0} };

  // Course-row checkboxes (data-prefix present).
  document.querySelectorAll('input[type="checkbox"][data-prefix]').forEach(function(chk) {
    if (!rowIsVisible(chk)) return;
    var id     = chk.dataset.id;
    var sel    = document.querySelector('select[data-id="' + id + '"][data-field="status"]');
    var status = sel ? sel.value : '';
    var isDone = chk.checked || DONE_STATUSES.indexOf(status) !== -1;
    var prefix = chk.dataset.prefix;

    if (prefix === 'major' || prefix === 'college') {
      totals.major.all  += 1;
      if (isDone) totals.major.done += 1;
    } else {
      totals.gened.all  += 1;
      if (isDone) totals.gened.done += 1;
    }
  });

  // Associate's track: gen-ed is one block satisfied when key fields filled.
  var activeTrack = getActiveTrack();
  if (activeTrack === 'associates') {
    var degreeEl = document.getElementById('aa-degree-type') ||
                   document.querySelector('[id^="aa-degree"]');
    var instEl   = document.getElementById('aa-institution');
    var degreeOk = degreeEl && degreeEl.value;
    var instOk   = instEl && instEl.value.trim();
    totals.gened.all  = 1;
    totals.gened.done = (degreeOk && instOk) ? 1 : 0;
  }

  // Completion-layout programs have no gen-ed column.
  if (document.body.classList.contains('completion-layout')) {
    totals.gened.all = 0; totals.gened.done = 0;
  }

  // Graduation checkboxes.
  document.querySelectorAll('input[type="checkbox"][data-grad]').forEach(function(chk) {
    totals.grad.all  += 1;
    if (chk.checked) totals.grad.done += 1;
  });

  // Compliance checkboxes count toward total but not a dedicated bucket.
  var compDone = 0, compAll = 0;
  document.querySelectorAll('input[type="checkbox"][data-compliance]').forEach(function(chk) {
    compAll  += 1;
    if (chk.checked) compDone += 1;
  });

  document.getElementById('gened-done').textContent = totals.gened.done;
  document.getElementById('gened-all').textContent  = totals.gened.all;
  document.getElementById('major-done').textContent = totals.major.done;
  document.getElementById('major-all').textContent  = totals.major.all;
  document.getElementById('grad-done').textContent  = totals.grad.done;
  document.getElementById('grad-all').textContent   = totals.grad.all;
  document.getElementById('total-done').textContent =
    totals.gened.done + totals.major.done + totals.grad.done + compDone;
  document.getElementById('total-all').textContent  =
    totals.gened.all  + totals.major.all  + totals.grad.all  + compAll;
}

// ── Event delegation ──────────────────────────────────────────────────────────

document.addEventListener('change', function(e) {
  var t = e.target;

  // Associates degree fields.
  if (t.id && t.id.indexOf('aa-') === 0) { updateSummary(); return; }

  // Graduation checkboxes.
  if (t.dataset && t.dataset.grad !== undefined) { updateSummary(); return; }

  // Compliance checkboxes.
  if (t.dataset && t.dataset.compliance !== undefined) { updateSummary(); return; }

  // Escrow checkbox.
  if (t.id && t.id.indexOf('chk-escrow-') === 0) { updateSummary(); return; }

  if (!t.dataset || !t.dataset.id) return;
  var id = t.dataset.id;

  // Status select: auto-check when set to a done status.
  if (t.tagName === 'SELECT' && t.dataset.field === 'status') {
    if (DONE_STATUSES.indexOf(t.value) !== -1) {
      var chk = document.getElementById('chk-' + id);
      if (chk) chk.checked = true;
    }
  }

  // Unchecking a checkbox: clear done status so row isn't still colored.
  if (t.type === 'checkbox' && !t.checked) {
    var sel = document.querySelector('select[data-id="' + id + '"][data-field="status"]');
    if (sel && DONE_STATUSES.indexOf(sel.value) !== -1) sel.value = '';
  }

  updateRow(id);
  updateSummary();
});

// ── Reset ─────────────────────────────────────────────────────────────────────

function resetAll() {
  if (!confirm('Clear all entries on this worksheet?')) return;
  document.querySelectorAll('input[type="checkbox"]').forEach(function(c) {
    // Don't uncheck pre-set auto-fulfilled/exempt items.
    if (c.closest('tr.auto-fulfilled') || c.closest('tr.exempt') ||
        c.closest('li.auto-fulfilled-grad')) return;
    c.checked = false;
  });
  document.querySelectorAll('input[type="text"]').forEach(function(i) { i.value = ''; });
  document.querySelectorAll('select[data-field="status"]').forEach(function(s) {
    if (!s.closest('tr.exempt')) s.value = '';
  });
  document.querySelectorAll('tr').forEach(function(r) {
    r.classList.remove('completed', 'in-progress', 'transferred-row');
    if (r.classList.contains('transfer-detail')) r.style.display = 'none';
  });
  // Re-apply completed class for pre-set exempt/auto-fulfilled rows.
  document.querySelectorAll('tr.exempt, tr.auto-fulfilled').forEach(function(r) {
    r.classList.add('completed');
  });

  var firstRadio = document.querySelector('input[name="track"]');
  if (firstRadio) { firstRadio.checked = true; setTrack(firstRadio.value); }
  else updateSummary();
}

// ── Gen-ed track radio listeners ──────────────────────────────────────────────

document.querySelectorAll('input[name="track"]').forEach(function(r) {
  r.addEventListener('change', function(e) { setTrack(e.target.value); });
});

// ── Initialize ────────────────────────────────────────────────────────────────

(function init() {
  // Initialize all existing rows to correct visual state.
  document.querySelectorAll('input[type="checkbox"][data-prefix]').forEach(function(chk) {
    updateRow(chk.dataset.id);
  });

  var checked = document.querySelector('input[name="track"]:checked');
  if (checked) setTrack(checked.value);
  else updateSummary();
})();
`;
