# KindMetrics-Cli-Collector-API

KindMetrics-Cli-Collector-API is the REST API foundation for the KindMetrics ecosystem.

This repository is intentionally limited to the base architecture of the collector API. It does not implement the functional business modules yet, but it does prepare the technical structure required for future modules such as Installation, Company, Database, Equipment, Discovery, Extraction Methods, Collectors, Mapping, Execution, Logs, Storage and Synchronization.

The project follows the architectural decisions defined by the global KindMetrics documentation and keeps the responsibility boundaries explicit from the beginning.

## Objective of this stage

The purpose of this first phase is to establish the base platform that will later support the full KindMetrics collector ecosystem without changing the architecture as modules are added.

This stage includes:

- NestJS project initialization
- TypeScript configuration
- ESLint and Prettier setup
- Environment-based configuration
- Global validation
- Centralized error handling
- Logging foundation
- Health endpoint
- MySQL infrastructure preparation
- Repository abstractions
- Security and CompanyContext base infrastructure
- JWT infrastructure groundwork
- Base modules and folders for future features

This stage does not include full CRUD or complete domain implementations for the future modules.

## Architectural principles

The architecture must be:

- Modular
- Domain-oriented
- Layered
- Repository-oriented
- Explicitly separated between Application and Infrastructure
- Separated between Administration Repository and Query Repository

The conceptual dependency flow is:

HTTP / REST
    ↓
Security / Company Context
    ↓
Controllers
    ↓
DTOs / Validation
    ↓
Services
    ↓
Entities / Domain Models
    ↓
Repository Interfaces
    ↓
Repository Implementations
    ↓
MySQL Executors
    ↓
MySQL

## Responsibility layers

### 1. HTTP / REST

Responsibility:

- Receive HTTP requests
- Execute controllers
- Receive DTOs
- Return HTTP responses
- Delegate business tasks to the application layer

The HTTP layer must not contain:

- business logic
- SQL
- direct MySQL access
- database connection code

### 2. DTO / Validation

Responsibility:

- define request and response contracts
- validate input data
- validate required fields
- validate types
- validate UUIDs
- validate enums
- validate ranges and formats

DTOs are contract objects, not business logic containers.

### 3. Security

A transversal security layer must be prepared for:

- JWT authentication
- authorization
- permission validation
- user identity
- Company access validation

JWT represents the authenticated identity.

The access to Company and permissions must be validated in the API, not based only on the JWT token. The API is the final authority.

### 4. Company Context

A CompanyContext mechanism is required.

The client sends:

- Authorization: Bearer <JWT>
- X-Company-Id: <CompanyId>

The header X-Company-Id identifies the Company the client wants to use. This value must never be trusted blindly.

The API must:

1. validate the JWT
2. obtain the UserId
3. obtain X-Company-Id
4. validate that the Company exists
5. validate that the user has access to the Company
6. generate a CompanyContext for the request

Conceptually:

- companyId
- userId
- permissions

The frontend must never be able to determine the physical database directly.

The frontend must never send the physical database name as a decision point for backend execution.

### 5. Application / Services

Services contain business use cases and orchestration logic.

Responsibilities:

- validation of business rules
- orchestration between domain entities
- coordination between repositories
- validation of relationships
- enforcement of domain rules

Services must not:

- execute SQL directly
- use mysql2 directly
- build SQL or stored procedures directly
- know MySQL connection details
- read configuration from process.env across the codebase

### 6. Entities / Domain Models

The project includes a domain layer for entities and models.

These are not TypeORM entities and not ORM decorators.

They represent the domain model of KindMetrics, and can later evolve into:

- Company
- User
- Capability
- Permission
- UserCompanyAccess
- Equipment
- ExtractionMethod
- Collector
- Mapping
- Storage

This stage does not predefine all final entities, but it creates the base structure so that future domain objects can be introduced cleanly.

### 7. Repositories

The repository pattern is mandatory.

Modules depend on repository contracts, not on concrete persistence implementations.

The project separates the repositories into:

- Administration Repository
- Query Repository

This avoids mixing configuration and administrative operations with analytical or read-heavy query logic in the same abstraction.

## Administration Repository

Responsibility:

- create
- update
- delete
- read administrative configuration
- manage Company
- manage Equipment
- manage Extraction Methods
- manage Collectors
- manage Mappings
- other administrative tasks

The Administration Repository is expected to use Stored Procedures when appropriate.

Conceptual flow:

Controller
    ↓
Service
    ↓
Administration Repository
    ↓
MySqlStoredProcedureExecutor
    ↓
Stored Procedure
    ↓
MySQL

Repository implementations must not contain business rules.

## Query Repository

Responsibility:

- read and query operational data
- support dashboards and metrics
- support query-builder and exploratory requests
- fetch dataset information
- return structured query output

Conceptual flow:

Controller
    ↓
Service
    ↓
Query Repository
    ↓
MySqlQueryExecutor
    ↓
Parameterized SQL
    ↓
MySQL

Queries must use parameterized SQL only.

The API must validate:

- Company
- User
- Permissions
- Datasource
- Query definition
- Allowed tables
- Allowed fields
- Parameters
- Limits
- Timeout

No arbitrary SQL from the frontend should be accepted without validation.

## MySQL infrastructure

The MySQL infrastructure is separated from the application layer.

The conceptual structure is:

```text
src/
└── infrastructure/
    └── database/
        └── mysql/
            ├── mysql.module.ts
            ├── mysql.connection.ts
            ├── mysql-query.executor.ts
            └── mysql-stored-procedure.executor.ts
```

### MySqlQueryExecutor

Responsibilities:

- execute parameterized SQL
- manage database connections
- return structured results
- stay free of business logic

### MySqlStoredProcedureExecutor

Responsibilities:

- invoke stored procedures
- manage input parameters
- return procedure results
- stay free of business logic

The stored procedure executor and the SQL query executor are separated intentionally. They are not merged into a single generic executor.

## Transactions

The infrastructure is prepared for transaction handling in a future stage.

Conceptually:

BEGIN
    operation A
    operation B
    operation C
COMMIT

In case of failure:

ROLLBACK

This base layer prepares the pattern without implementing module-specific transaction logic yet.

## Configuration

The project supports environment-based configuration with the following patterns:

- .env.example
- .env-dev
- .env-qa
- .env-prod

The configuration is centralized and should not be accessed directly throughout the application.

The configuration covers:

- Environment
- Port
- MySQL
- JWT
- Logging
- API
- Other technical parameters

Sensitive environment files are not committed when they contain real secrets.

The CompanyId is not stored in the environment as a fixed value. Company context belongs to the request and is resolved at runtime.

## Error handling

A centralized error-handling layer is prepared.

This includes:

- exception filters
- HTTP errors
- application errors
- persistence errors
- authentication errors
- authorization errors

The API must not expose:

- SQL
- internal stack traces
- passwords
- secrets
- connection strings
- tokens
- sensitive information

## Logging

A technical logging layer is prepared.

It separates technical logs from future execution logs for collectors.

Technical logs may include:

- requests
- authentication failures
- authorization failures
- database errors
- application errors
- startup and shutdown events

They must not include:

- passwords
- full JWTs
- secrets
- database passwords
- full connection strings

## Infrastructure

The infrastructure layer contains technology-specific implementations.

Example structure:

```text
src/
├── infrastructure/
│   ├── database/
│   │   └── mysql/
│   ├── repositories/
│   │   ├── administration/
│   │   └── query/
│   ├── security/
│   └── logging/
```

The application and modules should not depend directly on infrastructure implementations when an interface or contract exists.

## Dependency direction

The project follows the rule:

HTTP
    ↓
Application
    ↓
Repository Contracts
    ↓
Infrastructure

This means the following are not allowed:

- Controller -> MySQL
- Controller -> mysql2
- Service -> MySQL
- Service -> mysql2
- Service -> SQL
- Controller -> Stored Procedure
- Controller -> Repository Implementation

## Initial project structure

The initial base structure is:

```text
src/
├── main.ts
├── app.module.ts
│
├── config/
│   ├── configuration.ts
│   ├── database.config.ts
│   ├── security.config.ts
│   └── environment.ts
│
├── common/
│   ├── auth/
│   ├── authorization/
│   ├── company-context/
│   ├── decorators/
│   ├── errors/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── logging/
│   ├── middleware/
│   └── validation/
│
├── entities/
│
├── modules/
│   ├── auth/
│   ├── installation/
│   ├── company/
│   ├── equipment/
│   ├── discovery/
│   ├── extraction-method/
│   ├── collector/
│   ├── data-structure/
│   ├── mapping/
│   ├── execution/
│   ├── logs/
│   ├── storage/
│   ├── synchronization/
│   └── query/
│
└── infrastructure/
    ├── database/
    │   └── mysql/
    │       ├── mysql.module.ts
    │       ├── mysql.connection.ts
    │       ├── mysql-query.executor.ts
    │       └── mysql-stored-procedure.executor.ts
    │
    ├── repositories/
    │   ├── administration/
    │   └── query/
    │
    ├── security/
    └── logging/
```

Not all modules are implemented in this stage. The skeleton is prepared to allow gradual domain evolution without breaking architecture.

## Future module structure

When a domain module is implemented, it should follow this pattern:

```text
modules/
└── collector/
    ├── collector.module.ts
    ├── collector.controller.ts
    ├── collector.service.ts
    │
    ├── dto/
    │   ├── create-collector.dto.ts
    │   └── update-collector.dto.ts
    │
    └── repositories/
        ├── collector-administration.repository.ts
        └── collector-query.repository.ts
```

The concrete repository implementations would live in the infrastructure layer:

```text
infrastructure/
└── repositories/
    ├── administration/
    │   └── collector-administration.repository.impl.ts
    │
    └── query/
        └── collector-query.repository.impl.ts
```

## Authentication model

JWT is the base REST authentication mechanism.

The intended flow is:

Login
    ↓
Credential validation
    ↓
JWT generation
    ↓
KindMetrics-UI
    ↓
Authorization: Bearer <JWT>

A complex refresh-token mechanism is not implemented in this initial phase unless the architecture explicitly requires it later.

## Axios restriction

Axios is not used as the MySQL communication mechanism inside this API.

Axios is mainly for client-side HTTP consumption, such as UI applications.

The API uses:

- NestJS HTTP layer
- MySQL driver
- repository pattern
- MySQL executors

Only if a future module needs external HTTP integration will a dedicated client mechanism be evaluated.

## Collector-BS relationship

Collector-BS is not implemented in this stage.

The architecture is, however, prepared for a future pattern:

KindMetrics-Cli-Collector-API
        ↓
configuration and administration
        ↓
KindMetrics-Cli-Collector-BS
        ↓
Scheduler
        ↓
Extraction Methods
        ↓
Mapping
        ↓
Storage

The API remains the authority for configuration and management; it does not become the scheduler of acquisition.

## Frequency domain rule

Acquisition frequency belongs to the Collector domain and not to the Extraction Method.

- ExtractionMethod: how to connect, from where to fetch data, what is available
- Collector: what to fetch, when to fetch, how to transform, where to store

## Important rules

The architecture explicitly forbids:

- SQL in controllers
- SQL in services
- direct controller-to-MySQL access
- TypeORM as the primary persistence mechanism
- a single generic repository mixing administration and query work
- arbitrary SQL from the frontend without validation
- blind trusting of X-Company-Id
- frontend deciding the physical database name
- storing secrets in code or logs
- putting the acquisition scheduler into the API
- duplicating Company access logic in every service

The architecture explicitly allows:

- JWT
- CompanyContext
- X-Company-Id validation
- authorization checks
- DTO validation
- services
- entities
- repository pattern
- administration repositories
- query repositories
- stored procedure executor
- query executor
- MySQL connection pool
- transactions
- centralized configuration
- centralized error handling
- centralized logging
- ESLint
- Prettier

## Scope of this first stage

This stage does not implement complete business functionality. It creates the correct base architecture for the API.

The following are created as part of the technical foundation:

- NestJS project
- TypeScript
- ESLint
- Prettier
- environment configuration
- centralized configuration
- project structure
- common layer
- base entities structure
- infrastructure layer
- MySQL module
- MySQL connection
- query executor
- stored procedure executor
- base repository contracts
- centralized error handling
- base logging
- JWT infrastructure base
- CompanyContext infrastructure base
- guards base
- validation base
- health endpoint

The following are intentionally not implemented yet:

- complete Business CRUD modules
- full domain logic for Company, Equipment, Collector, Mapping, Storage and similar

## Documentation rule

Before implementing files or modules, the project must inspect the current repository state and any existing documentation. Existing documentation is never replaced or deleted. If the architecture is not fully defined, no silent guesses are introduced.

## Final objective

The first stage must leave a functional NestJS base API with:

- solid folder structure
- layered architecture
- environment configuration
- base entities
- MySQL infrastructure
- repository abstraction
- error handling
- logging
- JWT and CompanyContext groundwork
- validation layer
- health endpoint

The work is intentionally limited to architecture and infrastructure so the future business modules can be developed consistently without architectural debt.

## Commands

Typical commands for this stage:

```bash
npm install
npm run start:dev
npm run build
npm run lint
npm run format
npm run format:check
npm run type-check
```

## Status

This repository is in the technical-base phase and is not yet a complete business implementation.

The next stages will continue by creating the domain modules in a controlled order, always preserving the architectural boundaries already established here.
