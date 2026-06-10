import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from '@/components/ui/sonner'
import { Sidebar } from '@/components/shared/Sidebar'
import { ThemeProvider } from '@/components/shared/ThemeProvider'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { CommandPalette } from '@/components/shared/CommandPalette'
import { HelpPanel } from '@/components/shared/HelpPanel'

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Renovapp - CRM",
  description: "Gestión de clientes Renovapp",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      {/* Script anti-FOUC: aplica el tema antes de que React hidrate */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('renovapp-theme');if(t==='gold')document.documentElement.setAttribute('data-theme','gold');}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${geist.className} h-full`}>
        <ThemeProvider>
          <div className="flex h-full bg-gray-50">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Barra superior con selector de tema */}
              <header className="h-10 shrink-0 flex items-center justify-end gap-2 px-4 bg-white border-b border-gray-200">
                <span className="text-xs text-gray-300 select-none hidden sm:inline">
                  Buscar: <kbd className="border border-gray-200 rounded px-1 py-0.5">Ctrl</kbd>+<kbd className="border border-gray-200 rounded px-1 py-0.5">K</kbd>
                </span>
                <ThemeToggle />
              </header>
              <main className="flex-1 overflow-auto">
                {children}
              </main>
            </div>
          </div>
          <CommandPalette />
          <HelpPanel />
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
