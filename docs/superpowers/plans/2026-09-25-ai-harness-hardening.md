# AI Harness Hardening Implementation Plan

> **Para agentes:** REQUIRED SUB-SKILL: Use `executing-plans` para implementar tarea por tarea.
> Usa checkboxes (`- [ ]`) para seguimiento. No ejecutes Git ni toques el backend.

**Goal:** Cerrar las brechas de correctitud, seguridad y deriva del harness para que la
verificación sea mecánica y los agentes operen con límites reales.

**Architecture:** Mantener el seam mock/API, el sandbox por namespaces y el catálogo mecánico.
Añadir fitness tests de arquitectura sin nuevas dependencias y eliminar la duplicación
documental moviendo detalle a `docs/` con un índice.

**Tech Stack:** Node.js 24, pnpm 12, Vitest, TypeScript 6, GitHub Actions, OpenCode.

**Reglas del plan:**

- Cada tarea termina con su verificación. No marcar completada sin verificación en verde.
- No ejecutar comandos Git. Los push/commit los hace el operador.
- Cambios mínimos; no refactors no listados.

---

## Fase 0 — Bloqueantes (correctitud y seguridad)

### Tarea 0.1: Navegadores Playwright en CI

**Archivos:** `.github/workflows/ci.yml` (modificar)

- [x] Añadir tras `Install dependencies`:

  ```yaml
  - name: Install Playwright browsers
    run: pnpm exec playwright install --with-deps chromium
  ```

- [ ] (Opcional) Cachear `~/.cache/ms-playwright` con `actions/cache`, clave
      `${{ runner.os }}-playwright-${{ hashFiles('pnpm-lock.yaml') }}`. (Omitido por decisión del
      operador; cambio mínimo sin nueva action.)
- [x] Verificar localmente: `pnpm run test:storybook`.
- [ ] Operador: push a `dev` y confirmar job `quality` en verde.

**Motivo:** `pnpm run check` incluye `test:storybook` (`package.json:14,36`) y `ci.yml:39-46` no
instala navegadores; el README (173-179) lo pide solo manualmente.
**Aceptación:** job `quality` completa `pnpm run check`.

### Tarea 0.2: Endurecer permisos de OpenCode

**Archivos:** `opencode.json` (modificar); configuración de usuario (paso manual del operador)

- [x] Reemplazar la sección `permission` por patrones que cubran ruta relativa y absoluta
      (los patrones son glob; gana la última coincidencia, por eso el deny va al final). Se omitió
      `external_directory` porque el reference `backend-api` ya auto-permite su directorio, y se
      añadieron reglas exactas para `git push/fetch/pull/remote` sin argumentos:

  ```json
  "permission": {
    "bash": {
      "*": "allow",
      "git *": "ask",
      "git push *": "deny",
      "git push": "deny",
      "git fetch *": "deny",
      "git fetch": "deny",
      "git pull *": "deny",
      "git pull": "deny",
      "git remote *": "deny",
      "git remote": "deny",
      "*SIPEG-UTP-BACKEND*": "deny"
    },
    "edit": {
      "*": "allow",
      "*SIPEG-UTP-BACKEND*": "deny"
    }
  }
  ```

- [x] Mantener `read` permitido para el reference `backend-api` (solo lectura por diseño).
- [ ] Operador (garantía dura, fuera del repo): replicar los deny de backend y git remoto en
      `~/.config/opencode/opencode.json`, porque el config del repo es editable por el agente.
- [ ] Verificar en sesión nueva: `cat ../SIPEG-UTP-BACKEND/...` y
      `cat /home/ariel/projects/SIPEG-UTP-BACKEND/...` → deny; `git status` → ask;
      `git push` → deny.

**Motivo:** hoy `*../SIPEG-UTP-BACKEND*` no matchea rutas absolutas (`opencode.json:21`) y
`git push` cae en `"*": "allow"` aunque `AGENTS.md:233` lo prohíbe.
**Aceptación:** ambas formas de ruta bloqueadas y operaciones remotas denegadas.

### Tarea 0.3: `test:harness` en CI

**Archivos:** `.github/workflows/ci.yml` (modificar), `spec/README.md` (documentar), `AGENTS.md`

- [x] Crear job `harness-isolation` (ubuntu-latest): checkout, pnpm/node,
      `sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0 || true`,
      `pnpm run test:harness`. Se omitió `pnpm install` porque los tests del harness son shell puro.
- [x] Si el runner no permite `unshare --user`, usar como fallback un contenedor con
      `--privileged` o documentar la exclusión en `spec/README.md` y exigir la ejecución local
      como paso obligatorio previo a integrar (sin `continue-on-error`). Se eligió documentar el
      backstop local en `spec/README.md`; el contenedor privilegiado queda como plan B si el push
      muestra fallo.
- [x] Verificar local: `pnpm run test:harness`.

**Motivo:** las pruebas que validan el sandbox (`package.json:35`) no corren en `check` ni en CI.
**Aceptación:** job verde o exclusión explícita y documentada.

---

## Fase 1 — Enforcement y deriva documental

### Tarea 1.1: Fitness test de arquitectura

**Archivos:** crear `src/architecture.test.ts`; corregir imports listados abajo

- [x] Implementar con `node:fs` + API de `typescript` (ya es devDependency) un test que recorra
      `src/**/*.{ts,tsx}` y falle con mensajes de remediación. Implementado en
      `src/architecture.test.ts`; R3 bloquea cualquier ruta profunda cross-feature y R1 exime
      además a los archivos internos de `src/data/mock`. Reglas: - **R1 mocks:** solo `src/app/adapters/**`, `src/features/*/adapters/**` y `*.test.*`
      pueden importar `@/data/mock`. - **R2 UI pura:** `src/components/ui/**` no importa `@/features/**`. - **R3 cross-feature:** ningún archivo importa `@/features/<otra>/(hooks|model|ui|adapters)/...`;
      debe usar el barrel `@/features/<otra>`. Excepción: `src/app/adapters/**` (composition root)
      y la propia feature. - **R4 store:** `src/store/**` no importa `@/features/**`.
- [x] Ejecutar `pnpm test -- src/architecture.test.ts` y confirmar que lista las violaciones
      actuales. Reportó 17 R3 + 1 R4 (R1/R2 ya conformes).
- [x] Corregir: - [x] Mover el tipo `WorkingContext` a `src/types/domain.ts`; actualizar
      `src/store/workingContext.ts:3` y re-exportar desde el barril de working-context (vía
      `model/workingContext.ts`). - [x] Cambiar imports profundos a barrels en `useUsersOverview.ts:3-4`,
      `useSpeakersOverview.ts:3-4`, `useClassroomsOverview.ts:1`,
      `useReportsOverview.ts:3-4`, `useCertificatesOverview.ts:3-4`,
      `useAttendanceOverview.ts:3-4`, `useDashboardOverview.ts:3-8`,
      `useWorkingContext.ts:3`, `useActivityCatalogPage.ts:3-4`. - [x] Añadir al barrel de `activity-catalog` los selectores que use dashboard si faltan
      (no hizo falta: ya exportaba `buildActivityRows` y `buildUnitOptions`). - [x] `AdminMenu.tsx:4` (components/layout → features): resuelto como edge permitido (opción A) y
      documentado en `CONTEXT.md`; R2 sigue aplicando solo a `components/ui`.
- [x] Verificar: `pnpm test && pnpm run lint && pnpm run typecheck` (36 archivos, 186 tests en
      verde; lint y typecheck en verde).

**Aceptación:** test verde e integrado en `pnpm test`/CI.

### Tarea 1.2: Adelgazar `AGENTS.md` y crear índice de `docs/`

**Archivos:** `AGENTS.md`, crear `docs/README.md` y `docs/product/features.md`, `.prettierignore`

- [x] Mover `## Expected Product Features` (`AGENTS.md:151-215`) a `docs/product/features.md`
      con jerarquía `# Expected Product Features` + `## <area>`.
- [x] Crear `docs/README.md` como índice: components, product, security, adr, plans,
      `DESIGN.md`, `harness/README.md`, `spec/README.md` (más `CONTEXT.md`, `AGENTS.md`,
      `README.md` como fuentes principales).
- [x] Quitar `AGENTS.md` de `.prettierignore:2`, ejecutar `pnpm run format` y corregir la
      jerarquía de encabezados (subsecciones con `###`).
- [x] Dejar `AGENTS.md` en ~100-130 líneas (130 exactas): overview, comandos, estructura, reglas,
      boundary y punteros a `docs/` (patrón "mapa, no enciclopedia").
- [x] Verificar: `pnpm run format:check && pnpm run lint` en verde; auditoría de reglas antes/después
      sin pérdidas (15 Frontend → 11, 7 Architecture, 10 Component → 7, 13 Testing → 9, 5 Backend,
      6 API, 7 Agent → 4, 7 Harness, todas por fusión de bullets; features movidas completas).

### Tarea 1.3: ADRs

**Archivos:** crear `docs/adr/README.md` y 4 ADRs

- [x] Cargar la skill `create-architectural-decision-record` y seguir su formato.
- [x] `adr-0001-adapters-mock-api.md`: puertos, composition root y default `mock`.
- [x] `adr-0002-openapi-live-targeted-cli.md`: fuente viva por defecto y consultas puntuales.
- [x] `adr-0003-local-harness-isolation.md`: workspaces aislados, sin Git ni remotos.
- [x] `adr-0004-component-catalog-storybook.md`: catálogo, inventario mecánico y baselines visuales.
      Nombres con convención de la skill (`adr-NNNN-slug`) por decisión del operador, en inglés,
      `status: Accepted`, autoría `SIPEG-UTP Team`.
- [x] Enlazar desde `docs/README.md` y `CONTEXT.md`.
- [x] Verificar: `pnpm run format:check`.

### Tarea 1.4: Corregir drift documental

**Archivos:** `README.md`, `docs/superpowers/plans/2026-09-23-api-contract-agent-integration.md`,
`CONTEXT.md`

- [x] `README.md:301`: "capa de servicios" → "capa de adapters (`features/*/adapters` +
      `src/app/adapters/http/apiClient.ts`)". Se corrigió la ruta porque `src/services` fue movido
      por `2026-09-25-mejoras-arquitectura.md` T1.1.
- [x] Añadir nota de vigencia al plan histórico: la fuente por defecto es el backend vivo
      (el plan dice lo contrario en su Goal) y los tests viven colocados, no en `scripts/__tests__`.
- [x] `CONTEXT.md`: registrar edges permitidos tras T1.1 (composition root; `components/layout/AdminMenu`
      como edge permitido; store sin features; R1-R4 verificadas por `src/architecture.test.ts`).
- [x] Verificar: buscar frases obsoletas (`README.md` sin "capa de servicios"/"src/services") y
      `pnpm run format:check` en verde.

### Tarea 1.5: Exclusiones del workspace de agentes

**Archivos:** `scripts/prepare-agent-workspace.sh`,
`scripts/prepare-agent-workspace.test.sh`, `spec/README.md`

- [x] Excluir `storybook-static/`, `test-results/`, `playwright-report/`, `*.tsbuildinfo`,
      `.DS_Store` (además de lo ya excluido).
- [x] Extender el test con fixtures de esos directorios (incluye variantes anidadas) y aserciones
      `test ! -e`.
- [x] Verificar: `pnpm run test:harness` (ambos tests de aislamiento en verde) y `pnpm run format:check`.
      `spec/README.md` actualizado con la lista de artefactos prohibidos.

**Motivo:** `spec/README.md:33` promete que no hay build outputs, pero hoy quedan fuera solo
`dist`/`coverage` (`prepare-agent-workspace.sh:61-99`).

---

## Fase 2 — Madurez (opcional)

### Tarea 2.1: `verify:quick`

**Archivos:** `package.json`, `README.md`, `AGENTS.md`

- [x] Añadir `"verify:quick": "pnpm run format:check && pnpm run lint && pnpm run typecheck && pnpm test"`.
- [x] Documentar cuándo usarlo (loop interno del agente) vs `check` (integración) en `README.md` y
      `AGENTS.md`.
- [x] Verificar: `pnpm run verify:quick` (36 archivos, 186 tests; format/lint/typecheck en verde).

### Tarea 2.2: Dry run del flujo del harness

**Archivos:** `spec/events/events-features.md` (entrada), artefactos generados, `harness/README.md`

- [ ] Elegir runtime local (decisión del operador) y ejecutar feature-analyzer y plan-generator
      dentro del sandbox. **Bloqueada/omitida:** no hay runtime local offline disponible (solo
      `opencode` CLI, sin proveedor local ni modelos; el sandbox corta red y credenciales). Decisión
      del operador: omitir 2.2.
- [ ] Revisar que los artefactos tengan las secciones exactas y estados `Draft`/`Approved`.
- [ ] Documentar en `harness/README.md` una sección "Verification" con el contrato de salida.
- [ ] Verificar: artefactos presentes, sin red y sin `.git`.

### Tarea 2.3: Observabilidad base

**Archivos:** crear `docs/harness/observability.md`

- [x] Definir métricas manuales (runs exitosos, tareas completadas, reverts, bloqueos) y dónde
      registrarlas (sidecars `*-implementation-status.md`), con cadencia de revisión.
- [x] Verificar: revisión del operador (documento creado y enlazado desde `docs/README.md`;
      `format:check` en verde).

---

## Riesgos y mitigaciones

| Riesgo                                             | Mitigación                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| El runner de GitHub no soporta `unshare --user`    | Fallback privilegiado o exclusión documentada sin `continue-on-error`     |
| Refactor cross-feature rompe exports               | Cambiar imports a barrels y correr `pnpm test` + `typecheck` en cada paso |
| Adelgazar `AGENTS.md` pierde reglas                | Checklist comparando reglas antes/después                                 |
| Deny de OpenCode no cubre todas las formas de ruta | Probar relativa/absoluta/`~` y mover deny duro a config de usuario        |
| Drift futuro en docs                               | `format:check` sin ignorar AGENTS.md + ADRs + doc-gardening opcional      |

## Preguntas abiertas

1. ¿`components/layout/AdminMenu` se refactoriza para recibir el selector por slot (layering
   estricto) o se documenta como edge permitido?
2. ¿Qué runtime local se usará para el dry run del harness?
3. ¿`git status`/`git diff` deben ser `ask` o `deny` para agentes?
4. ¿Se añade un job de "doc-gardening" recurrente o basta la verificación en CI?

## Orden sugerido

0.1 → 0.2 → 0.3 → 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 2.1 → 2.2 → 2.3

## Definición de terminado global

- `pnpm run check` y `pnpm run test:harness` en verde; CI en verde.
- Test de arquitectura activo y sin violaciones.
- `AGENTS.md` ≤ ~130 líneas con índice en `docs/README.md` y ADRs creados.
- Sin comandos Git ejecutados por agentes; backend intacto.
