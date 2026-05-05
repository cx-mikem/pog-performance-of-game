# Options

All options are passed via the plugin config's `data` field, or as the second argument to `new PogPlugin()`. They are defined by the [`PogOptions`](../PogPlugin.ts) interface.

```ts
plugins: {
  global: [{
    key: "POG",
    plugin: PogPlugin,
    start: true,
    mapping: "pog",
    data: {
      title: "MY GAME",
      hotkey: "`",
      urlFlag: "pog",
      startVisible: false,
      bucketMs: 100,
      messageBufferSize: 1024,
      eventBufferSize: 512,
      autoAttachScenes: true,
      defaultTab: "scenes",
    },
  }],
}
```

## Reference

| Option              | Type                                                              | Default     | Description                                                                                          |
| ------------------- | ----------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| `title`             | `string`                                                          | `"POG"`     | Header text in the overlay.                                                                          |
| `hotkey`            | `string`                                                          | `` "`" ``   | KeyboardEvent `key` value that toggles the overlay. Suppressed while focus is in form fields.        |
| `urlFlag`           | `string \| false`                                                 | `"pog"`     | Query-string key. If present and `=1`, overlay starts visible. Set to `false` to disable URL gating. |
| `startVisible`      | `boolean`                                                         | `false`     | Show the overlay immediately after init regardless of URL flag.                                      |
| `bucketMs`          | `number`                                                          | `100`       | Aggregation window for metrics, in ms. Smaller = more granular sparklines, more flush work.          |
| `messageBufferSize` | `number`                                                          | `1024`      | Capacity of the network message ring buffer.                                                         |
| `eventBufferSize`   | `number`                                                          | `512`       | Capacity of the network event ring buffer.                                                           |
| `autoAttachScenes`  | `boolean`                                                         | `true`      | When `true`, the `SceneInspector` automatically attaches to every scene that boots.                  |
| `defaultTab`        | `"global" \| "entities" \| "sprites" \| "scenes" \| "culling"`    | `"scenes"`  | Tab selected when the overlay first opens.                                                           |

## Tips

- **Picking a `bucketMs`.** The default of 100 ms (10 samples/sec) is a good balance. Drop to 50 or 33 for very twitchy frame-time investigations; raise to 250+ for hours-long sessions to keep memory flat.
- **Disabling auto-attach.** Set `autoAttachScenes: false` if you want to control which scenes get instrumented (e.g. skip the boot scene). Then call `pog.scenes.attach(scene)` from your `create()`.
- **Custom hotkey.** Any `KeyboardEvent.key` works. For non-printable keys use names like `"F12"`, `"Escape"`, `"Insert"`.
- **Disabling URL gating.** Pass `urlFlag: false` if you don't want `?pog=1` to open the overlay (e.g. on a public build).
