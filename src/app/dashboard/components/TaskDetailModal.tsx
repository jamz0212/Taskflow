"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useProject } from '@/context/ProjectContext';
import { createClient } from '@/lib/supabase/client';

export type Subtask = {
  id: string;
  title: string;
  completed: boolean;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  priority?: "Alta" | "Media" | "Baja";
  dueDate?: string;
  project?: string;
  completed: boolean;
  columnId?: string;
  subtasks?: Subtask[];
  assignee?: string;
};

type ProjectMember = {
  id: string;
  name: string;
  role: string;
  color: string;
  email: string;
};

type TaskDetailModalProps = {
  task: Task | null;
  onClose: () => void;
  onSave: (task: Task) => void;
  columns?: { id: string, title: string }[];
  initialColumnId?: string;
};

export function TaskDetailModal({ task, onClose, onSave, columns, initialColumnId }: TaskDetailModalProps) {
  const { currentUserId, currentUserEmail, activeProjectId } = useProject();
  const supabase = createClient();
  
  const [draft, setDraft] = useState<Task>(() => 
    task || {
      id: Date.now().toString(),
      title: "",
      description: "",
      priority: "Media",
      dueDate: "",
      completed: false,
      columnId: initialColumnId,
      subtasks: [],
      assignee: currentUserEmail || undefined
    }
  );

  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);

  useEffect(() => {
    let isMounted = true;
    
    const fetchMembersAndProfiles = async () => {
      if (!activeProjectId) return;
      
      const { data: members, error } = await supabase
        .from('project_members')
        .select('user_email, role')
        .eq('project_id', activeProjectId);
        
      if (error || !members) return;
      
      // Owner logic
      const { data: project } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', activeProjectId)
        .single();
        
      let ownerEmail = "";
      if (project?.user_id) {
        const { data: ownerUser } = await supabase.rpc('get_user_email_by_id', { user_id: project.user_id }).single();
        if (ownerUser) ownerEmail = ownerUser as string;
      }
      
      const emails = members.map(m => m.user_email);
      if (ownerEmail && !emails.includes(ownerEmail)) {
        emails.push(ownerEmail);
      }
      if (currentUserEmail && !emails.includes(currentUserEmail)) {
        emails.push(currentUserEmail);
      }
      
      // Fetch profiles to get full names
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name');
        
      const profileMap = new Map();
      profiles?.forEach(p => profileMap.set(p.email?.toLowerCase(), p.full_name));

      const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-purple-500', 'bg-pink-500', 'bg-rose-500'];
      
      if (!isMounted) return;
      
      const mappedMembers = emails.map((email, index) => {
        const isMe = email === currentUserEmail?.toLowerCase();
        const role = email === ownerEmail ? 'Propietario' : (members.find(m => m.user_email === email)?.role === 'admin' ? 'Admin' : members.find(m => m.user_email === email)?.role === 'editor' ? 'Editor' : 'Viewer');
        const fullName = profileMap.get(email) || email.split('@')[0];
        const displayName = isMe ? `${fullName} (Tú)` : fullName;
        
        return {
          id: email,
          email: email,
          name: displayName,
          role: isMe ? 'Tú' : role,
          color: colors[index % colors.length]
        };
      });
      
      setProjectMembers(mappedMembers);
    };
    
    void fetchMembersAndProfiles();
    
    return () => { isMounted = false; };
  }, [activeProjectId, currentUserEmail, supabase]);

  const activeAssignee = projectMembers.find(m => m.id === draft.assignee) || projectMembers[0] || { id: "unassigned", name: "Sin asignar", role: "", color: "bg-slate-300", email: "" };

  const handleAddSubtask = () => {
    const newSubtask: Subtask = {
      id: Date.now().toString(),
      title: "",
      completed: false
    };
    setDraft({ ...draft, subtasks: [...(draft.subtasks || []), newSubtask] });
  };

  const handleUpdateSubtask = (id: string, title: string) => {
    setDraft({
      ...draft,
      subtasks: draft.subtasks?.map(st => st.id === id ? { ...st, title } : st)
    });
  };

  const handleToggleSubtask = (id: string) => {
    setDraft({
      ...draft,
      subtasks: draft.subtasks?.map(st => st.id === id ? { ...st, completed: !st.completed } : st)
    });
  };

  const handleDeleteSubtask = (id: string) => {
    setDraft({
      ...draft,
      subtasks: draft.subtasks?.filter(st => st.id !== id)
    });
  };
  
  const completedSubtasksCount = draft.subtasks?.filter(st => st.completed).length || 0;
  const totalSubtasksCount = draft.subtasks?.length || 0;

  const handleSave = () => {
    if (!draft.title.trim()) return; // Required
    onSave(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Task Detail Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col pt-0">
        
        {/* Header Section */}
        <header className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`text-${draft.completed ? 'primary' : 'slate-400'}`}>
              <span className="material-symbols-outlined text-2xl" onClick={() => setDraft({ ...draft, completed: !draft.completed })} style={{cursor: 'pointer'}}>
                {draft.completed ? "check_circle" : "radio_button_unchecked"}
              </span>
            </div>
            <div>
              <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight">Task Details</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs text-left">
                Project: {draft.project || "General"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center justify-center rounded-lg h-9 w-9 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <span className="material-symbols-outlined text-xl">share</span>
            </button>
            <button className="flex items-center justify-center rounded-lg h-9 w-9 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <span className="material-symbols-outlined text-xl">more_vert</span>
            </button>
            <button onClick={onClose} className="flex items-center justify-center rounded-lg h-9 w-9 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </header>
        
        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content (Left) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Title */}
              <section>
                <input 
                  type="text"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Escribe un título de tarea aquí..."
                  className="w-full text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2 border-none bg-transparent px-0 focus:ring-0 placeholder-slate-300 dark:placeholder-slate-700"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold">En progreso</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    draft.priority === 'Alta' ? 'bg-red-100 text-red-700' :
                    draft.priority === 'Media' ? 'bg-orange-100 text-orange-700' :
                    'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                  }`}>
                    Prioridad {draft.priority}
                  </span>
                </div>
              </section>
              
              {/* Description */}
              <section>
                <h3 className="text-slate-900 dark:text-slate-100 text-sm font-bold uppercase tracking-wider mb-3">Descripción</h3>
                <textarea 
                  value={draft.description || ""}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="Escribe la descripción de la tarea..."
                  rows={4}
                  className="w-full text-sm text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800 focus:ring-primary focus:border-primary placeholder-slate-400"
                />
              </section>

              {/* Subtasks */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-slate-900 dark:text-slate-100 text-sm font-bold uppercase tracking-wider">Subtareas</h3>
                  <span className="text-xs text-slate-500">{completedSubtasksCount} de {totalSubtasksCount} completadas</span>
                </div>
                
                {/* Progress bar */}
                {totalSubtasksCount > 0 && (
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mb-4 overflow-hidden">
                    <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${(completedSubtasksCount / totalSubtasksCount) * 100}%` }}></div>
                  </div>
                )}

                <div className="space-y-2">
                  {draft.subtasks?.map(subtask => (
                    <div key={subtask.id} className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/30 p-2 lg:px-3 lg:py-2 rounded-lg border border-slate-100 dark:border-slate-800 group focus-within:border-primary/50 transition-colors">
                      <button onClick={() => handleToggleSubtask(subtask.id)} className={`mt-0.5 shrink-0 transition-colors ${subtask.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}>
                        <span className="material-symbols-outlined text-xl">{subtask.completed ? 'check_circle' : 'radio_button_unchecked'}</span>
                      </button>
                      <input 
                        type="text"
                        value={subtask.title}
                        onChange={(e) => handleUpdateSubtask(subtask.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSubtask();
                          }
                        }}
                        className={`flex-1 bg-transparent border-none p-0 focus:ring-0 text-sm py-0.5 ${subtask.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}
                        placeholder="Escribe tu subtarea aquí..."
                        autoFocus={subtask.title === ""}
                      />
                      <button onClick={() => handleDeleteSubtask(subtask.id)} className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-400 hover:text-red-500 transition-opacity mt-0.5">
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    </div>
                  ))}
                  
                  <button onClick={handleAddSubtask} className="mt-4 text-primary text-sm font-medium flex items-center gap-1 hover:underline">
                    <span className="material-symbols-outlined text-sm">add</span> Añadir subtarea
                  </button>
                </div>
              </section>
            </div>
            
            {/* Sidebar Content (Right) */}
            <div className="space-y-6 lg:border-l lg:border-slate-100 dark:lg:border-slate-800 lg:pl-8">
              {/* Assignee */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-left">Responsable</label>
                <div className="relative">
                  <div 
                    onClick={() => setIsAssigneeOpen(!isAssigneeOpen)}
                    className="flex items-center justify-between p-2 border border-slate-100 dark:border-slate-800 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${activeAssignee.color} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                        {activeAssignee.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{activeAssignee.name}</span>
                        <span className="text-xs text-slate-500">{activeAssignee.role}</span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-400">expand_more</span>
                  </div>
                  
                  {isAssigneeOpen && (
                    <div className="absolute top-full mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-20 overflow-hidden">
                      {projectMembers.map(member => (
                        <div 
                          key={member.id}
                          onClick={() => {
                            setDraft({ ...draft, assignee: member.id });
                            setIsAssigneeOpen(false);
                          }}
                          className={`flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors ${draft.assignee === member.id ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}
                        >
                          <div className={`w-8 h-8 rounded-full ${member.color} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                            {member.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{member.name}</span>
                            <span className="text-xs text-slate-500">{member.role}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Date Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-left">Vencimiento</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400 text-lg">calendar_today</span>
                  </div>
                  <input 
                    className="w-full pl-10 pr-3 py-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-primary focus:border-primary text-slate-900 dark:text-slate-100 placeholder-slate-400" 
                    type="date" 
                    style={{ colorScheme: 'light dark' }}
                    value={draft.dueDate || ""}
                    onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Priority */}
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-left">Prioridad</label>
                 <div className="relative">
                     <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg ${
                        draft.priority === 'Alta' ? 'text-red-500' :
                        draft.priority === 'Media' ? 'text-orange-500' :
                        'text-slate-500'
                     }`}>flag</span>
                     <select 
                       value={draft.priority}
                       onChange={(e) => setDraft({ ...draft, priority: e.target.value as "Alta" | "Media" | "Baja" })}
                       className="w-full pl-10 pr-3 py-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-primary focus:border-primary appearance-none cursor-pointer"
                     >
                         <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="Baja">Baja</option>
                         <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="Media">Media</option>
                         <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="Alta">Alta</option>
                     </select>
                 </div>
              </div>

              {columns && columns.length > 0 && (
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-left mt-6">Columna</label>
                 <div className="relative">
                     <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-500">view_column</span>
                     <select 
                       value={draft.columnId || ""}
                       onChange={(e) => setDraft({ ...draft, columnId: e.target.value })}
                       className="w-full pl-10 pr-3 py-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-primary focus:border-primary appearance-none cursor-pointer"
                     >
                         {columns.map(col => (
                           <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" key={col.id} value={col.id}>{col.title}</option>
                         ))}
                     </select>
                 </div>
              </div>
              )}

            </div>
          </div>
        </div>
        
        {/* Footer Actions */}
        <footer className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-900 shrink-0">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
             Cancelar
          </button>
          <button onClick={handleSave} disabled={!draft.title.trim()} className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 shadow-md shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
             {task ? "Guardar cambios" : "Crear Tarea"}
          </button>
        </footer>
      </div>
    </div>
  );
}
