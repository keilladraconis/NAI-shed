import { vi } from 'vitest';

// Minimal mock for the NovelAI Scripting API global.
// Expand this as your script grows — add mocks for the APIs you use.
// See `external/script-types.d.ts` for the full API surface.

const apiMock = {
  v1: {
    log: vi.fn(),
    error: vi.fn(),
    uuid: vi.fn(() => 'mock-uuid-' + Math.random().toString(36).slice(2, 9)),
    createCancellationSignal: vi.fn(() => ({
      cancelled: false,
      cancel: vi.fn(),
      dispose: vi.fn(),
    })),
    hooks: {
      register: vi.fn(),
    },
    timers: {
      setTimeout: vi.fn((cb: () => void, delay: number) =>
        Promise.resolve(globalThis.setTimeout(cb, delay)) as unknown as ReturnType<typeof setTimeout>,
      ),
      clearTimeout: vi.fn((id: ReturnType<typeof setTimeout>) => globalThis.clearTimeout(id)),
      sleep: vi.fn((ms: number) => new Promise((resolve) => globalThis.setTimeout(resolve, ms))),
    },
    config: {
      get: vi.fn().mockResolvedValue(undefined),
    },
    storage: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      setIfAbsent: vi.fn().mockResolvedValue(undefined),
    },
    storyStorage: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      setIfAbsent: vi.fn().mockResolvedValue(undefined),
    },
    tempStorage: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
    },
    generate: vi.fn().mockResolvedValue({ choices: [{ text: 'mock response' }] }),
    permissions: {
      request: vi.fn().mockResolvedValue(true),
    },
    document: {
      scan: vi.fn().mockResolvedValue([]),
      sectionIds: vi.fn().mockResolvedValue([]),
      insertParagraphAfter: vi.fn().mockResolvedValue(undefined),
      removeParagraph: vi.fn().mockResolvedValue(undefined),
    },
    ui: {
      register: vi.fn().mockResolvedValue(undefined),
      updateParts: vi.fn().mockResolvedValue(undefined),
    },
    memory: {
      get: vi.fn().mockResolvedValue(''),
      set: vi.fn().mockResolvedValue(undefined),
    },
    an: {
      get: vi.fn().mockResolvedValue(''),
      set: vi.fn().mockResolvedValue(undefined),
    },
    lorebook: {
      entries: vi.fn().mockResolvedValue([]),
      createEntry: vi.fn().mockResolvedValue(undefined),
      updateEntry: vi.fn().mockResolvedValue(undefined),
      removeEntry: vi.fn().mockResolvedValue(undefined),
    },
  },
};

(globalThis as unknown as { api: typeof apiMock }).api = apiMock;
