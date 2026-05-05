# Session Export

Every metric, event, and message recorded since the plugin booted can be dumped as a single JSON blob for offline inspection or attaching to a bug report.

## Triggering an export

```ts
const session = pog.exportSession();   // returns a SessionExport object
pog.downloadSession();                  // triggers a browser download
pog.downloadSession("perf.json");       // custom filename
```

The "export" button in the overlay calls `downloadSession()`.

## Schema

`exportSession()` returns a [`SessionExport`](../core/Telemetry.ts):

```ts
interface SessionExport {
  startedAt: number;     // Date.now() at plugin construction
  durationMs: number;    // Date.now() - startedAt at export time

  // Free-form named series from the global registry.
  // Series name → list of samples ({ t, v }).
  series: Record<string, Sample[]>;

  // Generic timestamped events from pog.markEvent().
  events: NetEvent[];

  // Network message log (ring buffer, capped by messageBufferSize).
  messages: MessageRecord[];

  // Per-entity series + per-entity events.
  entities: Array<{
    id: string;
    meta: Record<string, unknown>;
    events: NetEvent[];
    series: Record<string, Sample[]>;
  }>;

  // Per-scene series (fps, frameMs, drawCalls, custom counts, ...).
  scenes: Array<{ key: string; series: Record<string, Sample[]> }>;

  // Per-scene culling, with byKind breakdowns.
  culling: Array<{
    sceneKey: string;
    series: Record<string, Sample[]>;        // visible/processed/diff/cullRate/total
    byKind: Record<string, Record<string, Sample[]>>;
  }>;
}
```

A `Sample` is `{ t: number; v: number }` — `t` is `performance.now()` at the time the bucket was flushed.

## What's captured vs what's bounded

- **Series**: aggregated into `bucketMs`-wide buckets. Each series keeps a bounded ring of samples (currently 600 per series), so memory is constant regardless of session length.
- **Messages**: bounded by `messageBufferSize` (default 1024). The oldest message is evicted when the buffer is full.
- **Events**: bounded by `eventBufferSize` (default 512).
- **Per-entity events**: 256 per entity.

Long sessions are safe; you'll see a sliding window rather than an unbounded log.

## Tips for bug reports

1. Open the overlay (`` ` ``) and reproduce the slowdown.
2. Click **export** — or call `pog.downloadSession("repro.json")`.
3. Attach the JSON file to the issue, along with browser/GPU info from the `scenes` tab.

The JSON is purely descriptive — there's no code, no DOM, no PII beyond whatever you put into entity `meta` or message `payload` fields.
