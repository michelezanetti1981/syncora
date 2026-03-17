import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Kanban, Menu, X, FolderKanban, ChevronDown, LayoutDashboard, CheckSquare2, SquareKanban } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TopMenu from './TopMenu';

export default function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();


  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
    enabled: !!currentUser?.email,
  });

  const { data: allBoards = [] } = useQuery({
    queryKey: ['boards'],
    queryFn: () => base44.entities.Board.filter({ status: 'active' }),
    enabled: !!currentUser?.email,
  });

  const isAdmin = currentUser?.role === 'admin';

  // Filter projects and boards visible to user
  const visibleProjects = allProjects.filter(p =>
    isAdmin || !p.allowed_user_emails?.length || p.allowed_user_emails.includes(currentUser?.email)
  );



  const isActive = (path) => location.pathname.startsWith(path);

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
          'fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Kanban className="w-4 h-4 text-white" />
            </div>
            <span className="text-slate-900">WorkBoard</span>
          </h1>
          <div className="lg:hidden">
            <TopMenu />
          </div>
        </div>

        {/* Content */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Dashboard & Il mio lavoro */}
          <div className="space-y-1">
            <Link
              to="/Dashboard"
              onClick={() => setIsOpen(false)}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive('/Dashboard')
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/MyWork"
              onClick={() => setIsOpen(false)}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive('/MyWork')
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              <CheckSquare2 className="w-4 h-4" />
              <span>Il mio lavoro</span>
            </Link>
          </div>

          {/* Other Links */}
          <div className="pt-2 border-t border-slate-200 space-y-1">
            <Link
              to="/Projects"
              onClick={() => setIsOpen(false)}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive('/Projects')
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              <FolderKanban className="w-4 h-4" />
              <span>Progetti</span>
            </Link>
            <Link
              to="/Boards"
              onClick={() => setIsOpen(false)}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive('/Boards')
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              <SquareKanban className="w-4 h-4" />
              <span>Bacheche</span>
            </Link>
            <Link
              to="/Commissions"
              onClick={() => setIsOpen(false)}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive('/Commissions')
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              <span>Commesse</span>
            </Link>
          </div>
        </nav>

        {/* Top Menu for desktop */}
        <div className="hidden lg:block p-3 border-t border-slate-200">
          <TopMenu direction="up" />
        </div>
      </aside>
    </>
  );
}