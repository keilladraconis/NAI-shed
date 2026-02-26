import { buildShedPanel, buildEmptyPanel, SHED_PANEL_ID } from './panel.js';
import { storageKeys } from './constants.js';
import { DEFAULT_CONFIG, type ShedConfig } from './types.js';

(async () => {
  // ─── Permissions ──────────────────────────────────────────────────────────
  const hasPerms = await api.v1.permissions.request('lorebookEdit');
  if (!hasPerms) {
    api.v1.ui.toast('🐍 Shed needs lorebook edit permission to function.', { type: 'error' });
    return;
  }

  api.v1.log('Shed v0.1.0 loaded.');

  // ─── Initial panel registration ────────────────────────────────────────────
  // Shows the empty state. Content is replaced when an entry is selected.
  await api.v1.ui.register([
    {
      type: 'lorebookPanel',
      id: SHED_PANEL_ID,
      name: '🐍 Shed',
      content: buildEmptyPanel(),
    },
  ]);

  // ─── onLorebookEntrySelected ───────────────────────────────────────────────
  // Fires when the user navigates to a lorebook entry.
  // Loads config + slough, pre-populates tempStorage for UI bindings, then
  // re-renders the panel with entry-specific content.
  api.v1.hooks.register('onLorebookEntrySelected', async (params) => {
    const entryId = (params['entryId'] as string | null) ?? null;
    if (!entryId) {
      await api.v1.ui.update([
        { type: 'lorebookPanel', id: SHED_PANEL_ID, content: buildEmptyPanel() },
      ]);
      return;
    }

    const entry = await api.v1.lorebook.entry(entryId);
    if (!entry) return;

    const config: ShedConfig =
      ((await api.v1.storyStorage.get(storageKeys.config(entryId))) as ShedConfig | null) ??
      { ...DEFAULT_CONFIG };

    // Pre-populate tempStorage so checkboxInput / multilineTextInput
    // reflect saved values when the panel mounts.
    await api.v1.tempStorage.set(storageKeys.enabled(entryId), config.enabled);
    await api.v1.tempStorage.set(storageKeys.pattern(entryId), config.pattern);

    const sloughText = (await api.v1.storyStorage.get(storageKeys.slough(entryId))) as string | null;

    await api.v1.ui.update([
      {
        type: 'lorebookPanel',
        id: SHED_PANEL_ID,
        content: buildShedPanel(entryId, entry.text, config, sloughText),
      },
    ]);
  });
})();
