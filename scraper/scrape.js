'use strict';

// CLI entry point for the CourseDog → program JSON scraper.
//
// Usage:
//   node scraper/scrape.js --list
//       List all active undergraduate programs with their CourseDog codes.
//
//   node scraper/scrape.js --program <CODE>
//       Scrape one program (uses first sequence if multiple exist).
//
//   node scraper/scrape.js --program <CODE> --sequence <name>
//       Scrape a specific sequence (partial name match).
//
//   node scraper/scrape.js --program <CODE> --sequence <name> --program-id <id>
//       Override the output file ID (default is auto-generated from the code).
//
//   node scraper/scrape.js --program <CODE> --dry-run
//       Print the generated JSON without writing any files.
//
// Options:
//   --out <dir>          Output directory (default: data/programs/)
//   --program-id <id>    Override the program ID / output filename stem
//   --catalog-url <url>  Override the catalog URL in program metadata
//   --dry-run            Print JSON to stdout; do not write files
//   --force              Overwrite existing output files without prompting
//   --no-cache           Ignore cached raw API responses (re-fetch everything)

const fs   = require('fs');
const path = require('path');
const { fetchPrograms, fetchCourses } = require('./fetch.js');
const { transformProgram }            = require('./transform.js');
const { unknownAttrs }                = require('./gened-map.js');

const ROOT    = path.join(__dirname, '..');
const DEFAULT_OUT = path.join(ROOT, 'data', 'programs');

// Undergraduate degree designations to include
const UNDERGRAD_DEGREES = new Set([
  'BA', 'BS', 'BM', 'BSN', 'BFA', 'BSED', 'BAS', 'BIS', 'BME',
]);

function degreeCode(degreeDesignation) {
  return (degreeDesignation || '').match(/^([A-Z]+)/)?.[1] ?? '';
}

function isUndergrad(program) {
  return program.status === 'Active'
    && program.type === 'Major'
    && UNDERGRAD_DEGREES.has(degreeCode(program.degreeDesignation));
}

// Parse argv into a simple options object
function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--list')     { opts.list = true; continue; }
    if (a === '--dry-run')  { opts.dryRun = true; continue; }
    if (a === '--force')    { opts.force = true; continue; }
    if (a === '--no-cache') { opts.noCache = true; continue; }
    if (a === '--program')    { opts.program    = argv[++i]; continue; }
    if (a === '--sequence')   { opts.sequence   = argv[++i]; continue; }
    if (a === '--program-id') { opts.programId  = argv[++i]; continue; }
    if (a === '--catalog-url'){ opts.catalogUrl = argv[++i]; continue; }
    if (a === '--out')        { opts.out        = argv[++i]; continue; }
  }
  return opts;
}

// Collect all courseGroupIds from a program's requisitesSimple
function collectGroupIds(program) {
  const ids = new Set();
  for (const block of (program.requisites?.requisitesSimple ?? [])) {
    for (const rule of (block.rules ?? [])) {
      if (rule.value?.condition === 'courses') {
        for (const entry of (rule.value.values ?? [])) {
          for (const id of (entry.value ?? [])) ids.add(id);
        }
      }
    }
  }
  return [...ids];
}

// Write output JSON (or print if dry-run)
function writeOutput(programId, json, outDir, opts) {
  const outPath = path.join(outDir, `${programId}.json`);
  const content = JSON.stringify(json, null, 2) + '\n';

  if (opts.dryRun) {
    console.log(`\n${'─'.repeat(72)}`);
    console.log(`DRY RUN — would write: ${path.relative(ROOT, outPath)}`);
    console.log('─'.repeat(72));
    console.log(content);
    return;
  }

  if (fs.existsSync(outPath) && !opts.force) {
    console.warn(`  ⚠  File exists: ${path.relative(ROOT, outPath)} (use --force to overwrite)`);
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, content);
  console.log(`  ✓  Wrote ${path.relative(ROOT, outPath)}`);
}

// Print the warnings list with a header
function printWarnings(warnings, programId) {
  if (warnings.length === 0) return;
  console.log(`\n  Warnings for ${programId} (${warnings.length} items need human review):`);
  for (const w of warnings) console.log(`    • ${w}`);
}

// Check for attribute strings we don't know how to map
function checkUnknownAttrs(rawCourses, programId) {
  const arr = Array.isArray(rawCourses) ? rawCourses
    : (rawCourses?.data ?? rawCourses?.courses ?? []);
  const allAttrs = arr.flatMap(c => c.attributes ?? []);
  const unknown = unknownAttrs(allAttrs);
  if (unknown.length) {
    console.warn(`  ⚠  Unknown attribute codes in ${programId} (add to gened-map.js):`);
    for (const a of [...new Set(unknown)]) console.warn(`       ${a}`);
  }
}

// --list: print all active undergrad programs
async function runList() {
  console.log('Fetching all programs…');
  const raw = await fetchPrograms();
  const programs = Array.isArray(raw) ? raw : (raw.data ?? raw.programs ?? []);
  const undergrad = programs.filter(isUndergrad);

  undergrad.sort((a, b) => a.catalogDisplayName.localeCompare(b.catalogDisplayName));

  const seqLabel = p => {
    const seqs = (p.requisites?.requisitesSimple ?? [])
      .filter(b => b.requirementLevel === 'sequence (subplan)')
      .map(b => b.name.replace(/\s*-\s*\d+.*$/i, '').trim());
    return seqs.length ? seqs.join(' | ') : '(no sequences)';
  };

  console.log(`\n${undergrad.length} active undergraduate programs:\n`);
  console.log('CODE'.padEnd(20) + 'DEGREE'.padEnd(8) + 'DISPLAY NAME / SEQUENCES');
  console.log('─'.repeat(80));
  for (const p of undergrad) {
    const code   = p.code.padEnd(20);
    const deg    = degreeCode(p.degreeDesignation).padEnd(8);
    const name   = p.catalogDisplayName;
    const seqs   = seqLabel(p);
    console.log(`${code}${deg}${name}`);
    if (seqs !== '(no sequences)') console.log(`${''.padEnd(28)}↳ ${seqs}`);
  }
}

// --program: scrape one program
async function runProgram(opts) {
  const outDir = opts.out ? path.resolve(opts.out) : DEFAULT_OUT;

  console.log(`\nFetching program ${opts.program}…`);
  const raw = await fetchPrograms([opts.program]);
  const programs = Array.isArray(raw) ? raw : (raw.data ?? raw.programs ?? []);
  const program = programs.find(p => p.code === opts.program);

  if (!program) {
    console.error(`Program "${opts.program}" not found.`);
    process.exit(1);
  }

  console.log(`  ${program.catalogDisplayName} (${program.degreeDesignation})`);

  // List available sequences if no --sequence given and multiple exist
  const seqBlocks = (program.requisites?.requisitesSimple ?? [])
    .filter(b => b.requirementLevel === 'sequence (subplan)' && b.showInCatalog !== false);

  if (seqBlocks.length > 1 && !opts.sequence) {
    console.log(`\n  Multiple sequences found — use --sequence to select one:`);
    for (const b of seqBlocks) console.log(`    • "${b.name.replace(/\s*-\s*\d+.*$/i, '').trim()}"`);
    console.log('\n  Defaulting to first sequence.');
  }

  // Resolve courses
  const groupIds = collectGroupIds(program);
  console.log(`  Resolving ${groupIds.length} course group IDs…`);
  const rawCourses = await fetchCourses(groupIds);

  // Check for unknown attribute codes
  checkUnknownAttrs(rawCourses, opts.program);

  // Transform
  const { output, warnings } = transformProgram(program, rawCourses, {
    sequenceName: opts.sequence,
    programId:    opts.programId,
    catalogUrl:   opts.catalogUrl,
  });

  const programId = output.program.id;
  console.log(`\n  Program ID : ${programId}`);
  console.log(`  Sequence   : ${output.program.sequence ?? '(none)'}`);
  console.log(`  Degree     : ${output.program.degree}`);
  console.log(`  Major hrs  : ${output.program.minimum_major_hours}`);
  console.log(`  Catalog yr : ${output.program.catalog_year}`);
  console.log(`  Courses    : ${output.courses.length}`);
  console.log(`  Major grps : ${output.major.groups.length}`);

  printWarnings(warnings, programId);
  writeOutput(programId, output, outDir, opts);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.list) {
    await runList();
    return;
  }

  if (opts.program) {
    await runProgram(opts);
    return;
  }

  console.error([
    'Usage:',
    '  node scraper/scrape.js --list',
    '  node scraper/scrape.js --program <COURSEDOG_CODE> [--sequence <name>] [--program-id <id>] [--dry-run] [--force]',
  ].join('\n'));
  process.exit(1);
}

if (require.main === module) {
  main().catch(err => { console.error(err.message ?? err); process.exit(1); });
}

module.exports = { runProgram };
