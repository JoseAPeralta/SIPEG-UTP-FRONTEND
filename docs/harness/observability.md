# Observabilidad Del Harness

Metricas manuales para evaluar el flujo local `Features -> Spec -> Plan -> Implementation`. No hay
telemetria automatica ni envios de red: el operador registra y revisa.

## Donde Se Registran

- **Por plan**: el sidecar `<name>-implementation-status.md` junto al spec, con el contrato de
  `harness/agents/implementation.md` (`Last Local Run`, tabla `Tasks` y seccion `Blockers`).
- **Por corrida**: el agente de implementacion actualiza el sidecar antes de la revision humana.
- **Agregado**: no se versiona un tablero; el operador deriva los agregados al revisar los sidecars.

## Metricas

| Metrica               | Definicion                                                             | Fuente                              | Direccion |
| --------------------- | ---------------------------------------------------------------------- | ----------------------------------- | --------- |
| Runs exitosos         | Corridas sin tareas `Blocked` y con verificacion en verde              | Tabla `Tasks` + `Blockers`          | Subir     |
| Tareas completadas    | Tareas en `Done` con su verificacion registrada                        | Columna `Status`                    | Subir     |
| Reversiones           | Tareas que vuelven a `In Progress` o cambios descartados tras revision | Historial del sidecar               | Bajar     |
| Bloqueos              | Tareas `Blocked` y entradas en `Blockers`                              | Seccion `Blockers`                  | Bajar     |
| Tiempo hasta revision | Desde `Last Local Run` hasta la decision humana                        | Timestamp + bitacora del operador   | Bajar     |
| Artefactos rechazados | Specs o planes devueltos a `Draft` tras revision                       | Estado en `*-spec.md` y `*-plan.md` | Bajar     |

## Cadencia

- **Por corrida**: el agente actualiza el sidecar; el operador revisa antes de integrar.
- **Al cerrar un plan**: el operador confirma `Done`/`Blocked` y anota lecciones en el sidecar.
- **Mensual**: revision agregada para ajustar prompts, sandbox o planificacion.

## Reglas

- No registrar credenciales, rutas del host, contenido de `.env` ni datos personales.
- Un `Done` sin verificacion registrada no cuenta como tarea completada.
- Los bloqueos se anotan con causa y decision pendiente, no solo con el sintoma.
