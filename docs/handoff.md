# Session Handoff — ISU Plans of Study Worksheets

This document captures the current project state and the next steps to pick up in a new session. Read CLAUDE.md for full project context.

---

## What Was Done This Session

### Scraper gap fixes (data/programs/)
Three of the seven known scraper gaps were resolved:

| Program | What changed |
|---|---|
| `phybs-physics-teacher-education` | `major.required_course_2`: `open` → `open_constrained`, added `count:1`, `constraint`, `level:"200"` |
| `nurbsn-r-n-to-b-s-n` | Added `major.escrow` group with `trigger_courses` (NUR223/227/236), `granted_courses` (NUR229/231/314/316/317/325), `total_credits:34`. Escrow course entries added to `courses[]`. **Advisor note in JSON: individual credits from legacy data sum to 32, catalog says 34 — verify with Mennonite College of Nursing.** |
| `artba-art-history` | `art_history_elective_courses`: `open` with HTML-entity note → `choose_n` with 12 explicit options (ART240–281, assumed 3 cr each). Course entries added to `courses[]`. **Advisor note in JSON: verify credits and whether a per-group minimum applies.** |

CLAUDE.md gaps table updated accordingly. HTML and PDF regenerated for all three programs (9 output files).

### Advisor review materials (scripts/ and output/review/)
Two new scripts generate the reviewer package:

- **`scripts/generate-review-workbook.py`** → `output/review/advisor-review.xlsx`
  - Sheet 1 (Program Review): 300 rows, one per program. Program ID hyperlinked to dev site. Status dropdown (Pending/Approved/Changes Needed). Sorted by college.
  - Sheet 2 (Issue Log): 1,126 rows — 8 structural gap items + 1,118 `auto_fulfilled_by` instances pre-populated for advisor review.

- **`scripts/generate-reviewer-guide.py`** → `output/review/reviewer-guide.docx`
  - Full Word document for advisors: explains data collection, worksheet mechanics, how to use both sheets, and per-issue-type instructions.
  - Tables set to 100% width. ISU red/grey branding.

Dev site base URL (baked into Sheet 1 hyperlinks):
`https://aei-web.apps.paas02-t.ilstu.edu/advising/html/`

### Key catalog discoveries
- **MAT 145 carries GE14-MAT** (confirmed at `https://catalog.illinoisstate.edu/courses?attributes=GE14+-+MAT+(Mathematics+MAT)`). It genuinely satisfies the ISU Mathematics gen-ed requirement.
- **MAT 121 carries GE14-QR** (confirmed via the ISU gen-ed program page). It satisfies Quantitative Reasoning, not Mathematics. The CLAUDE.md gap for this is now answered — it does not satisfy `isu.mathematics`.

---

## Immediate Next Task: Gen-Ed Exemptions Pipeline

This was fully designed but not yet implemented. It will resolve most of the 1,118 `auto_fulfilled_by` items in the review workbook programmatically, rather than handing them all to advisors.

### Context
The ISU gen-ed program page lists:
- 12 gen-ed categories (QR, SS, SMT, LH, UST, ICL, FA, NS, COM, M, H, NSA)
- A hierarchical exemption table: college → department/major → list of exempt gen-ed codes

URL: `https://catalog.illinoisstate.edu/university/requirements/illinois-state-general-education-program`

Page HTML structure (confirmed via fetch):
```html
<h3>College of Applied Science and Technology</h3>
<ul>
  <li>Agriculture - All major programs - QR</li>
  <li>Criminal Justice Sciences - All major programs - None</li>
  <li>Family and Consumer Sciences
    <ul>
      <li>Food, Nutrition and Dietetics - None</li>
    </ul>
  </li>
</ul>
<h3>College of Arts and Sciences</h3>
<ul>
  <li>English - All major programs - LH</li>
  ...
</ul>
```

Exemption codes on the page and their schema group IDs:
| Page code | Schema group ID |
|---|---|
| QR | isu.quantitative_reasoning |
| SS | isu.social_sciences |
| SMT | isu.science_math_technology |
| LH | isu.language_humanities |
| UST | isu.us_traditions |
| ICL | isu.individuals_civic_life |
| FA | isu.fine_arts |
| NS | isu.natural_science |
| M | isu.mathematics |
| H | isu.humanities |
| COM | isu.communication_composition |
| None | (no exemption) |

The gened-map.js (`scraper/gened-map.js`) already maps GE14-* CourseDog codes to these same group IDs and is a useful reference.

### Script 1: `scraper/scrape-gened-exemptions.js`

Fetch the gen-ed program page, parse the H3/UL structure, and write `scraper/raw/gened-exemptions.json`.

Output format:
```json
[
  { "college": "College of Applied Science and Technology", "title": "Agriculture", "sequence": "All", "exempt_codes": ["QR"] },
  { "college": "College of Arts and Sciences", "title": "English", "sequence": "All", "exempt_codes": ["LH"] },
  { "college": "Wonsook Kim Coll of Fine Arts", "title": "Art", "sequence": "All", "exempt_codes": ["FA"] }
]
```

Match fields:
- `college` should match `program.college` in JSON files (use the exact strings from our files, not the catalog page — map them during parse)
- `title` should match `program.title`
- `sequence`: `"All"` means all sequences under that title; otherwise matches `program.sequence`

College name mapping needed (catalog page → our JSON `program.college`):
| Catalog page | JSON program.college |
|---|---|
| College of Applied Science and Technology | Applied Science and Technology |
| College of Arts and Sciences | College of Arts and Sciences |
| College of Fine Arts (or Wonsook Kim...) | Wonsook Kim Coll of Fine Arts |
| College of Business | College of Business |
| College of Education | College of Education |
| Mennonite College of Nursing | Mennonite College of Nursing |
| College of Engineering | College of Engineering |

Use `node-fetch` or the existing `fetch.js` pattern. Cache the raw HTML to `scraper/raw/gened-exemptions-raw.html`.

### Script 2: `scraper/apply-gened-fixes.js`

Reads `scraper/raw/gened-exemptions.json` and all `data/programs/*.json`. Applies two passes. Default: `--dry-run` (prints what would change). Use `--write` to apply.

**Pass A — Program-level exemptions**
For each entry in `gened-exemptions.json`, find matching program JSON files by `(college, title, sequence)`. For each matched exempt code, find the corresponding gen-ed group in the program's `general_education.tracks[id="isu"].groups` and set `exempt: true`. Remove `auto_fulfilled_by` from that group if present.

Edge cases:
- If `sequence === "All"`, apply to all programs matching `(college, title)`.
- If a program title matches multiple entries (e.g., different sequences have different exemptions), apply only the sequence-specific one.
- Log any titles that couldn't be matched for manual review.

**Pass B — auto_fulfilled_by → exempt (course-level)**
For each remaining `auto_fulfilled_by` in any gen-ed group:
1. Collect the courses listed in `auto_fulfilled_by`.
2. Check how many of those courses appear in the major's **fixed** `required_courses` slots (i.e., `fill: "fixed"` groups, `course_id` slots — not `choose_n`, `open`, or inline `choose_one` slots).
3. The gen-ed group has a `count` field (how many courses needed). If the number of `auto_fulfilled_by` courses that are in fixed required slots >= `count`, set `exempt: true` and remove `auto_fulfilled_by`.
4. If `count > 1` and there's a `constraint` (e.g., "Must be from 2 different sciences"), keep `auto_fulfilled_by` and log for manual review — multi-course exemptions with constraints need human judgment.
5. If no fixed required courses cover it, keep `auto_fulfilled_by` as-is.

After both passes, regenerate the review workbook (`python3 scripts/generate-review-workbook.py`) to reflect the reduced issue count.

---

## Remaining Scraper Gaps (in CLAUDE.md)

After the gen-ed pipeline, these structural gaps remain — all require catalog research:

| Program | Gap | Complexity |
|---|---|---|
| `accntcybs-financial-accounting` | Inline `choose_one` slots in `major.required_courses` (math/writing/IT options) | Medium — needs catalog lookup for which slots are choices |
| `artba-art-history` | Language consistency constraint: must confirm same-language rule across FRE/GER/ITA/SPA 111/112/115 before encoding in `major.constraints` | Advisor call |
| `tchecebs-pedagogy` | 9 `choose_n(1)` groups may be teaching-specialty track bundles — needs catalog research on whether `choose_one_track` is correct | Hard |
| `musbm-composition-theory-emphasis` | `applied_music` and `performance_ensembles` open groups → `repeat` with credit ranges | Hard — needs level-progression rules from catalog |
| `nurbsn-traditional-prelicensure` | 38-course flat list needs splitting into `phases` (foundation / nursing core / clinical) | Hard — nursing domain knowledge required |
| `nurbsn-r-n-to-b-s-n` | Individual escrow course credits sum to 32 but catalog says 34 — verify with Mennonite College of Nursing | Quick advisor check |

---

## Files to Commit

Everything below is uncommitted. Suggested grouping:

**Commit 1 — Scraper gap fixes + HTML/PDF regeneration**
```
data/programs/phybs-physics-teacher-education.json
data/programs/nurbsn-r-n-to-b-s-n.json
data/programs/artba-art-history.json
CLAUDE.md
output/html/phybs-physics-teacher-education.html   (if output/ is tracked)
output/pdf/phybs-physics-teacher-education-*.pdf
output/html/nurbsn-r-n-to-b-s-n.html
output/pdf/nurbsn-r-n-to-b-s-n-*.pdf
output/html/artba-art-history.html
output/pdf/artba-art-history-*.pdf
```

**Commit 2 — All 300 scraped program JSONs**
```
data/programs/*.json   (300 new files, not including legacy/)
```

**Commit 3 — Advisor review materials**
```
scripts/generate-review-workbook.py
scripts/generate-reviewer-guide.py
output/review/advisor-review.xlsx   (if output/ is tracked)
output/review/reviewer-guide.docx
```

Note: `data/programs/legacy/*.json` appears in `git diff` but those files were not intentionally modified this session — check `git diff data/programs/legacy/` before staging.

---

## Memory / Preferences

- Always propose a plan and wait for approval before touching files.
- Chunk implementation: one chunk per turn, confirm before proceeding.
- Never switch to Opus.
- User commits manually via GitHub Desktop; always suggest a commit message after changes.
- Output files go to `output/html/` and `output/pdf/` by default.
- The review workbook and guide are in `output/review/` and regenerated by the two Python scripts.
