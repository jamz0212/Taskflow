"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useProject } from '@/context/ProjectContext';

type ProjectMemberRole = 'admin' | 'editor' | 'viewer';

type ProjectMember = {
  id: string;
  user_email: string;
  role: ProjectMemberRole;
};

interface ProjectShareModalProps {
  projectId: string;
  onClose: () => void;
}

const ROLE_OPTIONS: Array<{ value: ProjectMemberRole; label: string; hint: string }> = [
  { value: 'viewer', label: 'Solo ver', hint: 'Puede ver el proyecto, pero no editar.' },
  { value: 'editor', label: 'Editor', hint: 'Puede crear y editar tareas y columnas.' },
  { value: 'admin', label: 'Admin', hint: 'Puede invitar, cambiar roles y editar el proyecto.' },
];

const ROLE_LABELS: Record<ProjectMemberRole, string> = {
  viewer: 'Solo ver',
  editor: 'Editor',
  admin: 'Admin',
};

export function ProjectShareModal({ projectId, onClose }: ProjectShareModalProps) {
  const { currentUserEmail, projects } = useProject();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ProjectMemberRole>('editor');
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const supabase = createClient();
  const project = projects.find((item) => item.id === projectId);
  const canManageMembers = project?.canManageMembers ?? false;

  const visibleMembers = useMemo(() => {
    if (!project?.isOwner || !currentUserEmail) {
      return members;
    }

    return members.filter((member) => member.user_email !== currentUserEmail.toLowerCase());
  }, [currentUserEmail, members, project?.isOwner]);

  const fetchMembers = async () => {
    setIsLoading(true);
    setError('');

    const { data, error: fetchError } = await supabase
      .from('project_members')
      .select('id, user_email, role')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error(fetchError);
      setError('No pude cargar los miembros del proyecto. Revisa que hayas ejecutado el SQL de colaboracion completo en Supabase.');
      setMembers([]);
    } else {
      setMembers((data || []) as ProjectMember[]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !canManageMembers) {
      return;
    }

    setIsLoading(true);
    setError('');

    if (normalizedEmail === currentUserEmail?.toLowerCase()) {
      setError('No puedes agregarte a ti mismo.');
      setIsLoading(false);
      return;
    }

    if (members.some((member) => member.user_email === normalizedEmail)) {
      setError('Ese correo ya esta en el proyecto.');
      setIsLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('project_members').insert({
      project_id: projectId,
      user_email: normalizedEmail,
      role,
    });

    if (insertError) {
      console.error(insertError);
      setError('No pude invitar a esa persona.');
    } else {
      setEmail('');
      setRole('editor');
      await fetchMembers();
    }

    setIsLoading(false);
  };

  const handleRoleChange = async (memberEmail: string, nextRole: ProjectMemberRole) => {
    if (!canManageMembers || memberEmail === currentUserEmail?.toLowerCase()) {
      return;
    }

    setIsLoading(true);
    setError('');

    const { error: updateError } = await supabase
      .from('project_members')
      .update({ role: nextRole })
      .eq('project_id', projectId)
      .eq('user_email', memberEmail);

    if (updateError) {
      console.error(updateError);
      setError('No pude cambiar el rol.');
    } else {
      setMembers((prev) =>
        prev.map((member) =>
          member.user_email === memberEmail ? { ...member, role: nextRole } : member
        )
      );
    }

    setIsLoading(false);
  };

  const handleRemoveMember = async (memberEmail: string) => {
    const normalizedCurrentUserEmail = currentUserEmail?.toLowerCase();
    const canRemove = canManageMembers || memberEmail === normalizedCurrentUserEmail;

    if (!canRemove) {
      return;
    }

    setIsLoading(true);
    setError('');

    const { error: deleteError } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_email', memberEmail);

    if (deleteError) {
      console.error(deleteError);
      setError('No pude quitar a esa persona del proyecto.');
    } else if (memberEmail === normalizedCurrentUserEmail) {
      onClose();
      window.location.reload();
      return;
    } else {
      setMembers((prev) => prev.filter((member) => member.user_email !== memberEmail));
    }

    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Compartir &quot;{project?.name}&quot;</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Define quien solo mira, quien edita y quien administra.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          {canManageMembers ? (
            <form onSubmit={handleAddMember} className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-800/40">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  Invitar colaborador
                </label>
                <div className="grid gap-2 md:grid-cols-[1fr_160px_auto]">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as ProjectMemberRole)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={isLoading || !email.trim()}
                    className="bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    Invitar
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                {ROLE_OPTIONS.find((option) => option.value === role)?.hint}
              </p>
            </form>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-800/40 text-sm text-slate-500 dark:text-slate-400">
              Solo el propietario o un admin puede invitar personas y cambiar permisos.
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Miembros del proyecto</h3>
              <span className="text-xs text-slate-400">{visibleMembers.length + 1} personas</span>
            </div>

            {isLoading && members.length === 0 ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm uppercase">
                      {project?.name.charAt(0) || 'P'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Propietario</p>
                      <p className="text-xs text-slate-500">Control total del proyecto</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wide text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    Owner
                  </span>
                </div>

                {visibleMembers.map((member) => {
                  const isCurrentUser = member.user_email === currentUserEmail?.toLowerCase();

                  return (
                    <div key={member.id} className="flex items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm uppercase shrink-0">
                          {member.user_email.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {isCurrentUser ? 'Tu' : member.user_email}
                          </p>
                          <p className="text-xs text-slate-500">{ROLE_LABELS[member.role]}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {canManageMembers && !isCurrentUser ? (
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.user_email, e.target.value as ProjectMemberRole)}
                            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                          >
                            {ROLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs font-medium text-slate-500 px-2 py-1">
                            {ROLE_LABELS[member.role]}
                          </span>
                        )}

                        {(canManageMembers || isCurrentUser) && (
                          <button
                            onClick={() => handleRemoveMember(member.user_email)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            title={isCurrentUser ? 'Salir del proyecto' : 'Quitar acceso'}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {isCurrentUser ? 'logout' : 'person_remove'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
