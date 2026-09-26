# Contexto Del Proyecto

## Producto

La aplicacion es el frontend de una plataforma de gestion de eventos academicos. Este repositorio contiene solo la interfaz web; el backend es un proyecto separado en `../SIPEG-UTP-BACKEND` y se consume mediante una capa de cliente/API.

## Alcance Del Frontend

- Mostrar vistas de programas de eventos, actividades, asistencia, certificados, aulas, ponentes, reportes y administracion de usuarios.
- Mantener datos de demostracion en archivos frontend mientras no exista integracion completa con el backend.
- Separar vistas de pagina, componentes reutilizables, datos mock, estado compartido y utilidades.
- No incluir controladores, modelos de base de datos, rutas de servidor, migraciones, colas ni mailers.

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

- `src/app/adapters/contracts.ts` define los puertos del frontend: `ActivityCatalogAdapter` y `OperationsAdapter`.
- `src/app/adapters/createAppAdapters.ts` es el unico composition root; usa la API por defecto (`VITE_DATA_SOURCE=api`) y deja `mock` como override explicito para pruebas, Storybook y modo offline.
- `src/app/adapters/http/apiClient.ts` concentra el cliente HTTP; ningun componente hardcodea URLs.
- `src/app/query` concentra el estado de servidor con TanStack Query: el cliente, las claves, la persistencia offline opcional y el provider. Los hooks de cada feature llaman `useQuery`/`useMutation` sobre los adapters inyectados y conservan su forma publica; `useActivityCatalog` y `useOperations` son la puerta de entrada al catalogo y a operaciones.
- La persistencia offline es opcional (`VITE_QUERY_PERSISTENCE=on`), guarda solo el catalogo publico en `localStorage` y se invalida con `VITE_APP_VERSION`; nunca persiste sesion ni el read model de operaciones. El cierre de sesion limpia el cliente y la cache persistida.
- Los adapters concretos viven en cada feature (`features/*/adapters`).
- Solo los adapters (y sus pruebas) importan desde `src/data/mock`; paginas, componentes y hooks no conocen los mocks.
- Cuando el OpenAPI cambia, se actualizan dominio, mappers, `src/data/mock` y tests en el mismo cambio, y se valida con `pnpm run api:mocks-check` (backend vivo, no CI).
- El adapter HTTP consume los contratos OpenAPI documentados y valida la respuesta antes de exponerla; no inventa campos ni endpoints.
- Las metricas de alcance de reportes viven en `features/reports/model/scopeMetrics.ts` y las consumen asistencia, certificados, reportes y dashboard.
- Mientras el backend no publique contratos de asistencia, certificados, ponentes y reportes, el origen `api` mantiene esas operaciones no disponibles con un error explicito.

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
- `src/architecture.test.ts` verifica estas reglas (R1 mocks, R2 UI pura, R3 cross-feature, R4 store).

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
