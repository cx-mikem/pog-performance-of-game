import type Phaser from "phaser";
import { MetricsRegistry } from "../core/MetricsRegistry";

export interface SceneMeta {
  gpuRenderer?: string;
  rendererType?: "WebGL" | "Canvas" | "Headless" | string;
}

export class TrackedScene {
  readonly metrics = new MetricsRegistry(100);
  meta: SceneMeta = {};
  private detachers: Array<() => void> = [];
  private spriteSampleAccum = 0;

  constructor(public readonly scene: Phaser.Scene) {}

  start(): void {
    const events = this.scene.events;
    const onPre = (_t: number, dt: number) => {
      this.metrics.record("frameMs", dt, { unit: "ms" });
      const fps = this.scene.game.loop.actualFps;
      if (isFinite(fps) && fps > 0) this.metrics.record("fps", fps, { unit: "fps" });
      this.metrics.record("zoom", this.scene.cameras.main?.zoom ?? 0);

      this.spriteSampleAccum += dt;
      if (this.spriteSampleAccum >= 250) {
        this.spriteSampleAccum = 0;
        this.metrics.record("spriteCount", this.countDisplayList(), { unit: "obj" });
      }
    };
    events.on("preupdate", onPre);
    this.detachers.push(() => events.off("preupdate", onPre));

    this.captureRendererMeta();

    const onShutdown = () => this.stop();
    events.once("shutdown", onShutdown);
    this.detachers.push(() => events.off("shutdown", onShutdown));
  }

  recordCustom(name: string, value: number, unit?: string): void {
    this.metrics.record(name, value, unit ? { unit } : undefined);
  }

  recordDrawCalls(n: number): void {
    this.metrics.record("drawCalls", n, { unit: "calls" });
  }

  flush(now: number): void {
    this.metrics.flushAll(now);
  }

  stop(): void {
    this.detachers.forEach((fn) => { try { fn(); } catch { /* swallow */ } });
    this.detachers = [];
  }

  private countDisplayList(): number {
    const list: any = (this.scene as any).children?.list;
    if (!Array.isArray(list)) return 0;
    let n = 0;
    const walk = (arr: any[]) => {
      for (const obj of arr) {
        n++;
        const sub = obj?.list;
        if (Array.isArray(sub)) walk(sub);
      }
    };
    walk(list);
    return n;
  }

  private captureRendererMeta(): void {
    const renderer: any = this.scene.game.renderer;
    if (!renderer) return;
    const isWebGL = typeof renderer.gl !== "undefined";
    this.meta.rendererType = isWebGL ? "WebGL" : (renderer.type === 1 ? "WebGL" : "Canvas");
    if (isWebGL) {
      try {
        const gl: WebGLRenderingContext = renderer.gl;
        const dbg = gl.getExtension("WEBGL_debug_renderer_info");
        if (dbg) {
          const r = gl.getParameter((dbg as any).UNMASKED_RENDERER_WEBGL);
          if (typeof r === "string") this.meta.gpuRenderer = r;
        }
      } catch { /* swallow */ }
    }
  }
}

export class SceneInspector {
  private readonly scenes = new Map<string, TrackedScene>();
  private readonly subs = new Set<() => void>();

  attach(scene: Phaser.Scene): TrackedScene {
    const key = scene.scene.key || `scene_${this.scenes.size}`;
    let t = this.scenes.get(key);
    if (t) return t;
    t = new TrackedScene(scene);
    t.start();
    this.scenes.set(key, t);
    this.emit();
    return t;
  }

  detach(key: string): void {
    const s = this.scenes.get(key);
    if (!s) return;
    s.stop();
    this.scenes.delete(key);
    this.emit();
  }

  list(): Array<{ key: string; tracked: TrackedScene }> {
    return Array.from(this.scenes.entries()).map(([key, tracked]) => ({ key, tracked }));
  }

  flushAll(now: number): void {
    this.scenes.forEach((s) => s.flush(now));
  }

  subscribe(fn: () => void): () => void {
    this.subs.add(fn);
    return () => { this.subs.delete(fn); };
  }

  private emit(): void {
    this.subs.forEach((fn) => { try { fn(); } catch { /* swallow */ } });
  }
}
