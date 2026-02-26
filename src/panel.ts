import { SHED_PANEL_ID, storageKeys } from './constants.js';
import { molt } from './molt.js';
import type { ShedConfig } from './types.js';

/**
 * Build the UI part list for a specific lorebook entry's Shed panel.
 *
 * Called each time the user selects an entry (onLorebookEntrySelected).
 * The returned array is passed directly to api.v1.ui.update().
 */
export function buildShedPanel(
  entryId: string,
  entryText: string,
  config: ShedConfig,
  sloughText: string | null,
): object[] {
  return [
    { type: 'text', markdown: true, text: '### 🐍 Shed' },

    // ── Shedding toggle ──────────────────────────────────────────────────────
    // ON  → restore the last evolved skin (if any) to the lorebook.
    // OFF → restore the original slough to the lorebook.
    {
      type: 'checkboxInput',
      storageKey: storageKeys.enabled(entryId),
      label: 'Shedding',
      onChange: async (value: boolean): Promise<void> => {
        config.enabled = value;
        await api.v1.storyStorage.set(storageKeys.config(entryId), config);

        if (value) {
          // Turning ON — snapshot slough if this is the very first time.
          const existingSlough = await api.v1.storyStorage.get(storageKeys.slough(entryId)) as string | null;
          if (existingSlough == null) {
            await api.v1.storyStorage.set(storageKeys.slough(entryId), entryText);
          }
          // Restore the last evolved skin, if one exists.
          const lastSkin = await api.v1.historyStorage.get(storageKeys.skin(entryId)) as string | null;
          if (lastSkin) {
            await api.v1.lorebook.updateEntry(entryId, { text: lastSkin });
          }
          api.v1.ui.toast('🐍 Shedding resumed', { type: 'info' });
        } else {
          // Turning OFF — restore the original text (the slough).
          const slough = await api.v1.storyStorage.get(storageKeys.slough(entryId)) as string | null;
          if (slough) {
            await api.v1.lorebook.updateEntry(entryId, { text: slough });
          }
          api.v1.ui.toast('🐍 Shedding paused — original restored', { type: 'info' });
        }
      },
    },

    // ── Shed Pattern ─────────────────────────────────────────────────────────
    {
      type: 'text',
      markdown: true,
      text: '**Shed Pattern**\n*Describe how this entry should change over the story.*',
    },
    {
      type: 'multilineTextInput',
      storageKey: storageKeys.pattern(entryId),
      placeholder: 'e.g., "Marcus is slowly transforming into a rock elemental..."',
      onChange: async (value: string): Promise<void> => {
        config.pattern = value;
        await api.v1.storyStorage.set(storageKeys.config(entryId), config);
      },
    },

    // ── Action buttons ────────────────────────────────────────────────────────
    {
      type: 'row',
      spacing: 'start',
      content: [
        {
          type: 'button',
          text: '🐍 Shed Now',
          disableWhileCallbackRunning: true,
          callback: async (): Promise<void> => {
            api.v1.ui.toast('🐍 Shedding...', { type: 'info', id: 'shed-progress' });
            try {
              await molt(entryId);
              api.v1.ui.toast('🐍 Shed complete!', { type: 'success', id: 'shed-progress' });
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : String(e);
              api.v1.ui.toast(`🐍 ${msg}`, { type: 'error', id: 'shed-progress' });
            }
          },
        },
        {
          type: 'button',
          text: '↩ Unshed',
          callback: async (): Promise<void> => {
            const slough = await api.v1.storyStorage.get(storageKeys.slough(entryId)) as string | null;
            if (!slough) {
              api.v1.ui.toast('No slough saved — nothing to revert to', { type: 'warning' });
              return;
            }
            // Restore original text and wipe all evolved state.
            await api.v1.lorebook.updateEntry(entryId, { text: slough });
            await api.v1.historyStorage.remove(storageKeys.skin(entryId));
            // Turn off shedding.
            config.enabled = false;
            await api.v1.storyStorage.set(storageKeys.config(entryId), config);
            await api.v1.tempStorage.set(storageKeys.enabled(entryId), false);
            api.v1.ui.toast('↩ Unshed — fully reset to original', { type: 'info' });
          },
        },
      ],
    },

    // ── Slough (original text) ────────────────────────────────────────────────
    {
      type: 'collapsibleSection',
      title: '🐍 Slough (original text)',
      content: [
        {
          type: 'text',
          text: sloughText ?? '*No slough saved yet. Slough is waiting...*',
          markdown: sloughText == null,
        },
      ],
    },
  ];
}

/**
 * The empty-state panel shown before any lorebook entry is selected.
 */
export function buildEmptyPanel(): object[] {
  return [
    {
      type: 'text',
      markdown: true,
      text: '*Select a lorebook entry to start Shedding.*\n\n🐍 Slough is waiting...',
    },
  ];
}

export { SHED_PANEL_ID };
