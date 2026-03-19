import React from 'react';
import { Sidebar } from './components';
import { ProjectProvider } from '@/context/ProjectContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Side Navigation */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col bg-white dark:bg-background-dark overflow-y-auto">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold">Panel</h2>
              <span className="text-slate-400 text-base font-normal">Viernes, 25 de oct.</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                <input className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-base w-64 focus:ring-2 focus:ring-primary/20" placeholder="Búsqueda rápida..." type="text" />
              </div>
            </div>
          </header>

          {children}
        </main>
      </div>
    </ProjectProvider>
  );
}
