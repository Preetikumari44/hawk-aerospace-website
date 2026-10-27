'use client';

import { useEffect, useRef } from 'react';
import { IconClose } from '@/components/sales/ui/icons';
import { SidebarContent } from './Sidebar';

interface MobileNavigationProps {
  open: boolean;
  onClose: () => void;
}

/** Slide-in drawer used below lg. Includes Marketplace because the header's centre links are desktop-only. */
export default function MobileNavigation({ open, onClose }: MobileNavigationProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-primary-dark shadow-xl"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="absolute right-2 top-2 flex size-11 items-center justify-center rounded-sm text-white/80 hover:bg-white/10"
        >
          <IconClose />
        </button>

        <SidebarContent onNavigate={onClose} includeMarketplace />
      </div>
    </div>
  );
}
