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

| Area                                                         | Estado frontend                                            | Disponibilidad backend                                      |
| ------------------------------------------------------------ | ---------------------------------------------------------- | ----------------------------------------------------------- |
| Base tecnica, tema, PWA, Docker, adapters, Query y Storybook | Implementada; falta registrar baseline actual              | Disponible                                                  |
| Registro, verificacion, login, refresh y logout              | Integrado con API                                          | Completo                                                    |
| Perfil, recuperacion y cambio de contrasena                  | Pendiente                                                  | Completo                                                    |
| Administracion de usuarios                                   | Shell bloqueado por `OperationsAdapter`                    | Completo                                                    |
| Unidades, carreras y aulas                                   | Lectura parcial; administracion pendiente                  | Completo                                                    |
| Permisos y colaboradores                                     | Pendiente                                                  | Completo, salvo descubrimiento global de scopes del usuario |
| Programas                                                    | Lectura integrada; CRUD y ciclo de vida pendientes         | Completo                                                    |
| Actividades                                                  | Catalogo integrado mediante fan-out; mutaciones pendientes | 5.1-5.3 disponibles; 5.4-5.8 pendientes                     |
| Archivos y alertas                                           | Pendiente                                                  | Pendiente                                                   |
| Propuestas de ponentes                                       | Shell mock                                                 | Pendiente                                                   |
| Inscripcion y asistencia                                     | Shell mock                                                 | Pendiente                                                   |
| Certificados                                                 | Shell mock                                                 | Pendiente                                                   |
| Reportes y exportaciones                                     | Shell mock                                                 | Pendiente                                                   |
| Accesibilidad y pruebas visuales                             | Infraestructura existente; cobertura funcional incompleta  | No aplica                                                   |

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
- [ ] **1.4 Recuperar contrasena.** Anadir solicitud y restablecimiento con respuestas anti-enumeracion. Prueba: email existente e inexistente presentan la misma confirmacion.
- [ ] **1.5 Cambiar contrasena.** Exigir sesion, contrasena actual y confirmacion de la nueva. Prueba: las demas sesiones revocadas no pueden restaurarse.
- [ ] **1.6 Consultar y editar perfil.** Permitir nombres, unidad y carrera conforme al contrato. Prueba: no se pueden modificar email, rol, estado o identificadores mediante mass assignment.
- [ ] **1.7 Crear `Mi cuenta`.** Anadir un destino util para `USER` con perfil, seguridad y accesos futuros a actividades y certificados. Prueba: un usuario estandar no termina en una pantalla administrativa ni en un callejon sin salida.
- [ ] **1.8 Tratar estados de cuenta.** Localizar cuenta inactiva, correo no verificado, sesion expirada y `429`. Prueba: ningun mensaje revela existencia de cuentas ni detalles del backend.
- [ ] **1.9 Cubrir el recorrido.** Probar registro -> verificacion -> login -> edicion de perfil -> cambio de contrasena -> logout.

**Criterio de salida:** un usuario estandar puede administrar su cuenta completa y la sesion nunca persiste access token o perfil.

---

## Fase 2 - Catalogos institucionales

**Depende de:** Fase 1.

**Entregable:** unidades, carreras y aulas administrables y reutilizables por los formularios posteriores.

- [ ] **2.1 Crear consultas por recurso.** Migrar unidades, carreras y aulas fuera del agregado de catalogo cuando necesiten administracion. Prueba: cada recurso tiene query key, mapper y adapter propios.
- [ ] **2.2 Administrar unidades.** Listar, buscar, consultar, crear, editar, desactivar y reactivar. Prueba: conflictos del programa predeterminado muestran una explicacion localizada y permiten reintentar.
- [ ] **2.3 Administrar carreras.** Gestionar carreras de facultad y globales respetando `OTROS`. Prueba: una carrera asociada a usuarios o una unidad invalida trata correctamente el `409/400`.
- [ ] **2.4 Administrar aulas.** Anadir CRUD, filtros, detalle, estado, amenidades y disponibilidad semanal. Prueba: dias ISO, intervalos adyacentes y solapes se representan correctamente.
- [ ] **2.5 Consultar disponibilidad.** Crear un selector de aula por fecha, horario, capacidad, tipo y amenidades para reutilizarlo en actividades. Prueba: un aula ocupada o sin capacidad no aparece como seleccionable.
- [ ] **2.6 Canonizar rutas.** Incorporar `/admin/unidades`, `/admin/carreras` y `/admin/aulas` al panel. Prueba: solo ADMIN ve gestion institucional; la lectura publica requerida por registro permanece disponible.
- [ ] **2.7 Invalidar con precision.** Las mutaciones deben refrescar listados, detalles, registro y selectores dependientes. Prueba: una edicion se refleja sin recargar la aplicacion.

**Criterio de salida:** los tres catalogos pueden administrarse sin duplicar reglas del backend y estan disponibles para usuarios, programas y actividades.

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
- [ ] **9.3 Crear `Mis actividades`.** Mostrar proximas, completadas, estado de inscripcion y acceso al codigo.
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
- [ ] **10.4 Crear `Mis certificados`.** Listar certificados propios con filtros y actividad relacionada.
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

| Decision                                 | Fase | Recomendacion                                                                   |
| ---------------------------------------- | ---: | ------------------------------------------------------------------------------- |
| Identidad institucional                  |    0 | SIPEG independiente configurado para UTP, sin multitenancy                      |
| Descubrimiento de scopes del colaborador |    3 | Contrato dedicado; evitar consultar permiso programa por programa               |
| Publicacion publica                      |    5 | `SCHEDULED/ONGOING` disponibles, `COMPLETED` pasadas; ocultar `DRAFT/CANCELLED` |
| Eliminacion de actividades               |    5 | No ofrecerla hasta que backend cierre retencion y Fase 5.4                      |
| Subida de archivos                       |    6 | Esperar OpenAPI; no construir multipart o URLs por suposicion                   |
| Escaneo QR                               |    9 | API nativa si cubre navegadores objetivo; fallback manual obligatorio           |
| Certificados automaticos                 |   10 | Mostrar el comportamiento que decida el backend, sin jobs frontend              |
| XLSX/PDF                                 |   11 | Generacion backend y descarga autenticada                                       |
| Notificar inscritos                      |   12 | Control visible solo con campo contractual                                      |
| Entorno E2E                              |   12 | Backend desechable con seed conocido; nunca produccion                          |

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
