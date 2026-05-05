# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0]

### Added
- Phaser 4 support. The plugin auto-detects the Phaser major version at
  runtime and switches behavior where the API differs.
- Draggable overlay window. Grab the header and move it anywhere; the
  position persists across reloads in `localStorage` under
  `pog-overlay-position`. Click the close/export buttons in the header
  without triggering a drag.
- Position is clamped to the viewport with at least 60px always visible.

### Changed
- `peerDependencies.phaser` widened to `>=3.60.0 <5.0.0` to cover both
  Phaser 3.60+ and Phaser 4.x.
- `instrumentDrawCalls`: in Phaser 4, no longer monkey-patches
  `gl.drawArrays / gl.drawElements` (the v4 docs explicitly warn against
  direct `gl` calls because they bypass the new `WebGLGlobalWrapper`).
  Falls back to `renderer.drawCount` when present, then to the new
  `renderer.renderNodes.setDebug(true)` debug stack for node counts.
  Phaser 3 path is unchanged.
- Overlay default position changed from `right: 12px` to a left-anchored
  equivalent so the header stays draggable.

## [0.1.0]

### Added
- Initial public release.
- Global `PogPlugin` with `registerPog()` helper, hotkey toggle (backtick), and `?pog=1` URL flag.
- DOM overlay with five tabs: scenes, culling, entities, sprites, global.
- `SceneInspector` auto-collects fps, frameMs, spriteCount, zoom, GPU renderer, and (with `instrumentDrawCalls`) draw calls per frame.
- `CullingInspector` with stacked-bar visualization of visible vs processed entity counts and per-kind breakdown.
- `EntityInspector` for per-entity reconcile error, prediction error, and server vs predicted position.
- `SpriteInspector` for any Phaser GameObject with auto-detach on destroy.
- `MetricsRegistry` for free-form named series with last/min/max/mean/p95 stats.
- Sparkline rendering for all time-series.
- Session export to JSON for attaching to bug reports.
- Adapters: `attachColyseus`, `attachWebSocket`, `instrumentDrawCalls`.
- TypeScript-first with full type definitions.
