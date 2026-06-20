'use strict';

/**
 * src/cli/commands/status.js
 * Handler for:  sigil status [--json]
 * Delegates to the shared module at src/cli/status.js which does all the work.
 */

const { run } = require('../status.js');

module.exports = async function statusCommand({ flags, positional }) {
    // Rebuild a minimal argv so the shared module can inspect --json.
    // The shared module was written to accept process.argv-style array.
    const argv = [];
    if (flags.json) argv.push('--json');
    await run(argv);
};
