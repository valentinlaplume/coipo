---
name: ui-coach
description: >-
  Reglas de UI de Coipo. Usar SIEMPRE que se agregue o modifique estilos,
  componentes o pantallas: CSS, clases en HTML/JS, modales, botones, chips,
  listas, inputs con botón y pestañas. Incluye tokens obligatorios, layout,
  jerarquía y checklist final.
---

# UI de Coipo — reglas

La app es mobile-first (360–390 px), tema claro/oscuro y una hoja "Nueva
Ingesta" con pestañas. Cualquier cambio de estilos debe pasar este checklist.

## 1. Arquitectura de estilos (orden de carga en index.html)

| Archivo | Rol |
|---|---|
| `src/styles/tokens.css` | **ÚNICA fuente de variables globales** (`:root`). Se carga primero. |
| `src/styles/components.css` | Componentes compartidos. Después de tokens, antes de main. |
| `src/css/main.css` | Shell de la app, hojas, vistas genéricas. |
| `src/views/**/*.css` | Solo detalles propios de cada vista (overrides puntuales). |
| `src/css/gestos.css` | Gestos y animaciones. |
| `src/css/tema-oscuro.css` | **Último**: `html[data-tema="oscuro"]` sobrescribe los tokens de color. |

- **Nunca** agregar otro `:root` en las vistas: si falta un token, agregarlo en
  `tokens.css` (los valores actuales son los históricos por cascada: no
  "corregir" colores/radios sin revisar el aspecto en ambos temas).
- Los componentes compartidos se definen **una sola vez**, en
  `components.css`. No duplicar `.btn-primary`, `.modal-*`, `.pill`,
  `.off-fila`, `.search-*`, `.ingesta-tab*` en las vistas: sobrescribir solo
  lo que cambie, con selector más específico si hace falta.

## 2. Tokens obligatorios (nada de literales en CSS nuevo)

| Qué | Token | Valor |
|---|---|---|
| Espaciado | `var(--sp-2 … --sp-24)` | el número = px (`--sp-8` = 8 px) |
| Radios | `--radius-xs/thumb/md/lg/pill` | 8 / 10 / **12** / **20** / 999 px |
| Texto | `--fs-caption … --fs-heading` | 0.75 → 1.5 rem |
| Piso de texto | `--fs-min` | 14 px (nunca menos) |
| Targets | `--touch-min / --touch-md / --touch-fila` | 44 / 48 / 56 px |
| Colores | `--coipo-*` (bg, surface, card, primary, primary-dark, accent, text, text-muted, success/error/warning/info, border, overlay, tint-*) | cambian en tema oscuro |

- `--font-main` para `font-family` en todo elemento nuevo.
- **Colores**: SIEMPRE token, nunca hex. Los hex heredados existentes no se
  migran de un saque (el tema oscuro redefine los tokens y cambiaría el aspecto
  en modo oscuro): migrar caso por caso solo tras verificar ambos temas.
- Sombras: literales `rgba(0,0,0,*)` / `rgba(141,160,129,*)` permitidos;
  `--shadow` / `--shadow-soft` para sombras suaves de tarjetas.

## 3. Layout y targets

- Todo control tocable ≥ **44 px** (`--touch-min`): botones, chips, pestañas,
  inputs. Filas navegables de lista: **56 px** (`--touch-fila`).
- Sin scroll horizontal a 360 ni 390 px. Contenedores anchos con
  `min-width: 0` y textos largos con ellipsis (`overflow: hidden` +
  `text-overflow: ellipsis`).
- Hoja "Nueva Ingesta": `max-height: 92dvh`; cabecera, chips y pestañas
  `flex: 0 0 auto`; **solo** `.ingesta-cuerpo` scrollea
  (`overflow-y: auto; min-height: 0`).
- Cerrar con ✕ (y arrastre); nunca solo con botones de pie.

## 4. Jerarquía

- **Un solo botón primario verde por pantalla**, a ancho completo
  (`.btn-primary`). Secundarios `.btn-secondary`; destructivos `.btn-danger`.
  Dentro de `.modal-actions` los botones se reparten (`flex: 1`).
- Tipografía: `--fs-heading` (títulos de pantalla) → `--fs-title` →
  `--fs-lg` → `--fs-base` → `--fs-min` (piso). No inventar tamaños fuera de
  la escala; los valores heredados impares (0.88, 1.2, 1.4 rem) se respetan
  hasta normalizar el componente al que pertenecen.
- Estados: `:active` con `transform: scale(.96–.97)` o `filter: brightness`;
  `:disabled` con `opacity` + `cursor: not-allowed`.

## 5. Componentes y dónde viven

| Componente | Clases canónicas |
|---|---|
| Botón primario | `.btn-primary` (+ variantes `:hover/:active/:disabled`) |
| Botón secundario / peligro / bloque | `.btn-secondary`, `.btn-danger`, `.btn-block` |
| CTA de la hoja | `.ingesta-btn-primario` (va después de `.btn-primary` en components.css) |
| Modal | `.modal-overlay`, `.modal-content`, `.modal-actions(+ -compact)` |
| Chip / píldora | `.pill`, `.ingesta-momento` |
| Pestañas | `.ingesta-tabs`, `.ingesta-tab(.active)` |
| Fila de lista | `.receta-fila`, `.ingesta-receta-fila`, `.off-fila` (+ partes) |
| Input con botón | `.search-row > .search-field > .search-input + .search-clear`, `.search-btn` |

⚠️ El **orden dentro de `components.css` es la cascada histórica** (p. ej.
`.btn-block` antes de `.btn-primary`). No reordenar sin verificar el aspecto.

## 6. Checklist final

1. ¿Literales (hex, px sueltos)? → reemplazados por tokens de `tokens.css`.
2. ¿Targets ≥ 44 px y texto ≥ 14 px?
3. ¿Un solo primario verde por pantalla y modales con un solo contenedor scrolleable?
4. ¿Probado en **tema claro y oscuro** (los tokens de color cambian)?
5. ¿A 360 y 390 px sin scroll horizontal?
6. ¿Componente nuevo/duplicado: una sola definición en `components.css`?
7. `npm test` en verde (incluye `tests/estilos-base.test.mjs`: tokens,
   orden de cascada y `var()` sin definir) y `npm run build` OK.

## 7. Bugs heredados — no tocar sin revisar el aspecto

- `var(--coipo-primary-light)` y `var(--coipo-primary-rgb)` (dashboard.css)
  están **sin definir**: esas reglas hoy renderizan avalor inicial. Si se toca
  `.meal-item.pending-new`, definir el token en `tokens.css` y sacarlo del
  allowlist de `tests/estilos-base.test.mjs`.
- `--radius-md` = 12 px y `--radius-lg` = 20 px NO son la escala original
  (16/24): los pisa el `:root` histórico de onboarding.css (ya consolidado).
- `--coipo-bg`/`--coipo-text`/`--coipo-surface`/`--coipo-text-muted` tienen
  valores heredados de los antiguos `:root` de dashboard/onboarding; no
  "restaurar" los valores de comentarios antiguos sin revisar todas las pantallas.
