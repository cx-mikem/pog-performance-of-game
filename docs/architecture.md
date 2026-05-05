# Architecture

A short tour of how the package is laid out, for contributors and the curious.

```
pog-performance-of-game/
├── PogPlugin.ts           # Phaser BasePlugin: lifecycle, hotkey, flush loop, public API
├── index.ts               # Public exports + registerPog() helper
├── core/
│   ├── MetricsRegistry.ts # Named series with bucketed aggregation
│   ├── RingBuffer.ts      # Fixed-capacity circular buffer
│   └── Telemetry.ts       # Shared types: Sample, NetEvent, MessageRecord, SessionExport
├── inspectors/
│   ├── SceneInspector.ts
│   ├── CullingInspector.ts
│   ├── EntityInspector.ts
│   └── SpriteInspector.ts
├── adapters/
│   ├── ColyseusAdapter.ts
│   ├── WebSocketAdapter.ts
│   └── DrawCallInstrument.ts
└── overlay/
    ├── DomOverlay.ts      # Tabs, drag, position persistence, render loop
    └── Sparkline.ts       # Canvas-based mini chart
```

## Data flow

```
                       ┌────────────────────┐
   game / app code ──► │  inspectors + API  │ ──► MetricsRegistry / RingBuffer
                       └────────────────────┘                │
                                                             ▼
                                                    flush loop (bucketMs)
                                                             │
                                                             ▼
                                                       DomOverlay
                                                       (when visible)
```

Every tick of the flush loop closes any open buckets and pushes their aggregated `Sample` onto the per-series ring buffer. The overlay reads from those buffers; nothing inside the overlay holds long-lived state of its own.

## Lifecycle

`PogPlugin` is a `Phaser.Plugins.BasePlugin`, registered as a *global* plugin. The relevant hooks:

| Phase     | What happens                                                                                    |
| --------- | ----------------------------------------------------------------------------------------------- |
| `init`    | Install hotkey, install flush interval, optionally auto-attach the `SceneInspector` to all scenes, optionally show overlay if `startVisible` or URL flag |
| `start`   | No-op                                                                                           |
| `destroy` | Remove hotkey, clear interval, unmount overlay, call `super.destroy()`                          |

Auto-attach uses `Phaser.Core.Events.READY` to catch the initial scene set and `Phaser.Scenes.Events.ADDED_TO_SCENE` to pick up scenes added later.

## Memory model

- **`MetricsRegistry`** keeps a fixed number of `Sample`s per series in a ring buffer. The number is currently 600.
- **`RingBuffer`** is the workhorse: fixed `capacity`, `push` is O(1), oldest entries are overwritten.
- **Per-entity / per-scene / per-culling state** lives in `Map`s keyed by id / scene key. Sizes grow with your entity count, then stop.

This means a 30-minute session with 200 active entities looks the same memory-wise as a 12-hour session with 200 active entities.

## Overlay

`DomOverlay` is hand-rolled DOM (no framework). It owns:

- A draggable container, position persisted to `localStorage`.
- One tab list, one detail pane.
- `Sparkline` instances reused across rerenders.

Each tab subscribes to its inspector's `subscribe()` callback and re-renders on change. Sparklines repaint to `<canvas>`. There's deliberately no virtual DOM — the entire overlay is a few hundred lines.
