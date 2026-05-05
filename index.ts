export { PogPlugin } from "./PogPlugin";
export type { PogOptions } from "./PogPlugin";

export { MetricsRegistry, Series } from "./core/MetricsRegistry";
export { RingBuffer } from "./core/RingBuffer";
export type { Sample, NetEvent, SeriesStats, MessageRecord, SessionExport, TransportDirection } from "./core/Telemetry";

export { EntityInspector, TrackedEntity } from "./inspectors/EntityInspector";
export type { EntityMeta } from "./inspectors/EntityInspector";
export { SpriteInspector, TrackedSprite } from "./inspectors/SpriteInspector";
export type { SpriteAttachOptions } from "./inspectors/SpriteInspector";
export { SceneInspector, TrackedScene } from "./inspectors/SceneInspector";
export { CullingInspector, TrackedCulling } from "./inspectors/CullingInspector";
export type { CullingSample } from "./inspectors/CullingInspector";
export type { SceneMeta } from "./inspectors/SceneInspector";

export { Sparkline } from "./overlay/Sparkline";
export { DomOverlay } from "./overlay/DomOverlay";

export { attachWebSocket } from "./adapters/WebSocketAdapter";
export { attachColyseus } from "./adapters/ColyseusAdapter";
export { instrumentDrawCalls } from "./adapters/DrawCallInstrument";

import type Phaser from "phaser";
import { PogPlugin } from "./PogPlugin";

export function registerPog(
  config: Phaser.Types.Core.GameConfig,
  opts?: { mapping?: string; key?: string; start?: boolean },
): Phaser.Types.Core.GameConfig {
  const key = opts?.key ?? "POG";
  const mapping = opts?.mapping ?? "pog";
  const plugin = { key, plugin: PogPlugin, start: opts?.start ?? true, mapping };
  const existing = config.plugins as Phaser.Types.Core.PluginObject | undefined;
  const globals = (existing?.global ?? []) as Phaser.Types.Core.PluginObjectItem[];
  return {
    ...config,
    plugins: { ...(existing ?? {}), global: [...globals, plugin] },
  };
}
