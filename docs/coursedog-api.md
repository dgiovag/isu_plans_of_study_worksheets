# Coursedog API Reference for the Catalog Scraper

Discovered 2026-05-18 via HAR analysis of `catalog.illinoisstate.edu`.

## Platform

ISU's catalog runs on **Coursedog** (formerly Curriculog/Acalog competitor).

- ISU instance ID: `illinoisstate_peoplesoft_direct`
- Catalog ID: `TTT3UHqqRwgSw6a5YcUW`
- Catalog base URL: `https://catalog.illinoisstate.edu`
- Coursedog API base: `https://app.coursedog.com/api/v1`

## Authentication

**No auth token required.** The public catalog API endpoints are gated only by CORS — all requests must include:

```
Origin: https://catalog.illinoisstate.edu
Referer: https://catalog.illinoisstate.edu/
User-Agent: Mozilla/5.0 ...
```

Without the `Origin` header, the API returns `{"error":"Unauthenticated"}`. With it, read access is open.

---

## Endpoints

### 1. List all programs

```
POST https://app.coursedog.com/api/v1/cm/illinoisstate_peoplesoft_direct/programs/search/$filters
     ?catalogId=TTT3UHqqRwgSw6a5YcUW&limit=600
Content-Type: application/json
Body: {}
```

Returns all 567 programs (as of 2026-05-18) with full program objects. Each object includes `requisites.requisitesSimple` — the complete requirement rules. No secondary fetch needed per program.

Useful `columns` parameter to slim the payload if needed:
```
?columns=code,name,catalogDisplayName,degreeDesignation,status,requisites,requirementLevels,specializations
```

### 2. Resolve course group IDs → course data

```
POST https://app.coursedog.com/api/v1/cm/illinoisstate_peoplesoft_direct/courses/search/$filters
     ?catalogId=TTT3UHqqRwgSw6a5YcUW
     &columns=name,code,subjectCode,courseNumber,credits,attributes,customFields
Content-Type: application/json
Body: {"courseGroupIds": ["0072861", "0072871", ...]}
```

Maps internal numeric group IDs (used in requirement rules) to human-readable course codes and credit data.

Key fields in each returned course:

| Field | Example | Notes |
|---|---|---|
| `code` | `"ACC131"` | Subject + number, no space |
| `subjectCode` | `"ACC"` | |
| `courseNumber` | `"131"` | |
| `credits.numberOfCredits` | `3` | Nominal credit hours |
| `credits.creditHours.min/max` | `3/3` | Variable-credit courses have min < max |
| `credits.repeatable` | `false` | |
| `attributes` | `["GE14 - SS (Social Sciences SS)"]` | Gen-ed and IAI designators |
| `customFields.catalogAttributes` | same as above | Duplicate; use either |
| `courseGroupId` | `"0072861"` | Stable ID across catalog years |

### 3. Resolve requisite set IDs → requirement rules

```
GET https://app.coursedog.com/api/v1/illinoisstate_peoplesoft_direct/requisite-sets/
    ?list=<id1>,<id2>,...
    &effectiveDatesRange=YYYY-MM-DD,YYYY-MM-DD
```

Use today's date for both range values. Resolves the set IDs referenced in gen-ed and university-level rules to their full rule structures.

Known requisite set IDs (university-wide, stable):

| ID | Name |
|---|---|
| `c4ZyM1RZfb` | AMALI Graduation Requirement |
| `fXb5ZCd3fo` | IDEAS Graduation Requirement |
| `KTBcPIYznf` | B.S. Science, Math & Technology (BS-SMT) Graduation Requirement |
| `ljV7qrjtoq` | General Education Program (2014-2015 catalog or later) |

### 4. Course sets (gen-ed category course lists) — NOT accessible

The `courseSets` endpoint (`/api/v1/cm/.../courseSets/?list=...`) returns `{}`. The gen-ed category course eligibility lists are not exposed via the public API. This is not a problem for the scraper — see the Exemption Detection section below.

---

## Program Data Model

### Top-level structure

Each program object returned by the programs search contains:

```
program.code                    "ACCNTCYBS"
program.catalogDisplayName      "Accountancy - Bachelor of Science"
program.degreeDesignation       "BS - Bachelor of Science"
program.college                 "BUSIN - College of Business"
program.status                  "Active"
program.requirementLevels[]     Level labels and header notes
program.requisites
  .requisitesSimple[]           All requirement blocks (the core data)
program.specializations[]       Sequences / concentrations (metadata only)
program.degreeMaps[]            Sample plans of study (semester-by-semester)
```

### `requirementLevels` — header notes per level

Array of objects with `key`, `label`, and optional `notes` (HTML string). The `notes` field on `"plan (major/program)"` often contains important prerequisite language and sequence selection instructions.

```json
[
  { "key": "plan (major/program)", "label": "Major, Minor or Certificate (plan)",
    "notes": "<p>After completing the 100-level Business Core courses...</p>" },
  { "key": "sequence (subplan)", "label": "Sequences (subplans)" },
  { "key": "generalEducation",   "label": "General Education" },
  { "key": "university",         "label": "University" }
]
```

### `requisitesSimple` — requirement blocks

Each element is one requirement block. Key fields:

```
id                  Stable Coursedog ID for this requirement
name                Human-readable label (e.g. "Financial Accounting Sequence - 74 hrs")
requirementLevel    "plan (major/program)" | "sequence (subplan)" | "generalEducation" | "university"
showInCatalog       boolean — false items should be skipped
rules[]             One or more rules defining what satisfies this block
notes               HTML string with block-level notes (e.g. repeat limits)
sisId               SIS cross-reference (often empty)
```

### Rule structure

```json
{
  "id": "xiikTGEi",
  "name": "Required courses",
  "condition": "completedAllOf",
  "restriction": 2,
  "minCourses": 2,
  "minCredits": 6,
  "notes": "<p>No more than 3 hours of ACC 398 may count.</p>",
  "value": {
    "condition": "courses",
    "id": "IjRHiACg",
    "values": [
      { "value": ["0072861"], "logic": "and" },
      { "value": ["0075841", "0220971", "0029791"], "logic": "or" }
    ],
    "subSelections": []
  }
}
```

#### `condition` values

| Coursedog condition | Meaning |
|---|---|
| `completedAllOf` | All items in `values` are required |
| `completedAtLeastXOf` | At least `restriction` items from `values` |
| `completeVariableCoursesAndVariableCredits` | Complete at least `minCourses` courses and `minCredits` hours from the list |

#### `value.condition` values

| value.condition | What `values` contains |
|---|---|
| `"courses"` | Course group ID arrays |
| `"requisiteSets"` | Requisite set ID arrays (used for gen-ed and university reqs) |
| `"courseSets"` | Course set ID arrays (used inside requisite sets; not externally resolvable) |

#### `value.values` — the item list

Each entry is `{ "value": [id, ...], "logic": "and" | "or" }`.

- `logic: "and"` with a single ID → required course
- `logic: "or"` with multiple IDs → student chooses one of these courses
- Multiple consecutive `logic: "and"` entries → all are required

### Mapping Coursedog conditions to our schema fill types

| Coursedog pattern | Our fill type |
|---|---|
| `completedAllOf`, all entries `logic: "and"`, single ID each | `fixed` |
| `completedAllOf`, some entries `logic: "or"` with multiple IDs | `choose_one` within a `fixed` group |
| `completedAtLeastXOf` with `restriction` N | `choose_n` |
| `completeVariableCoursesAndVariableCredits` | `choose_n` (elective bucket with credit minimum) |
| `completedAllOf` with single `requisiteSets` reference | university/gen-ed wrapper — recurse into the set |

---

## Gen-Ed Exemption Detection

**Do not attempt to decode gen-ed course eligibility lists** — the `courseSets` endpoint is not publicly accessible.

For the scraper's purpose (knowing whether a program is exempt from a gen-ed category), use course attributes instead:

1. Collect all course group IDs that appear in `completedAllOf` rules with `logic: "and"` (i.e., required courses, not electives).
2. Fetch those courses via the courses search endpoint.
3. Scan each course's `attributes` array for the `GE14 - *` pattern.
4. Any `GE14` attribute on a required course means that gen-ed category is satisfied by the major.

### Known `GE14` attribute → schema gen-ed ID mappings (partial)

These were observed across the Accounting BS course data. A full inventory requires a scan across all programs.

| Course attribute | ISU gen-ed category |
|---|---|
| `GE14 - SS` | Social Sciences (`isu.social_sciences`) |
| `GE14 - QR` | Quantitative Reasoning (`isu.quantitative_reasoning` or similar) |
| `GE14 - MAT` | Mathematics (`isu.mathematics`) |

Additional `GE14 - *` values (FA = Fine Arts, NS = Natural Sciences, HL = Humanities/Literature, etc.) will surface when scanning programs with those exemptions (e.g. Music for Fine Arts). A one-time scan of all program courses will produce the complete mapping.

Note: `GE27 - *` attributes also exist (seen on PSY 138). These likely correspond to a newer catalog year's gen-ed structure and may need separate handling.

### IAI attributes

IAI course attributes follow the pattern `IAI - <code>` (e.g. `IAI - IS27 (S3 902 Princ of Microeconomics)`). These map to IAI gen-ed categories for the IAI track worksheet.

The `MIAI - *` prefix appears on major-specific IAI courses (e.g. `MIAI - BUS903-IAI`) — these are program-specific IAI equivalencies and may need special handling.

---

## Page Structure (SSR)

The catalog pages are Nuxt.js server-side rendered. The full program data is embedded as `window.__NUXT__` in the initial HTML response — no JavaScript execution required, but the data is serialized as a compressed IIFE with deduplicated arguments.

If direct API access is ever blocked, the fallback is:

```
GET https://catalog.illinoisstate.edu/programs/<CODE>?tab=requirements
```

Parse `window.__NUXT__=(function(...){...})` from the response, execute via Node.js `vm`, and read `.data["0"].program`.

The program list (all codes) can be obtained by fetching `catalog.illinoisstate.edu/programs` and parsing the same `__NUXT__` payload.

---

## Scraper Pipeline (Recommended)

```
1. POST /programs/search/$filters  (body: {}, limit: 600)
   → All 567 programs with full requirement data

2. Filter to target programs:
   - status: "Active"
   - degreeDesignation: undergraduate degrees only (BS, BA, BM, BSN, etc.)
   - Exclude minors, certificates, graduate programs

3. For each program:
   a. Collect all courseGroupIds from completedAllOf rules (logic: "and")
   b. Collect courseGroupIds from choice rules (logic: "or", completedAtLeastXOf)

4. POST /courses/search/$filters  (body: {"courseGroupIds": [all collected IDs]})
   → Resolve IDs to codes, credits, attributes
   → Detect gen-ed exemptions via GE14-* attributes on required courses

5. GET /requisite-sets/?list=c4ZyM1RZfb,fXb5ZCd3fo,KTBcPIYznf  (one call, university reqs)
   → AMALI, IDEAS, BS-SMT rules (same for all programs — fetch once)

6. Transform each program into our JSON schema format
```

Total API calls: ~3–4 per full scrape run (most work happens in the single bulk programs fetch). The courses batch in step 4 can be split across programs or done in one call across all programs at once (the endpoint accepts up to ~50 IDs observed; test limits).

---

## Open Questions for Scraper Phase

1. **`GE14 - *` full inventory**: Need to scan all programs to get the complete attribute → schema ID mapping. One bulk pass is sufficient.
2. **`GE27 - *` catalog year**: What catalog year does this prefix correspond to? May be a post-2020 gen-ed revision.
3. **MIAI attributes**: How do `MIAI - *` course attributes affect IAI track worksheet generation vs. standard IAI attributes?
4. **Sequence selection**: Programs with multiple sequences (subplans) show all sequences in `requisitesSimple`. The scraper needs to either generate one sheet per sequence or prompt for selection.
5. **Phased programs**: Nursing-style programs with phases — how do `requirementLevels` and `specializations` encode the phase boundary? Needs a Nursing program HAR for verification.
6. **`subSelections`**: All `subSelections` arrays were empty in the Accounting data. When are they populated? May encode program-specific overrides to gen-ed rules.
