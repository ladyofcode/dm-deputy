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

## PWA / tablet install

You do **not** open the repo or unzip `build/` on the tablet. The tablet needs a **URL in Chrome** — the app is a website that gets installed like an app.

### Deploy to Coolify (recommended)

Same pattern as **kitchen-bitchin**: Docker + Coolify HTTP auth.

1. Create a **Dockerfile** resource in Coolify pointing at this repo (Coolify detects the root `Dockerfile`).
2. Enable **HTTP Basic Auth** (or your Coolify access protection) on the resource — that keeps strangers off the URL.
3. The app’s `AuthGate` calls `/api/auth/check`; if Coolify auth succeeds, you tap **Begin** and the PWA loads.

The Node server (`adapter-node`) also sends the **COOP/COEP headers** required for SQLite in the browser (`src/hooks.server.ts`).

On the tablet: open your Coolify HTTPS URL in Chrome → sign in when prompted → **Add to Home screen**.

### Local preview

```sh
pnpm install
pnpm build
pnpm preview --host
```

Open the network URL on the tablet (same Wi‑Fi). Auth gate is skipped in dev; use Coolify auth in production.

### Important limits

- **HTTPS** is required on the tablet for service workers, offline caching, and OPFS database storage.
- Campaign data lives **in each browser** (OPFS). Export backups from Settings if you switch devices.
- Coolify auth protects the **site URL**, not individual campaigns inside the app.

See Chrome DevTools → Application to verify the manifest and service worker.

## What is committed vs local

| Committed                         | Local only (`ignorable/` or generated)           |
| --------------------------------- | ------------------------------------------------ |
| `src/lib/db/migrations.ts`        | `ignorable/catalog-seed/dnd5e/*.json` (optional) |
| `scripts/build-app-db.ts`         | `ignorable/PLAN.md`, `ignorable/old.erd.json`    |
| `scripts/catalog-seed/insert.mjs` | `static/dm-deputy.sqlite`                        |
| App source                        | Browser user database + backups                  |
