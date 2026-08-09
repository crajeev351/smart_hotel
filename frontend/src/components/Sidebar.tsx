import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Hotel, Utensils, ConciergeBell, ChefHat, Settings, X } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();

  const getNavItems = () => {
    const items: { label: string; path: string; icon: React.ReactNode }[] = [];
    if (!user) return items;

    const role = user.role || 'GUEST';

    // Dashboard is for all roles
    items.push({ label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5 mr-3" /> });

    // Reception is for Frontdesk (Receptionist & Admin)
    if (role === 'ADMIN' || role === 'RECEPTION') {
      items.push({ label: 'Reception', path: '/reception', icon: <ConciergeBell className="w-5 h-5 mr-3" /> });
    }

    // Room Cleaning / Janitor Dashboard is for Janitors and Admins
    if (role === 'ADMIN' || role === 'JANITOR') {
      items.push({ label: 'Room Cleaning', path: '/rooms', icon: <Hotel className="w-5 h-5 mr-3" /> });
    }

    // Restaurant ordering is for Waiters, Guests & Admin
    if (role === 'ADMIN' || role === 'WAITER' || role === 'GUEST') {
      items.push({ label: 'Restaurant Ordering', path: '/restaurant', icon: <Utensils className="w-5 h-5 mr-3" /> });
    }

    // KDS is for Kitchen staff & Admin
    if (role === 'ADMIN' || role === 'KITCHEN') {
      items.push({ label: 'Kitchen KDS', path: '/kitchen', icon: <ChefHat className="w-5 h-5 mr-3" /> });
    }

    // Admin Panel is for Admin only
    if (role === 'ADMIN') {
      items.push({ label: 'Admin Panel', path: '/admin', icon: <Settings className="w-5 h-5 mr-3" /> });
    }

    return items;
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0d16] border-r border-white/5 flex flex-col h-screen shrink-0 print:hidden transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Logo Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h1 className="text-xl font-black text-white flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
              <Hotel className="w-5 h-5" />
            </div>
            <span className="tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-300">
              Smart Hotel
            </span>
          </h1>

          {/* Close button for mobile */}
          <button 
            onClick={onClose}
            className="lg:hidden p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="px-6 py-4">
          {user && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/[0.04]">
              <p className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">Current Session</p>
              <p className="text-sm font-semibold text-white truncate mt-0.5 capitalize">{user.username}</p>
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase tracking-wider">
                {user.role || 'GUEST'}
              </span>
            </div>
          )}
        </div>

        {/* Nav List */}
        <nav className="mt-2 flex-grow px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500/10 to-indigo-500/5 text-white border-l-4 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <span className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-300'}`}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/5 bg-[#080a11]/40 text-center">
          <p className="text-[11px] text-gray-500 font-semibold">Smart Hotel Cloud v2.0</p>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
