import Phaser from "phaser";
import { MetricsRegistry } from "./core/MetricsRegistry";
import { RingBuffer } from "./core/RingBuffer";
import type { MessageRecord, NetEvent, SessionExport, TransportDirection } from "./core/Telemetry";
import { EntityInspector } from "./inspectors/EntityInspector";
import { SpriteInspector } from "./inspectors/SpriteInspector";
import { SceneInspector } from "./inspectors/SceneInspector";
import { CullingInspector } from "./inspectors/CullingInspector";
import { DomOverlay } from "./overlay/DomOverlay";

export interface PogOptions {
  /** Title shown in the overlay header. Defaults to "POG". */
  title?: string;
  hotkey?: string;
  urlFlag?: string | false;
  startVisible?: boolean;
  bucketMs?: number;
  messageBufferSize?: number;
  eventBufferSize?: number;
  autoAttachScenes?: boolean;
  /** Initially-selected tab. Defaults to "scenes" so single-player apps see something useful immediately. */
  defaultTab?: "global" | "entities" | "sprites" | "scenes" | "culling";
}

const DEFAULTS: Required<PogOptions> = {
  title: "POG",
  hotkey: "`",
  urlFlag: "pog",
  startVisible: false,
  bucketMs: 100,
  messageBufferSize: 1024,
  eventBufferSize: 512,
  autoAttachScenes: true,
  defaultTab: "scenes",
};

export class PogPlugin extends Phaser.Plugins.BasePlugin {
  readonly globals: MetricsRegistry;
  readonly entities: EntityInspector;
  readonly sprites: SpriteInspector;
  readonly scenes: SceneInspector;
  readonly culling: CullingInspector;

  readonly messages: RingBuffer<MessageRecord>;
  readonly events: RingBuffer<NetEvent>;

  private readonly opts: Required<PogOptions>;
  private overlay: DomOverlay | null = null;
  private hotkeyHandler?: (e: KeyboardEvent) => void;
  private flushHandle: number | null = null;
  private readonly startedAt = Date.now();
  private visible = false;

  constructor(pluginManager: Phaser.Plugins.PluginManager, opts?: PogOptions) {
    super(pluginManager);
    this.opts = { ...DEFAULTS, ...(opts ?? {}) };
    this.globals = new MetricsRegistry(this.opts.bucketMs);
    this.entities = new EntityInspector();
    this.sprites = new SpriteInspector();
    this.scenes = new SceneInspector();
    this.culling = new CullingInspector();
    this.messages = new RingBuffer<MessageRecord>(this.opts.messageBufferSize);
    this.events = new RingBuffer<NetEvent>(this.opts.eventBufferSize);
  }

  init(_data?: PogOptions): void {
    this.installHotkey();
    this.installFlushLoop();
    if (this.opts.autoAttachScenes) this.installSceneAutoAttach();
    if (this.opts.startVisible || this.urlFlagPresent()) this.show();
  }

  start(): void { /* no-op */ }

  destroy(): void {
    if (this.hotkeyHandler) window.removeEventListener("keydown", this.hotkeyHandler);
    this.hotkeyHandler = undefined;
    if (this.flushHandle) {
      clearInterval(this.flushHandle);
      this.flushHandle = null;
    }
    this.hide();
    super.destroy();
  }

  // ── public api ────────────────────────────────────────────────────────────

  track(name: string, value: number, opts?: { unit?: string; aggregate?: "last" | "sum" | "mean" }): void {
    this.globals.record(name, value, opts);
  }

  trackBytes(dir: TransportDirection, bytes: number): void {
    this.track(dir === "in" ? "bytesIn" : "bytesOut", bytes, { unit: "B/s", aggregate: "sum" });
  }

  recordMessage(dir: TransportDirection, channel: string, bytes: number, payload?: unknown): void {
    const t = performance.now();
    this.messages.push({ t, dir, channel, bytes, payload });
    this.trackBytes(dir, bytes);
    this.track(`msg/${channel}/${dir}`, 1, { aggregate: "sum" });
  }

  markEvent(type: string, data?: Record<string, unknown>): void {
    this.events.push({ t: performance.now(), type, data });
  }

  show(): void {
    if (this.visible) return;
    this.visible = true;
    if (!this.overlay) {
      this.overlay = new DomOverlay({
        title: this.opts.title,
        defaultTab: this.opts.defaultTab,
        globals: this.globals,
        entities: this.entities,
        sprites: this.sprites,
        scenes: this.scenes,
        culling: this.culling,
        onClose: () => this.hide(),
        onExport: () => this.downloadSession(),
      });
    }
    this.overlay.mount();
  }

  hide(): void {
    this.visible = false;
    this.overlay?.unmount();
  }

  toggle(): void {
    if (this.visible) this.hide(); else this.show();
  }

  exportSession(): SessionExport {
    return {
      startedAt: this.startedAt,
      durationMs: Date.now() - this.startedAt,
      series: this.globals.exportSeries(),
      events: this.events.toArray(),
      messages: this.messages.toArray(),
      entities: this.entities.list().map((e) => ({
        id: e.id,
        meta: e.meta as Record<string, unknown>,
        events: e.events.toArray(),
        series: Object.fromEntries(e.metrics.list().map((s) => [s.name, s.samples.toArray()])),
      })),
      scenes: this.scenes.list().map(({ key, tracked }) => ({
        key,
        series: Object.fromEntries(tracked.metrics.list().map((s) => [s.name, s.samples.toArray()])),
      })),
      culling: this.culling.list().map((c) => ({
        sceneKey: c.sceneKey,
        series: Object.fromEntries(c.metrics.list().map((s) => [s.name, s.samples.toArray()])),
        byKind: Object.fromEntries(c.kinds().map(({ kind, metrics }) =>
          [kind, Object.fromEntries(metrics.list().map((s) => [s.name, s.samples.toArray()]))],
        )),
      })),
    };
  }

  downloadSession(filename = `pog-session-${Date.now()}.json`): void {
    const json = JSON.stringify(this.exportSession(), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ── internals ─────────────────────────────────────────────────────────────

  private installHotkey(): void {
    const key = this.opts.hotkey;
    this.hotkeyHandler = (e: KeyboardEvent) => {
      if (e.key !== key) return;
      const t = e.target as HTMLElement | null;
      if (t && /input|textarea|select/i.test(t.tagName)) return;
      this.toggle();
    };
    window.addEventListener("keydown", this.hotkeyHandler);
  }

  private installFlushLoop(): void {
    this.flushHandle = window.setInterval(() => {
      const now = performance.now();
      this.globals.flushAll(now);
      this.entities.flushAll(now);
      this.scenes.flushAll(now);
      this.sprites.sampleAll(now);
      this.culling.flushAll(now);
    }, this.opts.bucketMs);
  }

  private installSceneAutoAttach(): void {
    const game = this.pluginManager.game;
    const attachAll = () => {
      game.scene.scenes.forEach((s: Phaser.Scene) => this.scenes.attach(s));
    };
    if (game.isBooted) attachAll();
    else game.events.once(Phaser.Core.Events.READY, attachAll);
    game.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, () => attachAll());
  }

  private urlFlagPresent(): boolean {
    if (!this.opts.urlFlag) return false;
    try {
      return new URLSearchParams(window.location.search).get(this.opts.urlFlag) === "1";
    } catch { return false; }
  }
}
