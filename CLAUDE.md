# CLAUDE.md

Development guidance for this NovelAI Script project.

## Build System

```
npm run build       # nibs build → dist/*.naiscript
npm run typecheck   # tsc --noEmit (type-check without building)
npm run format      # prettier -w .
npm run test        # vitest run
```

## Project Structure

- `src/index.ts` — Entry point. All top-level code runs inside an `async` IIFE.
- `project.yaml` — Script metadata: `id`, `name`, `version`, `author`, `config` fields.
- `external/script-types.d.ts` — NovelAI Scripting API type definitions (auto-downloaded by nibs; gitignored).
- `dist/` — Build output (do not edit; gitignored).
- `tests/setup.ts` — Vitest mock for `api.v1`; expand as needed.

## NovelAI Scripting Environment

Scripts run in a **QuickJS web worker** — no DOM, no Node.js runtime:

- Use `api.v1.log()` and `api.v1.error()` — not `console.log()`
- Use `api.v1.timers.setTimeout()` — not `setTimeout()`
- Use `api.v1.uuid()` for ID generation
- The `api` global is always available — never import it

## Key APIs (via `api.v1`)

| Area | APIs |
|------|------|
| **Hooks** | `api.v1.hooks.register(event, handler)` — generation lifecycle events |
| **Generation** | `api.v1.generate(messages, params)`, `api.v1.generateWithStory()` |
| **Document** | `api.v1.document` — paragraph scan, insert, remove, section IDs |
| **Storage** | `api.v1.storage`, `api.v1.storyStorage`, `api.v1.historyStorage`, `api.v1.tempStorage` |
| **UI** | `api.v1.ui.register([...])` — panels, buttons, sliders, checkboxes |
| **Lorebook** | `api.v1.lorebook` — CRUD for entries and categories |
| **Memory / AN** | `api.v1.memory.get/set()`, `api.v1.an.get/set()` |
| **Config** | `api.v1.config.get('key')` — reads `project.yaml` config fields |
| **Permissions** | `api.v1.permissions.request('documentEdit', reason)` |

Always consult `external/script-types.d.ts` for full signatures and JSDoc examples before writing API calls.

## Available Hook Events

`onGenerationRequested`, `onContextBuilt`, `onResponse`, `onGenerationEnd`, `onScriptsLoaded`, `onBeforeContextBuild`, `onLorebookEntrySelected`, `onHistoryNavigated`, `onDocumentConvertedToText`, `onTextAdventureInput`

## TypeScript

Strict mode is fully enabled: `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`. Avoid `any` casts — rely on the types in `external/script-types.d.ts`.

## Script Config Fields

Configurable settings go in `project.yaml` under `config:`. Supported types: `string`, `boolean`, `number`. Access at runtime via `await api.v1.config.get('field_name')`.

## Coding Conventions

- Wrap all top-level code in an `async` IIFE: `(async () => { ... })();`
- Storage keys: prefix with `story:` for per-story data (e.g. `story:my-key`) to use `storyStorage`
- No singletons/globals beyond the `api` object
- Keep UI IDs and storage keys consistent — consider centralizing them in a `src/constants.ts`
