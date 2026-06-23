# Session Handoff — ISU Plans of Study Worksheets

This document captures the current project state and the next steps to pick up in a new session. Read CLAUDE.md for full project context.

---

## What Was Done This Session (2026-06-23)

### Catalog research + issue triage (3 issues)
Ran sub-agents to fetch ISU catalog and CourseDog cache for the three "quick lookup" issues:

- **MAT 121 (accntcybs) — CLOSED.** GE14-QR confirmed → quantitative_reasoning only, not mathematics. JSON was already correct. Bonus: MAT 121 carries BSMT (B.S. SMT req); MAT 145 does not.
- **ENG 145A13 IAI IC2 — CONFIRMED.** ENG 145A13 carries identical IAI IC2 attribute as ENG 145. The `choose_one` in accntcybs and the `auto_fulfilled_by` in accbsmpa are both correct. Flag: accbsmpa has ENG 145A13 with `fulfills: ["major.required_courses"]` but no major slot for it — needs departmental clarification before fixing.
- **Nursing escrow (nurbsn-r-n-to-b-s-n) — STAYS OPEN.** Catalog text says 34 credits twice; individual CourseDog records sum to 32. Discrepancy in the source data itself. `total_credits: 34` and the advisor note are correct. MCN must clarify.
- **Art history elective grouping — RESOLVED.** Catalog explicitly requires at least 1 from each of 3 groups. Changed `choose_n` → `choose_n_grouped` with `minimum_picks: 1` per sub-group. Credit values for 10 of 12 courses remain unverifiable from CourseDog.

### Files changed
- `data/programs/artba-art-history.json` — `choose_n` → `choose_n_grouped`
- `scripts/generate-review-workbook.py` — removed MAT 121 issue; updated artba credit_assumption description
- `CLAUDE.md`, `docs/handoff.md` — updated gap table and resolved gaps

Issue count: 8 → **7**.

---

## What Was Done Previous Session

### Commits landed
Four commits pushed to `main`:
- `99ca0fd` — Fix missing ENG145A13/CHE112 course entries in 3 programs
- `b711629` — Drop verified auto_fulfilled_by rows from issue log (workbook script)
- `ecdeac1` — Apply gen-ed catalog exemptions to 222 programs
- `63dc86d` — Add gen-ed exemptions pipeline (scrape-gened-exemptions.js, apply-gened-fixes.js)

### auto_fulfilled_by verification (completed)
Analysed all 998 `auto_fulfilled_by` groups remaining after the gen-ed exemptions pipeline.

**Finding:** 998/998 are confirmed correct — every listed course is affirmatively required by the major AND carries the matching gen-ed CourseDog attribute (`fulfills` array includes both `major.*` and the gen-ed group ID).

**Three scraping gaps fixed** (courses that were in `auto_fulfilled_by` but missing from the program's `courses` list):
- `ENG 145A13` added to `accbsmpa-accountancy-and-information-systems` and `insurancbs-risk-management-and-insurance` — Writing for Business & Government Organizations, AND-paired with ENG 145, both carry IAI IC2
- `CHE 112` added to `nurbsn-traditional-prelicensure` — Fundamentals of Chemistry Lab, lecture+lab pair with CHE 110, both carry GE14-NSAC

**Workbook script updated** (`scripts/generate-review-workbook.py`):
- `is_afb_verified()` helper skips any `auto_fulfilled_by` group where all courses pass the fulfills check
- Fixed misleading issue description ("change to exempt: true" → correct explanation of satisfy vs. presuppose)
- Summary now reports verified count alongside flagged count

### Issue Log: 8 rows (down from ~1,006)
All remaining issues require advisor or catalog lookup — nothing automated can resolve them. See `STRUCTURAL_GAPS` in the workbook script for full descriptions.

### Output rebuilt
All 300 HTML worksheets, 900 PDFs, and the advisor review workbook are current as of this session.

---

## Current State

Working tree is clean. All output is up to date.

**Advisor review workbook:** `output/review/advisor-review.xlsx`
- Sheet 1: 300 programs (Pending / Approved / Changes Needed dropdown)
- Sheet 2: 8 issues — all structural gaps needing advisor judgment

---

## Remaining Scraper Gaps (Issue Log rows)

7 open issues — all require advisor judgment or a call to the department.

| Program | Issue type | What's needed |
|---|---|---|
| `accntcybs-financial-accounting` | `structural_gap` | Split `major.required_courses` into `choose_one` slots for math/writing/IT options |
| `artba-art-history` | `catalog_verify` | Confirm whether language sequence (FRE/GER/ITA/SPA 111/112/115) must be same language across all three levels |
| `artba-art-history` | `credit_assumption` | Verify credit values for ART 240/241/242/244/263/264/265/266/267/279 (absent from CourseDog active catalog; ART 280/281 confirmed 3 credits). Per-group structure now encoded correctly. |
| `nurbsn-r-n-to-b-s-n` | `credit_assumption` | Catalog says 34 total escrow credits; individual course records sum to 32 — discrepancy exists in CourseDog source. Mennonite College of Nursing must confirm. |
| `tchecebs-pedagogy` | `structural_gap` | Confirm whether 9 `choose_n(1)` groups are independent choices or specialty track bundles |
| `musbm-composition-theory-emphasis` | `structural_gap` | Confirm credit range, total hours, and level-progression rule for applied music / ensembles |
| `nurbsn-traditional-prelicensure` | `structural_gap` | Split 38-course flat list into phases (foundation / nursing core / clinical) |

### Closed this session
- `accntcybs` MAT 121 — confirmed: GE14-QR encoding correct, no change needed
- `artba` elective per-group minimum — confirmed from catalog, encoded as `choose_n_grouped`

---

## Immediate Next Task

Send `output/review/advisor-review.xlsx` to advisors for the 7 open issues, then work through structural gaps as responses come in. Priority order by complexity:

1. **Advisor call / catalog lookup:** `artba` language constraint and elective credits, `nurbsn-r-n-to-b-s-n` escrow total (call MCN)
2. **Advisor call required:** `tchecebs` track structure, `nurbsn-traditional` phase split
3. **Hard / schema work:** `musbm` repeat groups, `accntcybs` inline choose_ones

---

## Memory / Preferences

- Always propose a plan and wait for approval before touching files.
- Chunk implementation: one chunk per turn, confirm before proceeding.
- Never switch to Opus.
- User commits manually via GitHub Desktop; always suggest a commit message after changes.
- Output files go to `output/html/` and `output/pdf/` by default.
- The review workbook is in `output/review/` — regenerated by `python3 scripts/generate-review-workbook.py`.
- `scraper/raw/` is gitignored; HTML cache and JSON outputs live there and are not committed.
