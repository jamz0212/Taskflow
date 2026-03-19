# Antigravity Adapter

AGENTS_VERSION: 4.0.0

Este archivo adapta SaaS Factory para Google Antigravity.
La politica comun y reglas globales viven en `AGENTS.md`.

## Source of Truth

- Core policy: `AGENTS.md`
- Version lock: `AGENTS_VERSION: 4.0.0`
- Runner assets:
  - runtime: `.agent/rules`, `.agent/workflows`, `.agent/skills`
  - source template: `.claude/` (remapeado por scaffolder)

## Antigravity-Specific Notes

- Reglas de workspace viven en `.agent/rules/`.
- Workflows viven en `.agent/workflows/` y se disparan con `/`.
- Skills viven en `.agent/skills/`.
- Si falta soporte de slash/workflow, usar prompts equivalentes en lenguaje natural.

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

Antigravity debe mantenerse en paridad funcional con:

- `CLAUDE.md`
- `GEMINI.md`
- `OPENCODE.md`

Si hay contradiccion, prevalece `AGENTS.md`.
