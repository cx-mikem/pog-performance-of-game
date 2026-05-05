import type Phaser from "phaser";
import { MetricsRegistry } from "../core/MetricsRegistry";

export interface SpriteAttachOptions {
  label?: string;
  networked?: boolean;
  entityId?: string;
}

export class TrackedSprite {
  readonly metrics = new MetricsRegistry(100);
  readonly attachedAt = performance.now();
  private prevX: number | null = null;
  private prevY: number | null = null;

  constructor(
    public readonly id: number,
    public readonly target: Phaser.GameObjects.GameObject,
    public readonly opts: SpriteAttachOptions,
  ) {}

  sample(now: number): void {
    const t = this.target as Phaser.GameObjects.GameObject & { x?: number; y?: number; visible?: boolean };
    if (typeof t.x === "number" && typeof t.y === "number") {
      if (this.prevX !== null && this.prevY !== null) {
        const speed = Math.hypot(t.x - this.prevX, t.y - this.prevY);
        this.metrics.record("frameSpeed", speed, { unit: "px/f" });
      }
      this.prevX = t.x;
      this.prevY = t.y;
    }
    this.metrics.record("visible", t.visible ? 1 : 0);
    this.metrics.flushAll(now);
  }

  pos(): { x: number; y: number } | null {
    const t = this.target as { x?: number; y?: number };
    if (typeof t.x === "number" && typeof t.y === "number") return { x: t.x, y: t.y };
    return null;
  }
}

export class SpriteInspector {
  private nextId = 1;
  private readonly tracked = new Map<number, TrackedSprite>();
  private readonly byTarget = new WeakMap<Phaser.GameObjects.GameObject, number>();
  private readonly subs = new Set<() => void>();

  attach(go: Phaser.GameObjects.GameObject, opts: SpriteAttachOptions = {}): TrackedSprite {
    const existingId = this.byTarget.get(go);
    if (existingId !== undefined) {
      const existing = this.tracked.get(existingId);
      if (existing) return existing;
    }
    const id = this.nextId++;
    const t = new TrackedSprite(id, go, opts);
    this.tracked.set(id, t);
    this.byTarget.set(go, id);
    go.once("destroy", () => this.detach(go));
    this.emit();
    return t;
  }

  detach(go: Phaser.GameObjects.GameObject): void {
    const id = this.byTarget.get(go);
    if (id === undefined) return;
    this.tracked.delete(id);
    this.emit();
  }

  list(): TrackedSprite[] {
    return Array.from(this.tracked.values());
  }

  size(): number { return this.tracked.size; }

  sampleAll(now: number): void {
    this.tracked.forEach((t) => t.sample(now));
  }

  subscribe(fn: () => void): () => void {
    this.subs.add(fn);
    return () => { this.subs.delete(fn); };
  }

  private emit(): void {
    this.subs.forEach((fn) => { try { fn(); } catch { /* swallow */ } });
  }
}
