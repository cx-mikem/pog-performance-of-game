import { Sparkline } from "./Sparkline";
import type { MetricsRegistry, Series } from "../core/MetricsRegistry";
import type { EntityInspector, TrackedEntity } from "../inspectors/EntityInspector";
import type { SpriteInspector, TrackedSprite } from "../inspectors/SpriteInspector";
import type { SceneInspector } from "../inspectors/SceneInspector";
import type { CullingInspector, TrackedCulling } from "../inspectors/CullingInspector";

export interface DomOverlayDeps {
  title?: string;
  defaultTab?: Tab;
  globals: MetricsRegistry;
  entities: EntityInspector;
  sprites: SpriteInspector;
  scenes: SceneInspector;
  culling: CullingInspector;
  onClose: () => void;
  onExport: () => void;
}

type Tab = "global" | "entities" | "sprites" | "scenes" | "culling";

const STYLES = `
.pog-root { position: fixed; top: 12px; left: calc(100vw - 372px); width: 360px; max-height: calc(100vh - 24px);
  background: rgba(8, 14, 22, 0.92); color: #d6e7ff; font: 11px/1.4 ui-monospace, Menlo, Consolas, monospace;
  border: 1px solid #1f3148; border-radius: 8px; box-shadow: 0 8px 30px rgba(0,0,0,0.5);
  z-index: 2147483600; display: flex; flex-direction: column; backdrop-filter: blur(6px); }
.pog-header { display: flex; align-items: center; padding: 6px 8px; border-bottom: 1px solid #1f3148; gap: 6px;
  cursor: grab; user-select: none; }
.pog-header.dragging { cursor: grabbing; }
.pog-title { font-weight: 600; flex: 1; letter-spacing: 0.04em; color: #7ee2ff; pointer-events: none; }
.pog-btn { background: transparent; color: #d6e7ff; border: 1px solid #2a4566; border-radius: 4px;
  padding: 2px 6px; font: inherit; cursor: pointer; }
.pog-btn:hover { background: #15243a; }
.pog-btn.active { background: #1d3656; border-color: #4a7fb8; }
.pog-tabs { display: flex; gap: 4px; padding: 6px 8px; border-bottom: 1px solid #1f3148; }
.pog-body { flex: 1; overflow-y: auto; padding: 6px 8px; }
.pog-row { display: flex; align-items: center; gap: 6px; padding: 3px 0; cursor: pointer;
  border-bottom: 1px dashed #142235; }
.pog-row:hover { background: rgba(126,226,255,0.05); }
.pog-row.selected { background: rgba(126,226,255,0.12); }
.pog-row .name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pog-row .val { color: #9fc4ff; font-variant-numeric: tabular-nums; min-width: 56px; text-align: right; }
.pog-row .unit { color: #6886ad; font-size: 10px; }
.pog-row canvas { background: #0b1422; border: 1px solid #15243a; border-radius: 2px; }
.pog-detail { border-top: 1px solid #1f3148; padding: 6px 8px; max-height: 220px; overflow-y: auto;
  background: #0a1320; }
.pog-detail h4 { margin: 6px 0 2px; font-size: 11px; color: #7ee2ff; }
.pog-kv { display: flex; gap: 6px; }
.pog-kv .k { color: #6886ad; min-width: 110px; }
.pog-kv .v { color: #d6e7ff; }
.pog-pill { display: inline-block; padding: 0 5px; border-radius: 8px; background: #1d3656;
  color: #7ee2ff; margin-right: 4px; font-size: 10px; }
.pog-empty { color: #6886ad; padding: 12px 4px; text-align: center; }
.pog-empty-card { color: #6886ad; padding: 10px 8px; }
.pog-empty-card .title { color: #9fc4ff; font-weight: 600; margin-bottom: 4px; }
.pog-empty-card .desc { font-size: 10px; line-height: 1.5; margin-bottom: 6px; color: #6886ad; }
.pog-empty-card pre { background: #0b1422; border: 1px solid #15243a; border-radius: 4px;
  padding: 6px 8px; margin: 0; color: #c0d8ff; font-size: 10px; line-height: 1.5;
  white-space: pre-wrap; word-break: break-word; }
.pog-empty-card code { color: #7ee2ff; }
.pog-cull-card { padding: 8px; border: 1px solid #1f3148; border-radius: 6px;
  margin-bottom: 8px; background: #0a1320; }
.pog-cull-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
.pog-cull-head .key { color: #7ee2ff; font-weight: 600; }
.pog-cull-rate { font-size: 18px; font-variant-numeric: tabular-nums; color: #7ee2ff; }
.pog-cull-rate.warn { color: #ffb86b; }
.pog-cull-rate.bad { color: #ff7676; }
.pog-cull-bar { position: relative; height: 14px; border-radius: 3px; overflow: hidden;
  background: #1c2c44; border: 1px solid #243d5c; margin: 4px 0; }
.pog-cull-bar .seg-vis { position: absolute; left: 0; top: 0; bottom: 0; background: #7ee2ff; }
.pog-cull-bar .seg-cull { position: absolute; right: 0; top: 0; bottom: 0; background: #2c4666; }
.pog-cull-legend { display: flex; gap: 10px; font-size: 10px; color: #6886ad; }
.pog-cull-legend .sw { display: inline-block; width: 8px; height: 8px; border-radius: 2px;
  margin-right: 3px; vertical-align: middle; }
.pog-cull-counts { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-top: 6px; }
.pog-cull-counts > div { background: #0d1a2c; border: 1px solid #142235; border-radius: 4px;
  padding: 4px 6px; }
.pog-cull-counts .label { font-size: 9px; color: #6886ad; text-transform: uppercase; letter-spacing: 0.05em; }
.pog-cull-counts .num { font-size: 14px; color: #d6e7ff; font-variant-numeric: tabular-nums; }
`;

export class DomOverlay {
  private root: HTMLDivElement | null = null;
  private body: HTMLDivElement | null = null;
  private detail: HTMLDivElement | null = null;
  private tab: Tab;
  private selectedKey: string | null = null;
  private rafId = 0;
  private lastDraw = 0;
  private styleTag: HTMLStyleElement | null = null;
  private dragCleanup: (() => void) | null = null;
  private readonly drawIntervalMs = 200;
  private readonly POSITION_KEY = "pog-overlay-position";

  constructor(private deps: DomOverlayDeps) {
    this.tab = deps.defaultTab ?? "scenes";
  }

  mount(): void {
    if (this.root) return;
    this.styleTag = document.createElement("style");
    this.styleTag.textContent = STYLES;
    document.head.appendChild(this.styleTag);

    const root = document.createElement("div");
    root.className = "pog-root";
    root.setAttribute("data-testid", "pog-overlay");
    const title = this.deps.title ?? "POG";
    root.innerHTML = `
      <div class="pog-header">
        <div class="pog-title">${title}</div>
        <button class="pog-btn" data-act="export" title="Export session JSON">export</button>
        <button class="pog-btn" data-act="close" title="Hide (backtick)">×</button>
      </div>
      <div class="pog-tabs">
        <button class="pog-btn" data-tab="global">global</button>
        <button class="pog-btn" data-tab="entities">entities</button>
        <button class="pog-btn" data-tab="sprites">sprites</button>
        <button class="pog-btn" data-tab="scenes">scenes</button>
        <button class="pog-btn" data-tab="culling">culling</button>
      </div>
      <div class="pog-body"></div>
      <div class="pog-detail"></div>
    `;
    document.body.appendChild(root);

    this.root = root;
    this.body = root.querySelector(".pog-body") as HTMLDivElement;
    this.detail = root.querySelector(".pog-detail") as HTMLDivElement;

    root.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      const act = t.dataset.act;
      const tab = t.dataset.tab as Tab | undefined;
      if (act === "close") this.deps.onClose();
      else if (act === "export") this.deps.onExport();
      else if (tab) { this.tab = tab; this.selectedKey = null; this.render(); }
    });

    this.applySavedPosition(root);
    this.dragCleanup = this.installDrag(root, root.querySelector(".pog-header") as HTMLElement);

    this.render();
    this.scheduleLoop();
  }

  private applySavedPosition(root: HTMLDivElement): void {
    try {
      const raw = localStorage.getItem(this.POSITION_KEY);
      if (!raw) return;
      const { left, top } = JSON.parse(raw) as { left: number; top: number };
      const clamped = this.clampPosition(left, top, root.offsetWidth || 360, root.offsetHeight || 200);
      root.style.left = `${clamped.left}px`;
      root.style.top = `${clamped.top}px`;
    } catch { /* swallow corrupt storage */ }
  }

  private savePosition(left: number, top: number): void {
    try { localStorage.setItem(this.POSITION_KEY, JSON.stringify({ left, top })); } catch { /* swallow */ }
  }

  private clampPosition(left: number, top: number, w: number, h: number): { left: number; top: number } {
    const minVisible = 60;
    const maxLeft = window.innerWidth - minVisible;
    const maxTop = window.innerHeight - minVisible;
    return {
      left: Math.max(-(w - minVisible), Math.min(maxLeft, left)),
      top: Math.max(0, Math.min(maxTop, top)),
    };
  }

  private installDrag(root: HTMLDivElement, header: HTMLElement): () => void {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      dragging = true;
      header.classList.add("dragging");
      header.setPointerCapture?.(e.pointerId);
      const rect = root.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      root.style.left = `${rect.left}px`;
      root.style.top = `${rect.top}px`;
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const next = this.clampPosition(
        startLeft + (e.clientX - startX),
        startTop + (e.clientY - startY),
        root.offsetWidth, root.offsetHeight,
      );
      root.style.left = `${next.left}px`;
      root.style.top = `${next.top}px`;
    };

    const onPointerUp = () => {
      if (!dragging) return;
      dragging = false;
      header.classList.remove("dragging");
      const rect = root.getBoundingClientRect();
      this.savePosition(rect.left, rect.top);
    };

    header.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      header.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }

  unmount(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.dragCleanup?.();
    this.dragCleanup = null;
    this.root?.remove();
    this.styleTag?.remove();
    this.root = null;
    this.styleTag = null;
  }

  private scheduleLoop(): void {
    const tick = (now: number) => {
      this.rafId = requestAnimationFrame(tick);
      if (now - this.lastDraw < this.drawIntervalMs) return;
      this.lastDraw = now;
      this.render();
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private render(): void {
    if (!this.body || !this.root) return;

    this.root.querySelectorAll(".pog-tabs .pog-btn").forEach((el) => {
      const b = el as HTMLButtonElement;
      b.classList.toggle("active", b.dataset.tab === this.tab);
    });

    const body = this.body;
    body.innerHTML = "";

    if (this.tab === "global") this.renderSeriesList(body, this.deps.globals.list(), (s) => s.name);
    else if (this.tab === "entities") this.renderEntityList(body, this.deps.entities.list());
    else if (this.tab === "sprites") this.renderSpriteList(body, this.deps.sprites.list());
    else if (this.tab === "scenes") this.renderSceneList(body);
    else if (this.tab === "culling") this.renderCullingList(body);

    this.renderDetail();
  }

  private renderEmpty(host: HTMLElement, title: string, desc: string, snippet: string): void {
    host.innerHTML = `
      <div class="pog-empty-card">
        <div class="title">${title}</div>
        <div class="desc">${desc}</div>
        <pre><code>${snippet}</code></pre>
      </div>
    `;
  }

  private renderSeriesList(host: HTMLElement, list: Series[], label: (s: Series) => string): void {
    if (list.length === 0) {
      this.renderEmpty(host, "No global metrics yet",
        "Free-form named series for things like RTT, custom counters, or per-channel byte rates.",
        `pog.track("rtt", rttMs, { unit: "ms" });
pog.track("bytesIn", bytes, { aggregate: "sum" });`);
      return;
    }
    list.forEach((s) => {
      const row = document.createElement("div");
      row.className = "pog-row" + (this.selectedKey === `series:${s.name}` ? " selected" : "");
      const stats = s.stats();
      row.innerHTML = `
        <div class="name">${label(s)}</div>
        <div class="val">${stats.last.toFixed(stats.last < 10 ? 2 : 0)}</div>
        <div class="unit">${s.unit}</div>
      `;
      const spark = new Sparkline({ width: 80, height: 18 });
      spark.draw(s.samples.toArray());
      row.appendChild(spark.canvas);
      row.addEventListener("click", () => {
        this.selectedKey = this.selectedKey === `series:${s.name}` ? null : `series:${s.name}`;
        this.render();
      });
      host.appendChild(row);
    });
  }

  private renderEntityList(host: HTMLElement, entities: TrackedEntity[]): void {
    if (entities.length === 0) {
      this.renderEmpty(host, "No entities tracked yet",
        "Register networked entities to see per-entity reconcile error, prediction error, and server vs predicted position.",
        `const e = pog.entities.register(id, { kind: "player" });
e.recordServerPosition(serverX, serverY);
e.recordPredictedPosition(predX, predY);
e.recordReconcile(errorPx);`);
      return;
    }
    entities.forEach((e) => {
      const row = document.createElement("div");
      const key = `entity:${e.id}`;
      row.className = "pog-row" + (this.selectedKey === key ? " selected" : "");
      const recon = e.metrics.get("reconcile");
      const errLast = recon ? recon.stats().last.toFixed(1) : "—";
      row.innerHTML = `
        <div class="name">${e.meta.kind ? `<span class="pog-pill">${e.meta.kind}</span>` : ""}${e.id}</div>
        <div class="val">${errLast}</div>
        <div class="unit">px</div>
      `;
      row.addEventListener("click", () => {
        this.selectedKey = this.selectedKey === key ? null : key;
        this.render();
      });
      host.appendChild(row);
    });
  }

  private renderSpriteList(host: HTMLElement, sprites: TrackedSprite[]): void {
    if (sprites.length === 0) {
      this.renderEmpty(host, "No sprites attached",
        "Attach any Phaser GameObject to track frame speed, visibility, and position. Auto-detaches on destroy.",
        `pog.sprites.attach(mySprite, {
  label: "boss",
  networked: true,
  entityId: "boss-1",
});`);
      return;
    }
    sprites.forEach((s) => {
      const key = `sprite:${s.id}`;
      const row = document.createElement("div");
      row.className = "pog-row" + (this.selectedKey === key ? " selected" : "");
      const pos = s.pos();
      row.innerHTML = `
        <div class="name">${s.opts.label ?? `sprite#${s.id}`}${s.opts.networked ? '<span class="pog-pill">net</span>' : ""}</div>
        <div class="val">${pos ? `${pos.x.toFixed(0)},${pos.y.toFixed(0)}` : "—"}</div>
        <div class="unit"></div>
      `;
      row.addEventListener("click", () => {
        this.selectedKey = this.selectedKey === key ? null : key;
        this.render();
      });
      host.appendChild(row);
    });
  }

  private renderSceneList(host: HTMLElement): void {
    const scenes = this.deps.scenes.list();
    if (scenes.length === 0) {
      this.renderEmpty(host, "No scenes attached",
        "Auto-attached when autoAttachScenes is on (default). For manual attach (or to capture draw calls):",
        `const tracked = pog.scenes.attach(scene);
instrumentDrawCalls(scene, tracked);`);
      return;
    }
    scenes.forEach(({ key, tracked }) => {
      const fps = tracked.metrics.get("fps");
      const fm = tracked.metrics.get("frameMs");
      const sp = tracked.metrics.get("spriteCount");
      const fpsLast = fps ? fps.stats().last.toFixed(0) : "—";
      const fmLast = fm ? fm.stats().last.toFixed(1) : "—";
      const spLast = sp ? sp.stats().last.toFixed(0) : "—";
      const k = `scene:${key}`;
      const row = document.createElement("div");
      row.className = "pog-row" + (this.selectedKey === k ? " selected" : "");
      row.innerHTML = `
        <div class="name">${key} <span class="pog-pill">${spLast} obj</span></div>
        <div class="val">${fpsLast}</div>
        <div class="unit">fps · ${fmLast}ms</div>
      `;
      if (fps) {
        const spark = new Sparkline({ width: 80, height: 18 });
        spark.draw(fps.samples.toArray());
        row.appendChild(spark.canvas);
      }
      row.addEventListener("click", () => {
        this.selectedKey = this.selectedKey === k ? null : k;
        this.render();
      });
      host.appendChild(row);
    });
  }

  private renderCullingList(host: HTMLElement): void {
    const list = this.deps.culling.list();
    if (list.length === 0) {
      this.renderEmpty(host, "No culling samples yet",
        "Sample after each cull pass to see how many entities you're rendering vs how many you're processing — the diff is what your culling pass is saving.",
        `pog.culling.sample("WorldScene", {
  visible: visibleEntities.length,
  processed: allEntities.length,
  byKind: {
    enemy: { visible: vE, processed: pE },
    item:  { visible: vI, processed: pI },
  },
});`);
      return;
    }
    list.forEach((c) => this.renderCullingCard(host, c));
  }

  private renderCullingCard(host: HTMLElement, c: TrackedCulling): void {
    const last = c.last();
    const visible = last?.visible ?? 0;
    const processed = last?.processed ?? 0;
    const diff = Math.max(0, processed - visible);
    const rate = processed > 0 ? (diff / processed) : 0;
    const ratePct = (rate * 100).toFixed(0);
    const visPct = processed > 0 ? (visible / processed) * 100 : 0;

    const rateClass = rate >= 0.5 ? "" : rate >= 0.2 ? "warn" : "bad";

    const card = document.createElement("div");
    card.className = "pog-cull-card";
    card.innerHTML = `
      <div class="pog-cull-head">
        <div class="key">${c.sceneKey}</div>
        <div style="flex:1"></div>
        <div class="pog-cull-rate ${rateClass}">${ratePct}% culled</div>
      </div>
      <div class="pog-cull-bar" title="visible / processed">
        <div class="seg-cull" style="width: 100%"></div>
        <div class="seg-vis" style="width: ${visPct.toFixed(2)}%"></div>
      </div>
      <div class="pog-cull-legend">
        <span><span class="sw" style="background:#7ee2ff"></span>visible</span>
        <span><span class="sw" style="background:#2c4666"></span>processed-but-culled</span>
      </div>
      <div class="pog-cull-counts">
        <div><div class="label">visible</div><div class="num">${visible}</div></div>
        <div><div class="label">processed</div><div class="num">${processed}</div></div>
        <div><div class="label">diff</div><div class="num">${diff}</div></div>
      </div>
    `;

    const sparkRow = document.createElement("div");
    sparkRow.style.marginTop = "6px";
    const visSeries = c.metrics.get("visible");
    const procSeries = c.metrics.get("processed");
    if (visSeries && procSeries) {
      const w = 340, h = 38;
      const proc = new Sparkline({ width: w, height: h, stroke: "#5878a8", fill: "rgba(88,120,168,0.18)" });
      proc.draw(procSeries.samples.toArray());
      proc.canvas.style.position = "absolute";
      const vis = new Sparkline({ width: w, height: h, stroke: "#7ee2ff", fill: "rgba(126,226,255,0.22)" });
      vis.draw(visSeries.samples.toArray());
      vis.canvas.style.position = "absolute";
      const stack = document.createElement("div");
      stack.style.position = "relative";
      stack.style.width = `${w}px`;
      stack.style.height = `${h}px`;
      stack.appendChild(proc.canvas);
      stack.appendChild(vis.canvas);
      sparkRow.appendChild(stack);
      card.appendChild(sparkRow);
    }

    if (last?.byKind && Object.keys(last.byKind).length > 0) {
      const kindHost = document.createElement("div");
      kindHost.style.marginTop = "8px";
      kindHost.innerHTML = `<div class="pog-cull-legend" style="margin-bottom:4px;">by kind</div>`;
      Object.entries(last.byKind).forEach(([kind, counts]) => {
        const kRow = document.createElement("div");
        const kDiff = Math.max(0, counts.processed - counts.visible);
        const kRate = counts.processed > 0 ? (kDiff / counts.processed) : 0;
        const kVisPct = counts.processed > 0 ? (counts.visible / counts.processed) * 100 : 0;
        kRow.className = "pog-row";
        kRow.style.cursor = "default";
        kRow.innerHTML = `
          <div class="name">${kind}</div>
          <div class="val">${counts.visible}/${counts.processed}</div>
          <div class="unit">${(kRate * 100).toFixed(0)}%</div>
        `;
        const bar = document.createElement("div");
        bar.className = "pog-cull-bar";
        bar.style.width = "60px";
        bar.innerHTML = `
          <div class="seg-cull" style="width:100%"></div>
          <div class="seg-vis" style="width:${kVisPct.toFixed(2)}%"></div>
        `;
        kRow.appendChild(bar);
        kindHost.appendChild(kRow);
      });
      card.appendChild(kindHost);
    }

    host.appendChild(card);
  }

  private renderDetail(): void {
    if (!this.detail) return;
    const d = this.detail;
    d.innerHTML = "";
    if (!this.selectedKey) {
      d.innerHTML = `<div class="pog-empty">select a row to inspect</div>`;
      return;
    }
    const [kind, id] = this.selectedKey.split(":", 2);
    if (kind === "series") this.renderSeriesDetail(d, id);
    else if (kind === "entity") this.renderEntityDetail(d, id);
    else if (kind === "sprite") this.renderSpriteDetail(d, id);
    else if (kind === "scene") this.renderSceneDetail(d, id);
  }

  private statRows(s: Series): string {
    const st = s.stats();
    const fmt = (v: number) => (v < 10 ? v.toFixed(2) : v.toFixed(0));
    return `
      <div class="pog-kv"><div class="k">last</div><div class="v">${fmt(st.last)} ${s.unit}</div></div>
      <div class="pog-kv"><div class="k">mean</div><div class="v">${fmt(st.mean)} ${s.unit}</div></div>
      <div class="pog-kv"><div class="k">min / max</div><div class="v">${fmt(st.min)} / ${fmt(st.max)} ${s.unit}</div></div>
      <div class="pog-kv"><div class="k">p95</div><div class="v">${fmt(st.p95)} ${s.unit}</div></div>
    `;
  }

  private renderSeriesDetail(host: HTMLElement, name: string): void {
    const s = this.deps.globals.get(name);
    if (!s) return;
    host.innerHTML = `<h4>${name}</h4>` + this.statRows(s);
    const spark = new Sparkline({ width: 340, height: 60, stroke: "#7ee2ff", fill: "rgba(126,226,255,0.2)" });
    spark.draw(s.samples.toArray());
    host.appendChild(spark.canvas);
  }

  private renderEntityDetail(host: HTMLElement, id: string): void {
    const e = this.deps.entities.get(id);
    if (!e) return;
    const snap = e.snapshot();
    host.innerHTML = `<h4>entity ${id}</h4>
      <div class="pog-kv"><div class="k">kind</div><div class="v">${e.meta.kind ?? "—"}</div></div>
      <div class="pog-kv"><div class="k">server pos</div><div class="v">${snap.lastServer ? `${snap.lastServer.x.toFixed(1)}, ${snap.lastServer.y.toFixed(1)}` : "—"}</div></div>
      <div class="pog-kv"><div class="k">predicted</div><div class="v">${snap.lastPredicted ? `${snap.lastPredicted.x.toFixed(1)}, ${snap.lastPredicted.y.toFixed(1)}` : "—"}</div></div>
    `;
    e.metrics.list().forEach((s) => {
      const sec = document.createElement("div");
      sec.innerHTML = `<h4>${s.name}</h4>` + this.statRows(s);
      const spark = new Sparkline({ width: 340, height: 36 });
      spark.draw(s.samples.toArray());
      sec.appendChild(spark.canvas);
      host.appendChild(sec);
    });
    const evts = e.events.toArray().slice(-12).reverse();
    if (evts.length) {
      const sec = document.createElement("div");
      sec.innerHTML = `<h4>recent events</h4>` + evts.map((ev) =>
        `<div class="pog-kv"><div class="k">${ev.type}</div><div class="v">${JSON.stringify(ev.data ?? {})}</div></div>`,
      ).join("");
      host.appendChild(sec);
    }
  }

  private renderSpriteDetail(host: HTMLElement, idStr: string): void {
    const id = Number(idStr);
    const s = this.deps.sprites.list().find((x) => x.id === id);
    if (!s) return;
    const pos = s.pos();
    host.innerHTML = `<h4>${s.opts.label ?? `sprite#${s.id}`}</h4>
      <div class="pog-kv"><div class="k">networked</div><div class="v">${s.opts.networked ? "yes" : "no"}</div></div>
      <div class="pog-kv"><div class="k">entityId</div><div class="v">${s.opts.entityId ?? "—"}</div></div>
      <div class="pog-kv"><div class="k">position</div><div class="v">${pos ? `${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}` : "—"}</div></div>
    `;
    s.metrics.list().forEach((sr) => {
      const sec = document.createElement("div");
      sec.innerHTML = `<h4>${sr.name}</h4>` + this.statRows(sr);
      const spark = new Sparkline({ width: 340, height: 36 });
      spark.draw(sr.samples.toArray());
      sec.appendChild(spark.canvas);
      host.appendChild(sec);
    });
  }

  private renderSceneDetail(host: HTMLElement, key: string): void {
    const entry = this.deps.scenes.list().find((x) => x.key === key);
    if (!entry) return;
    const meta = entry.tracked.meta;
    host.innerHTML = `<h4>scene ${key}</h4>
      <div class="pog-kv"><div class="k">renderer</div><div class="v">${meta.rendererType ?? "—"}</div></div>
      <div class="pog-kv"><div class="k">gpu</div><div class="v">${meta.gpuRenderer ?? "—"}</div></div>
    `;
    entry.tracked.metrics.list().forEach((s) => {
      const sec = document.createElement("div");
      sec.innerHTML = `<h4>${s.name}</h4>` + this.statRows(s);
      const spark = new Sparkline({ width: 340, height: 36 });
      spark.draw(s.samples.toArray());
      sec.appendChild(spark.canvas);
      host.appendChild(sec);
    });
  }
}
