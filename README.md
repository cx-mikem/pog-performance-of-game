# phaser-pog

**POG** — *Performance Of Game*. A live debug overlay for Phaser games — multiplayer or single-player, **Phaser 3.60+ and Phaser 4.x**. Drop it in, press `` ` `` (backtick), and get sparklines for FPS, frame time, sprite counts, draw calls, culling efficiency, and (optionally) network telemetry. Drag the overlay anywhere; position is remembered.

Works **standalone** (single-player) for general perf debugging, and **with any networking** (Colyseus, raw WebSocket, Geckos.io, Socket.IO, custom) — the network adapters are opt-in.

## Compatibility

| Phaser | Status | Notes |
| ------ | ------ | ----- |
| 4.x    | ✅     | Auto-detects version. Draw-call instrumentation uses `renderer.drawCount` / `renderer.renderNodes.setDebug` instead of patching `gl` (per [v4 migration guidance](https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/MIGRATION-GUIDE.md)). |
| 3.60+  | ✅     | Original target. Patches `gl.drawArrays / gl.drawElements` for draw-call counts. |
| 3.0–3.59 | ⚠️   | Not tested. Most APIs should still work; file an issue if not. |

## Install (in-tree)

This lives at `client/src/plugins/phaser-pog/`:

```ts
import {
  PogPlugin,
  registerPog,
} from "@/plugins/phaser-pog";
```

## Quick start

```ts
import Phaser from "phaser";
import { registerPog } from "@/plugins/phaser-pog";

const config = registerPog({
  type: Phaser.AUTO,
  scene: [MyScene],
  // ...
});

new Phaser.Game(config);
```

Press `` ` `` to toggle. Open with `?pog=1` in the URL to start visible.

> 📚 Full documentation lives in [`docs/`](./docs/README.md): [getting started](./docs/getting-started.md), [options](./docs/options.md), [inspectors](./docs/inspectors.md), [network adapters](./docs/adapters.md), [session export](./docs/session-export.md), [production builds](./docs/production.md), [architecture](./docs/architecture.md), [FAQ](./docs/faq.md).

## Standalone (single-player) mode

Out of the box you get per-scene FPS, frame time, sprite count, zoom, GPU renderer, and draw calls (when instrumented). No networking required — every adapter is opt-in.

```ts
const pog = game.plugins.get("POG") as PogPlugin;

// Optional: instrument draw calls (patches WebGL drawArrays/drawElements)
import { instrumentDrawCalls } from "@/plugins/phaser-pog";
const tracked = pog.scenes.attach(myScene);
instrumentDrawCalls(myScene, tracked);

// Custom counts
tracked.recordCustom("count/enemies", enemyCount, "ent");
```

## Concepts

The overlay has five tabs, each backed by a first-class telemetry object:

| Tab        | Inspector            | What it tracks                                           |
| ---------- | -------------------- | -------------------------------------------------------- |
| `scenes`   | `SceneInspector`     | Per-scene FPS, frame ms, sprite count, zoom, draw calls, GPU info |
| `culling`  | `CullingInspector`   | Visible vs processed entity counts, cull rate, by-kind breakdown |
| `entities` | `EntityInspector`    | Per-networked-entity reconcile error, prediction error, server vs predicted pos |
| `sprites`  | `SpriteInspector`    | Any Phaser GameObject — frame speed, visibility, position |
| `global`   | `MetricsRegistry`    | Free-form named series (RTT, bytes, custom counters)     |

Click any row to drill into stats (last/mean/min/max/p95) and a larger sparkline.

## Culling widget

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

The card shows a stacked bar (visible-bright vs processed-dim), the cull-rate %, and per-kind rows. If the diff is small your culling pass isn't earning its keep; if it's large you're saving real work.

## Network telemetry (optional)

### Entities — prediction & reconciliation

```ts
const e = pog.entities.register("player-42", { kind: "player" });
e.recordServerPosition(serverX, serverY);
e.recordPredictedPosition(predX, predY);
e.recordReconcile(errorPx);
pog.entities.unregister("player-42");
```

### Adapters

**Colyseus:**
```ts
import { attachColyseus } from "@/plugins/phaser-pog";
const detach = attachColyseus(room, pog);
```

**Raw WebSocket:**
```ts
import { attachWebSocket } from "@/plugins/phaser-pog";
const detach = attachWebSocket(ws, pog, {
  channelOf: (data) => typeof data === "string" ? JSON.parse(data).type : "binary",
});
```

**Custom transport** — call `pog.recordMessage(dir, channel, bytes, payload)` from your send/receive paths.

### RTT / global metrics

```ts
pog.track("rtt", rttMs, { unit: "ms" });
pog.markEvent("snapshot", { tick: 123 });
```

## Sprites

```ts
pog.sprites.attach(mySprite, { label: "boss", networked: true, entityId: "boss-1" });
```

Auto-detaches when the sprite is destroyed.

## Options

```ts
plugins: {
  global: [{
    key: "POG",
    plugin: PogPlugin,
    start: true,
    mapping: "pog",
    data: {
      title: "MY GAME",             // overlay header text
      hotkey: "`",                  // toggle key
      urlFlag: "pog",               // ?pog=1 starts visible (false to disable)
      startVisible: false,
      bucketMs: 100,                // metric aggregation window
      autoAttachScenes: true,       // attach SceneInspector on every scene boot
      defaultTab: "scenes",         // initial overlay tab
    },
  }],
}
```

## Session export

```ts
const session = pog.exportSession();   // all metrics + events as JSON
pog.downloadSession();                  // triggers browser download
```

The "export" button in the overlay does the same — useful for attaching to bug reports.

## Production builds

The overlay is gated behind `show()`. Tree-shake it out in prod:

```ts
if (import.meta.env.DEV) {
  registerPog(config);
}
```

## License

MIT
