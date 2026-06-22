# DM Deputy

A PWA for running D&D campaigns — local SQLite in the browser, offline-capable on Android.

## Fresh clone setup

1. **Install dependencies**

   ```sh
   pnpm install
   ```

2. **Run the app**

   ```sh
   pnpm dev
   ```

   `predev` runs `pnpm run build:db` automatically, which creates `static/dm-deputy.sqlite` (schema + optional ruleset seed). That file is gitignored and rebuilt locally.

3. **Open in the browser**

   Visit the URL Vite prints (usually `http://localhost:5173`). On first load the app initialises a local database in the browser (OPFS when available).

### Optional: bulk-import ruleset data

To pre-fill spells, weapons, armor, and items from JSON instead of starting with empty catalog tables, copy seed files into:

```
ignorable/
  catalog-seed/dnd5e/
    armor.json
    items.json
    spells.json
    weapons.json
```

This folder is gitignored. Restore it from backup if you have one, then run `pnpm run build:db` (or restart `pnpm dev`).

## Data model

The app uses one SQLite schema for everything:

| Layer         | Contents                                         | Where it lives                                                                                   |
| ------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| **Template**  | Full schema (campaigns, catalog tables, etc.)    | Built to `static/dm-deputy.sqlite` — catalog empty by default, or filled from optional seed JSON |
| **User data** | Your campaigns, adventures, story nodes, backups | Browser only (OPFS on your device), cloned from the template on first init                       |

The database file is not committed to the repo.

## Getting data into the app

Data can come from seed/migration files **or** be added manually through the app. You do not need local seed files to run the project.

**Ruleset catalog (spells, items, etc.)**

- **Empty start** — default on a fresh clone; catalog tables exist but contain no rows.
- **JSON seed** — optional files in `ignorable/catalog-seed/dnd5e/`, loaded by `pnpm run build:db`.
- **Manual / UI** — add catalog entries through the app as those flows are built.

**Campaign / adventure data (your game content)**

- **Manual entry** — create campaigns and adventures through the app UI; data is stored in local SQLite (OPFS).
- **JSON migration** — story data previously stored in `localStorage` is migrated into SQLite on first init if present.
- **Backup import** — restore a `.sqlite` backup from Settings → Import backup.

Once you have real data, export backups from Settings and store them outside the repo (e.g. Google Drive).

## Scripts

| Command             | Purpose                                                           |
| ------------------- | ----------------------------------------------------------------- |
| `pnpm dev`          | Dev server (builds app DB template first)                         |
| `pnpm build`        | Production build (builds app DB template first)                   |
| `pnpm preview`      | Preview production build                                          |
| `pnpm run build:db` | Build `static/dm-deputy.sqlite` (empty catalog or from seed JSON) |
| `pnpm check`        | Typecheck                                                         |
| `pnpm lint`         | Lint                                                              |
| `pnpm format`       | Format                                                            |

## PWA / phone install

Build and serve over HTTPS (or use `pnpm preview --host` on your LAN for testing). Install from Chrome → “Add to Home screen”. See DevTools → Application to verify manifest and service worker.

The app uses `@sqlite.org/sqlite-wasm` in a web worker. Deployed hosts need COOP/COEP headers (configured in `vite.config.ts` and `src/hooks.server.ts` for dev/preview/production).

## What is committed vs local

| Committed                         | Local only (`ignorable/` or generated)           |
| --------------------------------- | ------------------------------------------------ |
| `src/lib/db/migrations.ts`        | `ignorable/catalog-seed/dnd5e/*.json` (optional) |
| `scripts/build-app-db.ts`         | `ignorable/PLAN.md`, `ignorable/old.erd.json`    |
| `scripts/catalog-seed/insert.mjs` | `static/dm-deputy.sqlite`                        |
| App source                        | Browser user database + backups                  |
