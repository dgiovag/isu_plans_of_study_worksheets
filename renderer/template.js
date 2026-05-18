'use strict';

const css = require('./css');
const runtime = require('./runtime');
const resolveCourses   = require('./modules/resolve-courses');
const buildXrefMap     = require('./modules/build-xref-map');
const renderGenEd      = require('./modules/render-gened');
const renderMajor      = require('./modules/render-major');
const renderGraduation = require('./modules/render-graduation');
const renderCollege    = require('./modules/render-college');
const renderCompliance = require('./modules/render-compliance');

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function catalogYearDisplay(year) {
  return year.replace('-', '–'); // en-dash
}

function programTitle(p) {
  return p.sequence
    ? `${p.title} — ${p.sequence}, ${p.degree}`
    : `${p.title}, ${p.degree}`;
}

// ── Associates-detail fields inside the track-selector ────────────────────────

// Field id → { htmlId, width, placeholder }
const ASSOC_FIELD_META = {
  degree_type:       { width: '100px',  placeholder: null },
  field:             { width: '180px',  placeholder: 'e.g. Business' },
  institution:       { width: '240px',  placeholder: 'e.g. Heartland Community College' },
  date_awarded:      { width: '110px',  placeholder: 'May 2025' },
  includes_iai_gecc: { width: '80px',   placeholder: null },
};

function assocDetailHTML(assocTrack) {
  if (!assocTrack || !assocTrack.fields) return '';
  const fieldsHTML = assocTrack.fields.map(f => {
    const meta = ASSOC_FIELD_META[f.id] || { width: '140px', placeholder: null };
    const htmlId = `aa-${f.id.replace(/_/g, '-')}`;
    if (f.type === 'select') {
      const opts = [`<option value="">—</option>`,
        ...f.options.map(o => `<option value="${esc(o)}">${esc(o)}</option>`)].join('');
      return `<label>${esc(f.label)}: <select id="${htmlId}" style="width:${meta.width};">${opts}</select></label>`;
    }
    const ph = meta.placeholder ? ` placeholder="${esc(meta.placeholder)}"` : '';
    return `<label>${esc(f.label)}: <input type="text" id="${htmlId}"${ph} style="width:${meta.width};"></label>`;
  }).join('\n  ');
  return `<div id="associates-detail">\n  ${fieldsHTML}\n</div>`;
}

// ── Track selector ─────────────────────────────────────────────────────────────

function trackSelectorHTML(gened) {
  if (gened.assumed_complete) return '';

  const courseTracks = gened.tracks.filter(t => t.type === 'course_based');
  const assocTrack   = gened.tracks.find(t => t.type === 'metadata_only');

  const radios = [
    ...courseTracks.map((t, i) =>
      `<label><input type="radio" name="track" value="${esc(t.id)}"${i === 0 ? ' checked' : ''}> ${esc(t.title)}</label>`
    ),
    assocTrack
      ? `<label><input type="radio" name="track" value="${esc(assocTrack.id)}"> ${esc(assocTrack.title)}</label>`
      : '',
  ].filter(Boolean).join('\n    ');

  return `
<div class="track-selector">
  <span class="track-label">General Education Track:</span>
  <div class="radio-group">
    ${radios}
  </div>
  ${assocDetailHTML(assocTrack)}
</div>`.trimStart();
}

// ── Gen-ed column ─────────────────────────────────────────────────────────────

function genesColumnHTML(gened, courseMap) {
  const courseTracks = gened.tracks.filter(t => t.type === 'course_based');
  const assocTrack   = gened.tracks.find(t => t.type === 'metadata_only');

  const coursePanels = courseTracks.map((t, i) => `
  <div class="track-panel${i === 0 ? ' active' : ''}" id="panel-${esc(t.id)}">
    <h2>${esc(t.title)}</h2>
    <div class="col-meta">${esc(t.summary || '')}</div>
    <div class="panel-body" data-prefix="${esc(t.id)}">
      ${renderGenEd(t, courseMap)}
    </div>
  </div>`).join('');

  const assocPanel = assocTrack ? `
  <div class="track-panel" id="panel-${esc(assocTrack.id)}">
    <h2>${esc(assocTrack.title)}</h2>
    <div class="col-meta">${esc(assocTrack.summary || 'Baccalaureate-oriented A.A. or A.S. from a regionally accredited institution')}</div>
    <div class="associates-panel-content">
      <p>A baccalaureate-oriented A.A. or A.S. degree fulfills Illinois State’s General Education requirement.
      Use the panel above to record degree details.</p>
      <p><strong>Important:</strong> If transferring from an Illinois college or university, the A.S. degree
      must include the complete IAI General Education Core Curriculum (GECC), or the student must complete
      the GECC to fulfill ISU’s General Education requirement.</p>
      <p>The advisor should attach or reference the official transcript and verify the receiving institution’s
      regional accreditation. No further course-level tracking required in this column.</p>
    </div>
  </div>` : '';

  return `<div class="column" id="gened-col">
  ${coursePanels}
  ${assocPanel}
</div>`;
}

// ── Columns wrapper ───────────────────────────────────────────────────────────

function columnsHTML(program, courseMap) {
  const gened = program.general_education;
  const isCompletion = gened.assumed_complete === true;

  const minHours = program.major.minimum_hours || program.program.minimum_major_hours;
  const majorCol = `<div class="column" id="major-col">
  <h2>Major Requirements</h2>
  <div class="col-meta">${esc(program.major.title)} · ${minHours} minimum credit hours</div>
  <div class="panel-body" data-prefix="major">
    ${renderMajor(program, courseMap)}
  </div>
</div>`;

  if (isCompletion) {
    return `
<div class="completion-notice">
  <strong>General Education:</strong> Satisfied by admission requirement (completed Associate’s degree or IAI GECC).
</div>
<div class="columns columns--single">
  ${majorCol}
</div>`;
  }

  return `
<div class="columns">
  ${genesColumnHTML(gened, courseMap)}
  ${majorCol}
</div>`;
}

// ── Main build function ───────────────────────────────────────────────────────

function buildHTML(program) {
  const p = program.program;
  const courseMap  = resolveCourses(program);
  const xrefMap    = buildXrefMap(program);
  const isCompletion = program.general_education.assumed_complete === true;

  const title      = programTitle(p);
  const catalogYear = catalogYearDisplay(p.catalog_year);

  const trackSelector = trackSelectorHTML(program.general_education);
  const columns       = columnsHTML(program, courseMap);
  const gradHTML      = renderGraduation(program);
  const collegeHTML   = renderCollege(program, courseMap);
  const complianceHTML = renderCompliance(program);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Degree Progress Worksheet — ${esc(title)}</title>
<style>
${css}
</style>
</head>
<body data-program-id="${esc(p.id)}"${isCompletion ? ' class="completion-layout"' : ''}>

<header>
  <h1>Degree Progress Worksheet</h1>
  <div class="subtitle">
    ${esc(title)} · Illinois State University · ${esc(catalogYear)} Catalog
  </div>
  <div class="summary" id="summary">
    <span>Total: <strong id="total-done">0</strong> / <span id="total-all">0</span> requirements complete</span>
    <span>Gen Ed: <strong id="gened-done">0</strong> / <span id="gened-all">0</span></span>
    <span>Major: <strong id="major-done">0</strong> / <span id="major-all">0</span></span>
    <span>Graduation: <strong id="grad-done">0</strong> / <span id="grad-all">0</span></span>
    <span class="controls">
      <button onclick="window.print()">Print</button>
      <button onclick="resetAll()">Reset all</button>
    </span>
  </div>
</header>

<div class="student-info">
  <label>Student name: <input type="text" id="stu-name" style="width:200px;"></label>
  <label>UID: <input type="text" id="stu-uid" style="width:120px;"></label>
  <label>Advisor: <input type="text" id="stu-advisor" style="width:180px;"></label>
  <label>Date: <input type="text" id="stu-date" style="width:110px;"></label>
</div>

${trackSelector}
${columns}
${gradHTML}
${collegeHTML}
${complianceHTML}

<script>
window.XREF = ${JSON.stringify(xrefMap)};
${runtime}
</script>
</body>
</html>`;
}

module.exports = { buildHTML };
