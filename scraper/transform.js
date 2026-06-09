'use strict';

const { attributeToGenedIds } = require('./gened-map.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// "Financial Accounting Sequence - 74 Minimum Required Hours" → 74
function parseMinHours(name) {
  const m = name.match(/\b(\d+)\s+(?:Minimum\s+)?Required\s+Hours/i);
  return m ? parseInt(m[1], 10) : null;
}

// "26/27" → "2026-2027"
function parseCatalogYear(program) {
  const raw = program.customFields?.startingCatalogYear;
  if (raw && /^\d{2}\/\d{2}$/.test(raw)) {
    const [y1, y2] = raw.split('/');
    return `20${y1}-20${y2}`;
  }
  const year = program.startTerm?.year;
  if (year) return `${year}-${parseInt(year, 10) + 1}`;
  return 'unknown';
}

// "BUSIN - College of Business" → "College of Business"
function cleanCollegeName(raw) {
  return (raw || '').replace(/^[A-Z0-9]+\s+-\s+/, '').trim();
}

// "Accountancy - Bachelor of Science" → "Accountancy"
function parseProgramTitle(catalogDisplayName) {
  const m = (catalogDisplayName || '').match(/^(.+?)\s*-\s*(?:Bachelor|Master|Doctor)/i);
  return m ? m[1].trim() : (catalogDisplayName || '');
}

// "Financial Accounting Sequence - 74 Minimum Required Hours" → "Financial Accounting Sequence"
function parseSequenceTitle(blockName) {
  return blockName.replace(/\s*-\s*\d+.*$/i, '').trim();
}

// "BS - Bachelor of Science" → "B.S."
const DEGREE_MAP = { BS: 'B.S.', BA: 'B.A.', BM: 'B.M.', BSN: 'B.S.N.', BFA: 'B.F.A.', BSED: 'B.S.Ed.' };
function parseDegree(degreeDesignation) {
  const code = (degreeDesignation || '').match(/^([A-Z]+)/)?.[1] ?? '';
  return DEGREE_MAP[code] ?? degreeDesignation ?? '';
}

// ---------------------------------------------------------------------------
// Courses map
// ---------------------------------------------------------------------------

// Build a Map<courseGroupId, {normId, code, credits, attributes}> from the raw
// CourseDog courses array. courseGroupId is the stable numeric ID used in rules.
function buildCoursesMap(rawCourses) {
  const arr = Array.isArray(rawCourses) ? rawCourses
    : (rawCourses?.data ?? rawCourses?.courses ?? []);

  const map = new Map();
  for (const c of arr) {
    const gid = c.courseGroupId;
    if (!gid) continue;
    const normId = (c.subjectCode + c.courseNumber).toUpperCase();
    const code   = c.subjectCode + ' ' + c.courseNumber;
    const raw = c.credits?.numberOfCredits;
    const credits = (raw != null && raw !== 99)
      ? raw
      : (c.credits?.creditHours?.min ?? 0);
    map.set(gid, { normId, code, credits, attributes: c.attributes ?? [] });
  }
  return map;
}

// ---------------------------------------------------------------------------
// Slot building from a single rule's value.values
// ---------------------------------------------------------------------------

// Returns { slots: [...schema slot objects], courseGroupIds: Set<string> }
function buildSlots(rule, coursesMap) {
  const slots = [];
  const courseGroupIds = new Set();

  for (const entry of (rule.value?.values ?? [])) {
    const ids = entry.value ?? [];
    for (const id of ids) courseGroupIds.add(id);

    if (entry.logic === 'or' && ids.length > 1) {
      // Inline choose_one: student picks one from the list
      const options = ids.map(id => coursesMap.get(id)?.normId).filter(Boolean);
      if (options.length > 0) slots.push({ fill: 'choose_one', options });
    } else {
      // Required slot: logic "and" with one ID, or degenerate single-ID "or"
      const course = ids[0] && coursesMap.get(ids[0]);
      if (course) slots.push({ course_id: course.normId });
    }
  }

  return { slots, courseGroupIds };
}

// ---------------------------------------------------------------------------
// Major groups from a sequence block
// ---------------------------------------------------------------------------

// Convert a rule name to a stable group ID slug: "Required courses" → "required_courses"
function ruleSlug(name) {
  return (name || 'group')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
}

// Try to parse a course count and credit minimum from a freeformText value string.
// "Complete 5 (15 credit hours)…" → { count: 5, minimum_hours: 15 }
function parseFreeformCounts(text) {
  const countMatch = (text || '').match(/complete\s+(\d+)/i);
  const creditsMatch = (text || '').match(/\((\d+)\s+credit\s+hours?\)/i);
  return {
    count:         countMatch   ? parseInt(countMatch[1],   10) : null,
    minimum_hours: creditsMatch ? parseInt(creditsMatch[1], 10) : null,
  };
}

// Returns { groups: [...schema group objects], courseGroupIds: Set<string> }
function buildMajorGroups(seqBlock, coursesMap, warnings) {
  const groups = [];
  const allGroupIds = new Set();
  // Track used slugs within this sequence to ensure unique group IDs
  const usedSlugs = new Map();

  function uniqueId(name) {
    const slug = ruleSlug(name);
    const n = usedSlugs.get(slug) ?? 0;
    usedSlugs.set(slug, n + 1);
    return n === 0 ? `major.${slug}` : `major.${slug}_${n + 1}`;
  }

  for (const rule of (seqBlock.rules ?? [])) {
    // --- completedAllOf: fixed required courses ---
    if (rule.condition === 'completedAllOf' && rule.value?.condition === 'courses') {
      const { slots, courseGroupIds } = buildSlots(rule, coursesMap);
      courseGroupIds.forEach(id => allGroupIds.add(id));

      const group = {
        id: uniqueId(rule.name || 'Required Courses'),
        title: rule.name || 'Required Courses',
        fill: 'fixed',
        slots,
      };
      if (rule.notes) group.note = stripHtml(rule.notes);
      groups.push(group);

    // --- completeVariableCoursesAndVariableCredits / completedAtLeastXOf: choose_n ---
    } else if ((rule.condition === 'completeVariableCoursesAndVariableCredits'
             || rule.condition === 'completedAtLeastXOf')
            && rule.value?.condition === 'courses') {

      const options = [];
      for (const entry of (rule.value?.values ?? [])) {
        for (const id of (entry.value ?? [])) {
          allGroupIds.add(id);
          const c = coursesMap.get(id);
          if (c) options.push(c.normId);
        }
      }

      const group = {
        id: uniqueId(rule.name || 'Electives'),
        title: rule.name || 'Electives',
        fill: 'choose_n',
        n: rule.minCourses ?? rule.restriction,
        options,
      };
      if (rule.minCredits != null) group.minimum_hours = rule.minCredits;
      if (rule.notes) group.note = stripHtml(rule.notes);
      groups.push(group);

    // --- minimumCredits: choose_n pool with credit-hour floor ---
    } else if (rule.condition === 'minimumCredits' && rule.value?.condition === 'courses') {
      const options = [];
      for (const entry of (rule.value?.values ?? [])) {
        for (const id of (entry.value ?? [])) {
          allGroupIds.add(id);
          const c = coursesMap.get(id);
          if (c) options.push(c.normId);
        }
      }

      const minHrs = rule.restriction ?? null;
      const group = {
        id: uniqueId(rule.name || 'Pool'),
        title: rule.name || 'Pool',
        fill: 'choose_n',
        options,
      };
      if (minHrs != null) group.minimum_hours = minHrs;
      if (rule.notes) group.note = stripHtml(rule.notes);
      groups.push(group);

      if (minHrs == null) {
        warnings.push(`REVIEW ${group.id}: minimumCredits rule has no restriction value — set minimum_hours manually`);
      }

    // --- freeformText: open group with note text (no structured course list) ---
    } else if (rule.condition === 'freeformText') {
      const { count, minimum_hours } = parseFreeformCounts(String(rule.value ?? ''));
      const noteText = rule.notes ? stripHtml(rule.notes) : String(rule.value ?? '').trim();

      const group = {
        id: uniqueId(rule.name || 'Freeform'),
        title: rule.name || 'Requirements',
        fill: 'open',
      };
      if (count         != null) group.count         = count;
      if (minimum_hours != null) group.minimum_hours = minimum_hours;
      if (noteText)              group.note           = noteText;
      groups.push(group);

      warnings.push(`REVIEW ${group.id}: freeformText rule — no structured course list; course options must be added manually`);
    }
  }

  return { groups, courseGroupIds: allGroupIds };
}

// ---------------------------------------------------------------------------
// Gen-ed section (static template + auto_fulfilled_by overlay)
// ---------------------------------------------------------------------------

const ISU_GENED_TEMPLATE = [
  { id: 'isu.communication_composition', title: 'Communication & Composition',  count: 2 },
  { id: 'isu.mathematics',               title: 'Mathematics',                  count: 1 },
  { id: 'isu.natural_science',           title: 'Natural Science',              count: 2, constraint: 'Must be from 2 different sciences' },
  { id: 'isu.us_traditions',             title: 'United States Traditions',     count: 1 },
  { id: 'isu.individuals_civic_life',    title: 'Individuals & Civic Life',     count: 1 },
  { id: 'isu.fine_arts',                 title: 'Fine Arts',                    count: 1, minimum_hours: 3 },
  { id: 'isu.humanities',               title: 'Humanities',                   count: 1 },
  { id: 'isu.language_humanities',       title: 'Language in the Humanities',   count: 1 },
  { id: 'isu.quantitative_reasoning',    title: 'Quantitative Reasoning',       count: 1 },
  { id: 'isu.science_math_technology',   title: 'Science, Math, & Technology',  count: 1 },
  { id: 'isu.social_sciences',           title: 'Social Sciences',              count: 1 },
];

const IAI_GENED_TEMPLATE = [
  { id: 'iai.communication',          title: 'Communication & Composition',  count: 3, constraint: 'Grade of C or better required in ENG 101 and ENG 145 or equivalents' },
  { id: 'iai.mathematics',            title: 'Mathematics',                  count: 1 },
  { id: 'iai.physical_life_sciences', title: 'Physical & Life Sciences',     count: 2, minimum_hours: 7, constraint: '1 life science + 1 physical science; at least 1 with lab' },
  { id: 'iai.humanities_fine_arts',   title: 'Humanities & Fine Arts',       count: 3, constraint: 'At least 1 humanities + 1 fine arts' },
  { id: 'iai.social_sciences',        title: 'Social & Behavioral Sciences', count: 3, constraint: 'Two different disciplines required' },
];

const ASSOCIATES_TRACK = {
  id: 'associates',
  title: "Completed Associate's Degree",
  summary: "Baccalaureate-oriented A.A. or A.S. fulfills ISU Gen Ed",
  type: 'metadata_only',
  fields: [
    { id: 'degree_type',       label: 'Degree type',    type: 'select', options: ['A.A.', 'A.S.'], required: true },
    { id: 'field',             label: 'Field of study', type: 'text' },
    { id: 'institution',       label: 'Institution',    type: 'text', required: true },
    { id: 'date_awarded',      label: 'Date awarded',   type: 'text' },
    { id: 'includes_iai_gecc', label: 'Includes IAI GECC', type: 'select', options: ['yes', 'no'],
      note: 'Required for A.S. degrees from Illinois institutions' },
  ],
};

// requiredCourses: array of {normId, code, credits, attributes} for all courses in the sequence
function buildGenedSection(requiredCourses, warnings) {
  // Build genedGroupId → [courseId, ...] from course attributes
  const fulfilledBy = new Map();
  for (const c of requiredCourses) {
    for (const gid of c.attributes.flatMap(a => attributeToGenedIds(a))) {
      if (!fulfilledBy.has(gid)) fulfilledBy.set(gid, []);
      if (!fulfilledBy.get(gid).includes(c.normId)) {
        fulfilledBy.get(gid).push(c.normId);
      }
    }
  }

  function overlayGroup(tmpl) {
    const group = { id: tmpl.id, title: tmpl.title, fill: 'open', count: tmpl.count };
    if (tmpl.constraint)    group.constraint    = tmpl.constraint;
    if (tmpl.minimum_hours) group.minimum_hours = tmpl.minimum_hours;

    const satisfied = fulfilledBy.get(tmpl.id);
    if (satisfied?.length) {
      group.auto_fulfilled_by = [...satisfied];
      warnings.push(`REVIEW ${tmpl.id}: auto_fulfilled_by [${satisfied.join(', ')}] — verify whether this should be 'exempt: true' instead`);
    }
    return group;
  }

  return {
    tracks: [
      {
        id: 'isu',
        title: 'ISU General Education Program',
        summary: '13 courses / 39 credit hours',
        type: 'course_based',
        groups: ISU_GENED_TEMPLATE.map(overlayGroup),
      },
      {
        id: 'iai',
        title: 'IAI Transferable General Education Core',
        summary: '12-13 courses / 37-41 credit hours',
        type: 'course_based',
        eligibility_note: 'At least one transfer course must articulate to an IAI core requirement.',
        groups: IAI_GENED_TEMPLATE.map(overlayGroup),
      },
      ASSOCIATES_TRACK,
    ],
  };
}

// ---------------------------------------------------------------------------
// Courses section
// ---------------------------------------------------------------------------

// Returns the flat courses array with fulfills arrays.
// Collects course→majorGroupId membership from groups, then appends gen-ed group
// IDs from each course's attributes.
function buildCoursesSection(majorGroups, coursesMap, warnings) {
  // courseId → [groupIds it fulfills]
  const fulfillsMap = new Map();

  function track(courseId, groupId) {
    if (!fulfillsMap.has(courseId)) fulfillsMap.set(courseId, []);
    const arr = fulfillsMap.get(courseId);
    if (!arr.includes(groupId)) arr.push(groupId);
  }

  for (const group of majorGroups) {
    if (group.slots) {
      for (const slot of group.slots) {
        if (slot.course_id) track(slot.course_id, group.id);
        if (slot.options)   slot.options.forEach(id => track(id, group.id));
      }
    }
    if (group.options) {
      group.options.forEach(id => track(id, group.id));
    }
  }

  // Build a normId→courseObj lookup from coursesMap
  const byNormId = new Map();
  for (const c of coursesMap.values()) {
    if (!byNormId.has(c.normId)) byNormId.set(c.normId, c);
  }

  const courses = [];
  for (const [courseId, majorGroupIds] of fulfillsMap) {
    const c = byNormId.get(courseId);
    if (!c) {
      warnings.push(`Course ${courseId} referenced in groups but not found in resolved courses`);
      continue;
    }
    const fulfills = [...majorGroupIds];
    for (const gid of c.attributes.flatMap(a => attributeToGenedIds(a))) {
      if (!fulfills.includes(gid)) fulfills.push(gid);
    }
    if (c.credits === 0) {
      warnings.push(`REVIEW ${courseId}: credits resolved to 0 — CourseDog may store variable credits; set manually`);
    }
    courses.push({ id: courseId, code: c.code, credits: c.credits, fulfills });
  }

  courses.sort((a, b) => a.code.localeCompare(b.code));
  return courses;
}

// ---------------------------------------------------------------------------
// Graduation requirements (static, degree-type-aware)
// ---------------------------------------------------------------------------

function buildGraduationRequirements(degree) {
  const trackable = [
    { id: 'hours_120',       title: '120 minimum total credit hours', note: 'Total earned hours toward the degree' },
    { id: 'hours_40_senior', title: '40 senior college hours',        note: 'Of the 120, at least 40 must be 200-300 level' },
    { id: 'amali',           title: 'AMALI requirement',              note: 'May be fulfilled by certain Gen Ed and/or major courses' },
    { id: 'ideas',           title: 'IDEAS requirement',              note: 'Inclusion, Diversity, Equity & Access' },
  ];

  if (/B\.?S\.?/.test(degree)) {
    trackable.push({
      id: 'bs_smt',
      title: 'B.S. — Science, Math, & Technology',
      note: 'Required beyond Gen Ed for B.S. degree',
      applies_when: { degree: 'B.S.' },
    });
  }
  if (/B\.?A\.?/.test(degree)) {
    trackable.push({
      id: 'ba_world_language',
      title: 'B.A. — World Language',
      note: 'Intermediate proficiency or equivalent required for B.A. degree',
      applies_when: { degree: 'B.A.' },
    });
  }

  return {
    trackable,
    narrative: [
      "Students may apply for and receive two bachelor's degrees at the same time.",
      "Some majors complete other types of degrees that do not include additional graduation requirements (e.g., B.S. in Ed., B.S.N.).",
    ],
  };
}

// ---------------------------------------------------------------------------
// Main transformer
// ---------------------------------------------------------------------------

// rawCourses: the result of fetchCourses() for all group IDs in this program
//
// opts:
//   sequenceName  {string}  partial match against sequence block names
//   programId     {string}  override the auto-generated program ID
//   catalogUrl    {string}  override the catalog URL
//
// Returns: { output: <program JSON object>, warnings: string[] }
function transformProgram(program, rawCourses, opts = {}) {
  const warnings = [];
  const coursesMap = buildCoursesMap(rawCourses);

  // --- Find the target sequence block ---
  // Multi-sequence programs use requirementLevel "sequence (subplan)".
  // Single-sequence programs store requirements at "plan (major/program)" instead.
  const seqBlocks = (program.requisites?.requisitesSimple ?? [])
    .filter(b => b.requirementLevel === 'sequence (subplan)' && b.showInCatalog !== false);

  const planBlocks = (program.requisites?.requisitesSimple ?? [])
    .filter(b => b.requirementLevel === 'plan (major/program)' && b.showInCatalog !== false);

  let seqBlock;
  if (seqBlocks.length > 0) {
    if (opts.sequenceName) {
      seqBlock = seqBlocks.find(b =>
        b.name.toLowerCase().includes(opts.sequenceName.toLowerCase()));
      if (!seqBlock) {
        const names = seqBlocks.map(b => `"${b.name}"`).join(', ');
        throw new Error(`Sequence "${opts.sequenceName}" not found.\nAvailable: ${names}`);
      }
    } else if (seqBlocks.length === 1) {
      seqBlock = seqBlocks[0];
    } else {
      warnings.push(`Multiple sequences: ${seqBlocks.map(b => b.name).join(' | ')} — using first. Pass opts.sequenceName to select.`);
      seqBlock = seqBlocks[0];
    }
  } else if (planBlocks.length > 0) {
    seqBlock = planBlocks[0];
  } else {
    warnings.push('No sequence (subplan) or plan (major/program) blocks found — major groups will be empty');
  }

  // --- Parse sequence metadata ---
  const seqTitle   = seqBlock ? parseSequenceTitle(seqBlock.name) : '';
  const minMajorHrs = seqBlock ? parseMinHours(seqBlock.name) : null;

  // --- Build major groups ---
  const { groups: majorGroups, courseGroupIds } = seqBlock
    ? buildMajorGroups(seqBlock, coursesMap, warnings)
    : { groups: [], courseGroupIds: new Set() };

  // --- Collect required courses for gen-ed overlay ---
  const seenNormIds = new Set();
  const requiredCourses = [];
  for (const gid of courseGroupIds) {
    const c = coursesMap.get(gid);
    if (c && !seenNormIds.has(c.normId)) {
      seenNormIds.add(c.normId);
      requiredCourses.push(c);
    }
  }

  // --- Build sections ---
  const courses              = buildCoursesSection(majorGroups, coursesMap, warnings);
  const general_education    = buildGenedSection(requiredCourses, warnings);
  const degree               = parseDegree(program.degreeDesignation);
  const graduation_requirements = buildGraduationRequirements(degree);

  // --- Program metadata ---
  const title       = parseProgramTitle(program.catalogDisplayName);
  const college     = cleanCollegeName(program.college);
  const catalog_year = parseCatalogYear(program);
  const programId   = opts.programId ?? program.code.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const catalogUrl  = opts.catalogUrl ?? `https://catalog.illinoisstate.edu/programs/${program.code}`;

  const output = {
    $schema_version: '1.0',
    program: {
      id: programId,
      title,
      ...(seqTitle ? { sequence: seqTitle } : {}),
      degree,
      department: program.departments?.[0] ?? '',
      college,
      catalog_year,
      catalog_url: catalogUrl,
      minimum_major_hours: minMajorHrs ?? 0,
      minimum_total_hours: 120,
      minimum_senior_hours: 40,
    },
    courses,
    major: {
      title: seqTitle || title,
      minimum_hours: minMajorHrs ?? 0,
      groups: majorGroups,
    },
    general_education,
    graduation_requirements,
  };

  return { output, warnings };
}

module.exports = { transformProgram, buildCoursesMap };
