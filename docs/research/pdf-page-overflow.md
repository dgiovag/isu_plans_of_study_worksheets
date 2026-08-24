# PDF page-overflow analysis (2026-08-24)

Snapshot from a full rebuild of all PDFs (`node pdf/build-pdf.js --all`), measured
with `pdfinfo`. 1,131 PDFs total (all programs/sequences × 3 gen-ed tracks: isu/iai/ad).

## Distribution

| Pages | Count | % |
|---|---|---|
| 1 | 855 | 75.6% |
| 2 | 196 | 17.3% |
| 3 | 62 | 5.5% |
| 4 | 16 | 1.4% |
| 5 | 2 | 0.2% |

**276 of 1,131 PDFs (24.4%) exceed 1 page.** Of those, **80 exceed the 2-page target**.

## Concentration

The >2-page overflow is not spread evenly — it clusters in a handful of
content-heavy program families, consistently across all three gen-ed tracks:

- **Music Education** (`musbmed` + 4 emphasis variants) — 4 pages every track
- **Middle Level Ed** (`tchmlebs`/`tchmlebsed`) — worst overall, 5 pages on the `ad` track
- **Elementary Ed** (`tchelebs`/`tchelebsed`, incl. bilingual/bicultural) — 3 pages
- **Early Childhood Ed** (`tchecebs`) — 3 pages
- **Nursing, traditional prelicensure** (`nurbsn`) — 3 pages
- **Music Business** (`musbs`), **Jazz Studies** (`musbm-jazz-studies`) — 3 pages
- Science/history programs at the 3-page boundary: `bscbs` (+ conservation-biology,
  zoology variants), `geoensysbs`, `hisba`/`hisbs`, `ctkba`/`ctkbs` accelerated tracks

## Root cause (as currently understood)

Page-break logic (`pdf/modules/row-pdf.js::breakIfNeeded`,
`pdf/modules/render-group-pdf.js::estimateGroupHeight`) makes **local** decisions —
does this group fit before the next page break — plus a per-column height-balance /
semantic-split fallback for the major column (added in commit `2414498`). There is no
**global** page budget: nothing checks "does this program's total content fit in 2
pages" before or during layout, so there's no fallback strategy (tighter row height,
smaller font, accepting a 3rd page) for the outlier programs. The overflow programs
are exactly the ones with the most requirement groups / largest option lists per group
(licensure electives, repeatable ensemble/applied-music blocks, phased clinical
sequences).

## Full file list, grouped by page count

### 5 pages

- tchmlebs-ad.pdf
- tchmlebsed-ad.pdf

### 4 pages

- musbmed-ad.pdf
- musbmed-choral-general-vocal-ad.pdf
- musbmed-choral-general-vocal-iai.pdf
- musbmed-choral-general-vocal-isu.pdf
- musbmed-iai.pdf
- musbmed-instrumental-band-ad.pdf
- musbmed-instrumental-band-iai.pdf
- musbmed-instrumental-band-isu.pdf
- musbmed-instrumental-orchestra-ad.pdf
- musbmed-instrumental-orchestra-iai.pdf
- musbmed-instrumental-orchestra-isu.pdf
- musbmed-isu.pdf
- tchmlebs-iai.pdf
- tchmlebs-isu.pdf
- tchmlebsed-iai.pdf
- tchmlebsed-isu.pdf

### 3 pages

- bscbs-ad.pdf
- bscbs-conservation-biology-ad.pdf
- bscbs-conservation-biology-iai.pdf
- bscbs-conservation-biology-isu.pdf
- bscbs-iai.pdf
- bscbs-isu.pdf
- bscbs-zoology-ad.pdf
- bscbs-zoology-iai.pdf
- bscbs-zoology-isu.pdf
- ctkba-creative-technologies-accelerated-isu.pdf
- ctkbs-accelerated-isu.pdf
- geoensysbs-accelerated-ad.pdf
- geoensysbs-accelerated-iai.pdf
- geoensysbs-accelerated-isu.pdf
- geoensysbs-ad.pdf
- geoensysbs-iai.pdf
- geoensysbs-isu.pdf
- geoensysbs-traditional-ad.pdf
- geoensysbs-traditional-iai.pdf
- geoensysbs-traditional-isu.pdf
- hisba-ad.pdf
- hisba-history-social-sciences-teacher-education-ad.pdf
- hisba-history-social-sciences-teacher-education-iai.pdf
- hisba-iai.pdf
- hisba-social-science-teacher-education-accelerated-ad.pdf
- hisba-social-science-teacher-education-accelerated-iai.pdf
- hisbs-ad.pdf
- hisbs-history-social-sciences-teacher-education-ad.pdf
- hisbs-history-social-sciences-teacher-education-iai.pdf
- hisbs-iai.pdf
- hisbs-social-science-teacher-education-accelerated-ad.pdf
- hisbs-social-science-teacher-education-accelerated-iai.pdf
- musbm-jazz-studies-ad.pdf
- musbm-jazz-studies-iai.pdf
- musbm-jazz-studies-isu.pdf
- musbmed-choral-general-keyboard-ad.pdf
- musbmed-choral-general-keyboard-iai.pdf
- musbmed-choral-general-keyboard-isu.pdf
- musbs-ad.pdf
- musbs-iai.pdf
- musbs-isu.pdf
- musbs-music-business-ad.pdf
- musbs-music-business-iai.pdf
- musbs-music-business-isu.pdf
- nurbsn-ad.pdf
- nurbsn-iai.pdf
- nurbsn-isu.pdf
- nurbsn-traditional-prelicensure-ad.pdf
- nurbsn-traditional-prelicensure-iai.pdf
- nurbsn-traditional-prelicensure-isu.pdf
- tchecebs-isu.pdf
- tchecebs-licensure-isu.pdf
- tchecebs-pedagogy-isu.pdf
- tchelebs-bilingual-bicultural-ad.pdf
- tchelebs-bilingual-bicultural-iai.pdf
- tchelebs-bilingual-bicultural-isu.pdf
- tchelebs-general-elementary-education-isu.pdf
- tchelebs-isu.pdf
- tchelebsed-bilingual-bicultural-ad.pdf
- tchelebsed-bilingual-bicultural-iai.pdf
- tchelebsed-general-elementary-education-isu.pdf
- tchelebsed-isu.pdf

### 2 pages

- accntcybs-accounting-business-analytics-ad.pdf
- accntcybs-accounting-business-analytics-iai.pdf
- accntcybs-accounting-business-analytics-isu.pdf
- accntcybs-accounting-information-systems-ad.pdf
- accntcybs-accounting-information-systems-iai.pdf
- accntcybs-accounting-information-systems-isu.pdf
- accntcybs-business-information-systems-accounting-ad.pdf
- accntcybs-business-information-systems-accounting-iai.pdf
- accntcybs-business-information-systems-accounting-isu.pdf
- agribs-ad.pdf
- agribs-agriculture-teacher-education-ad.pdf
- agribs-agriculture-teacher-education-iai.pdf
- agribs-agriculture-teacher-education-isu.pdf
- agribs-animal-industry-management-ad.pdf
- agribs-animal-industry-management-iai.pdf
- agribs-animal-industry-management-isu.pdf
- agribs-animal-science-ad.pdf
- agribs-animal-science-isu.pdf
- agribs-crop-and-soil-ad.pdf
- agribs-crop-and-soil-isu.pdf
- agribs-horticulture-and-landscape-management-ad.pdf
- agribs-horticulture-and-landscape-management-isu.pdf
- agribs-isu.pdf
- agribs-pre-veterinary-medicine-ad.pdf
- agribs-pre-veterinary-medicine-isu.pdf
- artbs-art-teacher-education-ad.pdf
- artbs-art-teacher-education-iai.pdf
- artbs-art-teacher-education-isu.pdf
- bmbmolclbs-ad.pdf
- bmbmolclbs-iai.pdf
- bmbmolclbs-isu.pdf
- bscbs-general-biology-ad.pdf
- bscbs-general-biology-iai.pdf
- bscbs-general-biology-isu.pdf
- bscbs-physiology-neuroscience-and-behavior-ad.pdf
- bscbs-physiology-neuroscience-and-behavior-iai.pdf
- bscbs-physiology-neuroscience-and-behavior-isu.pdf
- bscbs-plant-biology-ad.pdf
- bscbs-plant-biology-iai.pdf
- bscbs-plant-biology-isu.pdf
- bsctebs-ad.pdf
- bsctebs-iai.pdf
- bsctebs-isu.pdf
- chebichmbs-ad.pdf
- chebichmbs-isu.pdf
- chebs-chemistry-teacher-education-ad.pdf
- cjsba-accelerated-ad.pdf
- cjsba-accelerated-iai.pdf
- cjsba-accelerated-isu.pdf
- cjsbs-criminal-justice-sciences-accelerated-ad.pdf
- cjsbs-criminal-justice-sciences-accelerated-iai.pdf
- cjsbs-criminal-justice-sciences-accelerated-isu.pdf
- ctkba-animation-entertainment-arts-isu.pdf
- ctkba-audio-and-music-production-isu.pdf
- ctkba-creative-technologies-accelerated-ad.pdf
- ctkba-creative-technologies-accelerated-iai.pdf
- ctkba-game-design-isu.pdf
- ctkba-interdisciplinary-technologies-isu.pdf
- ctkba-isu.pdf
- ctkbs-accelerated-ad.pdf
- ctkbs-accelerated-iai.pdf
- ctkbs-animation-entertainment-arts-isu.pdf
- ctkbs-audio-and-music-production-isu.pdf
- ctkbs-game-design-isu.pdf
- ctkbs-interdisciplinary-technologies-isu.pdf
- ctkbs-isu.pdf
- egrenginbs-ad.pdf
- egrenginbs-iai.pdf
- egrenginbs-isu.pdf
- eleenginbs-ad.pdf
- eleenginbs-iai.pdf
- eleenginbs-isu.pdf
- fcsba-general-ad.pdf
- fcsba-general-iai.pdf
- fcsba-general-isu.pdf
- fcsbs-general-ad.pdf
- fcsbs-general-iai.pdf
- fcsbs-general-isu.pdf
- geoba-geography-social-science-teacher-education-ad.pdf
- geoba-geography-social-science-teacher-education-iai.pdf
- geobs-geography-social-science-teacher-education-ad.pdf
- geobs-geography-social-science-teacher-education-iai.pdf
- geolbs-accelerated-ad.pdf
- geolbs-ad.pdf
- geolbs-earth-and-space-science-teacher-education-ad.pdf
- geolbs-earth-and-space-science-teacher-education-iai.pdf
- geolbs-earth-and-space-science-teacher-education-isu.pdf
- geolbs-traditional-ad.pdf
- hisba-general-history-accelerated-ad.pdf
- hisba-general-history-accelerated-iai.pdf
- hisba-general-history-accelerated-isu.pdf
- hisba-general-history-ad.pdf
- hisba-general-history-iai.pdf
- hisba-general-history-isu.pdf
- hisba-history-social-sciences-teacher-education-isu.pdf
- hisba-isu.pdf
- hisba-social-science-teacher-education-accelerated-isu.pdf
- hisbs-general-history-accelerated-ad.pdf
- hisbs-general-history-accelerated-iai.pdf
- hisbs-general-history-accelerated-isu.pdf
- hisbs-general-history-ad.pdf
- hisbs-general-history-iai.pdf
- hisbs-general-history-isu.pdf
- hisbs-history-social-sciences-teacher-education-isu.pdf
- hisbs-isu.pdf
- hisbs-social-science-teacher-education-accelerated-isu.pdf
- hscenvhlbs-ad.pdf
- hscenvhlbs-isu.pdf
- hschltedbs-applied-health-sciences-ad.pdf
- hschltedbs-applied-health-sciences-isu.pdf
- intlbusba-ad.pdf
- intlbusba-iai.pdf
- intlbusba-isu.pdf
- intlbusbs-ad.pdf
- intlbusbs-iai.pdf
- intlbusbs-isu.pdf
- itcompscbs-ad.pdf
- itcompscbs-general-computer-science-accelerated-ad.pdf
- itcompscbs-general-computer-science-ad.pdf
- itcompscbs-web-computing-ad.pdf
- knrexscibs-allied-health-professions-ad.pdf
- knrexscibs-athletic-training-accelerated-ad.pdf
- mecenginbs-ad.pdf
- mecenginbs-iai.pdf
- mecenginbs-isu.pdf
- medlabscbs-ad.pdf
- medlabscbs-iai.pdf
- medlabscbs-isu.pdf
- musba-ad.pdf
- musba-iai.pdf
- musba-isu.pdf
- musbm-band-and-orchestra-instruments-performance-ad.pdf
- musbm-band-and-orchestra-instruments-performance-iai.pdf
- musbm-band-and-orchestra-instruments-performance-isu.pdf
- musbm-classical-guitar-performance-ad.pdf
- musbm-classical-guitar-performance-iai.pdf
- musbm-classical-guitar-performance-isu.pdf
- musbm-composition-theory-emphasis-ad.pdf
- musbm-composition-theory-emphasis-iai.pdf
- musbm-composition-theory-emphasis-isu.pdf
- musbm-music-composition-ad.pdf
- musbm-music-composition-iai.pdf
- musbm-music-composition-isu.pdf
- musbm-music-therapy-ad.pdf
- musbm-music-therapy-iai.pdf
- musbm-music-therapy-isu.pdf
- musbm-new-media-composition-ad.pdf
- musbm-new-media-composition-iai.pdf
- musbm-new-media-composition-isu.pdf
- musbm-piano-performance-ad.pdf
- musbm-piano-performance-iai.pdf
- musbm-piano-performance-isu.pdf
- musbs-liberal-arts-ad.pdf
- musbs-liberal-arts-iai.pdf
- musbs-liberal-arts-isu.pdf
- nurbsn-r-n-to-b-s-n-ad.pdf
- nurbsn-r-n-to-b-s-n-iai.pdf
- nurbsn-r-n-to-b-s-n-isu.pdf
- phybs-ad.pdf
- phybs-biophysics-ad.pdf
- phybs-biophysics-isu.pdf
- phybs-isu.pdf
- phybs-physics-ad.pdf
- phybs-physics-isu.pdf
- phybs-physics-teacher-education-ad.pdf
- psyba-ad.pdf
- psybs-ad.pdf
- tchecebs-ad.pdf
- tchecebs-iai.pdf
- tchecebs-licensure-ad.pdf
- tchecebs-licensure-iai.pdf
- tchecebs-pedagogy-ad.pdf
- tchecebs-pedagogy-iai.pdf
- tchecebse-licensure-ad.pdf
- tchecebse-licensure-iai.pdf
- tchecebse-licensure-isu.pdf
- tchelebs-ad.pdf
- tchelebs-general-elementary-education-ad.pdf
- tchelebs-general-elementary-education-iai.pdf
- tchelebs-iai.pdf
- tchelebsed-ad.pdf
- tchelebsed-bilingual-bicultural-isu.pdf
- tchelebsed-general-elementary-education-ad.pdf
- tchelebsed-general-elementary-education-iai.pdf
- tchelebsed-iai.pdf
- tecconmnbs-ad.pdf
- tecconmnbs-iai.pdf
- tecconmnbs-isu.pdf
- teccstbs-ad.pdf
- teccstbs-iai.pdf
- teccstbs-isu.pdf
- tecengtcbs-ad.pdf
- tecengtcbs-isu.pdf
- tecgrcmbs-ad.pdf
- tecgrcmbs-iai.pdf
- tecgrcmbs-isu.pdf
