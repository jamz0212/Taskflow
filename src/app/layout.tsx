import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TaskFlow - Task Master",
  description: "Task Master - Panel de control",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        {/* Inline script to avoid flash of wrong theme on first paint */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function(){
              try {
                var theme = localStorage.getItem('taskflow-theme');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var apply = theme || (prefersDark ? 'dark' : 'light');
                document.documentElement.classList.add(apply);
              } catch(e){}
            })();
          `
        }} />
      </head>
      <body
        className={`${inter.variable} bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased min-h-screen`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
