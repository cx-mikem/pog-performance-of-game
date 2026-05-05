# Inspectors

The plugin exposes five inspectors. Each one is also surfaced as an overlay tab.

| Inspector              | On `pog.`     | Tab        | What it tracks                                                       |
| ---------------------- | ------------- | ---------- | -------------------------------------------------------------------- |
| `SceneInspector`       | `scenes`      | `scenes`   | Per-scene FPS, frameMs, sprite count, zoom, draw calls, GPU info     |
| `CullingInspector`     | `culling`     | `culling`  | Visible vs processed entity counts, cull rate, by-kind breakdown     |
| `EntityInspector`      | `entities`    | `entities` | Per-networked-entity reconcile/prediction error, server vs predicted |
| `SpriteInspector`      | `sprites`     | `sprites`  | Any Phaser GameObject — frame speed, visibility, position            |
| `MetricsRegistry`      | `globals`     | `global`   | Free-form named series (RTT, bytes, custom counters)                 |

## Scenes — `pog.scenes`

If `autoAttachScenes` is true (the default), every booted scene is attached automatically. To attach manually:

```ts
const tracked = pog.scenes.attach(myScene);
tracked.recordCustom("count/enemies", enemyCount, "ent");
tracked.recordDrawCalls(120);
```

For each attached scene the inspector samples on Phaser's `preupdate`:

- `frameMs` (ms) — per-frame delta
- `fps` (fps) — `game.loop.actualFps`
- `zoom` — main camera zoom
- `spriteCount` (obj) — total display-list size, sampled every ~250 ms
- `drawCalls` (calls) — populated when you call `instrumentDrawCalls(scene, tracked)` (see [Adapters](./adapters.md#draw-call-instrumentation))

The inspector also detects renderer type (`WebGL` / `Canvas`) and the unmasked GPU renderer string when WebGL is available.

## Culling — `pog.culling`

The killer single-player perf tool: how many things am I *seeing* vs how many am I *processing*?

```ts
pog.culling.sample("WorldScene", {
  visible: visibleEntities.length,
  processed: allEntities.length,
  byKind: {
    node:  { visible: nVis, processed: nAll },
    creep: { visible: cVis, processed: cAll },
  },
});
```

Recorded series per scene key: `visible`, `processed`, `diff`, `cullRate` (%), and optionally `total`. Each entry in `byKind` produces its own `visible` / `processed` / `diff` series for drill-down.

The card shows a stacked bar (visible-bright vs processed-dim), the cull-rate %, and per-kind rows. If the diff is small, your culling pass isn't earning its keep; if it's large, you're saving real work.

## Entities — `pog.entities`

For networked entities, register/unregister and feed in server + predicted state:

```ts
const e = pog.entities.register("player-42", { kind: "player" });

e.recordServerPosition(serverX, serverY);    // computes `speed`
e.recordPredictedPosition(predX, predY);     // computes `predictionError` vs last server pos
e.recordReconcile(errorPx);                  // logs `reconcile` series + reconcile event
e.recordBytes("in", 248);                    // adds to `bytesIn` (sum-aggregated)
e.recordEvent("hit", { dmg: 12 });           // arbitrary timestamped event
e.setMeta({ team: "blue" });

pog.entities.unregister("player-42");
```

Recorded series include `speed` (u/s), `predictionError` (px), `reconcile` (px, mean), and `bytesIn`/`bytesOut` (B/s, sum). Custom events ride along in a 256-entry ring buffer.

## Sprites — `pog.sprites`

Track any Phaser `GameObject` (sprites, containers, text, etc.):

```ts
const tracked = pog.sprites.attach(boss, {
  label: "boss",
  networked: true,
  entityId: "boss-1",
});
```

Each attached sprite is sampled on every flush tick. Series:

- `frameSpeed` (px/f) — Euclidean distance from the previous sample
- `visible` — 0 or 1

The inspector listens for the GameObject's `destroy` event and auto-detaches.

## Global metrics — `pog.globals` and `pog.track`

Free-form named series, useful for ambient stuff like RTT, bytes per channel, or any custom counter:

```ts
pog.track("rtt", rttMs, { unit: "ms" });
pog.track("bytesIn", payloadBytes, { unit: "B/s", aggregate: "sum" });
pog.markEvent("snapshot", { tick: 123 });
```

`aggregate` controls how multiple records inside a single `bucketMs` window are combined: `"last"` (default), `"mean"`, or `"sum"`.

`pog.recordMessage(dir, channel, bytes, payload?)` is a convenience that pushes to the message ring buffer **and** updates `bytesIn`/`bytesOut` and `msg/<channel>/<dir>` series in one call.
