import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Kanban, Menu, X, FolderKanban, ChevronDown, LayoutDashboard, CheckSquare2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TopMenu from './TopMenu';

export default function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [boardsExpanded, setBoardsExpanded] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

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

  const visibleBoards = allBoards.filter(b =>
    isAdmin || !b.allowed_user_emails?.length || b.allowed_user_emails.includes(currentUser?.email)
  );

  const boardsInSelectedProject = selectedProjectId
    ? visibleBoards.filter(b => b.project_id === selectedProjectId)
    : visibleBoards;

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
          {/* Progetti Section */}
          <div>
            <button
              onClick={() => setProjectsExpanded(!projectsExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700 transition-colors"
            >
              <span>Progetti</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${projectsExpanded ? 'rotate-180' : ''}`} />
            </button>
            {projectsExpanded && (
              <div className="mt-1 space-y-1">
                {visibleProjects.length === 0 ? (
                  <p className="text-xs text-slate-400 px-3 py-2">Nessun progetto</p>
                ) : (
                  visibleProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => setSelectedProjectId(selectedProjectId === project.id ? null : project.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                        selectedProjectId === project.id
                          ? 'bg-indigo-50 text-indigo-700 font-medium'
                          : 'text-slate-700 hover:bg-slate-100'
                      )}
                    >
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: `var(--project-color-${project.color})` }} />
                      <span className="truncate">{project.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Bacheche Section */}
          <div>
            <button
              onClick={() => setBoardsExpanded(!boardsExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700 transition-colors"
            >
              <span>Bacheche</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${boardsExpanded ? 'rotate-180' : ''}`} />
            </button>
            {boardsExpanded && (
              <div className="mt-1 space-y-1">
                {boardsInSelectedProject.length === 0 ? (
                  <p className="text-xs text-slate-400 px-3 py-2">{selectedProjectId ? 'Nessuna bacheca' : 'Nessuna bacheca'}</p>
                ) : (
                  boardsInSelectedProject.map((board) => (
                    <Link
                      key={board.id}
                      to={`/BoardDetail?id=${board.id}`}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                        location.pathname === '/BoardDetail' && location.search.includes(board.id)
                          ? 'bg-indigo-50 text-indigo-700 font-medium'
                          : 'text-slate-700 hover:bg-slate-100'
                      )}
                    >
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: `var(--board-color-${board.color})` }} />
                      <span className="truncate">{board.name}</span>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Link to Commissions */}
          <div className="pt-2 border-t border-slate-200">
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