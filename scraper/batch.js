#!/usr/bin/env node
'use strict';

// Batch scraper: reads scraper/programs-manifest.json and runs every entry.
//
// Usage:
//   node scraper/batch.js [--out <dir>] [--force] [--no-cache]
//
// Options:
//   --out <dir>   Output directory (default: output/scraped-data/)
//   --force       Overwrite existing files
//   --no-cache    Re-fetch all API responses (ignore cache)

const fs   = require('fs');
const path = require('path');
const { runProgram } = require('./scrape.js');

const ROOT          = path.join(__dirname, '..');
const MANIFEST_PATH = path.join(__dirname, 'programs-manifest.json');
const DEFAULT_OUT   = path.join(ROOT, 'output', 'scraped-data');

function parseArgs(argv) {
  const opts = { force: false, noCache: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force')    { opts.force   = true; continue; }
    if (a === '--no-cache') { opts.noCache = true; continue; }
    if (a === '--out')      { opts.out     = argv[++i]; continue; }
  }
  return opts;
}

async function main() {
  const baseOpts = parseArgs(process.argv.slice(2));
  const outDir   = baseOpts.out ? path.resolve(baseOpts.out) : DEFAULT_OUT;

  fs.mkdirSync(outDir, { recursive: true });

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  console.log(`Batch scrape: ${manifest.length} entries → ${path.relative(ROOT, outDir)}\n`);

  let ok = 0, skipped = 0;
  const errors = [];

  for (let i = 0; i < manifest.length; i++) {
    const entry = manifest[i];
    const label = `[${i + 1}/${manifest.length}] ${entry.programId}`;
    process.stdout.write(`${label}\n`);

    try {
      await runProgram({
        program:   entry.code,
        sequence:  entry.sequence ?? undefined,
        programId: entry.programId,
        out:       outDir,
        force:     baseOpts.force,
        noCache:   baseOpts.noCache,
      });
      ok++;
    } catch (err) {
      const msg = err.message ?? String(err);
      console.error(`  ✗  ERROR: ${msg}`);
      errors.push({ programId: entry.programId, code: entry.code, sequence: entry.sequence, error: msg });
      skipped++;
    }
  }

  console.log('\n' + '─'.repeat(72));
  console.log(`Done. ${ok} succeeded, ${skipped} failed.`);

  if (errors.length) {
    const errPath = path.join(outDir, '_batch-errors.json');
    fs.writeFileSync(errPath, JSON.stringify(errors, null, 2) + '\n');
    console.log(`\nErrors written to ${path.relative(ROOT, errPath)}:`);
    for (const e of errors) {
      console.log(`  • ${e.programId}: ${e.error}`);
    }
  }
}

main().catch(err => { console.error(err.message ?? err); process.exit(1); });
