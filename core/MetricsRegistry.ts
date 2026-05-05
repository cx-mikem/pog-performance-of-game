import { RingBuffer } from "./RingBuffer";
import type { Sample, SeriesStats } from "./Telemetry";

export interface SeriesOptions {
  capacity?: number;
  unit?: string;
  aggregate?: "last" | "sum" | "mean";
}

export class Series {
  readonly samples: RingBuffer<Sample>;
  readonly unit: string;
  readonly aggregate: "last" | "sum" | "mean";
  private bucketSum = 0;
  private bucketCount = 0;
  private bucketStart = 0;

  constructor(public readonly name: string, opts: SeriesOptions = {}) {
    this.samples = new RingBuffer<Sample>(opts.capacity ?? 600);
    this.unit = opts.unit ?? "";
    this.aggregate = opts.aggregate ?? "last";
  }

  record(value: number, now: number, bucketMs: number): void {
    if (this.bucketStart === 0) this.bucketStart = now;
    if (now - this.bucketStart >= bucketMs) {
      this.flush(now);
    }
    if (this.aggregate === "sum") this.bucketSum += value;
    else if (this.aggregate === "mean") { this.bucketSum += value; this.bucketCount++; }
    else { this.bucketSum = value; this.bucketCount = 1; }
  }

  flush(now: number): void {
    if (this.bucketStart === 0) return;
    let v = 0;
    if (this.aggregate === "sum") v = this.bucketSum;
    else if (this.aggregate === "mean") v = this.bucketCount ? this.bucketSum / this.bucketCount : 0;
    else v = this.bucketSum;
    this.samples.push({ t: this.bucketStart, v });
    this.bucketStart = now;
    this.bucketSum = 0;
    this.bucketCount = 0;
  }

  stats(): SeriesStats {
    let last = 0, min = Infinity, max = -Infinity, sum = 0;
    const arr: number[] = [];
    this.samples.forEach((s) => {
      last = s.v;
      if (s.v < min) min = s.v;
      if (s.v > max) max = s.v;
      sum += s.v;
      arr.push(s.v);
    });
    const n = arr.length || 1;
    arr.sort((a, b) => a - b);
    const p95 = arr[Math.min(arr.length - 1, Math.floor(arr.length * 0.95))] ?? 0;
    return {
      last,
      min: min === Infinity ? 0 : min,
      max: max === -Infinity ? 0 : max,
      mean: sum / n,
      p95,
    };
  }
}

export class MetricsRegistry {
  private readonly series = new Map<string, Series>();
  private readonly bucketMs: number;

  constructor(bucketMs = 100) {
    this.bucketMs = bucketMs;
  }

  series_(name: string, opts?: SeriesOptions): Series {
    let s = this.series.get(name);
    if (!s) {
      s = new Series(name, opts);
      this.series.set(name, s);
    }
    return s;
  }

  record(name: string, value: number, opts?: SeriesOptions): void {
    this.series_(name, opts).record(value, performance.now(), this.bucketMs);
  }

  flushAll(now: number): void {
    this.series.forEach((s) => s.flush(now));
  }

  list(): Series[] {
    return Array.from(this.series.values());
  }

  get(name: string): Series | undefined {
    return this.series.get(name);
  }

  exportSeries(): Record<string, Sample[]> {
    const out: Record<string, Sample[]> = {};
    this.series.forEach((s, name) => { out[name] = s.samples.toArray(); });
    return out;
  }
}
