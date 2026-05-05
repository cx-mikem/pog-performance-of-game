export interface Sample {
  t: number;
  v: number;
}

export interface NetEvent {
  t: number;
  type: string;
  data?: Record<string, unknown>;
}

export interface SeriesStats {
  last: number;
  min: number;
  max: number;
  mean: number;
  p95: number;
}

export type TransportDirection = "in" | "out";

export interface MessageRecord {
  t: number;
  dir: TransportDirection;
  channel: string;
  bytes: number;
  payload?: unknown;
}

export interface SessionExport {
  startedAt: number;
  durationMs: number;
  series: Record<string, Sample[]>;
  events: NetEvent[];
  messages: MessageRecord[];
  entities: Array<{ id: string; meta: Record<string, unknown>; events: NetEvent[]; series: Record<string, Sample[]> }>;
  scenes: Array<{ key: string; series: Record<string, Sample[]> }>;
  culling: Array<{ sceneKey: string; series: Record<string, Sample[]>; byKind: Record<string, Record<string, Sample[]>> }>;
}
