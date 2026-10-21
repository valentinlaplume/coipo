# Coipo — guía para agentes

App mobile-first (Vite + JS vanilla + Netlify Functions) de registro de
comidas, macros y recetas, con tema claro/oscuro y backend propio en Firestore.

- Tests: `npm test` (Node test runner, sin navegador).
- Build: `npm run build` (debe pasar siempre, ~0.5 s).
- CSS enlazado en `index.html`; las vistas viven en `src/views/*`.

## UI

Al tocar **cualquier cosa visual** (CSS, clases en HTML/JS, componentes,
pantallas), seguir la skill **`.agents/skills/ui-coach/SKILL.md`**. Resumen:

- Tokens **obligatorios** en `src/styles/tokens.css` (único `:root`): nada de
  hex ni px sueltos en CSS nuevo. `--fs-min` (14 px) es el piso de texto y
  `--touch-min` (44 px) el piso de targets.
- Componentes compartidos (botones, modal, chips, pestañas, filas, input con
  botón) se definen **una sola vez** en `src/styles/components.css`; en las
  vistas solo overrides puntuales. No duplicar reglas de componentes.
- Respetar el aspecto y la UX existentes: capturas antes/después cuando el
  cambio sea de estilos, y probar claro/oscuro a 360–390 px.
- Checklist final de la skill: `npm test` (incluye `tests/estilos-base.test.mjs`)
  y `npm run build` en verde.
