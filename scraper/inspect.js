'use strict';

// Dev utility — dumps raw CourseDog data for one program so we can verify
// the data model before writing the transformer.
//
// Usage:
//   node scraper/inspect.js <COURSEDOG_CODE> [--section <section>]
//
// Sections:
//   program    Top-level program metadata (default)
//   reqs       requisitesSimple array (requirement blocks)
//   courses    Resolved course objects for all course group IDs in the program
//   conditions Summary of condition types found in rules (for mapping analysis)
//   attributes Summary of GE14/IAI attributes found on resolved courses
//   levels     requirementLevels array
//   all        Everything above
//
// Examples:
//   node scraper/inspect.js ACCNTCYBS
//   node scraper/inspect.js ACCNTCYBS --section reqs
//   node scraper/inspect.js ACCNTCYBS --section courses
//   node scraper/inspect.js ACCNTCYBS --section attributes

const { fetchPrograms, fetchCourses } = require('./fetch.js');

const args = process.argv.slice(2);
const code = args.find(a => !a.startsWith('--'));
const sectionIdx = args.indexOf('--section');
const section = sectionIdx !== -1 ? args[sectionIdx + 1] : 'program';

if (!code) {
  console.error('Usage: node scraper/inspect.js <COURSEDOG_CODE> [--section program|reqs|courses|conditions|attributes|levels|all]');
  process.exit(1);
}

// Recursively collect all courseGroupIds from a rules array
function collectGroupIds(rules) {
  const ids = new Set();
  for (const rule of rules || []) {
    if (rule.value?.condition === 'courses') {
      for (const entry of rule.value.values || []) {
        for (const id of entry.value || []) ids.add(id);
      }
    }
    // Recurse into nested rules if present
    collectGroupIds(rule.rules).forEach(id => ids.add(id));
  }
  return ids;
}

// Walk all rules in all requisitesSimple blocks
function collectAllGroupIds(program) {
  const ids = new Set();
  for (const block of program.requisites?.requisitesSimple || []) {
    collectGroupIds(block.rules).forEach(id => ids.add(id));
  }
  return [...ids];
}

// Summarise condition types present in a rule tree
function summariseConditions(rules, out = new Map()) {
  for (const rule of rules || []) {
    const key = `${rule.condition} / value.condition=${rule.value?.condition}`;
    out.set(key, (out.get(key) || 0) + 1);
    summariseConditions(rule.rules, out);
  }
  return out;
}

function allConditions(program) {
  const out = new Map();
  for (const block of program.requisites?.requisitesSimple || []) {
    summariseConditions(block.rules, out);
  }
  return out;
}

async function main() {
  const result = await fetchPrograms([code]);

  // fetchPrograms returns either an array or { data: [...] }
  const programs = Array.isArray(result) ? result : (result.data ?? result.programs ?? []);
  const program = programs.find(p => p.code === code);

  if (!program) {
    console.error(`Program "${code}" not found. Available codes in response:`);
    programs.slice(0, 10).forEach(p => console.error(`  ${p.code} — ${p.catalogDisplayName}`));
    process.exit(1);
  }

  const show = section === 'all' ? ['program', 'levels', 'reqs', 'courses', 'conditions', 'attributes'] : [section];

  for (const sec of show) {
    console.log(`\n${'='.repeat(72)}`);
    console.log(`SECTION: ${sec.toUpperCase()}  (${code} — ${program.catalogDisplayName})`);
    console.log('='.repeat(72));

    if (sec === 'program') {
      const { requisites, degreeMaps, specializations, ...meta } = program;
      console.log(JSON.stringify(meta, null, 2));
    }

    if (sec === 'levels') {
      console.log(JSON.stringify(program.requirementLevels ?? [], null, 2));
    }

    if (sec === 'reqs') {
      console.log(JSON.stringify(program.requisites?.requisitesSimple ?? [], null, 2));
    }

    if (sec === 'conditions') {
      const counts = allConditions(program);
      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
      for (const [key, count] of sorted) {
        console.log(`  ${count.toString().padStart(3)}×  ${key}`);
      }
    }

    if (sec === 'courses' || sec === 'attributes') {
      const groupIds = collectAllGroupIds(program);
      if (groupIds.length === 0) {
        console.log('(no course group IDs found)');
        continue;
      }
      const courseResult = await fetchCourses(groupIds);
      const courses = Array.isArray(courseResult) ? courseResult : (courseResult.data ?? courseResult.courses ?? []);

      if (sec === 'courses') {
        console.log(JSON.stringify(courses, null, 2));
      }

      if (sec === 'attributes') {
        // Print a deduplicated sorted list of all attribute strings found
        const attrSet = new Set();
        for (const c of courses) {
          for (const attr of c.attributes ?? []) attrSet.add(attr);
        }
        const attrs = [...attrSet].sort();
        console.log(`${attrs.length} unique attribute values:\n`);
        for (const a of attrs) console.log(`  ${a}`);

        // Also show which courses carry GE14 or IAI attributes
        console.log('\nCourses with GE14 / IAI attributes:');
        for (const c of courses) {
          const relevant = (c.attributes ?? []).filter(a => /^GE14|^GE27|^IAI|^MIAI/.test(a));
          if (relevant.length) console.log(`  ${c.code.padEnd(12)} ${relevant.join(', ')}`);
        }
      }
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
