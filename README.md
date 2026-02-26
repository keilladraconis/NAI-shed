# NAI Script Template

A GitHub template repository for building [NovelAI Scripts](https://docs.novelai.net/scripting) with [`nibs-cli`](https://www.npmjs.com/package/nibs-cli).

## Using This Template

1. Click **"Use this template"** → **"Create a new repository"** on GitHub
2. Clone your new repository
3. `npm install`
4. Edit `project.yaml`:
   - Replace the `id` with a fresh UUID (`uuidgen` on Linux/Mac, or https://www.uuidgenerator.net)
   - Set `name`, `author`, and `description` for your script
5. Rename `package.json` `"name"` to match your script (e.g. `"nai-my-script"`)
6. Write your script in `src/index.ts`
7. `npm run build` to compile

The compiled `.naiscript` file will appear in `dist/`. Import it into NovelAI via the **User Scripts** panel.

## Project Structure

```
src/
└── index.ts          # Entry point — start here
tests/
└── setup.ts          # Vitest API mock — expand as needed
.github/
└── workflows/
    └── release.yml   # Auto-releases on version bump in project.yaml
CLAUDE.md             # AI development guidance
project.yaml          # Script metadata and config fields
tsconfig.json         # Strict TypeScript config
vitest.config.ts      # Test runner config
```

> `external/` and `dist/` are gitignored — they are generated automatically by `nibs build`.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile to `dist/*.naiscript` |
| `npm run typecheck` | Type-check without building |
| `npm run format` | Format code with Prettier |
| `npm run test` | Run tests with Vitest |

## Configurable Settings

Add user-facing settings to `project.yaml` under `config:`. They appear in the script's gear menu in NovelAI:

```yaml
config:
  - name: my_setting
    prettyName: My Setting
    description: What this setting does
    type: string      # string | boolean | number
    multiline: false
    default: "default value"
```

Read them in code with `await api.v1.config.get('my_setting')`.

## Automated Releases

The included GitHub Actions workflow automatically builds and creates a GitHub Release whenever `version` in `project.yaml` is bumped on `main`. The release attachment is the compiled `.naiscript` file, ready to import.

To release a new version:
1. Update `version` in `project.yaml`
2. Commit and push to `main`

## NovelAI Scripting API

The full API is available via the `api` global (always available, never imported). After running `npm run build` once, `external/script-types.d.ts` will be downloaded and your editor will provide full IntelliSense.

Key areas:
- **`api.v1.hooks`** — hook into generation events
- **`api.v1.generate()`** — call AI models programmatically
- **`api.v1.document`** — read and edit story paragraphs
- **`api.v1.ui.register()`** — add panels, buttons, sliders
- **`api.v1.storyStorage`** — persist data per story
- **`api.v1.lorebook`** — CRUD for lorebook entries

See `CLAUDE.md` for a full API reference and coding conventions.

## License

MIT
