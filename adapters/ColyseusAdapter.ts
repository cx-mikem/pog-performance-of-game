import type { PogPlugin } from "../PogPlugin";

interface ColyseusRoomLike {
  onMessage: (type: any, cb: (msg: unknown) => void) => void;
  send: (type: any, message?: unknown) => void;
  onLeave: (cb: () => void) => void;
  connection?: { transport?: { ws?: WebSocket; webSocket?: WebSocket } };
  state?: unknown;
}

export interface ColyseusAdapterOptions {
  trackPing?: boolean;
}

const sizeOf = (data: unknown): number => {
  if (data == null) return 0;
  if (typeof data === "string") return data.length;
  try { return JSON.stringify(data).length; } catch { return 0; }
};

export function attachColyseus(
  room: ColyseusRoomLike,
  debug: PogPlugin,
  _opts: ColyseusAdapterOptions = {},
): () => void {
  const cleanups: Array<() => void> = [];

  const origSend = room.send.bind(room);
  (room as any).send = (type: any, message?: unknown) => {
    debug.recordMessage("out", `${type}`, sizeOf(message), message);
    return origSend(type, message);
  };
  cleanups.push(() => { (room as any).send = origSend; });

  (room.onMessage as (type: any, cb: (...args: any[]) => void) => void)(
    "*",
    (type: any, msg: unknown) => {
      debug.recordMessage("in", `${type}`, sizeOf(msg), msg);
    },
  );

  const transport = (room.connection as any)?.transport;
  const ws: WebSocket | undefined = transport?.ws ?? transport?.webSocket;
  if (ws) {
    const onMsg = (e: MessageEvent) => {
      const len = e.data instanceof ArrayBuffer ? e.data.byteLength
        : ArrayBuffer.isView(e.data) ? (e.data as ArrayBufferView).byteLength
        : typeof e.data === "string" ? e.data.length : 0;
      debug.trackBytes("in", len);
    };
    ws.addEventListener("message", onMsg);
    cleanups.push(() => ws.removeEventListener("message", onMsg));
  }

  room.onLeave(() => debug.markEvent("colyseus:leave"));

  return () => { cleanups.forEach((fn) => { try { fn(); } catch { /* swallow */ } }); };
}
