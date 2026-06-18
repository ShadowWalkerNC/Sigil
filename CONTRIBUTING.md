# Contributing to Sigil

Thanks for your interest in contributing! Here’s how to get involved.

---

## Getting Started

1. Fork the repository and clone your fork.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in your credentials.
4. Run the bot: `node src/index.js`

---

## Development Workflow

- **Commands** live in `src/commands/`. Each command is a self-contained module exporting `data` (SlashCommandBuilder) and `execute`.
- **Utilities** live in `src/utils/`. Shared canvas/AI logic lives here.
- **Events** live in `src/events/`. Each event exports `name`, `once`, and `execute`.
- **GUI** lives in `gui/`. The Express server and HTML builder are here.

### Adding a new command

1. Create `src/commands/yourcommand.js`.
2. Export `{ data, execute }` (and optionally `autocomplete`).
3. The bot auto-loads all `.js` files in `src/commands/`.
4. Deploy commands: `node src/deploy-commands.js`

---

## Code Style

- Use `const`/`let`, never `var`.
- Async/await over raw promises.
- Keep commands focused — heavy logic belongs in `src/utils/`.
- Log errors with `console.error('[module]', err)` so they’re easy to grep.

---

## Pull Requests

- Keep PRs small and focused on a single feature or fix.
- Write a clear description of what changed and why.
- Ensure the bot starts without errors before submitting.

---

## Reporting Issues

Open a GitHub Issue with:
- What you expected to happen
- What actually happened
- Relevant error output from the console
