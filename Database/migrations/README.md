# Database changes

All scripts are manual, versioned SQL. The API does not apply schema changes at startup and no script in this directory has been run against a database by this change.

## Layout

- `migrations/local/`: administrative catalog in `kindmetricscte`.
- `migrations/company/`: operational per-Company schemas. Existing method resources remain there.
- `seeds/local/`: idempotent administrative metadata only.
- `stored-procedures/local/` and `stored-procedures/company/`: reserved for future split scripts; the current migration keeps DDL and procedures together because that matches the existing `Database/05_extraction_methods.sql` deployment convention.

## Applying the local extraction catalog

1. Back up the target schema and confirm the intended local server; the runner requires `MYSQL_DATABASE=kindmetricscte`, `APPLY_LOCAL_EXTRACTION_CATALOG=1`, and refuses `NODE_ENV=production`.
2. Set `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, and optional `MYSQL_PORT` / `MYSQL_CONNECT_TIMEOUT` through the environment. Never place credentials in source control or command history.
3. From the API project directory, run `node Database/apply_local_extraction_catalog.js`. The runner checks the migration record and all expected objects; it exits without reapplying a complete migration and stops for partial/untracked objects.
4. Verify the five tables, ten CRUD procedures, foreign keys and migration record in MySQL 8.4.
5. Apply `seeds/local/2026-10-26_extraction_catalog_seed.sql` only after the migration. Re-running this seed is safe by unique keys.

MySQL DDL auto-commits and does not provide a reliable transactional rollback. There is intentionally no automatic production migrator and no destructive rollback script. To recover a partial migration, inspect actual state and prepare a reviewed forward-fix; do not use `DROP`, `TRUNCATE`, or assume rollback reverted DDL.

## Data ownership and execution

Providers, connector metadata, connector snapshots and connector parameter/authentication definitions belong in the local administrative database. Existing `extraction_methods`, their requests/fields/versions and equipment bindings remain in each Company database for compatibility with current API/UI contracts. No cross-schema foreign key is used; until an approved identifier mapping is introduced, `protocol` remains the method's existing connector-family contract.

`driver_key` is nullable and must match an installed, allowlisted runtime driver before execution is added. Seed connectors set `executionAvailable=false`; records describe metadata only. Secrets must be stored outside these tables and referenced by a credential vault reference. Secret defaults are rejected by the schema constraint.