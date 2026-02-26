(async () => {
  // ─── Your script entry point ───────────────────────────────────────────────
  //
  // The `api` global is always available — do not import it.
  // Consult `external/script-types.d.ts` for the full API reference.
  //
  // QuickJS web worker constraints (no DOM, no Node.js):
  //   - Use api.v1.log() and api.v1.error() instead of console.*
  //   - Use api.v1.timers.setTimeout() instead of setTimeout()
  //   - Use api.v1.uuid() for ID generation

  api.v1.log('Script loaded.');

  // ─── Hooks ─────────────────────────────────────────────────────────────────
  // Register event handlers for the generation lifecycle.

  // api.v1.hooks.register('onGenerationEnd', async (params) => {
  //   api.v1.log('Generation complete:', params.model);
  // });

  // ─── UI ────────────────────────────────────────────────────────────────────
  // Register panels, buttons, sliders, etc.

  // await api.v1.ui.register([
  //   {
  //     type: 'scriptPanel',
  //     id: 'my-panel',
  //     name: 'My Script',
  //     content: [
  //       {
  //         type: 'button',
  //         text: 'Click me',
  //         callback: async () => { api.v1.log('Button clicked!'); },
  //       },
  //     ],
  //   },
  // ]);
})();
