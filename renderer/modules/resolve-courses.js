'use strict';
// Builds id → course object map from program.courses[].
module.exports = function resolveCourses(program) {
  const map = {};
  for (const c of program.courses || []) map[c.id] = c;
  return map;
};
