import { MetricsRegistry } from "../core/MetricsRegistry";
import { RingBuffer } from "../core/RingBuffer";
import type { NetEvent } from "../core/Telemetry";

export interface EntityMeta {
  kind?: string;
  sprite?: { x: number; y: number; visible?: boolean } | null;
  [key: string]: unknown;
}

export class TrackedEntity {
  readonly metrics = new MetricsRegistry(100);
  readonly events = new RingBuffer<NetEvent>(256);
  private alive = true;
  private lastServerX: number | null = null;
  private lastServerY: number | null = null;
  private lastPredictX: number | null = null;
  private lastPredictY: number | null = null;
  private lastServerT = 0;

  constructor(
    public readonly id: string,
    public meta: EntityMeta,
    private readonly onChange: () => void,
  ) {}

  recordServerPosition(x: number, y: number, t = performance.now()): void {
    if (!this.alive) return;
    if (this.lastServerX !== null && this.lastServerT) {
      const dt = (t - this.lastServerT) / 1000;
      if (dt > 0) {
        const dx = x - this.lastServerX;
        const dy = y - (this.lastServerY ?? y);
        const speed = Math.hypot(dx, dy) / dt;
        this.metrics.record("speed", speed, { unit: "u/s" });
      }
    }
    this.lastServerX = x;
    this.lastServerY = y;
    this.lastServerT = t;
  }

  recordPredictedPosition(x: number, y: number): void {
    if (!this.alive) return;
    this.lastPredictX = x;
    this.lastPredictY = y;
    if (this.lastServerX !== null && this.lastServerY !== null) {
      const err = Math.hypot(x - this.lastServerX, y - this.lastServerY);
      this.metrics.record("predictionError", err, { unit: "px" });
    }
  }

  recordReconcile(errorPx: number): void {
    if (!this.alive) return;
    this.metrics.record("reconcile", errorPx, { unit: "px", aggregate: "mean" });
    this.events.push({ t: performance.now(), type: "reconcile", data: { errorPx } });
    this.onChange();
  }

  recordEvent(type: string, data?: Record<string, unknown>): void {
    if (!this.alive) return;
    this.events.push({ t: performance.now(), type, data });
    this.onChange();
  }

  recordBytes(dir: "in" | "out", bytes: number): void {
    if (!this.alive) return;
    this.metrics.record(dir === "in" ? "bytesIn" : "bytesOut", bytes, {
      unit: "B/s", aggregate: "sum",
    });
  }

  setMeta(patch: Partial<EntityMeta>): void {
    this.meta = { ...this.meta, ...patch };
    this.onChange();
  }

  snapshot(): {
    id: string;
    meta: EntityMeta;
    lastServer: { x: number; y: number } | null;
    lastPredicted: { x: number; y: number } | null;
  } {
    const lastServer = (this.lastServerX !== null && this.lastServerY !== null)
      ? { x: this.lastServerX, y: this.lastServerY } : null;
    const lastPredicted = (this.lastPredictX !== null && this.lastPredictY !== null)
      ? { x: this.lastPredictX, y: this.lastPredictY } : null;
    return { id: this.id, meta: this.meta, lastServer, lastPredicted };
  }

  destroy(): void {
    this.alive = false;
    this.onChange();
  }
}

export class EntityInspector {
  private readonly entities = new Map<string, TrackedEntity>();
  private readonly subs = new Set<() => void>();

  register(id: string, meta: EntityMeta = {}): TrackedEntity {
    let e = this.entities.get(id);
    if (e) {
      e.setMeta(meta);
      return e;
    }
    e = new TrackedEntity(id, meta, () => this.emit());
    this.entities.set(id, e);
    this.emit();
    return e;
  }

  unregister(id: string): void {
    const e = this.entities.get(id);
    if (!e) return;
    e.destroy();
    this.entities.delete(id);
    this.emit();
  }

  get(id: string): TrackedEntity | undefined {
    return this.entities.get(id);
  }

  list(): TrackedEntity[] {
    return Array.from(this.entities.values());
  }

  size(): number { return this.entities.size; }

  subscribe(fn: () => void): () => void {
    this.subs.add(fn);
    return () => { this.subs.delete(fn); };
  }

  flushAll(now: number): void {
    this.entities.forEach((e) => e.metrics.flushAll(now));
  }

  private emit(): void {
    this.subs.forEach((fn) => { try { fn(); } catch { /* swallow */ } });
  }
}
