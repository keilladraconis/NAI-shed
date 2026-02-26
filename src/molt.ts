import { storageKeys, DEFAULT_SYSTEM_PROMPT } from './constants.js';
import type { ShedConfig } from './types.js';

/**
 * Perform a single molt: ask the AI to rewrite the lorebook entry to reflect
 * current story state, guided by the entry's Shed Pattern.
 *
 * Throws on any unrecoverable error so callers can surface it as a toast.
 */
export async function molt(entryId: string): Promise<void> {
  const entry = await api.v1.lorebook.entry(entryId);
  if (!entry) throw new Error('Entry not found');

  const config = await api.v1.storyStorage.get(storageKeys.config(entryId)) as ShedConfig | null;
  if (!config?.pattern) throw new Error('No shed pattern defined');

  // Snapshot the original text (slough) on first molt — never overwrite after that.
  const existingSlough = await api.v1.storyStorage.get(storageKeys.slough(entryId)) as string | null;
  if (existingSlough == null) {
    await api.v1.storyStorage.set(storageKeys.slough(entryId), entry.text);
  }
  const slough = existingSlough ?? entry.text;

  // Read global config with sensible defaults.
  const systemPrompt = (await api.v1.config.get('system_prompt') as string | null) ?? DEFAULT_SYSTEM_PROMPT;
  const temperature  = (await api.v1.config.get('temperature')  as number | null) ?? 0.35;
  const maxTokens    = (await api.v1.config.get('max_tokens')   as number | null) ?? 500;
  const contextN     = (await api.v1.config.get('context_paragraphs') as number | null) ?? 20;
  const model        = (await api.v1.config.get('molt_model')   as string | null) ?? 'glm-4-6';

  // Gather recent story paragraphs.
  const sections   = await api.v1.document.scan(() => {});
  const recentText = sections
    .slice(-contextN)
    .map((s) => s.text)
    .join('\n');

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    {
      role: 'user' as const,
      content: [
        'SLOUGH (original entry, for reference):',
        slough,
        '',
        'CURRENT SKIN (entry as it stands now):',
        entry.text,
        '',
        'SHED PATTERN (author\'s intent for how this should evolve):',
        config.pattern,
        '',
        'RECENT STORY:',
        recentText,
        '',
        'Write the updated lorebook entry:',
      ].join('\n'),
    },
  ];

  const response = await api.v1.generate(messages, {
    model,
    max_tokens: maxTokens,
    temperature,
  });

  const newSkin = response.choices[0]?.text?.trim();
  if (!newSkin || newSkin.length < 10) {
    throw new Error('Generation returned empty or too-short result');
  }

  // Persist the new skin.
  await api.v1.lorebook.updateEntry(entryId, { text: newSkin });
  await api.v1.historyStorage.set(storageKeys.skin(entryId), newSkin);

  const name = entry.displayName ?? 'Entry';
  api.v1.log(`Shed: ${name} has shed (${newSkin.length} chars)`);
}
