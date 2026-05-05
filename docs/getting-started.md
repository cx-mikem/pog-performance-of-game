# Getting Started

## Install

phaser-pog is published to npm:

```sh
npm install phaser-pog
# or
pnpm add phaser-pog
# or
yarn add phaser-pog
```

It declares Phaser as a peer dependency (`>=3.60.0 <5.0.0`), so it does not bundle its own copy.

## Register the plugin

The simplest way is `registerPog`, which appends the plugin entry to your `Phaser.Types.Core.GameConfig`:

```ts
import Phaser from "phaser";
import { registerPog } from "phaser-pog";

const config = registerPog({
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  scene: [BootScene, WorldScene],
});

new Phaser.Game(config);
```

If you prefer to wire it up manually, the equivalent config is:

```ts
import { PogPlugin } from "phaser-pog";

new Phaser.Game({
  // ...
  plugins: {
    global: [
      { key: "POG", plugin: PogPlugin, start: true, mapping: "pog" },
    ],
  },
});
```

`mapping: "pog"` makes the plugin instance available on every scene as `this.pog`.

## Toggle the overlay

| Action            | Default                              |
| ----------------- | ------------------------------------ |
| Toggle overlay    | Press `` ` `` (backtick)             |
| Start visible     | Append `?pog=1` to the page URL      |
| Programmatic open | `pog.show()` / `pog.hide()` / `pog.toggle()` |

The hotkey is ignored while focus is in an `<input>`, `<textarea>`, or `<select>` element so it doesn't interfere with chat input.

## Where to go next

- [Options](./options.md) — change the hotkey, default tab, bucket size, etc.
- [Inspectors](./inspectors.md) — sample culling, register entities, attach sprites.
- [Network Adapters](./adapters.md) — wire up Colyseus, raw WebSocket, or a custom transport.
