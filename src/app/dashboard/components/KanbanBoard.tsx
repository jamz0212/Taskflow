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
  order: number;
};

const initialColumns: KanbanColumn[] = [
  { id: "por-hacer", title: "Por hacer", order: 0 },
  { id: "en-progreso", title: "En progreso", order: 1 },
  { id: "hecho", title: "Hecho", order: 2 }
];

export type KanbanTask = Task & { columnId: string };

type HeaderMember = {
  email: string;
  name: string;
  initials: string;
  color: string;
};

export function KanbanBoard() {
  const { activeProjectId, projects, renameProject, currentUserEmail } = useProject();
  const supabase = createClient();
  
  const activeProject = projects.find(p => p.id === activeProjectId);
  const canEditProject = activeProject?.canEdit ?? false;
  
  const [projectName, setProjectName] = useState(activeProject?.name || 'Tablero');
  const [projectMembers, setProjectMembers] = useState<HeaderMember[]>([]);
  
  // Sync local state when active project changes
  useEffect(() => {
    if (activeProject) {
      setProjectName(activeProject.name);
    }
  }, [activeProject?.id, activeProject?.name]);

  useEffect(() => {
    if (!activeProjectId) {
      setProjectMembers([]);
      return;
    }

    let isMounted = true;

    const fetchProjectMembers = async () => {
      const colors = [
        'bg-blue-500',
        'bg-emerald-500',
        'bg-orange-500',
        'bg-purple-500',
        'bg-pink-500',
        'bg-rose-500',
      ];

      const { data: memberRows } = await supabase
        .from('project_members')
        .select('user_email')
        .eq('project_id', activeProjectId);

      const { data: projectRow } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', activeProjectId)
        .single();

      let ownerEmail = '';
      if (projectRow?.user_id) {
        const { data: ownerData } = await supabase.rpc('get_user_email_by_id', { user_id: projectRow.user_id }).single();
        ownerEmail = typeof ownerData === 'string' ? ownerData.toLowerCase() : '';
      }

      const memberEmails = new Set(
        (memberRows || []).map((member) => String(member.user_email).toLowerCase())
      );

      if (ownerEmail) {
        memberEmails.add(ownerEmail);
      }

      const normalizedCurrentUserEmail = currentUserEmail?.toLowerCase();
      if (normalizedCurrentUserEmail && activeProject?.isOwner) {
        memberEmails.add(normalizedCurrentUserEmail);
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('email, full_name');

      const profileMap = new Map(
        (profiles || []).map((profile) => [
          String(profile.email || '').toLowerCase(),
          String(profile.full_name || '').trim(),
        ])
      );

      const mappedMembers = Array.from(memberEmails)
        .filter(Boolean)
        .map((email, index) => {
          const fullName = profileMap.get(email) || email.split('@')[0];
          const displayName = email === normalizedCurrentUserEmail ? `${fullName} (Tú)` : fullName;
          const initials = fullName
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase() || email.slice(0, 2).toUpperCase();

          return {
            email,
            name: displayName,
            initials,
            color: colors[index % colors.length],
          };
        });

      if (isMounted) {
        setProjectMembers(mappedMembers);
      }
    };

    void fetchProjectMembers();

    return () => {
      isMounted = false;
    };
  }, [activeProject?.isOwner, activeProjectId, currentUserEmail, supabase]);
  
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  
  // Load data when activeProjectId changes from Supabase
  useEffect(() => {
    if (!activeProjectId) return;
    
    let isMounted = true;
    
    const fetchBoardData = async () => {
      const { data: colsData } = await supabase
        .from('columns')
        .select('*')
        .eq('project_id', activeProjectId)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });
        
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*, subtasks(*)')
        .eq('project_id', activeProjectId)
        .order('created_at', { ascending: true });
        
      if (!isMounted) return;

      if (colsData && colsData.length > 0) {
         setColumns(colsData.map((c, index) => ({
           id: c.id,
           title: c.title,
           order: typeof c.order_index === 'number' ? c.order_index : index,
         })));
       } else {
          // Create default columns in DB if board is completely empty 
         const newCols = initialColumns.map((c, index) => ({
           id: `${c.id}-${Date.now()}-${index}`,
           title: c.title,
           project_id: activeProjectId,
           order_index: c.order,
         }));
         await supabase.from('columns').insert(newCols);
         setColumns(newCols.map(c => ({ id: c.id, title: c.title, order: c.order_index })));
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
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const [creatingInColumn, setCreatingInColumn] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleColumnDragStart = (e: React.DragEvent, columnId: string) => {
    if (!canEditProject) return;
    setDraggedColumnId(columnId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const persistColumnOrder = async (nextColumns: KanbanColumn[]) => {
    await Promise.all(
      nextColumns.map((column, index) =>
        supabase.from('columns').update({ order_index: index }).eq('id', column.id)
      )
    );
  };

  const handleColumnDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();

    if (!canEditProject || !draggedColumnId || draggedColumnId === targetColumnId) {
      setDraggedColumnId(null);
      return;
    }

    const currentIndex = columns.findIndex((column) => column.id === draggedColumnId);
    const targetIndex = columns.findIndex((column) => column.id === targetColumnId);

    if (currentIndex === -1 || targetIndex === -1) {
      setDraggedColumnId(null);
      return;
    }

    const nextColumns = [...columns];
    const [movedColumn] = nextColumns.splice(currentIndex, 1);
    nextColumns.splice(targetIndex, 0, movedColumn);

    const reorderedColumns = nextColumns.map((column, index) => ({
      ...column,
      order: index,
    }));

    setColumns(reorderedColumns);
    setDraggedColumnId(null);
    await persistColumnOrder(reorderedColumns);
  };

  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (!draggedTaskId || !canEditProject) return;

    setTasks(tasks.map(t => 
      t.id === draggedTaskId ? { ...t, columnId } : t
    ));
    setDraggedTaskId(null);
    
    // DB Update
    await supabase.from('tasks').update({ column_id: columnId }).eq('id', draggedTaskId);
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
    const newCol = {
      id: newColumnId,
      title: "Nueva Columna",
      project_id: activeProjectId,
      order_index: columns.length,
    };
    
    setColumns([...columns, { id: newColumnId, title: "Nueva Columna", order: columns.length }]);
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

  const handleToggleCompletion = async (taskId: string, currentCompleted: boolean, e: React.MouseEvent) => {
    if (!canEditProject) return;
    e.stopPropagation();
    
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, completed: !currentCompleted } : t
    ));
    
    await supabase.from('tasks').update({ completed: !currentCompleted }).eq('id', taskId);
    window.dispatchEvent(new Event('tasks-updated'));
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

    if (activeTask) {
      // Editing Mode
      setTasks(tasks.map(t => t.id === savedTask.id ? { ...savedTask, columnId: t.columnId } : t));
      
      await supabase.from('tasks').update({
         title: savedTask.title,
         description: savedTask.description || null,
         priority: savedTask.priority || null,
         due_date: savedTask.dueDate || null,
         completed: savedTask.completed,
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
                {activeProject?.canManageProject ? (
                  <input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onBlur={async (e) => {
                       const newName = e.target.value.trim();
                       if (newName && newName !== activeProject.name && activeProject) {
                         // Update in context (optimistic + db)
                         renameProject(activeProject.id, newName);
                       } else if (!newName) {
                         // Revert if empty
                         setProjectName(activeProject.name);
                       }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    className="text-lg font-bold text-slate-900 dark:text-white bg-transparent border-none focus:ring-0 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors w-fit max-w-[250px] truncate"
                    title="Editar nombre del proyecto"
                  />
                ) : (
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {activeProject ? activeProject.name : 'Tablero'}
                  </h2>
                )}
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
                {projectMembers.length > 0 ? (
                  projectMembers.slice(0, 5).map((member) => (
                    <div
                      key={member.email}
                      title={member.name}
                      className={`h-8 w-8 rounded-full border-2 border-white dark:border-slate-900 ${member.color} flex items-center justify-center text-xs text-white font-bold uppercase`}
                    >
                      {member.initials}
                    </div>
                  ))
                ) : (
                  <div className="h-8 w-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400">
                    -
                  </div>
                )}
                {projectMembers.length > 5 && (
                  <div className="h-8 w-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400">
                    +{projectMembers.length - 5}
                  </div>
                )}
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
            const columnTasks = tasks.filter(t => t.columnId === col.id)
              .sort((a, b) => {
                // Sort by completed status: completed tasks go to the bottom
                if (a.completed === b.completed) return 0;
                return a.completed ? 1 : -1;
              });
            
            return (
              <div 
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className="flex-shrink-0 w-80 flex flex-col max-h-full"
              >
                <div
                  draggable={canEditProject}
                  onDragStart={(e) => handleColumnDragStart(e, col.id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.stopPropagation();
                    void handleColumnDrop(e, col.id);
                  }}
                  className={`flex items-center justify-between mb-4 px-2 shrink-0 group/colheader rounded-lg ${draggedColumnId === col.id ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    {canEditProject && (
                      <span className="material-symbols-outlined text-slate-400 cursor-grab">drag_indicator</span>
                    )}
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
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
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
                         className={`p-4 rounded-xl shadow-sm border group transition-all ${task.completed ? 'bg-slate-50/50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800/50 opacity-60' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'} ${canEditProject ? 'hover:border-primary cursor-pointer' : 'cursor-default'} ${draggedTaskId === task.id ? 'opacity-30 border-dashed border-primary pb-10' : ''}`}
                       >
                        <div className="flex justify-between items-start mb-2 group/header">
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox"
                              checked={task.completed}
                              onChange={(e) => {
                                if (canEditProject) {
                                  void handleToggleCompletion(task.id, task.completed, e as any);
                                }
                              }}
                              className={`appearance-none size-5 rounded-full border-2 border-slate-300 dark:border-slate-600 checked:bg-emerald-500 checked:border-emerald-500 task-checkbox flex-shrink-0 transition-all ${canEditProject ? 'cursor-pointer' : 'cursor-default opacity-70'}`}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">General</span>
                          </div>
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
                             <span className={`material-symbols-outlined text-lg ${task.completed ? 'text-emerald-500' : 'cursor-grab text-slate-300 group-hover:text-slate-400'}`}>
                               {task.completed ? 'check_circle' : 'drag_indicator'}
                             </span>
                          </div>
                        </div>
                        <h4 className={`font-semibold mb-2 leading-snug ${task.completed ? 'text-slate-500 dark:text-slate-400 line-through decoration-slate-400 dark:decoration-slate-600' : 'text-slate-900 dark:text-white'}`}>
                          {task.title}
                        </h4>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                          {task.assignee ? (
                            <div className="flex items-center gap-1.5 shrink-0" title={`Asignado a: ${task.assignee}`}>
                              <div className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px] uppercase">
                                {task.assignee.charAt(0)}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 shrink-0" title="Sin asignar">
                              <div className="h-5 w-5 rounded-full border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[12px]">person</span>
                              </div>
                            </div>
                          )}
                          {task.dueDate ? (
                            <>
                              <span className="material-symbols-outlined text-sm">schedule</span>
                              <span className="text-xs font-medium">{task.dueDate}</span>
                            </>
                          ) : task.completed ? (
                            <>
                               <span className="material-symbols-outlined text-sm">history</span>
                               <span className="text-xs font-medium">Finalizado</span>
                            </>
                          ) : null}
                        </div>
                        {task.priority && !task.completed && (
                          <div className={`flex items-center gap-1 text-[11px] font-medium ${task.priority === 'Alta' ? 'text-red-500' : 'text-orange-500'}`}>
                             <span className="material-symbols-outlined text-[14px]">flag</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Botón Añadir en Columna */}
                   {canEditProject && (
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
