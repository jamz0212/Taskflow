-- Safe project sharing setup with roles for Supabase
-- Run the whole file in the Supabase SQL Editor.

ALTER TABLE public.columns
    ADD COLUMN IF NOT EXISTS order_index integer;

WITH ranked_columns AS (
    SELECT id, row_number() OVER (PARTITION BY project_id ORDER BY created_at, id) - 1 AS new_order
    FROM public.columns
)
UPDATE public.columns c
SET order_index = ranked_columns.new_order
FROM ranked_columns
WHERE c.id = ranked_columns.id
  AND c.order_index IS NULL;

CREATE TABLE IF NOT EXISTS public.project_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_email text NOT NULL,
    role text NOT NULL DEFAULT 'editor',
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(project_id, user_email)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.project_members
    ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'editor';

UPDATE public.project_members
SET user_email = lower(user_email),
    role = CASE
      WHEN role IN ('admin', 'editor', 'viewer') THEN role
      ELSE 'editor'
    END;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'project_members_role_check'
  ) THEN
    ALTER TABLE public.project_members
      ADD CONSTRAINT project_members_role_check
      CHECK (role IN ('admin', 'editor', 'viewer'));
  END IF;
END $$;

DROP POLICY IF EXISTS "Project owners can manage members" ON public.project_members;
DROP POLICY IF EXISTS "Members can view members" ON public.project_members;
DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;
DROP POLICY IF EXISTS "Members can access tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members can access columns" ON public.columns;
DROP POLICY IF EXISTS "Members can access subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Project viewers can read members" ON public.project_members;
DROP POLICY IF EXISTS "Project managers can insert members" ON public.project_members;
DROP POLICY IF EXISTS "Project managers can update members" ON public.project_members;
DROP POLICY IF EXISTS "Project managers can delete members" ON public.project_members;
DROP POLICY IF EXISTS "Shared members can view projects" ON public.projects;
DROP POLICY IF EXISTS "Project managers can update shared projects" ON public.projects;
DROP POLICY IF EXISTS "Project members can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Project editors can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Project editors can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Project editors can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Project members can view columns" ON public.columns;
DROP POLICY IF EXISTS "Project editors can insert columns" ON public.columns;
DROP POLICY IF EXISTS "Project editors can update columns" ON public.columns;
DROP POLICY IF EXISTS "Project editors can delete columns" ON public.columns;
DROP POLICY IF EXISTS "Project members can view subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Project editors can insert subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Project editors can update subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Project editors can delete subtasks" ON public.subtasks;

CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT lower(coalesce(auth.jwt()->>'email', ''))
$$;

CREATE OR REPLACE FUNCTION public.project_access_role(check_project_id text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.projects
      WHERE id = check_project_id
        AND user_id = auth.uid()
    ) THEN 'owner'
    ELSE (
      SELECT pm.role
      FROM public.project_members pm
      WHERE pm.project_id = check_project_id
        AND lower(pm.user_email) = public.current_user_email()
      LIMIT 1
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.can_view_project(check_project_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.project_access_role(check_project_id) IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.can_edit_project(check_project_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.project_access_role(check_project_id) IN ('owner', 'admin', 'editor')
$$;

CREATE OR REPLACE FUNCTION public.can_manage_project(check_project_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.project_access_role(check_project_id) IN ('owner', 'admin')
$$;

CREATE POLICY "Project viewers can read members"
ON public.project_members
FOR SELECT
USING (public.can_view_project(project_id));

CREATE POLICY "Project managers can insert members"
ON public.project_members
FOR INSERT
WITH CHECK (
  public.can_manage_project(project_id)
  AND lower(user_email) = user_email
  AND role IN ('admin', 'editor', 'viewer')
);

CREATE POLICY "Project managers can update members"
ON public.project_members
FOR UPDATE
USING (public.can_manage_project(project_id))
WITH CHECK (
  public.can_manage_project(project_id)
  AND lower(user_email) = user_email
  AND role IN ('admin', 'editor', 'viewer')
);

CREATE POLICY "Project managers can delete members"
ON public.project_members
FOR DELETE
USING (
  public.can_manage_project(project_id)
  OR lower(user_email) = public.current_user_email()
);

CREATE POLICY "Shared members can view projects"
ON public.projects
FOR SELECT
USING (public.can_view_project(id));

CREATE POLICY "Project managers can update shared projects"
ON public.projects
FOR UPDATE
USING (public.can_manage_project(id))
WITH CHECK (public.can_manage_project(id));

CREATE POLICY "Project members can view tasks"
ON public.tasks
FOR SELECT
USING (public.can_view_project(project_id));

CREATE POLICY "Project editors can insert tasks"
ON public.tasks
FOR INSERT
WITH CHECK (public.can_edit_project(project_id));

CREATE POLICY "Project editors can update tasks"
ON public.tasks
FOR UPDATE
USING (public.can_edit_project(project_id))
WITH CHECK (public.can_edit_project(project_id));

CREATE POLICY "Project editors can delete tasks"
ON public.tasks
FOR DELETE
USING (public.can_edit_project(project_id));

CREATE POLICY "Project members can view columns"
ON public.columns
FOR SELECT
USING (public.can_view_project(project_id));

CREATE POLICY "Project editors can insert columns"
ON public.columns
FOR INSERT
WITH CHECK (public.can_edit_project(project_id));

CREATE POLICY "Project editors can update columns"
ON public.columns
FOR UPDATE
USING (public.can_edit_project(project_id))
WITH CHECK (public.can_edit_project(project_id));

CREATE POLICY "Project editors can delete columns"
ON public.columns
FOR DELETE
USING (public.can_edit_project(project_id));

CREATE POLICY "Project members can view subtasks"
ON public.subtasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = task_id
      AND public.can_view_project(t.project_id)
  )
);

CREATE POLICY "Project editors can insert subtasks"
ON public.subtasks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = task_id
      AND public.can_edit_project(t.project_id)
  )
);

CREATE POLICY "Project editors can update subtasks"
ON public.subtasks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = task_id
      AND public.can_edit_project(t.project_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = task_id
      AND public.can_edit_project(t.project_id)
  )
);

CREATE POLICY "Project editors can delete subtasks"
ON public.subtasks
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = task_id
      AND public.can_edit_project(t.project_id)
  )
);
