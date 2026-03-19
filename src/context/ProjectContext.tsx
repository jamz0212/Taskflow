"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export type Project = {
  id: string;
  name: string;
  color: string;
};

interface ProjectContextType {
  projects: Project[];
  activeProjectId: string | null;
  isLoading: boolean;
  addProject: (name: string, color?: string) => void;
  setActiveProject: (id: string) => void;
  deleteProject: (id: string) => void;
  renameProject: (id: string, newName: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error fetching projects:", error);
      } else if (data && data.length > 0) {
        // Parse raw DB data (it has user_id, created_at) into our simple Project model
        const mappedProjects = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          color: p.color
        }));
        setProjects(mappedProjects);
        setActiveProjectId(mappedProjects[0].id);
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
        
        setProjects([{ id: defaultId, name: defaultDbProject.name, color: defaultDbProject.color }]);
        setActiveProjectId(defaultId);
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
    };
    
    // Optimistic Update
    setProjects((prev) => [...prev, newProject]);
    setActiveProjectId(newProject.id);
    
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
  };

  const deleteProject = async (id: string) => {
    // Optimistic Update
    setProjects((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      if (activeProjectId === id) {
        setActiveProjectId(remaining.length > 0 ? remaining[0].id : null);
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
