import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8 relative">
          <div className="absolute top-4 right-4 lg:top-6 lg:right-6 z-30">
            <NotificationBell />
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}