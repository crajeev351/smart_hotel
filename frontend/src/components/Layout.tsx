import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { Menu, LogOut } from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#F8F6F1] text-[#171717] overflow-hidden font-sans relative">

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-grow flex flex-col overflow-hidden relative z-10">
        
        {/* Header */}
        <header className="bg-white border-b border-black/5 px-4 sm:px-6 flex justify-between items-center h-16 shrink-0 print:hidden relative shadow-sm">
          <div className="flex items-center gap-3">
            {/* Hamburger Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-[#6E6A63] hover:text-[#171717] hover:bg-black/5 rounded-xl transition cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-base sm:text-xl font-bold tracking-tight text-[#171717]">
              Imperium Hotel Management
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-[#F8F6F1] px-3 py-1.5 rounded-xl border border-black/5">
              <div className="w-8 h-8 rounded-lg bg-[#C49A32] flex items-center justify-center text-white font-bold tracking-wider shadow-sm border border-[#C49A32] uppercase text-xs">
                {user?.username?.[0]}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-[#171717] leading-none capitalize">
                  {user?.name || user?.username}
                </span>
                <span className="text-[10px] text-[#C49A32] font-semibold uppercase tracking-wider mt-0.5">
                  {user?.role || 'GUEST'}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[#171717] bg-black/5 hover:bg-black/10 border border-black/5 rounded-xl transition duration-200 cursor-pointer shadow-sm"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-auto bg-[#F8F6F1] p-4 sm:p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
