# Frontend Architecture Improvements Implementation Plan

> **Para agentes:** REQUIRED SUB-SKILL: Use `executing-plans` para implementar tarea por tarea.
> Usa checkboxes (`- [ ]`) para seguimiento. No ejecutes Git ni toques el backend.

**Goal:** Eliminar cargas duplicadas de datos, concentrar métricas duplicadas en lógica pura,
alinear la estructura declarada con la real y documentar el fan-out del catálogo, sin agregar
dependencias y respetando las reglas de `AGENTS.md`.

**Architecture:** Un módulo profundo `AppDataProvider` carga catálogo y operaciones una sola vez
por sesión; los hooks de feature pasan a ser selectores. Las métricas por Contexto de Trabajo se
mueven a `features/reports/model`. El cliente HTTP se reubica en el composition root
(`src/app/adapters/http`). El fan-out del adapter se mantiene y se documenta con evidencia del
contrato OpenAPI.

**Tech Stack:** React 19, TypeScript 6, Vite, Vitest, Testing Library, Chakra UI v3, Zustand.

**Reglas del plan:**

- Cada tarea termina con su verificación. No marcar completada sin verificación en verde.
- No ejecutar comandos Git. Los commit/push los hace el operador.
- Cambios mínimos; no refactors no listados.
- Test-first cuando la tarea crea lógica pura nueva (Fases 2 y 4).

**Relación con otros planes:**

- `2026-09-25-ai-harness-hardening.md` Tarea 1.1 ya cubre: tipo `WorkingContext` en
  `src/types/domain.ts`, imports cross-feature por barrel y un fitness test de arquitectura
  (`src/architecture.test.ts`, reglas R1 mocks, R2 UI pura, R3 cross-feature, R4 store).
  Ese plan está ejecutado (`[x]`): la Tarea 1.3 se marca cubierta; la Tarea 1.4 sigue pendiente
  porque R1-R4 no impiden importar páginas.
- La Tarea 1.4 de ese plan toca `README.md:301` citando `src/services/apiClient`; si este plan
  se ejecuta primero, esa frase debe apuntar a `src/app/adapters/http/apiClient`.
- Numeración de ADRs: ese plan crea `0001`-`0004`; este plan usa `0005` en adelante.

---

## Fase 0 — Baseline

### Tarea 0.1: Verificación base

**Archivos:** ninguno (solo lectura)

- [x] `pnpm install` (si el workspace está limpio).
- [x] `pnpm run lint`.
- [x] `pnpm test`.
- [x] `pnpm run build`.
- [x] Anotar cualquier fallo preexistente para no atribuirlo a los refactors.

**Aceptación:** baseline verde y fallos preexistentes registrados.

**Baseline registrado (2026-09-25):**

- Entorno: Node `v24.21.0` (nvm; se ejecutó con `PATH="$HOME/.nvm/versions/node/v24.21.0/bin:$PATH"`),
  pnpm `12.5.1`.
- `pnpm install --frozen-lockfile`: OK en 104 ms; lockfile al día.
- `pnpm run lint`: OK, sin warnings (`--max-warnings=0`).
- `pnpm test`: OK, 34 archivos y 181 tests en verde (~39 s).
- `pnpm run build`: OK; `tsc --noEmit` y `vite build` completan. Warning preexistente:
  chunk principal de 574 kB (>500 kB), no bloqueante.
- Fallos preexistentes: ninguno.
- Contexto: el árbol de trabajo ya contiene el refactor en curso sin commitear
  (`src/app`, `src/features`, `src/services` aún presente); el baseline no se tomó sobre un
  checkout limpio.

---

## Fase 1 — Saneamiento estructural y límites

### Tarea 1.1: Mover el cliente HTTP a `src/app/adapters/http`

**Archivos:** `src/services/apiClient.ts` (mover), `src/services/apiClient.test.ts` (mover),
`src/features/activity-catalog/adapters/apiActivityCatalogAdapter.ts` (modificar)

- [x] Crear `src/app/adapters/http/`.
- [x] Mover `src/services/apiClient.ts` → `src/app/adapters/http/apiClient.ts`.
- [x] Mover `src/services/apiClient.test.ts` → `src/app/adapters/http/apiClient.test.ts`
      y cambiar el import local a `./apiClient`.
- [x] Actualizar `apiActivityCatalogAdapter.ts:2` a `@/app/adapters/http/apiClient`.
- [x] Eliminar `src/services/` (debe quedar vacío).
- [x] Verificar: `rg "@/services"` sin resultados.
- [x] `pnpm exec vitest run src/app/adapters src/features/activity-catalog/adapters`.
- [x] `pnpm run lint && pnpm run typecheck`.

**Motivo:** `src/services` no existe en la estructura declarada en `AGENTS.md`/`CONTEXT.md` y
solo lo usa un adapter.
**Aceptación:** no existe `src/services`; tests y typecheck verdes.
**Nota:** si `2026-09-25-ai-harness-hardening.md` Tarea 1.4 ya citó `src/services/apiClient` en
`README.md`, actualizar la ruta en esa frase.

**Ejecutado (2026-09-25):**

- `src/services/` eliminado; `rg "@/services"` sin resultados en `src/`.
- Vitest de `src/app/adapters` + `src/features/activity-catalog/adapters`: 6 archivos / 38 tests
  en verde.
- `pnpm run lint` y `pnpm run typecheck`: verdes.
- `README.md` no mencionaba `src/services/apiClient`; no requirió cambio.

### Tarea 1.2: Mover la integridad del catálogo al modelo

**Archivos:** crear `src/features/activity-catalog/model/catalogIntegrity.ts` y
`catalogIntegrity.test.ts`; modificar
`src/features/activity-catalog/adapters/activityCatalogMapper.ts`,
`activityCatalogMapper.test.ts`, `apiActivityCatalogAdapter.ts`, `mockActivityCatalogAdapter.ts`

- [x] Crear `model/catalogIntegrity.ts` con `assertUnique`, `assertCatalogIntegrity` y una clase
      propia `CatalogIntegrityError` (el modelo no debe importar del adapter).
- [x] Quitar esas funciones de `activityCatalogMapper.ts` (dejar mappers y readers).
- [x] Actualizar imports en `apiActivityCatalogAdapter.ts:6` y `mockActivityCatalogAdapter.ts:4`.
- [x] Mover el bloque `describe("assertCatalogIntegrity")` de
      `activityCatalogMapper.test.ts:214` a `catalogIntegrity.test.ts`.
- [x] `pnpm exec vitest run src/features/activity-catalog`.
- [x] `pnpm run lint && pnpm run typecheck`.

**Motivo:** el adapter mock depende hoy del módulo de parseo de la API solo por la validación.
**Aceptación:** `mockActivityCatalogAdapter` no importa `activityCatalogMapper`; tests verdes.

**Ejecutado (2026-09-25):**

- `model/catalogIntegrity.ts` creado con `CatalogIntegrityError` (mismos mensajes y formato
  `${context}: ${detail}`); `assertUnique` queda privado del modelo.
- `activityCatalogMapper.ts` conserva mappers/readers y ya no usa el tipo `ActivityCatalog`.
- `mockActivityCatalogAdapter.ts` importa `../model/catalogIntegrity`; se verificó que no importa
  `activityCatalogMapper`.
- El `describe` movido vive en `model/catalogIntegrity.test.ts` con las factories existentes.
- Vitest de `src/features/activity-catalog`: 11 archivos / 66 tests en verde; lint y typecheck
  verdes.

### Tarea 1.3: Imports cross-feature por barrel

**Archivos:** los hooks listados abajo (modificar)

- [x] Reemplazar imports profundos por barrels:

  | Archivo                                                         | Antes                                                                                               | Después                                                 |
  | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
  | `features/users/hooks/useUsersOverview.ts:3-4`                  | `@/features/activity-catalog/hooks/useActivityCatalog`, `@/features/operations/hooks/useOperations` | `@/features/activity-catalog`, `@/features/operations`  |
  | `features/speakers/hooks/useSpeakersOverview.ts:3-4`            | ambos anteriores                                                                                    | ambos barrels                                           |
  | `features/classrooms/hooks/useClassroomsOverview.ts:1`          | `@/features/activity-catalog/hooks/useActivityCatalog`                                              | `@/features/activity-catalog`                           |
  | `features/dashboard/hooks/useDashboardOverview.ts:3-8`          | hooks y selectores profundos                                                                        | `@/features/activity-catalog` + `@/features/operations` |
  | `features/attendance/hooks/useAttendanceOverview.ts:3-4`        | hooks profundos de operations y working-context                                                     | `@/features/operations` + `@/features/working-context`  |
  | `features/certificates/hooks/useCertificatesOverview.ts:3-4`    | hooks profundos                                                                                     | ambos barrels                                           |
  | `features/reports/hooks/useReportsOverview.ts:3-4`              | hooks profundos                                                                                     | ambos barrels                                           |
  | `features/working-context/hooks/useWorkingContext.ts:3`         | `@/features/activity-catalog/hooks/useActivityCatalog`                                              | `@/features/activity-catalog`                           |
  | `features/activity-catalog/hooks/useActivityCatalogPage.ts:3-4` | `@/features/working-context/model/workingContext`                                                   | `@/features/working-context`                            |

- [x] Confirmar que el barrel de `activity-catalog` exporta los selectores que usa dashboard
      (`buildActivityRows`, `buildUnitOptions`); si falta alguno, agregarlo.
- [x] `pnpm test`.
- [x] `pnpm run lint && pnpm run typecheck`.

**Motivo:** `CONTEXT.md` exige barrels para imports públicos; hoy hay 10 imports profundos.
**Aceptación:** `rg 'from "@/features/[a-z-]+/(hooks|model|adapters|ui)/'` sin resultados fuera
de `src/app/adapters/**`.
**Nota:** cubierto por `2026-09-25-ai-harness-hardening.md` Tarea 1.1; ejecutar solo uno.

**Cubierta (2026-09-25) por `2026-09-25-ai-harness-hardening.md` Tarea 1.1 (`[x]`):**

- R3 en `src/architecture.test.ts:180` fuerza barrel público para imports cross-feature, con
  excepción en `src/app/adapters/**`.
- Los 9 hooks de la tabla importan barrels (`@/features/activity-catalog`,
  `@/features/operations`, `@/features/working-context`); el barril de activity-catalog ya
  exporta `buildActivityRows` y `buildUnitOptions`.
- `rg` de imports profundos cross-feature: sin resultados fuera de `src/app/adapters/**`.
- Sin cambios de código en este plan.

### Tarea 1.4: Frontera de imports para páginas (complemento)

**Archivos:** `eslint.config.js` (modificar)

- [x] Agregar un bloque `no-restricted-imports` para `src/**/*.{ts,tsx}` con
      `ignores: ["src/App.tsx", "src/main.tsx"]` que prohíba `@/pages/*` y `@pages/*`.
- [x] Agregar `@/App` a la lista restringida dejando fuera `src/main.tsx` y `*.test.*`.
- [x] `pnpm run lint`.

**Motivo:** el fitness test del plan de harness cubre mocks, store y cross-feature (R1-R4), pero
no impide que módulos importen páginas.
**Aceptación:** lint verde sin excepciones nuevas no documentadas.

**Ejecutado (2026-09-25):**

- En `eslint.config.js` van dos bloques: el segundo re-declara los patrones de páginas y agrega
  `@/App`, porque `no-restricted-imports` no admite `ignores` por patrón y el bloque posterior
  reemplaza las opciones del anterior.
  - Archivos normales: restringidos `@/pages/*`, `@pages/*`, `@/App`.
  - Tests (`**/*.test.*`): restringidos `@/pages/*`, `@pages/*`; `@/App` permitido.
  - `src/App.tsx` y `src/main.tsx`: sin restricción.
- `caseSensitive: true` explícito: el default `false` usa matching estilo gitignore y hacía que
  `@/App` capturara `@/app/adapters/**`.
- Verificado con temporales: archivo normal con `@/pages/LandingPage` + `@/App` → 2 errores;
  test con `@/App` → sin error y con `@/pages/LandingPage` → 1 error.
- `pnpm run lint` y `pnpm run format:check` verdes.

### Tarea 1.5: `App.test.tsx` sin mock directo

**Archivos:** `src/test/factories.ts`, `src/App.test.tsx`

- [x] Agregar `createUser` (con `globalRole` configurable) a `src/test/factories.ts`.
- [x] En `src/App.test.tsx:9-15`, reemplazar `mockOperationsReadModel` por
      `createUser({ globalRole: "ADMIN" })` y eliminar el import de `@/data/mock`.
- [x] `pnpm exec vitest run src/App.test.tsx`.
- [x] `pnpm run lint`.

**Motivo:** la regla del proyecto reserva `src/data/mock` para adapters y sus tests.
**Aceptación:** `App.test.tsx` no importa `@/data/mock` y pasa.

**Ejecutado (2026-09-25):** `createUser` usa `id: "user-1"` (mismo id del admin demo) para
conservar la aserción del flujo de login; `App.test.tsx` pasa (7 tests) y lint verde.

---

## Fase 2 — Métricas de alcance puras

### Tarea 2.1: Módulo `scopeMetrics` (test-first)

**Archivos:** crear `src/features/reports/model/scopeMetrics.ts` y `scopeMetrics.test.ts`;
modificar `src/features/reports/index.ts`

- [x] Escribir primero `scopeMetrics.test.ts` con factories.
- [x] Implementar funciones puras:
  - [x] `filterAttendanceByScope(records, activityIds)`
  - [x] `filterCertificatesByScope(certificates, activityIds)`
  - [x] `countConfirmedAttendance(records)`
  - [x] `countQrAttendance(records)`
  - [x] `countGeneratedCertificates(certificates)`
  - [x] `sumEnrolledCount(activities)`
- [x] Exportarlas desde `src/features/reports/index.ts`.
- [x] Agregar factories: `createAttendanceRecord`, `createCertificate`, `createCareer`,
      `createSpeakerProposal`, `createOperationsReadModel`.
- [x] `pnpm exec vitest run src/features/reports`.

**Motivo:** la misma regla de conteo está copiada en cuatro hooks sin tests puros.
**Aceptación:** funciones puras cubiertas y exportadas por barrel.

**Ejecutado (2026-09-25):** test-first verificado (falló sin el módulo); 10 tests puros en verde
y funciones exportadas por el barrel de reports.

### Tarea 2.2: Recomponer los hooks de resumen

**Archivos:** `useAttendanceOverview.ts`, `useCertificatesOverview.ts`,
`useReportsOverview.ts`, `useDashboardOverview.ts` (modificar)

- [x] `useAttendanceOverview.ts:10-38`: usar `filterAttendanceByScope`,
      `countConfirmedAttendance`, `countQrAttendance`.
- [x] `useCertificatesOverview.ts:10-40`: usar `filterCertificatesByScope`,
      `countGeneratedCertificates`.
- [x] `useReportsOverview.ts:10-39`: usar las funciones anteriores y `sumEnrolledCount`.
- [x] `useDashboardOverview.ts:23-46`: mismos conteos sobre `visibleRows` (por unidad, no por
      `scope`).
- [x] Conservar la interfaz pública de cada hook.
- [x] `pnpm exec vitest run src/features/attendance src/features/reports src/features/dashboard`.
- [x] `pnpm run lint && pnpm run typecheck`.

**Aceptación:** los hooks no contienen `new Set(scope.activityIds)` duplicado ni conteos inline;
tests de hooks verdes.

**Ejecutado (2026-09-25):** los cuatro hooks usan las funciones puras; los conteos inline
desaparecieron (queda un único `new Set` local para filtrar actividades) y lint/typecheck están
verdes.

---

## Fase 3 — Módulo de datos de aplicación (`AppDataProvider`)

### Tarea 3.1: Contexto y provider

**Archivos:** crear `src/app/data/appDataContext.ts`, `AppDataProvider.tsx`, `index.ts`;
modificar `src/main.tsx`, `src/test/render.tsx`

- [x] Definir en `appDataContext.ts`:

  ```ts
  type AppDataValue = {
    catalog: ActivityCatalog | null;
    catalogError: Error | null;
    isCatalogLoading: boolean;
    operations: OperationsReadModel | null;
    operationsError: Error | null;
    isOperationsLoading: boolean;
    refetch: () => void;
  };
  ```

- [x] Implementar `useAppData` con guard ("debe usarse dentro de AppDataProvider").
- [x] Implementar `AppDataProvider`: usa `useAppAdapters()` y llama `useAsyncData` una vez para
      catálogo y una vez para operaciones; `refetch` dispara ambos.
- [x] Mantener errores por recurso separados (con `VITE_DATA_SOURCE=api`, operaciones falla por
      contrato pendiente y las páginas de catálogo no deben mostrar ese error).
- [x] Exportar provider, hook y tipo desde `src/app/data/index.ts`.
- [x] Montar `AppDataProvider` dentro de `AppAdaptersProvider` en `src/main.tsx`.
- [x] Envolver con el mismo orden en `src/test/render.tsx`.
- [x] `pnpm run lint && pnpm run typecheck`.

**Aceptación:** app y tests montan el provider una sola vez.

**Ejecutado (2026-09-25):** `src/app/data/{appDataContext.ts,AppDataProvider.tsx,index.ts}` con
errores separados por recurso; montado en `main.tsx` y en el wrapper de tests.

### Tarea 3.2: Convertir `useActivityCatalog` y `useOperations` en selectores

**Archivos:** `src/features/activity-catalog/hooks/useActivityCatalog.ts`,
`src/features/operations/hooks/useOperations.ts` (modificar)

- [x] `useActivityCatalog` lee `catalog`, `catalogError`, `isCatalogLoading`, `refetch` de
      `useAppData` y conserva su API exportada.
- [x] `useOperations` lee `operations`, `operationsError`, `isOperationsLoading`, `refetch`.
- [x] Eliminar los `useAsyncData` locales de ambos hooks.
- [x] `pnpm test`.

**Aceptación:** los 14 consumidores siguen compilando y sus tests pasan sin cambios.

**Ejecutado (2026-09-25):** ambos hooks son selectores de `useAppData`; `pnpm test` completo
(37 archivos / 196 tests en ese momento) sin cambios en consumidores.

### Tarea 3.3: Pruebas del provider

**Archivos:** crear `src/app/data/AppDataProvider.test.tsx`

- [x] Con dos consumidores, cada adapter se invoca exactamente una vez.
- [x] `refetch` vuelve a invocar ambos loaders.
- [x] Un error de operaciones no contamina `catalogError` (y viceversa).
- [x] `pnpm exec vitest run src/app/data`.
- [x] `pnpm test && pnpm run build`.

**Aceptación:** el test demuestra una sola carga por recurso y el aislamiento de errores.
**Motivo:** hoy `useActivityCatalog`/`useOperations` se invocan en 7 sitios cada uno; en
`/admin/asistencia` se cargan dos veces catálogo y una operaciones por navegación.

**Ejecutado (2026-09-25):** `AppDataProvider.test.tsx` con 5 casos (dos consumidores, refetch,
aislamiento en ambos sentidos y guard fuera del provider); vitest de `src/app/data`, `pnpm test`
y build en verde.

---

## Fase 4 — Orquestación de filtros compartida

### Tarea 4.1: Extraer `useCatalogFilters` (test-first)

**Archivos:** crear `src/features/activity-catalog/hooks/useCatalogFilters.ts` y su test

- [x] Escribir primero el test del hook con `renderHookWithProviders`.
- [x] Implementar `useCatalogFilters(catalog, { initialSortDirection })`: estado `searchTerm`,
      `unitFilter`, `typeFilter`, `programFilter`, `sortDirection`, `page`;
      `updateFilter` con `startTransition` y reset de página; `onClearFilters`.
- [x] `pnpm exec vitest run src/features/activity-catalog/hooks/useCatalogFilters.test.ts`.

**Aceptación:** el hook concentra el estado y los callbacks de filtrado.

**Ejecutado (2026-09-25):** test-first verificado; la firma se amplió a
`{ initialSortDirection, perPage, initialUnitFilter?, onUnitFilterChange? }` para cubrir la
paginación (10/9) y la sincronización con `unitPreference` de la Fase 5. 4 tests en verde.

### Tarea 4.2: Recomponer las vistas de catálogo

**Archivos:** `usePublicActivities.ts`, `useActivityCatalogPage.ts` (modificar)

- [x] `usePublicActivities` conserva `PUBLIC_ACTIVITIES_PER_PAGE` y su API; usa el hook
      compartido.
- [x] `useActivityCatalogPage` conserva `ADMIN_ACTIVITIES_PER_PAGE` y su API; usa el hook
      compartido.
- [x] `pnpm exec vitest run src/features/activity-catalog`.
- [x] `pnpm run lint && pnpm run typecheck`.

**Aceptación:** no queda el bloque `rows → filteredRows → pagination → updateFilter` duplicado.

**Ejecutado (2026-09-25):** ambas vistas delegan en `useCatalogFilters`; APIs intactas y
12 archivos / 70 tests de activity-catalog en verde.

---

## Fase 5 — Preferencia de unidad (Opción A)

### Tarea 5.1: Conectar el store al catálogo administrativo

**Archivos:** `useActivityCatalogPage.ts` (modificar)

- [x] Tomar `selectedUnitId` de `useUnitPreferenceStore` como `unitFilter` inicial.
- [x] Al cambiar de unidad, actualizar el store además del estado de filtros.
- [x] La página pública mantiene su filtro local (no usa el store).
- [x] `pnpm exec vitest run src/features/activity-catalog`.

**Aceptación:** la unidad seleccionada persiste al navegar entre páginas admin durante la sesión.

**Ejecutado (2026-09-25):** `useActivityCatalogPage` pasa `initialUnitFilter`/`onUnitFilterChange`
al hook compartido (incluido `onClearFilters` → `"all"`); la vista pública no toca el store.

### Tarea 5.2: Limpiar la preferencia al cerrar sesión

**Archivos:** `src/pages/LogoutPage.tsx`, `src/App.test.tsx` (modificar)

- [x] `LogoutPage` llama `setSelectedUnitId("all")` junto con `clearWorkingContext`.
- [x] Extender en `App.test.tsx` el caso "should clear the working context when the session
      closes" para verificar que la preferencia vuelve a `"all"`.
- [x] `pnpm exec vitest run src/App.test.tsx`.
- [x] `pnpm run lint`.

**Aceptación:** cerrar sesión deja `selectedUnitId === "all"`.

**Ejecutado (2026-09-25):** el caso de cierre fija `"fisc"` antes del logout y verifica `"all"`
después; `beforeEach` resetea la preferencia para aislar tests. 7 tests en verde.

---

## Fase 6 — Fan-out del catálogo: mantener y documentar

### Tarea 6.1: Evidencia del contrato y decisión registrada

**Archivos:** `apiActivityCatalogAdapter.ts` (comentario), crear
`docs/adr/0005-fanout-catalogo-actividades.md`, `CONTEXT.md` (modificar)

- [x] Agregar en `loadCatalog` un comentario breve: el detalle por actividad es necesario porque
      solo `ActivityDetail` (`GET /api/v1/activities/{id}`) expone `equipment`, `enrolledCount`,
      `checkedInCount` y `cancelReason`.
- [x] Crear el ADR `0005-fanout-catalogo-actividades.md` (usar la skill
      `create-architectural-decision-record`) con la evidencia:
      `GET /api/v1/activities` solo devuelve próximas y sin esos campos;
      `GET /api/v1/event-programs/{id}/activities` tampoco los trae.
- [x] Registrar la condición de revisión: "si `EventProgramActivityItem` agrega
      `enrolledCount`, `checkedInCount`, `equipment` o `cancelReason`, se elimina la llamada por
      actividad".
- [x] Registrar la decisión en `CONTEXT.md`.
- [x] `pnpm exec vitest run src/features/activity-catalog/adapters`.
- [x] `pnpm run lint`.

**Aceptación:** la decisión queda documentada con cita del contrato; sin cambio de comportamiento.

**Ejecutado (2026-09-25):**

- Evidencia verificada con el CLI contra el backend vivo: `GET /api/v1/activities` devuelve
  `ActivityListItem` (sin `status`) y `GET /api/v1/event-programs/{id}/activities` devuelve
  `EventProgramActivityItem` (con `status`), ambos sin `equipment`, `enrolledCount`,
  `checkedInCount` ni `cancelReason`; solo `GET /api/v1/activities/{id}` (`ActivityDetail`) los
  expone. El nombre `EventProgramActivityItem` del plan era correcto.
- ADR creado como `docs/adr/adr-0005-fanout-catalogo-actividades.md` (convención `adr-NNNN`),
  en inglés como 0001-0004; indexado en `docs/adr/README.md`, `docs/README.md` y `CONTEXT.md`.
- Sin cambio de comportamiento; 22 tests de adapters en verde.

---

## Fase 7 — Documentación y verificación final

### Tarea 7.1: Actualizar documentación

**Archivos:** `CONTEXT.md`, `AGENTS.md`, `README.md` (modificar si aplica)

- [x] `CONTEXT.md`:
  - [x] `### Capas`: incluir `app/data` y `app/adapters/http`.
  - [x] `### Adapters`: `AppDataProvider` (una carga por sesión), ubicación del cliente HTTP y
        métricas en `reports/model`.
  - [x] `## Decisiones De Trabajo`: preferencia de unidad conectada y fan-out documentado.
  - [x] Eliminar menciones a `src/services`.
- [x] `AGENTS.md`: agregar `src/app/data` y `src/app/adapters/http` a la estructura.
- [x] `README.md`: si menciona `src/services/apiClient`, actualizar la ruta.
- [x] `pnpm run format:check`.

**Aceptación:** la documentación describe la estructura real.

**Ejecutado (2026-09-25):** `CONTEXT.md` (capas, adapters, decisiones), `AGENTS.md` y `README.md`
(estructura y `src/data/mock`) actualizados; `README.md` ya citaba
`src/app/adapters/http/apiClient.ts` y no quedan menciones a `src/services` fuera de los planes.

### Tarea 7.2: Verificación final

- [x] `pnpm run format`.
- [x] `pnpm run lint`.
- [x] `pnpm test`.
- [x] `pnpm run build`.
- [x] `pnpm run check` si Storybook está operativo (no se esperan cambios de UI ni de stories).

**Aceptación:** todo en verde.

**Ejecutado (2026-09-25):** `format` + `format:check`, `lint`, `pnpm test` (39 archivos / 205
tests), `build` (con warning preexistente de chunk >500 kB) y `check` completo: Storybook
(39 visual/a11y) e inventario de componentes en verde. Sin cambios de UI ni de stories.

---

## Riesgos y mitigaciones

| Riesgo                                                             | Mitigación                                                                                                  |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Duplicación con `2026-09-25-ai-harness-hardening.md` T1.1/T1.3     | Ejecutar uno de los dos para 1.3/1.4 y marcar el otro como cubierto                                         |
| Los barrels de feature cargan UI en hooks que solo necesitan datos | Las páginas son `lazy()`; si molesta, documentar excepción en `CONTEXT.md`                                  |
| `AppDataProvider` altera el timing en tests existentes             | El wrapper de `src/test/render.tsx` monta el provider; los tests de hooks ya usan `renderHookWithProviders` |
| StrictMode duplica efectos en dev                                  | `useAsyncData` ya ignora respuestas obsoletas con su bandera `ignore`                                       |
| Colisión de numeración de ADRs                                     | Este plan usa `0005`+ porque el plan de harness crea `0001`-`0004`                                          |
| `unitPreference` conectado rompe tests del catálogo                | Cambio cubierto por los tests existentes de `useActivityCatalogPage` y `App.test.tsx`                       |

## Preguntas abiertas

1. ¿Se ejecuta `2026-09-25-ai-harness-hardening.md` antes que este plan? Determina si las
   Tareas 1.3 y 1.4 se marcan cubiertas.
2. ¿Se agrega un ADR `0006-app-data-provider.md` para el módulo de datos o basta `CONTEXT.md`?
3. ¿La preferencia de unidad debe persistir entre recargas (como la sesión) o solo en memoria?

**Resueltas (2026-09-25):**

1. Sí: el plan de harness ya estaba ejecutado. La Tarea 1.3 se marcó cubierta por su T1.1;
   la Tarea 1.4 se ejecutó aquí porque R1-R4 no impedían importar páginas.
2. No hace falta ADR-0006: el módulo de datos queda documentado en `CONTEXT.md` (capas,
   adapters) y su comportamiento está cubierto por `AppDataProvider.test.tsx`; el ADR
   nuevo es solo el 0005 del fan-out.
3. Solo en memoria: `useUnitPreferenceStore` no usa persistencia, igual que el contexto de
   trabajo; se limpia al cerrar sesión.

## Orden sugerido

0.1 → 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 2.1 → 2.2 → 3.1 → 3.2 → 3.3 → 4.1 → 4.2 → 5.1 → 5.2 →
6.1 → 7.1 → 7.2

## Definición de terminado global

- Catálogo y operaciones se cargan una sola vez por sesión (test del provider).
- Cero imports de `@/data/mock` fuera de adapters y sus tests.
- Sin imports cross-feature profundos; barrels públicos en uso.
- Métricas de alcance en funciones puras testeadas.
- Fan-out documentado con evidencia del contrato OpenAPI.
- `pnpm run lint`, `pnpm test` y `pnpm run build` en verde.
- `CONTEXT.md` y `AGENTS.md` describen la estructura real (sin `src/services`).
