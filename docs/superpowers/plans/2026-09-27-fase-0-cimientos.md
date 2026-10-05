# SIPEG Frontend Phase 0 Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar la Fase 0 con fuentes de verdad coherentes, requisitos trazables, navegacion sin modulos huerfanos, fronteras HTTP seguras, reglas de arquitectura ejecutables y cobertura Storybook de los cimientos compartidos.

**Architecture:** La fase conserva la estructura actual y aplica cambios incrementales. `OperationsAdapter` queda congelado mediante fitness functions hasta que cada dominio lo sustituya; el catalogo publico y el administrativo comparten mapper, pero declaran una politica de autenticacion y una identidad de cache distintas.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Chakra UI 3, React Router 8, TanStack Query 5, Zustand 5, Vitest 5, Testing Library, Storybook 10 y Playwright.

---

## Decisiones aprobadas

- SIPEG es un producto independiente; este repositorio implementa una instancia mono-organizacion configurada para UTP.
- No se implementa multitenancy.
- La voz de interfaz usa tratamiento formal de usted.
- La Fase 0 mantiene `/admin`; la separacion futura `/operaciones` se documenta para Fase 3.
- Los cambios sin commit de registro, verificacion de correo y autenticacion forman parte del estado inicial y no deben revertirse.

## Task 1: Baseline tecnico inicial

**Files:**

- Modify: `docs/superpowers/plans/2026-09-27-fase-0-cimientos.md`

- [x] Registrar rama, estado del arbol, Node, pnpm y fecha UTC.
- [x] Ejecutar `pnpm install --frozen-lockfile`.
- [x] Ejecutar `pnpm run verify:quick` y registrar resultado, archivos y pruebas.
- [x] Ejecutar `pnpm run test:coverage` y registrar statements, branches, functions y lines.
- [x] Ejecutar `pnpm run check` y registrar app build, Storybook, axe y visuales.
- [x] Ejecutar `pnpm run audit` y registrar vulnerabilidades por severidad.
- [x] Registrar tamano total de `dist`, `storybook-static`, assets principales y warnings del build.
- [x] No corregir automaticamente fallos antes de dejar evidencia del baseline.

## Task 2: Identidad y voz de producto

**Files:**

- Modify: `README.md`
- Modify: `CONTEXT.md`
- Modify: `DESIGN.md`
- Modify: `src/app/adapters/http/apiClient.ts`
- Modify: `src/app/adapters/http/apiClient.test.ts`
- Modify: `src/features/auth/adapters/mockAuthAdapter.ts`
- Modify: `src/features/auth/adapters/mockAuthAdapter.test.ts`
- Modify: `src/features/auth/ui/LoginForm.tsx`
- Modify: `src/features/auth/ui/LoginForm.test.tsx`
- Modify: `src/features/registration/model/registrationValidation.ts`
- Modify: `src/features/registration/model/registrationValidation.test.ts`
- Modify: `src/features/registration/ui/RegisterForm.tsx`
- Modify: `src/features/registration/ui/RegisterForm.test.tsx`
- Modify: `src/features/registration/ui/RegisterForm.stories.tsx`
- Modify: `src/features/registration/ui/RegisterView.tsx`
- Modify: `src/pages/AttendancePage.tsx`
- Modify: `src/pages/CertificatesPage.tsx`
- Modify: `src/pages/LandingPage.tsx`
- Modify: `src/pages/LoginPage.tsx`
- Modify: `src/pages/RegisterPage.tsx`
- Modify: `src/pages/ReportsPage.tsx`
- Modify: `src/pages/VerifyEmailPage.tsx`
- Modify: related colocated tests and stories

- [x] Cambiar primero assertions de texto a la voz formal y ejecutar las pruebas dirigidas para verificar RED.
- [x] Declarar de forma identica producto independiente, instancia UTP y ausencia de multitenancy en las tres fuentes de verdad.
- [x] Cambiar textos informales: `tu` -> `su`, `tus` -> `sus`, y los imperativos a forma formal.
- [x] Mantener identificadores tecnicos del repositorio sin presentarlos como marca visible.
- [x] Ejecutar pruebas dirigidas de auth, registro, paginas y `App.test.tsx` hasta GREEN.
- [x] Buscar vocabulario informal residual en `src/` y revisar cada resultado.

## Task 3: Trazabilidad funcional

**Files:**

- Modify: `docs/product/features.md`
- Modify: `spec/README.md`
- Add: `spec/accounts/accounts-features.md`
- Add: `spec/catalogs/catalogs-features.md`
- Add: `spec/users/users-features.md`
- Add: `spec/collaboration/collaboration-features.md`
- Add: `spec/event-programs/event-programs-features.md`
- Add: `spec/activities/activities-features.md`
- Add: `spec/speaker-proposals/speaker-proposals-features.md`
- Add: `spec/attendance/attendance-features.md`
- Add: `spec/certificates/certificates-features.md`
- Add: `spec/alerts/alerts-features.md`
- Add: `spec/notifications/notifications-features.md`
- Add: `spec/reports/reports-features.md`
- Modify: `docs/README.md`

- [x] Asignar IDs estables por dominio a las capacidades esperadas.
- [x] Enlazar cada requisito a una unica spec primaria.
- [x] Documentar problema, usuarios, resultado, alcance, exclusiones, reglas, historias, aceptacion, calidad, dependencias y preguntas abiertas en cada spec.
- [x] Mantener contrato pendiente como pregunta abierta; no inventar payloads ni estados.
- [x] Corregir el estado del README: catalogo y aulas son parciales, no finalizados.
- [x] Revisar mecanicamente que cada ID del indice tenga un enlace existente.

## Task 4: Arquitectura de informacion y rutas

**Files:**

- Add: `docs/product/information-architecture.md`
- Modify: `src/App.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/AdminMenu.tsx`
- Add: `src/components/layout/AdminMenu.test.tsx`
- Modify: `src/components/layout/AppMenu.stories.tsx`
- Modify: `docs/components/README.md`
- Modify: `CONTEXT.md`

- [x] Escribir primero pruebas RED para `/admin/aulas`, `/admin/ponentes`, `/admin/usuarios` y sus enlaces de menu.
- [x] Escribir pruebas RED para redirects heredados `/aulas`, `/ponentes` y `/usuarios`.
- [x] Mover las paginas existentes bajo el layout `/admin` y convertir las rutas superiores en redirects.
- [x] Mantener los aliases existentes hasta la migracion de Fase 3; documentar su condicion de retiro.
- [x] Documentar rutas publicas, personales, operativas y exclusivas de ADMIN.
- [x] Documentar que `/operaciones` no se implementa hasta resolver descubrimiento de scopes en Fase 3.
- [x] Ejecutar `App.test.tsx` y `AdminMenu.test.tsx` hasta GREEN.

## Task 5: Migracion incremental de adapters

**Files:**

- Add: `docs/adr/adr-0011-domain-adapter-strangler-migration.md`
- Modify: `docs/adr/README.md`
- Modify: `docs/README.md`
- Modify: `CONTEXT.md`
- Modify: `src/architecture.test.ts`

- [x] Refactorizar los helpers de fitness functions con pruebas sinteticas RED para reglas nuevas.
- [x] Agregar R5: `apiRequest` solo se importa desde adapters; `ApiError` de Query queda como excepcion documentada.
- [x] Agregar R6: `fetch` directo y strings `/api/v1` solo viven en cliente HTTP, adapters o tests.
- [x] Agregar R7: lista cerrada de consumidores actuales de `@/features/operations`; no se admiten consumidores nuevos.
- [x] Ampliar la regla de barrels a paginas y componentes cuando importan features.
- [x] Documentar el orden de extraccion carreras -> usuarios -> propuestas -> asistencia -> certificados -> reportes.
- [x] No crear adapters vacios, no hacer parcial el agregado y no mezclar API con fallback mock.
- [x] Ejecutar `src/architecture.test.ts` hasta GREEN.

## Task 6: Frontera HTTP publica y administrativa

**Files:**

- Add: `docs/adr/adr-0012-explicit-http-authentication-policy.md`
- Modify: `docs/adr/README.md`
- Modify: `docs/README.md`
- Modify: `CONTEXT.md`
- Modify: `src/app/adapters/contracts.ts`
- Modify: `src/app/adapters/createAppAdapters.ts`
- Modify: `src/app/adapters/createAppAdapters.test.ts`
- Modify: `src/app/adapters/http/apiClient.ts`
- Modify: `src/app/adapters/http/apiClient.test.ts`
- Modify: `src/app/query/queryKeys.ts`
- Modify: `src/app/query/queryPersistence.ts`
- Modify: `src/app/query/queryPersistence.test.ts`
- Modify: `src/features/activity-catalog/adapters/apiActivityCatalogAdapter.ts`
- Modify: `src/features/activity-catalog/adapters/apiActivityCatalogAdapter.test.ts`
- Modify: `src/features/activity-catalog/adapters/mockActivityCatalogAdapter.ts`
- Modify: `src/features/activity-catalog/adapters/mockActivityCatalogAdapter.test.ts`
- Modify: `src/features/activity-catalog/hooks/useActivityCatalog.ts`
- Modify: `src/features/activity-catalog/hooks/useActivityCatalog.test.tsx`
- Modify: `src/features/auth/adapters/apiAuthAdapter.ts`
- Modify: `src/features/auth/adapters/apiAuthAdapter.test.ts`
- Modify: `src/features/registration/adapters/apiRegistrationAdapter.ts`
- Modify: `src/features/registration/adapters/apiRegistrationAdapter.test.ts`
- Modify: `src/features/operations/hooks/useOperations.ts`
- Modify: `src/features/operations/hooks/useOperations.test.tsx`
- Modify: tests administrativos que consumen los hooks anteriores

- [x] RED: exigir `auth: { mode: "none" | "bearer" }` en cada request.
- [x] RED: rechazar `Authorization` manual y no ejecutar fetch si falta token en modo bearer.
- [x] GREEN: construir Authorization solo dentro de `apiClient`.
- [x] RED: demostrar que `loadCatalog("public")` nunca envia Bearer y que `administrative` si lo envia.
- [x] GREEN: pasar el acceso al contrato del adapter y mantener el lector de sesion fuera de `apiOptions` publico.
- [x] RED: exigir query keys administrativas y de operaciones por `userId`, sin token.
- [x] GREEN: deshabilitar queries privadas anonimas y usar el estado real `isLoading`.
- [x] RED: demostrar que solo el catalogo publico exitoso se deshidrata.
- [x] GREEN: agregar version de esquema al buster de persistencia.
- [x] GREEN: devolver copias independientes desde el adapter mock.
- [ ] Consultar de forma dirigida las operaciones GET del catalogo si el backend esta disponible.
- [x] Ejecutar las suites dirigidas y luego `pnpm test`.

## Task 7: Storybook fundacional

**Files:**

- Modify: `.storybook/preview.tsx`
- Add: `src/components/ui/SelectionRequiredState.stories.tsx`
- Add: `src/components/ui/SelectionRequiredState.test.tsx`
- Modify: `src/components/ui/AsyncStateView.test.tsx`
- Add: `src/components/layout/AppLayout.stories.tsx`
- Add: `src/components/layout/AdminLayout.stories.tsx`
- Add: `src/components/layout/AdminMenu.stories.tsx`
- Add: `src/components/layout/AppFooter.stories.tsx`
- Add: `src/components/layout/SkipLink.stories.tsx`
- Add: `src/features/working-context/ui/WorkingContextSelect.stories.tsx`
- Modify: `docs/components/README.md`
- Regenerate: `docs/components/INVENTORY.md`
- Regenerate: `docs/components/generated-inventory.json`
- Regenerate: `.storybook/__image_snapshots__/*.png`

- [x] Agregar `QueryProvider persist={false}` aislado por story al decorador global.
- [x] Mover la prueba de `SelectionRequiredState` a su archivo colocado.
- [x] Crear stories con providers y datos mock deterministas.
- [x] Agregar `play` a SkipLink, AdminMenu y WorkingContextSelect.
- [x] Ejecutar tests colocados antes de Storybook.
- [x] Consultar `stories-changed`, abrir previews y revisar variantes relevantes.
- [x] Ejecutar `pnpm run components:inventory` y revisar el diff generado.
- [x] Ejecutar `pnpm run test:storybook`; actualizar baselines solo despues de verificar que los cambios visuales son intencionales.
- [x] Ejecutar nuevamente `pnpm run test:storybook` y `components:inventory:check`.

## Task 8: Cierre, evidencia y nombre estable

**Files:**

- Modify: `README.md`
- Modify: `CONTEXT.md`
- Modify: `docs/README.md`
- Modify: `docs/superpowers/plans/2026-09-27-fase-0-cimientos.md`
- Renamed: `docs/superpowers/plans/2026-09-27-plan-maestro-frontend.md` -> `docs/superpowers/plans/plan-maestro-frontend.md`

- [x] Ejecutar `pnpm run verify:quick`.
- [x] Ejecutar `pnpm run test:coverage` y comparar con el baseline inicial.
- [x] Ejecutar `pnpm run check`.
- [x] Ejecutar `pnpm run audit`.
- [x] Ejecutar `git diff --check` y revisar que no se haya sobrescrito trabajo preexistente.
- [x] Registrar metricas finales, desviaciones y bloqueos contractuales en este documento.
- [x] Marcar 0.2-0.8 como completados solo con evidencia.
- [x] Actualizar el estado actual del roadmap.
- [x] Renombrar el roadmap al nombre estable y actualizar todos sus enlaces.
- [x] Confirmar con busqueda global que el nombre fechado anterior ya no aparece.
- [x] No crear commit salvo solicitud expresa.

## Registro de ejecucion

### Baseline inicial - 2026-09-27

- Entorno: rama `dev`, fecha UTC `2026-09-27T18:12:30Z`, Node `v24.21.0` y pnpm `12.5.1`.
- Arbol inicial: 22 rutas modificadas y 9 rutas sin seguimiento, incluidos los cambios preexistentes de autenticacion, registro y verificacion que esta fase debe preservar.
- `pnpm install --frozen-lockfile`: correcto; lockfile vigente y dependencias ya instaladas.
- `pnpm run verify:quick`: correcto en `145.60s`; formato, ESLint y TypeScript pasaron; Vitest ejecuto 64 archivos y 325 pruebas, todas correctas. El primer intento se interrumpio por el limite externo de 120 segundos mientras Vitest seguia ejecutandose; se repitio sin modificar codigo con un limite mayor.
- `pnpm run test:coverage`: correcto en `108.68s`; 89.82% statements, 83.45% branches, 92.34% functions y 90.12% lines.
- `pnpm run check`: correcto en `1690.57s`; 64 archivos y 325 pruebas unitarias, build de produccion, build Storybook, 14 suites/49 pruebas del runner, 49 pruebas visuales y de accesibilidad sin violaciones, e inventario vigente.
- Durante `check`, un proceso previo ya ocupaba `127.0.0.1:6006`; el servidor lanzado por `start-server-and-test` emitio `EADDRINUSE`, pero el servidor existente respondio, ambas suites Storybook finalizaron correctamente y el comando completo devolvio exito. Debe evitarse reutilizar ese puerto en la verificacion final.
- `pnpm run audit`: correcto para el umbral alto; 1 vulnerabilidad moderada, 0 altas y 0 criticas.
- Build de aplicacion: `dist` 788K, `dist/assets` 720K; chunks principales `components` 423.41 kB (115.50 kB gzip) e `index` 222.16 kB (69.66 kB gzip).
- Build de Storybook: `storybook-static` 9.2M, `storybook-static/assets` 3.4M; warning por chunks superiores a 500 kB, con `iframe` 1,131.86 kB (322.55 kB gzip) y `axe` 587.04 kB (160.26 kB gzip).
- No se corrigieron automaticamente warnings, vulnerabilidades ni tiempos antes de registrar esta evidencia.

### Task 2 - Identidad y voz de producto

- RED: se cambiaron primero las expectativas de voz en siete suites; la ejecucion dirigida produjo 17 fallos por los textos informales existentes. Dos assertions se ajustaron para apuntar a los mensajes correctos de sesion del adapter mock y una prueba usa una promesa pendiente para observar de forma determinista el estado de verificacion.
- GREEN: nueve archivos de prueba dirigidos finalizaron con 49 pruebas correctas.
- `README.md`, `CONTEXT.md` y `DESIGN.md` declaran SIPEG como producto independiente, esta instancia como monoorganizacion configurada para UTP y la ausencia de multitenancy.
- Se formalizo el copy visible de autenticacion, registro, verificacion, catalogo, landing y modulos operativos sin modificar su logica.
- La busqueda residual en `src/` solo encontro `Usa` dentro de documentacion tecnica de una story de `StatusPanel`; no es copy de producto. Los identificadores tecnicos con `SIPEG-UTP` se conservaron.
- Previews revisables: LoginForm Default, RegisterForm Registration Error, ActivityFilters Administrative y ModuleShell Default.

### Task 3 - Trazabilidad funcional

- `docs/product/features.md` registra 73 capacidades unicas con los prefijos `ACC`, `CAT`, `USR`,
  `COL`, `EPG`, `ACT`, `SPP`, `ATT`, `CER`, `ALT`, `NTF` y `RPT`; cada fila tiene una unica spec
  primaria.
- Se crearon las 12 specs de dominio con alcance, exclusiones, reglas, historias y criterios de
  aceptacion, calidad, dependencias y preguntas contractuales abiertas.
- `spec/README.md` fija la inmutabilidad de IDs, la propiedad primaria unica y la separacion entre
  alcance y estado. Las specs existentes de autenticacion y catalogo quedan como apoyo, sin propiedad
  primaria duplicada.
- El README marca catalogo de actividades, filtros e inventario de aulas como parciales y conserva
  los estados existentes de autenticacion y registro.
- Validacion mecanica correcta: 73 IDs indexados y 73 unicos; los 12 prefijos estan presentes; cada
  fila contiene un solo enlace existente y cada ID aparece en su spec primaria. Las 12 specs contienen
  las diez secciones requeridas.
- `prettier --check` sobre los 19 documentos afectados y `git diff --check`: correctos.

### Task 4 - Arquitectura de informacion y rutas

- RED: `App.test.tsx` y el nuevo `AdminMenu.test.tsx` produjeron siete fallos por las tres rutas
  canonicas ausentes, los tres aliases que aun renderizaban fuera del panel y los enlaces faltantes.
- GREEN: las dos suites finalizaron con 17 pruebas correctas.
- Aulas, ponentes y usuarios ahora viven bajo `AdminLayout` en `/admin/*`; sus rutas superiores
  redirigen al destino canonico junto con los aliases administrativos existentes.
- `AdminMenu` enlaza todos los modulos implementados del panel.
- `docs/product/information-architecture.md` clasifica destinos publicos, personales y
  administrativos, documenta la retirada futura de aliases y aplaza `/operaciones` hasta el
  descubrimiento de scopes de Fase 3.

### Task 5 - Migracion incremental de adapters

- El scanner se refactorizo bajo las cinco pruebas existentes para aceptar fixtures en memoria,
  conservar simbolos importados, inspeccionar AST e incluir JavaScript.
- RED: cuatro fixtures sinteticos demostraron que imports profundos desde paginas, `apiRequest`,
  `fetch`/`/api/v1` y consumidores nuevos de operations no estaban bloqueados; un quinto RED cubrio
  imports dinamicos del cliente HTTP.
- GREEN: `src/architecture.test.ts` finalizo con 14 pruebas correctas.
- R5 reserva el cliente HTTP a adapters y permite a Query importar exclusivamente `ApiError`; R6
  inspecciona sintaxis y mantiene una excepcion exacta de `fetch` para el service worker; R7 congela
  los ocho consumidores externos actuales del agregado.
- ADR-0011 define el strangler de `OperationsAdapter`: carreras, usuarios, propuestas, asistencia,
  certificados y reportes, sin puertos vacios ni fallback mock bajo origen API.

### Task 6 - Frontera HTTP publica y administrativa

- RED: 16 suites dirigidas ejecutaron 77 pruebas; 20 fallaron como se esperaba por autorizacion
  manual permitida, bearer ausente aceptado, token filtrado al catalogo publico, lector no resuelto en
  modo administrativo, claves privadas estaticas, queries privadas anonimas activas, buster sin
  esquema y referencias compartidas en el mock.
- GREEN: las mismas 16 suites finalizaron con 77 pruebas correctas; las dos suites UI administrativas
  descubiertas por la corrida completa agregaron sesion explicita y finalizaron con 7 pruebas
  correctas. `renderWithProviders` conserva su estado anonimo predeterminado.
- `apiRequest` exige una politica discriminada en cada llamada, rechaza `Authorization` manual y
  bearer vacio antes de `fetch`, y es el unico constructor de la cabecera. Perfil usa bearer;
  login, logout, refresh, verificacion, registro y catalogos de registro usan modo publico.
- El catalogo declara acceso `public` o `administrative`; el composition root inyecta privadamente el
  lector de token, el modo administrativo lo resuelve una vez y el modo publico lo ignora. El mock
  devuelve una copia profunda independiente en cada carga.
- Las claves administrativas y de operaciones incluyen `userId`, nunca token; las queries privadas
  anonimas quedan deshabilitadas con refetch protegido y exponen `isLoading` real de React Query.
- Solo el catalogo publico exitoso puede deshidratarse. El buster se compone como
  `<schema>:<VITE_APP_VERSION o dev>` mediante `QUERY_CACHE_SCHEMA_VERSION`.
- `pnpm test`: correcto tras reintentar una fluctuacion de tiempo ajena en `RegisterForm`; 65 archivos
  y 353 pruebas correctas en `99.22s`. La prueba aislada de `RegisterForm` paso 4/4 antes del reintento.
- La consulta dirigida de OpenAPI queda bloqueada y sin marcar porque el backend vivo no estaba
  disponible. No se cambiaron ni infirieron endpoints, payloads, respuestas, enums o estados.

### Task 7 - Storybook fundacional

- El decorador global de `.storybook/preview.tsx` ahora envuelve cada story en
  `QueryProvider persist={false}`, de modo que ninguna story puede escribir en `localStorage`.
- La prueba de `SelectionRequiredState` paso a su propio archivo colocado; `AsyncStateView.test.tsx`
  conserva unicamente su componente. Ambas suites quedaron en verde antes de tocar Storybook.
- Se crearon siete stories nuevas con `play`: `SelectionRequiredState`, `SkipLink`, `AppFooter`,
  `AppLayout`, `AdminLayout`, `AdminMenu` y `WorkingContextSelect`. Los layouts}y el selector
  montan `Routes` reales y establecen sesion `ADMIN` con los adaptadores mock del decorador.
- Inventario regenerado y revisado: de 13 a 21 componentes y de 49 a 62 pruebas de Storybook.
  `docs/components/README.md` ya no tiene entradas `Pendiente` en los modulos de layout, UI
  compartida ni contexto de trabajo.
- RED observado antes de actualizar baselines: 5 imagenes existentes difirieron. La inspeccion
  visual manual confirmo que las unicas diferencias son el copy formal de Task 2 en `LoginForm`
  (`Usa`/`tu` -> `Use`/`su`) y `ModuleShell` (`Consulta`/`administra` -> `Consulte`/`administre`);
  no hubo cambio de layout, token ni color.
- `pnpm run test:storybook` posterior a la actualizacion: 21 suites y 62 pruebas correctas, con
  los 62 baselines visuales y axe en verde. `pnpm run components:inventory:check`: correcto.
- Previews revisables: AdminMenu Administrator, WorkingContextSelect Change Selection, SkipLink
  Default, AdminLayout With Outlet y SelectionRequiredState Selection Required.

### Task 8 - Cierre, evidencia y nombre estable

Comparativa contra el baseline inicial:

| Metrica                   | Baseline inicial   | Cierre Fase 0      | Delta      |
| ------------------------- | ------------------ | ------------------ | ---------- |
| Archivos de prueba        | 64                 | 66                 | +2         |
| Pruebas unitarias         | 325                | 353                | +28        |
| Statements                | 89.82% (1209/1346) | 89.69% (1253/1397) | -0.13 pp   |
| Branches                  | 83.45% (696/834)   | 81.77% (727/889)   | -1.68 pp   |
| Functions                 | 92.34% (422/457)   | 91.47% (440/481)   | -0.87 pp   |
| Lines                     | 90.12% (1132/1256) | 90.00% (1171/1301) | -0.12 pp   |
| Suites de Storybook       | 14                 | 21                 | +7         |
| Pruebas de Storybook      | 49                 | 62                 | +13        |
| Componentes en inventario | 13                 | 21                 | +8         |
| Vulnerabilidades altas    | 0                  | 0                  | sin cambio |

Comandos de cierre:

- `pnpm run verify:quick`: correcto en `177.10s`; formato, ESLint, TypeScript y 66 archivos con 353
  pruebas.
- `pnpm run test:coverage`: correcto en `119.30s`.
- `pnpm run check`: correcto en `432.40s`; incluye build de produccion, build de Storybook, 21
  suites/62 pruebas del runner, 62 pruebas visuales con axe sin violaciones e inventario vigente.
- `pnpm run audit`: correcto para el umbral alto; se mantiene 1 vulnerabilidad moderada, 0 altas y
  0 criticas. Es la misma deuda del baseline y sigue fuera del umbral del proyecto.
- `git diff --check`: correcto.

Desviaciones y lecturas honestas:

- La cobertura global baja entre 0.12 y 1.68 puntos. No es una regresion funcional: la fase anadio
  codigo de infraestructura con pruebas, en concreto el scanner de arquitectura con reglas R5-R7 y
  sus fixtures sinteticos, y los contratos de politica de autenticacion y de claves privadas. La
  prueba `architecture.test.ts` tambien aparece dentro del reporte de cobertura, lo que introduce
  lineas ejecutadas con ramas de fallo que no se ejercen contra el arbol real.
- La suite Storybook aumento 13 pruebas y 62 imagenes de baseline, de las cuales 13 son nuevas y 5
  fueron regeneradas tras verificar visualmente que solo reflejaban el copy formal de Task 2.
- El puerto `127.0.0.1:6006` sigue ocupado por un proceso previo del entorno. `start-server-and-test`
  reporta `EADDRINUSE`, pero el servidor existente responde y ambas etapas terminan en exito. No es un
  defecto del repositorio.

Bloqueo contractual:

- La verificacion dirigida de las operaciones GET del catalogo contra el OpenAPI vivo quedo sin
  ejecutar: `http://localhost:3000/api/openapi.json` no respondio. Ningun endpoint, payload, campo de
  respuesta, enum ni codigo de estado se cambio o infirio en esta fase. El item correspondiente de
  Task 6 permanece sin marcar a proposito, y el bloqueo queda anotado tambien en el roadmap y en
  ADR-0012.

Estado del roadmap:

- Los items 0.2 a 0.8 se marcaron con la evidencia de este registro.
- El roadmap se renombro a `docs/superpowers/plans/plan-maestro-frontend.md` y se actualizaron sus
  enlaces en `docs/README.md`. La unica mencion restante del nombre fechado es la linea historica de
  este documento que registra el renombrado.
- No se creo ningun commit. El arbol conserva los cambios preexistentes de registro, verificacion de
  correo y autenticacion, ampliados solo por copy formal y por la politica explicita de
  autenticacion.
