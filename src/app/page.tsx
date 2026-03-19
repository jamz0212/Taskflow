import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans selection:bg-primary/20">
      <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md z-50 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 rounded-lg p-2 text-primary">
            <span className="material-symbols-outlined text-2xl">task_alt</span>
          </div>
          <span className="font-bold text-xl text-slate-900 dark:text-white tracking-tight">TaskFlow</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
            Iniciar Sesión
          </Link>
          <Link href="/signup" className="text-sm font-bold bg-primary text-white px-5 py-2.5 rounded-full hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30">
            Regístrate Gratis
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center w-full px-6 py-24 text-center">
        <div className="max-w-3xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            SaaS Factory v1.0
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-8 leading-tight">
            Desata tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-500">potencial</span>,<br />
            domina tus tareas.
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-12 max-w-2xl leading-relaxed">
            TaskFlow es el centro de mando definitivo para tu productividad. Organiza proyectos, visualiza progresos en tableros Kanban y haz que cada minuto cuente con un diseño que simplemente, fluye.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link href="/signup" className="w-full sm:w-auto md:w-[200px] flex items-center justify-center gap-2 bg-primary text-white text-base font-bold px-8 py-4 rounded-full hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:-translate-y-0.5">
              <span>Empezar Ahora</span>
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>
            <Link href="/login" className="w-full sm:w-auto md:w-[200px] flex items-center justify-center gap-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-base font-bold px-8 py-4 rounded-full hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all hover:-translate-y-0.5">
              <span>Ya tengo cuenta</span>
            </Link>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="w-full max-w-5xl mx-auto mt-24 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 dark:from-slate-950 via-transparent to-transparent z-10 h-full"></div>
          <div className="rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-4 shadow-2xl relative overflow-hidden transform translate-z-0">
             <div className="absolute inset-x-0 -top-px h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
             
             {/* Mock Kanban Board Visual */}
             <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/50 dark:border-slate-800/50 p-6 opacity-60 flex gap-4 overflow-hidden pointer-events-none select-none h-[400px]">
               {['Por Hacer', 'En Progreso', 'Finalizado'].map((title, i) => (
                 <div key={title} className="w-1/3 flex flex-col gap-3">
                   <div className="font-bold text-sm text-slate-500 mb-2">{title}</div>
                   {[...Array(3 - i)].map((_, j) => (
                     <div key={j} className="h-24 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/50 dark:border-slate-800/50 p-4 shadow-sm flex flex-col justify-between">
                       <div className={`h-2 w-3/4 rounded-full ${i === 0 ? 'bg-slate-200 dark:bg-slate-800' : 'bg-primary/20'}`}></div>
                       <div className="flex gap-2">
                          <div className="h-4 w-4 rounded-full bg-slate-200 dark:bg-slate-800"></div>
                          <div className="h-4 w-12 rounded-full bg-slate-100 dark:bg-slate-800/50"></div>
                       </div>
                     </div>
                   ))}
                 </div>
               ))}
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
