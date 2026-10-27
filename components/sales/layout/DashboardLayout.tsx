'use client';

import { useCallback, useState, type ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileNavigation from './MobileNavigation';

/** Shared shell: header + sidebar (desktop) / drawer (mobile) + scrolling main area. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = useCallback(() => setNavOpen(false), []);

  return (
    <div className="flex h-dvh flex-col bg-canvas">
      <Header onMenuClick={() => setNavOpen(true)} />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-5">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3">{children}</div>
        </main>
      </div>
      <MobileNavigation open={navOpen} onClose={closeNav} />
    </div>
  );
}
