import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from '@/components/ui/sonner'
import { Sidebar } from '@/components/shared/Sidebar'

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RENOVA CRM",
  description: "Gestión de clientes RENOVA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className={`${geist.className} h-full`}>
        <div className="flex h-full bg-gray-50">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
