import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { Menu, LogOut } from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
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
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold tracking-wider shadow-[0_0_12px_rgba(99,102,241,0.3)] border border-white/10 uppercase text-xs">
                {user?.username?.[0]}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-white leading-none capitalize">
                  {user?.name || user?.username}
                </span>
                <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider mt-0.5">
                  {user?.role || 'GUEST'}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition duration-200 cursor-pointer shadow-sm"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
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
