# OpenCode Adapter

AGENTS_VERSION: 4.0.0

Este archivo adapta SaaS Factory para OpenCode.
La politica comun y reglas globales viven en `AGENTS.md`.

## Source of Truth

- Core policy: `AGENTS.md`
- Version lock: `AGENTS_VERSION: 4.0.0`
- Runner assets:
  - runtime: `.opencode/commands`, `.opencode/prompts`, `.opencode/PRPs`, `.opencode/skills`
  - optional IDE assets: `.agent`, `.cursor`, `.windsurf`
  - source template: `.claude/` (remapeado por scaffolder)

## OpenCode-Specific Notes

- OpenCode consume `.opencode/` como carpeta nativa.
- Mantiene el mismo enfoque agent-first: resolver sin descargarle trabajo tecnico innecesario al usuario.
- Prioriza herramientas especializadas para leer, buscar y editar antes que shell bruto.
- Ejecuta comandos en paralelo cuando no dependan entre si.
- Si falta una capacidad de runner, deja fallback reproducible por CLI o prompt directo.
- Si un command o skill no existe en formato nativo, usar la referencia runner-aware definida en `docs/ai/AGENT_INTEROP.md`.

## Required Quality Gates

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e:smoke
```

## Release Gate

```bash
npm run smoke
```

## Security Minimum

- Zod en endpoints/acciones publicas.
- RLS + checks server-side por rol.
- No exponer secretos ni datos sensibles en logs.

## Compatibility Contract

OpenCode debe producir salidas equivalentes a:

- `CLAUDE.md`
- `GEMINI.md`

Si hay contradiccion, prevalece `AGENTS.md`.
