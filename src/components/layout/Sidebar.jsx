import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Kanban, Briefcase, Menu, X, ListTodo, Settings, UserCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const baseNavItems = [
  { label: 'Il mio lavoro', path: '/MyWork', icon: ListTodo },
  { label: 'Bacheche', path: '/Boards', icon: Kanban },
  { label: 'Commesse', path: '/Commissions', icon: Briefcase },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();
  const { data: currentUser } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const navItems = currentUser?.role === 'admin'
    ? [{ label: 'Dashboard', path: '/Dashboard', icon: LayoutDashboard }, ...baseNavItems, { label: 'Impostazioni', path: '/Settings', icon: Settings }]
    : baseNavItems;

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-slate-900 text-white shadow-lg"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/40 z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300",
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 border-b border-white/10">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Kanban className="w-4 h-4" />
            </div>
            WorkBoard
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <Link
          to="/Profile"
          onClick={() => setIsOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-2 ${location.pathname === '/Profile' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <div className="w-6 h-6 rounded-full bg-indigo-700 flex items-center justify-center overflow-hidden flex-shrink-0">
            {currentUser?.avatar_url ? (
              <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserCircle className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate leading-tight">{currentUser?.full_name || currentUser?.email || 'Profilo'}</p>
            <p className="text-xs text-slate-500 truncate leading-tight">{currentUser?.email}</p>
          </div>
        </Link>
        <p className="text-xs text-slate-500">© 2026 WorkBoard</p>
        </div>
      </aside>
    </>
  );
}