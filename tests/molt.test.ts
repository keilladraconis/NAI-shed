import { describe, it, expect, vi, beforeEach } from 'vitest';
import { molt } from '../src/molt.js';

// `api` is declared globally by external/script-types.d.ts and
// injected as a mock by tests/setup.ts at runtime.

beforeEach(() => {
  vi.clearAllMocks();
});

describe('molt()', () => {
  it('throws when the lorebook entry does not exist', async () => {
    vi.mocked(api.v1.lorebook.entry).mockResolvedValueOnce(null);
    await expect(molt('entry-1')).rejects.toThrow('Entry not found');
  });

  it('throws when no shed pattern is set', async () => {
    vi.mocked(api.v1.lorebook.entry).mockResolvedValueOnce({ id: 'entry-1', text: 'Original text.', displayName: 'Marcus' });
    vi.mocked(api.v1.storyStorage.get).mockResolvedValueOnce(null); // config → null
    await expect(molt('entry-1')).rejects.toThrow('No shed pattern defined');
  });

  it('throws when config exists but pattern is empty string', async () => {
    vi.mocked(api.v1.lorebook.entry).mockResolvedValueOnce({ id: 'entry-1', text: 'Original text.', displayName: 'Marcus' });
    vi.mocked(api.v1.storyStorage.get).mockResolvedValueOnce({ enabled: true, pattern: '', moltInterval: 5 });
    await expect(molt('entry-1')).rejects.toThrow('No shed pattern defined');
  });

  it('snapshots the slough on the first molt', async () => {
    vi.mocked(api.v1.lorebook.entry).mockResolvedValueOnce({ id: 'entry-1', text: 'Original text.', displayName: 'Marcus' });
    vi.mocked(api.v1.storyStorage.get)
      .mockResolvedValueOnce({ enabled: true, pattern: 'Turns to stone.', moltInterval: 5 }) // config
      .mockResolvedValueOnce(null); // slough → not yet saved

    vi.mocked(api.v1.generate).mockResolvedValueOnce({ choices: [{ text: 'Marcus is turning to stone.' }] });

    await molt('entry-1');

    expect(api.v1.storyStorage.set).toHaveBeenCalledWith(
      'shed-slough-entry-1',
      'Original text.',
    );
  });

  it('does not overwrite the slough when it already exists', async () => {
    vi.mocked(api.v1.lorebook.entry).mockResolvedValueOnce({ id: 'entry-1', text: 'Current evolved text.', displayName: 'Marcus' });
    vi.mocked(api.v1.storyStorage.get)
      .mockResolvedValueOnce({ enabled: true, pattern: 'Turns to stone.', moltInterval: 5 }) // config
      .mockResolvedValueOnce('Original text.'); // slough already saved

    vi.mocked(api.v1.generate).mockResolvedValueOnce({ choices: [{ text: 'Marcus is further turned to stone.' }] });

    await molt('entry-1');

    // storyStorage.set should NOT be called for the slough key.
    const setCalls = vi.mocked(api.v1.storyStorage.set).mock.calls;
    const sloughSetCalls = setCalls.filter(([key]) => key === 'shed-slough-entry-1');
    expect(sloughSetCalls).toHaveLength(0);
  });

  it('updates the lorebook entry and saves the skin on success', async () => {
    vi.mocked(api.v1.lorebook.entry).mockResolvedValueOnce({ id: 'entry-1', text: 'Original.', displayName: 'Marcus' });
    vi.mocked(api.v1.storyStorage.get)
      .mockResolvedValueOnce({ enabled: true, pattern: 'Becomes stone.', moltInterval: 5 })
      .mockResolvedValueOnce(null); // no slough yet

    const newSkin = 'Marcus is now made of granite.';
    vi.mocked(api.v1.generate).mockResolvedValueOnce({ choices: [{ text: newSkin }] });

    await molt('entry-1');

    expect(api.v1.lorebook.updateEntry).toHaveBeenCalledWith('entry-1', { text: newSkin });
    expect(api.v1.historyStorage.set).toHaveBeenCalledWith('shed-skin-entry-1', newSkin);
  });

  it('throws when generation returns an empty result', async () => {
    vi.mocked(api.v1.lorebook.entry).mockResolvedValueOnce({ id: 'entry-1', text: 'Original.', displayName: 'Marcus' });
    vi.mocked(api.v1.storyStorage.get)
      .mockResolvedValueOnce({ enabled: true, pattern: 'Becomes stone.', moltInterval: 5 })
      .mockResolvedValueOnce(null);

    vi.mocked(api.v1.generate).mockResolvedValueOnce({ choices: [{ text: '' }] });

    await expect(molt('entry-1')).rejects.toThrow('Generation returned empty or too-short result');
  });

  it('throws when generation returns a too-short result', async () => {
    vi.mocked(api.v1.lorebook.entry).mockResolvedValueOnce({ id: 'entry-1', text: 'Original.', displayName: 'Marcus' });
    vi.mocked(api.v1.storyStorage.get)
      .mockResolvedValueOnce({ enabled: true, pattern: 'Becomes stone.', moltInterval: 5 })
      .mockResolvedValueOnce(null);

    vi.mocked(api.v1.generate).mockResolvedValueOnce({ choices: [{ text: 'Short.' }] });

    await expect(molt('entry-1')).rejects.toThrow('Generation returned empty or too-short result');
  });

  it('includes slough, current skin, pattern, and story context in the prompt', async () => {
    vi.mocked(api.v1.lorebook.entry).mockResolvedValueOnce({ id: 'entry-1', text: 'Current skin.', displayName: 'Marcus' });
    vi.mocked(api.v1.storyStorage.get)
      .mockResolvedValueOnce({ enabled: true, pattern: 'The pattern.', moltInterval: 5 })
      .mockResolvedValueOnce('The slough.'); // existing slough

    vi.mocked(api.v1.document.scan).mockResolvedValueOnce([
      { id: 's1', text: 'Para 1.' },
      { id: 's2', text: 'Para 2.' },
    ]);

    vi.mocked(api.v1.generate).mockResolvedValueOnce({ choices: [{ text: 'New evolved entry for Marcus.' }] });

    await molt('entry-1');

    const generateCall = vi.mocked(api.v1.generate).mock.calls[0];
    const messages = generateCall[0];
    const userMessage = messages.find((m) => m.role === 'user')!;

    expect(userMessage.content).toContain('The slough.');
    expect(userMessage.content).toContain('Current skin.');
    expect(userMessage.content).toContain('The pattern.');
    expect(userMessage.content).toContain('Para 1.');
    expect(userMessage.content).toContain('Para 2.');
  });

  it('uses config defaults when global config values are undefined', async () => {
    vi.mocked(api.v1.lorebook.entry).mockResolvedValueOnce({ id: 'entry-1', text: 'Original.', displayName: 'Marcus' });
    vi.mocked(api.v1.storyStorage.get)
      .mockResolvedValueOnce({ enabled: true, pattern: 'Turns to stone.', moltInterval: 5 })
      .mockResolvedValueOnce(null);

    vi.mocked(api.v1.config.get).mockResolvedValue(undefined); // all config undefined → use defaults
    vi.mocked(api.v1.generate).mockResolvedValueOnce({ choices: [{ text: 'Marcus is now made of granite.' }] });

    await molt('entry-1');

    const generateCall = vi.mocked(api.v1.generate).mock.calls[0];
    const params = generateCall[1];
    expect(params.temperature).toBe(0.35);
    expect(params.max_tokens).toBe(500);
    expect(params.model).toBe('glm-4-6');
  });

  it('respects context_paragraphs config by slicing document sections', async () => {
    vi.mocked(api.v1.lorebook.entry).mockResolvedValueOnce({ id: 'entry-1', text: 'Original.', displayName: 'Marcus' });
    vi.mocked(api.v1.storyStorage.get)
      .mockResolvedValueOnce({ enabled: true, pattern: 'Pattern.', moltInterval: 5 })
      .mockResolvedValueOnce(null);

    // Override context_paragraphs to 2
    vi.mocked(api.v1.config.get).mockImplementation((key) => {
      if (key === 'context_paragraphs') return Promise.resolve(2);
      return Promise.resolve(undefined);
    });

    vi.mocked(api.v1.document.scan).mockResolvedValueOnce([
      { id: 's0', text: 'Old para.' },
      { id: 's1', text: 'Para A.' },
      { id: 's2', text: 'Para B.' },
    ]);

    vi.mocked(api.v1.generate).mockResolvedValueOnce({ choices: [{ text: 'Marcus is now made of granite.' }] });

    await molt('entry-1');

    const generateCall = vi.mocked(api.v1.generate).mock.calls[0];
    const userContent: string = generateCall[0][1].content;

    // 'Old para.' should be excluded (only last 2 sections)
    expect(userContent).not.toContain('Old para.');
    expect(userContent).toContain('Para A.');
    expect(userContent).toContain('Para B.');
  });
});
