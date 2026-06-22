// ESLint 9 flat config
// https://eslint.org/docs/latest/use/configure/configuration-files

'use strict';

const nodeGlobals = {
    __dirname: 'readonly',
    __filename: 'readonly',
    exports: 'writable',
    module: 'writable',
    require: 'readonly',
    process: 'readonly',
    Buffer: 'readonly',
    global: 'readonly',
    console: 'readonly',
    setTimeout: 'readonly',
    setInterval: 'readonly',
    clearTimeout: 'readonly',
    clearInterval: 'readonly',
    setImmediate: 'readonly',
    clearImmediate: 'readonly',
    URL: 'readonly',
    URLSearchParams: 'readonly',
    TextEncoder: 'readonly',
    TextDecoder: 'readonly',
    AbortController: 'readonly',
    AbortSignal: 'readonly',
    fetch: 'readonly',
    crypto: 'readonly',
};

const browserGlobals = {
    window: 'readonly',
    document: 'readonly',
    navigator: 'readonly',
    location: 'readonly',
    history: 'readonly',
    localStorage: 'readonly',
    sessionStorage: 'readonly',
    fetch: 'readonly',
    console: 'readonly',
    setTimeout: 'readonly',
    setInterval: 'readonly',
    clearTimeout: 'readonly',
    clearInterval: 'readonly',
    alert: 'readonly',
    confirm: 'readonly',
    URLSearchParams: 'readonly',
    URL: 'readonly',
    FormData: 'readonly',
    HTMLElement: 'readonly',
    Event: 'readonly',
    EventSource: 'readonly',
    WebSocket: 'readonly',
    MutationObserver: 'readonly',
    requestAnimationFrame: 'readonly',
    cancelAnimationFrame: 'readonly',
    performance: 'readonly',
    Image: 'readonly',
    Canvas: 'readonly',
    CanvasRenderingContext2D: 'readonly',
    FileReader: 'readonly',
    Blob: 'readonly',
};

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
    // ── Ignore patterns ────────────────────────────────────────────────────────
    {
        ignores: [
            'node_modules/**',
            'data/**',
            'docs/**',
            'examples/**',
            'tools/**',
            '**/*.min.js',
        ],
    },

    // ── src/ — Node.js CJS (bot + utils) ────────────────────────────────────────
    {
        files: ['src/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: nodeGlobals,
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-undef': 'error',
            'no-console': 'off',
            'eqeqeq': ['warn', 'smart'],
            'no-var': 'warn',
            'prefer-const': ['warn', { destructuring: 'all' }],
            'no-duplicate-imports': 'error',
            'no-unreachable': 'error',
            'no-constant-condition': 'warn',
        },
    },

    // ── ESM utils — override sourceType for files that use import/export ─────
    {
        files: [
            'src/utils/emoji-generator.js',
            'src/utils/git.js',
            'src/utils/queue.js',
            'src/utils/sleep.js',
            'src/utils/sticker-generator.js',
        ],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: nodeGlobals,
        },
    },

    // ── gui/*.js — Node.js CJS + browser globals ───────────────────────────
    {
        files: ['gui/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: { ...nodeGlobals, ...browserGlobals },
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-undef': 'error',
            'no-console': 'off',
            'eqeqeq': ['warn', 'smart'],
            'no-var': 'warn',
            'prefer-const': ['warn', { destructuring: 'all' }],
            'no-unreachable': 'error',
        },
    },
];
