# KindMetrics-Cli-Collector-API

> **Proyecto:** KindMetrics
> **Componente:** API local del Collector (también denominada informalmente `KindMetricsCte-API`)
> **Estado auditado:** 26-10-2026. NestJS con Fastify; implementados login, health, CRUD de Companies, creación explícita de schema por Company, CRUD agregado de Extraction Methods con CompanyContext y `POST /api/v1/queries/execute` (501 intencionalmente). El aprovisionamiento automatizado de schemas Company y la autorización CUSTOMER por identidad de instalación siguen pendientes.
> **Fuente:** decisiones globales en `docs/`; el estado de implementación se contrasta con el código de este repositorio.

## 1. Objetivo

`KindMetrics-Cli-Collector-API` es la API REST local de administración y configuración del Collector de KindMetrics. Prepara la infraestructura necesaria para instalación, Company, base de datos, equipos, descubrimiento, métodos de extracción, Collectors, mapeos, ejecución, logs, almacenamiento y sincronización.

Su responsabilidad principal es exponer operaciones de configuración, consulta y administración del Collector; **no** ejecutar el scheduler de adquisición, que corresponde a `KindMetrics-Cli-Collector-BS`.

El proyecto debe mantener convenciones arquitectónicas compatibles con `KindMetricsAPI` sin confundir las responsabilidades del entorno central KIND con las del entorno local CUSTOMER.

## 2. Alcance y estado

La implementación actual contiene NestJS, TypeScript, Fastify, Swagger, validación HTTP, manejo centralizado de errores, logging, health check, login local, CRUD de Companies y Extraction Methods. La persistencia local comparte un único pool `kindmetricscte`; las bases Company usan pools separados administrados por un manager con máximo y expiración idle. `GET /health` consulta `SELECT 1` por el repository local de Queries. Auth y Company usan repositories locales de Stored Procedures. `POST /api/v1/queries/execute` valida su DTO con Zod y responde 501 sin ejecutar SQL.

Companies requiere JWT con `isPlatformAdmin`. Extraction Methods requiere JWT y CompanyContext: el resolver verifica acceso con las tablas existentes `users`, `user_roles` y `roles.company_id`, y obtiene `company.database_name`. El modelo no contiene configuración de host/credenciales por Company; todas las bases Company usan el servidor configurado en `MYSQL_HOST`/`MYSQL_PORT`/`MYSQL_USER`/`MYSQL_PASSWORD`. No se valida revocación de token contra DB en cada request. La identidad de instalación CUSTOMER no está cargada desde `kindCli.cfg`, por lo que todavía no se puede imponer su vínculo de Company. El SQL define procedimientos CRUD de usuarios, pero no hay controller/service HTTP asociados. Sincronización y conexión con Collector-BS también siguen pendientes.

## 3. Principios obligatorios

- Arquitectura modular, orientada a dominio y **por capas**.
- Convención principal de capas: **Controllers → Services → Repository Contracts → Repository Implementations → MySQL Executors → MySQL**.
- **Models** y DTOs son contratos de datos usados transversalmente; no una etapa de ejecución.
- Dependencias hacia abstracciones; las implementaciones se inyectan mediante NestJS.
- Separación explícita de Application e Infrastructure.
- Separación de repositorios administrativos (`StoredProcedures`) y de consulta (`Queries`).
- SQL exclusivamente en infraestructura de persistencia; nunca en Controllers o Services.
- Consultas parametrizadas; prohibido concatenar entradas no confiables en SQL.
- No introducir ORM como mecanismo principal sin una decisión arquitectónica aprobada.
- No modificar contratos HTTP existentes ni eliminar código aprobado durante refactorizaciones sin analizar su impacto.

### 3.1 Flujo de dependencias

```text
HTTP / REST
    |
Autenticación / autorización / validación
    |
Controllers
    |
Services  <---- Models / DTOs / Domain Models
    |
Repository Contracts (interfaces / tokens)
    |
Repository Implementations
    |
+-------------------------------+
| MySqlQueryExecutor            |
| MySqlStoredProcedureExecutor  |
+-------------------------------+
    |
MySQL: kindmetricscte
```

Los Guards, Filters, Interceptors, Logging, Config y CompanyContext son mecanismos transversales. No deben convertirse en capas que mezclen lógica de negocio con transporte o persistencia.

## 4. Capas y responsabilidades

### 4.1 Controllers

**Ubicación objetivo:** `src/Controllers/`.

- Definen rutas y métodos HTTP.
- Reciben parámetros y DTOs, y delegan a Services.
- Gestionan códigos de respuesta y contratos HTTP con mecanismos compartidos.
- No ejecutan SQL, Stored Procedures ni consultas con `mysql2`.
- No implementan reglas de negocio ni instancian repositorios concretos.

**Implementado:** `src/Controllers/Health/`, `src/Controllers/Queries/`, `src/Controllers/Auth/` y `src/Controllers/Company/`. Los módulos Nest de composición permanecen en `src/modules/`.

### 4.2 Models

**Ubicación objetivo:** `src/Models/`.

- DTOs de entrada y salida, modelos de dominio, tipos, interfaces de datos y enumeraciones.
- Validaciones estructurales de DTOs con las herramientas estándar de NestJS.
- Las entidades son **modelos de dominio**, no entidades TypeORM.
- No contienen acceso a bases de datos ni lógica de negocio.
- Evitar definiciones duplicadas entre `entities/`, `modules/*/dto/` y `Models/`.

Los DTOs HTTP existentes están centralizados en `src/Models/`, incluidos `Models/Auth/LoginRequestDto` y `LoginResponseDto`; no hay modelos de dominio funcionales todavía.

**Distinción:** los contratos de repositorios pueden ubicarse en `Repositories/Contracts/`; los Models no deben convertirse en un depósito de dependencias de infraestructura.

### 4.3 Services

**Ubicación objetivo:** `src/Services/`.

- Implementan casos de uso y reglas de negocio.
- Coordinan entidades y repositorios.
- Validan relaciones y reglas funcionales.
- Solicitan transacciones mediante contratos de infraestructura cuando corresponda.
- No ejecutan SQL ni Stored Procedures, no importan `mysql2` y no leen `process.env` de manera dispersa.

**Implementado:** `HealthService`, `AuthService`, `CompanyService` y `QueriesService`. Auth verifica Argon2 y emite JWT; Company coordina su repositorio y maneja conflictos y referencias existentes.

### 4.4 Repositories

**Ubicación objetivo:** `src/Repositories/`.

- `Contracts/`: interfaces y tokens de inyección para los Services.
- `StoredProcedures/`: implementaciones de administración y escritura mediante procedimientos almacenados **cuando corresponda**.
- `Queries/`: implementaciones de consultas parametrizadas y lecturas operacionales.
- Las implementaciones traducen entre modelos de dominio y resultados de persistencia.
- No implementan reglas de negocio.
- No se crea un repositorio genérico único que mezcle administración, escritura, consultas analíticas y acceso directo a conexiones.

**Implementado:** Health y Auth usan contratos separados; Company usa `CompanyRepository`/`MySqlCompanyRepository` mediante procedimientos `sp_companies_*`.

### 4.5 Infrastructure

**Ubicación objetivo:** `src/Infrastructure/`.

Contiene adaptadores específicos de tecnología: pool MySQL, ejecutores, configuración técnica de seguridad y logging. No debe albergar reglas de dominio.

## 5. Estructura objetivo del proyecto

La estructura siguiente expresa **responsabilidades y convenciones**, no obliga a crear carpetas o archivos vacíos. Los módulos NestJS continúan registrando Controllers, Providers y dependencias. Adaptar las rutas existentes de forma incremental.

```text
src/
├── main.ts
├── app.module.ts
├── Controllers/
│   ├── Health/
│   ├── Auth/
│   ├── Installation/
│   ├── Company/
│   ├── Users/
│   ├── Equipment/
│   ├── Collector/
│   ├── Synchronization/
│   └── Query/
├── Models/
│   ├── Common/
│   ├── Auth/
│   ├── Company/
│   ├── Users/
│   ├── Collector/
│   ├── Synchronization/
│   └── Query/
├── Services/
│   ├── Auth/
│   ├── Company/
│   ├── Users/
│   ├── Collector/
│   ├── Synchronization/
│   └── Query/
├── Repositories/
│   ├── Contracts/
│   ├── StoredProcedures/
│   └── Queries/
├── Modules/                 # Módulos de DI y composición NestJS
├── Infrastructure/
│   ├── Database/
│   │   └── MySQL/
│   │       ├── mysql.module.ts
│   │       ├── mysql.connection.ts
│   │       ├── mysql-query.executor.ts
│   │       └── mysql-stored-procedure.executor.ts
│   ├── Security/
│   └── Logging/
├── Common/
│   ├── Auth/
│   ├── Authorization/
│   ├── CompanyContext/
│   ├── Decorators/
│   ├── Errors/
│   ├── Filters/
│   ├── Guards/
│   ├── Interceptors/
│   ├── Middleware/
│   └── Validation/
└── Config/
    ├── configuration.ts
    ├── database.config.ts
    ├── security.config.ts
    └── environment.ts
```

Los nombres de dominio listados son ejemplos de módulos futuros; no implican que existan implementaciones funcionales. Usar convenciones consistentes con el proyecto real y su sistema de archivos. Si el proyecto ya tiene rutas en minúsculas, decidir y aplicar una migración controlada, no una mezcla arbitraria de estilos.

### Estructura implementada

```text
src/
├── Controllers/{Auth,Company,ExtractionMethods,Health,Queries}/
├── Models/{Auth,Common,Company,ExtractionMethods,Queries}/
├── Services/{Auth,Company,ExtractionMethods,Health,Queries}/
├── Repositories/{Contracts,Queries,StoredProcedures}/
├── modules/{auth,companies,extraction-methods,health,queries}/
├── infrastructure/database/       # managers, repositorios de acceso y executors
├── common/{company-context,filters,guards,interceptors,logging}/
├── config/
├── app.module.ts
└── main.ts
```

No se crean carpetas vacías para módulos todavía no desarrollados.

## 6. Módulos de negocio previstos

- **Installation:** configuración inicial de la instancia local.
- **Company:** identidad y datos de la Company asociada a la instalación.
- **Auth / Users:** autenticación y administración de usuarios locales.
- **Database:** parámetros y comprobaciones de infraestructura de datos.
- **Equipment:** inventario de equipos.
- **Discovery:** descubrimiento de capacidades y datos disponibles.
- **ExtractionMethod:** protocolos, conexiones, métodos y origen de información.
- **Collector:** configuración de qué adquirir, con qué frecuencia, cómo transformar y dónde almacenar.
- **DataStructure / Mapping:** estructuras y mapeos de datos.
- **Execution / Logs:** consulta de ejecuciones y bitácoras; no sustituyen el scheduler.
- **Storage:** configuración de destinos, retención y almacenamiento temporal.
- **Synchronization:** estado, destinos, historial y envío pendiente.
- **Query:** lecturas y consultas operacionales controladas.

La implementación de cada módulo debe respetar las cuatro responsabilidades principales: Controllers, Models, Services y Repositories.

## 7. MySQL y bases de datos

### 7.1 Base local

La base de datos propia de esta API es **`kindmetricscte`**. La base **`kindmetrics`** corresponde a la plataforma central y no debe configurarse como destino predeterminado de este API.

La separación de bases es lógica y puede desplegarse en distintas instancias según el escenario aprobado.

### 7.2 Infraestructura de acceso

- `LocalConnectionManager` mantiene una única instancia del pool local, compartida por todos los Repositories locales.
- `CompanyConnectionManager` administra pools Company reutilizables, limita el máximo global y cierra pools inactivos; el cierre de aplicación libera los pools restantes.
- La base predeterminada del Collector es `kindmetricscte`; `MYSQL_DATABASE` se configura por entorno y no se cambia al arrancar.
- `LocalQueryRepository` ejecuta SQL parametrizado; `LocalStoredProcedureRepository` ejecuta exclusivamente Stored Procedures locales. Ambos usan el mismo `LocalConnectionManager`.
- `MySqlQueryExecutor` y `MySqlStoredProcedureExecutor` solo ejecutan la operación solicitada; pueden usar pool local o conexión adquirida del pool Company. No contienen lógica de dominio.
- `CompanyDatabaseResolver` consume el contrato `CompanyContextRepository`, valida Company, membresía y mapping, y construye un `CompanyContext` tipado. `CompanyDatabaseRepository` ejecuta SQL o Stored Procedures parametrizados con la conexión Company liberada al terminar.
- La autenticación usa `sp_users_get_by_email`; el hash solo se selecciona en este procedimiento y nunca se incluye en el DTO de respuesta.
- Mantener los ejecutores separados; no fusionarlos en uno genérico.
- `LocalConnectionManager`, `LocalQueryRepository` y `LocalStoredProcedureRepository` proporcionan callbacks transaccionales con `BEGIN`, `COMMIT`, `ROLLBACK` y release garantizado. El manager Company ofrece el mismo patrón para operaciones futuras.
- No crear ni alterar tablas automáticamente durante el arranque sin un proceso de migración aprobado.
- La conexión física se resuelve en el backend; ningún cliente debe decidir arbitrariamente el nombre de la base de datos.

`DatabaseModule` es global y registra una sola instancia de cada manager y executor; no se vuelven a declarar en módulos funcionales. `Database/03_company_short_name_and_crud.sql` agrega `company.short_name`; `Database/04_company_database.sql` agrega `company.database_name` y `sp_companies_create_database` (versión `1.2.0`). El nombre se deriva en servidor del GUID validado. El mapping se almacena en `kindmetricscte.company.database_name`; el schema actual no tiene host, puerto ni credenciales por Company. `MYSQL_COMPANY_POOL_MAX` (20), `MYSQL_COMPANY_POOL_IDLE_TIMEOUT_MS` (300000) y `MYSQL_COMPANY_CONNECTION_LIMIT` (5) configuran los pools dinámicos. La creación de schema requiere privilegio administrativo y solo crea un schema vacío.

### 7.2.1 CompanyContext y aislamiento

Las rutas de Extraction Methods reciben `X-Company-Id` como GUID lógico y exigen JWT. `JwtAuthGuard` valida el token y adjunta el `sub`; `CompanyContextGuard` consulta el contrato local de resolución y exige que el usuario activo tenga al menos un rol asignado a la Company mediante `users → user_roles → roles.company_id`. El repository de acceso Company recibe ese GUID, busca `company.database_name`, verifica que sea exactamente `km_company_<guid-sin-guiones>`, obtiene/reutiliza el pool y ejecuta el Stored Procedure. Ninguna capa recibe el nombre físico desde HTTP.

Esta autorización corresponde al esquema existente del Collector API; no implementa el modelo conceptual `UserCompanyAccess` de la plataforma central. Para instalación CUSTOMER, falta leer y validar la Company fija asociada a la instalación. En ese modo, el header deberá compararse con esa asociación y nunca permitir selección. El API no recibe ni soporta actualmente hosts o credenciales distintos para cada Company; se requiere una decisión y migración de configuración antes de habilitarlos.

### 7.3 Repositorios

```text
Controller -> Service -> Administration Repository Contract
                              |
                      StoredProcedures implementation
                              |
                      MySqlStoredProcedureExecutor
                              |
                      Stored Procedure -> MySQL

Controller -> Service -> Query Repository Contract
                              |
                         Queries implementation
                              |
                         MySqlQueryExecutor
                              |
                         Parameterized SQL -> MySQL
```

## 8. Usuarios locales, perfiles y autenticación

El modelo local del Collector es **deliberadamente más simple** que el modelo de autorización global de `KindMetricsAPI`.

- Modelo objetivo: tablas `users` y `profiles`.
- Cada usuario tiene **un solo perfil**.
- Perfiles iniciales: **`ADMIN`** y **`VIEWER`**.
- No implementar por ahora permisos individuales, múltiples roles por usuario ni tablas de mapeo rol-permiso.
- La API verifica en el servidor las operaciones permitidas por perfil; el frontend no es autoridad de autorización.
- Las contraseñas deben almacenarse con hash robusto, nunca en texto plano.
- JWT representa la identidad autenticada, pero no sustituye validaciones de estado de usuario y acceso.
- No registrar contraseñas, JWT completos ni secretos.

La autorización avanzada por recurso/acción/alcance, capacidades y permisos por Company pertenece a la plataforma central y no debe copiarse sin una necesidad aprobada.

**Discrepancia pendiente de esquema:** `Database/01_schema.sql` define actualmente `users`, `roles`, `permissions`, `user_roles` y `role_permissions`; no define `profiles` ni limita a un perfil por usuario. No se modificó la migración porque requiere revisar compatibilidad y datos antes de una transición no destructiva.

## 9. CompanyContext y límites de tenant

Extraction Methods implementa `Authorization: Bearer <JWT>` y `X-Company-Id`, con validación del GUID, usuario activo, existencia de un rol asignado en la misma Company y mapping físico obtenido desde `kindmetricscte.company.database_name`. El CRUD administrativo de Companies sigue protegido por `isPlatformAdmin`. La plataforma central también documenta `X-Company-Guid`; no se cambia el contrato actual del Collector API.

Para una instalación local asociada a una Company, el comportamiento final previsto es:

1. Autenticar al usuario o servicio.
2. Resolver la Company configurada para la instalación desde datos confiables del backend.
3. Validar que la identidad tenga acceso según el modelo local.
4. Construir el contexto efectivo para la operación.
5. Rechazar cualquier encabezado de Company que intente sustituir una asociación no autorizada.

**Pendiente:** `installation.config.ts` solo configura una ruta de archivo y no lee la instalación ni una Company fija. Por eso aún no se puede comprobar la vinculación CUSTOMER; cuando se implemente esa resolución, deberá rechazarse un header distinto de la Company de instalación. La membresía usada aquí está basada en el esquema local existente y no crea la tabla conceptual `UserCompanyAccess`.

El frontend no puede seleccionar la base física por nombre.

## 10. Seguridad y consultas

- Autenticación JWT y Guards según los endpoints.
- Autorización por perfil local y contexto autorizado de Company.
- DTOs con validación de tipos, UUIDs, enums, rangos y campos requeridos.
- Prohibido ejecutar SQL arbitrario recibido del frontend sin validación estricta.
- Validar datasource, tablas y campos permitidos, parámetros, límites, timeout y contexto de acceso para cualquier motor de consultas configurable.
- Aplicar mínimo privilegio en usuarios MySQL.
- No exponer SQL, stack traces, cadenas de conexión ni secretos en respuestas HTTP.

## 11. Contrato HTTP y manejo de errores

Los Controllers deben devolver contratos consistentes y delegar el manejo de errores a filtros/interceptores compartidos. Como **convención objetivo sujeta a compatibilidad** con clientes existentes, puede utilizarse:

```ts
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors: string[];
  meta?: { requestId?: string };
}
```

El contrato implementado actualmente usa `errors: ApiError[]` (cada error contiene `code`, `message` y `field` opcional) y `meta.requestId` obligatorio. El ejemplo objetivo anterior (`errors: string[]` y metadata opcional) no es idéntico; no se cambió porque no se pudo verificar compatibilidad de consumidores. Health y Queries usan el envelope centralizado en `src/Models/Common/api-response.dto.ts` y los mecanismos globales.

El manejo centralizado debe contemplar errores HTTP, de validación, autenticación, autorización, aplicación y persistencia. Los mensajes públicos no deben revelar detalles internos.

## 12. Configuración por entornos

Archivos por entorno existentes:

```text
.env.example
.env.dev
.env.qa
.env.prod
```

`JWT_SECRET` debe ser un secreto aleatorio de al menos 32 bytes configurado en el entorno activo. No se almacena ni se incluye en el repositorio. `JWT_EXPIRES_IN` indica la duración en segundos (predeterminado 900).

La Company no se determina mediante un valor enviado sin validar por el frontend; en instalaciones locales se resuelve según la asociación confiable de la instancia.

## 13. Catálogo administrativo de extracción

El catálogo administrativo de proveedores y conectores reside en `kindmetricscte`; usa `LocalStoredProcedureRepository`, el mismo `LocalConnectionManager` compartido con consultas y otros procedimientos. `DatabaseModule` continúa siendo el único owner de los pools. Las rutas actuales de métodos y sus asociaciones operativas permanecen en la base física de cada Company para conservar el contrato actual de Collector-UI. No hay claves foráneas entre schemas; `protocol` continúa siendo el contrato de familia del método hasta aprobarse un identificador estable que relacione un método con `connector_key`.

Rutas nuevas, prefijo global `/api/v1`, protegidas con `PlatformAdminGuard`:

| Método | Ruta | Comportamiento |
| --- | --- | --- |
| GET/POST | `/extraction-providers` | Listar con filtros/paginación y crear proveedor |
| GET/PATCH/DELETE | `/extraction-providers/:id` | Consultar, editar y archivar proveedor |
| GET/POST | `/extraction-connectors` | Listar con filtros/paginación y crear conector |
| GET/PATCH/DELETE | `/extraction-connectors/:id` | Consultar, editar y archivar conector |

El DELETE es un archivado lógico (`is_active=false`), no una eliminación física. No se permite archivar un proveedor con conectores activos. Crear o editar un conector crea un snapshot de versión; los snapshots no se actualizan. Los conectores iniciales de seed tienen `driverKey=null` y `executionAvailable=false`: son metadatos, no implementaciones ejecutables. Ningún valor de base de datos instala o invoca código.

Las rutas existentes `GET/POST/PATCH/DELETE /api/v1/extraction-methods` siguen siendo Company-scoped y requieren JWT más `X-Company-Id`. Sus tablas `extraction_methods`, parámetros, requests, fields, asociaciones `equipment_extraction_methods` e historial viven en cada Company. `X-Company-Id` ahora también está permitido por CORS; el nombre de schema se deriva de `kindmetricscte.company.database_name`, nunca del request.

La migración local aditiva y el seed están en `Database/migrations/local/2026-10-26_extraction_catalog.sql` y `Database/seeds/local/2026-10-26_extraction_catalog_seed.sql`. Revisar `Database/migrations/README.md` y el estado real en `information_schema` antes de aplicación manual. No se ejecutan durante el arranque ni se aplicaron en esta implementación.

**Alcance pendiente:** todavía no hay drivers de extracción registrados en el Collector. Tampoco se implementan endpoints de gestión de tipos de autenticación/parámetros del conector, duplicación/versionado consultable del método, endpoints individuales de subrecursos ni administración de conexiones genéricas fuera de la asociación existente equipo-método. El esquema del catálogo reserva tablas para auth types y parámetros; falta su CRUD transaccional. Teams/Outlook se modelan mediante Microsoft Graph, pero no se declaran métodos funcionales ni se simulan permisos/licencias. Las respuestas de listados aún no incluyen conteo total de paginación.

## 14. Logging y observabilidad

Distinguir:

- **Logs técnicos:** solicitudes, fallos de autenticación/autorización, errores de base, arranque y cierre.
- **Logs de ejecución de Collector:** adquisiciones, mapeos, almacenamiento y sincronización, asociados a sus procesos funcionales.

No registrar contraseñas, tokens completos, secretos ni cadenas de conexión completas. Correlacionar operaciones mediante identificadores de solicitud cuando sea posible.

## 15. NestJS y adaptador HTTP

NestJS y TypeScript son decisiones del proyecto. Conservar módulos NestJS para composición e inyección de dependencias.

El adaptador activo es `@nestjs/platform-fastify`; `main.ts` registra Swagger en `/docs` y OpenAPI en `/docs/json`. Host y puerto se leen de `API_HOST` y `API_PORT`. Express no forma parte del adaptador HTTP activo.

Axios no se utiliza para conectarse a MySQL. Integraciones HTTP externas futuras deben implementarse mediante clientes específicos y justificados.

## 16. Relación con Collector-BS

```text
KindMetrics-Cli-Collector-API
       | configuración / administración
       v
KindMetrics-Cli-Collector-BS
       |
       v
Scheduler
       |
       v
Extraction Methods
       |
       v
Mapping
       |
       v
Storage (servidor y/o local temporal)
       |
       v
Synchronization (cuando aplique)
```

La API es autoridad de configuración y administración; **no** incorpora el scheduler de adquisición. La frecuencia de recolección pertenece al **Collector**, no al **ExtractionMethod**:

- `ExtractionMethod`: cómo conectarse, qué fuente consultar y qué información está disponible.
- `Collector`: qué obtener, cuándo, cómo transformar y a qué destino enviar o almacenar.

El almacenamiento local temporal es opcional según la configuración aprobada; no debe imponerse como destino permanente ni como paso obligatorio de todas las ejecuciones.

## 17. Endpoints y compatibilidad

Rutas comprobadas en el código:

- `POST /api/v1/auth/login`: valida correo/contraseña, verifica Argon2id y devuelve un JWT y datos públicos del usuario. Requiere `JWT_SECRET`.
- `GET /health`: devuelve envelope uniforme y `data` indica `status` (`ok` o `degraded`) y `database` (`connected` o `disconnected`), mediante `SELECT 1`.
- `POST /api/v1/queries/execute`: valida `query`, `datasourceGuid` y parámetros con Zod y devuelve 501 intencionalmente; no ejecuta SQL.
- `GET/POST /api/v1/companies`, `GET/PATCH/DELETE /api/v1/companies/:guid`: CRUD protegido por JWT con `isPlatformAdmin=true`; campos `name`, `shortName`, `code`, `timezone`, `locale`, `status` y `configJson`.
- `POST /api/v1/companies/:guid/database`: crea el schema vacío derivado del GUID y guarda `databaseName`; no acepta el nombre de base en el request ni elimina schemas.
- `GET/POST /api/v1/extraction-methods`, `GET/PATCH/DELETE /api/v1/extraction-methods/:id`: CRUD por Company con `X-Company-Id`, JWT y CompanyContext. Las lecturas no devuelven credenciales; `hasCredentials` informa si existen.
- `GET /docs` y `GET /docs/json`: Swagger UI y documento OpenAPI.

El login no crea usuarios. Los procedimientos de `Database/02_users_auth_procedures.sql` permiten CRUD a nivel de base de datos; no deben exponerse directamente hasta definir autorización de administración.

### Instalación de usuarios y autenticación

Para una instalación nueva, ejecutar primero el esquema y después los procedimientos, en la base local del Collector:

```powershell
mysql -u root -p < Database/01_schema.sql
mysql -u root -p kindmetricscte < Database/02_users_auth_procedures.sql
```

`Database/01_schema.sql` es para una instalación nueva. Para una existente, aplicar en orden `Database/03_company_short_name_and_crud.sql` y `Database/04_company_database.sql`. La migración `1.2.0` ya está aplicada en el entorno de desarrollo; QA y producción requieren su propia aplicación controlada.

`Database/05_extraction_methods.sql` instala las tablas `extraction_methods`, `extraction_method_parameters`, `extraction_method_requests`, `extraction_method_fields`, `equipment_extraction_methods` y `extraction_method_versions`, junto con sus Stored Procedures CRUD, en `km_company_1ab38c98cf5f11f1b541a6d1e9ab77e1`. La versión `company-1.1.0` queda registrada en `schema_migrations`. El script se aplica explícitamente con `node Database/_apply_extraction_methods_once.js`; no se ejecuta durante peticiones ni al arrancar. El aplicador comprueba los objetos y la versión al finalizar. `sp_companies_create_database` solo crea un schema vacío: todavía no existe un aprovisionador general que instale y valide migraciones antes de activar cualquier Company. Aplicar migraciones con una cuenta administrativa controlada; no ejecutarlas automáticamente contra datos reales.

El CRUD HTTP de Extraction Methods maneja el agregado completo: método, parámetros, requests, fields anidados, asociaciones a equipment y snapshots de versión. `POST` crea la versión inicial; `PATCH` crea una versión nueva en la misma transacción que los cambios. `DELETE` elimina relaciones dependientes mediante `ON DELETE CASCADE`. Los parámetros marcados `isSecret` nunca devuelven su `defaultValue` ni en la lectura ni en los snapshots.

Configurar `JWT_SECRET` como valor aleatorio de 32 bytes o más en el archivo de entorno activo. Para generar uno localmente con Node:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64'))"
```

Crear el primer usuario mediante un proceso administrativo controlado que almacene un hash Argon2id en `password_hash`; no guardar contraseñas en texto plano ni registrar el hash.

No crear endpoints funcionales simulados para aparentar que un módulo está terminado.

## 17. Reglas de refactorización

1. Inspeccionar el repositorio actual y la documentación global antes de modificar archivos.
2. Identificar Controllers, Models/DTOs, Services, Contracts, Implementations e Infrastructure existentes.
3. Mover código solo cuando mejore la separación de responsabilidades.
4. Mantener nombres de rutas, contratos y comportamiento salvo decisión explícita.
5. Actualizar imports, módulos NestJS, providers y tokens de DI.
6. Evitar duplicar modelos o mantener simultáneamente dos implementaciones equivalentes.
7. No eliminar tablas, migraciones, configuraciones ni documentación aprobada.
8. No crear carpetas vacías o clases sin funcionalidad solo para completar un diagrama.
9. Comprobar build, lint, tipado y pruebas después de cada etapa.
10. Reportar diferencias entre arquitectura objetivo y código implementado.

## 18. Restricciones explícitas

Queda prohibido:

- SQL o acceso directo a MySQL desde Controllers y Services.
- Llamar Stored Procedures desde Controllers.
- Dependencia directa de Services en implementaciones concretas de persistencia.
- Mezclar lógica de negocio con repositorios.
- Utilizar TypeORM como persistencia principal sin aprobación.
- Ejecutar consultas arbitrarias del frontend sin controles.
- Confiar ciegamente en `X-Company-Id` o en cualquier encabezado equivalente.
- Permitir que el frontend determine la base física.
- Guardar secretos en código o logs.
- Ejecutar el scheduler de adquisición dentro de esta API.
- Copiar al Collector el modelo complejo de permisos del backend central sin aprobación.

## 19. Comandos de desarrollo

Comandos previstos, sujetos a los scripts definidos realmente en `package.json`:

```bash
npm install
npm run start:dev
npm run build
npm run lint
npm run format
npm run format:check
npm run type-check
npm run check
```

`npm run check` ejecuta lint, type-check y build. No hay script ni archivos de pruebas automatizadas actualmente.

## 20. Documentación y fuente de verdad

La documentación global de KindMetrics reside en la carpeta **`docs/` del workspace** y contiene las decisiones transversales de arquitectura, Companies, Collector, almacenamiento y sincronización. Este proyecto mantiene su propio `README.md`, que documenta las decisiones específicas del Collector API.

- No regenerar ni sobrescribir la documentación global.
- No crear una carpeta `docs/` duplicada dentro del proyecto por defecto.
- Actualizar documentos existentes de manera incremental.
- No reemplazar decisiones aprobadas por supuestos silenciosos.
- Si una decisión del README contradice documentación global vigente, señalar la discrepancia y solicitar resolución antes de romper compatibilidad.

## 21. Criterios de aceptación

La homologación arquitectónica se considera completa cuando:

- Los Controllers delegan en Services y no acceden a persistencia.
- Los Services usan contratos de repositorios.
- Models/DTOs están organizados sin duplicaciones innecesarias.
- Los Repositories separan `StoredProcedures` y `Queries`.
- Los ejecutores MySQL permanecen separados y parametrizados.
- NestJS resuelve correctamente las dependencias.
- Se conserva el comportamiento de endpoints existentes.
- La base configurada para el Collector es `kindmetricscte`.
- El modelo local de usuarios respeta `ADMIN` / `VIEWER`, un perfil por usuario.
- Se respetan límites entre API, Collector-BS y plataforma central.
- Compilación, lint y pruebas disponibles finalizan correctamente o sus fallos se documentan.
- El README describe fielmente qué está implementado y qué permanece planificado.

## 22. Estado auditado y próximos pasos

La homologación actual es parcial. Health sigue Controller → Service → Repository Contract → Repository Implementation → Query Executor → MySQL. Query conserva controller, DTO/Zod y service, pero su ejecución queda deliberadamente bloqueada. No hay casos de uso que requieran Stored Procedures todavía.

Pendientes prioritarios: decidir CompanyContext/header compatible; resolver sin pérdida de datos la discrepancia `profiles` frente a `roles` del esquema existente; proteger rutas con Guards/JWT; añadir política de autorización para CRUD; añadir pruebas automatizadas; acordar el contrato de errores con consumidores antes de cambiarlo.
