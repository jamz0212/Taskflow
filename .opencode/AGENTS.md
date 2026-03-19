# AGENTS.md (Runner Assets)

This file is shipped inside runner AI asset folders.

## Scope

- Applies to this runner asset directory (`.claude`, `.gemini`, `.opencode`, `.agent`, `.cursor`, or `.windsurf` after scaffold remap).
- For global policy, defer to root `AGENTS.md`.

## Rules For Editing Assets

- Keep command docs in `commands/` actionable and copy-paste safe.
- Keep prompts and PRP templates aligned with the current stack and policy version.
- Avoid runner-brand lock-in in reusable templates when not required.

## Skills Standards

- Every skill folder must include `SKILL.md` with valid YAML frontmatter.
- `name` must be kebab-case and match its directory name.
- Keep `SKILL.md` concise; move heavy content to `references/`.
- Prefer safe scripts with clear errors and `--help` support.

## Validation

From template root, use:

```bash
npm run skills:validate
```
