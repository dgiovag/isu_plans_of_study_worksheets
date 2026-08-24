#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { buildPDFs } = require('./template-pdf');
const { PAGE_BUDGET, checkBudget, formatOverflow, formatBuckets } =
  require('./modules/page-budget');

const DATA_DIR   = path.join(__dirname, '..', 'data', 'programs');
const OUTPUT_DIR = path.join(__dirname, '..', 'output', 'pdf');

function argVal(args, flag) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
}

function loadProgram(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Collected across the run so the summary can report the page distribution and
// every program that broke the two-page budget.
const pageCounts = new Map(); // pages → count
const overflows  = [];

async function buildOne(programFile, outputDir) {
  const program = loadProgram(programFile);
  const id = program.program.id;
  console.log(`Building PDFs for: ${id}`);

  const { pdfs, reports } = await buildPDFs(program);

  fs.mkdirSync(outputDir, { recursive: true });
  for (const [track, bytes] of Object.entries(pdfs)) {
    const outPath = path.join(outputDir, `${id}-${track}.pdf`);
    fs.writeFileSync(outPath, bytes);
    console.log(`  → ${path.relative(process.cwd(), outPath)}`);
  }

  for (const report of reports) {
    pageCounts.set(report.pages, (pageCounts.get(report.pages) || 0) + 1);

    const overflow = checkBudget(report);
    if (overflow) {
      overflows.push({ id, overflow });
      console.warn(`  OVER BUDGET: ${formatOverflow(id, overflow)}`);
      console.warn(formatBuckets(overflow));
    }
  }
}

// Page distribution plus, if anything overflowed, the actionable detail.
function reportBudget(strict) {
  const counts = [...pageCounts.entries()].sort((a, b) => a[0] - b[0]);
  console.log('\nPage counts: ' +
    counts.map(([pages, n]) => `${pages}pg: ${n}`).join('  ·  '));

  if (overflows.length === 0) {
    console.log(`All worksheets fit the ${PAGE_BUDGET}-page budget (one sheet, front and back).`);
    return true;
  }

  const log = strict ? console.error : console.warn;
  log(`\n${overflows.length} worksheet(s) exceed the ${PAGE_BUDGET}-page budget:`);
  for (const { id, overflow } of overflows) {
    log(`  ${formatOverflow(id, overflow)}`);
    log(formatBuckets(overflow));
  }
  log('\nThe named bucket is the one to shrink. Layout logic lives in pdf/layout.js\n' +
      'and pdf/modules/ — do not add per-program overrides to the program JSON.');

  return !strict;
}

async function main() {
  const args = process.argv.slice(2);
  const dirArg = argVal(args, '--dir');
  const outArg = argVal(args, '--out');
  const strict = args.includes('--strict');
  const dataDir   = dirArg ? path.resolve(dirArg) : DATA_DIR;
  const outputDir = outArg ? path.resolve(outArg)  : OUTPUT_DIR;

  if (args[0] === '--all' || dirArg) {
    const files = fs.readdirSync(dataDir)
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(dataDir, f));
    const failed = [];
    for (const f of files) {
      try { await buildOne(f, outputDir); }
      catch (err) { console.error(`  ERROR: ${path.basename(f)}: ${err.message}`); failed.push(f); }
    }
    if (failed.length) {
      console.error(`\n${failed.length} program(s) failed:`);
      failed.forEach(f => console.error(`  ${path.basename(f)}`));
      process.exit(1);
    }
    if (!reportBudget(strict)) process.exit(1);

  } else if (args[0] === '--program' && args[1]) {
    const filePath = path.join(dataDir, `${args[1]}.json`);
    if (!fs.existsSync(filePath)) {
      console.error(`Program not found: ${args[1]}`);
      process.exit(1);
    }
    await buildOne(filePath, outputDir);
    if (!reportBudget(strict)) process.exit(1);

  } else {
    console.error('Usage: node pdf/build-pdf.js --all | --program <id> | --dir <path>\n' +
                  '                             [--out <path>] [--strict]\n\n' +
                  `  --strict  exit non-zero if any worksheet exceeds ${PAGE_BUDGET} pages`);
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
