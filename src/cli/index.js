#!/usr/bin/env node
// src/cli/index.js — Sigil CLI entry point
// Install globally:  npm install -g .
// Usage:             sigil <command> [subcommand] [options]

'use strict';

const { parseArgs } = require('./lib/args.js');
const { printHelp } = require('./lib/help.js');
const { printBanner } = require('./lib/banner.js');

const commands = {
    health:   require('./commands/health.js'),
    media:    require('./commands/media.js'),
    packages: require('./commands/packages.js'),
    preview:  require('./commands/preview.js'),
    logs:     require('./commands/logs.js'),
    status:   require('./commands/status.js'),
    restart:  require('./commands/restart.js'),
};

async function main() {
    const { command, sub, flags, positional } = parseArgs(process.argv.slice(2));

    if (!command || command === 'help' || flags.help || flags.h) {
        printBanner();
        printHelp();
        process.exit(0);
    }

    const handler = commands[command];
    if (!handler) {
        console.error(`\n  \x1b[31m✗\x1b[0m Unknown command: \x1b[33m${command}\x1b[0m`);
        console.error(`  Run \x1b[36msigil help\x1b[0m to see available commands.\n`);
        process.exit(1);
    }

    try {
        await handler({ sub, flags, positional });
    } catch (err) {
        console.error(`\n  \x1b[31m✗ Error:\x1b[0m ${err.message}\n`);
        process.exit(1);
    }
}

main();
