# API-First y Capa de Presentacion En Espanol Implementation Plan

> **Para agentes:** REQUIRED SUB-SKILL: Use `executing-plans` para implementar tarea por tarea.
> Usa checkboxes (`- [ ]`) para seguimiento. No ejecutes Git ni toques el backend.

**Goal:** Usar la API real como origen de datos de desarrollo (mocks solo en tests), mantener los
mocks sincronizados con el OpenAPI y garantizar que la UI muestre siempre texto en espanol mediante
una capa de presentacion (adapter/anti-corruption layer) entre el dominio y la UI.

**Architecture:** `createAppAdapters` pasa a elegir `api` por defecto con `VITE_DATA_SOURCE=mock`
como override explicito. Un script local (`api:mocks-check`) valida contra el backend vivo que los
schemas/campos/enums que consumen mocks y dominio siguen existiendo. La capa de presentacion vive en
`features/<dominio>/model/*Labels.ts` (mapas tipados `Record<Enum, string>`) y en `ApiError`
(`apiClient`) con mensajes en espanol por codigo HTTP; la UI nunca renderiza codigos crudos ni
mensajes del backend.

**Tech Stack:** React 19, TypeScript 6, Vite, Vitest, Chakra UI v3, Zustand, Node ESM scripts.

**Reglas del plan:**

- Cada tarea termina con su verificacion; no marcar completada sin verificacion en verde.
- No ejecutar comandos Git. Los commits/push los hace el operador.
- No modificar el backend; solo leer su contrato con `pnpm run api:contract`.
- Cambios minimos; sin refactors no listados.

---

## Fase A — API-first en desarrollo

### Tarea A.1: Default `api` en `resolveDataSource`

**Archivos:** `src/app/adapters/createAppAdapters.ts`, `src/app/adapters/createAppAdapters.test.ts`

- [x] `resolveDataSource`: default `api`; `VITE_DATA_SOURCE === "mock"` selecciona `mock`.
- [x] Actualizar tests: `{}` y valores desconocidos → `api`; `mock` explicito → `mock`.
- [x] `pnpm exec vitest run src/app/adapters`.
- [x] `pnpm run lint && pnpm run typecheck`.

**Aceptacion:** tests de adapters verdes con el nuevo default.

**Ejecutado (2026-09-25):** 12 tests de adapters en verde; el default resuelve `api` salvo
`VITE_DATA_SOURCE=mock`.

### Tarea A.2: `.env.example` y documentacion del origen

**Archivos:** `.env.example` (crear), `README.md`, `AGENTS.md`, `CONTEXT.md`

- [x] Crear `.env.example` con `VITE_API_BASE_URL` y `VITE_DATA_SOURCE=mock` documentado.
- [x] README "Origen De Datos": default api; mock solo tests/offline.
- [x] AGENTS.md (`VITE_DATA_SOURCE` default) y CONTEXT.md.
- [x] `pnpm run format:check`.

### Tarea A.3: ADR-0006

**Archivos:** `docs/adr/adr-0006-api-first-data-source.md`, `docs/adr/README.md`,
`docs/README.md`, `CONTEXT.md`

- [x] Crear ADR-0006 (ingles, formato del repo) con contexto, decision, consecuencias,
      alternativas e implementacion.
- [x] Indexarlo en los tres documentos.
- [x] `pnpm run format:check`.

---

## Fase B — Sincronizacion de mocks con OpenAPI

### Tarea B.1: Tests puros de contrato de mocks

**Archivos:** `src/data/mock/contract.test.ts`

- [x] Validar enums (tipos/estados, roles, metodos, estados de certificado) y campos obligatorios
      de todas las colecciones mock.
- [x] `pnpm exec vitest run src/data/mock`.

**Ejecutado (2026-09-25):** `src/data/mock/contract.test.ts` con 6 casos; 15 tests de `src/data/mock`
en verde.

### Tarea B.2: Script `api:mocks-check`

**Archivos:** `scripts/check-mock-contract.mjs` (crear), `scripts/check-mock-contract.test.mjs`
(crear), `package.json`

- [x] Reutilizar `loadOpenApi`, `createOperationView`, `parseArguments` y `DEFAULT_SOURCE` de
      `scripts/query-api-contract.mjs`.
- [x] Validar operaciones y schemas referenciados; campos requeridos y enums esperados.
- [x] Salida en espanol; exit 1 con instrucciones de actualizacion ante drift.
- [x] Agregar `"api:mocks-check": "node scripts/check-mock-contract.mjs"`.
- [x] Tests con fixtures; `pnpm exec vitest run scripts/check-mock-contract.test.mjs`.
- [x] `pnpm run api:mocks-check` con el backend vivo.

**Ejecutado (2026-09-25):** 10 tests del script en verde; contra el backend vivo reporta
`83 verificaciones en 7 operaciones` sin drift. Incluye deteccion de nuevos valores de enum.

### Tarea B.3: Regla de sincronizacion

**Archivos:** `AGENTS.md`, `.opencode/skills/api-contract/SKILL.md`

- [x] Documentar: todo cambio de contrato actualiza dominio, mappers, mocks y tests; validar con
      `pnpm run api:mocks-check` (backend vivo, no CI).
- [x] `pnpm run format:check`.

---

## Fase C — Capa de presentacion en espanol

### Tarea C.1: Mapas de etiquetas

**Archivos:** `features/activity-catalog/model/catalogLabels.ts`,
`features/certificates/model/certificateLabels.ts`,
`features/classrooms/model/classroomLabels.ts`, `features/users/model/userLabels.ts` y barrels

- [x] Mapas tipados `Record<Enum, string>` sin fallback crudo.
- [x] Exportar por los barrels de cada feature.
- [x] Tests colocados de completitud (etiqueta no vacia y distinta del codigo).
- [x] `pnpm exec vitest run src/features`.

**Ejecutado (2026-09-25):** `catalogLabels`, `certificateLabels`, `classroomLabels` y
`userLabels` con sus tests; 112 tests de `src/features` + `src/utils` en verde.

### Tarea C.2: Paginas en espanol

**Archivos:** `src/pages/CertificatesPage.tsx`, `ClassroomsPage.tsx`, `UsersPage.tsx`,
`AttendancePage.tsx`, `SpeakersPage.tsx`, `DashboardPage.tsx`, `src/utils/dateFormatting.ts`

- [x] Reemplazar ternarios y `roleLabels` inline por los mapas tipados.
- [x] `AttendancePage` usa el estado real de la actividad.
- [x] `SpeakersPage` formatea `submittedAt` con `formatDateTime` (es-PA).
- [x] Eliminar el badge "Datos de demostracion" del dashboard.
- [x] Test de `formatDateTime`; `pnpm run lint && pnpm run typecheck`.

### Tarea C.3: `ApiError` en espanol

**Archivos:** `src/app/adapters/http/apiClient.ts`, `apiClient.test.ts`

- [x] Clase `ApiError` con `status` y mensaje en espanol por codigo (400/401/403/404/409/422/5xx).
- [x] Error de red en espanol; sin ruta ni `message` del backend.
- [x] Actualizar/agregar tests.
- [x] `pnpm exec vitest run src/app/adapters/http && pnpm run lint && pnpm run typecheck`.

**Ejecutado (2026-09-25):** 8 tests de `apiClient` en verde; el adapter de catalogo actualizo su
aserción de fallo HTTP al mensaje nuevo.

### Tarea C.4: ADR-0007

**Archivos:** `docs/adr/adr-0007-capa-presentacion-espanol.md`, indices, `CONTEXT.md`, `AGENTS.md`

- [x] ADR-0007 con alternativas (i18n library, traducir en adapters, confiar en backend).
- [x] Regla "la UI no muestra codigos del API ni mensajes crudos; siempre espanol" en
      `AGENTS.md` y `CONTEXT.md`.
- [x] `pnpm run format:check`.

---

## Fase D — Verificacion final

- [x] `pnpm run format`.
- [x] `pnpm run lint`.
- [x] `pnpm test`.
- [x] `pnpm run build`.
- [x] `pnpm run check`.
- [x] `pnpm run api:mocks-check` con backend vivo.
- [x] Anotar evidencia en este plan.

**Aceptacion:** todo en verde y UI sin textos crudos del API.

**Ejecutado (2026-09-25):**

- `format` + `format:check`, `lint`, `pnpm test` (45 archivos / 229 tests), `build` y
  `pnpm run check` completos en verde (Storybook: 39 visual/a11y; inventario sin drift).
- `pnpm run api:mocks-check`: `83 verificaciones en 7 operaciones`, sin drift.
- Nota de concurrencia: durante esta fase aparecio en el arbol de trabajo una integracion de
  TanStack Query (`src/app/query`, persistencia incluida) desarrollada en paralelo; `useActivityCatalog`
  y `useOperations` ahora usan `useQuery`. `pnpm run check` fallo temporalmente por lint en
  `src/app/query/queryPersistence.ts:25` y el agente de esa tarea lo corrigio antes de cerrar este
  plan. Los entregables de este plan quedaron intactos y verificados.

---

## Riesgos y mitigaciones

| Riesgo                                          | Mitigacion                                                                       |
| ----------------------------------------------- | -------------------------------------------------------------------------------- |
| Desarrollo requiere backend en `localhost:3000` | Error español de conexion con reintento en `AsyncStateView`; README lo documenta |
| Modulos sin contrato muestran aviso pendiente   | Mensaje español existente en `unavailableOperationsAdapter.ts`                   |
| Storybook/tests cambian por el nuevo default    | Ambos inyectan `{ source: "mock" }` explicito                                    |
| Script `api:mocks-check` no corre en CI         | Tests puros del script en CI; script manual documentado                          |
| Cambios visuales por etiquetas                  | Las paginas afectadas no tienen stories; sin cambios de baselines                |
