"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { TaskDetailModal, Task } from './TaskDetailModal';
import { ProjectShareModal } from './ProjectShareModal';
import { useProject } from '@/context/ProjectContext';
import { createClient } from '@/lib/supabase/client';

export type KanbanColumn = {
  id: string;
  title: string;
};

const initialColumns: KanbanColumn[] = [
  { id: "por-hacer", title: "Por hacer" },
  { id: "en-progreso", title: "En progreso" },
  { id: "hecho", title: "Hecho" }
];

export type KanbanTask = Task & { columnId: string };

export function KanbanBoard() {
  const { activeProjectId, projects } = useProject();
  const supabase = createClient();
  
  const activeProject = projects.find(p => p.id === activeProjectId);
  const canEditProject = activeProject?.canEdit ?? false;
  
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  
  // Load data when activeProjectId changes from Supabase
  useEffect(() => {
    if (!activeProjectId) return;
    
    let isMounted = true;
    
    const fetchBoardData = async () => {
      const { data: colsData, error: colsErr } = await supabase
        .from('columns')
        .select('*')
        .eq('project_id', activeProjectId)
        .order('created_at', { ascending: true });
        
      const { data: tasksData, error: tasksErr } = await supabase
        .from('tasks')
        .select('*, subtasks(*)')
        .eq('project_id', activeProjectId)
        .order('created_at', { ascending: true });
        
      if (!isMounted) return;

      if (colsData && colsData.length > 0) {
         setColumns(colsData.map(c => ({ id: c.id, title: c.title })));
      } else {
         // Create default columns in DB if board is completely empty 
         const newCols = initialColumns.map(c => ({ id: `${c.id}-${Date.now()}`, title: c.title, project_id: activeProjectId }));
         await supabase.from('columns').insert(newCols);
         setColumns(newCols.map(c => ({ id: c.id, title: c.title })));
      }
      
      if (tasksData) {
         setTasks(tasksData.map(t => ({
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
         setTasks([]);
      }
    };
    
    fetchBoardData();
    
    return () => { isMounted = false; };
  }, [activeProjectId]);

  // Drag state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const [creatingInColumn, setCreatingInColumn] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (!draggedTaskId || !canEditProject) return;

    const isDoneColumn = columnId.includes("hecho");

    setTasks(tasks.map(t => 
      t.id === draggedTaskId ? { ...t, columnId, completed: isDoneColumn } : t
    ));
    setDraggedTaskId(null);
    
    // DB Update
    await supabase.from('tasks').update({ column_id: columnId, completed: isDoneColumn }).eq('id', draggedTaskId);
    window.dispatchEvent(new Event('tasks-updated'));
  };

  const handleDeleteTask = async (id: string, e: React.MouseEvent) => {
    if (!canEditProject) return;
    e.stopPropagation();
    setTasks(tasks.filter(t => t.id !== id));
    await supabase.from('tasks').delete().eq('id', id);
    window.dispatchEvent(new Event('tasks-updated'));
  };

  const handleAddColumn = async () => {
    if (!activeProjectId || !canEditProject) return;
    const newColumnId = `col-${Date.now()}`;
    const newCol = { id: newColumnId, title: "Nueva Columna", project_id: activeProjectId };
    
    setColumns([...columns, { id: newColumnId, title: "Nueva Columna" }]);
    await supabase.from('columns').insert(newCol);
  };

  const handleDeleteColumn = async (colId: string) => {
    if (!canEditProject) return;
    const columnTasks = tasks.filter(t => t.columnId === colId);
    if (columnTasks.length > 0) {
      if (!window.confirm(`Esta columna tiene ${columnTasks.length} tareas. ¿Estás seguro de que deseas eliminarla junto con todas sus tareas?`)) {
        return;
      }
    }
    setColumns(columns.filter(c => c.id !== colId));
    setTasks(tasks.filter(t => t.columnId !== colId));
    
    // Cascade deletes local tasks, but we only need to delete the column in DB
    await supabase.from('columns').delete().eq('id', colId);
    window.dispatchEvent(new Event('tasks-updated'));
  };

  const handleColumnTitleBlur = async (colId: string, newTitle: string) => {
     if (!canEditProject) return;
     await supabase.from('columns').update({ title: newTitle }).eq('id', colId);
  };

  const openAppModal = (task?: KanbanTask, columnId?: string) => {
    if (task) {
      setActiveTask(task);
      setCreatingInColumn(null);
    } else {
      setActiveTask(null);
      setCreatingInColumn(columnId || columns[0].id);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setActiveTask(null);
    setCreatingInColumn(null);
  };

  const handleSaveTask = async (savedTask: Task) => {
    if (!activeProjectId) return;
    const isDoneColumn = creatingInColumn?.includes("hecho") || activeTask?.columnId.includes("hecho");

    if (activeTask) {
      // Editing Mode
      setTasks(tasks.map(t => t.id === savedTask.id ? { ...savedTask, columnId: t.columnId, completed: isDoneColumn ? t.completed : savedTask.completed } : t));
      
      await supabase.from('tasks').update({
         title: savedTask.title,
         description: savedTask.description || null,
         priority: savedTask.priority || null,
         due_date: savedTask.dueDate || null,
         completed: isDoneColumn ? activeTask.completed : savedTask.completed,
         assignee: savedTask.assignee || null
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
      // Creating Mode
      const colId = creatingInColumn || columns[0].id;
      const newTask: KanbanTask = {
        ...savedTask,
        columnId: colId
      };
      setTasks([...tasks, newTask]);
      
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

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">
        {/* Controles del tablero */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-3 shrink-0">
          <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {activeProject ? activeProject.name : 'Tablero'}
                </h2>
                {activeProjectId && (
                  <button 
                    onClick={() => setIsShareModalOpen(true)}
                    className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded-md text-xs font-bold transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">share</span>
                    Compartir
                  </button>
                )}
              </div>
              <div className="flex -space-x-2">
                <div className="h-8 w-8 rounded-full border-2 border-white dark:border-slate-900 bg-blue-500 flex items-center justify-center text-xs text-white">A</div>
                <div className="h-8 w-8 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500 flex items-center justify-center text-xs text-white">B</div>
                <div className="h-8 w-8 rounded-full border-2 border-white dark:border-slate-900 bg-orange-500 flex items-center justify-center text-xs text-white">C</div>
                <div className="h-8 w-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400">+4</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button className="flex items-center gap-1.5 px-3 py-1 rounded text-sm font-semibold bg-white dark:bg-slate-700 shadow-sm">
                  <span className="material-symbols-outlined text-lg">view_kanban</span> Tablero
                </button>
                <Link href="/dashboard" className="flex items-center gap-1.5 px-3 py-1 rounded text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-lg">table_chart</span> Lista
                </Link>
              </div>
              {canEditProject ? (
                <button onClick={() => openAppModal()} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors">
                  <span className="material-symbols-outlined text-lg">add</span> Crear tarea
                </button>
              ) : (
                <div className="text-xs font-medium text-slate-400 px-2 py-1">
                  Acceso de solo lectura
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tablero Kanban */}
        <div className="flex-1 p-4 md:p-8 overflow-x-auto overflow-y-hidden kanban-scroll flex gap-6 items-start">
          
          {columns.map(col => {
            const columnTasks = tasks.filter(t => t.columnId === col.id);
            const isDoneColumn = col.id.includes("hecho");
            
            return (
              <div 
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className="flex-shrink-0 w-80 flex flex-col max-h-full"
              >
                <div className="flex items-center justify-between mb-4 px-2 shrink-0 group/colheader">
                  <div className="flex items-center gap-2">
                    <input 
                      value={col.title}
                       onChange={(e) => {
                         if (!canEditProject) return;
                         setColumns(columns.map(c => c.id === col.id ? { ...c, title: e.target.value } : c));
                       }}
                       onBlur={(e) => handleColumnTitleBlur(col.id, e.target.value)}
                       readOnly={!canEditProject}
                       className="font-bold text-slate-900 dark:text-white bg-transparent border-none focus:ring-0 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                       style={{width: `${Math.max(col.title.length, 5)}ch`}}
                     />
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isDoneColumn ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                      {columnTasks.length}
                    </span>
                  </div>
                   {canEditProject && (
                     <button 
                       onClick={() => handleDeleteColumn(col.id)} 
                       className="text-slate-400 hover:text-red-500 transition-opacity p-1 opacity-0 group-hover/colheader:opacity-100"
                       title="Eliminar columna"
                     >
                       <span className="material-symbols-outlined text-[18px]">delete</span>
                     </button>
                   )}
                </div>
                
                <div className="flex flex-col gap-4 overflow-y-auto pr-2 pb-4 min-h-[150px]">
                  {columnTasks.map(task => (
                    <div 
                      key={task.id}
                       draggable={canEditProject}
                       onDragStart={(e) => {
                         if (canEditProject) {
                           handleDragStart(e, task.id);
                         }
                       }}
                       onClick={() => {
                         if (canEditProject) {
                           openAppModal(task, col.id);
                         }
                       }}
                       className={`bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 group transition-all ${canEditProject ? 'hover:border-primary cursor-pointer' : 'cursor-default'} ${draggedTaskId === task.id ? 'opacity-50 border-dashed border-primary pb-10' : ''} ${isDoneColumn ? 'opacity-75' : ''}`}
                     >
                      <div className="flex justify-between items-start mb-2 group/header">
                        {isDoneColumn ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">General</span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">General</span>
                        )}
                        <div className="flex items-center gap-1">
                           {canEditProject && (
                             <span 
                               onClick={(e) => handleDeleteTask(task.id, e)}
                               className="material-symbols-outlined text-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-slate-300 hover:text-red-500"
                               title="Eliminar tarea"
                             >
                               delete
                             </span>
                           )}
                           <span className={`material-symbols-outlined text-lg ${isDoneColumn ? 'text-emerald-500' : 'cursor-grab text-slate-300 group-hover:text-slate-400'}`}>
                             {isDoneColumn ? 'check_circle' : 'drag_indicator'}
                           </span>
                        </div>
                      </div>
                      <h4 className={`font-semibold text-slate-900 dark:text-white mb-2 leading-snug ${isDoneColumn ? 'line-through decoration-slate-300' : ''}`}>
                        {task.title}
                      </h4>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                          {task.dueDate ? (
                            <>
                              <span className="material-symbols-outlined text-sm">schedule</span>
                              <span className="text-xs font-medium">{task.dueDate}</span>
                            </>
                          ) : (
                            isDoneColumn && (
                               <>
                                  <span className="material-symbols-outlined text-sm">history</span>
                                  <span className="text-xs font-medium">Finalizado</span>
                               </>
                            )
                          )}
                        </div>
                        {task.priority && !isDoneColumn && (
                          <div className={`flex items-center gap-1 text-[11px] font-medium ${task.priority === 'Alta' ? 'text-red-500' : 'text-orange-500'}`}>
                             <span className="material-symbols-outlined text-[14px]">flag</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Botón Añadir en Columna (Sólo activo en columnas no completadas) */}
                   {!isDoneColumn && canEditProject && (
                     <button 
                       onClick={() => openAppModal(undefined, col.id)}
                       className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 font-medium"
                    >
                      <span className="material-symbols-outlined text-xl">add</span> Añadir tarjeta
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Añadir nueva columna */}
           {canEditProject && (
             <div className="flex-shrink-0 w-80">
               <button onClick={handleAddColumn} className="w-full py-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 font-bold border-2 border-transparent hover:border-primary/20">
                 <span className="material-symbols-outlined">add_box</span> Añadir otra columna
               </button>
             </div>
           )}
        </div>
      </div>

      {/* Render Modal Contextually */}
      {isModalOpen && columns.length > 0 && (
        <TaskDetailModal 
          key={activeTask ? activeTask.id : "new-" + (creatingInColumn || "default")}
          task={activeTask}
          onClose={closeModal}
          onSave={handleSaveTask}
          columns={columns}
          initialColumnId={creatingInColumn || columns[0].id}
        />
      )}

      {isShareModalOpen && activeProjectId && (
        <ProjectShareModal 
          projectId={activeProjectId} 
          onClose={() => setIsShareModalOpen(false)} 
        />
      )}
    </>
  );
}
