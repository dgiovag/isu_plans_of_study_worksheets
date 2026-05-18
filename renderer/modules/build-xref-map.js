'use strict';
const { sanitizeId } = require('./utils');

function addMapping(map, courseId, rowId) {
  if (!map[courseId]) map[courseId] = new Set();
  map[courseId].add(rowId);
}

function collectFixed(group, map) {
  const base = sanitizeId(group.id);
  (group.slots || []).forEach((slot, i) => {
    const rowId = `${base}-${i}`;
    if (slot.course_id) {
      addMapping(map, slot.course_id, rowId);
    } else if (slot.fill === 'choose_one' || slot.fill === 'choose_one_set') {
      (slot.options || []).forEach(opt => {
        if (typeof opt === 'string') addMapping(map, opt, rowId);
        else if (opt && opt.type === 'set' && opt.course_ids) {
          opt.course_ids.forEach(id => addMapping(map, id, rowId));
        }
      });
    }
  });
}

function collectChooseOne(group, map) {
  const rowId = `${sanitizeId(group.id)}-0`;
  (group.options || []).forEach(courseId => {
    if (typeof courseId === 'string') addMapping(map, courseId, rowId);
  });
}

function collectChooseOneTrack(group, map) {
  (group.tracks || []).forEach(t => {
    const base = sanitizeId(t.id);
    (t.courses || []).forEach((slot, j) => {
      const rowId = `${base}-${j}`;
      if (slot.course_id) {
        addMapping(map, slot.course_id, rowId);
      } else if (slot.fill === 'choose_one' || slot.fill === 'choose_one_set') {
        (slot.options || []).forEach(opt => {
          if (typeof opt === 'string') addMapping(map, opt, rowId);
        });
      }
    });
  });
}

function collectAutoFulfilled(group, map) {
  const base = sanitizeId(group.id);
  (group.auto_fulfilled_by || [])
    .filter(id => !id.includes('.'))
    .forEach((courseId, i) => addMapping(map, courseId, `${base}-${i}`));
}

function processGroup(group, map) {
  if (group.exempt) return;
  collectAutoFulfilled(group, map);
  switch (group.fill) {
    case 'fixed':            collectFixed(group, map);            break;
    case 'choose_one':       collectChooseOne(group, map);        break;
    case 'choose_one_track': collectChooseOneTrack(group, map);   break;
    // choose_n, choose_n_grouped: no deterministic course→slot mapping; skip.
    // open, open_constrained, repeat, escrow: handled via fulfills scan below.
  }
}

// For open/open_constrained gen-ed groups, assign cross-referencing courses to
// slot indices using a source-row bucketing approach: courses that share a source
// row (e.g. ENG145 and ENG145A13 both in major-writing-0) share the same gen-ed slot.
function assignOpenCrossRefs(program, map) {
  for (const track of (program.general_education?.tracks || [])) {
    if (track.type !== 'course_based') continue;
    for (const group of (track.groups || [])) {
      if (group.exempt) continue;
      if (group.fill !== 'open' && group.fill !== 'open_constrained') continue;

      const base = sanitizeId(group.id);
      const count = group.count || 1;
      const courseRefs = (group.auto_fulfilled_by || []).filter(id => !id.includes('.'));
      let nextSlot = courseRefs.length;

      // Maps a source rowId (from another column) to the gen-ed slot rowId assigned to it.
      const rowToSlot = {};

      for (const course of (program.courses || [])) {
        if (nextSlot >= count) break;
        if (!(course.fulfills || []).includes(group.id)) continue;
        if (courseRefs.includes(course.id)) continue;
        if (!map[course.id]) continue;

        for (const sourceRowId of map[course.id]) {
          if (sourceRowId.startsWith(base + '-')) continue; // same group, skip

          if (!rowToSlot[sourceRowId]) {
            if (nextSlot >= count) continue;
            rowToSlot[sourceRowId] = `${base}-${nextSlot}`;
            nextSlot++;
          }
          addMapping(map, course.id, rowToSlot[sourceRowId]);
        }
      }
    }
  }
}

module.exports = function buildXrefMap(program) {
  const courseRowMap = {};

  for (const group of (program.major?.groups || [])) {
    processGroup(group, courseRowMap);
  }
  for (const group of (program.college_requirements?.groups || [])) {
    processGroup(group, courseRowMap);
  }
  for (const track of (program.general_education?.tracks || [])) {
    if (track.type !== 'course_based') continue;
    for (const group of (track.groups || [])) {
      processGroup(group, courseRowMap);
    }
  }

  assignOpenCrossRefs(program, courseRowMap);

  // Build bidirectional rowId → rowId[] for courses that appear in multiple groups.
  const xrefMap = {};
  for (const rowIds of Object.values(courseRowMap)) {
    if (rowIds.size < 2) continue;
    const arr = [...rowIds];
    for (const rowId of arr) {
      if (!xrefMap[rowId]) xrefMap[rowId] = new Set();
      for (const other of arr) {
        if (other !== rowId) xrefMap[rowId].add(other);
      }
    }
  }

  const result = {};
  for (const [rowId, linked] of Object.entries(xrefMap)) {
    result[rowId] = [...linked];
  }
  return result;
};
