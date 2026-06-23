'use strict';

// Re-transform all program JSON files in data/programs/ using the raw cache.
// Does NOT hit any external API — reads from scraper/raw/ only.
//
// Usage:
//   node scraper/batch-retransform.js            # re-transform all, overwrite in place
//   node scraper/batch-retransform.js --dry-run  # print counts, no writes
//   node scraper/batch-retransform.js --out <dir>

const fs   = require('fs');
const path = require('path');
const { transformProgram } = require('./transform.js');
const { fetchCourses }     = require('./fetch.js');

const ROOT     = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data', 'programs');
const RAW_DIR  = path.join(__dirname, 'raw');

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') { opts.dryRun = true; continue; }
    if (a === '--out')     { opts.out = argv[++i]; continue; }
  }
  return opts;
}

function loadAllPrograms() {
  const raw = JSON.parse(fs.readFileSync(path.join(RAW_DIR, 'programs-all.json'), 'utf8'));
  const arr = Array.isArray(raw) ? raw : (raw.data ?? raw.programs ?? []);
  const map = new Map();
  for (const p of arr) if (p.code) map.set(p.code, p);
  return map;
}

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

function codeFromUrl(url) {
  return (url || '').split('/').pop();
}

async function main() {
  const opts   = parseArgs(process.argv.slice(2));
  const outDir = opts.out ? path.resolve(opts.out) : DATA_DIR;

  const allPrograms = loadAllPrograms();
  console.log(`Loaded ${allPrograms.size} programs from programs-all.json`);

  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('.'))
    .map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
      return {
        file:       f,
        programId:  data.program.id,
        code:       codeFromUrl(data.program.catalog_url),
        sequence:   data.program.sequence || null,
        catalogUrl: data.program.catalog_url,
      };
    });

  console.log(`Found ${files.length} program files.\n`);

  // Group by CourseDog code to fetch courses once per program code
  const byCode = new Map();
  for (const f of files) {
    if (!byCode.has(f.code)) byCode.set(f.code, []);
    byCode.get(f.code).push(f);
  }

  let updated = 0, flaggedPrograms = 0, totalFlaggedCourses = 0, errors = 0;

  for (const [code, entries] of byCode) {
    const program = allPrograms.get(code);
    if (!program) {
      console.error(`  ✗ ${code}: not found in programs-all.json — skipping ${entries.length} file(s)`);
      errors += entries.length;
      continue;
    }

    const groupIds  = collectGroupIds(program);
    const rawCourses = await fetchCourses(groupIds);

    for (const entry of entries) {
      try {
        const { output } = transformProgram(program, rawCourses, {
          sequenceName: entry.sequence,
          programId:    entry.programId,
          catalogUrl:   entry.catalogUrl,
        });

        const flagCount = output.courses.filter(c => c.graduation_flags?.length).length;
        if (flagCount) {
          flaggedPrograms++;
          totalFlaggedCourses += flagCount;
        }

        if (!opts.dryRun) {
          fs.writeFileSync(
            path.join(outDir, `${entry.programId}.json`),
            JSON.stringify(output, null, 2) + '\n',
          );
        }

        const marker = flagCount ? ` — ${flagCount} flagged` : '';
        if (flagCount || opts.dryRun) {
          console.log(`  ${opts.dryRun ? '[dry]' : '✓'} ${entry.programId}${marker}`);
        }
        updated++;
      } catch (err) {
        console.error(`  ✗ ${entry.programId}: ${err.message}`);
        errors++;
      }
    }
  }

  console.log(`\nDone. ${updated} files re-transformed.`);
  console.log(`      ${flaggedPrograms} programs with graduation-flagged courses (${totalFlaggedCourses} total course entries).`);
  if (errors) console.log(`      ${errors} errors — check output above.`);
}

main().catch(err => { console.error(err.message ?? err); process.exit(1); });
