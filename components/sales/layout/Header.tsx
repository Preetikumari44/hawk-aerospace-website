
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useBookingAuth } from '@/lib/booking/auth-context';
import { approvedFrontendRoles } from '@/lib/booking/roles';
import { ROUTES } from '@/lib/sales/routes';
import { workspaces, type Workspace, type WorkspaceIcon } from '@/lib/sales/workspaces';
import { useAsync } from '@/components/sales/useAsync';
import { getNotifications } from '@/lib/sales/services/notifications';
import { useCart, useNotice, useProfile } from '@/components/sales/SalesProviders';
import AsyncView from '@/components/sales/ui/AsyncView';
import {
  IconArrowRight,
  IconBell,
  IconChevronDown,
  IconChevronUp,
  IconDrone,
  IconLogout,
  IconMenu,
  IconPerson,
  IconSettings,
  IconTruck,
  IconUser,
  IconWrench,
} from '@/components/sales/ui/icons';

type MenuName = 'notifications' | 'grid' | 'profile';

const WORKSPACE_ICONS: Record<WorkspaceIcon, () => ReactNode> = {
  person: () => <IconPerson />,
  drone: () => <IconDrone />,
  truck: () => <IconTruck />,
  wrench: () => <IconWrench />,
};

const CENTER_LINKS: readonly { label: string; href?: string }[] = [
  { label: 'Solutions' },
  { label: 'Technology' },
  { label: 'Platforms' },
  { label: 'Marketplace', href: ROUTES.marketplace },
];

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [openMenu, setOpenMenu] = useState<MenuName | null>(null);
  const [switchingWs, setSwitchingWs] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const router = useRouter();
  const { backendUser, switchRole, logout } = useBookingAuth();
  const { count } = useCart();
  const notify = useNotice();
  const profile = useProfile();
  const notifications = useAsync(getNotifications);

  const toggle = (menu: MenuName) =>
    setOpenMenu((current) => (current === menu ? null : menu));

  const closeMenu = () => setOpenMenu(null);

  useEffect(() => {
    if (!openMenu) return;

    const onPointer = (event: MouseEvent | TouchEvent) => {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        setOpenMenu(null);
      }
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };

    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [openMenu]);

  const handleWorkspaceSelect = (workspace: Workspace) => {
    closeMenu();

    const approved = approvedFrontendRoles(backendUser);
    const target = workspace.role as string;

    if (target === 'sales') {
      router.push(workspace.href);
      return;
    }

    if (approved.includes(target as (typeof approved)[number])) {
      setSwitchingWs(workspace.key);

      switchRole(target as 'customer' | 'pilot' | 'fleet' | 'technician')
        .catch(() =>
          notify({
            title: 'Role switch failed',
            message: `Could not switch to ${workspace.label}.`,
          }),
        )
        .finally(() => setSwitchingWs(null));

      return;
    }

    router.push('/account');
  };

  const handleLogout = () => {
    closeMenu();
    logout();
    router.replace('/');
  };

  const sessionName = (backendUser?.name as string | undefined) || '';
  const fullName =
    profile.status === 'success' && profile.data.fullName
      ? profile.data.fullName
      : sessionName;
  const role = 'Sales Aggregator';
  const initial = fullName.charAt(0) || '·';
  const hasNotifications =
    notifications.status === 'success' && notifications.data.length > 0;

  return (
    <header ref={headerRef} className="sales-dashboard-header">
      <div className="sales-header-brand">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="sales-mobile-menu"
        >
          <IconMenu />
        </button>

        <Link href={ROUTES.dashboard} className="sales-logo">
          <span className="sales-logo-mark">H</span>
          <span className="sales-logo-text">Hawk Aerospace</span>
        </Link>
      </div>

      <nav aria-label="Hawk Aerospace" className="sales-top-nav">
        {CENTER_LINKS.map((link) =>
          link.href ? (
            <Link
              key={link.label}
              href={link.href}
              onClick={closeMenu}
              className="sales-top-link"
            >
              {link.label}
              {link.label === 'Marketplace' && count > 0 && (
                <span className="sales-market-count">{count}</span>
              )}
            </Link>
          ) : (
            <span key={link.label} className="sales-top-link">
              {link.label}
            </span>
          ),
        )}
      </nav>

      <div className="sales-header-right">
        <div className="sales-header-action">
          <button
            type="button"
            className="sales-header-icon"
            onClick={() => toggle('notifications')}
            aria-label="Notifications"
            aria-haspopup="true"
            aria-expanded={openMenu === 'notifications'}
          >
            <IconBell />
            {hasNotifications && <span className="sales-notification-dot" />}
          </button>

          {openMenu === 'notifications' && (
            <div className="sales-dropdown sales-notif-menu">
              <p className="sales-dropdown-heading">Notifications</p>
              <div className="sales-notification-list">
                <AsyncView
                  query={notifications}
                  isEmpty={(items) => items.length === 0}
                  emptyTitle="No notifications."
                  loadingLines={2}
                >
                  {(items) => (
                    <ul>
                      {items.map((item) => (
                        <li key={item.id} className="sales-notification-item">
                          <p className="sales-notification-title">
                            {item.title}
                          </p>
                          <p className="sales-notification-message">
                            {item.message}
                          </p>
                          <p className="sales-notification-time">{item.time}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </AsyncView>
              </div>
            </div>
          )}
        </div>

        <div className="sales-header-action">
          <button
            type="button"
            className="sales-header-icon"
            onClick={() => toggle('grid')}
            aria-label="Hawk Aerospace workspaces"
            aria-haspopup="true"
            aria-expanded={openMenu === 'grid'}
          >
            <span className="sales-nine-dots" aria-hidden="true">
              {Array.from({ length: 9 }, (_, index) => (
                <i key={index} />
              ))}
            </span>
          </button>

          {openMenu === 'grid' && (
            <div className="sales-dropdown sales-apps-menu">
              <p className="sales-dropdown-heading">Hawk Aerospace Workspaces</p>
              <div className="sales-app-grid">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.key}
                    type="button"
                    disabled={switchingWs !== null}
                    onClick={() => handleWorkspaceSelect(workspace)}
                    className="sales-app-tile"
                  >
                    <span className="sales-app-icon">
                      {WORKSPACE_ICONS[workspace.icon]()}
                    </span>
                    <span className="sales-app-label">
                      {switchingWs === workspace.key
                        ? 'Switching…'
                        : workspace.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="sales-header-action">
          <button
            type="button"
            onClick={() => toggle('profile')}
            aria-label="Profile menu"
            aria-haspopup="true"
            aria-expanded={openMenu === 'profile'}
            className="sales-profile-trigger"
          >
            <span className="sales-profile-avatar">{initial}</span>
            <span className="sales-profile-info">
              <span className="sales-profile-name">{fullName || '\u00a0'}</span>
              <span className="sales-profile-role">{role}</span>
            </span>
            <span className="sales-profile-chevron">
              {openMenu === 'profile' ? <IconChevronUp /> : <IconChevronDown />}
            </span>
          </button>

          {openMenu === 'profile' && (
            <div className="sales-dropdown sales-profile-menu">
              <div className="sales-profile-summary">
                <span className="sales-profile-avatar sales-summary-avatar">
                  {initial}
                </span>
                <div className="sales-profile-summary-text">
                  <p className="sales-profile-name">{fullName}</p>
                  <p className="sales-profile-role">{role}</p>
                </div>
              </div>

              <Link
                href={`${ROUTES.account}?section=profile`}
                onClick={closeMenu}
                className="sales-profile-menu-item"
              >
                <IconUser /> Profile / Account
              </Link>
              <Link
                href={`${ROUTES.account}?section=settings`}
                onClick={closeMenu}
                className="sales-profile-menu-item"
              >
                <IconSettings /> Account Settings
              </Link>
              <Link
                href={ROUTES.dashboard}
                onClick={closeMenu}
                className="sales-profile-menu-item"
              >
                <IconArrowRight /> Back to Home
              </Link>
              <Link
                href="/chat"
                onClick={closeMenu}
                className="sales-profile-menu-item"
              >
                <IconUser /> Chat
              </Link>
              <Link
                href="/support"
                onClick={closeMenu}
                className="sales-profile-menu-item"
              >
                <IconSettings /> Support
              </Link>
              <Link
                href="/refer"
                onClick={closeMenu}
                className="sales-profile-menu-item"
              >
                <IconArrowRight /> Refer & Earn
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="sales-profile-menu-item sales-logout-item"
              >
                <IconLogout /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
