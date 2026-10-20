# Correccion de PageSpeed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir los fallos detectados por PageSpeed en escritorio y movil sin alterar el contrato del backend ni la arquitectura del frontend.

**Architecture:** Las correcciones se separan por frontera: cliente HTTP, assets de descubrimiento, fuentes y estabilidad de layout. Cada tarea toca archivos independientes para poder revisarse y validarse por separado.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest, Playwright, Chakra UI v3, Cloudflare Workers Static Assets.

---

## Diagnostico

- Escritorio: rendimiento 97, accesibilidad 100, buenas practicas 96, SEO 92.
- Movil: rendimiento 74, accesibilidad 100, buenas practicas 96, SEO 92.
- `/robots.txt` devuelve HTML: 55 errores de sintaxis.
- `POST /api/v1/auth/refresh` aparece como peticion no finalizada con 401.
- JavaScript sin usar: ~35 KiB en el chunk principal.
- CLS: 0,087 en escritorio y 0,125 en movil. La traza de produccion identifica el placeholder de sesion de 180x40 que pasa a 256x43 y la aparicion tardia de filtros y tarjetas.
- Las fuentes de Google transfieren unos 157 KiB; Source Serif 4 aporta unos 122 KiB.

## Tareas

### Task 1: Cerrar respuestas HTTP fallidas

**Files:**

- Modify: `src/app/adapters/http/apiClient.ts`
- Test: `src/app/adapters/http/apiClient.test.ts`

- [x] Consumir o cancelar el cuerpo de toda respuesta `!response.ok` antes de lanzar `ApiError`.
- [x] Mantener intactos el mensaje, el estado, las credenciales y el reintento unico.
- [x] Agregar una prueba que verifique `response.bodyUsed` tras el rechazo.
- [x] Ejecutar las pruebas focalizadas y la suite completa.

### Task 2: Archivos de descubrimiento

**Files:**

- Create: `public/robots.txt`
- Create: `public/llms.txt`
- Create: `public/.well-known/ai-catalog.json`

- [x] `robots.txt` debe permitir la agenda publica y excluir `/admin/`, `/operaciones/` y `/perfil/`.
- [x] `llms.txt` debe ser Markdown con un unico H1 y enlaces publicos reales.
- [x] `ai-catalog.json` debe ser un manifiesto ARD valido y honesto: `{"specVersion":"1.0","entries":[]}`.
- [x] Verificar que los tres archivos existen en `dist` y que el JSON parsea.

### Task 3: Estabilizar el layout de carga

**Files:**

- Modify: `src/components/layout/AppMenu.tsx`
- Modify: `src/pages/LandingPage.tsx`
- Test: `src/pages/LandingPage.test.tsx`
- Test: `src/components/layout/AppMenu.test.tsx` si cambia el contrato observable.

- [x] Reservar 256x43 px durante la restauracion de sesion, que es la huella medida de la navegacion anonima final.
- [x] Mantener el `data-testid="session-restoring-placeholder"` y no anunciar enlaces falsos.
- [x] Renderizar un estado de carga local en `LandingPage` que reserve el panel de filtros y una rejilla inicial de tarjetas.
- [x] Conservar `AsyncStateView` para error y contenido listo.
- [x] Anunciar la carga con un estado accesible sin duplicar el estado global.
- [x] Reservar altura en el fallback de la ruta de la portada para que el footer no asome durante la carga perezosa.
- [x] Ejecutar las pruebas focalizadas y la suite completa.

### Task 4: Fuentes locales

**Files:**

- Create: `public/fonts/archivo-latin-v25.woff2`
- Create: `public/fonts/archivo-latin-ext-v25.woff2`
- Create: `public/fonts/source-serif-4-latin-v15.woff2`
- Create: `public/fonts/source-serif-4-latin-ext-v15.woff2`
- Create: `src/styles/fonts.css`
- Modify: `src/styles/global.css`
- Modify: `index.html`
- Modify: `.storybook/preview-head.html`
- Modify: `.storybook/main.ts` si hace falta servir `public/`
- Modify: `nginx.conf`
- Modify: `public/_headers` si se agrega cache de Cloudflare

- [x] Servir Archivo variable (400-900) y Source Serif 4 (600-700) desde el propio origen.
- [x] Eliminar preconnect, preload y `noscript` de Google Fonts en `index.html`.
- [x] Precargar solo los subsets latin de ambas familias.
- [x] Mantener `font-display: swap` y los `unicode-range` originales.
- [x] Actualizar Storybook para que use las mismas fuentes locales.
- [x] Retirar los origenes de Google Fonts de la CSP y cachear `/fonts/` como inmutable.
- [x] Verificar que los archivos descargados empiezan por `wOF2` y que no quedan referencias a Google Fonts.
- [x] Inspeccionar las diferencias visuales y actualizar las 237 baselines afectadas.

### Task 5: Validacion y medicion

- [x] Ejecutar `pnpm run verify:quick`.
- [x] Ejecutar `pnpm run check`, incluida la puerta de Storybook.
- [x] Construir el paquete de produccion y medir CLS/LCP con Playwright a 412x823 y 1350x940, con respuestas de API simuladas y retrasadas.
- [x] Verificar que `/robots.txt`, `/llms.txt`, `/.well-known/ai-catalog.json`, `/fonts/*` y `/_headers` se copian a `dist`.
- [ ] Verificar el 401 anonimo en PageSpeed despues del despliegue. No se modifica sin una decision de contrato del backend.
- [ ] Registrar el beacon de Cloudflare: su cache y su JavaScript antiguo se configuran fuera de este repositorio.
- [ ] Reevaluar la reduccion del JavaScript inicial sin usar. No se aplico un cambio de bajo riesgo en esta iteracion.

## Resultado de la ejecucion

- `pnpm run verify:quick`: 235 archivos de prueba y 1933 pruebas pasaron.
- `pnpm run check`: formato, lint, typecheck, pruebas, build, 254 historias con `play`, axe y baseline visual, e inventario de componentes pasaron.
- Playwright local: CLS 0 en movil con 10 actividades, CLS 0 en escritorio con 10 actividades y CLS 0 en movil con agenda vacia.
- LCP local: 428 ms en movil y 472 ms en escritorio, con la API retrasada 800 ms y service worker bloqueado.
- Fuentes: solo se descargan `archivo-latin-v25.woff2` (35,228 bytes) y `source-serif-4-latin-v15.woff2` (51,236 bytes); no hay peticiones a Google Fonts.
- Las 237 baselines visuales se regeneraron porque Storybook renderizaba Archivo con ancho 87,5 % y la aplicacion usa el ancho normal; la inspeccion confirmo que el cambio es tipografico y que el layout no se rompe.

## Criterios de cierre

- SEO 100 en la misma version de PageSpeed, pendiente de medir tras el despliegue.
- CLS <= 0,05 en escritorio y movil: cumplido en la medicion local.
- Sin advertencia de peticion sin finalizar en el refresh: cambio aplicado, pendiente de confirmar en PageSpeed tras el despliegue.
- Menos bytes de fuentes y sin peticiones a Google Fonts: cumplido.
- Accesibilidad 100 y sin regresiones en el catalogo de componentes: cumplido en Storybook; pendiente de confirmar en PageSpeed tras el despliegue.
