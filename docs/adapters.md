# Network Adapters

Adapters are tiny opt-in helpers that wire a transport into the [`PogPlugin`](../PogPlugin.ts). Each one returns a `detach` function — call it on disconnect or scene shutdown to remove listeners and restore patched methods.

phaser-pog itself is **transport-agnostic**: every adapter ultimately funnels into `pog.recordMessage(dir, channel, bytes, payload?)` and `pog.markEvent(type, data?)`. If you have an unusual transport, write your own adapter — the existing ones are 30–50 lines.

## Colyseus — `attachColyseus`

```ts
import { attachColyseus } from "phaser-pog";

const detach = attachColyseus(room, pog);
// ... later
detach();
```

What it does:

- Wraps `room.send(type, message)` to record outbound messages on a channel matching the message type.
- Subscribes to `room.onMessage("*")` for inbound messages, recording channel + size + payload.
- If the room exposes its underlying `WebSocket`, also tallies wire-level inbound bytes (catches binary frames that aren't surfaced through `onMessage`).
- Marks a `colyseus:leave` event on disconnect.

## Raw WebSocket — `attachWebSocket`

```ts
import { attachWebSocket } from "phaser-pog";

const detach = attachWebSocket(ws, pog, {
  channelOf: (data) =>
    typeof data === "string" ? JSON.parse(data).type : "binary",
});
```

What it does:

- Wraps `ws.send` to record outbound messages on the `"ws"` channel (or whatever you return from `channelOf`).
- Listens for `message`, `open`, `close`, and `error` events. `open`/`close`/`error` become `markEvent` entries.
- Computes byte counts for `ArrayBuffer`, typed-array views, `Blob`, and string payloads.

The `channelOf` option lets you bucket messages by your application-level type. If omitted, everything lands in the single `"ws"` channel.

## Custom transports

For Geckos.io, Socket.IO, BroadcastChannel, WebTransport, or anything else — call into the plugin directly from your send/receive paths:

```ts
socket.on("snapshot", (msg) => {
  pog.recordMessage("in", "snapshot", msg.byteLength, msg);
});

const origSend = socket.emit.bind(socket);
socket.emit = (event: string, payload: unknown) => {
  pog.recordMessage("out", event, JSON.stringify(payload).length, payload);
  return origSend(event, payload);
};

pog.track("rtt", measuredPingMs, { unit: "ms" });
pog.markEvent("snapshot", { tick: 123 });
```

Per-entity ingress/egress can be attributed via the entity inspector — see [Inspectors](./inspectors.md#entities--pogentities).

## Draw-call instrumentation — `instrumentDrawCalls`

Not a network adapter, but lives next to them in `adapters/`. It populates the `drawCalls` series for a tracked scene.

```ts
import { instrumentDrawCalls } from "phaser-pog";

const tracked = pog.scenes.attach(myScene);
const detach = instrumentDrawCalls(myScene, tracked);
```

Behaviour by Phaser version:

- **Phaser 4.x**: prefers `renderer.drawCount`; falls back to `renderer.renderNodes.setDebug(true)` and counts active render nodes per frame. If neither is available, logs a one-time `console.info` and continues — FPS, frameMs, sprite count, and culling all still work.
- **Phaser 3 (WebGL)**: monkey-patches `gl.drawArrays` and `gl.drawElements`, increments a counter, samples and resets on `postupdate`.
- **Phaser 3 (Canvas / fallback)**: reads `renderer.drawCount` or `renderer.pipelines.flushCount` if exposed.

Call the returned function to fully restore the renderer.
