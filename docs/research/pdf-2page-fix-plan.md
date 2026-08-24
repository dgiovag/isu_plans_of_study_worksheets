# Plan: guarantee every PDF fits on 2 pages (front-and-back sheet)

Status: in progress · Started 2026-08-24

Goal: every generated PDF is ≤2 pages, deterministically, with no per-program
manual tuning and no reduction in legibility. Where 2 pages is provably
impossible, fail loudly rather than silently emitting page 3.

Baseline (from `docs/research/pdf-page-overflow.md`, 1,131 PDFs):

| Pages | Count | % |
|---|---|---|
| 1 | 855 | 75.6% |
| 2 | 196 | 17.3% |
| 3 | 62 | 5.5% |
| 4 | 16 | 1.4% |
| 5 | 2 | 0.2% |

80 PDFs exceed the 2-page target.

---

## Diagnosis

The root cause recorded in `pdf-page-overflow.md` ("no global page budget, outlier
programs have too much content") is **not** what is happening. Measurements taken
before any code changes:

### There is no content-volume problem

Actual rendered group heights, summed per half, for all 377 programs × 3 tracks,
against the real 2-page capacity of one half (2 sub-columns × [~436pt page 1 +
~524pt page 2] = 1920pt):

| Program | gen-ed demand | major demand | % of 2-page capacity |
|---|---|---|---|
| musbmed (all 4 variants) | 403 | 1606 | 84% |
| musbm-jazz-studies | 407 | 1460 | 76% |
| musbm-music-therapy | 415 | 1358 | 71% |
| tchelebs-bilingual-bicultural | 599 | 1261 | 66% |
| tchmlebs / tchmlebsed | 754 | 1204 | 63% |

**0 of 377 programs exceed 2-page capacity; only 4 are above 80%.**

Consequence: the readability floor (constraint 4 — `FONT.tableBody: 7.5`,
`ROW_H: 15`) is **non-binding**. No font scaling, row-height reduction,
3-sub-column reflow, or appendix page is required. All 80 overflows are layout
mechanics defects.

### Cause 1 — four independent page pools (dominant)

`row-pdf.js::breakIfNeeded` does `ctx.page = ctx.doc.addPage(...)`. There are four
independent contexts: gen-ed sub-col A/B (`ctx1`/`ctx2` in `render-gened-pdf.js`)
and major sub-col A/B (same pattern in `render-major-pdf.js`). Each overflowing
context appends **its own fresh page**, so N overflowing contexts produce N extra
pages instead of sharing one page 2.

Widget counts per physical page confirm it:

```
tchmlebs-ad.pdf    pages=5  widgets/page=[188, 10, 34, 5, 3]
musbmed-isu.pdf    pages=4  widgets/page=[132, 128, 16, 15]
```

`tchmlebs-ad` fits 188 widgets on page 1, then scatters 52 across four
near-empty pages.

### Cause 2 — `estimateGroupHeight` is font-blind, so sub-column splits are lopsided

Estimate vs. actual consumed height, measured across the whole catalog:

| fill | n | avg error | % underestimated | worst |
|---|---|---|---|---|
| `choose_n` | 2328 | +20.9pt | 99% | +192pt (est 61, act 253) |
| `open` | 8429 | +7.3pt | 21% | +234pt (est 71, act 305) |
| `fixed` | 1248 | +2.8pt | 25% | +62pt |

- `choose_n` misses ~always: `renderChooseN` draws a `Choose N from: <every
  option>` note that the estimator never counts (`noteH` only inspects
  `group.note`).
- `open`/`fixed` miss because wrapped group titles (`drawGroupTitle` expands for
  long titles) and wrapped row labels (`makeRow` uses
  `max(ROW_H, lines*LINE_H+3)`) are both unmodeled.

Two latent field-name bugs: the estimator reads `group.groups` for
`choose_n_grouped` (renderer uses `sub_groups`) and `t.slots` for
`choose_one_track` (renderer uses `t.courses`) — both therefore estimate zero
rows. Only reachable through `data/programs/legacy/`, which `--all` does not read.

### Cause 3 — graduation panel discards available room

`template-pdf.js` places graduation at `min(y1, y2)` of the two gen-ed
sub-columns, throwing away whatever vertical room the taller sub-column had left.
Related: `renderGenEd` returns `Math.min(y1,y2)` but propagates `ctx1.page`, which
can disagree about which physical page that y belongs to.

### Fill-type coverage note

The active catalog exercises only 3 of the 10 fill types: `open` (6234),
`choose_n` (804), `fixed` (438). The other 7 (`choose_one`, `choose_one_set`,
`choose_n_grouped`, `choose_one_track`, `open_constrained`, `repeat`, `escrow`)
appear only in `data/programs/legacy/`, which `build-pdf.js --all` does not
recurse into. Regression checks must build that directory explicitly.

---

## Chunks

Each chunk ends with a full-catalog rebuild, a `pdfinfo` page distribution
reported against the baseline table above, and a per-file diff confirming no
1-page program grew.

### Chunk 1 — shared continuation page pool

Replace per-context `addPage()` with a pool shared by reference across all
contexts. Each context carries a `pageIdx`; `breakIfNeeded` advances to
`pageIdx+1` and materializes that physical page only if no other context has
created it yet. All four contexts then continue onto the *same* page 2 at their
own x-positions. `(continued)` marker drawn once per physical page.

### Chunk 2 — font-aware height estimation

Pass `widths`/`fonts`/`courseMap` into `estimateGroupHeight` and compute real
heights using the same `wrapText` and `max(ROW_H, lines*LINE_H+3)` /
`drawGroupTitle` formulas the renderers use — including the `choose_n` option-list
note and `choose_n_grouped` per-sub-group `Options:` notes. Fix the two
field-name mismatches. Keep a conservative fallback for callers with no context.

### Chunk 3 — two-page-aware column packing

Replace the midpoint-split heuristic (`sequentialSplit` / `semanticSplit`) with a
packer that knows page 1 and page 2 have different capacities and assigns groups
to (sub-column, page) slots to minimize physical page count. Retain major's
semantic fixed-vs-choice preference when it fits without costing a page; drop it
when it does not.

### Chunk 4 — graduation / college / compliance placement in the half budget

Place graduation against the actual remaining room in the left half rather than
`min(y1,y2)`, keep page and y consistent, and count graduation/college/compliance
heights as part of the budget.

### Chunk 5 — global budget check + diagnostics

Pre-layout total-demand-vs-2-page-capacity check. On failure, report program,
track, which bucket overflowed and by how much (e.g. `major.electives est 340pt,
210pt column budget remaining`) instead of silently emitting page 3. Add
`--strict` to fail the build on overflow so regressions cannot land quietly.

---

## Session working rules

- Layout is still a prototype — past design choices are not fixed. The only hard
  requirement is content on a printable front-and-back sheet.
- Stop and explain if work spirals; do not keep iterating on a failing approach.
- One chunk per turn, rebuild and report the page distribution, then confirm
  before proceeding.

---

## Measurement commands

```bash
node pdf/build-pdf.js --all --out ~/pdf_check_out
cd ~/pdf_check_out && for f in *.pdf; do
  pages=$(pdfinfo "$f" 2>/dev/null | awk '/^Pages:/{print $2}')
  echo "$pages $f"
done > /tmp/pagecounts.txt
awk '{print $1}' /tmp/pagecounts.txt | sort -n | uniq -c

# legacy fill-type regression check
node pdf/build-pdf.js --dir data/programs/legacy --out ~/pdf_check_legacy
```

---

## Results log

| Chunk | 1pg | 2pg | 3pg | 4pg | 5pg | >2pg |
|---|---|---|---|---|---|---|
| baseline | 855 | 196 | 62 | 16 | 2 | 80 |
| 1 — shared page pool | 855 | 246 | 30 | 0 | 0 | **30** |
| 2 — font-aware estimation | 854 | 239 | 38 | 0 | 0 | **38** |
| 3 — page-count-minimizing packer | 919 | 191 | 21 | 0 | 0 | **21** |
| 4a — compact auto-fulfilled labels | **999** | 132 | 0 | 0 | 0 | **0** |

### Chunk 1 detail

Zero regressions: no file grew, and the 855 one-page files are the same 855.
Transitions: 3→2 (44), 4→2 (4), 4→3 (12), 5→2 (2).

Consolidation confirmed by per-page widget counts:

```
tchmlebs-ad.pdf   before: pages=5 widgets=[188, 10, 34, 5, 3]
                  after:  pages=2 widgets=[188, 52]
```

All 21 legacy PDFs (the only files exercising the other 7 fill types) still
build; page 2 visually verified — four columns coexist in their own
x-positions with no overlap.

The 30 remaining overflows all show *underfilled* pages, which is the Chunk 2/3
estimation-and-packing problem rather than a volume problem:

```
hisba-ad.pdf     pages=3 widgets=[144, 22, 1]    <- one row spills to page 3
musbmed-isu.pdf  pages=3 widgets=[132, 143, 16]  <- page 1 less full than page 2
nurbsn-isu.pdf   pages=3 widgets=[69, 116, 36]   <- page 1 badly underfilled
```

Remaining overflow families: `hisba`/`hisbs` (12), `musbmed` (12), `nurbsn` (6).

### Chunk 2 detail

**The estimator is now exact.** Instrumented estimate-vs-actual over 12,228
group renders across all 9 fill types present in the corpus: **0.00pt error,
every group, every type.** Before Chunk 2 the errors were:

| fill | avg error | % underestimated | worst |
|---|---|---|---|
| `choose_n` | +20.9pt | 99% | +192pt |
| `open` | +7.3pt | 21% | +234pt |
| `fixed` | +2.8pt | 25% | +62pt |

Two field-name bugs also fixed: `choose_n_grouped` read `group.groups` (correct:
`sub_groups`) and `choose_one_track` read `t.slots` (correct: `track.courses`).
Both silently predicted **zero rows** for those groups.

Found and fixed a real rendering bug: escrow `group.note` was drawn twice — once
by `renderGroup`'s `drawNote`, once inside `renderEscrow`'s block. Confirmed via
`pdftotext -layout` on `nursing-rn-bsn-isu.pdf` (the note appeared on two
separate lines); now appears once.

**Legacy set — the only files exercising the other 7 fill types — improved:**

| set | 1pg | 2pg | 3pg |
|---|---|---|---|
| legacy, Chunk 1 | 9 | 9 | 3 |
| legacy, Chunk 2 | 9 | 12 | **0** |

The three 3-page files were all `ece-pedagogy-bs` (`choose_one_track`) — fixed
directly by the `t.slots` → `track.courses` correction.

**Headline metric regressed on the active catalog: 30 → 38.** 37 files grew (29
at 1→2: `artba-art-history` ×2, `ctkba` ×10, `ctkbs` ×10, `engba` ×7; 8 at 2→3:
`hisba`/`hisbs` general-history `ad`/`iai`), 28 shrank (`agribs` ×7,
`intlbusba`/`intlbusbs` ×6, `phybs` ×3, `bscbs` ×3, and 9 others at 2→1).

Two coupled mechanisms, both expected:

1. `renderGroup` now reserves the *true* (larger) height before drawing, so
   `breakIfNeeded` fires **earlier and more often**. Groups that previously
   squeezed onto page 1 by luck now break preemptively.
2. `sequentialSplit` balances the two sub-columns **by height** — the wrong
   objective for minimizing page count. When both columns are balanced and the
   total slightly exceeds page-1 capacity, *both* break to page 2 instead of one
   column absorbing the excess.

Per-page widget counts confirm the pages are underfilled, not overfull:

```
engba-general-isu.pdf         pages=2 widgets=[132, 3]        <- 3 widgets on page 2
hisba-general-history-ad.pdf  pages=3 widgets=[82, 15, 3]     <- only 82 on page 1
nurbsn-isu.pdf                pages=3 widgets=[69, 116, 36]   <- page 1 ~40% empty
```

Chunk 2 is a **prerequisite**, not a win on its own: accurate heights are what
make a page-count-minimizing packer possible. Chunk 3 is what converts the
accuracy into fewer pages.

### Chunk 3 detail

New `pdf/modules/pack-columns.js`. Key realization: because a sub-column
paginates deterministically once its group list is fixed, the search space is
**one-dimensional** — a single order-preserving split index. So rather than
guessing at a midpoint, simulate all n−1 candidate splits and keep the best,
ranked on **page count first, column balance only as a tie-break**. n ≤ ~20, so
brute force is free.

The major half's semantic fixed-vs-choice grouping is now offered to the packer
as a *preference*: used whenever it needs no more pages than the best
order-preserving split, silently dropped when it would cost a page. This
replaces the old ad-hoc ">2× skew" fallback with a direct test of the thing we
actually care about.

Also fixed a regression introduced in Chunk 2: `renderGroup` reserved
`Math.min(estimate, MAX_COL_H)`, so a group taller than a full column still
triggered a page break — wasting the rest of the current page for no gain, since
the group cannot fit on any single page either way. Restored the behaviour the
surrounding comment already described (fall back to `MIN_GROUP_SPACE`, start the
group here, let its rows flow). `simulateColumn` mirrors this, including
modelling the group's internal flow across pages.

Effect on the worst offender:

```
nurbsn-isu.pdf   Chunk 2: pages=3 widgets=[69, 116, 36]
                 Chunk 3: pages=2 widgets=[161, 60]
```

**Result: >2pg 38 → 21, and 1pg 854 → 919 — 64 more programs now fit on a single
page than at baseline (855).** Zero 1-page regressions: no file that fit on one
page at baseline needs more than one now. Nine files grew 2→3 (`hisba`/`hisbs`
general-history ×8, `tchmlebs-ad`), all already inside the residual overflow set.
Legacy set holds at 9/12/0. Page-1 fill visually confirmed dense with no column
overlap.

### Residual 21 — diagnosed, both causes are Chunk 4

Every remaining overflow has a **last page containing nothing but the graduation
panel** (3 widgets, or 1 for `tchmlebs-ad`). Two contributing causes:

1. **Pathological `open` labels (20 of 21 — all `hisba`/`hisbs` `ad`/`iai`).**
   `renderOpen`'s "more auto-fulfilling courses than slots" branch joins *every*
   course code into one label: `HIS 135 / HIS 136 / HIS 101 / HIS 102 /
   HIS 104A01 / … / HIS 104A06`. Wrapped into a 172pt sub-column that is ~15
   lines per row, so a 3-row group renders **~480pt tall** — nearly a full
   column — for what should be three ~15pt rows. The estimator predicts this
   correctly (which is why the packer isolates the group on its own page); the
   *rendering* is the defect. Fix: truncate to a few codes plus `+N more`, the
   pattern the graduation panel already uses.
2. **Graduation panel placement.** The panel is positioned below the gen-ed half
   at `min(y) − 8` after the fact, with no space reserved for it, so when the
   packer fills page 1 densely the panel gets pushed onto a page of its own.
   `tchmlebs-ad` is purely this.

Fixing (1) is expected to resolve the 20 `hisba`/`hisbs` files directly, since it
reclaims most of a column each.

### Chunk 4a detail — **target met, 0 PDFs over 2 pages**

`renderOpen`'s "more satisfying courses than slots" branch now lists the courses
**once in a note** and keeps the rows short (`Course #1`, `Course #2`, …), which
is the same idiom `choose_n` already uses for its option list. No information is
lost: the full course list is still printed verbatim, just once instead of once
per row.

```
Humanities & Fine Arts
Satisfied by: HIS 135, HIS 136, HIS 101, HIS 102, HIS 104A01, HIS 104A02,
HIS 104A03, HIS 104A04, HIS 104A05, HIS 104A06
  Course #1   [Hr] [Gr] [Term]
  Course #2   [Hr] [Gr] [Term]
  Course #3   [Hr] [Gr] [Term]
```

That group went from ~480pt (three ~150pt rows, each holding the whole list) to
~60pt — roughly 420pt reclaimed, most of a column. `openHeight` in
estimate-height.js mirrors the change, so the packer plans against real heights.

**Result: 919/191/21 → 999/132/0.** All 20 `hisba`/`hisbs` files dropped from 3
pages to **1**; `tchmlebs-ad` dropped 3 → 2.

| check | result |
|---|---|
| >2 pages, full catalog | **0 of 1131** |
| max page count | **2** |
| grew vs Chunk 3 | **0 files** |
| grew vs Chunk 1 (baseline-safe) | **0 files** |
| 1-page count | 855 baseline → **999** (+144) |
| legacy set (all 10 fill types) | 9/12/0, builds clean |
| font/row-height changes | **none** — readability floor untouched |
| per-program JSON overrides | **none** |

Estimator re-verified after the change: **0.00pt error, 0 mismatches** over
12,093 active-catalog renders (`open`, `choose_n`, `fixed`) and 255 legacy renders
(`choose_one`, `choose_n_grouped`, `escrow`, `exempt`, `open_constrained`,
`repeat`, plus the above). `choose_one_track` renders correctly but its group
always spans a page break, so it is excluded from direct estimate-vs-actual
measurement; `choose_one_set` does not occur in any program data.

### Still open

- **4b — graduation panel space reservation.** No longer needed for the metric,
  but the panel is still placed after the fact at `min(y) − 8` with no space
  reserved, so it can be orphaned onto its own page. That is the failure mode
  that produced `tchmlebs-ad`, and the scraper regenerates data biannually, so it
  can recur. Insurance, not a fix.
- **5 — pre-layout budget check + `--strict`.** 0 overflows is currently a
  *measured* property, not a *guaranteed* one. Chunk 5 adds the per-program
  diagnostic (naming the overflowing bucket and shortfall) and a flag that fails
  the build, which is what turns "0 today" into "loud failure if data drifts".
