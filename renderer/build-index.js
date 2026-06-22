#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

const DEFAULT_PROGRAMS_DIR = path.join(__dirname, '..', 'data', 'programs');
const DEFAULT_OUTPUT_DIR   = path.join(__dirname, '..', 'output');

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { dir: null, out: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' && args[i + 1]) result.dir = path.resolve(args[++i]);
    if (args[i] === '--out' && args[i + 1]) result.out = path.resolve(args[++i]);
  }
  return result;
}

function loadPrograms(programsDir) {
  const files = fs.readdirSync(programsDir).filter(f => f.endsWith('.json')).sort();
  const programs = [];
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(programsDir, f), 'utf8'));
      const p = data.program;
      programs.push({
        id:           p.id,
        title:        p.title,
        sequence:     p.sequence || null,
        degree:       p.degree,
        college:      p.college || 'Uncategorized',
        catalog_year: p.catalog_year || '',
      });
    } catch (err) {
      console.error(`  WARN skipping ${f}: ${err.message}`);
    }
  }
  return programs;
}

function groupByCollege(programs) {
  const map = new Map();
  for (const p of programs) {
    if (!map.has(p.college)) map.set(p.college, []);
    map.get(p.college).push(p);
  }
  // sort colleges; sort programs within each college by title then sequence
  const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [, list] of sorted) {
    list.sort((a, b) => {
      const t = a.title.localeCompare(b.title);
      if (t !== 0) return t;
      return (a.sequence || '').localeCompare(b.sequence || '');
    });
  }
  return sorted; // Array of [collegeName, programArray]
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildIndexHTML(groups, outputDir, generatedAt) {
  const htmlDir = path.join(outputDir, 'html');
  const total   = groups.reduce((n, [, list]) => n + list.length, 0);

  const sections = groups.map(([college, programs]) => {
    const rows = programs.map(p => {
      const htmlPath   = path.join(htmlDir, `${p.id}.html`);
      const available  = fs.existsSync(htmlPath);
      const linkHref   = `./html/${esc(p.id)}.html`;
      const label      = p.sequence
        ? `${esc(p.title)} — ${esc(p.sequence)}`
        : esc(p.title);
      const nameCell   = available
        ? `<a href="${linkHref}">${label}</a>`
        : `<span class="unavailable">${label}</span>`;

      return `
      <tr>
        <td class="degree-badge">${esc(p.degree)}</td>
        <td class="program-name">${nameCell}</td>
        <td class="catalog-year">${esc(p.catalog_year)}</td>
      </tr>`;
    }).join('');

    return `
  <section>
    <h2>${esc(college)}</h2>
    <table>
      <tbody>${rows}
      </tbody>
    </table>
  </section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Degree Progress Worksheets — Illinois State University</title>
<style>
:root {
  --red: #CE1126;
  --gray-bg: #f4f4f4;
  --gray-border: #d0d0d0;
  --gray-text: #555;
}
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
  margin: 0;
  padding: 20px 24px 48px;
  background: var(--gray-bg);
  color: #222;
}
.page { max-width: 860px; margin: 0 auto; }
header { margin-bottom: 24px; }
h1 {
  margin: 0 0 4px;
  color: var(--red);
  font-size: 1.5em;
}
.subtitle {
  color: var(--gray-text);
  font-size: 0.9em;
}
.meta {
  font-size: 0.8em;
  color: #888;
  margin-top: 2px;
}
section { margin-bottom: 28px; }
h2 {
  font-size: 1em;
  font-weight: 600;
  color: #fff;
  background: var(--red);
  margin: 0;
  padding: 6px 10px;
  border-radius: 3px 3px 0 0;
}
table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border: 1px solid var(--gray-border);
  border-top: none;
  border-radius: 0 0 3px 3px;
  font-size: 0.9em;
}
tr:not(:last-child) td { border-bottom: 1px solid #eee; }
td { padding: 7px 10px; vertical-align: middle; }
.program-name { width: 100%; }
.program-name a {
  color: var(--red);
  text-decoration: none;
}
.program-name a:hover { text-decoration: underline; }
.unavailable { color: #aaa; }
.degree-badge {
  white-space: nowrap;
  font-size: 0.8em;
  color: #fff;
  background: #888;
  border-radius: 3px;
  padding: 2px 6px;
  font-weight: 600;
}
.catalog-year {
  white-space: nowrap;
  color: var(--gray-text);
  font-size: 0.82em;
}
</style>
</head>
<body>
<div class="page">
  <header>
    <h1>Degree Progress Worksheets</h1>
    <div class="subtitle">Illinois State University</div>
    <div class="meta">${total} programs · Generated ${esc(generatedAt)}</div>
  </header>
${sections}
</div>
</body>
</html>`;
}

const { dir, out } = parseArgs();
const programsDir  = dir || DEFAULT_PROGRAMS_DIR;
const outputDir    = out || DEFAULT_OUTPUT_DIR;

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const programs    = loadPrograms(programsDir);
const groups      = groupByCollege(programs);
const generatedAt = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
const html        = buildIndexHTML(groups, outputDir, generatedAt);
const outPath     = path.join(outputDir, 'index.html');

fs.writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${path.relative(process.cwd(), outPath)} (${programs.length} programs, ${groups.length} colleges)`);
