# 🐍 Shed — A NovelAI Script (v2 Design)

*Your characters are growing. Let their lore keep up.*

---

## The Mascot: Slough

**Slough** (pronounced "sluff") is a small, cheerful snake who has just wriggled out of a translucent old skin. One eye is still peeking through the old skin like a monocle. She carries a tiny quill pen in her tail.

The name "Slough" is the technical term for the skin a snake leaves behind — the thing that is *shed*.

Slough appears in:
- The Lorebook Script tab icon
- Toast notifications ("🐍 Marcus has shed!")
- Empty states ("No shed patterns yet. Slough is waiting...")
- Error states ("🐍 Token budget exhausted — Slough needs to rest")

---

## What Shed Does

You have a lorebook entry describing a character. Over the story, that character changes — they transform, grow, get injured, gain powers, shift allegiance, whatever. Without Shed, the lorebook stays static. The AI forgets.

**With Shed**, you write a natural-language *Shed Pattern* describing the intended arc, and Shed periodically asks the AI to rewrite the lorebook entry to reflect the character's current story state.

### The Shedding Toggle

When **Shedding is ON**: the entry evolves. Molts happen on schedule or manually.

When **Shedding is turned OFF**: the entry is **restored to its original text** (the slough). The character snaps back to baseline in the AI's eyes. All evolution state is preserved, though — turning Shedding back ON resumes from where it left off, not from scratch.

This means Shedding acts as a live toggle: *"Do I want the AI to see the transformed version or the original?"* Useful for flashbacks, alternate timelines, or just checking whether the evolution has gone off the rails.

---

## Vocabulary

| Term | Meaning |
|---|---|
| **Shed** | The script itself; also the act of updating an entry |
| **Shedding** | The toggle — ON means the entry is actively evolving |
| **Shed Pattern** | Natural-language description of how the entry should change |
| **Shed Now** | Manual trigger button |
| **Unshed** | Permanently revert: discard all evolved state and reset to original |
| **Slough** | The stored original text (the old skin); also the mascot |
| **Skin** | The current evolved version of the lorebook text |
| **Molt** | A single evolution event |

---

## Two Layers of Configuration

Shed uses **two distinct configuration surfaces**, each serving a different purpose:

### 1. Script Configuration (Global Settings)

These are defined in the `.naiscript` file's metadata and appear in NovelAI's standard script settings UI. They control **script-wide behavior** — things the user sets once and rarely changes. Retrieved via `api.v1.config.get(key)`.

| Key | Type | Default | Description |
|---|---|---|---|
| `system_prompt` | `string` | *(see below)* | The system prompt sent to the AI when molting. Power users can customize this to change Shed's rewriting personality. |
| `temperature` | `number` | `0.35` | Generation temperature for molt requests. Lower = more conservative changes. |
| `max_tokens` | `number` | `500` | Max output tokens per molt. Controls how long the rewritten entry can be. |
| `context_paragraphs` | `number` | `20` | How many recent story paragraphs to include as context when molting. |
| `auto_molt` | `boolean` | `true` | Whether molts happen automatically on schedule, or only via the manual button. |
| `toast_notifications` | `boolean` | `true` | Show toast notifications when molts occur. |
| `molt_model` | `select` | `glm-4-6` | Which model to use for molt generation. Options: `glm-4-6` (and any future models). |

**Default system prompt:**
```
You are Shed, a lorebook continuity editor for an interactive story. Your job is
to rewrite a character's lorebook entry so it reflects their current state based
on recent story events.

Rules:
- Output ONLY the updated lorebook entry text. No preamble, no commentary.
- Maintain the same approximate format, length, and style as the current entry.
- Incorporate changes that have happened or clearly begun in the story.
- Preserve details that haven't changed.
- Be guided by the Shed Pattern (the author's stated intent for transformation).
- Don't leap ahead — only reflect changes actually evidenced in the story.
- Write in third person, present tense, descriptive prose.
```

The config fields are defined in the `.naiscript` metadata like this:

```json
{
  "configFields": [
    {
      "key": "system_prompt",
      "type": "string",
      "label": "System Prompt",
      "description": "The instructions sent to the AI when rewriting lorebook entries. Customize to change Shed's rewriting style.",
      "default": "You are Shed, a lorebook continuity editor..."
    },
    {
      "key": "temperature",
      "type": "number",
      "label": "Temperature",
      "description": "Generation temperature (0.0–1.5). Lower = more conservative, higher = more creative.",
      "default": 0.35
    },
    {
      "key": "max_tokens",
      "type": "number",
      "label": "Max Tokens",
      "description": "Maximum output tokens per molt. Controls rewritten entry length.",
      "default": 500
    },
    {
      "key": "context_paragraphs",
      "type": "number",
      "label": "Story Context (paragraphs)",
      "description": "How many recent paragraphs to include when molting.",
      "default": 20
    },
    {
      "key": "auto_molt",
      "type": "boolean",
      "label": "Automatic Molting",
      "description": "When enabled, entries molt on their configured schedule. When disabled, only the manual 'Shed Now' button works.",
      "default": true
    },
    {
      "key": "toast_notifications",
      "type": "boolean",
      "label": "Toast Notifications",
      "description": "Show a notification when an entry molts.",
      "default": true
    },
    {
      "key": "molt_model",
      "type": "select",
      "label": "Model",
      "description": "Which model to use for generating molts.",
      "default": "glm-4-6",
      "options": [
        { "label": "GLM 4.6", "value": "glm-4-6" }
      ]
    }
  ]
}
```

### 2. Lorebook Panel (Per-Entry Settings)

These appear in the **Script tab** of each lorebook entry and are stored in `storyStorage`. They control **per-entry behavior** — each character/location/item can have its own shed pattern, its own molt interval, etc.

| Setting | UI Part | Storage |
|---|---|---|
| Shedding on/off | `checkboxInput` | `storyStorage` |
| Shed Pattern text | `multilineTextInput` | `storyStorage` |
| Molt interval | `sliderInput` | `storyStorage` |
| Shed Now button | `button` | — |
| Unshed button | `button` | — |
| Status display | `text` (templated) | `tempStorage` / `storyStorage` |
| Slough (original) | `collapsibleSection` | `storyStorage` |

---

## Architecture

### Panel UI

```
┌────────────────────────────────────────────────────────┐
│  🐍 SHED                                              │
│                                                        │
│  Shedding: [✓ ON]                                      │
│                                                        │
│  Shed Pattern:                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Marcus is gradually transforming into a rock      │  │
│  │ elemental. His skin hardens to granite, eyes      │  │
│  │ become molten amber. He thinks in deep time...    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  Molt every: ◄━━━━━━━●━━━━━━━━━► 5 generations        │
│                                                        │
│  [ 🐍 Shed Now ]              [ ↩ Unshed ]            │
│                                                        │
│  ─────────────────────────────────────────────         │
│  Last molt: 3 generations ago                          │
│                                                        │
│  ▸ Slough (original text)                              │
│    "Marcus is a 34-year-old geologist with..."         │
└────────────────────────────────────────────────────────┘
```

### Panel Content Builder

```typescript
function buildShedPanel(entryId: string, entry: LorebookEntry, config: ShedConfig): UIPart[] {
    return [
        { type: 'text', markdown: true, text: '### 🐍 Shed' },

        // ── Shedding toggle ──
        // When turned OFF: restore slough to lorebook
        // When turned ON: restore last skin (if any) to lorebook
        {
            type: 'checkboxInput',
            storageKey: `shed-enabled-${entryId}`,
            label: 'Shedding',
            onChange: async (value: boolean) => {
                config.enabled = value;
                await api.v1.storyStorage.set(`shed-config-${entryId}`, config);

                if (value) {
                    // Turning ON — snapshot slough if first time
                    const hasSlough = await api.v1.storyStorage.has(`shed-slough-${entryId}`);
                    if (!hasSlough) {
                        await api.v1.storyStorage.set(`shed-slough-${entryId}`, entry.text);
                    }
                    // Restore last evolved skin if one exists
                    const lastSkin = await api.v1.historyStorage.get(`shed-skin-${entryId}`);
                    if (lastSkin) {
                        await api.v1.lorebook.updateEntry(entryId, { text: lastSkin });
                    }
                    api.v1.ui.toast('🐍 Shedding resumed', { type: 'info' });
                } else {
                    // Turning OFF — restore the slough (original text)
                    const slough = await api.v1.storyStorage.get(`shed-slough-${entryId}`);
                    if (slough) {
                        await api.v1.lorebook.updateEntry(entryId, { text: slough });
                    }
                    api.v1.ui.toast('🐍 Shedding paused — original restored', { type: 'info' });
                }
            }
        },

        // ── Shed Pattern ──
        { type: 'text', markdown: true,
          text: '**Shed Pattern**\n*Describe how this entry should change over the story.*' },
        {
            type: 'multilineTextInput',
            storageKey: `shed-pattern-${entryId}`,
            placeholder: 'e.g., "Marcus is slowly transforming into a rock elemental..."',
            onChange: async (value: string) => {
                config.pattern = value;
                await api.v1.storyStorage.set(`shed-config-${entryId}`, config);
            }
        },

        // ── Molt interval slider ──
        { type: 'text', markdown: true, text: '**Molt frequency**' },
        {
            type: 'sliderInput',
            storageKey: `shed-interval-${entryId}`,
            min: 1,
            max: 30,
            step: 1,
            label: 'Molt every N generations',
            onChange: async (value: number) => {
                config.moltInterval = value;
                await api.v1.storyStorage.set(`shed-config-${entryId}`, config);
            }
        },

        // ── Action buttons ──
        { type: 'row', spacing: 'start', content: [
            {
                type: 'button',
                text: '🐍 Shed Now',
                disableWhileCallbackRunning: true,
                callback: async () => {
                    api.v1.ui.toast('🐍 Shedding...', { type: 'info', id: 'shed-progress' });
                    try {
                        await molt(entryId);
                        api.v1.ui.toast('🐍 Shed complete!',
                            { type: 'success', id: 'shed-progress' });
                    } catch (e: any) {
                        api.v1.ui.toast(`🐍 ${e.message}`,
                            { type: 'error', id: 'shed-progress' });
                    }
                }
            },
            {
                type: 'button',
                text: '↩ Unshed',
                callback: async () => {
                    const slough = await api.v1.storyStorage.get(`shed-slough-${entryId}`);
                    if (slough) {
                        await api.v1.lorebook.updateEntry(entryId, { text: slough });
                        // Clear evolved state entirely
                        await api.v1.historyStorage.remove(`shed-skin-${entryId}`);
                        await api.v1.storyStorage.set(`shed-molt-count-${entryId}`, 0);
                        // Turn off shedding
                        config.enabled = false;
                        await api.v1.storyStorage.set(`shed-config-${entryId}`, config);
                        await api.v1.tempStorage.set(`shed-enabled-${entryId}`, false);
                        api.v1.ui.toast('↩ Unshed — fully reset to original', { type: 'info' });
                    } else {
                        api.v1.ui.toast('No slough saved — nothing to revert to',
                            { type: 'warning' });
                    }
                }
            }
        ]},

        // ── Status ──
        { type: 'text', markdown: true,
          text: `---\n*Last molt: {{story:shed-molt-ago-${entryId}}}*` },

        // ── Slough (original text) ──
        {
            type: 'collapsibleSection',
            title: '🐍 Slough (original text)',
            content: [
                { type: 'text',
                  text: `{{story:shed-slough-${entryId}}}`,
                  style: { opacity: 0.7, fontStyle: 'italic' }
                }
            ]
        }
    ];
}
```

### The Molt Function (Reading Config Values)

```typescript
async function molt(entryId: string): Promise<void> {
    const entry = await api.v1.lorebook.entry(entryId);
    if (!entry) throw new Error('Entry not found');

    const config = await api.v1.storyStorage.get(`shed-config-${entryId}`);
    if (!config?.pattern) throw new Error('No shed pattern defined');

    const slough = await api.v1.storyStorage.getDefault(
        `shed-slough-${entryId}`, entry.text
    );

    // Read global settings from Script Configuration
    const systemPrompt = await api.v1.config.get('system_prompt');
    const temperature = await api.v1.config.get('temperature');
    const maxTokens = await api.v1.config.get('max_tokens');
    const contextParagraphs = await api.v1.config.get('context_paragraphs');
    const model = await api.v1.config.get('molt_model');
    const showToasts = await api.v1.config.get('toast_notifications');

    // Gather recent story context
    const sections = await api.v1.document.scan(() => {});
    const recentText = sections
        .slice(-contextParagraphs)
        .map(s => s.text)
        .join('\n');

    // Check token budget
    const available = await api.v1.script.getAllowedOutput();
    if (available < 100) {
        throw new Error('Slough needs to rest — token budget low 🐍');
    }

    const prompt: Message[] = [
        { role: 'system', content: systemPrompt },
        {
            role: 'user',
            content: `SLOUGH (original entry, for reference):
${slough}

CURRENT SKIN (entry as it stands now):
${entry.text}

SHED PATTERN (author's intent for how this should evolve):
${config.pattern}

RECENT STORY:
${recentText}

Write the updated lorebook entry:`
        }
    ];

    const response = await api.v1.generate(prompt, {
        model: model,
        max_tokens: maxTokens,
        temperature: temperature,
    }, undefined, 'background');

    const newSkin = response.choices[0]?.text?.trim();
    if (!newSkin || newSkin.length < 10) {
        throw new Error('Generation returned empty or too short');
    }

    // Write the new skin
    await api.v1.lorebook.updateEntry(entryId, { text: newSkin });

    // Track in history storage for undo safety
    await api.v1.historyStorage.set(`shed-skin-${entryId}`, newSkin);

    // Reset molt counter, update status
    await api.v1.storyStorage.set(`shed-molt-count-${entryId}`, 0);
    await api.v1.storyStorage.set(`shed-molt-ago-${entryId}`, '0 generations ago');

    if (showToasts) {
        const name = entry.displayName || 'Entry';
        api.v1.ui.toast(`🐍 ${name} has shed!`, { type: 'success' });
    }
}
```

### Automatic Trigger (onGenerationEnd)

```typescript
api.v1.hooks.register('onGenerationEnd', async () => {
    const autoMolt = await api.v1.config.get('auto_molt');
    if (!autoMolt) return;

    const allEntries = await api.v1.lorebook.entries();
    let moltedOne = false; // max one molt per generation cycle

    for (const entry of allEntries) {
        if (moltedOne) break;

        const config = await api.v1.storyStorage.getDefault(
            `shed-config-${entry.id}`,
            { enabled: false, pattern: '', moltInterval: 5 }
        );
        if (!config.enabled || !config.pattern) continue;

        const count = await api.v1.storyStorage.getDefault(
            `shed-molt-count-${entry.id}`, 0
        );
        const newCount = count + 1;

        // Update the "ago" display for all tracked entries
        await api.v1.storyStorage.set(
            `shed-molt-ago-${entry.id}`,
            `${newCount} generation${newCount !== 1 ? 's' : ''} ago`
        );

        if (newCount >= config.moltInterval) {
            try {
                await molt(entry.id);
                moltedOne = true;
                // molt() resets count internally
            } catch (e: any) {
                api.v1.log(`Shed: molt failed for ${entry.displayName}: ${e.message}`);
                await api.v1.storyStorage.set(`shed-molt-count-${entry.id}`, newCount);
            }
        } else {
            await api.v1.storyStorage.set(`shed-molt-count-${entry.id}`, newCount);
        }
    }
});
```

### Shedding Toggle ↔ Lorebook Sync (onLorebookEntrySelected)

When the user navigates to an entry in the lorebook, we need to ensure the displayed entry text matches the Shedding state:

```typescript
api.v1.hooks.register('onLorebookEntrySelected', async ({ entryId, categoryId }) => {
    if (!entryId) return;

    const entry = await api.v1.lorebook.entry(entryId);
    if (!entry) return;

    const config = await api.v1.storyStorage.getDefault(
        `shed-config-${entryId}`,
        { enabled: false, pattern: '', moltInterval: 5 }
    );

    // Sync tempStorage for UI bindings
    await api.v1.tempStorage.set(`shed-enabled-${entryId}`, config.enabled);
    await api.v1.tempStorage.set(`shed-pattern-${entryId}`, config.pattern);
    await api.v1.tempStorage.set(`shed-interval-${entryId}`, config.moltInterval);

    // Update the panel
    api.v1.ui.update([{
        type: 'lorebookPanel',
        id: 'shed-panel',
        content: buildShedPanel(entryId, entry, config)
    }]);
});
```

### Undo Safety (onHistoryNavigated)

```typescript
api.v1.hooks.register('onHistoryNavigated', async () => {
    const allEntries = await api.v1.lorebook.entries();

    for (const entry of allEntries) {
        const config = await api.v1.storyStorage.getDefault(
            `shed-config-${entry.id}`, { enabled: false }
        );
        if (!config.enabled) continue;

        const expectedSkin = await api.v1.historyStorage.get(`shed-skin-${entry.id}`);

        if (expectedSkin && entry.text !== expectedSkin) {
            await api.v1.lorebook.updateEntry(entry.id, { text: expectedSkin });
            api.v1.log(`Shed: synced ${entry.displayName} to history state`);
        } else if (!expectedSkin) {
            const slough = await api.v1.storyStorage.get(`shed-slough-${entry.id}`);
            if (slough && entry.text !== slough) {
                await api.v1.lorebook.updateEntry(entry.id, { text: slough });
            }
        }
    }
});
```

### Permissions & Init

```typescript
(async () => {
    const hasPerms = await api.v1.permissions.request('lorebookEdit');
    if (!hasPerms) {
        api.v1.ui.toast('🐍 Shed needs lorebook edit permission to function.',
            { type: 'error' });
        return;
    }

    // Register the panel shell
    api.v1.ui.register([{
        type: 'lorebookPanel',
        id: 'shed-panel',
        name: '🐍 Shed',
        content: [{
            type: 'text', markdown: true,
            text: '*Select a lorebook entry to start Shedding.*\n\n🐍 Slough is waiting...'
        }]
    }]);

    // Register all hooks (onLorebookEntrySelected, onGenerationEnd,
    // onHistoryNavigated — shown above)
})();
```

---

## Storage Map

| Key | Storage Type | Contents |
|---|---|---|
| `shed-config-{entryId}` | `storyStorage` | `{ enabled, pattern, moltInterval }` |
| `shed-slough-{entryId}` | `storyStorage` | Original entry text (the old skin) |
| `shed-molt-count-{entryId}` | `storyStorage` | Generations since last molt |
| `shed-molt-ago-{entryId}` | `storyStorage` | Human-readable status string |
| `shed-skin-{entryId}` | `historyStorage` | Current evolved text (undo-aware) |
| `shed-enabled-{entryId}` | `tempStorage` | UI checkbox binding |
| `shed-pattern-{entryId}` | `tempStorage` | UI text area binding |
| `shed-interval-{entryId}` | `tempStorage` | UI slider binding |

---

## Shedding Toggle: State Diagram

```
                    ┌──────────────────┐
                    │   INITIAL STATE  │
                    │   (no Shed data) │
                    └────────┬─────────┘
                             │ User enables Shedding
                             │ → snapshot slough
                             ▼
                    ┌──────────────────┐
               ┌───▶│  SHEDDING: ON    │◀──┐
               │    │  (evolved skin   │   │
               │    │   in lorebook)   │   │
               │    └────────┬─────────┘   │
               │             │             │
    User turns │  User turns │  Molt       │ User turns
    ON again   │  OFF        │  occurs     │ ON again
    → restore  │  → restore  │  → update   │ → restore
    last skin  │  slough     │  skin       │ last skin
               │             ▼             │
               │    ┌──────────────────┐   │
               │    │  SHEDDING: OFF   │   │
               └────│  (slough in      │───┘
                    │   lorebook,      │
                    │   skin preserved │
                    │   in storage)    │
                    └────────┬─────────┘
                             │ User clicks Unshed
                             │ → discard all state
                             ▼
                    ┌──────────────────┐
                    │   FULLY RESET    │
                    │   (back to       │
                    │   initial state) │
                    └──────────────────┘
```

---

## Token Budget

- Each molt ≈ 500 output + ~2000 input tokens
- Script limit: 2048 output tokens / 4 min, input = 2× context / 6 min
- **One molt per `onGenerationEnd` max** — prevents starvation
- Check `getAllowedOutput()` before attempting
- System prompt + slough at prompt start → maximizes caching across molts

---

## Versioning Roadmap

### v0.1 — Manual Shed
- Lorebook panel with toggle, pattern, Shed Now, Unshed
- Manual-only molting
- Slough snapshot and restore on toggle
- `lorebookEdit` permission

### v0.2 — Automatic Shed  
- `onGenerationEnd` auto-molting with slider interval
- Token budget checking
- One-molt-per-cycle throttling
- Toast notifications

### v0.3 — History Safety
- `historyStorage` tracking
- `onHistoryNavigated` lorebook sync
- Undo-aware skin state

### v1.0 — Full Release
- Script Configuration fields for system prompt, temp, model
- Sidebar dashboard showing all Shedding entries
- Polished error handling and edge cases
- Documentation and mascot art

### Future
- Multi-phase arcs with milestones
- Cross-entry shedding (related characters update together)
- Molt log modal (history of all past skins)
- AI-detected triggers (molt when keywords appear in context)
- `generateWithStory` for richer context-aware molts

---

*Slough is cheering you on. 🐍*
