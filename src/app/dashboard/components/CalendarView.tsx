"use client";

import React, { useState, useEffect } from 'react';
import { useProject } from '@/context/ProjectContext';
import { KanbanTask } from './KanbanBoard';

export function CalendarView() {
  const { activeProjectId } = useProject();
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [currentDate, setCurrentDate] = useState(() => {
    // Current date logic defaulting to October 2026 roughly for demo, or real Date
    return new Date();
  });

  // Load data for the active project
  useEffect(() => {
    if (!activeProjectId) return;
    const savedTasks = localStorage.getItem(`tasks-${activeProjectId}`);
    if (savedTasks) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setTasks(JSON.parse(savedTasks));
    } else {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setTasks([]);
    }
  }, [activeProjectId]);

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const currentMonthName = monthNames[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();

  // Simple calendar generation
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // 0 is Monday, 6 is Sunday
  };

  const daysInMonth = getDaysInMonth(currentYear, currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentYear, currentDate.getMonth());

  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentDate.getMonth() + 1, 1));
  };
  
  const calendarDays = [];
  // Empty slots for start of month
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push({ empty: true, key: `empty-${i}` });
  }
  // Actual days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ empty: false, day: i, key: `day-${i}` });
  }

  // Very rough parsing of tasks due dates (which are currently strings like "12 oct")
  // In a real app these would be ISO strings. We'll show a simple UI fallback.
  const getTasksForDay = (day: number) => {
    return tasks.filter(t => {
      // Trying to match something like "12 oct" or just dumping them randomly if mapping is poor
      const rx = new RegExp(`^${day}\\s`, 'i');
      return t.dueDate && rx.test(t.dueDate);
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">
      {/* Controles del calendario */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-3 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white capitalize">{currentMonthName} {currentYear}</h2>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button onClick={prevMonth} className="p-1 px-3 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-500 transition-colors">
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button className="px-3 text-sm font-semibold rounded mx-1 hover:bg-white dark:hover:bg-slate-700" onClick={() => setCurrentDate(new Date())}>
              Hoy
            </button>
            <button onClick={nextMonth} className="p-1 px-3 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-500 transition-colors">
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
        <div>
           {/* Future View toggles here */}
        </div>
      </div>

      {/* Grid Calendario */}
      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0B1121] p-4 md:p-8">
        <div className="grid grid-cols-7 gap-[1px] bg-slate-200 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          {/* Cabecera Dias */}
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(dayName => (
            <div key={dayName} className="bg-white dark:bg-slate-900 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              {dayName}
            </div>
          ))}

          {/* Días */}
          {calendarDays.map((cell) => {
            if (cell.empty) {
              return <div key={cell.key} className="bg-slate-50 dark:bg-slate-900/50 min-h-[120px]"></div>;
            }

            const isToday = cell.day === new Date().getDate() && 
                            currentDate.getMonth() === new Date().getMonth() && 
                            currentYear === new Date().getFullYear();
                            
            const dayTasks = getTasksForDay(cell.day as number);

            return (
              <div key={cell.key} className={`bg-white dark:bg-slate-900 min-h-[120px] p-2 flex flex-col group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/80`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`inline-flex items-center justify-center size-8 rounded-full text-sm font-bold ${isToday ? 'bg-primary text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                    {cell.day}
                  </span>
                  <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-primary transition-all">
                     <span className="material-symbols-outlined text-sm">add</span>
                  </button>
                </div>
                <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[100px] scrollbar-hide">
                  {dayTasks.map(task => (
                    <div key={task.id} className={`text-xs px-2 py-1 rounded truncate font-medium ${task.completed ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 line-through' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'}`}>
                      {task.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
