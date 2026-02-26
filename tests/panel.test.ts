import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildShedPanel, buildEmptyPanel } from '../src/panel.js';
import type { ShedConfig } from '../src/types.js';

// `api` is declared globally by external/script-types.d.ts and
// injected as a mock by tests/setup.ts at runtime.

beforeEach(() => {
  vi.clearAllMocks();
});

const baseConfig: ShedConfig = { enabled: false, pattern: '', moltInterval: 5 };

describe('buildEmptyPanel()', () => {
  it('returns a non-empty array', () => {
    const parts = buildEmptyPanel();
    expect(parts.length).toBeGreaterThan(0);
  });

  it('includes the waiting message', () => {
    const parts = buildEmptyPanel() as Array<{ type: string; text?: string }>;
    const textPart = parts.find((p) => p.type === 'text');
    expect(textPart?.text).toContain('Slough is waiting');
  });
});

describe('buildShedPanel()', () => {
  it('returns an array with at least 4 parts', () => {
    const parts = buildShedPanel('e1', 'Entry text.', baseConfig, null);
    expect(parts.length).toBeGreaterThanOrEqual(4);
  });

  it('includes a checkboxInput for the Shedding toggle', () => {
    const parts = buildShedPanel('e1', 'Entry text.', baseConfig, null) as Array<Record<string, unknown>>;
    const checkbox = parts.find((p) => p['type'] === 'checkboxInput');
    expect(checkbox).toBeDefined();
    expect(checkbox?.['storageKey']).toBe('shed-enabled-e1');
  });

  it('includes a multilineTextInput for the Shed Pattern', () => {
    const parts = buildShedPanel('e1', 'Entry text.', baseConfig, null) as Array<Record<string, unknown>>;
    const input = parts.find((p) => p['type'] === 'multilineTextInput');
    expect(input).toBeDefined();
    expect(input?.['storageKey']).toBe('shed-pattern-e1');
  });

  it('includes a row with Shed Now and Unshed buttons', () => {
    const parts = buildShedPanel('e1', 'Entry text.', baseConfig, null) as Array<Record<string, unknown>>;
    const row = parts.find((p) => p['type'] === 'row') as { content: Array<Record<string, unknown>> } | undefined;
    expect(row).toBeDefined();
    const buttons = row!.content.filter((p) => p['type'] === 'button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]?.['text']).toContain('Shed Now');
    expect(buttons[1]?.['text']).toContain('Unshed');
  });

  it('includes a collapsibleSection for the slough', () => {
    const parts = buildShedPanel('e1', 'Entry text.', baseConfig, null) as Array<Record<string, unknown>>;
    const section = parts.find((p) => p['type'] === 'collapsibleSection');
    expect(section).toBeDefined();
    expect(section?.['title']).toContain('Slough');
  });

  it('shows slough text when one has been saved', () => {
    const parts = buildShedPanel('e1', 'Entry text.', baseConfig, 'The original text.') as Array<
      Record<string, unknown>
    >;
    const section = parts.find((p) => p['type'] === 'collapsibleSection') as
      | { content: Array<Record<string, unknown>> }
      | undefined;
    const textPart = section?.content[0];
    expect(textPart?.['text']).toBe('The original text.');
  });

  it('shows waiting message in slough section when no slough is saved', () => {
    const parts = buildShedPanel('e1', 'Entry text.', baseConfig, null) as Array<Record<string, unknown>>;
    const section = parts.find((p) => p['type'] === 'collapsibleSection') as
      | { content: Array<Record<string, unknown>> }
      | undefined;
    const textPart = section?.content[0];
    expect(textPart?.['text']).toContain('waiting');
  });

  it('uses the entryId in all storage keys', () => {
    const parts = buildShedPanel('my-entry', 'Entry.', baseConfig, null) as Array<Record<string, unknown>>;
    const checkbox = parts.find((p) => p['type'] === 'checkboxInput');
    const input = parts.find((p) => p['type'] === 'multilineTextInput');
    expect(checkbox?.['storageKey']).toContain('my-entry');
    expect(input?.['storageKey']).toContain('my-entry');
  });

  describe('toggle onChange — turning Shedding ON', () => {
    it('snapshots the slough when none is saved', async () => {
      vi.mocked(api.v1.storyStorage.get).mockResolvedValueOnce(null); // no existing slough
      vi.mocked(api.v1.historyStorage.get).mockResolvedValueOnce(null); // no skin

      const parts = buildShedPanel('e1', 'Entry text.', { ...baseConfig }, null) as Array<
        Record<string, unknown>
      >;
      const checkbox = parts.find((p) => p['type'] === 'checkboxInput') as
        | { onChange: (v: boolean) => Promise<void> }
        | undefined;

      await checkbox!.onChange(true);

      expect(api.v1.storyStorage.set).toHaveBeenCalledWith('shed-slough-e1', 'Entry text.');
    });

    it('restores the last skin when one exists', async () => {
      vi.mocked(api.v1.storyStorage.get).mockResolvedValueOnce('Existing slough.'); // slough already saved
      vi.mocked(api.v1.historyStorage.get).mockResolvedValueOnce('Last evolved skin.');

      const parts = buildShedPanel('e1', 'Entry text.', { ...baseConfig }, null) as Array<
        Record<string, unknown>
      >;
      const checkbox = parts.find((p) => p['type'] === 'checkboxInput') as
        | { onChange: (v: boolean) => Promise<void> }
        | undefined;

      await checkbox!.onChange(true);

      expect(api.v1.lorebook.updateEntry).toHaveBeenCalledWith('e1', { text: 'Last evolved skin.' });
    });
  });

  describe('toggle onChange — turning Shedding OFF', () => {
    it('restores the slough to the lorebook', async () => {
      vi.mocked(api.v1.storyStorage.get).mockResolvedValueOnce('The original slough.');

      const parts = buildShedPanel('e1', 'Entry text.', { ...baseConfig, enabled: true }, null) as Array<
        Record<string, unknown>
      >;
      const checkbox = parts.find((p) => p['type'] === 'checkboxInput') as
        | { onChange: (v: boolean) => Promise<void> }
        | undefined;

      await checkbox!.onChange(false);

      expect(api.v1.lorebook.updateEntry).toHaveBeenCalledWith('e1', { text: 'The original slough.' });
    });
  });

  describe('Unshed button', () => {
    it('restores slough, clears skin, and turns off shedding', async () => {
      vi.mocked(api.v1.storyStorage.get).mockResolvedValueOnce('The original slough.');

      const config: ShedConfig = { enabled: true, pattern: 'Becomes stone.', moltInterval: 5 };
      const parts = buildShedPanel('e1', 'Entry text.', config, 'The original slough.') as Array<
        Record<string, unknown>
      >;
      const row = parts.find((p) => p['type'] === 'row') as { content: Array<Record<string, unknown>> };
      const unshedBtn = row.content.find((p) => p['text'] === '↩ Unshed') as
        | { callback: () => Promise<void> }
        | undefined;

      await unshedBtn!.callback();

      expect(api.v1.lorebook.updateEntry).toHaveBeenCalledWith('e1', { text: 'The original slough.' });
      expect(api.v1.historyStorage.remove).toHaveBeenCalledWith('shed-skin-e1');
      expect(api.v1.storyStorage.set).toHaveBeenCalledWith(
        'shed-config-e1',
        expect.objectContaining({ enabled: false }),
      );
    });

    it('toasts a warning when no slough is saved', async () => {
      vi.mocked(api.v1.storyStorage.get).mockResolvedValueOnce(null); // no slough

      const parts = buildShedPanel('e1', 'Entry text.', baseConfig, null) as Array<Record<string, unknown>>;
      const row = parts.find((p) => p['type'] === 'row') as { content: Array<Record<string, unknown>> };
      const unshedBtn = row.content.find((p) => p['text'] === '↩ Unshed') as
        | { callback: () => Promise<void> }
        | undefined;

      await unshedBtn!.callback();

      expect(api.v1.ui.toast).toHaveBeenCalledWith(
        expect.stringContaining('nothing to revert'),
        expect.objectContaining({ type: 'warning' }),
      );
      expect(api.v1.lorebook.updateEntry).not.toHaveBeenCalled();
    });
  });
});
