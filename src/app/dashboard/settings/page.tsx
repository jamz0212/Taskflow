"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useProject } from '@/context/ProjectContext';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { currentUserEmail, currentUserId } = useProject();
  
  const [fullName, setFullName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const supabase = createClient();

  useEffect(() => {
    // Load initial profile data
    const loadProfile = async () => {
      if (!currentUserId) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', currentUserId)
        .single();
        
      if (!error && data) {
        setFullName(data.full_name || "");
      }
    };
    
    loadProfile();
  }, [currentUserId, supabase]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return;
    
    setIsSaving(true);
    setSaveMessage("");
    
    // UPSERT pattern: update if exists, insert if it doesn't
    const { error } = await supabase
      .from('profiles')
      .upsert({ 
        id: currentUserId,
        email: currentUserEmail,
        full_name: fullName 
      }, { onConflict: 'id' });
      
    setIsSaving(false);
    
    if (error) {
      console.error(error);
      setSaveMessage("Error al guardar el perfil");
    } else {
      setSaveMessage("Perfil guardado con éxito");
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

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
          <div className="flex flex-col gap-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xl uppercase border-2 border-white dark:border-slate-800 shadow-sm">
                {fullName ? fullName.charAt(0) : currentUserEmail?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {currentUserEmail || 'Cargando...'}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Sesión activa
                </p>
              </div>
            </div>

            <div className="h-px w-full bg-slate-200 dark:bg-slate-700/50"></div>

            <form onSubmit={handleSaveProfile} className="space-y-4 max-w-sm">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nombre visible
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Este es el nombre que verán los demás colaboradores en tus proyectos.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">save</span>
                  )}
                  Guardar cambios
                </button>
                
                {saveMessage && (
                  <span className={`text-sm font-medium ${saveMessage.includes('Error') ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {saveMessage}
                  </span>
                )}
              </div>
            </form>
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
