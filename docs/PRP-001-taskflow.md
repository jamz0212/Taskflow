# PRP-001: TaskFlow Web App

> **Estado**: PENDIENTE
> **Fecha**: 2026-03-11
> **Proyecto**: TaskFlow

---

## Objetivo

Crear una aplicación web para la gestión de tareas basada en los diseños de Stitch ("Detalle de Tarea", "Lista de Tareas", etc.), implementando un sistema de autenticación B2B production-ready con Supabase y Next.js.

## Por Qué

| Problema | Solución |
|----------|----------|
| Falta de un sistema centralizado para gestión de tareas visualmente atractivo | Una app web moderna y funcional que consuma los diseños generados por Stitch |

**Valor de negocio**: Aumentar la productividad del usuario al tener una herramienta rápida, segura y estéticamente superior.

## Qué

### Criterios de Éxito
- [ ] La aplicación corre localmente con Next.js 16 (React 19, Tailwind CSS).
- [ ] Registro e Inicio de sesión funcionales (Supabase Auth).
- [ ] Vistas de "Lista de Tareas" y "Detalle de Tarea" idénticas al diseño de Stitch.
- [ ] Configuración de la base de datos con perfiles y RLS habilitado en Supabase.

### Comportamiento Esperado
El usuario entra a la aplicación y debe iniciar sesión o registrarse. Si no está autenticado, es redirigido al login. Tras la autenticación, aterriza en la Lista de Tareas (Dashboard). Al hacer clic en una tarea, puede ver el Detalle de la Tarea. Todas estas vistas utilizarán los componentes exportados desde Stitch.

---

## Contexto

### Referencias
- `/add-login.md` - Flujo para el inicio de sesión.
- `Stitch Project: Detalle de Tarea (10402292039565182866)` - Diseños a implementar.

### Arquitectura Propuesta (Feature-First)
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   └── dashboard/
│       ├── page.tsx (Lista de Tareas)
│       └── [id]/page.tsx (Detalle de Tarea)
├── features/
│   ├── auth/
│   │   └── components/
│   └── tasks/
│       ├── components/
│       ├── services/
│       └── types/
└── lib/
    └── supabase/
```

### Modelo de Datos
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger: crear perfil automáticamente al signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

---

## Blueprint (Assembly Line)

### Fase 1: Setup Inicial
**Objetivo**: Next.js configurado con Tailwind y TypeScript. Estructura base.
**Validación**: `npm run dev` abre la aplicación sin errores de compilación.

### Fase 2: Autenticación (add-login)
**Objetivo**: Implementar todo el flujo de Supabase Auth según `add-login.md`.
**Validación**: Un usuario puede hacer Signup, Login y se crea su perfil en `public.profiles`. Las rutas bajo `/dashboard` están protegidas.

### Fase 3: Integración de UI (Stitch Vibe Design)
**Objetivo**: Traer las pantallas "Lista de Tareas (Español)" y "Detalle de Tarea (Español)" desde el servidor MCP de Stitch e incorporarlas como vistas en Next.js.
**Validación**: La UI se procesa correctamente y es idéntica a la generada por la IA visual.

### Fase 4: Validación Final
**Objetivo**: Sistema funcionando end-to-end.
**Validación**:
- [ ] `npm run typecheck` pasa
- [ ] `npm run build` exitoso
- [ ] El flujo completo de autenticación -> vista de tareas -> detalle de tarea es navegable.

---

## 🧠 Aprendizajes (Self-Annealing / Neural Network)

*(Vacio hasta comenzar ejecución)*

---

## Gotchas

- [ ] Asegurar que las variables de entorno de Supabase estén correctamente inyectadas (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- [ ] Validar importación dinámica para cualquier script inyectado directamente por Stitch.

## Anti-Patrones

- NO hardcodear valores en las credenciales.
- NO omitir validación Zod en inputs de usuario.
- NO crear vistas genéricas; respetar el "Design DNA" de Stitch.

---

*PRP pendiente aprobación. No se ha modificado código.*
