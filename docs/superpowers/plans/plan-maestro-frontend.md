# Plan Maestro de Implementacion - SIPEG Frontend

> **For agentic workers:** REQUIRED SUB-SKILL: Use `writing-plans` to create the detailed plan for each phase and `executing-plans` to implement it task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar SIPEG como aplicacion web accesible y responsive para visitantes, participantes, ponentes, administradores y colaboradores con permisos por programa o actividad.

**Architecture:** SPA React organizada por dominio. Los adapters validan y aislan el contrato HTTP, TanStack Query administra estado de servidor y Zustand conserva solo sesion, preferencia de unidad y contexto de trabajo. Las paginas son composiciones delgadas, los hooks controlan carga y mutaciones, y la UI nunca consume directamente HTTP, mocks ni errores crudos del backend.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Chakra UI 3, React Router 8, TanStack Query 5, Zustand 5, Vitest 5, Testing Library, Storybook 10, Playwright y PWA.

---

> **Para agentes:** este documento es el roadmap global. Antes de ejecutar cada fase, crear `docs/superpowers/plans/YYYY-MM-DD-fase-<n>-<modulo>.md` con `writing-plans`, TDD y pasos de 2-5 minutos; ejecutarlo despues con `executing-plans`.
>
> **Reglas de ejecucion:** consultar cada operacion con `pnpm run api:contract -- search/get`; no implementar campos o endpoints desde el roadmap si aun no aparecen en OpenAPI. Para cambios visuales, seguir el flujo Storybook, revisar previews y actualizar stories, inventario y baselines deliberadamente. No crear commits salvo peticion explicita.
>
> **Orden logico:** Fase 0 (cimientos) -> 1 (cuentas) -> 2 (catalogos) -> 3 (usuarios y autorizacion) -> 4 (programas) -> 5 (actividades) -> 6-8 (archivos, alertas y propuestas) -> 9-11 (inscripcion, asistencia, certificados y reportes) -> 12 (endurecimiento y E2E).

## Objetivo final

Completar SIPEG como una aplicacion web que cubra el ciclo academico completo:

1. El visitante descubre actividades y puede registrarse.
2. El participante administra su perfil, se inscribe, consulta su asistencia y descarga certificados.
3. El ponente envia y sigue propuestas.
4. El administrador gestiona catalogos, usuarios, programas, actividades y operaciones.
5. El colaborador opera unicamente sobre los programas y actividades autorizados.
6. El sistema ofrece alertas, metricas, exportaciones y una experiencia publica offline acotada.

La identidad recomendada es **SIPEG como producto independiente configurado para la implantacion UTP**, sin introducir multitenancy en este roadmap.

## Estado actual

| Area                                                         | Estado frontend                                                        | Disponibilidad backend                                      |
| ------------------------------------------------------------ | ---------------------------------------------------------------------- | ----------------------------------------------------------- |
| Base tecnica, tema, PWA, Docker, adapters, Query y Storybook | Implementada; falta registrar baseline actual                          | Disponible                                                  |
| Registro, verificacion, login, refresh y logout              | Integrado con API                                                      | Completo                                                    |
| Perfil, recuperacion y cambio de contrasena                  | Integrada en 1.4, 1.5 y 1.6; area personal ampliada en 1.7             | Completo                                                    |
| Estados de cuenta y fallos de sesion                         | Integrada en 1.8                                                       | Completo                                                    |
| Submenu del area personal                                    | Implementada en 1.9 con marco comun, cuatro rutas y submenu responsive | No aplica                                                   |
| Administracion de usuarios                                   | Shell bloqueado por `OperationsAdapter`                                | Completo                                                    |
| Unidades, carreras y aulas                                   | Lectura parcial; administracion pendiente                              | Completo                                                    |
| Permisos y colaboradores                                     | Pendiente                                                              | Completo, salvo descubrimiento global de scopes del usuario |
| Programas                                                    | Lectura integrada; CRUD y ciclo de vida pendientes                     | Completo                                                    |
| Actividades                                                  | Catalogo integrado mediante fan-out; mutaciones pendientes             | 5.1-5.3 disponibles; 5.4-5.8 pendientes                     |
| Archivos y alertas                                           | Pendiente                                                              | Pendiente                                                   |
| Propuestas de ponentes                                       | Shell mock                                                             | Pendiente                                                   |
| Inscripcion y asistencia                                     | Shell mock                                                             | Pendiente                                                   |
| Certificados                                                 | Shell mock                                                             | Pendiente                                                   |
| Reportes y exportaciones                                     | Shell mock                                                             | Pendiente                                                   |
| Accesibilidad y pruebas visuales                             | Infraestructura existente; cobertura funcional incompleta              | No aplica                                                   |

El contrato OpenAPI vivo no estuvo disponible al redactar este plan. El estado backend se obtuvo de su plan maestro y codigo actual; cada fase debe reconfirmarlo mediante la CLI antes de implementarse.

## Arquitectura objetivo

- `src/app/adapters/contracts.ts` expondra puertos por dominio, no un unico `OperationsAdapter`.
- `src/app/query/queryKeys.ts` tendra claves por recurso, filtros, identidad y scope.
- `src/features/activity-catalog` conservara la experiencia publica y composicion de lectura.
- `src/features/users`, `classrooms`, `attendance`, `certificates` y `reports` evolucionaran sin crear reemplazos paralelos.
- Se crearan modulos especificos para `organizational-units`, `careers`, `collaboration`, `event-programs`, `activities`, `uploads`, `alerts` y `speaker-proposals` cuando comience su fase.
- Cada fase retirara su dominio de `OperationsReadModel`; `features/operations` se eliminara cuando no tenga consumidores.
- Los DTO HTTP permaneceran junto a sus mappers; `src/types/domain.ts` conservara solo tipos compartidos entre dominios o stores.
- Los mocks seguiran existiendo para pruebas, Storybook y trabajo offline, nunca como fallback silencioso de `VITE_DATA_SOURCE=api`.
- Solo el catalogo publico podra persistirse. Usuarios, permisos, operaciones, codigos, CV y certificados nunca se almacenaran offline.
- El backend sera siempre la autoridad final de autorizacion y reglas de negocio.

## Definicion de terminado global

Aplicar esta lista al finalizar cada modulo o fase:

- [ ] Crear y aprobar el plan detallado de la fase antes de tocar codigo.
- [ ] Consultar las operaciones OpenAPI exactas y registrar cualquier bloqueo contractual.
- [ ] Aplicar TDD en modelos, mappers, adapters, hooks y comportamiento de UI.
- [ ] Validar todos los payloads antes de exponerlos a componentes.
- [ ] Anadir claves Query centralizadas e invalidar solo los recursos afectados.
- [ ] Cubrir carga, error, vacio, exito, conflicto, reintento y ausencia de permisos.
- [ ] No mostrar codigos API, permisos crudos ni mensajes internos del backend.
- [ ] Verificar teclado, foco, lector de pantalla, contraste, zoom 200% y reflow movil.
- [ ] Anadir o actualizar stories y pruebas `play` para UI reutilizable o interactiva.
- [ ] Mantener `src/data/mock`, factories y stories alineados con el contrato.
- [ ] Confirmar que tokens, codigos QR, CV y PII no aparecen en logs, URLs, query keys o caches persistidas.
- [ ] Ejecutar `pnpm run verify:quick` durante el desarrollo.
- [ ] Ejecutar `pnpm run api:mocks-check` cuando cambie una integracion HTTP.
- [ ] Ejecutar `pnpm run test:storybook` cuando cambie comportamiento visual.
- [ ] Ejecutar `pnpm run components:inventory:check`.
- [ ] Ejecutar `pnpm run check` antes de cerrar la fase.
- [ ] Actualizar README, CONTEXT, specs, estado funcional y ADR cuando corresponda.
- [ ] No crear commits salvo que el usuario lo solicite expresamente.

---

## Fase 0 - Revision de cimientos

**Entregable:** fuentes de verdad coherentes, arquitectura preparada para crecer y baseline tecnico verificable.

- [x] **0.1 Mantener la base existente.** React, Chakra, Router, Query, Zustand, adapters, Storybook, PWA y Docker ya estan configurados.
- [x] **0.2 Registrar el baseline.** Ejecutar `pnpm run verify:quick`, `pnpm run test:coverage`, `pnpm run check` y `pnpm run audit`; registrar pruebas, cobertura y tamano del build. Prueba: todos los comandos terminan en verde o dejan deuda previa identificada.
- [x] **0.3 Resolver identidad del producto.** Alinear README, CONTEXT y DESIGN bajo "SIPEG independiente, implantacion UTP, sin multitenancy". Prueba: no quedan afirmaciones contradictorias sobre marca o afiliacion.
- [x] **0.4 Completar requisitos trazables.** Crear archivos `*-features.md` para cuentas, catalogos, usuarios, colaboracion, propuestas, asistencia, certificados, alertas y reportes. Prueba: cada funcionalidad de `docs/product/features.md` apunta a una spec.
- [x] **0.5 Definir la arquitectura de informacion.** Clasificar rutas publicas, de participante, operativas y exclusivas de ADMIN; incorporar aulas, usuarios y propuestas al menu correspondiente. Prueba: ninguna ruta implementada queda huerfana.
- [x] **0.6 Definir la migracion de adapters.** Sustituir `OperationsAdapter` dominio por dominio, sin crear de antemano puertos vacios. Prueba: `architecture.test.ts` impide HTTP directo, mocks fuera de adapters y dependencias indebidas.
- [x] **0.7 Endurecer la frontera publica.** El catalogo publico no debe enviar Bearer; el administrativo debe usar identidad y claves separadas. Prueba: una respuesta administrativa nunca puede hidratar ni persistir la consulta publica.
- [x] **0.8 Cerrar la base visual.** Completar stories faltantes de layouts, selector de contexto y estados compartidos antes de extenderlos. Prueba: Storybook, axe, interacciones e inventario en verde.

**Criterio de salida:** decisiones de producto aprobadas, navegacion objetivo documentada, baseline registrado y fronteras de datos publicos/administrativos demostradas con pruebas.

Evidencia y desviaciones de Fase 0: `docs/superpowers/plans/2026-09-27-fase-0-cimientos.md`.

**Pendiente contractual:** la verificacion dirigida de las operaciones GET del catalogo contra el OpenAPI vivo
quedo sin ejecutar porque el backend no estaba disponible. Ningun endpoint, payload, enum o estado se
cambio o infirio. Revisar en la primera iteracion con backend activo.

---

## Fase 1 - Identidad y autoservicio de cuenta

**Depende de:** Fase 0.

**Entregable:** ciclo completo de cuenta y autoservicio del usuario.

- [x] **1.1 Registro publico.** Ya consume catalogos y `POST /api/v1/auth/register`.
- [x] **1.2 Verificacion de correo.** Ya procesa el token sin mostrarlo ni reflejar errores internos.
- [x] **1.3 Sesion real.** Login, refresh rotatorio, restauracion, logout y limpieza de cache estan integrados.
- [x] **1.4 Recuperar contrasena.** Anadir solicitud y restablecimiento con respuestas anti-enumeracion. Prueba: email existente e inexistente presentan la misma confirmacion.
- [x] **1.5 Cambiar contrasena.** Exigir sesion, contrasena actual y confirmacion de la nueva. Prueba: las demas sesiones revocadas no pueden restaurarse.
- [x] **1.6 Consultar y editar perfil.** Permitir nombres, unidad y carrera conforme al contrato. Prueba: no se pueden modificar email, rol, estado o identificadores mediante mass assignment.
- [x] **1.7 Ampliar `/perfil`.** Anadir a `/perfil` la seccion de seguridad y los accesos futuros a actividades y certificados, de modo que un `USER` tenga un unico destino personal. Prueba: un usuario estandar no termina en una pantalla administrativa ni en un callejon sin salida.
- [x] **1.8 Tratar estados de cuenta.** Localizar cuenta inactiva, correo no verificado, sesion expirada y `429`. Prueba: ningun mensaje revela existencia de cuentas ni detalles del backend.
- [x] **1.9 Organizar `/perfil` con un submenu responsive.** Crear un marco comun del area personal con cuatro destinos independientes: datos de la cuenta, seguridad de la cuenta, mis actividades y mis certificados. Cada destino tiene ruta propia, muestra solo su contenido y conserva el acceso al resto del submenu.
  - Escritorio: navegacion lateral siempre visible, con la seccion actual marcada visualmente y por `aria-current="page"`.
  - Movil: navegacion local desplegable sobre el contenido, con boton explicito y el nombre de la seccion actual siempre visible. Al desplegar, listar los cuatro enlaces en vertical; al elegir uno, cerrar el menu y llevar el foco al encabezado del destino.
  - Rutas: `/perfil/datos`, `/perfil/seguridad`, `/perfil/actividades` y `/perfil/certificados`. `/perfil` abre los datos de la cuenta y `/cambiar-contrasena` redirige a la seguridad, de modo que no quedan dos rutas equivalentes.
  - Datos y seguridad reutilizan los formularios existentes, y la seguridad sigue accesible aunque falle el catalogo institucional.
  - Mis actividades y mis certificados nacen como destinos navegables con un estado informativo "proximamente"; las fases 9 y 10 incorporan su funcionalidad en esas mismas rutas.
  - Prueba: acceso directo y recarga de cada ruta, historial atras y adelante, proteccion por sesion para `USER` y `ADMIN`, seccion activa, teclado y lector de pantalla, objetivos tactiles de al menos 44 x 44 px, zoom al 200 % y reflow a 320 px.
- [x] **1.10 Cubrir el recorrido.** Probar registro -> verificacion -> login -> datos de la cuenta -> edicion de perfil -> seguridad de la cuenta -> cambio de contrasena -> logout, comprobando ademas que cada seccion se alcanza de forma independiente desde el submenu.

**Criterio de salida:** un usuario estandar puede administrar su cuenta completa, alcanza cada seccion de su area personal por su propia ruta, y la sesion nunca persiste access token o perfil.

Alcance aprobado para 1.9:

- Sin cambio de contrato: el submenu no introduce peticiones, y las secciones de actividades y
  certificados siguen siendo informativas hasta que las fases 9 y 10 publiquen su contrato.
- El submenu pertenece al area personal, no al panel. `AdminMenu` y su selector de contexto quedan
  fuera, porque alli la jerarquia ya la resuelve el contexto de trabajo y no la cuenta.
- La decision movil se apoya en navegacion colapsable en lugar de pestañas: son enlaces entre rutas
  distintas, no variantes del mismo documento, y las etiquetas "Mis actividades" y "Mis
  certificados" necesitan su texto completo.
- `/perfil` y `/cambiar-contrasena` se conservan como accesos de entrada y no se retiran, para no
  romper enlaces compartidos ni marcadores.

Evidencia y desviaciones de Fase 1.4: `docs/superpowers/plans/2026-09-29-fase-1.4-recuperacion-contrasena.md`.

- Contrato verificado contra el backend vivo: `POST /api/v1/auth/forgot-password` y
  `POST /api/v1/auth/reset-password`, ambos publicos y sin `security`.
- La confirmacion de solicitud es texto fijo del frontend, identico para correos conocidos y
  desconocidos; el mensaje del backend nunca se muestra y el mock no modela existencia de cuenta.
- El token de `/reset-password` se lee una vez y se retira de la barra de direcciones en un
  `useEffect`; la lectura es idempotente para no romper bajo el doble montaje de `StrictMode`.
- **Divergencia de contrato (resuelta el 2026-09-29):** al redactar esta fase el frontend exigia de
  12 a 20 caracteres en la recuperacion, mas estricto que el `maxLength: 128` de OpenAPI, y
  `RegisterForm` aceptaba hasta 128. El backend ajusto despues las tres operaciones a
  `minLength: 12` y `maxLength: 20`, con lo que la divergencia quedo cerrada y el registro paso a
  exigir el mismo rango. Ver la nota de cierre de la Fase 1.5.
- Correccion de accesibilidad no prevista: `Field.ErrorText` usaba el token `fg.error` de Chakra
  (`red.500`, 4.06:1 sobre `surface.raised`), por debajo de AA. Se sobrescribio `fg.error` con la
  escala `danger` del tema (9.15:1 en claro). El fallo estaba latente en todos los formularios con
  error de campo, incluido el registro, y solo lo detecto axe al exponer estados de error nuevos.

Evidencia y desviaciones de Fase 1.5: `docs/superpowers/plans/2026-09-29-fase-1.5-cambio-contrasena.md`.

- Contrato verificado contra el backend vivo: `POST /api/v1/auth/change-password`, con
  `bearerAuth`, body `{ currentPassword, newPassword, refreshToken }` y `200` con `EmptyData`.
  Errores documentados: `400`, `401`, `403`, `429`.

Evidencia y desviaciones de Fase 1.6: `docs/superpowers/plans/2026-09-29-fase-1.6-perfil.md`.

- Contrato verificado contra el backend vivo: `GET /api/v1/users/me` y `PATCH /api/v1/users/me`, ambos
  con `bearerAuth`. El `PATCH` acepta solo `firstName`, `lastName`, `unitId` y `careerId`, devuelve el
  perfil completo y documenta errores `400`, `401`, `404` y `409`.
- **Ruta:** `/perfil` es ahora el area personal canonica, protegida por `RequireSession` para `USER` y
  `ADMIN`. Por decision del usuario, las fases siguientes se construyen sobre `/perfil` y
  `/mi-cuenta` no se crea; la Fase 1.7 ampliara este mismo destino con seguridad y accesos propios.
- **Mass assignment en tres capas:** el formulario solo produce los cuatro campos editables, el
  adapter reconstruye el body propiedad por propiedad y el mock ignora las mismas propiedades. Los
  tipos de TypeScript no protegen en runtime, por lo que la allowlist del adapter es la garantia real.
- **Unidad "Otro":** se envia `unitId: null`, se omite `careerId` y la carrera se muestra bloqueada
  como "Otros", porque el backend la fuerza. El contrato no permite limpiar una carrera manteniendo la
  misma unidad, asi que el formulario no ofrece esa opcion.
- **Perfil privado:** se mantiene solo en Zustand, conforme a ADR-0009, y la respuesta del `PATCH`
  reemplaza `currentUser` sin tocar tokens, caches ni almacenamiento. `replaceCurrentUser` descarta el
  resultado si la identidad cambio mientras la peticion estaba en vuelo.
- **Asignaciones vigentes:** una unidad inactiva o una carrera ausente del catalogo se conservan como
  opcion para no perderlas en silencio; solo las unidades activas se ofrecen como nuevas opciones.
- El mock de catalogos se alineo con el contrato agregando la carrera global `OTROS`, necesaria para
  reproducir `unitId: null`.
- El login de un `USER` terminaba en `/` tras iniciar sesion; la Fase 1.7 movio ese destino a
  `/perfil` y lo unico con el guard administrativo.
- El `refreshToken` enviado identifica la sesion que se conserva; el backend revoca las demas. Por
  eso el frontend **no** limpia sesion, `QueryClient`, contexto de trabajo ni almacenamiento tras un
  cambio exitoso, y el exito no navega ni cierra la sesion.
- Los tokens se leen de `useSessionStore` en el momento del envio, no en el render, para que una
  rotacion programada no invalide el payload. El formulario nunca recibe ni muestra tokens.
- El `400` no se descompone: contrasena actual incorrecta, refresh token ajeno y error de validacion
  son indistinguibles por contrato. La UI muestra un unico mensaje localizado.
- **Largo de contrasena:** el backend ajusto `register`, `reset-password` y `change-password` a
  `minLength: 12` y `maxLength: 20`, de modo que el cambio ya no es una decision mas estricta del
  frontend: las tres operaciones comparten contrato y la politica de 12 a 20.
- `RegisterForm` paso a exigir el mismo rango. `registrationValidation.ts` exporta
  `PASSWORD_MIN_LENGTH` y `PASSWORD_MAX_LENGTH`, y el formulario los usa tanto para `maxLength` como
  para el texto de ayuda, con lo que el limite vive en un solo lugar.
- **Limitacion de la revocacion:** revocar las otras sesiones no invalida de inmediato un access
  token ya emitido en otra pestana. Esa pestana sigue operando hasta que su proximo refresh es
  rechazado. Un test unitario frontend no puede probarlo: requiere dos sesiones reales del backend
  y corresponde a la verificacion dirigida de Fase 1.9 o a la suite E2E de Fase 12.
- **Riesgo conocido:** si la rotacion programada de refresh se dispara durante el envio, el
  `refreshToken` pode quedar obsoleto y producir un `400`. No hay coordinacion entre refresh y
  mutaciones autenticadas; el formulario conserva lo escrito para que el reintento sea inmediato.
- La ruta `/cambiar-contrasena` es un destino personal complementario para cualquier rol
  autenticado. La Fase 1.7 la integro como seccion de seguridad de `/perfil` sin cambiar el dominio y
  retiro su enlace del menu principal.

Evidencia y desviaciones de Fase 1.7: `docs/superpowers/plans/2026-09-29-fase-1.7-area-personal.md`.

- **Sin cambio de contrato:** la fase no introduce, modifica ni elimina ninguna peticion HTTP, por lo
  que no se consulto OpenAPI y no aplica `api:mocks-check`.
- `/perfil` es el unico destino personal del menu. El enlace "Cambiar contraseña" salio de `AppMenu` y
  se alcanza desde la seccion de seguridad; la ruta `/cambiar-contrasena` sigue registrada, sigue
  protegida por `RequireSession` para ambos roles y sigue funcionando por enlace directo.
- "Mis actividades" y "Mis certificados" son tarjetas informativas sin enlaces, botones ni controles
  deshabilitados: sus rutas no existen y la ruta comodin de `App` las convertiria en el callejon sin
  salida que la fase evita. Un control deshabilitado tampoco serviria, porque no es alcanzable con
  teclado ni anunciable con utilidad.
- El destino por rol vive en `resolveAuthLandingPath`, consumido por `LoginPage` y por el guard
  administrativo, de modo que `ADMIN` termina en `/admin` y cualquier otro rol en `/perfil`, tanto tras
  iniciar sesion como al intentar abrir una ruta administrativa por URL. Antes, un `USER` pasaba por
  `/admin` y dependia de que el guard lo expulsara.
- La seccion de datos personales no recibe un `SectionHeader` propio porque `ProfileForm` ya presenta
  su `h2`; la jerarquia queda `h1` de ruta, `h2` por seccion y `h3` en cada tarjeta de servicio.
- La seccion de seguridad y la de servicios se renderizan fuera del `AsyncStateView` del formulario, de
  modo que un fallo del catalogo institucional no oculta el cambio de contrasena. Hay dos pruebas que
  lo fijan, una con el catalogo cargando y otra con el catalogo fallando.
- El copy de `LoginForm` paso de "Acceso administrativo" a "Acceso a su cuenta", porque la pantalla la
  usan los dos roles y el texto anterior prometer el panel a un usuario estandar.
- **Sin story de pagina:** la taxonomia de Storybook cubre `Shared/UI`, `Layout` y `Features` y ninguna
  pagina tiene story. La composicion nueva es privada y de un solo uso, que es lo que `AGENTS.md`
  permite mantener local al padre, asi que se cubre con `src/pages/ProfilePage.test.tsx` y su evidencia
  visual llega por las stories de `AppMenu` y `LoginForm`, que si cambian.
- **`aria-current` se verifica por integracion.** El `MemoryRouter` global de Storybook arranca en `/`,
  de modo que `NavLink` nunca marca la story de `AppMenu` como activa. La asercion vive en
  `App.test.tsx`, que monta la ruta real.
- **Defecto encontrado en la puerta visual, no en el codigo:** el baseline de
  `layout-appmenu--standard-user` estaba obsoleto desde la Fase 1.5, cuando el menu no tenia todavia
  "Mi perfil", y aun asi pasaba la comparacion visual. La causa es `maxDiffPixelRatio: 0.01` en
  `playwright.storybook.config.ts`, que tolera la diferencia entre ambos menus, y el hecho de que
  `--update-snapshots` solo reescribe un baseline que falla: si la tolerancia lo da por bueno,
  Playwright lo conserva. Se elimino el archivo y se regenero, y la captura ya muestra "Mi perfil" mas
  "Cerrar sesion". Conviene revisar esa tolerancia en una fase de calidad: con ella, un baseline puede
  quedar congelado con un menu equivocado y seguir en verde indefinidamente.
- **Puerto 6007 ocupado:** un `http-server` de una corrida anterior impedia servir el catalogo estatico
  y el script lo detecto con un mensaje explicito. Se detuvo el proceso antes de correr las stories.
- **Defecto de test propio, corregido:** las pruebas iniciales de `ProfilePage` y `LoginPage` fallaron
  por causas del arnes y no del producto. La primera afirmaba el encabezado del formulario de forma
  sincrona, cuando el catalogo resuelve de forma asincrona, y paso a `findByRole`. La segunda renderizaba
  `LoginPage` sin declarar las rutas de destino, de modo que no habia donde navegar; se sustituyo por un
  arnes con rutas marcadoras que observan el destino real en lugar de reimplementar la regla.

Evidencia y desviaciones de Fase 1.8: `docs/superpowers/plans/2026-09-29-fase-1.8-estados-cuenta.md`.

- **Contrato verificado contra el backend vivo:** `login`, `refresh`, `register`, `verify-email`,
  `users/me` y `change-password`. Ninguna operacion, campo o estado se modifico.
  `pnpm run api:mocks-check` paso con 83 verificaciones en 7 operaciones.
- **Cuenta inactiva y correo no verificado no se distinguen, a proposito:** el contrato no expone ni
  un campo de estado en `UserProfile` ni un codigo de error dedicado, asi que `401` y `403` colapsan
  en un unico fallo de rechazo. La UI ofrece una guia estatica de verificacion para toda la
  audiencia, que ayuda a una cuenta a medio activar sin diagnosticar la de nadie.
- **El `429` nunca lleva cuenta regresiva:** el contrato no documenta `Retry-After` ni tiempo de
  espera, y el mismo copy de limite temporal se reutiliza en login, registro, verificacion,
  recuperacion y restauracion de sesion.
- **Motivo de fin de sesion en memoria:** el store distingue credencial vencida, limite temporal y
  fallo de servicio, de modo que una caida de red nunca se reporta como cuenta perdida. No se
  persiste, y se borra tras un login exitoso o un logout voluntario. Una restauracion lenta que
  falla despues de un login exitoso se descarta, para no desmontar la identidad nueva.
- **Fuga evitada en el registro:** `400` y `409` comparten mensaje, porque el `409` declara un
  atributo que ya existe.
- **Token de verificacion fuera de la URL:** se lee una vez y se retira de la barra de direcciones
  antes de enviar la peticion, no despues del exito. La lectura por `useState` es idempotente bajo el
  doble montaje de `StrictMode`.
- **Confirmacion prematura corregida:** el panel "Cuenta activada" dependia de `isPending`, que pasa
  a `false` antes de que termine la navegacion, y podia mostrarse sin que la peticion hubiera
  resuelto. Ahora depende de un estado explicito que solo se alcanza en el `then`.
- **Reintento sin abrir el correo:** la pagina conserva el token en memoria y ofrece reintentar, lo
  que recupera un corte de red sin depender del correo.
- **Cambio de decision ya cerrado en 1.6:** un `401` en perfil o cambio de contrasena antes conservaba
  la sesion y solo avisaba en el campo. Ahora la cierra, porque deja al usuario en una pantalla cuyas
  acciones seguiran fallando; el guard lo lleva a `/login` con el motivo ya preparado. La prueba que
  fijaba la conducta anterior se reescribio.
- **Teardown compartido:** `endAuthSession` en `features/auth/model` reemplaza la limpieza duplicada
  y permite cerrar la sesion desde perfil y cambio de contrasena.
- **Frontera de arquitectura respetada:** `architecture.test.ts` (R5) prohibe que un hook importe
  `apiClient`. Las pruebas de hooks construyen el error tipado del adaptador, porque el mapeo
  estado-HTTP a fallo ya esta cubierto en las pruebas de cada modulo de fallo, que si viven en
  `adapters`.
- **Riesgo residual:** los motivos de fin de sesion no sobreviven a una recarga, porque no se
  persisten. Quien recargue la pagina durante un corte ve la pantalla de acceso sin aviso, lo que es
  aceptable y evita escribir en disco lo que podria describir el estado de una cuenta.

Evidencia y desviaciones de Fase 1.9: `docs/superpowers/plans/2026-09-30-fase-1.9-submenu-area-personal.md`.

- **Sin cambio de contrato:** la fase no introduce, modifica ni elimina peticiones HTTP, por lo que
  no se consulto OpenAPI y no aplica `api:mocks-check`.
- **Un solo `h1`:** el marco `PersonalAreaLayout` lo posee y cada seccion aporta su `h2`. Las paginas
  de datos y seguridad no reciben un encabezado adicional porque `ProfileForm` y `ChangePasswordForm`
  ya presentan el suyo, con lo que la jerarquia queda `h1` del area y un `h2` por seccion.
- **Visibilidad en JavaScript, no en CSS:** `useMediaQuery` decide la rama movil en lugar de una media
  query, porque con CSS el estado expandido no seria observable en pruebas, `Escape` no tendria un
  estado que cerrar y jsdom no evalua reglas de medios de forma fiable. El anclaje es el mismo `48em`
  que el breakpoint `md` del layout, de modo que la columna lateral y la rama de estado coinciden.
- **Defecto encontrado y corregido durante la fase:** el layout guardaba el estado del desplegable, y
  una seccion que aun cargaba suspendia ese render, por lo que React descartaba la actualizacion
  pendiente y el menu se cerraba solo bajo quien acababa de abrirlo. Se reprodujo antes de corregirlo:
  el enlace ya cargado reabria el menu y el pendiente no. La correccion fue mover el estado a
  `PersonalAreaNavigation`, un subarbol hermano del `Outlet` que no se suspende, y dejar en el layout
  solo un ref de intencion de foco, que sobrevive a un render interrumpido.
  `App.test.tsx` fija el comportamiento recorriendo las cuatro secciones en viewport movil, y esa
  prueba falla con el diseño anterior.
- **Prueba mal escrita, detectada y corregida:** la primera version del recorrido movil buscaba
  `link` con `current: "page"` sobre toda la pagina y encontraba "Mi perfil" del menu principal, que
  React Router marca activo por prefijo sobre cualquier ruta bajo `/perfil`. No era un defecto del
  producto sino de la asercion, que ahora queda acotada al landmark del submenu.
- **La seguridad deja de depender del catalogo:** al vivir en su propia ruta ya no comparte documento
  con `ProfileView`. La prueba que lo fija navega a `/perfil/seguridad` con el catalogo rechazando y
  comprueba que el formulario esta presente y que no aparece la accion de reintento del catalogo.
- **Alias conservados:** `/perfil` y `/cambiar-contrasena` redirigen con `replace` a su ruta
  canonica. `AppMenu` y `resolveAuthLandingPath` no cambian, de modo que el enlace "Mi perfil" y el
  destino tras login siguen siendo los de siempre y ahora resuelven a la seccion de datos.
- **Objetivos tactiles y reflow:** los cuatro enlaces y el boton del desplegable declaran `minH="44px"`.
  La comprobacion de Playwright a 320 px midio las cuatro cajas en 320 x 44 y el boton en 270 x 44, con
  los cuatro enlaces apilados en vertical, desbordamiento horizontal 0 y sin texto recortado. Con zoom
  al 200 % tampoco hay desbordamiento ni recorte.
- **Puerta visual movil:** `playwright.storybook.config.ts` fija el viewport en 1280x720, y anadir
  `@storybook/addon-viewport` para una sola story seria una dependencia nueva. La rama movil se cubre
  con pruebas de jsdom y con la comprobacion de Playwright a 320 px y a zoom 200 % descrita arriba. La
  infraestructura visual movil pertenece a la Fase 12.
- **Story del marco:** las stories navigan el router compartido del decorador en vez de anidar un
  segundo `MemoryRouter`, que React Router rechaza, de modo que el estado de `NavLink` que ejercita
  `play` es el mismo que obtiene una persona en la aplicacion.
- **Tolerancia de baseline:** `maxDiffPixelRatio: 0.01` sigue activo y la observacion de la
  Fase 1.7 sigue sin resolver. No se toco en esta fase porque afecta a la configuracion global de
  Playwright y merece una revision propia. Volvio a manifestarse al corregir el copy del login: los
  cuatro baselines pasaron la comparacion con el texto viejo y hubo que eliminarlos para
  regenerarlos. Es la segunda observacion del mismo defecto y lo convierte en deuda prioritaria.

Evidencia y desviaciones de Fase 1.10: `docs/superpowers/plans/2026-09-30-fase-1.10-recorrido-cuenta.md`.

- **Sin cambio de contrato:** la fase no introduce peticiones, campos ni estados, por lo que no se
  consulto OpenAPI y no aplica `api:mocks-check`.
- **La fase no toco produccion.** Todas sus pruebas pasaron con el codigo de las fases anteriores, y
  el unico cambio en `src/` es el alta de los dos archivos de prueba. El unico ajuste de codigo fue
  retirar un import sin usar detectado por `typecheck` en el propio archivo nuevo.
- **Integracion de frontend, no E2E:** el recorrido corre en jsdom con adapters controlados, que es lo
  que el usuario eligio al abrir el punto. La entrega real del correo y la revocacion de otras sesiones
  necesitan dos sesiones reales del backend y siguen perteneciendo a la suite E2E de la Fase 12.
- **La sesion la establece el producto:** la prueba nunca escribe en `useSessionStore` para entrar, de
  modo que un login roto no puede quedar oculto tras un store sembrado a mano.
- **Un unico limite, el HTTP:** el escenario mantiene un unico registro de persona, y `register`,
  `login`, `loadCurrentUser` y `updateCurrentUser` lo leen y lo escriben, que es lo que hace que un
  perfil editado en el formulario sea el mismo que devuelve la peticion siguiente. Se eligio esta
  forma en lugar de spies independientes porque `createMockAuthAdapter` no modela una cuenta recien
  creada, y un escenario de mocks alineado habria necesitado cambios en `src/data/mock` sin valor para
  la aplicacion.
- **El enlace del correo es otra carga de pagina:** `VerifyEmailPage` lee el token de
  `window.location`, no del router, asi que el primer montaje se desmonta y `App` se vuelve a montar
  en `/verify-email?token=...`. Es lo que hace una persona al abrir el correo.
- **La persistencia de refresh es intencionada:** `sessionStorage` guarda el refresh token y su
  vencimiento, y nada mas. La prueba fija que el registro tenga exactamente esos dos campos.
- **La cache publica si se recarga tras el logout:** las aserciones de limpieza comprueban las claves
  privadas, la persistencia y el almacenamiento, no que toda la cache quede vacia, porque volver a la
  portada vuelve a pedir el catalogo publico por diseno.
- **Tras el logout se comprueba un montaje nuevo en `/perfil/datos`:** el menu anonimo ya no ofrece "Mi
  perfil", de modo que el rechazo de la ruta personal se verifica abriendo la URL en una montura
  limpia, que es el caso real de quien vuelve a escribir la direccion o pulsar atras.
- **El historial se observa con una sonda:** `App.test.tsx` monta una sonda que llama `navigate(-1)` y
  `navigate(1)`, de modo que la asercion lee el historial real del router en vez de reimplementar su
  semantica. La sonda vive solo en el archivo de prueba. La prueba previa que pulsaba enlaces y se
  llamaba historial fue renombrada, porque no verificaba historial.
- **Alcance del submenu como matriz:** una prueba parametrizada parte de cada una de las cuatro
  secciones y alcanza las otras tres, comprobando contenido propio y un unico `aria-current="page"`
  dentro del landmark del submenu. Las cuatro aserciones quedan acotadas al submenu porque React Router
  marca activo por prefijo y "Mi perfil" del menu principal tambien lo esta bajo `/perfil`.
- **Mutaciones temporales usadas para probar las aserciones:** se comprobaron cuatro, revirtiendolas
  despues. Sin `replaceState` en `VerifyEmailPage` falla la retirada del token; sin
  `replaceCurrentUser` en `useProfile` falla la persistencia del perfil editado; con un
  `endAuthSession` tras el cambio de contrasena falla la conservacion de la sesion; y con la sonda de
  historial en no-op falla la prueba de atras y adelante. Ninguna asercion del recorrido es decorativa.
- **Defecto de copy del login, corregido al cerrar 1.10:** `LoginForm` rotulaba `Contrasena`,
  `Correo electronico` e `Iniciar sesion en SIPEG`, sin tilde y con el sufijo del producto, mientras
  el resto de la aplicacion si la usa. A pedido del usuario se corrigieron las cinco cadenas de ese
  componente y se regeneraron los cuatro baselines de `features-auth-loginform--*`. No se tocaron
  `SESSION_END_MESSAGES` ni `VerifyEmailPage`, que conservan el mismo defecto fuera de ese alcance.

---

## Fase 2 - Catalogos institucionales

**Depende de:** Fase 1.

**Entregable:** unidades, carreras y aulas administrables y reutilizables por los formularios posteriores.

- [x] **2.1 Crear consultas por recurso.** Migrar unidades, carreras y aulas fuera del agregado de catalogo cuando necesiten administracion. Prueba: cada recurso tiene query key, mapper y adapter propios.
- [ ] **2.2 Administrar unidades.** Listar, buscar, consultar, crear, editar, desactivar y reactivar. Prueba: conflictos del programa predeterminado muestran una explicacion localizada y permiten reintentar.
- [ ] **2.3 Administrar carreras.** Gestionar carreras de facultad y globales respetando `OTROS`. Prueba: una carrera asociada a usuarios o una unidad invalida trata correctamente el `409/400`.
- [ ] **2.4 Administrar aulas.** Anadir CRUD, filtros, detalle, estado, amenidades y disponibilidad semanal. Prueba: dias ISO, intervalos adyacentes y solapes se representan correctamente.
- [ ] **2.5 Consultar disponibilidad.** Crear un selector de aula por fecha, horario, capacidad, tipo y amenidades para reutilizarlo en actividades. Prueba: un aula ocupada o sin capacidad no aparece como seleccionable.
- [ ] **2.6 Canonizar rutas.** Incorporar `/admin/unidades`, `/admin/carreras` y `/admin/aulas` al panel. Prueba: solo ADMIN ve gestion institucional; la lectura publica requerida por registro permanece disponible.
- [ ] **2.7 Invalidar con precision.** Las mutaciones deben refrescar listados, detalles, registro y selectores dependientes. Prueba: una edicion se refleja sin recargar la aplicacion.

**Criterio de salida:** los tres catalogos pueden administrarse sin duplicar reglas del backend y estan disponibles para usuarios, programas y actividades.

Evidencia y desviaciones de Fase 2.1: `docs/superpowers/plans/2026-10-02-fase-2.1-consultas-catalogos.md`.

- **Contrato verificado contra el backend vivo el 2026-10-02:** `GET /api/v1/organizational-units`,
  `GET /api/v1/careers` y `GET /api/v1/classrooms` son **publicos** (`security: []`), incluida la
  variante `isActive=false`. Sus adapters declaran por tanto `auth: { mode: "none" }` siempre, incluso
  desde `/admin/aulas`, y no se inventa un endpoint administrativo. La frontera publica o administrativa
  se expresa en las claves de Query, ligadas al `userId` y nunca al token.
- **Se cerro el pendiente contractual de la Fase 0:** los GET que el catalogo de actividades ya
  consumia tambien son publicos, pero `GET /api/v1/event-programs` y `GET /api/v1/activities/{id}`
  **honran el Bearer cuando existe** (programas: filtro por estado solo para ADMIN; actividades:
  borradores y programas no `ACTIVE` para ADMIN o colaborador con `activity:read`). Por eso el
  catalogo conserva su politica `public`/`administrative` y solo las referencias sin sesion dejan de
  enviarla.
- **Cada recurso quedo con mapper, adapter API/mock, hook y claves propias**, recorriendo todas las
  paginas con `limit=50`. Detalle, busqueda y filtros visibles pertenecen a 2.2-2.5.
- **Lecturas compuestas, no endpoints agregados:** `useActivityCatalog` y `useRegistrationCatalog`
  conservan su forma para no tocar paginas ni formularios, componiendo consultas independientes. La
  integridad referencial se valida en la composicion, porque ningun adapter es dueno de las referencias
  cruzadas, y una violacion se expone como `error` del hook en lugar de lanzar durante el render.
- **`RegistrationAdapter` quedo reducido a `register`** y `careers` salio de `OperationsReadModel`,
  conforme al orden de extraccion del ADR-0011. `useUsersOverview` permanece en la lista R7 porque aun
  consume `operations.users`, que no tiene contrato hasta 3.1.
- **Persistencia:** `PERSISTED_QUERY_KEY_ROOTS` ahora incluye unidades y aulas publicas, para no perder
  el modo offline al sacar esos datos del payload cacheado del catalogo; carreras no se persisten, igual
  que antes. `QUERY_CACHE_SCHEMA_VERSION` subio a `2` porque la forma persistida cambio.
- **Defecto de pruebas propio, corregido:** `dashboard` y `DashboardPage` inyectaban un catalogo
  completo, lo que hacia fallar la integridad cruzada al combinarlo con las colecciones reales. Ahora
  inyectan el payload base y los adapters de cada recurso, que es la frontera real.
- **R8:** nueva fitness function que reserva `/api/v1/organizational-units`, `/api/v1/careers` y
  `/api/v1/classrooms` a los adapters de su feature, para que ningun adaptador agregado reintroduzca una
  peticion duplicada. Se valido por mutacion: introducir uno de esos endpoints fuera de su feature rompe
  la prueba.
- **Sin cambios visuales, rutas, stories ni baselines.** Ningun componente de UI fue modificado, de modo
  que no se regeneraron capturas ni el inventario de componentes.

---

## Fase 3 - Usuarios, colaboradores y autorizacion

**Depende de:** Fases 1 y 2.

**Entregable:** administracion real de usuarios y operaciones por capacidades de programa o actividad.

- [ ] **3.1 Separar usuarios del read model.** Crear adapter, mappers y query keys para `/api/v1/admin/users`. Prueba: `VITE_DATA_SOURCE=api` deja de bloquear usuarios por contratos ajenos.
- [ ] **3.2 Administrar usuarios.** Implementar listado paginado, busqueda, filtros, detalle, creacion y edicion. Prueba: autodesactivacion, ultimo ADMIN, duplicados y relaciones invalidas muestran conflictos accionables.
- [ ] **3.3 Modelar permisos.** Tipar y traducir roles `VIEWER`, `EDITOR`, `ORGANIZER` y el catalogo canonico de permisos. Prueba: la UI nunca muestra `activity:update` u otros codigos crudos.
- [ ] **3.4 Resolver descubrimiento de scopes.** Acordar un contrato para conocer todos los programas y actividades accesibles al usuario. No implementar N+1 sobre el catalogo publico. Prueba: un colaborador descubre scopes no publicos sin conocer sus IDs previamente.
- [ ] **3.5 Evolucionar los guards.** Mantener catalogos institucionales y usuarios como ADMIN; habilitar modulos operativos por capacidad efectiva. Prueba: ADMIN, ORGANIZER, EDITOR, VIEWER y USER reciben navegacion diferente.
- [ ] **3.6 Gestionar colaboradores.** Listar, agregar, cambiar rol y eliminar colaboradores en programas y actividades. Prueba: el ultimo delegador y los grants fuera del subconjunto producen feedback de conflicto.
- [ ] **3.7 Mostrar herencia.** Diferenciar permisos `LOCAL`, `INHERITED` y `BOTH`, vigencia y estado efectivo. Prueba: un permiso heredado no ofrece revocacion local enganosa.
- [ ] **3.8 Gestionar overrides.** Otorgar o revocar permisos directos con periodos de validez. Prueba: los expirados dejan de habilitar acciones sin desaparecer del historial mostrado.
- [ ] **3.9 Invalidar autorizacion.** Cambios de colaboracion deben refrescar permisos, menus, detalles y contexto. Prueba: un permiso revocado desaparece sin reiniciar sesion.
- [ ] **3.10 Cubrir autorizacion horizontal.** Probar acceso directo por URL ademas de navegacion visible; el `403` del backend sigue siendo autoritativo.

**Criterio de salida:** usuarios y colaboradores pueden operar solo sobre sus scopes efectivos, con procedencia y vigencia comprensibles.

---

## Fase 4 - Programas de eventos

**Depende de:** Fases 2 y 3.

**Entregable:** ciclo administrativo completo de `EventProgram`.

- [ ] **4.1 Crear modulo de administracion.** Separar el CRUD de programas de la composicion publica `activity-catalog`. Prueba: catalogo y formularios no dependen entre si.
- [ ] **4.2 Listar por estado.** Anadir busqueda, unidad, estado, fechas y paginacion administrativa. Prueba: ADMIN o colaborador autorizado puede consultar borradores y archivados sin contaminar la cache publica.
- [ ] **4.3 Crear programas adicionales.** Capturar nombre, descripcion, fechas, etiqueta y banner cuando Fase 6 este disponible. Prueba: rango invalido y unidad inactiva se informan antes y despues del envio.
- [ ] **4.4 Editar y publicar.** Respetar campos inmutables y transicion `DRAFT -> ACTIVE`. Prueba: un archivado no muestra acciones de edicion.
- [ ] **4.5 Archivar y reactivar.** Usar acciones explicitas, nunca `DELETE`. Prueba: programas default y programas con actividades activas presentan el `409` correctamente.
- [ ] **4.6 Tratar el programa predeterminado.** Mostrarlo como agenda permanente, sin fechas ni controles incompatibles. Prueba: la UI no permite archivarlo mientras la unidad este activa.
- [ ] **4.7 Integrar colaboradores.** Incluir la experiencia de Fase 3 en el detalle del programa.
- [ ] **4.8 Integrar contexto de trabajo.** Seleccionar programas legibles y limpiar una seleccion que deje de ser accesible.
- [ ] **4.9 Probar formularios y ciclo de vida.** Cubrir movil, teclado, confirmaciones y errores concurrentes.

**Criterio de salida:** se puede crear, publicar, editar, archivar y reactivar programas respetando unidad, permisos y programa predeterminado.

---

## Fase 5 - Actividades y catalogo publico

**Depende de:** Fase 4 y catalogo de aulas de Fase 2.

**Entregable:** descubrimiento publico y administracion completa de `Activity`.

- [ ] **5.1 Separar lectura publica y administrativa.** El adapter publico no enviara credenciales; el administrativo usara filtros y permisos. Prueba: borradores y canceladas nunca llegan a la vista anonima.
- [ ] **5.2 Corregir el catalogo publico.** Mostrar proximas, disponibles y pasadas; filtrar por unidad, tipo de unidad, programa y tipo de actividad; priorizar la unidad seleccionada. Prueba: filtros combinan con logica AND y la paginacion vuelve a pagina uno.
- [ ] **5.3 Crear detalle publico.** Mostrar programa, unidad, ponentes, aula, horario, cupo y estado. Prueba: un ID no publicable responde con estado vacio o 404, no con datos administrativos.
- [ ] **5.4 Crear administracion de actividades.** Anadir listado, detalle y formulario para nombre, tipo, descripcion, ponentes, aula, fecha, horas, capacidad, equipo y banner.
- [ ] **5.5 Integrar disponibilidad.** El selector de aula debe considerar horario, capacidad y amenidades. Prueba: conflictos `409` conservan datos del formulario para corregirlos.
- [ ] **5.6 Publicar, despublicar y cancelar.** Presentar solo transiciones admitidas y solicitar motivo de cancelacion cuando corresponda. Prueba: `COMPLETED` y `CANCELLED` no ofrecen edicion invalida.
- [ ] **5.7 Bloquear eliminacion hasta contrato.** No exponer `DELETE` antes de que la Fase 5.4 backend publique la regla de retencion.
- [ ] **5.8 Bloquear notificacion ficticia.** No mostrar `notifyAttendees` hasta que el backend defina campo, obligatoriedad y resultado.
- [ ] **5.9 Reducir fan-out.** Usar listados paginados para tarjetas y solicitar detalle solo al abrir una actividad. Prueba: cargar el catalogo no produce una peticion adicional por actividad.
- [ ] **5.10 Invalidar vistas relacionadas.** Mutaciones actualizan programa, catalogo publico, administrativo, dashboard, aulas y contexto.
- [ ] **5.11 Cubrir publicacion y privacidad.** Probar acceso anonimo, ADMIN y colaborador a los distintos estados.

**Criterio de salida:** catalogo publico y administracion usan contratos y caches independientes; creacion, edicion y cancelacion estan integradas sin inventar eliminacion ni notificaciones.

---

## Fase 6 - Archivos e interfaces de comunicacion

**Depende de:** Fase 1 y contrato backend de archivos.

**Entregable:** subidas seguras para banners, imagenes y CV.

- [ ] **6.1 Esperar OpenAPI.** Definir el adapter solo cuando existan request, limites, MIME y respuesta documentados.
- [ ] **6.2 Crear control de subida.** Incluir progreso, cancelacion, reintento, tamano y tipos permitidos. Prueba: un archivo invalido se rechaza de forma accesible, sin depender solo del atributo `accept`.
- [ ] **6.3 Integrar imagenes.** Conectar banners de programas, actividades y feedback; liberar object URLs al desmontar. Prueba: una subida fallida no pierde el resto del formulario.
- [ ] **6.4 Proteger CV.** Nunca persistir, cachear publicamente ni construir URLs adivinables. Prueba: el CV no aparece en localStorage, logs o catalogo publico.
- [ ] **6.5 Limitar responsabilidad.** SMTP, plantillas y reintentos de correo pertenecen al backend; el frontend solo presenta confirmacion o estado documentado.
- [ ] **6.6 Probar accesibilidad.** El flujo completo debe funcionar sin arrastrar y soltar y anunciar progreso y errores.

**Criterio de salida:** imagenes y CV usan el contrato real, tienen recuperacion ante fallos y no exponen archivos privados.

---

## Fase 7 - Alertas

**Depende de:** Fase 1 y contrato backend de alertas.

**Entregable:** bandeja personal y contador de alertas no leidas.

- [ ] **7.1 Crear adapter y claves privadas.** Listar alertas propias con paginacion y filtros. Prueba: jamas se persisten.
- [ ] **7.2 Anadir indicador global.** Mostrar conteo no leido en la navegacion con nombre accesible.
- [ ] **7.3 Crear bandeja.** Traducir tipos y enlazar solo a destinos internos autorizados.
- [ ] **7.4 Marcar leidas.** Implementar accion individual y "marcar todas" con actualizacion optimista y rollback. Prueba: un fallo restaura el contador correcto.
- [ ] **7.5 Definir refresco.** Usar invalidacion tras acciones y una politica de polling solo si el contrato y carga lo justifican.
- [ ] **7.6 Limpiar por identidad.** Login, logout o cambio de usuario deben descartar toda alerta cacheada.

**Criterio de salida:** cada usuario ve y modifica solo sus alertas y el contador permanece consistente ante exito, fallo y logout.

---

## Fase 8 - Ponentes y propuestas

**Depende de:** Fases 4, 6 y 7.

**Entregable:** convocatoria publica y revision administrativa de propuestas.

- [ ] **8.1 Crear formulario publico.** Capturar programa, identidad, email, CV, duracion, tipo, titulo y contenido.
- [ ] **8.2 Validar programas elegibles.** Mostrar solo programas activos. Prueba: un programa archivado durante el envio trata el `409` sin perder la propuesta.
- [ ] **8.3 Confirmar envio.** Mostrar referencia y mecanismo de seguimiento definido por el backend, sin inventar cuentas o tokens.
- [ ] **8.4 Implementar seguimiento del autor.** Editar y consultar la propuesta solo cuando el contrato de identidad anonima este resuelto.
- [ ] **8.5 Crear inbox administrativo.** Filtrar propuestas por programa, estado y fecha con permisos de scope.
- [ ] **8.6 Mostrar detalle y versiones.** Conservar historial inmutable y distinguir propuesta actual de versiones anteriores.
- [ ] **8.7 Integrar feedback.** Permitir texto o imagen segun contrato y notificar al proponente.
- [ ] **8.8 Resolver propuestas.** Aprobar o rechazar con confirmacion; no crear automaticamente una actividad salvo decision contractual explicita.
- [ ] **8.9 Administrar catalogo de ponentes.** Listar personas y vincular una cuenta cuando el backend lo permita.
- [ ] **8.10 Sustituir el shell mock.** Eliminar propuestas del `OperationsReadModel`.

**Criterio de salida:** envio, seguimiento, versiones, feedback y resolucion funcionan con aislamiento por programa y CV privado.

---

## Fase 9 - Inscripcion y asistencia

**Depende de:** Fase 5 completa y contrato backend de asistencia.

**Entregable:** inscripcion, check-in QR/manual y autoservicio del participante.

- [ ] **9.1 Separar conceptos frontend.** Modelar inscripcion y check-in como estados distintos aunque compartan el recurso backend. Prueba: una inscripcion sin check-in no se muestra como ausencia definitiva.
- [ ] **9.2 Inscribirse desde el detalle.** Mostrar disponibilidad y confirmar la operacion. Prueba: duplicado, actividad cancelada o no disponible conservan una respuesta accionable.
- [ ] **9.3 Completar `Mis actividades`.** La Fase 1.9 ya creo la ruta `/perfil/actividades` y su entrada en el submenu; esta fase anade proximas, completadas, estado de inscripcion y acceso al codigo.
- [ ] **9.4 Cancelar inscripcion.** Habilitarla solo segun el contrato y tratar certificados existentes o check-in realizado.
- [ ] **9.5 Mostrar QR y codigo.** No incluir el codigo en URL, logs, query keys o almacenamiento persistente.
- [ ] **9.6 Implementar check-in asistido.** Escanear QR y permitir entrada manual para personal autorizado.
- [ ] **9.7 Definir tecnologia QR.** Preferir API nativa si la matriz de navegadores es suficiente; de lo contrario, elegir una dependencia pequena y auditada. El codigo manual sera fallback obligatorio.
- [ ] **9.8 Crear roster administrativo.** Buscar y filtrar inscritos y presentes, mostrando hora, metodo y operador cuando el contrato lo exponga.
- [ ] **9.9 Evitar doble envio.** Bloquear intentos simultaneos y tratar check-in duplicado sin alterar el registro previo.
- [ ] **9.10 Respetar scope.** Programa incluye todas sus actividades; actividad incluye solo la seleccionada.
- [ ] **9.11 Sustituir metricas mock.** Eliminar asistencia del `OperationsReadModel`.

**Criterio de salida:** un participante puede inscribirse y consultar su estado; un operador autorizado puede validar QR o codigo sin filtrarlo ni duplicar check-ins.

---

## Fase 10 - Certificados

**Depende de:** Fases 6, 7 y 9.

**Entregable:** generacion individual y masiva, y descarga privada.

- [ ] **10.1 Consultar elegibilidad.** Mostrar registros con check-in y explicar por que otros no son elegibles.
- [ ] **10.2 Generar individualmente.** Tratar la operacion como idempotente. Prueba: repetirla no crea filas visuales duplicadas.
- [ ] **10.3 Generar por actividad.** Mostrar progreso y resumen de generados, existentes y fallidos.
- [ ] **10.4 Completar `Mis certificados`.** La Fase 1.9 ya creo la ruta `/perfil/certificados` y su entrada en el submenu; esta fase lista los certificados propios con filtros y actividad relacionada.
- [ ] **10.5 Descargar de forma autenticada.** Usar respuesta privada o blob y revocar la URL temporal. Prueba: el archivo no queda en cache persistida ni accesible tras logout.
- [ ] **10.6 No asumir estados.** Reemplazar `GENERATED/PENDING` mock solo con enums confirmados por OpenAPI.
- [ ] **10.7 Integrar alertas.** Refrescar bandeja y lista tras una emision.
- [ ] **10.8 Sustituir el shell mock.** Eliminar certificados del `OperationsReadModel`.

**Criterio de salida:** solo registros elegibles generan certificados, las operaciones son idempotentes y cada usuario descarga solo archivos autorizados.

---

## Fase 11 - Reportes y estadisticas

**Depende de:** Fases 9 y 10.

**Entregable:** metricas autoritativas, dashboard y exportaciones protegidas.

- [ ] **11.1 Crear adapters por reporte.** No calcular cifras oficiales desde catalogos parciales del cliente.
- [ ] **11.2 Implementar asistencia agregada.** Filtrar por unidad, programa, actividad y rango.
- [ ] **11.3 Implementar estadisticas por scope.** Mostrar inscritos, presentes, tasa, ocupacion y certificados.
- [ ] **11.4 Conectar el dashboard.** Reemplazar metricas mock y distinguir dato no disponible de valor cero.
- [ ] **11.5 Presentar datos accesibles.** Priorizar tablas y metricas semanticas; no anadir una libreria de graficos sin necesidad concreta.
- [ ] **11.6 Integrar exportacion.** Descargar XLSX/PDF solo cuando el backend publique la operacion. Prueba: filename, MIME y errores se manejan sin abrir PII en URLs.
- [ ] **11.7 Aplicar permisos.** `report:view` y `report:export` controlan acciones diferentes.
- [ ] **11.8 Sustituir el shell mock.** Eliminar reportes del `OperationsReadModel`.

**Criterio de salida:** cifras coinciden con el backend, los filtros respetan scope y ninguna exportacion expone informacion fuera de autorizacion.

---

## Fase 12 - Notificaciones, seguridad y cierre E2E

**Depende de:** todas las fases anteriores.

**Entregable:** producto desplegable, accesible, seguro y validado de extremo a extremo.

- [ ] **12.1 Integrar notificacion a inscritos.** Mostrar la decision de notificar solo cuando el backend publique `notifyAttendees` o equivalente.
- [ ] **12.2 Eliminar infraestructura transitoria.** Borrar `OperationsAdapter`, `OperationsReadModel`, su query key y shells sustituidos; conservar mocks por dominio para tests y Storybook.
- [ ] **12.3 Auditar seguridad frontend.** Revisar XSS, URLs externas, uploads, almacenamiento, redirecciones, errores, PII, dependencias y headers de Nginx.
- [ ] **12.4 Auditar WCAG 2.2 AA.** Teclado, lector de pantalla, foco, contraste, objetivos tactiles, zoom 200%, 320 px, movimiento reducido y mensajes de formulario.
- [ ] **12.5 Endurecer PWA.** Persistir solo catalogo publico, mostrar antiguedad de datos offline y evitar cualquier operacion sensible sin conexion.
- [ ] **12.6 Optimizar rendimiento.** Medir bundle, eliminar fan-out, mantener lazy routes, paginacion servidor y evitar renders o solicitudes duplicadas.
- [ ] **12.7 Anadir E2E de aplicacion.** Crear `pnpm run test:e2e` con Playwright y un backend desechable y controlado.
- [ ] **12.8 Probar recorrido publico.** Catalogo -> registro -> verificacion -> login -> inscripcion -> mis actividades -> certificado.
- [ ] **12.9 Probar recorrido administrativo.** Usuario -> programa -> colaboradores -> actividad -> asistencia -> certificado -> reporte.
- [ ] **12.10 Probar recorrido de ponente.** Propuesta -> feedback -> nueva version -> resolucion.
- [ ] **12.11 Validar despliegue.** Build de produccion, healthcheck, variables, service worker, rutas directas y recuperacion ante API no disponible.
- [ ] **12.12 Sincronizar documentacion.** README, CONTEXT, DESIGN, catalogo, specs, ADR, estado funcional y manual operativo.

**Criterio de salida:** los recorridos principales pasan en movil y escritorio, no existen datos mock en el origen API, WCAG 2.2 AA esta verificado y `pnpm run check`, `pnpm run test:e2e`, auditoria y build de produccion estan en verde.

---

## Decisiones pendientes y recomendacion inicial

| Decision                                 | Fase | Recomendacion                                                                                                     |
| ---------------------------------------- | ---: | ----------------------------------------------------------------------------------------------------------------- |
| Identidad institucional                  |    0 | SIPEG independiente configurado para UTP, sin multitenancy                                                        |
| Submenu del area personal                |    1 | Rutas por seccion; lateral en escritorio y desplegable local en movil                                             |
| Descubrimiento de scopes del colaborador |    3 | Contrato dedicado; evitar consultar permiso programa por programa                                                 |
| Publicacion publica                      |    5 | `SCHEDULED/ONGOING` disponibles, `COMPLETED` pasadas; ocultar `DRAFT/CANCELLED`                                   |
| Eliminacion de actividades               |    5 | No ofrecerla hasta que backend cierre retencion y Fase 5.4                                                        |
| Subida de archivos                       |    6 | Esperar OpenAPI; no construir multipart o URLs por suposicion                                                     |
| Escaneo QR                               |    9 | API nativa si cubre navegadores objetivo; fallback manual obligatorio                                             |
| Certificados automaticos                 |   10 | Mostrar el comportamiento que decida el backend, sin jobs frontend                                                |
| XLSX/PDF                                 |   11 | Generacion backend y descarga autenticada                                                                         |
| Notificar inscritos                      |   12 | Control visible solo con campo contractual                                                                        |
| Entorno E2E                              |   12 | Backend desechable con seed conocido; nunca produccion                                                            |
| Hosting y origen publico del frontend    |   12 | Mismo dominio registrable que la API; su origen exacto va en `CORS_ORIGIN` (ver `docs/despliegue.md` del backend) |

## Dependencias resumidas

Flujo principal:

`0 cimientos -> 1 cuentas -> 2 catalogos -> 3 usuarios/autorizacion -> 4 programas -> 5 actividades -> 9 asistencia -> 10 certificados -> 11 reportes -> 12 cierre`

Flujos paralelos:

- Fase 6 puede comenzar despues de Fase 1 cuando el backend publique archivos.
- Fase 7 puede comenzar despues de Fase 1 cuando el backend publique alertas.
- Fase 8 requiere Fases 4, 6 y 7.
- Fase 10 requiere Fases 6, 7 y 9.
- Fase 12 requiere el cierre de todas las fases y decisiones contractuales.

## Protocolo de ejecucion por fase

1. Leer este roadmap y comprobar dependencias.
2. Consultar `CONTEXT.md`, `AGENTS.md`, la spec del dominio y los ADR relacionados.
3. Consultar solo las operaciones OpenAPI necesarias con `pnpm run api:contract`.
4. Crear el plan detallado de la fase con rutas exactas, pruebas, implementacion minima y comandos esperados.
5. Ejecutar el plan con TDD y checkpoints de revision.
6. Revisar visualmente todas las stories afectadas y sus previews.
7. Ejecutar la definicion de terminado global.
8. Marcar aqui solo los items realmente comprobados.
9. Registrar hallazgos y bloqueos debajo de la fase correspondiente.
10. Solicitar confirmacion antes de iniciar la siguiente fase o crear un commit.
