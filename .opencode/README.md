# SaaS Factory - Runner Assets Source

Este archivo documenta los assets fuente en `saas-factory/.opencode/`.

En proyectos generados, el scaffolder remapea esta estructura segun el runner elegido:

- Claude -> `.opencode/`
- Gemini -> `.gemini/`
- OpenCode -> `.opencode/`
- Antigravity -> `.agent/`
- Cursor -> `.cursor/`
- Windsurf -> `.windsurf/`

`AGENTS.md` sigue siendo la fuente canonica de politica. Este README explica la capa de assets AI.

---

## Que contiene esta carpeta

La carpeta fuente puede incluir, segun la version activa del factory y el profile aplicado:

- `commands/` - UX invocable por slash command cuando el runner lo soporte
- `agents/` - agentes especializados o instrucciones runner-specific
- `prompts/` - metodologias, assembly lines y guias operativas
- `skills/` - capacidades reutilizables con `SKILL.md`
- `PRPs/` - blueprints para planificacion de features
- `design-systems/` - referencias visuales reutilizables
- `hooks/` - scripts o integraciones del runner

No asumir una arquitectura skill-only absoluta: este fork convive con `commands`, `agents`, `prompts` y `skills` segun el runner y el estado del template.

---

## Filosofia actual

- Agent-first: el humano define el QUE, el agente ejecuta el COMO
- Runner-native: cada salida respeta la estructura nativa del runner
- Source-of-truth unico: estos assets fuente viven en `.opencode/` y se remapean
- Multi-runner: la misma politica debe funcionar en Claude, Gemini, OpenCode e IDE runners
- Profile-aware: overlays y exclusiones pueden cambiar assets segun `next-supabase`, `next-python` o `python-backend`

---

## Estructura esperada

```text
.opencode/
|- AGENTS.md
|- README.md
|- commands/
|- agents/
|- prompts/
|- skills/
|- PRPs/
|- design-systems/
`- hooks/
```

No todas las carpetas tienen que existir siempre. El scaffolder copia lo disponible y luego aplica remapeos y exclusiones por runner/profile.

---

## Interoperabilidad por runner

- Claude y Gemini mantienen `commands/`, `agents/`, `prompts/`, `skills/` de forma cercana a la fuente
- OpenCode consume `.opencode/` y requiere normalizacion adicional de algunos assets
- Antigravity y Windsurf remapean `commands/` a `workflows/`
- Cursor conserva `commands/` y mueve prompts a `rules/prompts/`

Si un runner no soporta slash commands o cierto sistema de skills, usar `docs/ai/AGENT_INTEROP.md` y los fallbacks documentados alli.

---

## Reglas de mantenimiento

- Mantener commands accionables y copy-paste safe
- Mantener skills con `SKILL.md` valido y consistente con su carpeta
- Evitar lock-in innecesario a una marca de runner dentro de templates compartidos
- Si se cambia un path hardcodeado a `.opencode/`, convertirlo a variante runner-aware cuando aplique
- Mantener `AGENTS.md`, adapters y docs sincronizados con el comportamiento real del scaffolder

---

## Validacion

Desde `saas-factory/`:

```bash
npm run docs:check
```

Desde el root del repo, para validar distribucion y docs:

```bash
node scripts/ci/check-scaffolder.mjs
node scripts/ci/check-root-docs-sync.mjs
```

---

## Versionado

- Template policy version: `4.0.0`
- Politica canonica: `saas-factory/AGENTS.md`
- Source of truth de assets AI: `saas-factory/.opencode/`

Este archivo existe para documentar la fuente de assets antes del remapeo a `.claude`, `.gemini`, `.opencode`, `.agent`, `.cursor` o `.windsurf`.
