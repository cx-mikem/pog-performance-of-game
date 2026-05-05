import { MetricsRegistry } from "../core/MetricsRegistry";

export interface CullingSample {
  visible: number;
  processed: number;
  total?: number;
  byKind?: Record<string, { visible: number; processed: number }>;
}

export class TrackedCulling {
  readonly metrics = new MetricsRegistry(100);
  private lastSample: CullingSample | null = null;
  private readonly kindMetrics = new Map<string, MetricsRegistry>();

  constructor(public readonly sceneKey: string) {}

  sample(s: CullingSample): void {
    const visible = Math.max(0, s.visible);
    const processed = Math.max(visible, s.processed);
    const diff = processed - visible;
    const cullRate = processed > 0 ? diff / processed : 0;

    this.metrics.record("visible", visible, { unit: "ent" });
    this.metrics.record("processed", processed, { unit: "ent" });
    this.metrics.record("diff", diff, { unit: "ent" });
    this.metrics.record("cullRate", cullRate * 100, { unit: "%" });
    if (typeof s.total === "number") {
      this.metrics.record("total", s.total, { unit: "ent" });
    }

    if (s.byKind) {
      for (const [kind, counts] of Object.entries(s.byKind)) {
        let reg = this.kindMetrics.get(kind);
        if (!reg) {
          reg = new MetricsRegistry(100);
          this.kindMetrics.set(kind, reg);
        }
        reg.record("visible", counts.visible, { unit: "ent" });
        reg.record("processed", counts.processed, { unit: "ent" });
        reg.record("diff", counts.processed - counts.visible, { unit: "ent" });
      }
    }

    this.lastSample = s;
  }

  last(): CullingSample | null { return this.lastSample; }

  kinds(): Array<{ kind: string; metrics: MetricsRegistry }> {
    return Array.from(this.kindMetrics.entries()).map(([kind, metrics]) => ({ kind, metrics }));
  }

  flush(now: number): void {
    this.metrics.flushAll(now);
    this.kindMetrics.forEach((m) => m.flushAll(now));
  }
}

export class CullingInspector {
  private readonly tracked = new Map<string, TrackedCulling>();
  private readonly subs = new Set<() => void>();

  sample(sceneKey: string, s: CullingSample): TrackedCulling {
    let t = this.tracked.get(sceneKey);
    if (!t) {
      t = new TrackedCulling(sceneKey);
      this.tracked.set(sceneKey, t);
      this.emit();
    }
    t.sample(s);
    return t;
  }

  get(sceneKey: string): TrackedCulling | undefined {
    return this.tracked.get(sceneKey);
  }

  list(): TrackedCulling[] {
    return Array.from(this.tracked.values());
  }

  size(): number { return this.tracked.size; }

  flushAll(now: number): void {
    this.tracked.forEach((t) => t.flush(now));
  }

  subscribe(fn: () => void): () => void {
    this.subs.add(fn);
    return () => { this.subs.delete(fn); };
  }

  private emit(): void {
    this.subs.forEach((fn) => { try { fn(); } catch { /* swallow */ } });
  }
}
