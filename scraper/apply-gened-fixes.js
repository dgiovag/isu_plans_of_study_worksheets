'use strict';

// Applies two passes of gen-ed exemption fixes to program JSON files.
//
// Pass A: Reads scraper/raw/gened-exemptions.json (catalog page data) and sets
//         exempt:true on the matching ISU gen-ed group for each program.
//
// Pass B: For remaining auto_fulfilled_by groups, if all listed courses appear
//         in the major's fixed required slots and the count is covered,
//         sets exempt:true and removes auto_fulfilled_by.
//
// Usage:
//   node scraper/apply-gened-fixes.js                          # dry run
//   node scraper/apply-gened-fixes.js --write                  # apply to disk
//   node scraper/apply-gened-fixes.js --program <id>           # one program only
//   node scraper/apply-gened-fixes.js --pass a|b               # one pass only

const fs   = require('fs');
const path = require('path');

const EXEMPTIONS_FILE = path.join(__dirname, 'raw', 'gened-exemptions.json');
const PROGRAMS_DIR    = path.join(__dirname, '..', 'data', 'programs');

// Catalog exemption code → ISU gen-ed group ID
const CODE_TO_GROUP = {
  QR:  'isu.quantitative_reasoning',
  SS:  'isu.social_sciences',
  SMT: 'isu.science_math_technology',
  LH:  'isu.language_humanities',
  UST: 'isu.us_traditions',
  ICL: 'isu.individuals_civic_life',
  FA:  'isu.fine_arts',
  NS:  'isu.natural_science',
  M:   'isu.mathematics',
  H:   'isu.humanities',
  COM: 'isu.communication_composition',
};

// Known catalog-page title → program.title mismatches.
// Values may be a single string or an array of strings when a catalog department
// umbrella spans multiple distinct program titles in our data.
const TITLE_ALIASES = {
  'French':                    'French and Francophone Studies',
  'Environmental Health':      'Environmental Health and Sustainability',
  'Health Information Management': 'Health Informatics and Management',
  'Health Leadership':         'Health Informatics and Management',
  'Safety':                    'Occupational Safety and Health',
  'Graphic Communications':    'Graphic Communications Technology',
  'Communication':             'Communication Studies',
  'Middle Level Education':    'Middle Level Teacher Education',
  'Theatre and Dance':         'Theatre',
  // Department umbrellas that cover multiple program titles:
  'Kinesiology and Recreation': ['Physical Education', 'Exercise Science', 'Recreation and Sport Management'],
  'Information Technology':    ['Computer Science', 'Information Systems', 'Cybersecurity', 'Computer Networking'],
};

// Catalog entries that are intentionally not mapped and should not be flagged
// as errors.  Advisors and the Registrar should be aware these programs exist
// outside the scope of this worksheet system.
//
//   College of Arts and Sciences / Interdisciplinary Studies / European Studies
//     → IDS programs are administered by the Office of the Provost, not a
//       college, so the college field doesn't match.  The European Studies
//       sequence no longer appears in current catalog data.  These programs
//       are not well-suited to the standard worksheet format.
const INTENTIONALLY_SKIPPED = new Set([
  'College of Arts and Sciences|Interdisciplinary Studies|European Studies',
]);

// ---- Helpers ---------------------------------------------------------------

function loadPrograms(targetId) {
  return fs.readdirSync(PROGRAMS_DIR)
    .filter(f => f.endsWith('.json') && (!targetId || f === `${targetId}.json`))
    .map(f => {
      const filePath = path.join(PROGRAMS_DIR, f);
      return { filePath, id: path.basename(f, '.json'), data: JSON.parse(fs.readFileSync(filePath, 'utf8')) };
    });
}

function getIsuTrack(programData) {
  return (programData?.general_education?.tracks ?? []).find(t => t.id === 'isu') ?? null;
}

// Return true if this program is a teacher education variant.
// Used for "Teacher Education" sequence and "except teacher education" matching.
function isTeacherEd(p) {
  const seq = (p.sequence ?? '').toLowerCase();
  const deg = (p.degree  ?? '').toLowerCase();
  return seq.includes('teacher') || seq.includes('licensure') ||
         deg.includes('education') && !deg.startsWith('b.s.') ||
         deg.toLowerCase().startsWith('bme');
}

// Decide whether an exemption entry matches a loaded program.
// Returns a match-type string (truthy) or false.
function matchesProgram(entry, programData) {
  const p   = programData.program;
  const { college, title, sequence } = entry;

  if (p.college !== college) return false;

  // Title matching — alias may be a string or array of strings
  const alias      = TITLE_ALIASES[title];
  const isWildcard = title.toLowerCase() === 'all major programs';
  if (!isWildcard) {
    if (alias === undefined) {
      if (p.title !== title) return false;
    } else if (Array.isArray(alias)) {
      if (!alias.includes(p.title)) return false;
    } else {
      if (p.title !== alias) return false;
    }
  }
  const resolvedTitle = Array.isArray(alias) ? p.title : (alias ?? title);

  // Sequence matching
  const seq = (sequence ?? 'All').trim();

  // "All (one course only)" — too nuanced to auto-apply, skip
  if (seq.includes('one course only')) return false;

  if (seq === 'All') return isWildcard ? 'wildcard' : (alias ? 'alias' : 'exact');

  // "All (except X)" — match programs NOT matching X
  const exceptMatch = seq.match(/^All \(except (.+)\)$/i);
  if (exceptMatch) {
    const excl = exceptMatch[1].toLowerCase();
    if (excl.includes('teacher')) return !isTeacherEd(p) ? 'except' : false;
    // Generic fallback: exclude programs whose sequence contains the exclusion term
    return !(p.sequence ?? '').toLowerCase().includes(excl) ? 'except' : false;
  }

  // "Teacher Education" sequence — match programs that are teacher ed variants
  if (seq.toLowerCase() === 'teacher education') return isTeacherEd(p) ? 'teacher-ed' : false;

  // Specific sequence — partial match against program.sequence
  const seqLower  = seq.toLowerCase();
  const progSeqLo = (p.sequence ?? '').toLowerCase();
  return (progSeqLo.includes(seqLower) || seqLower.includes(progSeqLo)) ? 'seq-match' : false;
}

// ---- Pass A: catalog-level exemptions --------------------------------------

function runPassA(programs, exemptions, dryRun) {
  const changes   = [];
  const unmatched = [];
  const skipped   = [];

  for (const entry of exemptions) {
    if (!entry.exempt_codes.length) continue;

    const seq = (entry.sequence ?? 'All').trim();
    if (seq.includes('one course only')) {
      skipped.push(entry);
      continue;
    }

    const matched = programs.filter(p => matchesProgram(entry, p.data));
    if (!matched.length) {
      unmatched.push(entry);
      continue;
    }

    for (const prog of matched) {
      const isuTrack = getIsuTrack(prog.data);
      if (!isuTrack) continue;

      for (const code of entry.exempt_codes) {
        const groupId = CODE_TO_GROUP[code];
        if (!groupId) { console.warn(`  [warn] Unknown code: ${code}`); continue; }

        const group = isuTrack.groups.find(g => g.id === groupId);
        if (!group) continue;
        if (group.exempt) continue;

        changes.push({ programId: prog.id, groupId, reason: `PassA: ${code} (${entry.title})` });
        if (!dryRun) {
          group.exempt = true;
          delete group.auto_fulfilled_by;
        }
      }
    }
  }

  if (skipped.length) {
    console.log('\n[PassA] Skipped (one course only — needs manual review):');
    for (const e of skipped) console.log(`  ${e.college} / ${e.title} → [${e.exempt_codes}]`);
  }
  const trulyUnmatched = unmatched.filter(e => {
    const key = `${e.college}|${e.title}|${e.sequence}`;
    return !INTENTIONALLY_SKIPPED.has(key);
  });
  if (trulyUnmatched.length) {
    console.log('\n[PassA] Unmatched entries (no programs found — check titles):');
    for (const e of trulyUnmatched) console.log(`  ${e.college} / ${e.title} / ${e.sequence} → [${e.exempt_codes}]`);
  }

  return changes;
}

// ---- Pass B: consistency cleanup -------------------------------------------
// Remove auto_fulfilled_by from any gen-ed group that is already exempt:true.
// Pass A deletes auto_fulfilled_by inline when it sets exempt, but groups that
// were exempt before this run (manually set or from a prior session) may still
// carry a stale auto_fulfilled_by array.  This pass makes the data consistent:
// if you're exempt, there's nothing to auto-fulfill.

function runPassB(programs, dryRun) {
  const changes = [];

  for (const prog of programs) {
    const isuTrack = getIsuTrack(prog.data);
    if (!isuTrack) continue;

    for (const group of isuTrack.groups) {
      if (!group.exempt) continue;
      if (!group.auto_fulfilled_by) continue;

      changes.push({ programId: prog.id, groupId: group.id, reason: 'PassB: stale auto_fulfilled_by on exempt group' });
      if (!dryRun) {
        delete group.auto_fulfilled_by;
      }
    }
  }

  return changes;
}

// ---- Main ------------------------------------------------------------------

function main() {
  const args     = process.argv.slice(2);
  const dryRun   = !args.includes('--write');
  const passArg  = args.includes('--pass') ? args[args.indexOf('--pass') + 1]?.toLowerCase() : null;
  const targetId = args.includes('--program') ? args[args.indexOf('--program') + 1] : null;

  if (!fs.existsSync(EXEMPTIONS_FILE)) {
    console.error(`[error] ${EXEMPTIONS_FILE} not found — run scrape-gened-exemptions.js first`);
    process.exit(1);
  }

  const exemptions = JSON.parse(fs.readFileSync(EXEMPTIONS_FILE, 'utf8'));
  const programs   = loadPrograms(targetId);

  console.log(`[config] dry-run=${dryRun}  programs=${programs.length}  exemptions=${exemptions.length}`);
  if (dryRun) console.log('[config] Pass --write to apply changes\n');

  let changesA = [], changesB = [];

  if (!passArg || passArg === 'a') changesA = runPassA(programs, exemptions, dryRun);
  if (!passArg || passArg === 'b') changesB = runPassB(programs, dryRun);

  const allChanges = [...changesA, ...changesB];

  console.log(`\n[PassA] ${changesA.length} groups ${dryRun ? 'would be' : ''} set exempt`);
  console.log(`[PassB] ${changesB.length} groups ${dryRun ? 'would be' : ''} set exempt`);
  console.log(`[total] ${allChanges.length} changes across ${new Set(allChanges.map(c => c.programId)).size} programs`);

  if (dryRun && allChanges.length) {
    const limit = 30;
    console.log(`\nSample changes (first ${limit}):`);
    for (const c of allChanges.slice(0, limit)) {
      console.log(`  ${c.programId.padEnd(50)} ${c.groupId}  (${c.reason})`);
    }
    if (allChanges.length > limit) console.log(`  ... and ${allChanges.length - limit} more`);
  }

  if (!dryRun && allChanges.length) {
    const modified = new Set(allChanges.map(c => c.programId));
    for (const prog of programs) {
      if (!modified.has(prog.id)) continue;
      fs.writeFileSync(prog.filePath, JSON.stringify(prog.data, null, 2) + '\n');
    }
    console.log(`\n[write] ${modified.size} program files updated`);
  }
}

main();
