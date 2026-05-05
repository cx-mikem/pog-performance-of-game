# FAQ

## The overlay isn't showing up.

1. Confirm the plugin is registered as a **global** plugin (it is, if you used `registerPog`).
2. Try the URL flag: append `?pog=1` to the page URL.
3. Make sure you're not pressing `` ` `` while focus is in an `<input>`/`<textarea>`/`<select>` — the hotkey is intentionally suppressed there. Click the canvas first.
4. If you're using a non-US keyboard where `` ` `` is hard to reach, set a different `hotkey` in [options](./options.md).
5. Open the console: `(window as any).Phaser ? "Phaser found" : "no Phaser"`. The plugin needs Phaser ≥ 3.60 on the page.

## The `drawCalls` series is always 0.

You haven't called `instrumentDrawCalls(scene, tracked)`. See [Adapters → Draw-call instrumentation](./adapters.md#draw-call-instrumentation--instrumentdrawcalls). On some Phaser 4 builds even after instrumentation, the underlying APIs (`renderer.drawCount`, `renderNodes.setDebug`) may not be available — you'll see a `[POG] Draw-call instrumentation skipped` info log in that case.

## `spriteCount` looks higher than I expect.

`spriteCount` is the **total display-list size**, walked recursively through containers. A single tilemap or particle emitter can contribute many objects.

## `cullRate` shows 0 or N/A.

You aren't calling `pog.culling.sample(...)`. Culling is opt-in — phaser-pog can't know which of your entities are "visible" vs "processed" without you telling it. See [Inspectors → Culling](./inspectors.md#culling--pogculling).

## Will this slow down my game?

While the overlay is closed: a small fixed cost from the flush interval (default 100 ms) and per-frame samplers on each attached scene. Sub-millisecond on any modern device.

While the overlay is open: a few canvas redraws per flush. Still cheap, but if you're micro-benchmarking *close the overlay first*.

See [Production Builds](./production.md) for tree-shaking out the entire package.

## Does it work with Phaser 3.55 / 3.50 / older?

It might. The package is tested on 3.60+ and 4.x. Most APIs the inspectors use existed in earlier 3.x releases. File an issue if something breaks.

## Does it work outside the browser (Node, Electron renderer, etc.)?

The plugin uses `window`, `document`, and `localStorage`, so it requires a browser-like environment. Electron's renderer process is fine. Pure Node is not supported — there's no game loop to instrument.

## How do I record a custom metric?

```ts
pog.track("myMetric", value, { unit: "ms" });             // global
tracked.recordCustom("count/enemies", 12, "ent");          // per-scene
e.recordEvent("hit", { dmg: 12 });                         // per-entity event
```

See [Inspectors](./inspectors.md) for all the per-inspector knobs.

## How do I reset all metrics?

Call `game.plugins.removeGlobalPlugin("POG")` and re-register. There's no in-place reset right now; if you need one, file an issue with your use case.

## Can I host the overlay outside the Phaser canvas?

The overlay is mounted on `document.body` (draggable, position persisted). It doesn't care where Phaser is rendering, so it works fine alongside non-Phaser UI.
