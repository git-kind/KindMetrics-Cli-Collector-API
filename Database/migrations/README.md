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

## Applying Company Services

The Company Services module is deployed only to `km_company_1ab38c98cf5f11f1b541a6d1e9ab77e1` for the current development integration. It adds `service_types`, `service_drivers`, `service_type_drivers`, `service_auth_types`, `service_driver_auth_types`, `services`, `service_connections`, `service_credentials` and `service_versions`, plus eighteen `sp_service_*` procedures.

1. The runner loads `.env.dev`, requires `APPLY_COMPANY_SERVICES=1`, refuses production and uses the schema identifier as a fixed, escaped mysql2 database option.
2. Run `node Database/_apply_company_services_once.js`. It verifies `SELECT DATABASE()`, refuses partial/untracked objects, and checks all tables and procedures before reporting success.
3. Apply `Database/seeds/company/2026-10-26_services_seed.sql` to that schema. The seed is idempotent and marks all catalog drivers `NOT_IMPLEMENTED`.
4. The collation repair runner is `node Database/_repair_company_services_once.js`; it uses a forward-only migration record and verifies the Company schema collation plus all eleven foreign keys.
5. The secret-redaction procedure migration is `node Database/_apply_company_services_secret_redaction_once.js`; it removes `authConfig` from API result sets and version snapshots.
6. Apply driver/auth compatibility with `node Database/_apply_company_services_auth_validation_once.js`; unsupported auth types are rejected by `sp_service_connection_upsert`.
7. `node Database/_test_company_services_once.js` performs disposable create/list/update/duplicate/status/version/usage/delete and driver/auth compatibility checks and cleans up only the IDs it creates.

The API does not connect to a vault. `service_credentials` stores only `vault://` or `secret://` references; connection `authConfig` is not returned or copied into immutable snapshots. Collector Services are now linked by the Company-local `collectors.service_id` FK; existing Extraction Methods objects remain unchanged.

## Applying Company Collectors

The Company Collectors schema is installed only in `km_company_1ab38c98cf5f11f1b541a6d1e9ab77e1`. The verified `services.id`, `extraction_methods.id` and `extraction_method_versions.id` are `BIGINT UNSIGNED`. The migration creates twelve tables and 25 `sp_collector_*` procedures, including `collectors.service_id BIGINT UNSIGNED NOT NULL` with `idx_collectors_service_id` and `fk_collectors_service` referencing `services(id) ON DELETE RESTRICT`.

1. The runner requires `APPLY_COMPANY_COLLECTORS=1`, refuses `NODE_ENV=production`, connects only to the fixed schema, verifies `SELECT DATABASE()`, and resumes only expected partial objects. `DRY_RUN=1` reports parsed object counts without executing DDL.
2. Run `node Database/_apply_company_collectors_once.js`. Verify `company-2026.10.26-collectors`, 12 tables, 25 procedures and 19 foreign keys in `information_schema`.
3. Run `node Database/_apply_company_collector_service_dependency_once.js`; it replaces only `sp_service_get_usage` and `sp_service_delete` to count/block Collector dependencies.
4. Run `node Database/_apply_company_collectors_method_collation_once.js`; it installs the protocol comparison using explicit collation because legacy Extraction Methods use `utf8mb4_0900_ai_ci` while Services/Collectors use `utf8mb4_unicode_ci`.
5. Run `node Database/_apply_company_collectors_method_collation_once.js`; it compares legacy Extraction Method protocols with Service driver keys under an explicit collation.
6. Run `node Database/_apply_company_collector_runtime_safety_once.js`; it serializes queue policy decisions per Collector and enforces checkpoint optimistic locking.
7. Run `node Database/_apply_company_collector_claim_concurrency_once.js`; it locks the Collector row while applying `max_concurrency` to worker claims.
8. `node Database/_test_company_collectors_once.js` performs disposable SQL checks for Service 1:N, invalid references, method compatibility, full configuration, snapshots, duplicate, queue claim/finish, overlap, concurrency limit, checkpoints and Service deletion blocking. It removes only generated test IDs.
9. With the API running on the selected test port, `node Database/_test_company_collectors_http_once.js` exercises REST with `X-Company-Code` and cleans temporary records through the API.

No Equipment table exists in the inspected Company schema, so `collector_targets.equipment_id` is nullable and indexed but deliberately has no invented FK. Extraction Method and version FKs are local to this same schema. JSON config rejects secret-like keys; Service credentials remain external vault references. `POST /collectors/:id/run` creates a durable `QUEUED` execution only; this API does not execute collectors and Collector-BS must claim jobs through `sp_collector_execution_claim`.

MySQL DDL auto-commits and does not provide a reliable transactional rollback. There is intentionally no automatic production migrator and no destructive rollback script. To recover a partial migration, inspect actual state and prepare a reviewed forward-fix; do not use `DROP`, `TRUNCATE`, or assume rollback reverted DDL.

## Data ownership and execution

Providers, connector metadata, connector snapshots and connector parameter/authentication definitions belong in the local administrative database. Existing `extraction_methods`, their requests/fields/versions and equipment bindings remain in each Company database for compatibility with current API/UI contracts. No cross-schema foreign key is used; until an approved identifier mapping is introduced, `protocol` remains the method's existing connector-family contract.

`driver_key` is nullable and must match an installed, allowlisted runtime driver before execution is added. Seed connectors set `executionAvailable=false`; records describe metadata only. Secrets must be stored outside these tables and referenced by a credential vault reference. Secret defaults are rejected by the schema constraint.