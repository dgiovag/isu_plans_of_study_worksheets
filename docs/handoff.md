# Session Handoff — ISU Plans of Study Worksheets

This document captures the current project state and the next steps to pick up in a new session. Read CLAUDE.md for full project context.

---

## What Was Done This Session (2026-06-23)

### Graduation flags — schema, data, PDF renderer (4 commits)

**Schema** (`fd7cf65`)
- Added optional `graduation_flags: ["amali"|"ideas"|"bs_smt"|"ba_wl"]` array to the `Course` definition in `schemas/program-schema.json`.

**Scraper + data** (`fd7cf65`)
- `scraper/transform.js`: added `graduationFlagsFromAttr()` that maps CourseDog attribute strings (`AMAL - AMALI`, `IDEA - IDEAS`, `BSMT - BS-SMT`, `WLDR - BAWLDR`) to flag keys; wired into `buildCoursesSection`.
- Re-scraped all 300 programs from cached raw data. 500 course entries across 96 programs now carry `graduation_flags`.
- Backfilled `minimum_hours` on 52 `choose_n` groups whose hour requirement was encoded in the group title but missing from the JSON (CourseDog `restriction` field was null for those rules).

**PDF renderer** (`6f792a5`, `8f43f38`)
- `template-pdf.js`: `buildGradFlagsMap()` builds a `Map<courseId, flags[]>` filtered by degree type (uses `graduation_requirements.trackable` to decide which flags are applicable — B.A. programs never show SMT tags, B.S. programs never show WL tags). Threaded onto both render contexts as `ctx.gradFlagsMap`.
- `row-pdf.js`: `makeRow` gains `opts.flagTag` — renders a small gray parenthetical at `footnote` size (6.5pt) inline with the last label line if it fits, or on a new line below.
- `render-fixed-pdf.js`: looks up `ctx.gradFlagsMap` per slot and passes `flagTag` to `makeRow`. Flag abbreviations: `AMALI`, `IDEAS`, `SMT`, `WL`.
- `render-choose-n-pdf.js`: `chooseNRowCount(group)` helper — prefers `group.n`, falls back to `Math.ceil(group.minimum_hours / 3)`, defaults to 1. Exported and used by the height estimator in `render-group-pdf.js`.
- `render-graduation-pdf.js`: requirements covered by a major course now render as shaded reference rows (gray background, filled indicator box, "via COURSE1, COURSE2 +N more" note) instead of blank checkboxes. A key legend (`Key: AMALI = … · IDEAS = … · SMT = … · WL = …`) is appended below the panel whenever at least one flag appears in the program.

All 900 PDFs (300 programs × 3 tracks) build clean.

---

## Immediate Next Task — HTML Renderer: Graduation Flags

### Goal
Mirror the PDF's `graduation_flags` display in the HTML renderer. Advisors using the web version should see the same AMALI/IDEAS/SMT/WL tags on course rows, and the same "satisfied by major" indicator in the graduation requirements panel.

### What to change

**Chunk 1 — Course row tags**

The relevant HTML render modules are those that emit course code labels for fixed slots:
- `renderer/modules/render-fixed.js` — most major course rows
- `renderer/modules/render-choose-n.js` — elective pick rows (if they list specific courses)

At build time, a `gradFlagsMap` (courseId → flags[]) should be computed from the program data — same filtering logic as `buildGradFlagsMap` in `template-pdf.js` (check `graduation_requirements.trackable` to suppress inapplicable flags). This map is already available during rendering since both renderers receive the full program object.

Display: a small `<span class="grad-flag">AMALI</span>` (or similar) appended after the course code in the label cell. Style it in the CSS as muted/gray, small font (matching the PDF's footnote-size aesthetic). Multiple flags on one course: separate spans or join with `·`.

**Chunk 2 — Graduation requirements panel**

The HTML renderer has a graduation requirements section. Apply the same "satisfied by major" shading logic:
- If a course in the program carries the matching flag, show the row as pre-satisfied with a note listing the course codes.
- If not covered, keep the checkbox.
- Add the same key legend below the panel.

Find the graduation panel in `renderer/modules/` — likely `render-graduation.js` or similar.

**Chunk 3 — CSS**

Add styles for `.grad-flag` (the inline tag) and the "satisfied" graduation row state. Keep them visually consistent with the PDF: muted gray, small, parenthetical feel.

---

## Data Gaps Remaining (108 choose_n groups — no hours in title or API)

These groups still show only 1 blank row because the hour requirement isn't in CourseDog or parseable from the title. Require manual catalog lookup and annotation of `minimum_hours` directly in the JSON:

Most impactful:
- `ctkba-animation-entertainment-arts` / `ctkbs-animation-entertainment-arts` — `additional_elective_courses` (catalog: 12 hrs)
- `accbsmpa` variants — `300-level accounting elective courses`
- `antba` / `antbs` variants — `Electives`
- `comstba` / `comstbs` variants — named elective groups
- `engba` creative writing / publishing / technical writing — named elective groups
- `hisba` / `hisbs` variants — `Non-Western history electives`, `U.S. history electives`

Full list of 108 is obtainable by running:
```bash
node -e "
const fs = require('fs'), path = require('path');
const dir = 'data/programs';
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f)));
  for (const g of (d.major?.groups || []))
    if (g.fill === 'choose_n' && !g.n && !g.minimum_hours)
      console.log(f, g.id, '|', g.title);
}
"
```

---

## Open Scraper Gaps (Issue Log — 7 rows)

All require advisor judgment or a departmental call.

| Program | Issue type | What's needed |
|---|---|---|
| `accntcybs-financial-accounting` | `structural_gap` | Split `major.required_courses` into `choose_one` slots for math/writing/IT options |
| `artba-art-history` | `catalog_verify` | Confirm whether language sequence (FRE/GER/ITA/SPA 111/112/115) must be same language across all three levels |
| `artba-art-history` | `credit_assumption` | Verify credit values for ART 240/241/242/244/263/264/265/266/267/279 (absent from CourseDog active catalog) |
| `nurbsn-r-n-to-b-s-n` | `credit_assumption` | Catalog says 34 total escrow credits; individual course records sum to 32 — MCN must confirm |
| `tchecebs-pedagogy` | `structural_gap` | Confirm whether 9 `choose_n(1)` groups are independent choices or specialty track bundles |
| `musbm-composition-theory-emphasis` | `structural_gap` | Confirm credit range, total hours, and level-progression rule for applied music / ensembles |
| `nurbsn-traditional-prelicensure` | `structural_gap` | Split 38-course flat list into phases (foundation / nursing core / clinical) |

---

## Current State

Working tree: clean (all changes committed to `main`).

PDF output: all 900 PDFs (300 programs × 3 tracks) current in `output/pdf/`.

---

## Memory / Preferences

- Always propose a plan and wait for approval before touching files.
- Chunk implementation: one chunk per turn, confirm before proceeding.
- Never switch to Opus.
- User commits manually via GitHub Desktop; always suggest a commit message after changes.
- Output files go to `output/html/` and `output/pdf/` by default.
- The review workbook is in `output/review/` — regenerated by `python3 scripts/generate-review-workbook.py`.
- `scraper/raw/` is gitignored; HTML cache and JSON outputs live there and are not committed.
