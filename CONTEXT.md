# Contexto Del Proyecto

## Producto

SIPEG es un producto independiente. Este repositorio implementa una instancia monoorganizacion configurada para la Universidad Tecnologica de Panama (UTP). No se implementa multitenancy. La aplicacion es el frontend de una plataforma de gestion de eventos academicos; el backend es un proyecto separado en `../SIPEG-UTP-BACKEND` y se consume mediante una capa de cliente/API.

## Alcance Del Frontend

- Mostrar vistas de programas de eventos, actividades, asistencia, certificados, aulas, ponentes, reportes y administracion de usuarios.
- Mantener datos de demostracion en archivos frontend mientras no exista integracion completa con el backend.
- Separar vistas de pagina, componentes reutilizables, datos mock, estado compartido y utilidades.
- No incluir controladores, modelos de base de datos, rutas de servidor, migraciones, colas ni mailers.

La arquitectura de informacion vigente se documenta en
[`docs/product/information-architecture.md`](docs/product/information-architecture.md). La Fase 0
mantiene los modulos implementados bajo `/admin` y conserva aliases heredados; `/operaciones` se
aplaza hasta que la Fase 3 resuelva el descubrimiento de scopes y los guards por capacidad efectiva.

## Alineacion Con El Backend

El vocabulario del frontend sigue el contrato OpenAPI versionado en `../SIPEG-UTP-BACKEND/openapi.json`.

- El recurso oficial es **actividad** (`activities`). No existe un recurso `/events`.
- Una actividad pertenece obligatoriamente a un programa de eventos.
- Un programa de eventos pertenece exactamente a una unidad organizativa.
- El backend es la autoridad de autorizacion; el frontend solo modela capacidades para navegacion y experiencia.

## Lenguaje De Dominio

### Usuario

Persona que usa la plataforma. Tiene un rol global (`ADMIN` o `USER`) y puede recibir permisos de colaboracion por programa de eventos o actividad.

### Unidad Organizativa

Catalogo unificado de unidades de la universidad. Se distingue por `type`: `FACULTY` (unidad academica) o `SUBDIRECTORATE` (unidad administrativa). Tiene `code`, `name`, `description`, `isActive` y un encargado opcional (`head`). Cada unidad tiene un programa de eventos predeterminado permanente.

### Carrera

Programa academico asociado a un usuario y, opcionalmente, a una unidad organizativa de tipo facultad.

### Programa De Eventos

Unidad organizadora que agrupa actividades. Pertenece exactamente a una unidad organizativa. Cada unidad tiene un programa predeterminado permanente; los programas adicionales tienen fechas, etiqueta y banner. Los programas se archivan y no se eliminan fisicamente.

### Actividad

Evento individual que pertenece obligatoriamente a un programa de eventos. Tiene nombre, tipo (`WORKSHOP`, `SEMINAR`, `TALK`, `CONFERENCE`, `PANEL`, `COURSE`, `COMPETITION`, `OTHER`), ponentes, aula, fecha, hora, equipamiento requerido, banner y estado (`DRAFT`, `SCHEDULED`, `ONGOING`, `COMPLETED`, `CANCELLED`).

### Permiso De Colaboracion

Capacidad asignada a un usuario para colaborar en un programa de eventos o en una actividad. Los permisos del programa se heredan por defecto en sus actividades.

### Registro De Asistencia

Evidencia de presencia en una actividad. Cada inscripcion (`activity` x `user`) tiene un `code` unico de validacion; el `method` (`QR` o `MANUAL`) registra como se valido.

### Certificado

Documento generado a partir de la asistencia. Puede generarse automaticamente o desde la lista de asistencia.

### Aula

Espacio disponible para actividades. Tiene tipo (`LABORATORY` o `CLASSROOM`), ubicacion, capacidad maxima y amenidades.

### Ponente

Persona que propone o imparte una actividad. Las propuestas se asocian a un programa de eventos y capturan CV, duracion aproximada, tipo de charla, titulo, contenido y fecha de envio.

### Reporte

Vista o exportacion con metricas de programas, actividades, asistencia y certificados.

### Contexto De Trabajo

Seleccion activa del panel administrativo: un programa de eventos o una actividad. Asistencia, certificados y reportes operan sobre el contexto seleccionado. La seleccion vive en memoria durante la sesion del navegador y se limpia al cerrar sesion.

## Arquitectura Frontend

### Capas

```txt
app (composicion, app/adapters/http y app/query)
  ↓
features (modelo, adapters, hooks, ui)
  ↓
components compartidos + types + utils
```

### Adapters

- `src/app/adapters/contracts.ts` define los puertos del frontend: `ActivityCatalogAdapter`, `AuthAdapter` y `OperationsAdapter`.
- `src/app/adapters/createAppAdapters.ts` es el unico composition root; usa la API por defecto (`VITE_DATA_SOURCE=api`) y deja `mock` como override explicito para pruebas, Storybook y modo offline. Para el catalogo administrativo inyecta de forma privada el lector del access token de la sesion.
- `src/app/adapters/http/apiClient.ts` concentra el cliente HTTP; cada request declara modo `none` o `bearer`, solo el cliente construye `Authorization` y ningun componente hardcodea URLs (ADR-0012).
- `src/app/query` concentra el estado de servidor con TanStack Query: el cliente, las claves, la persistencia offline opcional y el provider. Los hooks de cada feature llaman `useQuery`/`useMutation` sobre los adapters inyectados y conservan su forma publica; `useActivityCatalog(access)` exige declarar la frontera `public` o `administrative`, y `useOperations` es la puerta de entrada a operaciones.
- La sesion vive en Zustand: perfil y access token solo en memoria, refresh token y expiracion en `sessionStorage`; al recargar se rota el refresh token y se carga `users/me` antes de renderizar rutas protegidas. El cierre de sesion revoca el refresh token, limpia el store, el contexto de trabajo, la preferencia de unidad, la cache de Query y la cache publica persistida (ADR-0009).
- Las rutas administrativas exigen sesion y rol `ADMIN`; la autorizacion efectiva sigue siendo del backend.
- La persistencia offline es opcional (`VITE_QUERY_PERSISTENCE=on`), guarda solo el catalogo publico exitoso en `localStorage` y se invalida con una version de esquema mas `VITE_APP_VERSION`; nunca persiste sesion, tokens ni claves privadas por usuario (ADR-0010, ADR-0012).
- Los adapters concretos viven en cada feature (`features/*/adapters`).
- Solo los adapters (y sus pruebas) importan desde `src/data/mock`; paginas, componentes y hooks no conocen los mocks.
- Cuando el OpenAPI cambia, se actualizan dominio, mappers, `src/data/mock` y tests en el mismo cambio, y se valida con `pnpm run api:mocks-check` (backend vivo, no CI).
- El adapter HTTP consume los contratos OpenAPI documentados y valida la respuesta antes de exponerla; no inventa campos ni endpoints.
- Las metricas de alcance de reportes viven en `features/reports/model/scopeMetrics.ts` y las consumen asistencia, certificados, reportes y dashboard.
- Mientras el backend no publique contratos de asistencia, certificados, ponentes y reportes, el origen `api` mantiene esas operaciones no disponibles con un error explicito.
- `OperationsAdapter` es un agregado legado congelado: no admite consumidores nuevos y se extrae en
  orden carreras, usuarios, propuestas, asistencia, certificados y reportes. Cada puerto se crea
  solo al integrar su contrato; no se mezclan respuestas API con fallback mock (ADR-0011).

### Separacion De Presentacion

- Los hooks concentran carga, filtros, paginacion, seleccion y calculos.
- Las funciones puras del dominio viven en `features/*/model` y `src/utils`.
- Los componentes de UI reciben props y callbacks; las vistas conectadas pueden invocar un hook de su feature.
- Las paginas de nivel ruta componen una vista o un hook y no contienen reglas de negocio.
- La capa de presentacion traduce el vocabulario del contrato a espanol con mapas tipados en `features/<dominio>/model/*Labels.ts`; la UI no muestra codigos del API ni mensajes crudos del backend. Los textos libres del backend (nombres, descripciones, equipamiento) no se traducen.
- `ApiError` (`src/app/adapters/http/apiClient.ts`) entrega mensajes en espanol por codigo HTTP y no expone la ruta ni el mensaje del backend.

### Pruebas

- Todas las pruebas viven junto al archivo que prueban, sin carpetas `__tests__`.
- Se prueban funciones puras, mappers, adapters, hooks y comportamiento de UI.
- `src/test/factories.ts` provee factorias de datos; `src/test/render.tsx` inyecta adapters.

### Imports

- Se usan barrels explicitos (`src/components`, `features/*`) para imports publicos.
- Los archivos internos importan su vecino directo para evitar ciclos.
- Las paginas cargadas con `lazy()` mantienen imports directos.

### Edges Permitidos

- `src/app/adapters/**` (composition root) puede importar adapters concretos de cualquier feature en profundidad.
- `src/components/layout/AdminMenu` puede importar el barrel `@/features/working-context`; es un edge permitido, no una regla general para `components/layout`.
- `src/store/**` no importa `@/features/**`; los tipos compartidos viven en `src/types/domain.ts`.
- `src/components/ui/**` no importa `@/features/**`; solo los adapters y sus pruebas importan `src/data/mock`.
- `src/architecture.test.ts` verifica estas reglas: R1 limita mocks, R2 mantiene UI compartida pura,
  R3 exige barrels de features tambien desde paginas y componentes, R4 aisla stores, R5 limita el
  cliente HTTP a adapters, R6 limita `fetch` y endpoints `/api/v1`, y R7 congela los consumidores de
  `OperationsAdapter`.

## Decisiones De Trabajo

- Los datos de demostracion viven en `src/data/mock` y se agrupan por dominio.
- Las paginas de nivel ruta viven en `src/pages`.
- Los componentes reutilizables viven en `src/components` (con `ui/` y `layout/`).
- El estado global con Zustand se reserva para sesion, preferencia de unidad y contexto de trabajo.
- La preferencia de unidad inicia el filtro de unidad del catalogo administrativo, se actualiza al cambiar de unidad y vuelve a `"all"` al cerrar sesion.
- El fan-out del catalogo de actividades esta documentado en el ADR-0005 y se revisa si `ActivityListItem` agrega `enrolledCount`, `checkedInCount`, `equipment` o `cancelReason`.
- Las llamadas al backend se aislan en la capa de adapters y no se hardcodean dentro de componentes.
- Las mejoras de arquitectura priorizan locality, leverage y seams claros sin introducir abstracciones innecesarias.

## Decisiones De Arquitectura

- [ADR-0001: Adapters mock/API y composition root unico](./docs/adr/adr-0001-adapters-mock-api.md)
- [ADR-0002: Contrato OpenAPI vivo con CLI puntual](./docs/adr/adr-0002-openapi-live-targeted-cli.md)
- [ADR-0003: Aislamiento del harness local](./docs/adr/adr-0003-local-harness-isolation.md)
- [ADR-0004: Catalogo de componentes, inventario y baselines visuales](./docs/adr/adr-0004-component-catalog-storybook.md)
- [ADR-0005: Fan-out del catalogo para campos de detalle de actividades](./docs/adr/adr-0005-fanout-catalogo-actividades.md)
- [ADR-0006: API real como origen de desarrollo y mocks para pruebas](./docs/adr/adr-0006-api-first-data-source.md)
- [ADR-0007: Capa de presentacion en espanol entre el API y la UI](./docs/adr/adr-0007-capa-presentacion-espanol.md)
- [ADR-0008: TanStack Query como capa de estado de servidor](./docs/adr/adr-0008-tanstack-query-server-state.md)
- [ADR-0009: Sesion de autenticacion y almacenamiento de tokens](./docs/adr/adr-0009-auth-session-token-storage.md)
- [ADR-0010: Fronteras separadas para consultas publicas y administrativas](./docs/adr/adr-0010-public-administrative-query-boundaries.md)
- [ADR-0011: Migracion strangler del agregado de operaciones](./docs/adr/adr-0011-domain-adapter-strangler-migration.md)
- [ADR-0012: Politica explicita de autenticacion HTTP](./docs/adr/adr-0012-explicit-http-authentication-policy.md)
