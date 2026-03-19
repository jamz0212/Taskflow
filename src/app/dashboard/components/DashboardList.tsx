"use client";

import React, { useState, useEffect } from 'react';
import { TaskDetailModal, type Task } from './TaskDetailModal';
import { useProject } from '@/context/ProjectContext';
import { createClient } from '@/lib/supabase/client';

export function DashboardList() {
  const { activeProjectId, projects } = useProject();
  const supabase = createClient();
  
  // Find the active project to display its name
  const activeProject = projects.find(p => p.id === activeProjectId);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<{id: string, title: string}[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Date calculation for "Today"
  const getTodayString = () => {
    const today = new Date();
    // Adjust for timezone offset to get local YYYY-MM-DD
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - (offset*60*1000));
    return localDate.toISOString().split('T')[0];
  };
  
  const todayStr = getTodayString();

  // Load data when activeProjectId changes
  useEffect(() => {
    if (!activeProjectId) return;
    setIsLoaded(false);
    let isMounted = true;
    
    const fetchTodayData = async () => {
      const { data: colsData } = await supabase
        .from('columns')
        .select('*')
        .eq('project_id', activeProjectId)
        .order('created_at', { ascending: true });
        
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*, subtasks(*)')
        .eq('project_id', activeProjectId);
        
      if (!isMounted) return;

      if (colsData) {
        setColumns(colsData.map(c => ({ id: c.id, title: c.title })));
      }
      if (tasksData) {
        setAllTasks(tasksData.map(t => ({
            id: t.id,
            columnId: t.column_id,
            title: t.title,
            description: t.description || undefined,
            priority: t.priority as any || undefined,
            dueDate: t.due_date || undefined,
            completed: t.completed,
            assignee: t.assignee || undefined,
            subtasks: t.subtasks ? t.subtasks.map((st: any) => ({
                id: st.id,
                title: st.title,
                completed: st.completed
            })) : []
         })));
      } else {
        setAllTasks([]);
      }
      setIsLoaded(true);
    };
    
    fetchTodayData();
    return () => { isMounted = false; };
  }, [activeProjectId]);

  // Filter tasks for Today
  const tasks = allTasks.filter(t => t.dueDate === todayStr);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const openAppModal = (task?: Task) => {
    setActiveTask(task || null); // null means "Create mode"
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setActiveTask(null);
  };

  const handleSaveTask = async (savedTask: Task) => {
    if (!activeProjectId) return;
    if (activeTask) {
      setAllTasks(allTasks.map(t => t.id === savedTask.id ? savedTask : t));
      await supabase.from('tasks').update({
         title: savedTask.title,
         description: savedTask.description || null,
         priority: savedTask.priority || null,
         due_date: savedTask.dueDate || null,
         completed: savedTask.completed,
         assignee: savedTask.assignee || null,
         column_id: savedTask.columnId
      }).eq('id', savedTask.id);
      
      // Sync subtasks
      await supabase.from('subtasks').delete().eq('task_id', savedTask.id);
      if (savedTask.subtasks && savedTask.subtasks.length > 0) {
          const subtasksToInsert = savedTask.subtasks.map(st => ({
              id: st.id,
              task_id: savedTask.id,
              title: st.title,
              completed: st.completed
          }));
          await supabase.from('subtasks').insert(subtasksToInsert);
      }
    } else {
      // Ensure it has a column if none selected (it should be handled by modal but fallback)
      const colId = savedTask.columnId || (columns[0]?.id || `default-empty-col`);
      const newTask = { ...savedTask, columnId: colId };
      setAllTasks([...allTasks, newTask]);
      
      await supabase.from('tasks').insert({
         id: newTask.id,
         project_id: activeProjectId,
         column_id: colId,
         title: newTask.title,
         description: newTask.description || null,
         priority: newTask.priority || null,
         due_date: newTask.dueDate || null,
         completed: newTask.completed,
         assignee: newTask.assignee || null
      });
      
      // Insert subtasks if any
      if (newTask.subtasks && newTask.subtasks.length > 0) {
          const subtasksToInsert = newTask.subtasks.map(st => ({
              id: st.id,
              task_id: newTask.id,
              title: st.title,
              completed: st.completed
          }));
          await supabase.from('subtasks').insert(subtasksToInsert);
      }
    }
    window.dispatchEvent(new Event('tasks-updated'));
  };

  const toggleTaskCompletion = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const task = allTasks.find(t => t.id === id);
    if (!task) return;
    setAllTasks(allTasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    await supabase.from('tasks').update({ completed: !task.completed }).eq('id', id);
    window.dispatchEvent(new Event('tasks-updated'));
  };

  const handleDeleteTask = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAllTasks(allTasks.filter(t => t.id !== id));
    await supabase.from('tasks').delete().eq('id', id);
    window.dispatchEvent(new Event('tasks-updated'));
  };

  if (!isLoaded) {
    return (
       <div className="max-w-4xl mx-auto w-full px-8 py-10 relative flex justify-center">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
       </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto w-full px-8 py-10 relative">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
          {activeProject ? activeProject.name : 'Hoy'}
        </h2>
        <div className="flex flex-col gap-1">
          {tasks.map(task => (
            <div 
              key={task.id} 
              onClick={() => openAppModal(task)}
              className="group flex items-center gap-4 py-3 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 px-2 rounded-lg transition-colors cursor-pointer"
            >
              <div className="flex-shrink-0 pt-0.5" onClick={(e) => toggleTaskCompletion(task.id, e)}>
                <input 
                  checked={task.completed}
                  readOnly
                  className="task-checkbox size-5 rounded-full border-2 border-slate-300 dark:border-slate-600 text-primary focus:ring-0 focus:ring-offset-0 transition-all cursor-pointer" 
                  type="checkbox" 
                />
              </div>
              
              <div className="flex flex-col grow">
                <p className={`text-sm font-medium ${task.completed ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-900 dark:text-slate-100'}`}>
                  {task.title}
                </p>
                
                <div className="flex items-center gap-3 mt-1">
                  {task.completed ? (
                    <div className="flex items-center gap-1 text-[11px] font-medium text-slate-300">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      <span>Completado</span>
                    </div>
                  ) : (
                    <>
                      {task.priority && (
                        <div className={`flex items-center gap-1 text-[11px] font-medium ${task.priority === 'Alta' ? 'text-red-500' : task.priority === 'Media' ? 'text-orange-500' : 'text-slate-500'}`}>
                          <span className="material-symbols-outlined text-[14px]">flag</span>
                          <span>Prioridad {task.priority}</span>
                        </div>
                      )}
                      {task.dueDate && (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          <span>{task.dueDate}</span>
                        </div>
                      )}
                      {task.project && (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-primary/70">
                          <span className="material-symbols-outlined text-[14px]">folder</span>
                          <span>{task.project}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); openAppModal(task); }} 
                  className="p-1.5 text-slate-400 hover:text-primary rounded-md"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                </button>
                <button 
                  onClick={(e) => handleDeleteTask(task.id, e)} 
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-md"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            </div>
          ))}

          {/* Add Task Input/Button */}
          <button 
            onClick={() => openAppModal()}
            className="mt-6 flex items-center gap-3 px-2 py-2 text-slate-400 hover:text-primary transition-colors group w-full text-left"
          >
            <span className="material-symbols-outlined group-hover:bg-primary/10 rounded-full p-1 transition-colors">add</span>
            <span className="text-sm font-semibold">Añadir tarea</span>
          </button>
          
        </div>

        {/* Empty State Illustration (Decorative) */}
        <div className="mt-auto pt-24 pb-8 flex justify-center opacity-40">
          <div className="text-center">
            <div className="mx-auto size-24 bg-gradient-to-tr from-primary/10 to-primary/5 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-5xl text-primary/40">auto_awesome</span>
            </div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Mantente Productivo</p>
          </div>
        </div>
      </div>

      {/* Render Modal Contextually */}
      {isModalOpen && (
        <TaskDetailModal 
          key={activeTask ? activeTask.id : "new"}
          task={activeTask}
          onClose={closeModal}
          onSave={handleSaveTask}
          columns={columns}
          initialColumnId={columns[0]?.id}
        />
      )}
    </>
  );
}
