# Production Builds

phaser-pog is a debug tool. By default it ships with no overlay DOM unless you call `show()` or open with `?pog=1` — but the plugin code, inspectors, and the `DomOverlay` module are still bundled.

For a production build, you almost always want to either remove the plugin entirely or gate it behind a build flag.

## Tree-shake it out (recommended)

The package is marked `"sideEffects": false`, so any import you never reach is dead-code-eliminated by Vite, esbuild, Rollup, webpack 5, etc. Wrap registration in a build-time conditional and the entire package drops out:

```ts
import Phaser from "phaser";

let config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  scene: [WorldScene],
};

if (import.meta.env.DEV) {
  const { registerPog } = await import("phaser-pog");
  config = registerPog(config);
}

new Phaser.Game(config);
```

Use a **dynamic** `import()` so the bundler can split (or drop) the chunk when `import.meta.env.DEV === false`. For webpack, equivalent gates work via `process.env.NODE_ENV !== "production"`.

## Keep it, but don't auto-show

If you want phaser-pog available in production for opt-in debugging (e.g. via a hidden hotkey or a query string), register normally and rely on the URL flag:

```ts
registerPog(config);    // hotkey + ?pog=1 still work, overlay stays hidden by default
```

You can lock the URL flag down by setting `urlFlag: false` in `data` and only exposing `show()` from a privileged debug menu.

## Overhead notes

When the overlay is **closed**:

- Inspectors still sample on each scene's `preupdate`.
- The flush loop runs every `bucketMs` (default 100 ms) and aggregates buckets across all registries.
- No DOM is created until `show()` is called — there is zero layout/paint cost.

When the overlay is **open**:

- A small fixed-position DOM tree is mounted with a few `<canvas>` sparklines.
- Per-tab redraws happen on flush; sparklines render only if their tab is active.

In practice this is well under a millisecond per frame for a few hundred entities. If you're benchmarking, close the overlay (or unmount the plugin) to ensure you're measuring the game and not the debugger.

## Removing the plugin at runtime

```ts
const game = new Phaser.Game(config);
game.plugins.removeGlobalPlugin("POG");   // also calls destroy()
```

`destroy()` removes the hotkey listener, clears the flush interval, and unmounts the overlay. Any references you held onto (`pog.scenes`, etc.) become inert.
