# Sesión multipestaña en navegador real

```sh
pnpm run test:auth:browser
```

Playwright inicia y detiene Vite en `http://localhost:5189`, con `--strictPort`
y `reuseExistingServer: false`. Se requiere Chromium instalado para la versión de
Playwright del proyecto. Cada prueba usa un contexto limpio; sus pestañas comparten
el mismo almacén de cookies. Los resultados y trazas de fallos se escriben en
`test-results/auth`, excluido de Git.

## Qué se ejecuta

La página `auth.fixture.html` importa dinámicamente desde Vite los módulos reales
`createApiAuthAdapter` y `createSessionCoordinator`, incluyendo su cliente HTTP,
mappers, bus y bloqueo de cookies. No sustituye `fetch`, `BroadcastChannel` ni
`navigator.locks`. El observador del canal únicamente registra mensajes.

La intercepción de Playwright simula login, refresh, perfil y logout. El navegador
recibe `Set-Cookie` y administra una cookie `HttpOnly; SameSite=Lax; Path=/` real.
La API simulada consume la cookie antes de responder y rechaza su reutilización;
solo devuelve access tokens en el cuerpo. Los perfiles y credenciales son ficticios.
Las peticiones HTTP a otros orígenes y las rutas API desconocidas se abortan y se
registran como errores de la prueba. No se usa BD ni un backend en ejecución.

### Casos

1. Login en A, apertura de B y restauración desde cookie; recarga de ambas con
   memoria vacía y nueva restauración. Cambio a otra identidad que B adopta por
   el canal real. Logout que elimina la cookie y limpia ambos coordinadores;
   restaurar después del logout falla con 401.
2. Renovación simultánea: una barrera mantiene el Web Lock real ocupado hasta
   observar dos solicitudes pendientes, una por pestaña. Dos llamadas locales
   por pestaña se colapsan y resultan en exactamente dos refresh serializados,
   con rotación de cookie y cero respuestas 401.
3. Control negativo: dos refresh directos sin bloqueo producen un 200 y un 401.
   Esto verifica que el simulador realmente detecta la carrera.

Se comprueban `document.cookie` vacío, `localStorage` y `sessionStorage` vacíos en
ambas pestañas, y mensajes del canal que contienen solamente `kind`.

## Alcance y limitaciones

- Se ejecuta Chromium real con APIs nativas; no es jsdom ni un bus en memoria.
- Se usa la alternativa fixture, no el árbol React completo. Restaurar llama
  explícitamente a `coordinator.renew()` y logout ejecuta `adapter.logout()` seguido
  de `coordinator.end()`. No cubre hooks, Zustand, QueryClient, rutas ni formularios
  de la aplicación.
- El formato de respuestas se basa en los mappers y tests existentes. No valida
  el contrato desplegado, firma JWT, revocación real, BD, CORS entre orígenes,
  cookies `Secure` sobre HTTPS ni políticas cross-site.
- La prueba comprueba ausencia de persistencia de tokens en puntos del flujo;
  no es una auditoría de almacenamiento transitorio ni de seguridad completa.
- El sufijo `.browser.ts` permite mantener estas pruebas fuera del descubrimiento
  predeterminado de Vitest sin modificar su configuración.

## Comprobaciones estáticas aisladas

```sh
pnpm exec prettier e2e playwright.auth.config.ts --check
pnpm exec tsc -p e2e/tsconfig.json --noEmit
pnpm exec eslint e2e/auth.browser.ts e2e/auth.fixture.ts playwright.auth.config.ts --parser-options '{"projectService":false,"project":"./e2e/tsconfig.json"}'
```

El `tsconfig` propio incluye el fixture y la configuración Playwright. El lint
global encuentra ambos proyectos con Project Service. La suite de navegador se
ejecuta por separado de `pnpm run check`; este ultimo cubre formato, lint, Vitest,
build e interacciones, accesibilidad y regresiones visuales de Storybook.
