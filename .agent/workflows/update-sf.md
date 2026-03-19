---
description: "Actualiza SaaS Factory a la ultima version. Busca el alias saas-factory, hace git pull y regenera assets segun consolas e IDEs activos del proyecto."
---

# Update SaaS Factory

Este comando actualiza las herramientas de desarrollo y configuracion AI del factory a la ultima version disponible.

## Proceso

### Paso 1: Buscar los aliases de SaaS Factory

Busca `saas-factory` (o aliases ai-kit equivalentes) en los archivos de configuracion del shell del usuario:

```bash
# Buscar en zshrc
grep "alias saas-factory" ~/.zshrc

# Si no esta, buscar en bashrc
grep "alias saas-factory" ~/.bashrc
```

Formato actual recomendado:
```bash
alias saas-factory='bash /ruta/al/repo/scripts/install-saas-factory.sh'
```

Tambien aceptar formato legacy:

```bash
alias saas-factory="cp -r /ruta/al/repo/saas-factory/. ."
```

**Extrae la ruta del repo** con estas reglas:
- Si apunta a `scripts/install-saas-factory.sh`: quitar ese sufijo
- Si apunta a `scripts/scaffold-saas-factory.mjs`: quitar ese sufijo
- Si usa `cp -r .../saas-factory/. .`: quitar `/saas-factory/.`

Si no encuentras el alias, pregunta al usuario:
> No encontre el alias `saas-factory`. Por favor, indica la ruta donde tienes el repositorio de SaaS Factory.

### Paso 2: Actualizar el repositorio fuente

Una vez tengas la ruta del repo, actualiza con git:

```bash
cd [RUTA_REPO_SF]
git pull origin main
```

Si hay errores de git (cambios locales, etc.), informa al usuario y sugiere solucion.

### Paso 3: Reemplazar assets del factory

Actualiza assets AI y adapters desde el repo fuente usando el scaffolder oficial:

```bash
# En el directorio del proyecto actual
# Detectar consolas activas
CONSOLES=""
if [ -d .claude ] || [ -f ./CLAUDE.md ]; then CONSOLES="${CONSOLES:+$CONSOLES,}claude"; fi
if [ -d .gemini ] || [ -f ./GEMINI.md ]; then CONSOLES="${CONSOLES:+$CONSOLES,}gemini"; fi
if [ -d .opencode ] || [ -f ./OPENCODE.md ]; then CONSOLES="${CONSOLES:+$CONSOLES,}opencode"; fi

# Detectar IDEs activos
IDES=""
if [ -d .agent ] || [ -f ./ANTIGRAVITY.md ]; then IDES="${IDES:+$IDES,}antigravity"; fi
if [ -d .cursor ]; then IDES="${IDES:+$IDES,}cursor"; fi
if [ -d .windsurf ]; then IDES="${IDES:+$IDES,}windsurf"; fi

# Detectar profile activo (fallback: next-supabase)
PROFILE="next-supabase"
if [ -f ./.saas-factory/profile.json ]; then
  PROFILE="$(node -e "const fs=require('fs');try{const p=JSON.parse(fs.readFileSync('./.saas-factory/profile.json','utf8'));process.stdout.write((p.profile||'next-supabase'));}catch{process.stdout.write('next-supabase');}")"
fi

if [ -z "$CONSOLES" ] && [ -z "$IDES" ]; then
  echo "No se detectaron assets de consola/IDE. No hay nada que actualizar."
else
  CMD=(node [RUTA_REPO_SF]/scripts/scaffold-saas-factory.mjs --profile "$PROFILE" --dest . --force)
  if [ -n "$CONSOLES" ]; then CMD+=(--console "$CONSOLES"); fi
  if [ -n "$IDES" ]; then CMD+=(--ide "$IDES"); fi
  "${CMD[@]}"
fi

rm -f ./AGENT_OS.md
```

Si existen scripts del factory en el proyecto actual, actualizarlos tambien:

```bash
mkdir -p ./scripts
cp [RUTA_REPO_SF]/scripts/scaffold-saas-factory.mjs ./scripts/scaffold-saas-factory.mjs
cp [RUTA_REPO_SF]/scripts/install-saas-factory.sh ./scripts/install-saas-factory.sh
```

### Paso 4: Confirmar actualizacion

Informa al usuario:

```
SaaS Factory actualizado correctamente.

Cambios aplicados:
- [directorios de consola] segun seleccion (`.claude`, `.gemini`, `.opencode`)
- [directorios de IDE] segun seleccion (`.agent`, `.cursor`, `.windsurf`)
- profile regenerado segun `./.saas-factory/profile.json`
- AGENTS.md y adapters detectados en el proyecto

Archivos NO modificados:
- .mcp.json (tus tokens y credenciales)
- src/ (tu codigo)
```

## Notas

- Este comando NO modifica `.mcp.json` ni el codigo fuente
- Actualiza toolbox de desarrollo y configuracion AI portable
