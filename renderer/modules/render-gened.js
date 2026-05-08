'use strict';
const renderGroup = require('./render-group');

// Renders all groups in one course_based gen-ed track panel.
// prefix is the track id (e.g., "isu", "iai").
module.exports = function renderGenEd(track, courseMap) {
  if (!track.groups) return '';
  return track.groups
    .map(group => renderGroup(group, courseMap, track.id))
    .join('\n');
};
