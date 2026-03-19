# Agent Interop Guide

Objetivo: ejecutar el mismo proceso en cualquier runner sin cambiar arquitectura ni criterios de calidad.

## Canonical Policy

1. `AGENTS.md` es la fuente unica de verdad.
2. `CLAUDE.md`, `GEMINI.md`, `OPENCODE.md`, `ANTIGRAVITY.md` son adapters por runner.
3. Si hay conflicto entre adapters, manda `AGENTS.md`.

## Supported Runners

| Type | Runner | Asset Directory |
|------|--------|-----------------|
| Console | Claude | `.agent/` |
| Console | Gemini | `.gemini/` |
| Console | OpenCode | `.opencode/` |
| IDE | Antigravity | `.agent/` |
| IDE | Cursor | `.cursor/` |
| IDE | Windsurf | `.windsurf/` |

All runners share the same policy, quality gates, and security baseline. Only the asset directory layout differs (managed by the scaffolder).

## Capability Mapping

- DB capability: SQL, migraciones, RLS checks.
- Browser capability: pruebas UI/UX y capturas.
- Runtime capability: errores de build/runtime.

No dependas de una marca concreta; depende de la capacidad. Si un runner no soporta una capacidad, aplica fallback con comandos locales y deja pasos reproducibles.

## Slash Command Fallbacks

Cuando un runner no soporte slash commands, usa prompts directos referenciando el archivo dentro del directorio AI del runner activo:

- `/new-app` -> "Genera BUSINESS_LOGIC.md siguiendo commands/new-app.md"
- `/landing` -> "Construye landing siguiendo commands/landing.md"
- `/add-login` -> "Implementa auth segun commands/add-login.md"
- `/primer` -> "Carga contexto del proyecto segun commands/primer.md"
- `/a2a-report` -> "Genera handoff report con estado, validaciones y siguientes pasos"

## SDD Command Fallbacks

Si el runner no soporta el sistema de skills o comandos `/sdd:*`, usar prompts directos referenciando el skill dentro del directorio AI del runner activo (`.agent/`, `.gemini/`, `.opencode/`, `.agent/`, `.cursor/`, o `.windsurf/`):

- `/sdd:init` -> "Inicializa Spec-Driven Development segun skills/sdd-init/SKILL.md"
- `/sdd:explore <topic>` -> "Investiga <topic> segun skills/sdd-explore/SKILL.md"
- `/sdd:new <name>` -> "Crea propuesta de cambio <name> segun sdd-explore + sdd-propose"
- `/sdd:continue [name]` -> "Continua el siguiente paso pendiente del cambio SDD"
- `/sdd:apply [name]` -> "Implementa los tasks segun skills/sdd-apply/SKILL.md"
- `/sdd:verify [name]` -> "Verifica implementacion vs specs segun skills/sdd-verify/SKILL.md"
- `/sdd:archive [name]` -> "Archiva el cambio completado segun skills/sdd-archive/SKILL.md"

## Cross-Runner Tool Considerations

Some tools are runner-specific. When writing agent instructions or skills:

- Prefer generic capabilities over branded tools (e.g., "search the codebase" over "use Grep tool").
- If a skill references `TodoWrite` (Claude-specific), other runners should use their native task tracking or skip that step.
- If a skill references `Bash`, runners without shell access should document the command for manual execution.
- Agent frontmatter (`tools:` field) is normalized per runner by the scaffolder — do not hardcode runner-specific tool names in shared templates.

## Session Handoff

- Al cambiar de runner, usar `a2a-report` antes de cerrar.
- El reporte debe incluir comandos exactos para continuar sin ambiguedad.

## Quality and Security Baseline

Siempre correr:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e:smoke
```

Release:

```bash
npm run smoke
```

Y mantener:

- Validacion Zod en superficies publicas.
- RLS y permisos server-side alineados.
- Cero secretos en docs o codigo.

## Recommended Prompt Contract

Para tareas de implementacion:

1. Define objetivo y criterios de exito verificables.
2. Pide rutas de archivo modificadas.
3. Exige validaciones ejecutadas y resultado.

Ejemplo:

"Implementa X en el Golden Path. Mantener seguridad (Zod+RLS), ejecutar lint/typecheck/test:unit/test:e2e:smoke y reportar archivos tocados + riesgos."
