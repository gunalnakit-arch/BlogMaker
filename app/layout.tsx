import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BlogMaker AI - Premium Blog Generator',
  description: 'Convert YouTube videos to SEO-ready blogs in seconds.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <nav className="h-16 border-b border-white/5 flex items-center px-6 bg-white/5 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tighter text-white">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">Blog</span>Maker
          </div>
          <div className="ml-auto flex gap-4 text-sm font-medium text-gray-400">
            <a href="/" className="hover:text-white transition-colors">Create</a>
            <a href="/dashboard" className="hover:text-white transition-colors">Dashboard</a>
          </div>
        </nav>
        <main className="min-h-[calc(100vh-4rem)] relative overflow-hidden">
          {/* Dynamic Background */}
          <div className="absolute top-0 left-0 w-full h-full bg-[#0D0D0F] -z-20"></div>
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] -z-10 animate-pulse"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] -z-10"></div>

          {children}
        </main>
        <Toaster theme="dark" position="top-center" />
      </body>
    </html>
  );
}
