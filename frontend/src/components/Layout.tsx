import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { Menu } from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#080b11] text-gray-200 overflow-hidden font-sans relative">
      
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-[40vw] h-[40vh] bg-indigo-900/10 rounded-full blur-[100px] pointer-events-none" />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-grow flex flex-col overflow-hidden relative z-10">
        
        {/* Glassmorphic Header */}
        <header className="glass-panel border-b border-white/5 px-4 sm:px-6 flex justify-between items-center h-16 shrink-0 print:hidden relative">
          <div className="flex items-center gap-3">
            {/* Hamburger Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-base sm:text-xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-400">
              Smart Hotel Management
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-300 hidden sm:inline">
              Welcome, <span className="text-white font-semibold">{user?.name || user?.username}</span>
            </span>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold tracking-wider shadow-[0_0_12px_rgba(99,102,241,0.3)] border border-white/10 uppercase">
              {user?.username?.[0]}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-auto bg-[#080b11]/50 p-4 sm:p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
