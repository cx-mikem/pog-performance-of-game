import type Phaser from "phaser";
import type { TrackedScene } from "../inspectors/SceneInspector";

function getPhaserMajor(): number {
  const v = (globalThis as any).Phaser?.VERSION as string | undefined;
  if (!v) return 0;
  const m = /^(\d+)/.exec(v);
  return m ? Number(m[1]) : 0;
}

export function instrumentDrawCalls(scene: Phaser.Scene, tracked: TrackedScene): () => void {
  const renderer: any = scene.game.renderer;
  if (!renderer) return () => {};

  const phaserMajor = getPhaserMajor();
  const isWebGL = typeof renderer.gl !== "undefined";

  if (phaserMajor >= 4) {
    return instrumentPhaser4(scene, tracked, renderer);
  }

  if (isWebGL && typeof renderer.gl.drawArrays === "function") {
    return instrumentPhaser3WebGL(scene, tracked, renderer);
  }

  return instrumentPhaser3Fallback(scene, tracked, renderer);
}

function instrumentPhaser4(scene: Phaser.Scene, tracked: TrackedScene, renderer: any): () => void {
  if (typeof renderer.drawCount === "number") {
    const onRender = () => tracked.recordDrawCalls(renderer.drawCount);
    scene.events.on("render", onRender);
    return () => scene.events.off("render", onRender);
  }

  const renderNodes = renderer.renderNodes;
  if (renderNodes && typeof renderNodes.setDebug === "function") {
    let nodeCount = 0;
    let active = true;
    try { renderNodes.setDebug(true); } catch { /* swallow */ }

    const sample = () => {
      if (typeof renderNodes.debugStack?.length === "number") {
        nodeCount = renderNodes.debugStack.length;
      } else if (typeof renderNodes.debugToString === "function") {
        try { nodeCount = String(renderNodes.debugToString()).split("\n").filter(Boolean).length; } catch { /* swallow */ }
      }
      if (nodeCount > 0) tracked.recordDrawCalls(nodeCount);
    };
    scene.events.on("render", sample);
    return () => {
      active = false;
      scene.events.off("render", sample);
      if (active === false) { try { renderNodes.setDebug(false); } catch { /* swallow */ } }
    };
  }

  if (typeof console !== "undefined" && !(globalThis as any).__pogPhaser4Warned) {
    (globalThis as any).__pogPhaser4Warned = true;
    console.info("[POG] Draw-call instrumentation skipped: this Phaser 4 build does not expose renderer.drawCount or renderer.renderNodes.setDebug. FPS, frameMs, sprite count, and culling still work.");
  }
  return () => {};
}

function instrumentPhaser3WebGL(scene: Phaser.Scene, tracked: TrackedScene, renderer: any): () => void {
  let count = 0;
  const gl = renderer.gl as WebGLRenderingContext;
  const origDrawArrays = gl.drawArrays.bind(gl);
  const origDrawElements = gl.drawElements.bind(gl);
  gl.drawArrays = function patchedDrawArrays(this: WebGLRenderingContext, ...args: Parameters<WebGLRenderingContext["drawArrays"]>) {
    count++;
    return origDrawArrays(...args);
  } as any;
  gl.drawElements = function patchedDrawElements(this: WebGLRenderingContext, ...args: Parameters<WebGLRenderingContext["drawElements"]>) {
    count++;
    return origDrawElements(...args);
  } as any;
  const sampleAndReset = () => {
    tracked.recordDrawCalls(count);
    count = 0;
  };
  scene.events.on("postupdate", sampleAndReset);
  return () => {
    gl.drawArrays = origDrawArrays as any;
    gl.drawElements = origDrawElements as any;
    scene.events.off("postupdate", sampleAndReset);
  };
}

function instrumentPhaser3Fallback(scene: Phaser.Scene, tracked: TrackedScene, renderer: any): () => void {
  const onRender = () => {
    if (typeof renderer.drawCount === "number") {
      tracked.recordDrawCalls(renderer.drawCount);
      return;
    }
    if (renderer.pipelines && typeof renderer.pipelines.flushCount === "number") {
      tracked.recordDrawCalls(renderer.pipelines.flushCount);
    }
  };
  scene.events.on("render", onRender);
  return () => scene.events.off("render", onRender);
}
