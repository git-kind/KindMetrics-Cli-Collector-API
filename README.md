# KindMetrics-Cli-Collector-API

> **Proyecto:** KindMetrics
> **Componente:** API local del Collector (también denominada informalmente `KindMetricsCte-API`)
> **Estado auditado:** 22-10-2026. NestJS con Fastify; implementados `GET /health` y `POST /api/v1/queries/execute` (este último responde 501 intencionalmente). No hay todavía autenticación, CompanyContext ni CRUD funcional.
> **Fuente:** decisiones globales en `docs/`; el estado de implementación se contrasta con el código de este repositorio.

## 1. Objetivo

`KindMetrics-Cli-Collector-API` es la API REST local de administración y configuración del Collector de KindMetrics. Prepara la infraestructura necesaria para instalación, Company, base de datos, equipos, descubrimiento, métodos de extracción, Collectors, mapeos, ejecución, logs, almacenamiento y sincronización.

Su responsabilidad principal es exponer operaciones de configuración, consulta y administración del Collector; **no** ejecutar el scheduler de adquisición, que corresponde a `KindMetrics-Cli-Collector-BS`.

El proyecto debe mantener convenciones arquitectónicas compatibles con `KindMetricsAPI` sin confundir las responsabilidades del entorno central KIND con las del entorno local CUSTOMER.

## 2. Alcance y estado

La implementación actual contiene NestJS, TypeScript, Fastify, Swagger, validación HTTP, manejo centralizado de errores, logging, health check y un pool MySQL. `GET /health` consulta `SELECT 1` mediante Controller → Service → contrato de Repository → implementación MySQL → Query Executor. `POST /api/v1/queries/execute` valida su DTO con Zod y responde 501 sin ejecutar SQL.

No están implementados Auth/JWT, Guards, CompanyContext, CRUD administrativo, sincronización ni conexión con Collector-BS. Los módulos funcionales se incorporarán gradualmente; la arquitectura objetivo descrita en este README no afirma que esas funcionalidades ya existan.

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

**Implementado:** `src/Controllers/Health/` y `src/Controllers/Queries/`. Los módulos Nest que los componen permanecen en `src/modules/`.

### 4.2 Models

**Ubicación objetivo:** `src/Models/`.

- DTOs de entrada y salida, modelos de dominio, tipos, interfaces de datos y enumeraciones.
- Validaciones estructurales de DTOs con las herramientas estándar de NestJS.
- Las entidades son **modelos de dominio**, no entidades TypeORM.
- No contienen acceso a bases de datos ni lógica de negocio.
- Evitar definiciones duplicadas entre `entities/`, `modules/*/dto/` y `Models/`.

Los DTOs HTTP existentes están centralizados en `src/Models/`; no hay modelos de dominio funcionales todavía.

**Distinción:** los contratos de repositorios pueden ubicarse en `Repositories/Contracts/`; los Models no deben convertirse en un depósito de dependencias de infraestructura.

### 4.3 Services

**Ubicación objetivo:** `src/Services/`.

- Implementan casos de uso y reglas de negocio.
- Coordinan entidades y repositorios.
- Validan relaciones y reglas funcionales.
- Solicitan transacciones mediante contratos de infraestructura cuando corresponda.
- No ejecutan SQL ni Stored Procedures, no importan `mysql2` y no leen `process.env` de manera dispersa.

**Implementado:** `HealthService` depende de `HealthRepository`; `QueriesService` mantiene el resultado 501 previsto. No existen aún Services de autenticación, usuarios, Company o sincronización.

### 4.4 Repositories

**Ubicación objetivo:** `src/Repositories/`.

- `Contracts/`: interfaces y tokens de inyección para los Services.
- `StoredProcedures/`: implementaciones de administración y escritura mediante procedimientos almacenados **cuando corresponda**.
- `Queries/`: implementaciones de consultas parametrizadas y lecturas operacionales.
- Las implementaciones traducen entre modelos de dominio y resultados de persistencia.
- No implementan reglas de negocio.
- No se crea un repositorio genérico único que mezcle administración, escritura, consultas analíticas y acceso directo a conexiones.

**Implementado:** `HealthRepository` y `MySqlHealthRepository` para comprobar la conexión. No hay implementaciones de repositorio Stored Procedures porque todavía no hay casos de uso administrativos; existe el executor de infraestructura separado.

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
├── Controllers/{Health,Queries}/
├── Models/{Common,Queries}/
├── Services/{Health,Queries}/
├── Repositories/{Contracts,Queries}/
├── modules/{health,queries}/       # composición e inyección NestJS
├── infrastructure/database/       # pool y executors MySQL
├── common/{filters,interceptors,logging}/
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

- Centralizar pool y conexiones MySQL.
- La base predeterminada del Collector es `kindmetricscte`; `MYSQL_DATABASE` se configura por entorno y no se cambia al arrancar.
- `MySqlQueryExecutor`: SQL parametrizado, conexión y resultados estructurados.
- `MySqlStoredProcedureExecutor`: ejecución de procedimientos almacenados, parámetros y resultados.
- Mantener los ejecutores separados; no fusionarlos en uno genérico.
- Implementar transacciones atómicas cuando el caso de uso lo exija (`BEGIN`, `COMMIT`, `ROLLBACK`).
- No crear ni alterar tablas automáticamente durante el arranque sin un proceso de migración aprobado.
- La conexión física se resuelve en el backend; ningún cliente debe decidir arbitrariamente el nombre de la base de datos.

El pool compartido está en `MysqlDatabaseConnection`; Query y Stored Procedure usan executors diferentes. No hay todavía un Repository que invoque procedimientos. `Database/01_schema.sql` crea `kindmetricscte`; el archivo auxiliar `Database/Database KindMetricsCte.sql` usa una variante de mayúsculas y no debe asumirse equivalente en servidores MySQL sensibles a mayúsculas.

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

La documentación histórica contempla `Authorization: Bearer <JWT>` y `X-Company-Id`; la plataforma central usa `X-Company-Guid` en ciertos endpoints. El código actual no implementa autenticación ni CompanyContext y no interpreta ninguno de esos headers como contexto. **No asumir que el Collector local debe permitir selección arbitraria de Company.**

Para una instalación local asociada a una Company:

1. Autenticar al usuario o servicio.
2. Resolver la Company configurada para la instalación desde datos confiables del backend.
3. Validar que la identidad tenga acceso según el modelo local.
4. Construir el contexto efectivo para la operación.
5. Rechazar cualquier encabezado de Company que intente sustituir una asociación no autorizada.

**Decisión pendiente:** no se renombró ningún encabezado. El repositorio KindMetricsAPI no está disponible en este workspace y no se encontró consumidor de este API aquí; antes de implementar CompanyContext debe definirse si el Collector local resolverá su Company desde la instalación o si aceptará un header validado.

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

La Company no se determina mediante un valor enviado sin validar por el frontend; en instalaciones locales se resuelve según la asociación confiable de la instancia.

## 13. Logging y observabilidad

Distinguir:

- **Logs técnicos:** solicitudes, fallos de autenticación/autorización, errores de base, arranque y cierre.
- **Logs de ejecución de Collector:** adquisiciones, mapeos, almacenamiento y sincronización, asociados a sus procesos funcionales.

No registrar contraseñas, tokens completos, secretos ni cadenas de conexión completas. Correlacionar operaciones mediante identificadores de solicitud cuando sea posible.

## 14. NestJS y adaptador HTTP

NestJS y TypeScript son decisiones del proyecto. Conservar módulos NestJS para composición e inyección de dependencias.

El adaptador activo es `@nestjs/platform-fastify`; `main.ts` registra Swagger en `/docs` y OpenAPI en `/docs/json`. Host y puerto se leen de `API_HOST` y `API_PORT`. Express no forma parte del adaptador HTTP activo.

Axios no se utiliza para conectarse a MySQL. Integraciones HTTP externas futuras deben implementarse mediante clientes específicos y justificados.

## 15. Relación con Collector-BS

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

## 16. Endpoints y compatibilidad

Rutas comprobadas en el código:

- `GET /health`: devuelve envelope uniforme y `data` indica `status` (`ok` o `degraded`) y `database` (`connected` o `disconnected`), mediante `SELECT 1`.
- `POST /api/v1/queries/execute`: valida `query`, `datasourceGuid` y parámetros con Zod y devuelve 501 intencionalmente; no ejecuta SQL.
- `GET /docs` y `GET /docs/json`: Swagger UI y documento OpenAPI.

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

Pendientes prioritarios: decidir CompanyContext/header compatible; resolver sin pérdida de datos la discrepancia `profiles` frente a `roles` del SQL existente; implementar Auth/JWT y autorización por el perfil local aprobado; añadir pruebas automatizadas; desarrollar repositorios solo cuando existan contratos y casos de uso concretos; acordar el contrato de errores con consumidores antes de cambiarlo.
