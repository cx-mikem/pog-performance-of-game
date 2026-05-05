import type { PogPlugin } from "../PogPlugin";

export interface WebSocketAdapterOptions {
  channelOf?: (data: ArrayBuffer | string) => string;
}

export function attachWebSocket(
  ws: WebSocket,
  debug: PogPlugin,
  opts: WebSocketAdapterOptions = {},
): () => void {
  const channelOf = opts.channelOf ?? (() => "ws");
  const sizeOf = (data: any): number => {
    if (data instanceof ArrayBuffer) return data.byteLength;
    if (ArrayBuffer.isView(data)) return data.byteLength;
    if (typeof data === "string") return data.length;
    if (data instanceof Blob) return data.size;
    return 0;
  };

  const onMessage = (e: MessageEvent) => {
    const bytes = sizeOf(e.data);
    const ch = channelOf(e.data);
    debug.recordMessage("in", ch, bytes, e.data);
  };
  const onOpen = () => debug.markEvent("ws:open");
  const onClose = (e: CloseEvent) => debug.markEvent("ws:close", { code: e.code, reason: e.reason });
  const onError = () => debug.markEvent("ws:error");

  ws.addEventListener("message", onMessage);
  ws.addEventListener("open", onOpen);
  ws.addEventListener("close", onClose);
  ws.addEventListener("error", onError);

  const origSend = ws.send.bind(ws);
  (ws as any).send = (data: any) => {
    debug.recordMessage("out", "ws", sizeOf(data), data);
    return origSend(data);
  };

  return () => {
    ws.removeEventListener("message", onMessage);
    ws.removeEventListener("open", onOpen);
    ws.removeEventListener("close", onClose);
    ws.removeEventListener("error", onError);
    (ws as any).send = origSend;
  };
}
