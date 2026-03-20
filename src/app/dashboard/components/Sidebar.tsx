"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signout } from '@/actions/auth';
import { useProject } from '@/context/ProjectContext';

const COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-purple-500', 'bg-indigo-500'];

export function Sidebar() {
  const pathname = usePathname();
  const { projects, activeProjectId, setActiveProject, addProject, renameProject } = useProject();
  
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [todayTasksCount, setTodayTasksCount] = useState(0);
  
  // Renaming state
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState("");

  useEffect(() => {
    const updateTodayCount = () => {
      if (!activeProjectId) {
        setTodayTasksCount(0);
        return;
      }
      
      const savedTasks = localStorage.getItem(`tasks-${activeProjectId}`);
      if (savedTasks) {
        try {
          const tasks = JSON.parse(savedTasks);
          const today = new Date();
          const offset = today.getTimezoneOffset();
          const localDate = new Date(today.getTime() - (offset*60*1000));
          const todayStr = localDate.toISOString().split('T')[0];
          
          const count = tasks.filter((t: any) => t.dueDate === todayStr).length;
          setTodayTasksCount(count);
        } catch (e) {
          console.error("Error parsing tasks for sidebar count", e);
        }
      } else {
        setTodayTasksCount(0);
      }
    };

    updateTodayCount();
    
    window.addEventListener('tasks-updated', updateTodayCount);
    window.addEventListener('storage', updateTodayCount);
    
    return () => {
      window.removeEventListener('tasks-updated', updateTodayCount);
      window.removeEventListener('storage', updateTodayCount);
    };
  }, [activeProjectId]);

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    
    // Pick a random color
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    addProject(newProjectName.trim(), randomColor);
    
    setNewProjectName("");
    setIsAddingProject(false);
  };

  const handleRenameSubmit = (projectId: string, e: React.FormEvent | React.FocusEvent) => {
    e.preventDefault();
    if (editingProjectName.trim()) {
      renameProject(projectId, editingProjectName.trim());
    }
    setEditingProjectId(null);
  };

  return (
    <aside className="w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
      <div className="p-6 flex flex-col h-full">
        {/* User Profile/Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-primary/10 rounded-lg p-2 text-primary">
            <span className="material-symbols-outlined text-2xl">task_alt</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-slate-900 dark:text-slate-100 text-base font-bold leading-tight">Task Master</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-normal">Espacio Personal</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1 grow">
          <Link href="/dashboard" className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${pathname === '/dashboard' ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
            <span className="material-symbols-outlined" style={pathname === '/dashboard' ? { fontVariationSettings: "'FILL' 1" } : {}}>today</span>
            <span className={`text-sm ${pathname === '/dashboard' ? 'font-semibold' : 'font-medium'}`}>Hoy</span>
            <span className="ml-auto text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-400">{todayTasksCount}</span>
          </Link>
          <Link href="/dashboard/calendar" className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${pathname.startsWith('/dashboard/calendar') ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
            <span className="material-symbols-outlined" style={pathname.startsWith('/dashboard/calendar') ? { fontVariationSettings: "'FILL' 1" } : {}}>calendar_month</span>
            <span className={`text-sm ${pathname.startsWith('/dashboard/calendar') ? 'font-semibold' : 'font-medium'}`}>Calendario</span>
          </Link>

          {/* Projects Section */}
          <div className="mt-8 mb-2 px-3 flex items-center justify-between group">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Proyectos</p>
            <button 
              onClick={() => setIsAddingProject(true)}
              className="text-slate-400 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
              title="Añadir Proyecto"
            >
              <span className="material-symbols-outlined text-sm">add</span>
            </button>
          </div>

          <div className="space-y-1">
            {projects.map((project) => {
              const isActive = activeProjectId === project.id && pathname.includes('/kanban');
              return (
                <div key={project.id} className="relative group/project">
                  {editingProjectId === project.id ? (
                    <form 
                      onSubmit={(e) => handleRenameSubmit(project.id, e)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors bg-slate-100 dark:bg-slate-800`}
                    >
                      <span className={`size-2 rounded-full ${project.color}`}></span>
                      <input 
                        type="text"
                        value={editingProjectName}
                        onChange={(e) => setEditingProjectName(e.target.value)}
                        onBlur={(e) => handleRenameSubmit(project.id, e)}
                        autoFocus
                        className="w-full text-sm bg-transparent border-none p-0 focus:ring-0 text-primary font-semibold"
                      />
                    </form>
                  ) : (
                    <Link 
                      href="/dashboard/kanban" 
                      onClick={() => setActiveProject(project.id)}
                      onDoubleClick={() => {
                        if (!project.canManageProject) {
                          return;
                        }

                        setEditingProjectId(project.id);
                        setEditingProjectName(project.name);
                      }}
                      title={project.canManageProject ? "Doble clic para renombrar" : "No tienes permisos para renombrar"}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-slate-100 dark:bg-slate-800 text-primary' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'}`}
                    >
                      <span className={`size-2 rounded-full ${project.color}`}></span>
                      <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'} truncate`}>{project.name}</span>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Project Form inline */}
          {isAddingProject && (
            <form onSubmit={handleAddProject} className="mt-2 px-3 flex items-center gap-2">
              <span className="size-2 rounded-full bg-slate-300 shrink-0"></span>
              <input 
                type="text" 
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Nombre del proyecto..."
                className="w-full text-sm bg-transparent border-b border-primary focus:outline-none focus:border-primary/80 py-1 text-slate-700 dark:text-slate-300 placeholder-slate-400 font-medium"
                autoFocus
                onBlur={() => {
                  if (!newProjectName) setIsAddingProject(false);
                }}
              />
            </form>
          )}
        </nav>

        {/* Storage/Settings/Logout */}
        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1">
          <Link
            href="/dashboard/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${pathname.startsWith('/dashboard/settings') ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
          >
            <span className="material-symbols-outlined text-[20px]" style={pathname.startsWith('/dashboard/settings') ? { fontVariationSettings: "'FILL' 1" } : {}}>settings</span>
            <span className="text-sm font-medium">Configuración</span>
          </Link>
          <form action={signout}>
            <button type="submit" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-red-500">
              <span className="material-symbols-outlined text-red-500">logout</span>
              <span className="text-sm font-medium">Cerrar sesión</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
