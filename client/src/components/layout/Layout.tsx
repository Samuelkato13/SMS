import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { OfflineBanner } from './OfflineBanner';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 to-blue-50">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      
      <main className="flex-1 overflow-hidden flex flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <OfflineBanner />
        
        <div className="p-6 flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
