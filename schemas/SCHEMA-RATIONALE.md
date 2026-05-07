# Schema Rationale

Decisions made and alternatives rejected during the design of `program-schema.json` v1.0.

## Test Programs

The schema was designed against six structurally different programs chosen to exercise edge cases:

| Program | Degree | Key Structural Challenges |
|---------|--------|--------------------------|
| Accounting (Financial Accounting) | B.S. | Choice groups, exempt gen-ed, senior elective bucket |
| Art (Art History) | B.A. | Language sequence consistency, grouped electives with per-group minimums |
| Early Childhood Education (Pedagogy) | B.S. | Elective tracks (multi-course bundles), section variants, sibling sequences |
| Music (Composition/Theory Emphasis) | B.M. | Repeatable courses, zero-credit requirements, described pools, level progression |
| Nursing (Traditional Prelicensure) | B.S.N. | Co-requisites, multi-course substitution, phased structure, clinical components |
| Nursing (RN to BSN) | B.S.N. | Escrow credit, credential-gated admission, assumed gen-ed completion |
| Physics (Teacher Education) | B.S. | College-level requirements, professional education block, open-constrained electives |

## Key Decisions

### 1. Top-level course array (chosen) vs. inline course definitions (rejected)

**Chosen:** Courses defined once in a top-level `courses` array, referenced by ID everywhere.

**Why:** A course can fulfill slots in multiple groups simultaneously (ECO 101 fills both a major requirement and IAI Social Sciences). Defining courses at the top level makes cross-referencing natural and prevents data duplication. It also mirrors a relational model that the scraper can populate independently of requirement structure.

**Rejected:** Defining courses inline where they're used. This would duplicate course data (credits, type, equivalents) everywhere a course appears and make cross-references awkward.

### 2. Ten fill types (chosen) vs. fewer composable primitives (rejected)

**Chosen:** Ten named fill types, each with clear semantics and specific properties.

**Why:** Each fill type maps to a distinct renderer behavior. A `repeat` group renders as N rows of checkboxes; a `choose_one_track` renders as a dropdown selecting a bundle. Renderer authors benefit from knowing exactly which UI pattern to produce. Schema validators can enforce that the right properties are present for each fill type.

**Rejected:** Fewer generic primitives (e.g., a single "select" type with `count`, `grouped`, `bundled` flags). This would reduce the enum but push complexity into conditional validation rules and renderer logic. The ten types are semantically distinct enough to warrant naming.

### 3. Phases (optional) vs. prerequisite annotations on groups (rejected)

**Chosen:** Optional `phases` array as an alternative to flat `groups`. Each phase has an ordinal and can declare a `prerequisite_phase`.

**Why:** Nursing has a clear two-phase structure (pre-nursing → nursing sequence) that the worksheet should represent visually. Making phases an either/or with flat groups keeps simple programs simple (Accounting has no phases) while giving complex programs a clean temporal structure.

**Rejected:** Adding `prerequisite_groups: [...]` on individual groups. This creates a dependency graph rather than a linear sequence, which is more powerful but overkill — no ISU program has non-linear prerequisite relationships between requirement blocks. Phases are simpler and sufficient.

### 4. SlotOption as string | object (chosen) vs. always-object (rejected)

**Chosen:** A SlotOption is either a plain string (course ID) or an object with `type: "set"` and `course_ids[]`.

**Why:** The overwhelmingly common case is a simple course ID. Forcing every option into `{"type": "single", "course_id": "ACC131"}` would bloat every program file for the sake of one edge case (Nursing's KNR substitutions). The union type keeps the common case concise.

**Rejected:** Always-object format. Ergonomically poor — most programs would have dozens of unnecessary wrapper objects.

### 5. `auto_fulfilled_by` semantics: hours count in major only (chosen) vs. configurable (rejected)

**Chosen:** When a major course auto-fulfills a gen-ed or graduation requirement, hours count toward the major total only. The other requirement is simply marked "satisfied" without adding hours to the student's plan.

**Why:** This is the universal behavior across all tested programs. Even in Nursing (where 96 major hours explicitly include gen-ed courses), the accounting is the same: the course's hours live in the major bucket and also check the gen-ed box. No program double-counts hours.

**Rejected:** A configurable `hours_overlap` boolean. Every program behaves the same way, so a configuration option would create confusion without enabling any real variation.

### 6. Cross-group constraints (chosen) vs. renderer-only validation (rejected)

**Chosen:** A `constraints` array on the major that formally declares relationships like "these groups must share a selection" (Art History's language sequence must be the same language across 111/112/115).

**Why:** This is a data integrity rule, not just a UI concern. The scraper should produce this constraint, and validators should check it. Leaving it renderer-only means it could be silently violated by hand-edited JSON.

**Rejected:** Handling consistency only in the renderer. This means the data can be invalid (e.g., student selects FRE 111, GER 112, SPA 115) and only the UI catches it.

### 7. College requirements as a separate top-level section (chosen) vs. embedding in graduation_requirements (rejected)

**Chosen:** `college_requirements` is an optional top-level section with its own groups, separate from both `graduation_requirements` and `major`.

**Why:** College requirements (like CAS world language for Physics Teacher Ed) are a genuinely distinct layer — they're not university-wide graduation requirements (other colleges' B.S. programs don't have world language) and they're not counted in the major hours. Structurally they need their own section that the renderer can position between major and graduation requirements.

**Rejected:** Adding them to `graduation_requirements` with an `applies_when: {college: "..."}`. This conflates two different scopes (university vs. college) and makes the renderer's job harder.

### 8. Compliance requirements as non-course items (chosen) vs. zero-credit courses (rejected)

**Chosen:** A dedicated `compliance_requirements` array for non-academic requirements (background checks, health screenings, licensure tests).

**Why:** These aren't courses — they have no course code, no credit hours, no grades, no semester placement. They're binary compliance items. Modeling them as zero-credit courses would be semantically misleading and would clutter the course array.

**Rejected:** Modeling them as courses with 0 credits. Zero-credit courses already exist legitimately (MUS 110 Recital Attendance IS a course you register for). Background checks are not.

### 9. `equivalents` on courses (chosen) vs. a separate equivalency table (rejected)

**Chosen:** An `equivalents` array directly on the Course object listing interchangeable course IDs.

**Why:** Section variants (TCH 210 vs TCH 210a01) are a property of the course itself — they share identical requirements-fulfillment behavior. Putting this on the course keeps it visible at the point of definition and makes validation straightforward (any equivalent can fill the same slot).

**Rejected:** A separate top-level equivalency table. This over-formalizes what is essentially a display concern — the renderer needs to know these are the same course in different sections, nothing more.

### 10. `escrow` as a fill type (chosen) vs. a separate mechanism (rejected)

**Chosen:** `escrow` is a fill type on a Group, with `trigger_courses` and `granted_courses` properties.

**Why:** Escrow credit works like any other requirement group from the worksheet's perspective — it appears as a set of rows that get checked off. The trigger mechanism is unique but fits naturally as group-level properties. Only one program (Nursing RN-BSN) uses it today, but the shape is clean enough to support future occurrences without being burdensome.

**Rejected:** A separate top-level `escrow_credits` section. This fragments the major's requirement structure — the escrow courses ARE major requirements (they carry major credit hours), they just have a unique fulfillment mechanism.

## What the Schema Deliberately Does NOT Express

1. **Prerequisite chains between individual courses** (e.g., MUS 101 before MUS 102). These are registration-system concerns, not advising-worksheet concerns. The worksheet tracks what you need, not what order to take it in (beyond phase-level gates).

2. **Semester-by-semester sample plans.** The schema describes requirements; sample plans are a separate rendering concern that may vary by transfer status.

3. **Course descriptions, meeting times, or capacity.** CourseDog and the registration system are authoritative for these. The schema only needs enough course metadata for requirement-matching.

4. **Transfer credit evaluation rules.** Phase 4 articulation data will reference slot IDs but lives in separate articulation JSON files, not in program JSON.

5. **Historical catalog years.** Each program JSON represents one catalog year. Students on older catalogs use older JSON files. The schema supports this implicitly via the `catalog_year` field.
