# TASKS.md — Implementación de la identidad visual SIPEG

> Fuente de verdad del avance de la implementación. Cada tarea se marca `- [x]` al completarla
> y el `status` refleja `pending` / `in_progress` / `completed`.

## Objetivo

Aplicar la identidad definida en `DESIGN.md` (paleta terracota, marca independiente SIPEG,
WCAG 2.2 AA + extras de accesibilidad) a todo el frontend, sin cambiar la lógica de negocio.

## Estado

| Estado    | Tarea                                                              |
| --------- | ------------------------------------------------------------------ |
| completed | Task 1: Escalas de color y tokens semánticos en theme              |
| completed | Task 2: Estilos globales y documento raíz (global.css, index.html) |
| completed | Task 3: Metadatos PWA (manifest + offline)                         |
| completed | Task 4: MetricCard con tonos semánticos                            |
| completed | Task 5: Reemplazo colorPalette y colores hardcodeados              |
| completed | Task 6: Hero landing y footer (copy independiente)                 |
| completed | Task 7: Datos mock sin referencias UTP                             |
| completed | Task 8: Iconos PWA en terracota                                    |
| completed | Task 9: Extras de accesibilidad (skip link)                        |
| completed | Task 10: Verificación completa                                     |

## Lista de verificación

- [x] **Task 1:** Escalas de color y tokens semánticos en `src/theme/index.ts` (terracotta, success, warning, danger, neutral; semanticTokens accent/surface/text/border).
- [x] **Task 2:** `src/styles/global.css` (fondo claro/oscuro, `::selection`, scroll-margin, reduced-motion) y `index.html` (title, description, theme-color).
- [x] **Task 3:** `public/manifest.webmanifest` (name, description, colores) y `public/offline.html` (title, colores, texto).
- [x] **Task 4:** `MetricCard.tsx` con tonos semánticos (primary, neutral, success, warning) + call sites en Dashboard y Reports.
- [x] **Task 5:** Reemplazo de `colorPalette` (red→terracotta, green→success, orange→warning/terracotta, blue/purple→gray/terracotta) y gradientes hardcodeados en componentes y páginas.
- [x] **Task 6:** SVG hero y copy de `LandingPage.tsx` + texto de `AppFooter.tsx` sin UTP.
- [x] **Task 7:** Datos mock visibles sin referencias UTP (`sipeg.ts`, `largeEvents.ts`, `smallEvents.ts`).
- [x] **Task 8:** `scripts/generate-pwa-icons.mjs` en terracota + regenerar `public/icons/*.png`.
- [x] **Task 9:** `SkipLink.tsx` + `id="main-content"` en `AppLayout.tsx` y `AdminLayout.tsx`.
- [x] **Task 10:** `pnpm run format` + `pnpm run check` + revisión visual y grep de control.

## Fuera de alcance

- Renombrar `package.json` (sipeg-utp-frontend), cache name del SW, ejemplo `api.utp.ac.pa` en test de `apiClient`.
- Reescribir copys a "verbo primero" (cambio de contenido masivo; sesión aparte).
