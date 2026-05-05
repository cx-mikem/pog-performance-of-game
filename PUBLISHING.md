# Publishing phaser-pog

POG currently lives inside Starcore at `client/src/plugins/phaser-pog/`. This
directory is self-contained — no Starcore imports leak into it — so extracting
it to a standalone repo is a `cp` and a `git init`.

This guide covers two release paths. **Do path 1 first.** Promote to path 2
only after the API has stabilized and you've gotten external feedback.

---

## Path 1 — Public GitHub repo (recommended starting point)

People install via git URL or copy files. No npm, no version churn, no
breaking-change theatrics. Half an hour, end to end.

### One-time setup

The repo is `github.com/cx-mikem/pog-performance-of-game`. The npm package
name stays `phaser-pog` (more discoverable than the repo slug; npm name
and repo name don't have to match).

```bash
# 1. Copy the package out of Starcore (run from the Starcore checkout)
cp -r client/src/plugins/phaser-pog ~/repos/pog-performance-of-game
cd ~/repos/pog-performance-of-game

# 2. Init the repo and push to the existing GitHub repo
git init -b main
git add .
git commit -m "Initial release: POG 0.2.0"
git remote add origin https://github.com/cx-mikem/pog-performance-of-game.git
git push -u origin main
```

If the GitHub repo already has commits (e.g., a default README from
creation), either `--force` the push or pull and merge first:

```bash
git pull origin main --allow-unrelated-histories
git push -u origin main
```

### What people do to use it

```bash
# Repo install (works without npm publish):
npm install github:cx-mikem/pog-performance-of-game

# Or pin a commit / tag:
npm install github:cx-mikem/pog-performance-of-game#v0.2.0
```

Or just copy the directory into their project. Both work because the source
is plain TypeScript — no build step required for in-tree use (Starcore does
exactly this today).

### Polish before announcing

- Add 2-3 screenshots / GIFs of the overlay to the README. The culling
  widget is the most visually striking — open the overlay in a busy scene
  and grab the cull-rate %.
- Set a clear social card on the repo (Settings → Social Preview) so links
  preview nicely on Discord/Twitter.
- Pin a "feedback welcome" issue.

### Where to post

- [Phaser Discord](https://discord.gg/phaser) — `#showcase` channel
- [Phaser Forum](https://phaser.discourse.group/) — Showcase category
- [r/phaser](https://www.reddit.com/r/phaser/)
- [r/gamedev](https://www.reddit.com/r/gamedev/) — only if it lands well in r/phaser first
- Tag `@phaser_` on Twitter — they sometimes RT plugins

The hook is: *"Live debug overlay for Phaser. Single-player perf
debugging plus opt-in multiplayer netcode telemetry. One screenshot of
the culling widget."*

---

## Path 2 — npm package (when ready)

Promote to npm once the API has stopped wiggling and you have at least a
few external users with feedback.

### One-time

```bash
# 1. npm account + login
npm login

# 2. Verify the name is free
npm view phaser-pog
# (404 = available)

# 3. Build and inspect what gets published
npm install
npm run build
npm pack --dry-run
# Should show only dist/, README.md, LICENSE, CHANGELOG.md, package.json
```

### First publish

```bash
npm publish --access public
```

`prepublishOnly` runs `typecheck` then `build` automatically — if either
fails the publish aborts.

### Subsequent releases

```bash
# Bump the version (one of: patch | minor | major)
npm version patch -m "Release %s"

# Update CHANGELOG.md
# (move Unreleased → new version section)

# Push tag and main
git push --follow-tags

# Publish
npm publish
```

### Semver discipline (post-1.0.0)

- **patch** — bug fixes, doc-only changes, internal refactors that don't
  affect the published `.d.ts`.
- **minor** — new exports, new options on existing exports with safe
  defaults, new tabs, new metric kinds.
- **major** — renaming an exported symbol, removing one, changing a
  function signature, changing a default that users rely on.

Pre-1.0 (current state) you can break things in minor versions. Just say
so in CHANGELOG.

---

## What to skip

- **Gists** — wrong shape for a 13-file multi-directory package. They
  render badly, no issues, no tree view, no `npm install`-able.
- **Monorepo workspaces inside Starcore** — overkill until you have
  multiple shareable packages.
- **Custom build tools** — `tsup` covers ESM + CJS + `.d.ts` generation
  in one config. Don't add rollup/esbuild plumbing you don't need.

---

## Maintaining the in-tree copy

Until you `npm install phaser-pog` from within Starcore, the
`client/src/plugins/phaser-pog/` directory IS the canonical source. When
you fix a bug in the standalone repo, copy the relevant files back into
Starcore and commit there too. Once published, replace the in-tree copy
with `npm install phaser-pog` and delete the directory.
