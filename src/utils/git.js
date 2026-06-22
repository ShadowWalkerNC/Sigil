'use strict';

const { execSync } = require('child_process');

function getGitCommit() {
    try { return execSync('git rev-parse --short HEAD').toString().trim(); }
    catch { return 'unknown'; }
}

module.exports = { getGitCommit };
