"use client";

import { useTheme } from '@/context/ThemeContext';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex-1 p-8 max-w-2xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Configuración</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Personaliza tu experiencia en TaskFlow</p>
      </div>

      {/* Appearance Section */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">palette</span>
            Apariencia
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Elige cómo quieres que se vea la interfaz</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Theme Selection Cards */}
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Tema de color</p>
          <div className="grid grid-cols-2 gap-4">
            {/* Light Mode Card */}
            <button
              onClick={() => setTheme('light')}
              className={`relative group rounded-xl border-2 p-4 text-left transition-all cursor-pointer ${
                theme === 'light'
                  ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {/* Light mode preview */}
              <div className="rounded-lg overflow-hidden mb-3 bg-slate-50 border border-slate-200 shadow-sm">
                <div className="h-4 bg-white flex items-center px-2 gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                </div>
                <div className="flex h-14">
                  <div className="w-8 bg-slate-100 flex flex-col items-center pt-2 gap-1">
                    <span className="w-4 h-1 rounded bg-violet-400"></span>
                    <span className="w-3 h-1 rounded bg-slate-300"></span>
                    <span className="w-3 h-1 rounded bg-slate-300"></span>
                  </div>
                  <div className="flex-1 p-2 flex flex-col gap-1">
                    <span className="w-full h-1.5 rounded bg-slate-200"></span>
                    <span className="w-4/5 h-1.5 rounded bg-slate-200"></span>
                    <span className="w-3/5 h-1.5 rounded bg-violet-200"></span>
                  </div>
                </div>
              </div>

              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 block">Modo Claro</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Fondo blanco y colores vibrantes</span>

              {theme === 'light' && (
                <span className="absolute top-3 right-3 material-symbols-outlined text-primary text-base">check_circle</span>
              )}
            </button>

            {/* Dark Mode Card */}
            <button
              onClick={() => setTheme('dark')}
              className={`relative group rounded-xl border-2 p-4 text-left transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {/* Dark mode preview */}
              <div className="rounded-lg overflow-hidden mb-3 bg-slate-900 border border-slate-700 shadow-sm">
                <div className="h-4 bg-slate-800 flex items-center px-2 gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                </div>
                <div className="flex h-14">
                  <div className="w-8 bg-slate-800/80 flex flex-col items-center pt-2 gap-1">
                    <span className="w-4 h-1 rounded bg-violet-500"></span>
                    <span className="w-3 h-1 rounded bg-slate-700"></span>
                    <span className="w-3 h-1 rounded bg-slate-700"></span>
                  </div>
                  <div className="flex-1 p-2 flex flex-col gap-1">
                    <span className="w-full h-1.5 rounded bg-slate-700"></span>
                    <span className="w-4/5 h-1.5 rounded bg-slate-700"></span>
                    <span className="w-3/5 h-1.5 rounded bg-violet-800"></span>
                  </div>
                </div>
              </div>

              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 block">Modo Oscuro</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Fondo oscuro, menor fatiga visual</span>

              {theme === 'dark' && (
                <span className="absolute top-3 right-3 material-symbols-outlined text-primary text-base">check_circle</span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Account Info Section */}
      <section className="mt-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">manage_accounts</span>
            Cuenta
          </h2>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-2xl">person</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Usuario TaskFlow</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Sesión activa</p>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <div className="mt-6 text-center text-xs text-slate-400">
        TaskFlow v1.0.0 · Todos los derechos reservados
      </div>
    </div>
  );
}
