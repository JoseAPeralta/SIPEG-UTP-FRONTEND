# DESIGN.md — Identidad Visual SIPEG

> Documento de identidad visual de SIPEG, plataforma independiente de gestión de eventos académicos.

## 1. Propósito

Este documento define la identidad visual de SIPEG: una plataforma web de gestión de eventos académicos (eventos, asistencia, certificados, aulas, ponentes, usuarios, reportes y estadísticas).

SIPEG es un producto **independiente**. No está afiliado a ninguna institución y debe poder usarse en cualquier contexto académico, universitario o de otra organización sin arrastrar identidad de terceros. Por lo tanto:

- No se usa ningún logo, paleta, tipografía ni referencia visual institucional ajena.
- El nombre de producto es **SIPEG**, sin sufijos de institución.

Este documento es la fuente de verdad visual del proyecto. Mientras el código no esté alineado (tema Chakra, estilos globales, PWA), esta guía manda sobre el aspecto deseado de la interfaz.

## 2. Principios

1. **Primero la tarea.** Cada pantalla responde "¿qué debo hacer ahora?". La interfaz guía, no confunde.
2. **Simple de usar, no solo de ver.** La estética no compensa flujos rotos: primero funciona, luego se embellece.
3. **Para todas las personas.** Todo contenido es perceptible, operable, comprensible y robusto (POUR). Accesibilidad no es un extra.
4. **Consistente, no uniforme.** Mismos patrones y lenguaje en todas las pantallas; la densidad se adapta al contexto (público aireado, panel administrativo más denso), pero los tokens y componentes son los mismos.
5. **Color con propósito.** Paleta corta y deliberada. El color nunca es el único indicador de estado, error o jerarquía.
6. **Cálido y cercano.** La interfaz se siente como una herramienta de campus amigable, no como un portal burocrático ni un SaaS corporativo genérico.

## 3. Paleta

Paleta **terracota cálida** sobre neutros crema. Monocromática en terracota + neutros cálidos: es la más fácil de trabajar y la más pulida (NN/g).

### 3.1 Modo claro

| Token                | Hex                 | Uso                                           | Contraste verificado                                              |
| -------------------- | ------------------- | --------------------------------------------- | ----------------------------------------------------------------- |
| `surface.canvas`     | `#FBF7F2`           | Fondo general                                 | —                                                                 |
| `surface.raised`     | `#FFFDF9`           | Tarjetas, menús, superficies elevadas         | —                                                                 |
| `surface.subtle`     | `#F3EAE2`           | Zonas de apoyo, encabezados suaves            | —                                                                 |
| `text.default`       | `#33261F`           | Texto principal                               | 13.7:1 vs canvas; 14.4:1 vs raised                                |
| `text.muted`         | `#6B5A4F`           | Texto secundario, descripciones               | 6.2:1 vs canvas; 6.5:1 vs raised                                  |
| `accent.solid`       | `#9C3A1E`           | Botones primarios, links, foco, estado activo | 6.9:1 vs blanco; 6.5:1 vs canvas                                  |
| `accent.solid` hover | `#AD4523`           | Hover / estados alternos del primario         | 5.8:1 vs blanco                                                   |
| `accent.contrast`    | `#FFFFFF`           | Texto sobre `accent.solid`                    | 6.9:1                                                             |
| `accent.muted`       | `#FBF0EA`           | Fondo sutil de acento, chips suaves           | —                                                                 |
| terracota 500        | `#C2552F`           | Llenado de componentes, gráficos, badges      | 4.5:1 vs blanco (solo texto grande o UI)                          |
| terracota 300        | `#E59A72`           | Elementos decorativos, ilustración            | 2.1:1 vs canvas (no para texto)                                   |
| `border.subtle`      | `#D8CCC2`           | Divisores decorativos                         | 1.5:1 (decorativo)                                                |
| Borde de input       | ≈`#8A7768`          | Bordes de campos de formulario                | Requisito ≥3:1 (candidato a validar al implementar)               |
| Error                | `#B3261E` (familia) | Errores, acciones destructivas                | A validar al implementar (objetivo ≥4.5:1 sobre `surface.raised`) |

### 3.2 Modo oscuro

| Token             | Hex       | Contraste verificado                                         |
| ----------------- | --------- | ------------------------------------------------------------ |
| `surface.canvas`  | `#1C1410` | —                                                            |
| `surface.raised`  | `#261C16` | —                                                            |
| `surface.subtle`  | `#33251C` | —                                                            |
| `text.default`    | `#F7EFE8` | 16.0:1 vs canvas; 14.7:1 vs raised                           |
| `text.muted`      | `#C9B8AC` | 9.5:1 vs canvas                                              |
| `accent.solid`    | `#E59A72` | 8.0:1 vs canvas; 7.3:1 vs raised                             |
| `accent.contrast` | `#2B1209` | 7.7:1 vs `accent.solid` (texto oscuro sobre terracota claro) |
| `accent.muted`    | `#4A2413` | Decorativo                                                   |
| Borde de input    | `#7A6A5C` | 3.5:1 ✓                                                      |

### 3.3 Reglas de color

- **Texto normal**: contraste ≥ 4.5:1 contra su fondo (WCAG 1.4.3 AA).
- **Texto grande** (≥24px, o ≥18.7px en negrita): ≥ 3:1.
- **Componentes y gráficos** (bordes de input, iconos, foco, estados): ≥ 3:1 contra colores adyacentes (WCAG 1.4.11).
- **Nunca** usar terracota 500/300 (o equivalentes claros) para texto pequeño sobre fondo claro.
- **El color nunca es el único medio** de transmitir información (WCAG 1.4.1): errores llevan icono y texto; estados llevan etiqueta; gráficos no dependen solo del tono.
- El modo oscuro no usa negro puro ni superficies demasiado claras: se respeta el contraste AA en todas las elevaciones (Material Design).

## 4. Tipografía

Dos familias máximo, tres tamaños visuales aproximados para jerarquía clara (NN/g).

| Rol                | Familia                                | Detalle                                                                                             |
| ------------------ | -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| UI y cuerpo        | **Archivo**                            | Sans humanista, legible en interfaces. Carga: `Archivo` con pesos 400, 600, 700 y ancho variable.   |
| Títulos y wordmark | **Source Serif 4**                     | Serif editorial que conecta con el contexto académico sin ser institucional. Carga: pesos 600, 700. |
| Fallback           | `ui-sans-serif, system-ui, sans-serif` | Para el cuerpo y UI.                                                                                |

**Reglas tipográficas**

- Base del cuerpo: 16px, line-height 1.5–1.7, peso 400.
- Jerarquía con ~3 tamaños: título de página ~2rem (Source Serif 4, 600–700), encabezado de sección ~1.5rem, cuerpo 16px. Los tamaños intermedios se derivan de estos.
- Longitud de línea: ~45–75 caracteres por línea para lectura cómoda.
- El texto debe poder re-escalarse: respeta zoom a 200% y reflow en una sola columna (WCAG 1.4.10), y los ajustes de espaciado de texto (WCAG 1.4.12).
- No usar tipografía display/decorativa en cuerpo de texto ni en elementos de formulario.

## 5. Layout y densidad

- **Grid fluido**: contenedor de contenido con ancho máximo ~7xl (≈80rem) centrado, márgenes responsivos; una sola columna en móvil.
- **Escala de espacio** de 4/8px (Material): paddings, gaps y márgenes usan múltiplos de 4, con 8 como paso base.
- **Objetivos táctiles**: mínimo WCAG 2.5.8 = 24×24px; estándar de producto = **44–48×44–48px** (Apple HIG / Material), con ≥8px de separación entre objetivos.
- **Saltar navegación**: enlace "Saltar al contenido" al inicio de cada página que enfoque `main`.
- **Header fijo**: si el encabezado es sticky, los elementos enfocados deben despejarse de él (`scroll-margin-top`) para no quedar tapados (WCAG 2.4.11 Focus Not Obscured).
- **Densidad según contexto**: vistas públicas con más aire; vistas administrativas y de reportes más densas, siempre con los mismos tokens de espacio.

## 6. Componentes (reglas)

- **Botón primario**: terracota relleno (`accent.solid`), texto `accent.contrast`. Hover en `#AD4523`.
- **Botón secundario**: outline con borde y texto en `accent.solid`, fondo transparente o `surface.raised`.
- **Acción destructiva**: usa el token de error, no el primario.
- **Foco visible**: anillo de foco de ≥2px, offset 2px, contraste ≥3:1 contra el fondo adyacente. Nunca `outline: none` sin un reemplazo visible (WCAG 2.4.7, 2.4.13).
- **Errores de formulario**: color + icono + mensaje de texto; el campo lleva `aria-invalid` y el mensaje está asociado con `aria-describedby` (WCAG 3.3.1, 3.3.3). El foco se mueve al primer error al enviar.
- **Enlaces en párrafos**: siempre subrayados; el color no basta para distinguir un link (WebAIM).
- **Navegación**: misma estructura y orden en todas las páginas (WCAG 3.2.3); el elemento activo usa `aria-current`.
- **Iconos**: los funcionales tienen nombre accesible (`aria-label`); los decorativos se ocultan con `aria-hidden`.
- **Banners de evento**: imagen real o bloque de color; si hay texto sobre imagen, debe llevar scrim/oscuricación que garantice ≥4.5:1 de contraste.
- **Formularios**: cada campo tiene `<label>` visible asociado (WCAG 3.3.2). Prefijar con autocompletado donde aplique.

## 7. Movimiento

- **Microinteracciones** cortas y útiles: 150–250ms, solo para comunicar estado o dirección (nada decorativo y repetitivo).
- **Movimiento reducido**: `@media (prefers-reduced-motion: reduce)` anula o reduce animaciones/transiciones a duración ~0 (WCAG 2.3.3).
- **Sin parpadeos**: nada destella más de 3 veces por segundo (WCAG 2.3.1).
- No usar movimiento como único indicador de cambio de estado: siempre acompañar con cambios de color, texto o estructura.

## 8. Voz y contenido

- Español claro, frases cortas, **verbo primero**: "Registrar asistencia", "Exportar reporte", "Crear evento". Evitar títulos nominales tipo "Módulo de administración de…".
- Trato de **usted** (contexto institucional público).
- **Estados vacíos**: dicen que no hay datos y ofrecen el siguiente paso ("Aún no hay eventos. Crea el primero.").
- **Errores**: dicen qué pasó y qué hacer al respecto. Nunca solo "Error".
- Sin jerga interna en vistas de estudiante o ponente; el lenguaje del dominio (eventos, asistencia, certificados, aulas, ponentes) se usa de forma consistente en todas las pantallas.

## 9. Accesibilidad (checklist del producto)

**WCAG 2.2 AA (obligatorio)**

- [ ] Contraste de texto ≥4.5:1; texto grande ≥3:1 (1.4.3).
- [ ] Contraste de UI y gráficos ≥3:1 (1.4.11).
- [ ] Toda la funcionalidad operable por teclado, sin trampas de foco (2.1.1, 2.1.2).
- [ ] Foco visible en todos los elementos interactivos (2.4.7); foco no tapado (2.4.11).
- [ ] `lang="es"` en el documento; idioma de partes donde cambie (3.1.1, 3.1.2).
- [ ] Landmarks semánticos (`header`, `nav`, `main`, `footer`); jerarquía de encabezados (1.3.1, 2.4.6).
- [ ] Labels visibles y asociadas en formularios; errores identificados y con sugerencia (3.3.1, 3.3.2, 3.3.3).
- [ ] El color no es el único medio de información (1.4.1).
- [ ] Autenticación accesible: no bloquear copiar/pegar en campos (3.3.8).
- [ ] Página con título descriptivo (2.4.2); enlaces con propósito claro (2.4.4).
- [ ] Navegación consistente (3.2.3); orden de foco lógico (2.4.3).

**Extras de producto**

- [ ] Objetivos táctiles 44–48×44–48px.
- [ ] Enlace "Saltar al contenido".
- [ ] Respeto a `prefers-reduced-motion`.
- [ ] Prueba en escala de grises: la interfaz se entiende sin color (NN/g).
- [ ] Alt text útil en imágenes informativas; `alt=""` en decorativas (1.1.1).

**Prohibido**: widgets overlay de "accesibilidad" (barras flotantes que dicen mejorar accesibilidad) como sustituto del diseño accesible real (NN/g).

## 10. Qué no hacer

- **No** caer en la estética genérica de software educativo/SaaS: púrpuras cliché sobre blanco, gradientes lavanda, Inter/Roboto/Arial como voz de marca.
- **No** usar dorado, amarillo o terracota claro como color de texto de cuerpo.
- **No** usar negro puro en modo oscuro sin verificar contraste en superficies elevadas (Material recomienda superficies grises oscuras, no `#000`).
- **No** depender del color para comunicar estados (errores, filtros, asistencia).
- **No** sacrificar flujo o legibilidad por ornamentación: el efecto estético-usabilidad no compensa problemas reales de uso (NN/g).
- **No** añadir fuentes o librerías sin necesidad concreta; la dupla Archivo + Source Serif 4 es suficiente.

## 11. Mapeo futuro (nota de implementación)

> Cuando se modifique el código, estas son las correspondencias previstas. No forman parte del alcance de este documento como implementación.

- `accent.solid` → `#9C3A1E` (claro) / `#E59A72` (oscuro); `accent.contrast` → blanco / `#2B1209`.
- `accent.muted` → `#FBF0EA` (claro) / `#4A2413` (oscuro).
- `surface.canvas` → `#FBF7F2` (claro) / `#1C1410` (oscuro); `surface.raised` → `#FFFDF9` / `#261C16`; `surface.subtle` → `#F3EAE2` / `#33251C`.
- `text.default` → `#33261F` (claro) / `#F7EFE8` (oscuro); `text.muted` → `#6B5A4F` / `#C9B8AC`.
- `border.subtle` → `#D8CCC2` (claro) / tono cálido oscuro (oscuro); borde de inputs con token ≥3:1.
- PWA `theme-color` (meta `theme-color`, manifest) → `#9C3A1E` en claro.
- Sustituir `colorPalette="red"`, `colorPalette="purple"`, `colorPalette="green"`, `colorPalette="blue"` de Chakra por tokens semánticos propios (error, éxito, facultad/filtro) en una sesión de implementación.

## 12. Fuentes

- WCAG 2.2 — https://www.w3.org/TR/WCAG22/
- WCAG 2 at a Glance (W3C WAI) — https://www.w3.org/WAI/standards-guidelines/wcag/glance/
- How to Meet WCAG (Quick Reference) — https://www.w3.org/WAI/WCAG22/quickref/
- WebAIM: Contrast and Color Accessibility — https://webaim.org/articles/contrast/
- NN/g: Good Visual Design, Explained — https://www.nngroup.com/articles/good-visual-design/
- NN/g: 5 Visual Treatments that Improve Accessibility — https://www.nngroup.com/articles/visual-treatments-accessibility/
- NN/g: The Aesthetic-Usability Effect — https://www.nngroup.com/articles/aesthetic-usability-effect/
- GOV.UK: Government Design Principles — https://www.gov.uk/guidance/government-design-principles
- Material Design 3: Designing (structure, contrast, targets) — https://m3.material.io/foundations/designing/structure
- Material Design: Dark theme — https://m3.material.io/design/color/dark-theme.html
- Apple HIG: Accessibility (target size) — https://developer.apple.com/design/human-interface-guidelines/accessibility
