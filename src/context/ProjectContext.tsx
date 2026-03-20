"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export type Project = {
  id: string;
  name: string;
  color: string;
  user_id?: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  isOwner: boolean;
  canEdit: boolean;
  canManageProject: boolean;
  canManageMembers: boolean;
};

interface ProjectContextType {
  projects: Project[];
  activeProjectId: string | null;
  isLoading: boolean;
  currentUserEmail: string | null;
  currentUserId: string | null;
  addProject: (name: string, color?: string) => void;
  setActiveProject: (id: string) => void;
  deleteProject: (id: string) => void;
  renameProject: (id: string, newName: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);
const ACTIVE_PROJECT_STORAGE_KEY = 'taskflow:active-project-id';

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const supabase = createClient();

  const getStoredActiveProjectId = () => {
    if (typeof window === 'undefined') return null;

    try {
      return window.localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY);
    } catch {
      return null;
    }
  };

  const persistActiveProjectId = (projectId: string | null) => {
    if (typeof window === 'undefined') return;

    try {
      if (projectId) {
        window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, projectId);
      } else {
        window.localStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
      }
    } catch {
      // Ignore storage failures.
    }
  };

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      setCurrentUserId(user.id);
      setCurrentUserEmail(user.email || null);

      const normalizedEmail = (user.email || '').toLowerCase();

      const { data: projectRows, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: true });

      const { data: membershipRows, error: membershipError } = await supabase
        .from('project_members')
        .select('project_id, role, user_email')
        .eq('user_email', normalizedEmail);

      if (error) {
        console.error("Error fetching projects:", error);
        setIsLoading(false);
        return;
      }

      if (membershipError) {
        console.error("Error fetching memberships:", membershipError);
      }

      if (projectRows && projectRows.length > 0) {
        const membershipByProjectId = new Map(
          (membershipRows || []).map((membership) => [membership.project_id, membership])
        );

        const mappedProjects = projectRows.map((projectRow) => {
          const membership = membershipByProjectId.get(projectRow.id);
          const isOwner = projectRow.user_id === user.id;
          const role = isOwner ? 'owner' : membership?.role || 'viewer';

          return {
            id: projectRow.id,
            name: projectRow.name,
            color: projectRow.color,
            user_id: projectRow.user_id,
            role,
            isOwner,
            canEdit: role === 'owner' || role === 'admin' || role === 'editor',
            canManageProject: role === 'owner' || role === 'admin',
            canManageMembers: role === 'owner' || role === 'admin',
          };
        });

        setProjects(mappedProjects);
        const storedActiveProjectId = getStoredActiveProjectId();
        const nextActiveProjectId = mappedProjects.some((project) => project.id === storedActiveProjectId)
          ? storedActiveProjectId
          : mappedProjects[0].id;

        setActiveProjectId(nextActiveProjectId);
        persistActiveProjectId(nextActiveProjectId);
      } else {
        // Create default project on first run
        const defaultId = `proj-${Date.now()}`;
        const defaultDbProject = {
          id: defaultId,
          user_id: user.id,
          name: "Proyectos de Trabajo",
          color: "bg-blue-500",
        };
        await supabase.from('projects').insert(defaultDbProject);
        
        setProjects([{ 
          id: defaultId, 
          name: defaultDbProject.name, 
          color: defaultDbProject.color, 
          user_id: user.id, 
          role: 'owner',
          isOwner: true,
          canEdit: true,
          canManageProject: true,
          canManageMembers: true,
        }]);
        setActiveProjectId(defaultId);
        persistActiveProjectId(defaultId);
      }
      setIsLoading(false);
    };

    fetchProjects();
  }, []);

  const addProject = async (name: string, color: string = "bg-primary") => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newProject = {
      id: `proj-${Date.now()}`,
      name,
      color,
      user_id: user.id,
      role: 'owner' as const,
      isOwner: true,
      canEdit: true,
      canManageProject: true,
      canManageMembers: true,
    };
    
    // Optimistic Update
    setProjects((prev) => [...prev, newProject]);
    setActiveProjectId(newProject.id);
    persistActiveProjectId(newProject.id);
    
    // Persist
    await supabase.from('projects').insert({
      id: newProject.id,
      user_id: user.id,
      name: newProject.name,
      color: newProject.color
    });
  };

  const setActiveProject = (id: string) => {
    setActiveProjectId(id);
    persistActiveProjectId(id);
  };

  const deleteProject = async (id: string) => {
    // Optimistic Update
    setProjects((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      if (activeProjectId === id) {
        const nextProjectId = remaining.length > 0 ? remaining[0].id : null;
        setActiveProjectId(nextProjectId);
        persistActiveProjectId(nextProjectId);
      }
      return remaining;
    });
    
    // Persist
    await supabase.from('projects').delete().eq('id', id);
  };

  const renameProject = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    
    // Optimistic Update
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name: newName } : p)));
    
    // Persist
    await supabase.from('projects').update({ name: newName }).eq('id', id);
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProjectId,
        isLoading,
        currentUserEmail,
        currentUserId,
        addProject,
        setActiveProject,
        deleteProject,
        renameProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
};
